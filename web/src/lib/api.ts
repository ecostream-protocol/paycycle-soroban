import { MockPayCycle, PayCycleClient, toStroops, type PayCycleApi, type Signer } from 'paycycle-sdk';

const env = import.meta.env;

export const contractId = (env.VITE_CONTRACT_ID as string | undefined) ?? '';
export const isMock = contractId === '';
export const tokenId = (env.VITE_TOKEN_ID as string | undefined) || 'USDC-DEMO';
export const networkPassphrase =
  (env.VITE_NETWORK_PASSPHRASE as string | undefined) ?? 'Test SDF Network ; September 2015';

export const api: PayCycleApi = isMock
  ? new MockPayCycle()
  : new PayCycleClient({
      contractId,
      rpcUrl: (env.VITE_RPC_URL as string | undefined) ?? 'https://soroban-testnet.stellar.org',
      networkPassphrase,
    });

/** Pre-populates the in-memory demo with a few plans so the UI is not empty. */
let seeded: Promise<void> | null = null;
export function seedDemo(): Promise<void> {
  seeded ??= doSeed();
  return seeded;
}

async function doSeed(): Promise<void> {
  if (!isMock || (await api.planCount()) > 0n) return;
  const merchant: Signer = {
    publicKey: 'GPAYCYCLEDEMOMERCHANTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    signXdr: async () => '',
  };
  const seed = [
    { name: 'Starter', amount: '4.99', period: 2_592_000n },
    { name: 'Pro', amount: '14.99', period: 2_592_000n },
    { name: 'Live demo (1 minute)', amount: '0.10', period: 60n },
  ];
  for (const p of seed) {
    await api.createPlan(merchant, { token: tokenId, amount: toStroops(p.amount), period: p.period, name: p.name });
  }
}
