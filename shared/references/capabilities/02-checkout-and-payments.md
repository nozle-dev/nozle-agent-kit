# 2. Add checkout and payments

**Account:** `plans`, `payment_connection` (a missing provider is a dashboard step).
**Read first:** `/guides/billing/checkout`, `/api/create-checkout`, `/sdks/<lang>/billing`, `/integrations/index` and the provider's page; with tax, `/guides/billing/stripe-tax`, `/guides/billing/tax-ids`.

**Decide:** the payment provider (decision-questions.md, "Payment provider"); `payment-ownership` (Nozle collects for everything in scope); `return-origins`; `fulfillment-trigger` (which authoritative confirmation activates access).

**Build**
- Start checkout from the backend for the session customer, never a browser-sent id.
- Handle every result variant the installed SDK's checkout result type declares (redirect, provider modal, processing, completed, scheduled), not only the happy path.
- Set what the checkout page says a customer needs first (a payment connection; an address or tax id when the organization calculates tax) when creating or updating the customer. Handle each refusal it lists by code; an unconfigured item is a setup step.
- An unpaid checkout expires: read which webhook says so, so no pending state lasts forever.
- The upgrade route accepts a customer on the automatic free plan; status and verification work for a customer with no subscription yet.
- Activate only from a verified webhook or a server-side status read.

**Verify:** a mock per result variant; a redirect alone activates nothing; a replayed confirmation activates once; each documented refusal reaches its handling.
