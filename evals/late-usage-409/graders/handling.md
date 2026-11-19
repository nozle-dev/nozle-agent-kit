---
type: llm
---

PASS if the answer says all of these:
- `period_invoiced` is not a key-reuse caller bug: the unit is dated in a billing period that is already invoiced, and resending it with the same stored timestamp will be refused every time (so the job loops forever).
- The fix is to resend once with a current timestamp (keeping the same idempotency key, as the docs say nothing was stored) and store that new timestamp, OR bill it with a one-off invoice, OR let it go; and choosing among these is the user's or business's decision.
- Other 409 codes (a key reused with a different body) are handled separately from `period_invoiced`, by the code rather than only the status.

FAIL if it keeps treating every 409 the same way, recommends retrying with the stored timestamp, or invents a different meaning for `period_invoiced`.
