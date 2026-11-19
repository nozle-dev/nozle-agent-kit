# The ten choices and what each stands on

Labels and numbers are fixed. Show only the choices the evidence supports, with their original numbers, and say in one line which were left out and why. Each has a guide in `capabilities/` (`01-pricing-and-plans.md` to `10-existing-billing-setup.md`); `get_capability_catalog` gives this account's status.

| # | Choice | Also depends on (besides the base) |
|---|---|---|
| 1 | Show pricing and plans | Plans in the account; a map from the app's tiers to plan codes |
| 2 | Add checkout and payments | 1; a provider connected in the dashboard; the return-URL allowlist; a webhook endpoint (9) |
| 3 | Manage subscriptions | 1; one code path that creates subscriptions; the organization's change and cancellation policies; 2 for paid plans |
| 4 | Add credits and top-ups | A credit system with a rate per billable feature; a grant rule or top-up package; consumable meters; exactly one active subscription; spend paths on the credit call (5); 2 and 9 for purchased credits; entities and a pool policy for people under a company |
| 5 | Track usage for billing | A meter per code sent; exactly one active subscription (or an explicit id); a stable id per unit; a plan that includes the feature |
| 6 | Control feature access and limits | A plan entitlement per gated feature; the meter behind a usage limit (5); a server check right before the work |
| 7 | Track costs and margins | Attribution per customer and feature (5, or cost events with the customer id); a published Cost Sheet with rates per provider and model |
| 8 | Build a customer billing dashboard | Backend routes for the session customer's own plan, usage, credits and invoices; 1, 3, 4 data as shown |
| 9 | Keep billing and application data in sync | A webhook endpoint in the dashboard; signature verification; dedupe and ordering; a map from Nozle objects to app records |
| 10 | Move my existing billing to Nozle | An ownership map during and after the move; a documented provider connection; a move plan per subscriber; a drain for existing app balances |

**The base, for every choice:** B1 a server that can call Nozle with a secret key (`nozle-check env`; none means ask); B2 the key in the user's own `.env`, its name in `.env.example`; B3 a server-side identity that maps to one payer; B4 that customer created or upserted in Nozle with the stable id; B5 an onboarded organization with at least one meter and plan.

**One choice plans its whole chain.** Mark each base and chain row `present`, `missing` or `unknown` with evidence; each missing row becomes a step or dashboard item ordered by `depends_on`, approved as one set. A dependency that cannot be met is stated with the options, and the dependent part is not built.

## Menu table in the first response

One table, one row per shown choice, with exactly the columns `#`, `Choice`, `Account`, `Advice`, `Changes` (for example `5`, `Track usage for billing`, `Ready`, `Recommended: 22 spend actions found`, `Backend`):

- **Account:** `Ready`, or the dashboard item to create first.
- **Advice:** `Recommended` or `Optional` with the reason from the code in a few words.
- **Changes:** `Backend`, `Frontend`, or `Backend and frontend`.

Explain the columns in one line the first time. Also offer help choosing, audit, resume, a docs question, and changing the organization.
