# 4. Add credits and top-ups

**Covers:** balances, consumption, plan grants, purchased credits, and supported allocations.
**Account needs:** `credits` (credit systems, top-up packages, grant rules, pool policies, metric rates).
**Shared prerequisites:** `customer_identity`, `server_key`.
**Read first:** `/guides/credits/usage-tracking`, `/guides/credits/reliability`, `/guides/credits/top-ups`, `/guides/credits/entities`, `/guides/credits/rollout`, `/api/usage-track`, `/api/create-usage-hold`, `/api/finalize-usage-hold`, `/sdks/<lang>/credits`.

**Inventory first (existing in-house credits).** List every spending action and every management behavior before choosing a treatment: for each action the check point, the deduction point, the amount rule, the identifier, the payer, retry and refund behavior; for management, grants, purchases, taxes and splits, expiry, limits, refunds, logs and the screens that show them, who holds a balance (company pool, per user or per team), how an owner delegates or takes back credits among members and who is allowed to, which balance each spending path draws from, and whether the totals add up. Read rule and feature tables from their seeds and migrations, every guarded route, event consumers in other services and the frontend's credit calls. Also cover volume-driven consumption (emails, messages, requests, lookups, AI generations, invites): per unit or per batch, where the count is taken, and whether failed or retried units are counted. Volume that costs something but is not charged today is a suggestion with the unit, the code point and a treatment, not an assumption. Actions that cannot be traced are listed as unknown. Each action then gets a treatment: Nozle meter and credit consumption, feature access only, cost-only, or left in the product.

**Decide with the user**
- `credit-source-rules`: how plan-granted and purchased credits are shown and consumed (preserve the account's expiry and pool policy).
- `pool-policy`: the policy already configured for the plan and credit system; do not change it.
- `topup-model`: what the account offers for purchased credits, from the top-ups page. A model the account cannot express (for example an arbitrary-quantity slider when only fixed packages exist) is a product gap to state, not to emulate.
- `charge-order`: for any action that can fail after it starts (charge first, hold then settle, or check then charge on success); see "Build traps" in financial-rules.md.
- `late-usage` and `blocked-usage`, when the build settles stored units later (see "Refusals and errors").

**Implement**
- Spend credits with the credit call (the gate and the charge in one), reusing the same key, body and timestamp on every retry. The advisory check reserves nothing.
- For work whose cost is known only afterwards with several workers on one balance, hold, run only when the hold is allowed, finalize with the actual usage, release on failure; read the hold pages for the TTL, the finalize rules and the LLM-proxy variant.
- Act on a denial in every charge order. A refused finalize or track (late usage, a blocked customer) follows "Refusals and errors", and a hold refused at finalize is either finalized again or released, never left open.
- Purchased credits arrive only when their payment completes, by the route the top-ups page describes; checkout creation grants nothing.
- Entity allocation moves only what the entities page says can move; a shared fallback does not enforce an unreserved per-member cap.
- Keep credit amounts as exact decimal strings.

**Verify (local only):** a retry with the same key and payload consumes once; a changed payload with the same key is refused; a denied action stays denied on retry. With holds: a failed run releases its hold, a successful one finalizes once with the actual usage, and a denied hold stops the work.

**Do not:** use a check followed by a deduct as atomic, treat a hold as a charge or follow a finalize with another credit call for the same work, leave a hold unsettled on a failure path, promise a per-member cap, or sum credit amounts as floats.
