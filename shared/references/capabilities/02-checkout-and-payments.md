# 2. Add checkout and payments

**Covers:** checkout, confirmation, and fulfillment.
**Account needs:** `plans` and `payment_connection`. A missing provider is a manual dashboard step.
**Shared prerequisites:** `customer_identity`, `plan_mapping`, `server_key`, `webhook_endpoint`.

**Payment provider and replacement.** Name the provider the product uses today (from the code), the provider connection in the account (`payment_connection`), and the providers Nozle supports, read from the docs MCP at run time (checkout documents Stripe and Razorpay results; the API reference and Core list other providers, and a provider with no guide, such as Cashfree, is unverified: say so and do not rely on it). Ask which provider production uses. Nozle billing runs only through Nozle checkout with a provider Nozle documents; the plugin never keeps another provider billing beside Nozle through external billing imports. If the current provider is not a documented one, ask one question with these options and wait: (a) move payments to a supported provider through Nozle checkout, always the recommended option (name the documented provider that fits the product's currency and market, and say whether the account already has its connection), which needs an explicit yes, a manual provider connection in the dashboard, and a plan for existing subscribers, because subscriptions are not migrated automatically (capability 10); (b) leave payments, subscriptions and paid-plan credits out of this integration, keeping only what needs no payment (usage and cost tracking, margins, a free plan): paid customers then stay entirely on the current system. Never offer an undocumented provider as a Nozle option, and never plan or write a move without an explicit yes.

**Decide with the user**
- `payment-ownership`: Nozle collects payment for everything in scope; anything the existing provider keeps billing stays out of Nozle billing until it moves (capability 10).
- `return-origins`: which origins may the checkout return to?
- `fulfillment-trigger`: what authoritative confirmation activates access?

**Implement**
- Call `nozle.checkout(customerId, planCode, returnUrl)` from the merchant backend. The result is a discriminated value (`razorpay` for the modal, `hosted`, `processing`, `completed`, `scheduled`); handle each variant (a `hosted` result, which is how every Stripe checkout and Razorpay link answers, is handled by redirecting the buyer to its `url`; the merchant page never loads Stripe.js or a Stripe publishable key, and the request may pass `cancel_url`), including `processing` and `scheduled`, and `completed` with `payment_source: saved_payment_method` (a saved card was charged in the same request). Return origin must be allowlisted by the merchant backend. Source: https://docs.nozle.dev/sdks/node/billing.md
- An unpaid checkout expires after 23 hours: the pending subscription becomes `canceled` with `cancelation_reason: timeout` and `subscription.canceled` is sent, so the app must not keep it as pending forever. Checking out the same plan again reopens the open checkout; a different plan replaces it. A customer without an assigned provider connection gets 422 `payment_provider_required` (no fallback to another connection). 409 `checkout_in_progress` (a double submit) or `subscription_change_pending` means wait and re-read, not retry with a new key.
- Assign the approved provider connection to each customer when the code creates it (Node `customers.upsert({ billingConfiguration: { paymentProviderCode } })`, REST `billing_configuration`). An organization with more than one connection, or a customer created before the connection existed, otherwise gets 422 `payment_provider_required` at checkout.
- A customer's automatic free-plan subscription is not a paid plan: the upgrade route must accept a customer on the free plan.
- Checkout status and verify work for a customer who has no subscription yet (a first purchase, a legacy customer moving over): scope them by what the customer has, and test that case.
- The return URL's origin must be on the organization's allowlist, or checkout answers `invalid_return_url`: list it as a setup step.
- Derive the customer from the authenticated server session, never from a browser-supplied ID.
- Activate access only from authoritative payment confirmation (webhook or server-side status), never from the browser redirect.

**Verify (local only):** a mock for each result variant; a redirect without confirmation does not activate; a replayed confirmation activates once.

**Do not:** trust the redirect, accept a client-sent customer ID, or create checkout from client code.
