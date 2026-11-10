export interface Plan {
  merchant: string;
  token: string;
  /** Price per period in token base units (stroops for 7-decimal assets). */
  amount: bigint;
  /** Billing period in seconds. */
  period: bigint;
  name: string;
  active: boolean;
  subscribers: number;
}

export interface Subscription {
  subscriber: string;
  planId: bigint;
  /** Unix seconds when the next charge becomes due. */
  nextCharge: bigint;
  charges: number;
  active: boolean;
  totalPaid: bigint;
}

export type PlanRow = Plan & { id: bigint };
export type SubscriptionRow = Subscription & { id: bigint };

/** Anything that can sign a transaction XDR (Freighter, a keypair, a test double). */
export interface Signer {
  publicKey: string;
  signXdr(xdr: string): Promise<string>;
}

export interface PayCycleConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
}

export interface NewPlan {
  token: string;
  amount: bigint;
  period: bigint;
  name: string;
}

/** Implemented by the on-chain client and by the in-memory mock. */
export interface PayCycleApi {
  createPlan(signer: Signer, plan: NewPlan): Promise<bigint>;
  deactivatePlan(signer: Signer, planId: bigint): Promise<void>;
  /** Grants the contract an allowance so it can pull future periods. */
  approveAllowance(signer: Signer, token: string, amount: bigint, ledgersAhead?: number): Promise<void>;
  subscribe(signer: Signer, planId: bigint): Promise<bigint>;
  charge(signer: Signer, subscriptionId: bigint): Promise<bigint>;
  cancel(signer: Signer, subscriptionId: bigint): Promise<void>;
  getPlan(planId: bigint): Promise<Plan>;
  getSubscription(subscriptionId: bigint): Promise<Subscription>;
  isDue(subscriptionId: bigint): Promise<boolean>;
  planCount(): Promise<bigint>;
  subCount(): Promise<bigint>;
}
