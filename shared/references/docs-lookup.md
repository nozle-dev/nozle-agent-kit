# Look up every Nozle fact before using it

The kit carries no API facts: endpoints and their service, fields, SDK method names and signatures, versions, defaults, limits, error codes. Read them when you need them from the docs MCP, then confirm SDK names in the installed SDK's types. When neither is reachable, mark the contract `unverified` and defer the edits that depend on it. Never fill a gap from memory, an earlier project or an example in this kit.

## Contents

- Docs MCP
- Installed SDK types
- Where each fact lives
- Before writing each call

## Docs MCP

The plugin bundles `nozle-docs` (Claude Code: `mcp__plugin_nozle-agent-kit_nozle-docs__search_nozle` and `mcp__plugin_nozle-agent-kit_nozle-docs__query_docs_filesystem_nozle`).

- `search_nozle`: a question in words.
- `query_docs_filesystem_nozle`: exact reads. The page `/api/usage-track` is the file `/api/usage-track.mdx`. `head -200 /api/usage-track.mdx` reads it; `rg -n "period_invoiced" /api /guides /sdks` finds a code; `rg -n -A40 "^  /events:" /openapi/nozle-openapi.yaml` reads one operation with its `servers:` (which service serves it).

Without the MCP, read `https://docs.nozle.dev/<path>.md` (index: `https://docs.nozle.dev/llms.txt`). Cite the page path in the scope and in each task's evidence.

## Installed SDK types

| SDK | Version and types |
|---|---|
| Node `@nozle-js/node` | `node_modules/@nozle-js/node/package.json`; `*.d.ts` under `node_modules/@nozle-js/node/dist` |
| React `@nozle-js/react` | `*.d.ts` under `node_modules/@nozle-js/react/dist` |
| Python `nozle-sdk` | `.venv/lib/python*/site-packages/nozle/` (`*.py`, `*.pyi`); version in the `nozle_sdk-*.dist-info` folder |
| Go `github.com/nozle-dev/nozle-go` | `go.mod`; source under `$(go env GOMODCACHE)/github.com/nozle-dev/nozle-go@<version>/` |

When the SDK is not installed yet, take the method from the docs for the version you will install, install it, then confirm in the declarations before writing the call. A method the installed version lacks means an upgrade within scope, or the REST endpoint.

## Where each fact lives

`<lang>` is `node`, `python` or `go`, from the record's `stack`.

| Need | Read |
|---|---|
| Which service serves an operation, base URLs, keys | `/guides/getting-started/api-domains`, `/guides/getting-started/merchant-backend-bff`, `/api/authentication`; the operation's `servers:` in `/openapi/nozle-openapi.yaml` |
| Errors, codes, retries, rate limits | `/api/errors`, `/api/api-standards`, `/api/idempotency`, `/sdks/<lang>/errors` |
| SDK install, option defaults, runtime minimums | `/sdks/<lang>/installation`, `/sdks/react/installation` |
| 1 Pricing and plans | `/guides/billing/plans`, `/api/list-plans`, `/guides/billing/plan-versions`, `/guides/billing/multi-currency-pricing`, `/sdks/react/components/pricing-table` |
| 2 Checkout, providers, tax, pay links | `/guides/billing/checkout`, `/api/create-checkout`, `/sdks/<lang>/billing`, `/guides/billing/stripe-tax`, `/guides/billing/tax-ids`, `/integrations/index`, `/integrations/stripe`, `/integrations/razorpay` |
| 3 Subscriptions | `/guides/billing/subscriptions`, `/api/subscribe`, `/api/subscription-management`, `/api/plan-transition-policies`, `/api/cancel-subscription` |
| 4 Credits, holds, top-ups, entities | `/guides/credits/usage-tracking`, `/guides/credits/reliability`, `/guides/credits/top-ups`, `/guides/credits/entities`, `/guides/credits/rollout`, `/api/usage-track`, `/api/create-usage-hold`, `/api/finalize-usage-hold`, `/api/release-usage-hold`, `/sdks/<lang>/credits` |
| 5 Usage events, batches, buffers, late events, voiding | `/api/events`, `/api/events#late-events`, `/guides/billing/event-pipeline`, `/sdks/<lang>/tracking-events` |
| 6 Access checks, unit and spend limits | `/guides/entitlements/can-endpoint`, `/guides/entitlements/spend-limits`, `/api/check-entitlement`, `/api/list-customer-budgets`, `/sdks/<lang>/entitlements` |
| 7 Cost events, LLM capture and proxy, vendor prices | `/guides/ai/token-billing`, `/guides/margin/cost-models`, `/guides/margin/shared-prices`, `/api/cost-events`, `/api/llm-proxy`, `/sdks/node/llm-auto-capture`, `/sdks/python/llm-auto-capture`, `/sdks/go/llm-usage` |
| 8 Billing screens, invoices, payment method, overdue | `/sdks/react/billing-portal`, `/sdks/react/hooks`, `/guides/billing/invoices`, `/guides/billing/payments`, `/guides/billing/dunning`, `/guides/billing/checkout#pay-links`, `/api/billing-status`, `/api/manage-payment-method` |
| 9 Webhooks | `/api/receive-webhooks`, `/api/webhook-events`, `/api/webhooks` |
| 10 Moving existing billing | `/api/create-customer`, `/guides/billing/checkout`, `/integrations/index` |
| Customers: external ids, erase, delete | `/api/create-customer`, `/api/create-customer#erase-a-customer`, `/sdks/<lang>/customers-entities` |
| Customers blocked for unpaid invoices | `/guides/billing/dunning`, `/api/errors#customer-payment-overdue` |
| Modelling plans, grants, entities, seats | `/guides/entitlements/overview`, `/guides/credits/plan-grants`, `/guides/credits/configuration`, `/guides/credits/usage-behavior`, `/api/customer-entities`, `/api/entity-subscriptions`, `/api/entity-credit-transfers` |
| This kit | `/guides/agent-kit/overview`, `/guides/agent-kit/install`, `/guides/agent-kit/workflow` |

## Before writing each call

Note in the task's evidence: the operation and the service that serves it (never move one between Core and Engine); the request fields it sends and the response fields it reads (only fields the docs or types declare); every refusal it can return and the action for each (financial-rules.md, "Refusals and errors"); the SDK's default retries for it; the SDK method confirmed in the installed declarations.

Writing convention, checked by the kit's drift test: a code is `<status> <code>` (`409 period_invoiced`), an SDK method `nozle.<method>()` (`nozle.can()`), a page its path (`/api/events`).
