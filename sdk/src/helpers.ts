import type { PayCycleApi, PlanRow, SubscriptionRow } from './types';

/** Reads every plan (ids are sequential from 1). Fine for demos; see the indexer issue for scale. */
export async function listPlans(api: PayCycleApi): Promise<PlanRow[]> {
  const n = await api.planCount();
  const ids = Array.from({ length: Number(n) }, (_, i) => BigInt(i + 1));
  const plans = await Promise.all(ids.map(async (id) => ({ id, ...(await api.getPlan(id)) })));
  return plans.reverse();
}

export async function listSubscriptions(api: PayCycleApi, subscriber: string): Promise<SubscriptionRow[]> {
  const n = await api.subCount();
  const ids = Array.from({ length: Number(n) }, (_, i) => BigInt(i + 1));
  const subs = await Promise.all(ids.map(async (id) => ({ id, ...(await api.getSubscription(id)) })));
  return subs.filter((s) => s.subscriber === subscriber).reverse();
}
