# Mapping the product's plans onto Nozle

Use this when the product already has tiers, credit allowances, seats or add-ons. For each need, read the Nozle concept's page (docs-lookup.md, "Modelling plans") for what it can and cannot do today, then say whether the need maps, needs a workaround, or has no equivalent. Anything the docs do not state is `inferred`.

| Product need | Nozle concept |
|---|---|
| Tiers with different features and limits, a small free plan | Plans with per-plan entitlements; a server check at run time |
| Monthly and yearly, or several currencies | Plan families |
| A per-period allowance or a one-time welcome grant | Plan credit grant rules |
| Purchased credits | Top-up packages |
| Different credits per action, volume-based use | One consumable metric per distinct unit, a rate each, spent through the credit call |
| A company with members, per-person plans or credits, owner delegation | Entities, entity subscriptions, grant rules, pool policies, allocation |
| Seats | A fixed charge with units, updated by the backend; a seat limit is an entitlement the backend checks |
| Concurrent workers on one balance, cost known afterwards | Credit holds |
| A cap on what a customer can spend per period | Spend limits |
| Add-ons | One-off priced items |
| LLM usage | Capture helpers, the LLM proxy, or usage and cost events (capability 7) |

Each page says whether its objects are created through the API, the dashboard or both. Either way the user creates them; you list exact values and never create anything. Dependent code waits until a fresh account read shows them.

Give one row per product plan, from most to least access: product plan, Nozle plan, entitlements and limits, credit grant (kind, amount, cadence), seats, add-ons, and what has no equivalent.
