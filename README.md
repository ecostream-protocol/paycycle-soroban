# PayCycle

**Recurring payments on Stellar, without handing over the keys.** PayCycle is an open-source Soroban protocol for subscriptions. A merchant publishes a plan, a subscriber pays the first period and sets a spending allowance, and anyone can trigger each later payment when it is due. Funds go straight from subscriber to merchant. The contract never holds them.

> **Status:** early-stage and **unaudited**. Do not use real funds. See [SECURITY.md](SECURITY.md).

![CI](https://github.com/YOUR-ORG/YOUR-REPO/actions/workflows/ci.yml/badge.svg)

## Why

Stellar has no built-in way to bill someone every month. Today apps either custody user funds or ask for a fresh signature each cycle. PayCycle uses token allowances and a permissionless `charge` call, so billing is non-custodial, cancellable and automatable by any keeper.

## What is in the repo

```
contracts/   Soroban contract (Rust) with unit tests
sdk/         TypeScript SDK, in-memory mock, keeper bot (paycycle-sdk)
web/         React demo for merchants and subscribers
docs/        Architecture, testnet guide, starter issues
```

Flow and rules: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Try it in 1 minute (no blockchain needed)

```bash
npm install
npm run dev        # http://localhost:5174
```
Click **Try demo wallet**, subscribe to the "Live demo (1 minute)" plan and watch the countdown ring fill. When it is due, click **Charge now**.

## Tests

```bash
npm test                    # SDK and web
cd contracts && cargo test  # contract
```

## Use the SDK

```ts
import { PayCycleClient, toStroops } from 'paycycle-sdk';

const paycycle = new PayCycleClient({
  contractId: 'C...',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
});

// signer = { publicKey, signXdr(xdr) } (Freighter, a Keypair, ...)
const planId = await paycycle.createPlan(signer, {
  token: USDC_CONTRACT_ID, amount: toStroops('9.99'), period: 2_592_000n, name: 'Pro',
});
await paycycle.approveAllowance(subscriberSigner, USDC_CONTRACT_ID, toStroops('120')); // ~12 periods
const subId = await paycycle.subscribe(subscriberSigner, planId);
```

## Keeper

Soroban contracts cannot run on a timer, so something must call `charge`. Run the bundled keeper (or write your own with `runKeeperOnce`):

```bash
CONTRACT_ID=C... KEEPER_SECRET=S... npm run keeper
```

## Contract

| Function | Auth | What it does |
|---|---|---|
| `initialize(admin, min_period)` | admin | One-time setup |
| `set_min_period(min_period)` | admin | Changes the shortest allowed billing period |
| `create_plan(merchant, token, amount, period, name)` | merchant | Publishes a plan |
| `deactivate_plan(plan_id)` | merchant | Stops new subscriptions and all future charges |
| `subscribe(subscriber, plan_id)` | subscriber | Pays the first period, starts the schedule |
| `charge(sub_id)` | anyone | Pulls one due period from subscriber to merchant |
| `cancel(sub_id)` | subscriber | Stops future charges |
| `get_plan`, `get_subscription`, `is_due`, `plan_count`, `sub_count`, `get_config` | none | Views |

## Testnet

Follow [docs/TESTNET.md](docs/TESTNET.md), then set `VITE_CONTRACT_ID` in `web/.env`.

## Roadmap and contributing

Open work is in [docs/ISSUES.md](docs/ISSUES.md): grace periods and retries, keeper tips, plan upgrades with proration, an allowance manager, an event indexer and more. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Issues labelled `wave` are scoped for Drips Wave contributors.

## License

[MIT](LICENSE)
