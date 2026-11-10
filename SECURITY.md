# Security Policy

PayCycle is early-stage and **unaudited**. Do not use it with real funds on mainnet until it has been audited.

## Reporting a vulnerability
Please do not open a public issue. Use **Security → Report a vulnerability** on this repository with reproduction steps and affected files. We aim to acknowledge reports within 3 days.

## Design notes relevant to security
- The contract never holds funds. Charges use token allowances (`transfer_from`), so a subscriber's exposure is limited to the allowance they approve.
- `charge` is permissionless by design. It can only move the plan's fixed amount from the subscriber to the plan's merchant, and only once per elapsed period.
- Subscribers can cancel at any time, and can revoke their allowance directly on the token contract.
- The admin can only change the minimum plan period. The admin cannot move funds.
