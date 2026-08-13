# Deployment runbook

## Ready now

1. Run `pnpm run release:check`.
2. Review the production build in `dist/`.
3. Set variables from `.env.example` in staging.
4. Replace the canonical domain if the final domain differs.
5. Connect frontend routes to the versioned API contract.

## Required before accepting real orders

- Replace demonstration catalogue, pricing, inventory and warranty claims.
- Configure OTP, database, payment gateway and webhook verification.
- Confirm GST identity, store address, customer-support details and sale dates.
- Have counsel approve privacy, terms, shipping, returns and cookie policies.
- Add provider secrets only in server-side environment variables.
- Complete a test payment, refund, failed-payment and inventory-race scenario.
- Configure CSP/security headers, monitoring, backups and rollback.

## Release gate

- Build and deterministic release audit pass.
- Staging smoke test passes on phone, tablet and desktop.
- Accessibility and performance budgets pass.
- No demonstration disclosure remains when live data is enabled.
- Business owner signs off catalogue, promotions and legal text.
