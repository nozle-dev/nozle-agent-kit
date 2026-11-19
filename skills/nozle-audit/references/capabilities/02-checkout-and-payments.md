# 2. Add checkout and payments

**Covers:** checkout, confirmation, and fulfillment.
**Account needs:** `plans` and `payment_connection`. A missing provider is a manual dashboard step.
**Shared prerequisites:** `customer_identity`, `plan_mapping`, `server_key`, `webhook_endpoint`.
**Read first:** `/guides/billing/checkout`, `/api/create-checkout`, `/sdks/<lang>/billing`, `/integrations/index` and the provider's page; for an organization that calculates tax, `/guides/billing/stripe-tax` and `/guides/billing/tax-ids`.

**Payment provider and replacement.** Name the provider the product uses today (from the code), the provider connection in the account (`payment_connection`), and the providers Nozle documents, read from the docs at run time (a provider with no guide is unverified: say so and do not rely on it). Ask which provider production uses. Nozle billing runs only through Nozle checkout with a provider Nozle documents; the plugin never keeps another provider billing beside Nozle through external billing imports. If the current provider is not a documented one, ask one question with these options and wait: (a) move payments to a supported provider through Nozle checkout, always the recommended option (name the documented provider that fits the product's currency and market, and say whether the account already has its connection), which needs an explicit yes, a manual provider connection in the dashboard, and a plan for existing subscribers, because subscriptions are not migrated automatically (capability 10); (b) leave payments, subscriptions and paid-plan credits out of this integration, keeping only what needs no payment (usage and cost tracking, margins, a free plan): paid customers then stay entirely on the current system. Never offer an undocumented provider as a Nozle option, and never plan or write a move without an explicit yes.

**Decide with the user**
- `payment-ownership`: Nozle collects payment for everything in scope; anything the existing provider keeps billing stays out of Nozle billing until it moves (capability 10).
- `return-origins`: which origins may the checkout return to?
- `fulfillment-trigger`: what authoritative confirmation activates access?

**Implement**
- Start checkout from the merchant backend. The checkout result is a set of variants (the checkout page lists them: redirect, provider modal, processing, completed, scheduled, and so on); handle every variant the installed SDK's result type declares, not only the happy path.
- Read on the checkout page what the customer needs before checkout can start (an assigned payment connection, and an address or tax id when the organization calculates tax) and set it when the code creates or updates the customer. Each refusal the page lists (no provider, missing tax location, tax check pending, a checkout already in progress, an archived plan, a return URL not on the allowlist) is handled by its code as financial-rules.md says; an unconfigured item becomes a setup step.
- An unpaid checkout expires; read how and which webhook says so, so the app never keeps a pending subscription forever.
- A customer's automatic free-plan subscription is not a paid plan: the upgrade route must accept a customer on the free plan. Checkout status and verification work for a customer with no subscription yet; scope them by what the customer has, and test that case.
- Derive the customer from the authenticated server session, never from a browser-supplied ID. Activate access only from authoritative payment confirmation (webhook or server-side status), never from the browser redirect.

**Verify (local only):** a mock for each result variant; a redirect without confirmation does not activate; a replayed confirmation activates once; each documented refusal reaches its handling.

**Do not:** trust the redirect, accept a client-sent customer ID, or create checkout from client code.
