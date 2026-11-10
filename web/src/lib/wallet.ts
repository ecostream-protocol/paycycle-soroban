import { getAddress, isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';
import type { Signer } from 'paycycle-sdk';
import { networkPassphrase } from './api';

const msg = (e: unknown, fallback: string): string =>
  typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : fallback;

export const DEMO_ADDRESS = 'GDEMOWALLETXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

export const demoSigner: Signer = {
  publicKey: DEMO_ADDRESS,
  signXdr: async () => {
    throw new Error('The demo wallet cannot sign real transactions');
  },
};

function freighterSigner(address: string): Signer {
  return {
    publicKey: address,
    async signXdr(xdr) {
      const r = await signTransaction(xdr, { networkPassphrase, address });
      if (r.error) throw new Error(msg(r.error, 'Signing was rejected in Freighter'));
      return r.signedTxXdr;
    },
  };
}

export async function connectFreighter(): Promise<Signer> {
  const installed = await isConnected().then((r) => Boolean(r.isConnected)).catch(() => false);
  if (!installed) throw new Error('Freighter not detected. Install it from freighter.app and reload.');
  const r = await requestAccess();
  if (r.error) throw new Error(msg(r.error, 'Freighter access was denied'));
  return freighterSigner(r.address);
}

export async function restoreFreighter(): Promise<Signer | null> {
  try {
    const r = await getAddress();
    return r.error || !r.address ? null : freighterSigner(r.address);
  } catch {
    return null;
  }
}
