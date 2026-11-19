---
name: nozle-doctor
description: Use when an existing Nozle integration looks wrong or needs checking, such as missing, duplicated or refused usage events (late usage, idempotency conflicts, customers blocked for unpaid invoices), uncosted providers, broken entitlement gates, unverified webhooks, or drift from the approved scope.
---

# Check an existing Nozle integration

Report problems with evidence. Edit no application code, send no live or billable traffic, and test only with local mocks. Judge against the docs MCP (`search_nozle`, `query_docs_filesystem_nozle`) and the installed type definitions ([docs-lookup.md](references/docs-lookup.md)). Run each `nozle-check <args>` (or `node <skill folder>/scripts/nozle-check.mjs <args>`) as one plain command, never chained with `cd`, `&&`, `||` or pipes. Ask with the host's question tool ([asking.md](references/asking.md)).

## Steps

1. **Load context.** Run `nozle-check scan <absolute app path>`. Validate `nozle.integration.yaml` if present; its scope, exclusions, decisions and `stack` are the intended behavior ([record-format.md](references/record-format.md)). Otherwise say there is no approved baseline.
2. **Read the account** ([connect-and-read.md](references/connect-and-read.md)). Mark unreadable families `unavailable`; never infer them.
3. **Inspect the code** ([inspect-stack.md](references/inspect-stack.md)) at every Nozle call. Run `nozle-check env`; flag mismatches with [stack-support.md](references/stack-support.md) and the record's `stack`.
4. **Check refusals first.** Read each call's docs page for the refusals it lists, then confirm the code branches on the exact status and code, never message text:
   - `409 period_invoiced`: the unit is dated in an invoiced period; it follows the recorded late-usage choice (resend once with the same key and a current timestamp, and store that timestamp on the unit so any later retry sends the identical body; or a one-off invoice; or let it go), and no settle job replays the old timestamp.
   - A 409 from a changed payload is a caller bug: logged, marked for review, never resent under a new key.
   - `402 customer_payment_overdue` and `402 customer_blocked` are customer states: a pay path (unpaid invoices with pay links, or the billing page) or "contact support", never an operator alert, a configuration error or a retry.
   - Limit, spend-cap and credit denials: denied by exact reason, never retried.
5. **Run the other checks:** every row of [financial-rules.md](references/financial-rules.md), "Self-review checks"; every call, field and SDK method exists at the installed version; excluded callers emit nothing billable (run a mock test); cost meters have Cost Sheet rates; drift (`nozle-check resume --config <file>`); `git ls-files -- '.env*'` lists only templates and no tracked file holds a key.
6. **Report** each check `pass`, `fail` or `unverified` with evidence, failures first with location and the smallest fix, and what was not checked. Offer `nozle-integrate` or `nozle-resume` for fixes.
