# 8. Build a customer billing dashboard

**Covers:** plans, invoices, subscriptions, usage, credits, and payments.
**Account needs:** `plans`; other families depending on what the dashboard shows.
**Shared prerequisites:** `customer_identity`, `server_key`.

**Decide with the user**
- `dashboard-sections`: which of plans, invoices, subscription, usage, credits, and payment method to show.
- `actions`: read-only, or which actions (change plan, buy credits) are offered.

**Implement**
- React components use the merchant backend for customer billing operations; never expose a secret key or trust a browser-supplied customer ID. Load the current React SDK page from https://docs.nozle.dev/llms.txt and check the installed `@nozle-js/react` version before coding; mark unconfirmed details as unverified.
- Node backend with React: serve every customer billing read from one route, `createBillingHandler(nozle, { getCustomerId })` (Node 0.13+; web-standard `(request) => Response` for Next.js route handlers, Hono, Remix, Bun and Deno; the customer comes only from `getCustomerId`, which reads the session), and point `BillingProvider billingEndpoint` at it (`billingHeaders` for a CSRF token). The React 0.11+ hooks (`useSubscription` with `past_due`, `useEntitlement`, `useCreditBalance`, `useCreditHistory`, `useUsage`, `useUpgradePreview`, `useInvoices`, `useInvoiceDownload`) and `CurrentPlan`, `CreditBalance`, `CreditHistory`, `UsageBreakdown`, `UsageTrend` read it. React 0.11 needs `@tanstack/react-query` v5 and is themed with `appearance`, not Tailwind or host CSS. Other stacks: build the backend routes yourself with the SDK's `invoices`, `currentUsage`/`current_usage`/`CurrentUsage` and `pastUsage` reads.
- Show server aggregates as returned. Show missing data as unavailable, never as zero or "all clear".

**Verify (local only):** each section renders from fixtures, a failed read shows an error state, and the customer comes from the session, not a parameter.

**Do not:** recompute totals from samples or leave a failed read looking empty.
