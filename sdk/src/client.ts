import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import type { NewPlan, PayCycleApi, PayCycleConfig, Plan, Signer, Subscription } from './types';

const LEDGERS_PER_DAY = 17_280;

const addr = (a: string): xdr.ScVal => new Address(a).toScVal();
const i128 = (v: bigint): xdr.ScVal => nativeToScVal(v, { type: 'i128' });
const u64 = (v: bigint): xdr.ScVal => nativeToScVal(v, { type: 'u64' });
const u32 = (v: number): xdr.ScVal => nativeToScVal(v, { type: 'u32' });
const str = (v: string): xdr.ScVal => nativeToScVal(v, { type: 'string' });

/** Maps the contract's numeric error codes to readable messages. */
export const CONTRACT_ERRORS: Record<number, string> = {
  1: 'Contract is already initialized',
  2: 'Contract is not initialized',
  3: 'Amount must be greater than zero',
  4: 'Billing period is shorter than the minimum allowed',
  5: 'Plan not found',
  6: 'Plan is no longer active',
  7: 'Subscription not found',
  8: 'Subscription is no longer active',
  9: 'This subscription is not due yet',
};

export function describeError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  const code = /Error\(Contract, #(\d+)\)/.exec(text);
  return code ? (CONTRACT_ERRORS[Number(code[1])] ?? text) : text;
}

type RawPlan = {
  merchant: string; token: string; amount: bigint; period: bigint;
  name: string; active: boolean; subscribers: number;
};
type RawSub = {
  subscriber: string; plan_id: bigint; next_charge: bigint;
  charges: number; active: boolean; total_paid: bigint;
};

/** On-chain implementation of {@link PayCycleApi} using Soroban RPC. */
export class PayCycleClient implements PayCycleApi {
  private server: rpc.Server;
  private contract: Contract;

  constructor(private cfg: PayCycleConfig) {
    this.server = new rpc.Server(cfg.rpcUrl, { allowHttp: cfg.rpcUrl.startsWith('http://') });
    this.contract = new Contract(cfg.contractId);
  }

  private async invoke(signer: Signer, contract: Contract, method: string, args: xdr.ScVal[]): Promise<unknown> {
    try {
      const account = await this.server.getAccount(signer.publicKey);
      const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: this.cfg.networkPassphrase })
        .addOperation(contract.call(method, ...args))
        .setTimeout(180)
        .build();
      const prepared = await this.server.prepareTransaction(tx);
      const signed = await signer.signXdr(prepared.toXDR());
      const sent = await this.server.sendTransaction(
        TransactionBuilder.fromXDR(signed, this.cfg.networkPassphrase),
      );
      if (sent.status === 'ERROR') throw new Error('Transaction was rejected by the network');
      for (let i = 0; i < 40; i++) {
        const res = await this.server.getTransaction(sent.hash);
        if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          return res.returnValue ? scValToNative(res.returnValue) : null;
        }
        if (res.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`Transaction ${sent.hash} failed`);
        await new Promise((r) => setTimeout(r, 1500));
      }
      throw new Error(`Timed out waiting for transaction ${sent.hash}`);
    } catch (err) {
      throw new Error(describeError(err));
    }
  }

  private async read(method: string, args: xdr.ScVal[] = []): Promise<unknown> {
    const source = new Account(Keypair.random().publicKey(), '0');
    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: this.cfg.networkPassphrase })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();
    const sim = await this.server.simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
      throw new Error(describeError('error' in sim ? sim.error : 'Simulation failed'));
    }
    return scValToNative(sim.result.retval);
  }

  async createPlan(signer: Signer, p: NewPlan): Promise<bigint> {
    const id = await this.invoke(signer, this.contract, 'create_plan', [
      addr(signer.publicKey), addr(p.token), i128(p.amount), u64(p.period), str(p.name),
    ]);
    return BigInt(id as bigint);
  }

  async deactivatePlan(signer: Signer, planId: bigint): Promise<void> {
    await this.invoke(signer, this.contract, 'deactivate_plan', [u64(planId)]);
  }

  async approveAllowance(signer: Signer, token: string, amount: bigint, ledgersAhead = LEDGERS_PER_DAY * 365): Promise<void> {
    const latest = await this.server.getLatestLedger();
    await this.invoke(signer, new Contract(token), 'approve', [
      addr(signer.publicKey), addr(this.cfg.contractId), i128(amount), u32(latest.sequence + ledgersAhead),
    ]);
  }

  async subscribe(signer: Signer, planId: bigint): Promise<bigint> {
    const id = await this.invoke(signer, this.contract, 'subscribe', [addr(signer.publicKey), u64(planId)]);
    return BigInt(id as bigint);
  }

  async charge(signer: Signer, subscriptionId: bigint): Promise<bigint> {
    return BigInt((await this.invoke(signer, this.contract, 'charge', [u64(subscriptionId)])) as bigint);
  }

  async cancel(signer: Signer, subscriptionId: bigint): Promise<void> {
    await this.invoke(signer, this.contract, 'cancel', [u64(subscriptionId)]);
  }

  async getPlan(planId: bigint): Promise<Plan> {
    const r = (await this.read('get_plan', [u64(planId)])) as RawPlan;
    return { ...r, amount: BigInt(r.amount), period: BigInt(r.period) };
  }

  async getSubscription(subscriptionId: bigint): Promise<Subscription> {
    const r = (await this.read('get_subscription', [u64(subscriptionId)])) as RawSub;
    return {
      subscriber: r.subscriber, planId: BigInt(r.plan_id), nextCharge: BigInt(r.next_charge),
      charges: r.charges, active: r.active, totalPaid: BigInt(r.total_paid),
    };
  }

  async isDue(subscriptionId: bigint): Promise<boolean> {
    return (await this.read('is_due', [u64(subscriptionId)])) as boolean;
  }

  async planCount(): Promise<bigint> {
    return BigInt((await this.read('plan_count')) as bigint);
  }

  async subCount(): Promise<bigint> {
    return BigInt((await this.read('sub_count')) as bigint);
  }
}
