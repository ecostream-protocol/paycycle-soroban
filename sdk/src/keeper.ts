import type { PayCycleApi, Signer } from './types';

export interface KeeperResult {
  checked: number;
  charged: number;
  failed: number;
}

/** Scans all subscriptions once and charges every one that is due. */
export async function runKeeperOnce(
  api: PayCycleApi,
  signer: Signer,
  log: (message: string) => void = () => {},
): Promise<KeeperResult> {
  const total = Number(await api.subCount());
  const result: KeeperResult = { checked: 0, charged: 0, failed: 0 };
  for (let i = 1; i <= total; i++) {
    const id = BigInt(i);
    result.checked++;
    try {
      if (!(await api.isDue(id))) continue;
      const amount = await api.charge(signer, id);
      result.charged++;
      log(`charged subscription #${id} (${amount} base units)`);
    } catch (err) {
      result.failed++;
      log(`subscription #${id} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return result;
}
