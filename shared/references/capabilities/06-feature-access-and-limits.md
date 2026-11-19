# 6. Control feature access and limits

**Covers:** entitlement checks and approved limit behavior.
**Account needs:** `entitlements` and/or `features`; plans that grant the entitlements; `spend_limits` for money caps (a missing limit is a dashboard step the user does).
**Shared prerequisites:** `customer_identity`, `server_key`.
**Read first:** `/guides/entitlements/can-endpoint`, `/guides/entitlements/spend-limits`, `/api/check-entitlement`, `/api/list-customer-budgets`, `/sdks/<lang>/entitlements`, `/guides/billing/dunning`.

**Decide with the user**
- `gate-points`: which actions are gated, and where the check runs (server side).
- `limit-behavior`: block, warn, or degrade when a limit is reached.
- `spend-limit`: whether usage billed in money needs a cap per subscription and period (hard or soft, total or per feature, plan default or subscription override), and whether it must be exact under concurrency (then a budget hold) or may be overrun by in-flight calls (then a check before the call).
- `unreserved-limits`: whether a limit needs atomic enforcement (then the credit call, or a hold when the cost is known only after the work; never a check followed by a deduct).
- `overdue-experience`: what a customer blocked for unpaid invoices sees at a gate (a pay screen with their unpaid invoices, or the billing page), and what a customer blocked by staff sees.

**Implement**
- Check access on the server right before the work. The check reports eligibility and reserves nothing; it may be cached, so check right before the work, not at login.
- For a credit-backed action the gate is the credit call's answer, not the access check or the advisory credit check.
- Read every reason a check can deny with (units, money, credits, a blocked customer) from the check's page and compare the reason or code exactly; show the limit or the pay path the reason calls for, and never retry a denial ("Refusals and errors").
- Gate only what the account configures; use feature and privilege codes from the entitlement read. Read on the plans pages how an entitlement change applies to a plan family, and how entitlements are created without replacing existing ones.

**Verify (local only):** a denied check blocks the action; the limit behavior matches the decision; a blocked customer gets the pay path, not an error; a retry does not double-consume.

**Do not:** gate only in the browser, treat an access check as a reservation (only a hold reserves), retry a denial, match refusal text instead of the exact reason, or invent privilege codes.
