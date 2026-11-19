# 1. Show pricing and plans

**Covers:** plan listings, comparisons, and selection.
**Account needs:** `plans` (check `get_capability_catalog`). Read each plan with `get_integration_resource`.
**Shared prerequisites:** `plan_mapping`, `server_key`.
**Read first:** `/guides/billing/plans`, `/api/list-plans`, `/guides/billing/plan-versions`, `/guides/billing/multi-currency-pricing`; with React, `/sdks/react/components/pricing-table`.

**Decide with the user**
- `plan-source`: should the page read plans from Nozle at runtime, or keep a local list that mirrors Nozle plan codes?
- `plan-scope`: which Nozle plans appear (all, or a named subset)?

**Implement**
- Map each application tier to a Nozle plan code from the account read; never invent a code, and never map to a plan the account read shows as archived.
- Read plans from the merchant backend. A publishable key gets only the public catalog; a secret-key response holds more, so never pass it to the browser. The catalog page says which fields each key gets and how plan families group intervals and pricing-page settings.
- Show every charge a plan carries (base price, included usage, each tiered or overage rate with its threshold) from the catalog response; a page that shows a limit without its overage rate understates the price. Show prices exactly as returned (minor units plus currency, decimal strings as strings); never recompute or round.
- When the catalog groups plans into families, show what the family settings say is visible, and check a new plan is not hidden by its family before calling the page done.

**Verify (local only):** a fixture response renders each plan, an unknown plan code is handled, and no price is derived by arithmetic in the UI.

**Do not:** put a secret key in client code, or hard-code prices that the account already defines.
