# Starter issues
Copy each into a new GitHub issue (Issues → New issue), or run `scripts/create-issues.sh OWNER/REPO` with the GitHub CLI. The title is the first line of each section.

## 1. [Web] Add a copy-address button to the header wallet chip
**Complexity:** Trivial · **Labels:** good first issue,web, complexity: trivial

Users should be able to copy their full Stellar address from the header.

**Files**
- `web/src/components/Header.tsx`

**Acceptance criteria**
- [ ] A copy icon button next to the truncated address copies the full address
- [ ] A 'Copied' confirmation shows for 2 seconds
- [ ] Accessible label and keyboard support

**Complexity:** Trivial

**Hint:** Use `navigator.clipboard.writeText` and the `Copy`/`Check` icons from `lucide-react`.

## 2. [Web] Add friendly empty states for no plans and no subscriptions
**Complexity:** Trivial · **Labels:** good first issue,web, complexity: trivial

The empty states are a single line of text. Make them helpful.

**Files**
- `web/src/components/PlanList.tsx`
- `web/src/components/Subscriptions.tsx`

**Acceptance criteria**
- [ ] Each empty state has a small inline SVG, a one-line explanation and a call to action
- [ ] Works at mobile width
- [ ] No new dependencies

**Complexity:** Trivial

**Hint:** Keep the existing paper and ink styling.

## 3. [SDK] Add JSDoc and a usage example to every public method
**Complexity:** Trivial · **Labels:** good first issue,sdk,documentation, complexity: trivial

Public SDK methods have little documentation, which hurts editor tooltips.

**Files**
- `sdk/src/client.ts`
- `sdk/src/types.ts`
- `sdk/src/time.ts`

**Acceptance criteria**
- [ ] Every exported function, class and method has JSDoc with parameter descriptions
- [ ] `createPlan`, `subscribe` and `charge` include an `@example`
- [ ] `npm run build` passes

**Complexity:** Trivial

**Hint:** Describe units explicitly (base units, seconds).

## 4. [Docs] Write a guide to run the keeper on a small server
**Complexity:** Trivial · **Labels:** good first issue,documentation, complexity: trivial

Merchants need to run the keeper reliably. Document it.

**Files**
- `docs/KEEPER.md`

**Acceptance criteria**
- [ ] Step-by-step guide for a systemd service and for Docker
- [ ] Explains required environment variables and how to fund the keeper account
- [ ] Linked from README.md

**Complexity:** Trivial

**Hint:** The CLI is `npm run keeper`; see `sdk/src/keeper-cli.ts`.

## 5. [Contract] Add tests for multiple subscribers, plans and boundary values
**Complexity:** Medium · **Labels:** wave,contracts, complexity: medium

Increase confidence in the due-date and accounting rules.

**Files**
- `contracts/src/lib.rs`

**Acceptance criteria**
- [ ] Test: two subscribers on one plan are charged independently
- [ ] Test: one subscriber on two plans keeps separate schedules
- [ ] Test: charging exactly at `next_charge` succeeds and one second earlier fails
- [ ] Test: extremely large period values do not overflow
- [ ] `cargo test` passes in CI

**Complexity:** Medium

**Hint:** Use `env.ledger().set_timestamp` to control time.

## 6. [SDK] Retry with backoff and clearer error handling
**Complexity:** Medium · **Labels:** wave,sdk, complexity: medium

RPC calls fail transiently and errors can be cryptic.

**Files**
- `sdk/src/client.ts`

**Acceptance criteria**
- [ ] `sendTransaction` and reads retry on network errors with exponential backoff (configurable)
- [ ] Allowance errors from the token contract are translated into a readable message
- [ ] Unit tests with a stubbed RPC server prove retry behaviour

**Complexity:** Medium

**Hint:** Keep `describeError` as the single place that maps errors to messages.

## 7. [Web] Allowance manager: view, increase and revoke
**Complexity:** Medium · **Labels:** wave,web, complexity: medium

Subscribers cannot see or change how much the contract may pull.

**Files**
- `web/src/components/`
- `sdk/src/client.ts`

**Acceptance criteria**
- [ ] SDK exposes `getAllowance` and `revokeAllowance` (approve with 0)
- [ ] The Subscriptions tab shows the remaining allowance per token and a warning when it would not cover the next charge
- [ ] A button increases or revokes it
- [ ] Mock implements the same methods with tests

**Complexity:** Medium

**Hint:** Token `allowance(from, spender)` is a read-only call.

## 8. [Web] Accessibility audit and reduced-motion support
**Complexity:** Medium · **Labels:** wave,web,accessibility, complexity: medium

Make the app usable with keyboard and screen readers.

**Files**
- `web/src/`

**Acceptance criteria**
- [ ] All controls reachable and operable by keyboard with visible focus
- [ ] Tabs follow the WAI-ARIA tabs pattern (arrow-key navigation)
- [ ] Countdown text updates are not announced every second (use a throttled live region)
- [ ] Contrast meets WCAG AA
- [ ] Findings summarised in the PR

**Complexity:** Medium

**Hint:** Use axe DevTools or Lighthouse for a first pass.

## 9. [SDK] Keeper: concurrency limit, jitter and metrics output
**Complexity:** Medium · **Labels:** wave,sdk, complexity: medium

The keeper charges sequentially and logs plain text only.

**Files**
- `sdk/src/keeper.ts`
- `sdk/src/keeper-cli.ts`

**Acceptance criteria**
- [ ] Configurable concurrency for charging due subscriptions
- [ ] Random jitter between runs
- [ ] Optional JSON log lines and a final summary with counts and durations
- [ ] Tests using `MockPayCycle`

**Complexity:** Medium

**Hint:** Avoid sending two transactions from one account with the same sequence number.

## 10. [Contract] Grace period and retry state for failed charges
**Complexity:** High · **Labels:** wave,contracts, complexity: high

A failed charge (no allowance or balance) currently just reverts and nothing records it.

**Files**
- `contracts/src/lib.rs`
- `sdk/src/mock.ts`

**Acceptance criteria**
- [ ] Subscription gains `past_due` state and `failed_attempts`
- [ ] `charge` uses `try_transfer_from`; on failure it records the attempt instead of reverting
- [ ] After a configurable number of failures the subscription is cancelled
- [ ] Mock and SDK types updated, with contract and mock tests
- [ ] Behaviour documented in `docs/ARCHITECTURE.md`

**Complexity:** High

**Hint:** The generated token client has `try_` variants that return a `Result`.

## 11. [Contract] Optional keeper tip paid by the merchant
**Complexity:** High · **Labels:** wave,contracts,security, complexity: high

Third parties have no incentive to run keepers.

**Files**
- `contracts/src/lib.rs`
- `sdk/src/`

**Acceptance criteria**
- [ ] Plan has an optional `keeper_tip` (base units, at most 5% of amount)
- [ ] `charge` pays the tip to the caller out of the charged amount
- [ ] Merchant receives `amount - tip`; tests cover rounding and caps
- [ ] SDK and mock updated; docs describe the economics

**Complexity:** High

**Hint:** The tip must come out of the merchant's share so subscribers never pay more than the plan amount.

## 12. [Contract+SDK] Plan upgrade and downgrade with proration
**Complexity:** High · **Labels:** wave,contracts,sdk, complexity: high

Subscribers cannot move between plans without cancelling and paying again.

**Files**
- `contracts/src/lib.rs`
- `sdk/src/`
- `web/src/`

**Acceptance criteria**
- [ ] `change_plan(sub_id, new_plan_id)` for plans with the same token and merchant
- [ ] Unused time on the old period is credited against the new plan using integer maths
- [ ] Property-style tests prove no overpayment or loss of funds
- [ ] SDK, mock and a web UI control for switching
- [ ] Design notes added to `docs/ARCHITECTURE.md`

**Complexity:** High

**Hint:** Decide how credits are represented without custodying funds, and document the choice in the PR.
