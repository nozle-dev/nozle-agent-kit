# 8. Build a customer billing dashboard

**Account:** `plans`, plus the families the sections show.
**Read first:** `/sdks/react/billing-portal`, `/sdks/react/hooks`, `/guides/billing/invoices`, `/guides/billing/payments`, `/guides/billing/dunning`, `/guides/billing/checkout#pay-links`, `/api/billing-status`, `/api/manage-payment-method`, `/sdks/<lang>/billing`.

**Decide:** `dashboard-sections` (plans, invoices and receipts, subscription, usage, credits, payment method, refunds); `actions` (read-only, or change plan, buy credits, update the payment method, pay an unpaid invoice); `overdue-experience` (how unpaid invoices or a block show, and where the pay action leads).

**Build**
- The customer comes from the backend session; keys stay on the backend.
- Node backend with React: the one backend route the SDK pages describe serves every billing hook. Other stacks: backend routes over the SDK's reads, and native screens.
- List unpaid invoices with the pay action the docs give (a pay link, or the hosted billing page). A staff block shows "contact support".
- Show server aggregates as returned; missing data shows as unavailable, never zero or "all clear".

**Verify:** each section renders from fixtures; a failed read shows an error; an overdue customer sees the pay action; the customer comes from the session, not a parameter.
