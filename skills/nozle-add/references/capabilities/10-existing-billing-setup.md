# 10. Connect Nozle to my existing billing setup

**Covers:** selective adoption with explicit ownership boundaries.
**Account needs:** `plans` and `payment_connection`, as the chosen scope requires.
**Shared prerequisites:** `customer_identity`, `server_key`.

**Decide with the user**
- `ownership`: for each customer, payment, and subscription, which system owns it today and after the change.
- `overlap`: what happens where both systems could act (never charge twice).
- `migration-scope`: new customers only, selected plans, or everything.

**Implement**
- When the existing provider stays and Nozle does not support it, use external billing authority: import each active subscription with `POST /customers/{id}/billing-state-imports` (`billing_authority: external`, secret key, idempotency key; the period spans exactly one plan interval and contains now) and record the opening credit balance (plan allowance, amount consumed, remaining) so a cutover does not grant twice. Nozle then excludes those subscriptions from invoicing, upgrades, cancellation and dunning, while entitlements, `can()`, usage tracking, credits and costs work. Collection, renewals, refunds and dunning stay with the existing provider. Sources: https://docs.nozle.dev/api/import-billing-state and https://docs.nozle.dev/api/import-opening-credit-balance
- Verified behaviors to plan around: a subscription imported with external billing authority gets no plan grant until its opening balance is imported, so import it for every subscription, not only in a one-time cutover; the period must be whole plan intervals (a 30-day window is rejected for a monthly plan); importing the same external reference again with a different period returns 422 `value_already_exist` (the same reference with the same period just replays), a new reference creates a second subscription, which makes `usage.track` fail with 422 `active_subscription_ambiguous` (usage has no subscription field), so never import one per period: after the opening balance import the Engine issues each later grant period by itself (Engine code, not yet observed past a period end); an externally billed subscription cannot be terminated (405), updated or moved to another plan, and its grants keep renewing, so the application checks its own paid status before each usage call and handles cancellation and plan changes itself; and the application's own balance needs its own idempotency on a replayed operation id, because Nozle's key protects only Nozle's side.
- On a renewal or restart, look up the existing billing-state import or replay it with the original body; never reuse a key with a new body.
- Ask whether the user also wants to replace the provider; see the provider question in capability 2. Never assume it.
- Preserve the existing system's behavior and ownership for anything not explicitly moved.
- Add Nozle alongside it for the chosen scope only, behind a clear switch the application controls.
- Mirror, do not duplicate: one system activates access, the other reports.

**Verify (local only):** a customer in the existing system is untouched; a customer in the new scope is billed once; a switch back leaves no double charge.

**Do not:** replace payment or subscription logic that was not selected, or run both systems against the same charge.
