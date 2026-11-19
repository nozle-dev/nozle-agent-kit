# Modelling the product's plans in Nozle

Use this when the product already has tiers, credit allowances, seats or add-ons. For each product need, find the Nozle concept below, then read its page for what it can and cannot do today (limits, cadences, what is dashboard-only, what is refused). Say for each need whether it maps, needs a workaround, or has no equivalent, and propose exact entries with the reason for each. Anything the docs do not state is `inferred`; say so.

| Product need | Nozle concept | Read |
|---|---|---|
| Tiered plans: a top plan with every feature and high limits, middle plans with lower limits, a free plan with one or two features | Plans, features, per-plan entitlements; a server check at run time | `/guides/billing/plans`, `/guides/entitlements/overview`, `/guides/entitlements/can-endpoint` |
| The same offer billed monthly and yearly, or in several currencies | Plan families | `/guides/billing/multi-currency-pricing`, `/guides/billing/plans` |
| A plan's credit allowance each period, or a one-time welcome grant | Plan credit grant rules | `/guides/credits/plan-grants`, `/guides/credits/configuration` |
| Purchased credits | Top-up packages | `/guides/credits/top-ups` |
| Different credits per action, volume-based use (per email, message, request) | One consumable metric per distinct unit, with a rate per metric, spent through the credit call | `/guides/credits/configuration`, `/guides/credits/usage-behavior` |
| A company (customer) with many people (employees, members), a person with their own plan, credits per person, an owner who delegates and takes back credits | Entities under the customer, entity subscriptions, entity grant rules and pool policies, credit allocation | `/guides/credits/entities`, `/api/customer-entities`, `/api/entity-subscriptions`, `/api/entity-credit-transfers` |
| Seats | A fixed charge with units, updated by the backend when members change; a seat limit is an entitlement the backend checks | `/guides/billing/plans` |
| Concurrent agents or jobs spending one balance, cost known only afterwards | Credit holds | `/guides/credits/usage-tracking`, `/api/create-usage-hold` |
| A cap on what a customer can spend per period (runaway AI usage, bill shock) | Spend limits | `/guides/entitlements/spend-limits` |
| Add-ons | One-off priced items | `/guides/billing/plans` |
| A provider Nozle does not document | Move to a documented provider through Nozle checkout (capabilities 2 and 10), with an explicit yes | `/integrations/index` |
| LLM usage | Capture helpers, the LLM proxy, or usage and cost events from reported tokens (capability 7) | `/guides/ai/token-billing` |

**API or dashboard.** Read on each page whether its objects are created through the API, the dashboard, or both, and offer what the page says. Either way the user creates the entries; the agent lists them with exact values and never creates them.

**Common product shapes.** Use these as starting points, then fit them to the product's own code and price book:
- Seats plus a shared AI credit pool: a seat fixed charge, one credit system with a rate per action, a monthly grant per member with a pool policy that falls back to the company, top-up packages, a hard limit on the free plan, premium features entitled on the top plan.
- Usage with included allowance: a plan fee plus graduated charges whose first tier is free; a hard usage limit on free tiers.
- Prepaid credits only: a credit system, a one-time grant on the free plan, top-up packages, a hard stop at zero balance.
- Committed spend: a yearly grant drawn down by rates, then graduated overage.
- Outbound or messaging products (email, WhatsApp, LinkedIn, AI generation): one credit system with a rate per channel and AI action, seats as a fixed charge, members as entities, channel add-ons, top-ups.

**Procedure.** For each product plan, give one row: product plan, Nozle plan, entitlements and limits, credit grant (kind, amount, cadence), seats, add-ons, what has no equivalent (from the pages read). Show tiers from most to least access so the user can check the ladder. Do not create anything: the user creates the entries, and dependent code waits until the account read shows them.
