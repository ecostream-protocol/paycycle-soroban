# Drips Wave application answers (copy and paste)

Replace `YOUR-ORG/YOUR-REPO` with your GitHub organization and repository.

**Project name:** PayCycle

**Short description:** Non-custodial recurring payments for Stellar Soroban: plans, subscriptions and a permissionless billing call, with a TypeScript SDK, keeper bot and React demo.

**Full description:** PayCycle lets merchants publish subscription plans and lets users subscribe with a token allowance instead of handing over funds. After the first payment, anyone can call `charge` when a period is due and the funds move straight from subscriber to merchant. The repo contains a tested Rust Soroban contract, a TypeScript SDK with an in-memory mock and a keeper bot, a React demo that runs with no blockchain, CI and contributor docs. It is early-stage, unaudited and not on mainnet.

**Why it fits the Stellar ecosystem:** It fills a real gap (recurring billing on Soroban) using Soroban token allowances, USDC on Stellar and Freighter, and gives other Stellar builders a reusable SDK.

**Supporting links**
- Repository: https://github.com/YOUR-ORG/YOUR-REPO
- Architecture: https://github.com/YOUR-ORG/YOUR-REPO/blob/main/docs/ARCHITECTURE.md
- Contract: https://github.com/YOUR-ORG/YOUR-REPO/blob/main/contracts/src/lib.rs
- Contributing guide: https://github.com/YOUR-ORG/YOUR-REPO/blob/main/CONTRIBUTING.md
- Issues: https://github.com/YOUR-ORG/YOUR-REPO/issues

**Types of work we will post:** contract features (grace periods and retries, keeper tips, proration), more contract tests, SDK improvements (error mapping, retries, keeper metrics), frontend work (allowance manager, accessibility, empty states), documentation (keeper deployment guide) and security hardening. Each issue lists files, acceptance criteria and a complexity level.

**Planned issues:** 12 scoped issues (4 Trivial, 5 Medium, 3 High). Full list in `docs/ISSUES.md`.

**Previous participation:** This is our first Drips Wave. We are a new open-source project and will review applications and pull requests within 3 days.
