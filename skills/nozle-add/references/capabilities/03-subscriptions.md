# 3. Manage subscriptions

**Account:** `plans`; the `organization` family holds cancellation and plan-change policies.
**Read first:** `/guides/billing/subscriptions`, `/api/subscribe`, `/api/subscription-management`, `/api/plan-transition-policies`, `/api/cancel-subscription`, `/sdks/<lang>/billing`.

**Decide:** `subscription-selection` (which subscription each action applies to); `change-policy` (only changes the account's policies support); `change-timing` (now or at period end; ask, do not rely on the default); `cancel-policy` (from the organization's configured fields; never choose for the merchant).

**Build**
- Resolve the subscription explicitly; surface ambiguity.
- Read the transition policies before planning plan changes; each missing pair the product offers is a dashboard step.
- A subscribe call may add a second subscription instead of replacing one: a plan move is a change call or a checkout, never a second create.
- Mirror pending cancellations and scheduled downgrades locally, as pending until Nozle confirms.
- Paid plans only after payment, through one creating code path (financial-rules.md, `paid-without-payment`).

**Verify:** two active subscriptions require an explicit choice; a pending change shows as pending; a withdrawn change leaves state unchanged.
