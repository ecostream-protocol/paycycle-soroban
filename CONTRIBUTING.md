# Contributing to PayCycle

Thanks for helping! Every contribution is reviewed by a human, and we answer within 3 days.

## Setup

```bash
git clone https://github.com/YOUR-ORG/YOUR-REPO.git && cd YOUR-REPO
npm install            # installs the SDK and web workspaces
npm run dev            # web demo at http://localhost:5174 (no blockchain needed)
npm test               # SDK + web tests
cd contracts && cargo test
```

You need Node 20+ and Rust (stable). A [Freighter](https://freighter.app) wallet is only needed for testnet mode.

## Picking work
1. Find an issue labelled `good first issue`, `wave` or `help wanted`.
2. Comment that you want it and wait to be assigned.
3. Ask questions in the issue. Nobody minds.

## Pull requests
1. Fork, branch (`fix/short-description`), and keep each PR to one issue.
2. Add tests for behaviour changes. Contract changes need tests in `contracts/src/lib.rs`; SDK changes need tests next to the code.
3. Run `npm run build`, `npm test` and `cargo test` before opening the PR.
4. Link the issue with `Closes #123` and include a screenshot for UI changes.

## Standards
- Typed TypeScript, no `any` without a comment. Money is always `bigint` base units, never floats.
- The `MockPayCycle` in `sdk/src/mock.ts` must behave exactly like the contract. If you change contract rules, update the mock and its tests in the same PR.
- Never commit secrets or `.env` files.
- Be kind in reviews. See the [Code of Conduct](CODE_OF_CONDUCT.md).
