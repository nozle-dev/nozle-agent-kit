# What each capability depends on

No capability works alone. When the user names one thing ("add credits", "track usage"), the plan still has to cover everything it stands on, in the account and in the code. Build this list for the chosen goals from the account read and the code study, mark every row `present`, `missing` or `unknown`, and make each missing row its own step or dashboard item, ordered by dependency (`depends_on`, merged with `nozle-check plan`). The user approves the whole set, not only the item they named.

## The base every capability needs

| # | Dependency | Where | How to check |
|---|---|---|---|
| B1 | A backend path that can call Nozle with a secret key (Node, Python or Go SDK, or REST from any server) | code | `nozle-check env`; no server code means stop and ask |
| B2 | The secret key in the user's own `.env`, variable name in `.env.example` | user | dashboard step; never create or read a key |
| B3 | An authenticated identity on the server that maps to one Nozle customer (the payer: user, team or company) | code | trace login and ownership; never take a customer id from the browser |
| B4 | That customer exists in Nozle (created or upserted with the stable external id) | code + account | a create/upsert step at signup or first use |
| B5 | The organization is onboarded with at least one meter and one plan | account | the account read |

## Per capability

| # | Capability | Also depends on |
|---|---|---|
| 1 | Pricing and plans | Plans in the account; a mapping from the app's tiers to plan codes; plan charges and limits for display (the public catalog response carries them even though the React type declares only code, name, price and interval; pass only the fields you show, because the response also holds internal counts and ids) |
| 2 | Checkout and payments | 1; a payment provider connected in the dashboard; the return-URL allowlist on the backend; a webhook endpoint (9) so activation follows confirmed payment, not the redirect |
| 3 | Subscriptions | 1; who owns subscription creation (one code path); the organization's cancellation and change policies; 2 for paid plans |
| 4 | Credits and top-ups | A credit system with a rate for each billable feature (dashboard only); a plan credit grant rule or a top-up package; consumable meters (count or sum aggregation); exactly one active subscription for the customer (credit consumption fails with no subscription or with two); the spend paths wired to `usage.track` (5); stable keys; for purchased top-ups 2 and 9; for people under a company, entities and a pool policy |
| 5 | Usage tracking | A meter whose code matches what the code sends; exactly one active subscription (or an explicit subscription id); the spend points with a stable id per unit; a plan that includes the feature, so events have something to bill against |
| 6 | Feature access and limits | A plan entitlement per gated feature (limit and hard or soft); the meter behind a usage limit (5); one server check right before the work, plus `usage.track` where enforcement and consumption must be one step |
| 7 | Costs and margins | Usage attribution per customer and feature (5, or cost events with the customer id); cost meters and a published Cost Sheet with rates for each provider and model; the cost composition per feature; manual reporting where no auto-capture exists |
| 8 | Customer billing dashboard | Backend routes that return the customer's own plan, usage, credits and invoices; 1, 3 and 4 data as needed; React components or native screens |
| 9 | Billing and data sync | A webhook endpoint registered in the dashboard; signature verification; deduplication and out-of-order handling; a mapping from Nozle customers and subscriptions to application records |
| 10 | Existing billing setup | An ownership map (who owns customers, payments and subscriptions after the change); for an externally billed product, one billing-state import per subscription with a stable reference and, for credits, the opening balance after it; the application's own paid-status check before each usage call |

## Ask for one thing, get the whole chain

Example: "add credits".
1. Base: B1 to B5 (is there a server, a key variable, a payer, a customer record, an onboarded organization?).
2. 4's chain: credit system and rates (account), a grant rule or package (account), consumable meters (account), one active subscription (account and code: who creates it, free plan at signup), the spend paths on `usage.track` with stable keys (code), and 2 and 9 only if purchased credits are in scope.
3. Show each row as present or missing with its evidence, name the dashboard steps and code steps, and plan them in dependency order. If a dependency is only possible with a decision the user has not made (payer, charge order, rollout), ask it before the scope.

If a dependency cannot be met (no server, an unsupported provider, an item the account cannot model), say so plainly and name the options; do not build the dependent part.
