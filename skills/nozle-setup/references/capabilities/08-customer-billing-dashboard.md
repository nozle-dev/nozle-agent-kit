# 8. Build a customer billing dashboard

**Covers:** plans, invoices, receipts, subscriptions, usage, credits, payment method, refunds, and paying what is owed.
**Account needs:** `plans`; other families depending on what the dashboard shows.
**Shared prerequisites:** `customer_identity`, `server_key`.
**Read first:** `/sdks/react/billing-portal`, `/sdks/react/hooks`, `/guides/billing/invoices`, `/guides/billing/payments`, `/guides/billing/dunning`, `/guides/billing/checkout#pay-links`, `/api/billing-status`, `/api/manage-payment-method`, `/sdks/<lang>/billing`.

**Decide with the user**
- `dashboard-sections`: which of plans, invoices and receipts, subscription, usage, credits, payment method and refunds or credit notes to show.
- `actions`: read-only, or which actions (change plan, buy credits, update the payment method, pay an unpaid invoice) are offered.
- `overdue-experience`: when the customer has unpaid invoices or is blocked for them, how the dashboard shows it and where its pay action leads (a pay link per invoice, or the hosted billing page).

**Implement**
- The customer always comes from the authenticated session on the backend, never from the browser; secret keys stay on the backend.
- With a Node backend and React, the SDK pages describe one backend route that serves every React billing hook; use it rather than a route per hook. Other stacks: build the backend routes with the SDK's invoice, usage, credit and payment reads, and native screens.
- Paying what is owed: list the customer's unpaid invoices and offer the pay action the docs give for an invoice (a pay link through the provider, or the hosted billing page). A customer blocked for unpaid invoices can pay from here; one blocked by staff sees "contact support".
- Show server aggregates as returned. Show missing data as unavailable, never as zero or "all clear".

**Verify (local only):** each section renders from fixtures, a failed read shows an error state, an overdue customer sees the pay action, and the customer comes from the session, not a parameter.

**Do not:** recompute totals from samples, leave a failed read looking empty, or charge an invoice from the browser.
