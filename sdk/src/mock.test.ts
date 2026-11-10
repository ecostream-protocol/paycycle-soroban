import { beforeEach, describe, expect, it } from 'vitest';
import { MockPayCycle } from './mock';
import { runKeeperOnce } from './keeper';
import { listPlans, listSubscriptions } from './helpers';
import type { Signer } from './types';

const signer = (publicKey: string): Signer => ({ publicKey, signXdr: async () => '' });
const merchant = signer('GMERCHANT');
const alice = signer('GALICE');
const bob = signer('GBOB');
const PERIOD = 3600n;
const PRICE = 100_000_000n;

let clock = 1_000;
let api: MockPayCycle;
let planId: bigint;

beforeEach(async () => {
  clock = 1_000;
  api = new MockPayCycle(() => clock);
  planId = await api.createPlan(merchant, { token: 'T', amount: PRICE, period: PERIOD, name: 'Pro' });
});

describe('MockPayCycle follows the contract rules', () => {
  it('rejects invalid plans', async () => {
    await expect(api.createPlan(merchant, { token: 'T', amount: 0n, period: PERIOD, name: 'x' })).rejects.toThrow();
    await expect(api.createPlan(merchant, { token: 'T', amount: PRICE, period: 10n, name: 'x' })).rejects.toThrow();
  });

  it('pays the first period on subscribe and schedules the next', async () => {
    const id = await api.subscribe(alice, planId);
    const sub = await api.getSubscription(id);
    expect(sub.nextCharge).toBe(1000n + PERIOD);
    expect(sub.charges).toBe(1);
    expect(sub.totalPaid).toBe(PRICE);
    expect((await api.getPlan(planId)).subscribers).toBe(1);
  });

  it('refuses early charges and allows due ones', async () => {
    const id = await api.subscribe(alice, planId);
    await expect(api.charge(bob, id)).rejects.toThrow('not due');
    clock += Number(PERIOD);
    expect(await api.isDue(id)).toBe(true);
    expect(await api.charge(bob, id)).toBe(PRICE);
    expect((await api.getSubscription(id)).nextCharge).toBe(1000n + 2n * PERIOD);
  });

  it('skips missed periods', async () => {
    const id = await api.subscribe(alice, planId);
    clock += Number(PERIOD) * 10;
    await api.charge(bob, id);
    expect(await api.isDue(id)).toBe(false);
  });

  it('stops after cancel or plan deactivation', async () => {
    const a = await api.subscribe(alice, planId);
    const b = await api.subscribe(bob, planId);
    await api.cancel(alice, a);
    await api.deactivatePlan(merchant, planId);
    clock += Number(PERIOD);
    expect(await api.isDue(a)).toBe(false);
    expect(await api.isDue(b)).toBe(false);
    await expect(api.subscribe(alice, planId)).rejects.toThrow('no longer active');
  });

  it('only lets the owner cancel', async () => {
    const id = await api.subscribe(alice, planId);
    await expect(api.cancel(bob, id)).rejects.toThrow('Only the subscriber');
  });
});

describe('helpers and keeper', () => {
  it('lists plans newest first and subscriptions per subscriber', async () => {
    await api.createPlan(merchant, { token: 'T', amount: PRICE, period: PERIOD, name: 'Team' });
    await api.subscribe(alice, planId);
    await api.subscribe(bob, planId);
    expect((await listPlans(api)).map((p) => p.name)).toEqual(['Team', 'Pro']);
    expect(await listSubscriptions(api, 'GALICE')).toHaveLength(1);
  });

  it('keeper charges only due subscriptions', async () => {
    await api.subscribe(alice, planId);
    clock += 1800;
    await api.subscribe(bob, planId);
    clock = 1_000 + Number(PERIOD);
    const result = await runKeeperOnce(api, signer('GKEEPER'));
    expect(result).toEqual({ checked: 2, charged: 1, failed: 0 });
  });
});
