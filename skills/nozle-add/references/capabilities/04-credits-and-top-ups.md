# 4. Add credits and top-ups

**Account:** `credits` (credit systems, top-up packages, grant rules, pool policies, metric rates).
**Read first:** `/guides/credits/usage-tracking`, `/guides/credits/reliability`, `/guides/credits/top-ups`, `/guides/credits/entities`, `/guides/credits/rollout`, `/api/usage-track`, `/api/create-usage-hold`, `/api/finalize-usage-hold`, `/sdks/<lang>/credits`.

Start from the spending inventory (inspect-stack.md). Each action gets a treatment: credit consumption, feature access only, cost-only, or left in the product.

**Decide:** `credit-source-rules` (how plan and purchased credits are shown and consumed, keeping the account's expiry and pool policy); `pool-policy` (the configured one; never change it); `topup-model` (what the account offers; anything else is a stated gap); `charge-order`; `late-usage` and `blocked-usage` when units settle later.

**Build**
- Spend through the credit call (gate and charge in one) with the same key, body and timestamp on every retry. The advisory check reserves nothing.
- Holds: run only when allowed, finalize once with the actual usage, release on failure; read the hold pages for the TTL, finalize rules and the LLM-proxy variant. A hold refused at finalize is finalized again or released, never left open.
- Purchased credits arrive when payment completes, by the route the top-ups page describes; creating a checkout grants nothing.
- Entity allocation moves only what the entities page allows; a shared fallback does not enforce a per-member cap.
- Keep amounts as exact decimal strings.

**Verify:** the same key and payload consume once; a changed payload with that key is refused; a denial stays denied on retry; a failed run releases its hold and a successful one finalizes once; a denied hold stops the work.
