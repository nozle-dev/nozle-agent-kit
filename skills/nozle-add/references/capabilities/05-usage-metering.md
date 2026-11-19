# 5. Track usage for billing

**Covers:** selected operation events, metering, and correct attribution.
**Account needs:** `features` (a usage meter must exist; a missing one is a manual dashboard step).
**Shared prerequisites:** `customer_identity`, `usage_attribution`, `server_key`.
**Read first:** `/api/events` (including `/api/events#late-events`), `/guides/billing/event-pipeline`, `/sdks/<lang>/tracking-events`.

**Inventory first.** When the product already spends credits or quotas, use the credit inventory from choice 4 as the list of candidate operations: every spending action, its check and deduction points, amount rule, payer and retry or refund behavior, so no billable action is missed. Include volume-driven operations the product does not charge for today as suggestions. Propose one meter per distinct billable unit (not per code path) and say which actions share one.

**Decide with the user**
- `billable-operations`: exactly which operations are billable.
- `excluded-operations`: which are explicitly not (free features, internal tools).
- `payer-identity`: which authenticated entity pays for each operation.
- `success-rule`: what counts as success; what happens on failure, retry, and cancellation.
- `late-usage`: what happens to a stored unit whose period was invoiced before it was sent (resend now, one-off invoice, or let it go), whenever events are sent from a queue, a batch or a settle job.
- `blocked-usage`: what happens to work that already ran for a customer who is blocked for unpaid invoices.

**Implement**
- Pick the primitive per operation (financial-rules.md, "Principles"): a credit-backed action uses the credit call alone; any other metered action sends one usage event after success. Never both for one action, and never a manual event next to an LLM capture helper for the same call.
- Send one usage event per successful billable operation with a transaction id and timestamp that stay the same across retries, and the subscription when the customer can have several. The events page lists what is required and every refusal; handle each by its code ("Refusals and errors"). A settle job never replays a `409 period_invoiced` unit with its stored timestamp.
- Choose how events are sent per operation, from the tracking page: one at a time where the call can wait, a batch for a set the code already holds (read the per-event results: a batch can store some events and refuse others), or the SDK's buffer for high volume from many requests (flushed or closed before a serverless handler returns and on shutdown, error callback wired). Credit spends and any answer the code acts on never go through a buffer.
- An event sent by mistake is voided, not compensated with a negative event, while its period is not invoiced; read `/guides/billing/event-pipeline`. A voided transaction id is never sent again.
- Place instrumentation at the approved operation boundary, not inside shared helpers used by excluded callers. Use event codes that exist as meters in the account read.

**Verify (local only):** a mock records exactly one event per approved operation; a retry reuses the transaction ID and timestamp; excluded and free callers emit nothing; a failed operation emits nothing; a fake answering `409 period_invoiced` leads to the chosen late-usage path once, not a loop. With a buffer: the handler or shutdown path flushes it, and its error callback receives a rejected event.

**Do not:** wrap a shared client without tracing every caller, derive the customer from client input, buffer a credit spend or an event the user needs delivered without a durable store, or send live traffic to test.
