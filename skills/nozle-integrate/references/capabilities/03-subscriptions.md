# 3. Manage subscriptions

**Covers:** status, supported plan changes, cancellation, and lifecycle sync.
**Account needs:** `plans`; the `organization` family shows cancellation and free-to-paid policies that decide behavior.
**Shared prerequisites:** `customer_identity`, `plan_mapping`, `server_key`.

**Decide with the user**
- `subscription-selection`: when a customer can hold several subscriptions, which one does each action apply to?
- `change-policy`: which upgrades and downgrades does the application offer (only those the account's policies support)?
- `cancel-policy`: end of period or immediate, and what happens to credits and the final invoice (use the organization's configured cancellation fields; do not choose for the merchant).

**Implement**
- Load the current subscription management page from the docs (https://docs.nozle.dev/llms.txt) and check the installed SDK exports before coding; mark any detail you cannot confirm as unverified.
- Resolve the subscription explicitly; surface ambiguity instead of picking the first.
- Plan changes need an organization transition policy: on an organization without one, a plan change (`preview_subscription_change`, a downgrade, `checkout` for a customer already on a plan, entity `change_plan`) returns `422 plan_transition_policy_required` (state refusals are 422 and conflicts 409; decide on the `code`). Check the account read for the policy before planning a plan-change feature, and make it a dashboard step when it is missing. `subscribe` to another plan adds a second active subscription instead of replacing the first, so a plan move is a change or a cancel plus a new subscription, and the new subscription id must be passed to `track`. Node and Python 0.10.0 cache the resolved subscription per client but clear it after the client's own `subscribe`, `checkout`, cancel and transition calls (0.9.x never did); a change made by another process or client instance still needs an explicit subscription id. `subscribe` for an unknown customer returns `404 customer_not_found` instead of creating one, so create the customer first (B4).
- Every plan-change entry point (subscribe, checkout and its preview, transition preview and apply, plan change options) takes `change_at`: `immediate` or `end_of_period`; ask which one the product wants instead of relying on the policy default. An immediate change that leaves an amount due is paid first: transition apply answers 422 `payment_required`, and the change goes through checkout, which applies it only once paid. Inside a plan family, switching interval (monthly to yearly) is an immediate, prorated change. While a checkout is being paid, merchant changes to that subscription answer 409 `checkout_in_progress`; retry after it settles.
- A plan change between two paid plans needs a transition policy for that pair (and its reverse for a downgrade): list every pair the product offers as a setup step.
- When the scope offers cancellation or a scheduled downgrade, build the route and mirror the pending state locally, so the app shows what will happen at period end.
- Treat pending changes as pending until Nozle confirms them.
- Subscribe to a paid plan only after checkout or confirmed payment, and keep one code path that creates subscriptions (look up the active one first); see "Build traps" in financial-rules.md.

**Verify (local only):** two active subscriptions require an explicit choice; a pending change is shown as pending; a withdrawn change leaves state unchanged.

**Do not:** assume one subscription per customer, or invent a cancellation policy.
