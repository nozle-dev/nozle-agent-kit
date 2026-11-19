# 6. Control feature access and limits

**Account:** `entitlements` and `features`; plans that grant them; `spend_limits` for money caps (a missing one is a dashboard step).
**Read first:** `/guides/entitlements/can-endpoint`, `/guides/entitlements/spend-limits`, `/api/check-entitlement`, `/api/list-customer-budgets`, `/sdks/<lang>/entitlements`, `/guides/billing/dunning`.

**Decide:** `gate-points` (server side); `limit-behavior` (block, warn, degrade); `spend-limit` (a money cap per subscription and period, hard or soft, total or per feature, and whether it must be exact under concurrency, which needs a hold); `unreserved-limits` (atomic enforcement needs the credit call or a hold, never check-then-deduct); `overdue-experience` (what a customer blocked for unpaid invoices, or by staff, sees at a gate).

**Build**
- Check on the server right before the work, not at login; the check reserves nothing and may be cached.
- For credit-backed actions the gate is the credit call's answer, not the access check.
- Read every reason a check can deny with (units, money, credits, blocked customer) from its page and compare it exactly; show the limit or the pay path the reason calls for; never retry a denial (financial-rules.md, "Refusals and errors").
- Use only feature codes from the entitlement read; read how entitlement changes apply to a plan family.

**Verify:** a denial blocks the action; limit behavior matches the decision; a blocked customer gets the pay path, not an error; a retry does not double-consume.
