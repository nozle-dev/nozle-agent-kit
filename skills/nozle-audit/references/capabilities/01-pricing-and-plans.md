# 1. Show pricing and plans

**Covers:** plan listings, comparisons, and selection.
**Account needs:** `plans` (check `get_capability_catalog`). Read each plan with `get_integration_resource`.
**Shared prerequisites:** `plan_mapping`, `server_key`.

**Decide with the user**
- `plan-source`: should the page read plans from Nozle at runtime, or keep a local list that mirrors Nozle plan codes?
- `plan-scope`: which Nozle plans appear (all, or a named subset)?

**Implement**
- Map each application tier to a Nozle plan code from the account read; never invent a code.
- Read plans from the merchant backend. The browser `pk_` key is only for the public plan catalog; load the current plan-catalog page from the docs before writing the call and mark it unverified if unavailable.
- Show prices exactly as returned (amounts in cents plus currency, decimal strings as strings); do not recompute or round.
- Show every charge a plan carries: the base price, included usage, and each graduated, per-unit or overage rate with the threshold where it starts. A pricing page that shows a limit without its overage rate understates the price. The public catalog (`usePlans`, `GET /api/v1/plans` with a `pk_` key) is typed in the React SDK as five fields (`code`, `name`, `amount_cents`, `amount_currency`, `interval`) but the API returns the **whole plan object** (checked on production with a publishable key): `charges` with their models and tiers, `entitlements`, `credit_grant_rules`, `credit_pool_policies`, `usage_thresholds`, `taxes`, and also internal fields (`nozle_id`, `customers_count`, `active_subscriptions_count`, `draft_invoices_count`). So the rates and limits for a pricing page can be read from the catalog; do not hard-code them. Pick the fields to show, never pass the raw object to the browser or the page (it carries internal counts and ids), and prefer a backend route that returns only the display fields. Check the real response of this account before relying on a field, because the types do not declare them. A pricing page with the base price alone is still a defect.

**Verify (local only):** a fixture response renders each plan, an unknown plan code is handled, and no price is derived by arithmetic in the UI.

**Do not:** put a secret key in client code, or hard-code prices that the account already defines.
