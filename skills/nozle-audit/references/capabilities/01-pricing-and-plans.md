# 1. Show pricing and plans

**Account:** `plans`; read each plan with `get_integration_resource`.
**Read first:** `/guides/billing/plans`, `/api/list-plans`, `/guides/billing/plan-versions`, `/guides/billing/multi-currency-pricing`; React: `/sdks/react/components/pricing-table`.

**Decide:** `plan-source` (read plans at runtime, or a local list mirroring Nozle codes); `plan-scope` (which plans appear).

**Build**
- Map each app tier to a plan code from the account read; never invent one or map to an archived plan.
- Read plans through the backend. A publishable key gets only the public catalog; never pass a secret-key response to the browser.
- Show every charge a plan carries (base price, included usage, each tiered or overage rate with its threshold), exactly as returned: minor units plus currency, decimal strings as strings, no arithmetic.
- Show what plan family settings make visible, and check a new plan is not hidden by its family.

**Verify:** fixtures render each plan; an unknown code is handled; no price is derived in the UI.
