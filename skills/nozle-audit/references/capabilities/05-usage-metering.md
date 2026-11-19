# 5. Track usage for billing

**Account:** `features` (a missing meter is a dashboard step).
**Read first:** `/api/events` (with `/api/events#late-events`), `/guides/billing/event-pipeline`, `/sdks/<lang>/tracking-events`.

Candidates come from the spending inventory (inspect-stack.md), plus volume the product does not charge today as suggestions. Propose one meter per distinct billable unit, not per code path.

**Decide:** `billable-operations`; `excluded-operations`; `payer-identity`; `success-rule` (what counts as success; failure, retry and cancel); `late-usage` whenever events go out from a queue, batch or settle job; `blocked-usage`.

**Build**
- One primitive per operation (financial-rules.md, "Principles"): never a usage event after a credit call, nor a manual event beside a capture helper for one call.
- One event per successful operation, with a transaction id and timestamp fixed across retries, and the subscription when several can exist. Handle each refusal the events page lists by code; a settle job never replays `409 period_invoiced` with the stored timestamp.
- Send one at a time where the call can wait; a batch for a set the code holds (read per-event results); the SDK's buffer for high volume from many requests (flushed or closed before a serverless handler returns and on shutdown, error callback wired). Never a call per item in a loop; never buffer a credit spend or an answer the code acts on.
- A mistaken event is voided while its period is not invoiced, never offset with a negative event; a voided transaction id is never sent again.
- Instrument the approved boundary, not a shared helper with excluded callers. Use meter codes from the account read.

**Verify:** one event per approved operation; a retry reuses id and timestamp; excluded, free and failed paths emit nothing; a fake answering `409 period_invoiced` leads to the chosen path once, not a loop; a buffer is flushed on exit and its callback gets a rejected event.
