#![no_std]
//! PayCycle: pull-based recurring payments on Soroban.
//!
//! A merchant publishes a plan (token, amount, period). A subscriber pays the
//! first period when subscribing and grants the contract a token allowance
//! (`approve`) for later periods. Anyone (a "keeper") can then call `charge`
//! once a period has elapsed; funds move straight from subscriber to merchant.
//! The contract never custodies funds. Missed periods are skipped, not billed later.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const BUMP_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidPeriod = 4,
    PlanNotFound = 5,
    PlanInactive = 6,
    SubscriptionNotFound = 7,
    SubscriptionInactive = 8,
    NotDue = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub min_period: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Plan {
    pub merchant: Address,
    pub token: Address,
    pub amount: i128,
    pub period: u64,
    pub name: String,
    pub active: bool,
    pub subscribers: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription {
    pub subscriber: Address,
    pub plan_id: u64,
    pub next_charge: u64,
    pub charges: u32,
    pub active: bool,
    pub total_paid: i128,
}

#[contracttype]
pub enum DataKey {
    Config,
    PlanCount,
    SubCount,
    Plan(u64),
    Sub(u64),
}

fn config(env: &Env) -> Result<Config, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .ok_or(Error::NotInitialized)
}

fn next_id(env: &Env, key: DataKey) -> u64 {
    let id: u64 = env.storage().instance().get(&key).unwrap_or(0u64) + 1;
    env.storage().instance().set(&key, &id);
    env.storage()
        .instance()
        .extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);
    id
}

fn count(env: &Env, key: DataKey) -> u64 {
    env.storage().instance().get(&key).unwrap_or(0u64)
}

fn load_plan(env: &Env, id: u64) -> Result<Plan, Error> {
    let key = DataKey::Plan(id);
    let plan: Plan = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::PlanNotFound)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
    Ok(plan)
}

fn save_plan(env: &Env, id: u64, plan: &Plan) {
    let key = DataKey::Plan(id);
    env.storage().persistent().set(&key, plan);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn load_sub(env: &Env, id: u64) -> Result<Subscription, Error> {
    let key = DataKey::Sub(id);
    let sub: Subscription = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::SubscriptionNotFound)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
    Ok(sub)
}

fn save_sub(env: &Env, id: u64, sub: &Subscription) {
    let key = DataKey::Sub(id);
    env.storage().persistent().set(&key, sub);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

#[contract]
pub struct PayCycle;

#[contractimpl]
impl PayCycle {
    /// One-time setup. `min_period` (seconds) stops spammy sub-minute plans.
    pub fn initialize(env: Env, admin: Address, min_period: u64) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        if min_period == 0 {
            return Err(Error::InvalidPeriod);
        }
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Config, &Config { admin, min_period });
        env.storage()
            .instance()
            .extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    pub fn set_min_period(env: Env, min_period: u64) -> Result<(), Error> {
        let mut cfg = config(&env)?;
        cfg.admin.require_auth();
        if min_period == 0 {
            return Err(Error::InvalidPeriod);
        }
        cfg.min_period = min_period;
        env.storage().instance().set(&DataKey::Config, &cfg);
        Ok(())
    }

    /// Merchant publishes a plan: `amount` of `token` every `period` seconds.
    pub fn create_plan(
        env: Env,
        merchant: Address,
        token: Address,
        amount: i128,
        period: u64,
        name: String,
    ) -> Result<u64, Error> {
        let cfg = config(&env)?;
        merchant.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if period < cfg.min_period {
            return Err(Error::InvalidPeriod);
        }
        let id = next_id(&env, DataKey::PlanCount);
        let plan = Plan {
            merchant: merchant.clone(),
            token,
            amount,
            period,
            name,
            active: true,
            subscribers: 0,
        };
        save_plan(&env, id, &plan);
        env.events().publish((symbol_short!("plan"), id), merchant);
        Ok(id)
    }

    /// Merchant stops a plan: no new subscribers and no further charges.
    pub fn deactivate_plan(env: Env, plan_id: u64) -> Result<(), Error> {
        let mut plan = load_plan(&env, plan_id)?;
        plan.merchant.require_auth();
        plan.active = false;
        save_plan(&env, plan_id, &plan);
        Ok(())
    }

    /// Pays the first period immediately and starts the schedule.
    /// Subscribers should `approve` this contract on the token for later periods.
    pub fn subscribe(env: Env, subscriber: Address, plan_id: u64) -> Result<u64, Error> {
        config(&env)?;
        subscriber.require_auth();
        let mut plan = load_plan(&env, plan_id)?;
        if !plan.active {
            return Err(Error::PlanInactive);
        }
        token::Client::new(&env, &plan.token).transfer(&subscriber, &plan.merchant, &plan.amount);
        let id = next_id(&env, DataKey::SubCount);
        let sub = Subscription {
            subscriber: subscriber.clone(),
            plan_id,
            next_charge: env.ledger().timestamp().saturating_add(plan.period),
            charges: 1,
            active: true,
            total_paid: plan.amount,
        };
        plan.subscribers += 1;
        save_plan(&env, plan_id, &plan);
        save_sub(&env, id, &sub);
        env.events()
            .publish((symbol_short!("subscribe"), id), (subscriber, plan_id));
        Ok(id)
    }

    /// Permissionless: anyone may trigger a due charge. Returns the amount paid.
    pub fn charge(env: Env, sub_id: u64) -> Result<i128, Error> {
        let mut sub = load_sub(&env, sub_id)?;
        if !sub.active {
            return Err(Error::SubscriptionInactive);
        }
        let plan = load_plan(&env, sub.plan_id)?;
        if !plan.active {
            return Err(Error::PlanInactive);
        }
        let now = env.ledger().timestamp();
        if now < sub.next_charge {
            return Err(Error::NotDue);
        }
        token::Client::new(&env, &plan.token).transfer_from(
            &env.current_contract_address(),
            &sub.subscriber,
            &plan.merchant,
            &plan.amount,
        );
        let scheduled = sub.next_charge.saturating_add(plan.period);
        // Missed periods are skipped rather than billed retroactively.
        sub.next_charge = if scheduled > now {
            scheduled
        } else {
            now.saturating_add(plan.period)
        };
        sub.charges += 1;
        sub.total_paid += plan.amount;
        save_sub(&env, sub_id, &sub);
        env.events()
            .publish((symbol_short!("charge"), sub_id), plan.amount);
        Ok(plan.amount)
    }

    /// Subscriber cancels. No refund is issued for the current period.
    pub fn cancel(env: Env, sub_id: u64) -> Result<(), Error> {
        let mut sub = load_sub(&env, sub_id)?;
        sub.subscriber.require_auth();
        if !sub.active {
            return Err(Error::SubscriptionInactive);
        }
        sub.active = false;
        let mut plan = load_plan(&env, sub.plan_id)?;
        plan.subscribers = plan.subscribers.saturating_sub(1);
        save_plan(&env, sub.plan_id, &plan);
        save_sub(&env, sub_id, &sub);
        env.events().publish((symbol_short!("cancel"), sub_id), ());
        Ok(())
    }

    pub fn get_plan(env: Env, plan_id: u64) -> Result<Plan, Error> {
        load_plan(&env, plan_id)
    }

    pub fn get_subscription(env: Env, sub_id: u64) -> Result<Subscription, Error> {
        load_sub(&env, sub_id)
    }

    pub fn is_due(env: Env, sub_id: u64) -> Result<bool, Error> {
        let sub = load_sub(&env, sub_id)?;
        let plan = load_plan(&env, sub.plan_id)?;
        Ok(sub.active && plan.active && env.ledger().timestamp() >= sub.next_charge)
    }

    pub fn plan_count(env: Env) -> u64 {
        count(&env, DataKey::PlanCount)
    }

    pub fn sub_count(env: Env) -> u64 {
        count(&env, DataKey::SubCount)
    }

    pub fn get_config(env: Env) -> Result<Config, Error> {
        config(&env)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        Env,
    };

    const USDC: i128 = 10_000_000;
    const T0: u64 = 1_000;
    const PERIOD: u64 = 3_600;

    struct Ctx<'a> {
        env: Env,
        client: PayCycleClient<'a>,
        token: TokenClient<'a>,
        merchant: Address,
        user: Address,
        plan_id: u64,
    }

    fn setup<'a>() -> Ctx<'a> {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(T0);
        let admin = Address::generate(&env);
        let merchant = Address::generate(&env);
        let user = Address::generate(&env);
        let asset = env.register_stellar_asset_contract(admin.clone());
        StellarAssetClient::new(&env, &asset).mint(&user, &(1_000 * USDC));
        let id = env.register_contract(None, PayCycle);
        let client = PayCycleClient::new(&env, &id);
        client.initialize(&admin, &60);
        let plan_id = client.create_plan(
            &merchant,
            &asset,
            &(10 * USDC),
            &PERIOD,
            &String::from_str(&env, "Pro"),
        );
        let token = TokenClient::new(&env, &asset);
        Ctx {
            env,
            client,
            token,
            merchant,
            user,
            plan_id,
        }
    }

    fn allow(c: &Ctx, amount: i128) {
        c.token
            .approve(&c.user, &c.client.address, &amount, &10_000);
    }

    #[test]
    fn cannot_initialize_twice() {
        let c = setup();
        let cfg = c.client.get_config();
        assert!(c.client.try_initialize(&cfg.admin, &60).is_err());
    }

    #[test]
    fn subscribe_pays_first_period() {
        let c = setup();
        let sub_id = c.client.subscribe(&c.user, &c.plan_id);
        assert_eq!(sub_id, 1);
        assert_eq!(c.token.balance(&c.merchant), 10 * USDC);
        let sub = c.client.get_subscription(&sub_id);
        assert_eq!(sub.next_charge, T0 + PERIOD);
        assert_eq!(sub.charges, 1);
        assert_eq!(c.client.get_plan(&c.plan_id).subscribers, 1);
    }

    #[test]
    fn charge_before_due_fails() {
        let c = setup();
        let sub_id = c.client.subscribe(&c.user, &c.plan_id);
        allow(&c, 100 * USDC);
        assert!(!c.client.is_due(&sub_id));
        assert!(c.client.try_charge(&sub_id).is_err());
    }

    #[test]
    fn charge_after_period_pays_merchant() {
        let c = setup();
        let sub_id = c.client.subscribe(&c.user, &c.plan_id);
        allow(&c, 100 * USDC);
        c.env.ledger().set_timestamp(T0 + PERIOD);
        assert!(c.client.is_due(&sub_id));
        assert_eq!(c.client.charge(&sub_id), 10 * USDC);
        assert_eq!(c.token.balance(&c.merchant), 20 * USDC);
        let sub = c.client.get_subscription(&sub_id);
        assert_eq!(sub.charges, 2);
        assert_eq!(sub.total_paid, 20 * USDC);
        assert_eq!(sub.next_charge, T0 + 2 * PERIOD);
    }

    #[test]
    fn missed_periods_are_skipped() {
        let c = setup();
        let sub_id = c.client.subscribe(&c.user, &c.plan_id);
        allow(&c, 100 * USDC);
        let late = T0 + 10 * PERIOD;
        c.env.ledger().set_timestamp(late);
        c.client.charge(&sub_id);
        assert_eq!(c.client.get_subscription(&sub_id).next_charge, late + PERIOD);
        assert!(c.client.try_charge(&sub_id).is_err());
        assert_eq!(c.token.balance(&c.merchant), 20 * USDC);
    }

    #[test]
    fn charge_fails_without_allowance() {
        let c = setup();
        let sub_id = c.client.subscribe(&c.user, &c.plan_id);
        c.env.ledger().set_timestamp(T0 + PERIOD);
        assert!(c.client.try_charge(&sub_id).is_err());
    }

    #[test]
    fn cancel_stops_charging() {
        let c = setup();
        let sub_id = c.client.subscribe(&c.user, &c.plan_id);
        allow(&c, 100 * USDC);
        c.client.cancel(&sub_id);
        assert_eq!(c.client.get_plan(&c.plan_id).subscribers, 0);
        c.env.ledger().set_timestamp(T0 + PERIOD);
        assert!(c.client.try_charge(&sub_id).is_err());
        assert!(c.client.try_cancel(&sub_id).is_err());
    }

    #[test]
    fn inactive_plan_blocks_subscribe_and_charge() {
        let c = setup();
        let sub_id = c.client.subscribe(&c.user, &c.plan_id);
        allow(&c, 100 * USDC);
        c.client.deactivate_plan(&c.plan_id);
        assert!(c.client.try_subscribe(&c.user, &c.plan_id).is_err());
        c.env.ledger().set_timestamp(T0 + PERIOD);
        assert!(!c.client.is_due(&sub_id));
        assert!(c.client.try_charge(&sub_id).is_err());
    }

    #[test]
    fn rejects_bad_plans() {
        let c = setup();
        let name = String::from_str(&c.env, "Bad");
        let token = c.client.get_plan(&c.plan_id).token;
        assert!(c
            .client
            .try_create_plan(&c.merchant, &token, &0, &PERIOD, &name)
            .is_err());
        assert!(c
            .client
            .try_create_plan(&c.merchant, &token, &USDC, &10, &name)
            .is_err());
    }

    #[test]
    fn counts_track_plans_and_subscriptions() {
        let c = setup();
        assert_eq!(c.client.plan_count(), 1);
        assert_eq!(c.client.sub_count(), 0);
        c.client.subscribe(&c.user, &c.plan_id);
        assert_eq!(c.client.sub_count(), 1);
        assert!(c.client.try_get_plan(&99).is_err());
    }
}
