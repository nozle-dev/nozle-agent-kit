# Look up every Nozle fact before you use it

This kit carries the workflow, the approval gates and the money rules. It does not carry Nozle's API facts, because they change every week: endpoints and which service serves them, request and response fields, SDK method names and signatures, minimum versions, defaults (timeouts, retries), limits, error codes and what to do about each. Read those from two sources at the moment you need them:

1. **The Nozle docs**, through the docs MCP the plugin bundles (`nozle-docs`).
2. **The SDK installed in the merchant's project**, through its type definitions.

When neither is reachable, mark the contract `unverified`, say so, and defer every edit that depends on it. Never fill a gap from memory, from an earlier project, or from an example in this kit.

## Use the docs MCP

Two tools (in Claude Code: `mcp__plugin_nozle-agent-kit_nozle-docs__search_nozle` and `mcp__plugin_nozle-agent-kit_nozle-docs__query_docs_filesystem_nozle`):

- `search_nozle`: a question in words ("what happens to an event dated in an invoiced period"). Returns pages with links.
- `query_docs_filesystem_nozle`: exact reads over the docs as files. A page at `/api/usage-track` is the file `/api/usage-track.mdx`. Examples:
  - `head -200 /api/usage-track.mdx` reads a page.
  - `rg -n "period_invoiced" /api /guides /sdks` finds every page that names a code.
  - `rg -n -A40 "^  /events:" /openapi/nozle-openapi.yaml` reads one operation of the API reference, with its `servers:` (which service and base URL serve it), body and responses.
  - `rg -il "<term>" /` when you do not know the page. A wrong path only means the guess was wrong.

Without the MCP (a host that did not load it), read the same page as `https://docs.nozle.dev/<path>.md`, or start from `https://docs.nozle.dev/llms.txt`. Cite the page path you relied on in the scope and in each task's evidence, so a reviewer can re-read it.

## Confirm SDK names in the installed types

Find the installed version first (the lockfile, or the manifest when nothing is installed). Then read the SDK's own declarations, never a remembered signature:

| SDK | Where its types are |
|---|---|
| Node (`@nozle-js/node`) | `node_modules/@nozle-js/node/package.json` for the version; search `node_modules/@nozle-js/node/dist` (`*.d.ts`) for the method, its options type and its error type |
| React (`@nozle-js/react`) | `node_modules/@nozle-js/react/dist` (`*.d.ts`) |
| Python (`nozle-sdk`) | the project's environment, for example `.venv/lib/python*/site-packages/nozle/` (`*.py`, `*.pyi`); the version is in the `nozle_sdk-*.dist-info` folder beside it |
| Go (`github.com/nozle-dev/nozle-go`) | `go.mod` for the version; the module source under `$(go env GOMODCACHE)/github.com/nozle-dev/nozle-go@<version>/` |

When the SDK is not installed yet (it is part of the approved scope), take the method from the SDK page in the docs for the version you will install, install it, then confirm the name and its types in the declarations before writing the call. A method the installed version lacks means: upgrade within the approved scope, or call the REST endpoint the docs give for it.

## Where each fact lives

`<lang>` is `node`, `python` or `go`. Read the page for the stack recorded in `stack`.

| Need | Read |
|---|---|
| Which service (Core or Engine) serves an operation, base URLs, keys | `/guides/getting-started/api-domains`, `/guides/getting-started/merchant-backend-bff`, `/api/authentication`; one operation's `servers:` in `/openapi/nozle-openapi.yaml` |
| Error shape, every code and what to do, retries, rate limits | `/api/errors`, `/api/api-standards`, `/api/idempotency`, `/sdks/<lang>/errors` |
| SDK install, options and their defaults (retries, timeouts), runtime minimums | `/sdks/<lang>/installation`, `/sdks/react/installation` |
| 1 Pricing and plans, plan families, archived plans | `/guides/billing/plans`, `/api/list-plans`, `/guides/billing/plan-versions`, `/guides/billing/multi-currency-pricing`, `/sdks/react/components/pricing-table` |
| 2 Checkout, providers, tax at checkout, return URLs, pay links | `/guides/billing/checkout`, `/api/create-checkout`, `/sdks/<lang>/billing`, `/guides/billing/stripe-tax`, `/guides/billing/tax-ids`, `/integrations/index`, `/integrations/stripe`, `/integrations/razorpay` |
| 3 Subscriptions, plan changes, cancellation | `/guides/billing/subscriptions`, `/api/subscribe`, `/api/subscription-management`, `/api/plan-transition-policies`, `/api/cancel-subscription` |
| 4 Credits, holds, top-ups, entities | `/guides/credits/usage-tracking`, `/guides/credits/reliability`, `/guides/credits/top-ups`, `/guides/credits/entities`, `/guides/credits/rollout`, `/api/usage-track`, `/api/create-usage-hold`, `/api/finalize-usage-hold`, `/api/release-usage-hold`, `/sdks/<lang>/credits` |
| 5 Usage events, batches, buffers, deduplication, late events, voiding an event | `/api/events`, `/api/events#late-events`, `/guides/billing/event-pipeline`, `/sdks/<lang>/tracking-events` |
| 6 Access checks, unit limits, spend limits | `/guides/entitlements/can-endpoint`, `/guides/entitlements/spend-limits`, `/api/check-entitlement`, `/api/list-customer-budgets`, `/sdks/<lang>/entitlements` |
| 7 Cost events, LLM capture and proxy, token types, vendor prices | `/guides/ai/token-billing`, `/guides/margin/cost-models`, `/guides/margin/shared-prices`, `/api/cost-events`, `/api/llm-proxy`, `/sdks/node/llm-auto-capture`, `/sdks/python/llm-auto-capture`, `/sdks/go/llm-usage` |
| 8 Customer billing screens: invoices, receipts, refunds, payment method, paying an overdue invoice | `/sdks/react/billing-portal`, `/sdks/react/hooks`, `/guides/billing/invoices`, `/guides/billing/payments`, `/guides/billing/dunning`, `/guides/billing/checkout#pay-links`, `/api/billing-status`, `/api/manage-payment-method` |
| 9 Webhooks: verification, retries, event types | `/api/receive-webhooks`, `/api/webhook-events`, `/api/webhooks` |
| 10 Moving existing customers and subscribers | `/api/create-customer`, `/guides/billing/checkout`, `/integrations/index` |
| Customers: external ids, erase, delete | `/api/create-customer`, `/api/create-customer#erase-a-customer`, `/sdks/<lang>/customers-entities` |
| Customers blocked for unpaid invoices (dunning) | `/guides/billing/dunning`, `/api/errors#customer-payment-overdue` |
| This kit, as the docs describe it | `/guides/agent-kit/overview`, `/guides/agent-kit/install`, `/guides/agent-kit/workflow` |

## What to read before writing each Nozle call

For every call the code will make, read and note in the task's evidence:

- the operation and the service that serves it (never move an operation between Core and Engine);
- the request fields it sends and the response fields it reads (read a field only when the docs or the installed types declare it);
- every refusal the page and `/api/errors` list for it (status and code) and the documented action for each; [financial-rules.md](financial-rules.md) says how to handle each kind;
- whether the SDK retries it and how many times by default, from `/sdks/<lang>/installation` and `/sdks/<lang>/errors`;
- the SDK method and its types, confirmed in the installed declarations.

Writing convention in this kit, which the kit's drift test checks: a Nozle code is written as `<status> <code>` (for example `409 period_invoiced`), a Nozle SDK method as `nozle.<method>()` (for example `nozle.can()`), and a docs page by its path (for example `/api/events`).
