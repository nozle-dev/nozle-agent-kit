# 3. Manage subscriptions

**Covers:** status, supported plan changes, cancellation, and lifecycle sync.
**Account needs:** `plans`; the `organization` family shows cancellation and plan-change policies that decide behavior.
**Shared prerequisites:** `customer_identity`, `plan_mapping`, `server_key`.
**Read first:** `/guides/billing/subscriptions`, `/api/subscribe`, `/api/subscription-management`, `/api/plan-transition-policies`, `/api/cancel-subscription`, `/sdks/<lang>/billing`.

**Decide with the user**
- `subscription-selection`: when a customer can hold several subscriptions, which one does each action apply to?
- `change-policy`: which upgrades and downgrades does the application offer (only those the account's policies support)?
- `change-timing`: does a plan change apply immediately or at the end of the period? Ask instead of relying on the policy default.
- `cancel-policy`: end of period or immediate, and what happens to credits and the final invoice (use the organization's configured cancellation fields; do not choose for the merchant).

**Implement**
- Resolve the subscription explicitly; surface ambiguity instead of picking the first.
- Plan changes depend on the organization's transition policies: read the account for them before planning a plan-change feature, and make every missing pair the product offers a dashboard step. Read on the subscription pages what a plan change needs (payment first for an amount due, the change-timing option) and what each refusal means.
- Subscribing to another plan may add a second subscription rather than replace the first; read the subscribe page, and make a plan move a change call or a checkout, never a second create.
- When the scope offers cancellation or a scheduled downgrade, build the route and mirror the pending state locally, so the app shows what will happen at period end. Treat pending changes as pending until Nozle confirms them.
- Subscribe to a paid plan only after checkout or confirmed payment, and keep one code path that creates subscriptions (look up the active one first); see "Build traps" in financial-rules.md.

**Verify (local only):** two active subscriptions require an explicit choice; a pending change is shown as pending; a withdrawn change leaves state unchanged.

**Do not:** assume one subscription per customer, or invent a cancellation policy.
