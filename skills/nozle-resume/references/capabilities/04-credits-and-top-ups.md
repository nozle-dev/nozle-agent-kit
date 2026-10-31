# 4. Add credits and top-ups

**Covers:** balances, consumption, plan grants, purchased credits, and supported allocations.
**Account needs:** `credits` (credit systems, top-up packages, grant rules, pool policies, metric rates).
**Shared prerequisites:** `customer_identity`, `server_key`.

**Inventory first (existing in-house credits).** List every spending action and every management behavior before choosing a treatment: for each action the check point, the deduction point, the amount rule, the identifier, the payer, retry and refund behavior; for management, grants, purchases, taxes and splits, expiry, limits, refunds, logs and the screens that show them, who holds a balance (company pool, per user or per team), how an owner delegates or takes back credits among members and who is allowed to, which balance each spending path draws from, and whether the totals add up. Read rule and feature tables from their seeds and migrations, every guarded route, event consumers in other services and the frontend's credit calls. Also cover volume-driven consumption (emails, messages, requests, lookups, AI generations, invites): per unit or per batch, where the count is taken, and whether failed or retried units are counted. Volume that costs something but is not charged today is a suggestion with the unit, the code point and a treatment, not an assumption. Actions that cannot be traced are listed as unknown. Each action then gets a treatment: Nozle meter and credit consumption, feature access only, cost-only, or left in the product.

**Decide with the user**
- `credit-source-rules`: how plan-granted and purchased credits are shown and consumed (preserve the account's expiry, rollover, and pool policy).
- `pool-policy`: `entity_only`, `entity_then_customer`, or `customer_only`, as already configured; do not change it.
- `topup-model`: fixed catalog packages only. If the product needs arbitrary quantities (a slider), that is a product gap to state, not to emulate.

**Implement**
- Consume with `nozle.usage.track(input, { idempotencyKey })`: atomic, and the same key and payload must be reused on a retry. `nozle.usage.check(...)` is advisory only. Source: https://docs.nozle.dev/sdks/node/credits.md and https://docs.nozle.dev/guides/credits/usage-tracking.md
- Ask the charge-order question for any action that can fail after it starts (charge first, hold then settle, or check then charge on success); see "Build traps". Act on `allowed: false` in every order.
- **Credit holds** (Engine 2.33.0+; Node 0.29+, Python 0.27+, Go v0.26+): for work whose cost is known only afterwards while several workers spend one balance (concurrent agent runs, LLM calls, long jobs), `usage.holds.create` the most the work can use with an idempotency key from the run, run the work only when `allowed`, `finalize` with the actual usage, and `release` on failure. Keep a fixed timestamp per unit on create and finalize. Through the LLM proxy, send `X-Nozle-Credit-Hold` instead. Source: https://docs.nozle.dev/guides/credits/usage-tracking.md ("When to hold credits") and https://docs.nozle.dev/api/create-usage-hold.md
- Build the idempotency key from a business id, not a per-attempt random id. When the app already holds balances, plan off, shadow and enforce plus a drain of the existing balance; see "Build traps" in financial-rules.md.
- Paid top-ups are fixed packages; checkout creation does not grant credits, which arrive when the top-up invoice is fully paid (by any payment route; a partial payment grants nothing). Source: https://docs.nozle.dev/guides/credits/top-ups.md
- Entity allocation moves eligible purchased credits; subscription grants are not transferable. A shared fallback does not enforce an unreserved per-member cap. Source: https://docs.nozle.dev/guides/credits/entities.md
- Keep credit amounts as exact decimal strings.

**Verify (local only):** a retry with the same key and payload consumes once; a changed payload with the same key is refused; a denied action stays denied on retry. With holds: a failed run releases its hold, a successful one finalizes once with the actual usage, and a denied hold stops the work.

**Do not:** use a check followed by a deduct as atomic, treat a hold as a charge or follow a finalize with `usage.track` for the same work, leave a hold unsettled on a failure path, promise a per-member cap, or sum credit amounts as floats.
