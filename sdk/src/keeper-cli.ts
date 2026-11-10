import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { PayCycleClient } from './client';
import { runKeeperOnce } from './keeper';

// Usage: CONTRACT_ID=C... KEEPER_SECRET=S... npm run keeper
const contractId = process.env.CONTRACT_ID;
const secret = process.env.KEEPER_SECRET;
if (!contractId || !secret) {
  console.error('Set CONTRACT_ID and KEEPER_SECRET (a funded testnet account) to run the keeper.');
  process.exit(1);
}

const networkPassphrase = process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;
const rpcUrl = process.env.RPC_URL ?? 'https://soroban-testnet.stellar.org';
const intervalMs = Number(process.env.INTERVAL_MS ?? 60_000);

const keypair = Keypair.fromSecret(secret);
const signer = {
  publicKey: keypair.publicKey(),
  async signXdr(xdr: string) {
    const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
    tx.sign(keypair);
    return tx.toXDR();
  },
};
const api = new PayCycleClient({ contractId, rpcUrl, networkPassphrase });

async function tick() {
  const r = await runKeeperOnce(api, signer, (m) => console.log(`[${new Date().toISOString()}] ${m}`));
  console.log(`[${new Date().toISOString()}] checked=${r.checked} charged=${r.charged} failed=${r.failed}`);
}

console.log(`PayCycle keeper started for ${contractId} every ${intervalMs / 1000}s as ${signer.publicKey}`);
void tick();
setInterval(() => void tick().catch((e) => console.error(e)), intervalMs);
