# 2. Add checkout and payments

**Covers:** checkout, confirmation, and fulfillment.
**Account needs:** `plans` and `payment_connection`. A missing provider is a manual dashboard step.
**Shared prerequisites:** `customer_identity`, `plan_mapping`, `server_key`, `webhook_endpoint`.

**Payment provider and replacement.** Name the provider the product uses today (from the code), the provider connection in the account (`payment_connection`), and the providers Nozle supports, read from the docs MCP at run time (checkout documents `stripe` and `razorpay` results; the API reference and Core list other providers, and a provider with no guide, such as Cashfree, is unverified: say so and do not rely on it). Ask which provider production uses. If the current provider is not a documented one, or the user wants to change, ask one question with these options and wait: (a) replace it with a supported provider through Nozle checkout, which needs an explicit yes, a manual provider connection in the dashboard, and a plan for existing subscribers, because subscriptions are not migrated automatically (Node `customers.upsert({ billingConfiguration })` can link each customer to its existing Stripe customer); (b) keep the current provider and use Nozle for metering, credits and entitlements only (capability 10); (c) leave payments out. Never plan or write a replacement without an explicit yes.

**Decide with the user**
- `payment-ownership`: does Nozle take over payment collection, or does an existing provider keep it? (If an existing provider stays, this is capability 10.)
- `return-origins`: which origins may the checkout return to?
- `fulfillment-trigger`: what authoritative confirmation activates access?

**Implement**
- Call `nozle.checkout(customerId, planCode, returnUrl)` from the merchant backend. The result is a discriminated value (`stripe`, `razorpay`, `hosted`, `processing`, `completed`, `scheduled`); handle each variant, including `processing` and `scheduled`, and `completed` with `payment_source: saved_payment_method` (a saved card was charged in the same request). Return origin must be allowlisted by the merchant backend. Source: https://docs.nozle.dev/sdks/node/billing.md
- An unpaid checkout expires after 23 hours: the pending subscription becomes `canceled` with `cancelation_reason: timeout` and `subscription.canceled` is sent, so the app must not keep it as pending forever. Checking out the same plan again reopens the open checkout; a different plan replaces it. A customer without an assigned provider connection gets 422 `payment_provider_required` (no fallback to another connection). 409 `checkout_in_progress` (a double submit) or `subscription_change_pending` means wait and re-read, not retry with a new key.
- Derive the customer from the authenticated server session, never from a browser-supplied ID.
- Activate access only from authoritative payment confirmation (webhook or server-side status), never from the browser redirect.

**Verify (local only):** a mock for each result variant; a redirect without confirmation does not activate; a replayed confirmation activates once.

**Do not:** trust the redirect, accept a client-sent customer ID, or create checkout from client code.
