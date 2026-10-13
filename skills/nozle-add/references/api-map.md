# API map: which Nozle API serves each choice, and where it plugs in

Use this to choose the integration surface and name the exact endpoint in the coverage map. Re-check each endpoint on its page in the docs MCP (`/api/<page>`) before writing code; this table is a starting point, not the contract.

## Pick the surface

0. Run `nozle-check env` (as one plain command with the absolute application path: `nozle-check env <path>`, or `node <skill folder>/scripts/nozle-check.mjs env <path>`; never chain it with `cd`) and follow [stack-support.md](stack-support.md); it decides the surface for each half and what to say when no SDK exists.
1. The application's own language decides. Node, Python and Go have a server SDK; React has components and hooks that call the merchant's backend. Use the SDK when the installed version exports the operation.
2. No SDK for the language (Ruby, Java, PHP, and so on; Go has `nozle-go`), or the SDK lacks the operation: call the REST API from the backend with the same contract. State that choice in the coverage map.
3. Never call a secret-key endpoint from browser or mobile code. The browser talks to the merchant's backend; the backend talks to Nozle.
4. Base URLs: Core `https://api.nozle.app/core/api/v1`, Engine `https://api.nozle.app/engine/api/v1`. They are different services; do not move an operation between them. Server calls use `Authorization: Bearer <secret key from the environment>`. The key is the user's, never created or read by the agent.

## Endpoints by choice

| Choice | REST (service) | Node / Python SDK | Where it plugs in |
|---|---|---|---|
| 1 Pricing and plans | `GET /plans` (Engine; publishable key allowed) | `plans()` | Pricing page, loader or backend route that feeds it |
| 2 Checkout and payments | `POST /checkout`, `GET /checkout/{id}`, `POST /checkout/{id}/verify` (Engine) | `checkout()`, `checkoutStatus()`, `verifyCheckout()` | Backend route behind the buy button; return URL handler; activation only after confirmed payment |
| 3 Subscriptions | `GET /subscriptions/current`, `GET /subscriptions/options`, `POST /subscriptions/preview`, `POST /subscriptions/change`, `DELETE /subscriptions/{id}` (Engine) | billing namespace | Account or settings backend; plan-change and cancel actions |
| 4 Credits and top-ups | `GET /credits/{id}/balance`, `GET /credits/{id}/transactions`, `POST /credit-top-up-purchases` (Engine) | credits namespace | Balance display; top-up button; replaces any home-grown balance column only if the user approves |
| 5 Track usage | `POST /events` (Core, one event per operation with a stable `transaction_id`); `POST /usage/track` (Engine, needs an `Idempotency-Key`) | `track()`; `usage.track(input, { idempotencyKey })` | The success boundary of each billable operation, after the result exists and before the response is final |
| 6 Access and limits | `GET /can` (Engine); `POST /usage/check`; `POST /check-and-deduct` (no idempotency key) | `can()`; `usage.check()` | Gate before a paid or limited operation. `can()` does not reserve credits |
| 7 Costs and margins | `POST /cost-events` (Engine; the published OpenAPI lists Core, the code serves it on Engine); margin reads under `/margin/*` | cost events, margin queries | Next to the provider call that incurs the cost, using the provider's reported usage |
| 8 Billing dashboard | `GET /billing/status`, `GET /invoices`, balance and transaction reads (Engine) | billing and credits namespaces; React `components`, `hooks`, `gates` | Authenticated account area; customer id from the session, never from the browser |
| 9 Sync | Nozle webhooks to a merchant endpoint (signature verified); Core customer endpoints, including `POST /customers` upsert | webhook helpers; customers namespace | A webhook receiver that verifies signatures, deduplicates, and tolerates out-of-order delivery; customer upsert at signup |
| 10 Existing billing setup | `POST /customers`, import endpoints (opening balances, billing state) | customers namespace | A one-time migration script or admin route, not the request path |
| LLM calls | Proxy `/proxy/openai/*` and `/proxy/anthropic/*` with `X-Nozle-Key` (the `Authorization` header stays the provider key) | `wrapOpenAI`, `wrapAnthropic` | Only where every caller of that client is billable; otherwise track explicitly at the operation boundary |

## Rules that apply to every surface

- Derive the customer from authenticated backend identity. Use the application's stable id as `external_customer_id`.
- Keep `transaction_id`, `timestamp`, and idempotency keys identical across retries. The SDK stamps the current time when no timestamp is passed, which makes a retry a different payload and returns 409; pass a fixed per-unit timestamp. Base the keys on a business or request id, never a per-attempt random id. The Python SDK's `usage.track` takes no timestamp and it has no cost-event method: use REST for those.
- Events need an active subscription for the customer; say so in the manual setup list when the app creates none.
- A frontend-plus-backend repository gets work in both halves: secret-key calls on the backend, and the React surface (pricing, gates, dashboard) calling the backend route. List each half as its own step, backend first.
