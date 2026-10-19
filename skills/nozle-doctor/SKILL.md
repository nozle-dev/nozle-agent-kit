---
name: nozle-doctor
description: Use when an existing Nozle integration looks wrong or needs checking, such as missing or duplicated usage events, uncosted providers, broken entitlement gates, unverified webhooks, or drift from what was approved.
---

# Check an existing Nozle integration

Report evidence and problems. Do not edit application code and do not send live or billable traffic; test only with local mocks and fixtures. Details: [connect-and-read.md](references/connect-and-read.md), [inspect-stack.md](references/inspect-stack.md), [financial-rules.md](references/financial-rules.md), [runtime-contracts.md](references/runtime-contracts.md), [record-format.md](references/record-format.md). Run each `nozle-check` command as one plain command: `nozle-check <args>` where the plugin's bin is on PATH, otherwise `node <skill folder>/scripts/nozle-check.mjs <args>` with the skill's absolute base directory. Never chain it with `cd`, `&&`, `||` or a subshell; hosts that run without an approver refuse chained commands.

Whenever you need the user to choose or approve something, use the host's question tool as described in [asking.md](references/asking.md) (a typed numbered list only when there is no such tool).

## Steps

1. (Start with `nozle-check scan <absolute application path>`: it lists where Nozle is already used, with file and line.) **Load context.** If `nozle.integration.yaml` exists, validate it with `nozle-check <absolute path>/nozle.integration.yaml` and use its approved scope, exclusions, and billing rules as the intended behavior. Otherwise state that no approved baseline exists.
2. **Read the account** (connect-and-read.md). Mark unavailable families `unavailable`; never infer them.
3. **Inspect the code** (inspect-stack.md) for each place Nozle is used. Run `nozle-check env <absolute application path>` and flag a mismatch with stack-support.md, such as a secret key reachable from browser code or an SDK used on a runtime it does not support.
4. **Run the checks.** For each, give a verdict (`pass`, `fail`, `unverified`) with evidence:
   - Configuration-to-code mapping: every feature, meter, or plan code in code exists in the account, and the reverse for what the record says was integrated.
   - Usage: one event per successful billable operation; a transaction ID and idempotency key built from a business or request id (not a per-attempt random id) and a fixed timestamp across retries; a 409 checked by status, not message text; no duplicate emission from a wrapper plus a manual call; a stream billed on provider finish even when the client aborts, with usage recorded before the final chunk.
   - Subscriptions: no paid subscription without checkout or confirmed payment; exactly one code path creates subscriptions; no external billing imports (billing-state or opening-balance); renewals, plan changes and cancellations go through Nozle, and the app follows them from webhooks and reads.
   - Stack: the SDK and runtime in use match `stack` in the record and `nozle-check env`.
   - Exclusions: free and excluded callers of a shared client emit no billable usage (confirm by running a mock or fixture test).
   - Cost coverage: provider calls with a cost meter code have a rate in the account's Cost Sheet; unknown rates are reported as uncosted.
   - Entitlements and credits: gates use the supported check; a check followed by a debit is not treated as atomic; purchased credits and plan grants are not conflated.
   - Webhooks: signature verified, duplicates and out-of-order deliveries handled, fulfillment from authoritative confirmation.
   - Live-test traps (financial-rules.md, "Found in live tests against a real account"): the customer is found by a stored id, not a lossy derived value; no legacy balance or plan gate is left on a path that moved to Nozle; plans and fields that can be null (free plans without periods) are handled; a period's start and end come from one clock reading; a retry after a denial uses a new attempt; webhooks are marked handled only after fulfilment; the status reader is tested on the real SDK error; changed files pass lint and the type check; each billed outcome charges what it charged before, or the change is recorded as a user decision; shadow mode has a customer to compare against; dedupe records are scoped to the customer and action and unique in the database; every spending route is metered or excluded; the first call waits for the customer to be seeded; renewal never creates a second active subscription (it reads what Nozle renewed first); cost events carry the provider call's id, scoped to the customer; a limit display reads the balance for credit-backed features; a track-time denial has the outcome the user chose.
   - Drift: scoped files and configuration revisions compared with the record (`nozle-check resume --config <file>`).
   - Repository hygiene: `git ls-files -- '.env*'` lists no real env file (only `.env.example`-style templates), and no tracked file holds a Nozle key (`sk_` or `pk_` followed by key material).
5. **Report** failures first, each with location, evidence, and the smallest correction. Say what was not checked. Offer `nozle-integrate` or `nozle-resume` for fixes.
