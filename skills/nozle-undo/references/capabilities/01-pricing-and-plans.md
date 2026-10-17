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
- Show every charge a plan carries: the base price, included usage, and each graduated, per-unit or overage rate with the threshold where it starts. A pricing page that shows a limit without its overage rate understates the price. The public catalog (`GET /api/v1/plans`) carries each plan's `charges` with their models and tiers, `entitlements` and `credit_grant_rules`, so read rates and limits from it; do not hard-code them. A `pk_` key gets a trimmed catalog without plans pending deletion; a secret key gets the whole plan, so never pass a secret-key response to the browser. React 0.11+ renders these itself (`PricingTable`, `PlanCard`, `PlanComparison`, `planFeatures()`); React 0.12+ also reads plan families. When the response has `families`, a family groups the billing intervals of one offer and carries the pricing-page settings (`show_on_pricing`, `pricing_position`, `pricing_highlighted`, `badge_text`, `cta_text`): show one card per visible family and let the interval switch pick its plan. A family that is not shown on pricing hides its plans from the page, so a new plan can be missing until its family is made visible; check that before calling the page done. Check the real response of this account before relying on a field. A pricing page with the base price alone is still a defect.

**Verify (local only):** a fixture response renders each plan, an unknown plan code is handled, and no price is derived by arithmetic in the UI.

**Do not:** put a secret key in client code, or hard-code prices that the account already defines.
