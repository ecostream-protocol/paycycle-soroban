import type { NewPlan, PayCycleApi, Plan, Signer, Subscription } from './types';

/**
 * In-memory implementation that follows the contract's rules (first payment on subscribe,
 * period-based due dates, skipped missed periods, cancel, inactive plans).
 * Used by the web demo and by tests, so the UI works without a blockchain.
 */
export class MockPayCycle implements PayCycleApi {
  private plans = new Map<bigint, Plan>();
  private subs = new Map<bigint, Subscription>();

  constructor(
    private now: () => number = () => Math.floor(Date.now() / 1000),
    private minPeriod = 60n,
  ) {}

  async createPlan(signer: Signer, p: NewPlan): Promise<bigint> {
    if (p.amount <= 0n) throw new Error('Amount must be greater than zero');
    if (p.period < this.minPeriod) throw new Error('Billing period is shorter than the minimum allowed');
    const id = BigInt(this.plans.size + 1);
    this.plans.set(id, { merchant: signer.publicKey, ...p, active: true, subscribers: 0 });
    return id;
  }

  async deactivatePlan(signer: Signer, planId: bigint): Promise<void> {
    const plan = await this.getPlan(planId);
    if (plan.merchant !== signer.publicKey) throw new Error('Only the merchant can deactivate this plan');
    this.plans.set(planId, { ...plan, active: false });
  }

  async approveAllowance(): Promise<void> {
    /* allowances are not modelled in the mock */
  }

  async subscribe(signer: Signer, planId: bigint): Promise<bigint> {
    const plan = await this.getPlan(planId);
    if (!plan.active) throw new Error('Plan is no longer active');
    const id = BigInt(this.subs.size + 1);
    this.subs.set(id, {
      subscriber: signer.publicKey,
      planId,
      nextCharge: BigInt(this.now()) + plan.period,
      charges: 1,
      active: true,
      totalPaid: plan.amount,
    });
    this.plans.set(planId, { ...plan, subscribers: plan.subscribers + 1 });
    return id;
  }

  async charge(_signer: Signer, subscriptionId: bigint): Promise<bigint> {
    const sub = await this.getSubscription(subscriptionId);
    if (!sub.active) throw new Error('Subscription is no longer active');
    const plan = await this.getPlan(sub.planId);
    if (!plan.active) throw new Error('Plan is no longer active');
    const now = BigInt(this.now());
    if (now < sub.nextCharge) throw new Error('This subscription is not due yet');
    const scheduled = sub.nextCharge + plan.period;
    this.subs.set(subscriptionId, {
      ...sub,
      nextCharge: scheduled > now ? scheduled : now + plan.period,
      charges: sub.charges + 1,
      totalPaid: sub.totalPaid + plan.amount,
    });
    return plan.amount;
  }

  async cancel(signer: Signer, subscriptionId: bigint): Promise<void> {
    const sub = await this.getSubscription(subscriptionId);
    if (sub.subscriber !== signer.publicKey) throw new Error('Only the subscriber can cancel');
    if (!sub.active) throw new Error('Subscription is no longer active');
    this.subs.set(subscriptionId, { ...sub, active: false });
    const plan = await this.getPlan(sub.planId);
    this.plans.set(sub.planId, { ...plan, subscribers: Math.max(0, plan.subscribers - 1) });
  }

  async getPlan(planId: bigint): Promise<Plan> {
    const p = this.plans.get(planId);
    if (!p) throw new Error('Plan not found');
    return p;
  }

  async getSubscription(subscriptionId: bigint): Promise<Subscription> {
    const s = this.subs.get(subscriptionId);
    if (!s) throw new Error('Subscription not found');
    return s;
  }

  async isDue(subscriptionId: bigint): Promise<boolean> {
    const sub = await this.getSubscription(subscriptionId);
    const plan = await this.getPlan(sub.planId);
    return sub.active && plan.active && BigInt(this.now()) >= sub.nextCharge;
  }

  async planCount(): Promise<bigint> {
    return BigInt(this.plans.size);
  }

  async subCount(): Promise<bigint> {
    return BigInt(this.subs.size);
  }
}
