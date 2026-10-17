# 5. Track usage for billing

**Covers:** selected operation events, metering, and correct attribution.
**Account needs:** `features` (a usage meter must exist; a missing one is a manual dashboard step).
**Shared prerequisites:** `customer_identity`, `usage_attribution`, `server_key`.

**Inventory first.** When the product already spends credits or quotas, use the credit inventory from choice 4 as the list of candidate operations: every spending action, its check and deduction points, amount rule, payer and retry or refund behavior, so no billable action is missed. Include volume-driven operations the product does not charge for today as suggestions. Propose one meter per distinct billable unit (not per code path) and say which actions share one.

**Decide with the user**
- `billable-operations`: exactly which operations are billable.
- `excluded-operations`: which are explicitly not (free features, internal tools).
- `payer-identity`: which authenticated entity pays for each operation.
- `success-rule`: what counts as success; what happens on failure, retry, and cancellation.

**Implement**
- Pick the primitive per operation (see "Usage events, cost events and entitlement checks" in runtime-contracts.md): a credit-backed action uses `usage.track` alone, which deducts and creates the billing event; any other metered action uses `track()` after success. Never both for one action, and never a manual `track` next to an LLM wrapper for the same call.
- Send one Feature Event per successful billable operation with `nozle.track(customerId, eventCode, metadata, { subscriptionId, transactionId, timestamp })`. Select the subscription explicitly when several are active: an event that matches no active subscription, or several, is refused with 422 `active_subscription_not_found` or `active_subscription_ambiguous`, so handle those as configuration errors, not retries. Keep the transaction ID and timestamp stable across retries. Source: https://docs.nozle.dev/sdks/node/tracking-events.md
- Key each event on a business or request id, check a 409 by status, and bill a stream on provider finish even if the client disconnected; see "Build traps" in financial-rules.md.
- Place instrumentation at the approved operation boundary, not inside shared helpers used by excluded callers.
- Use `eventCode` values that exist as meters in the account read.

**Replay contract (verified live):** `usage.track` with the same idempotency key and an identical payload returns the original committed result (a denial is returned the same way); a changed payload returns 409. When no timestamp is passed the SDK stamps the current time; Node and Python 0.13+ and Go v0.12+ reuse that time for the same key only on the same client in the same process, so a retry from a queue, another process or after a restart changes the payload and gets 409. Always pass a timestamp that is fixed per unit (the business event time, or one stored when the unit was first attempted) and reuse it on every retry; treat a 409 as a bug in the caller, not as proof of a charge.

**Verify (local only):** a mock records exactly one event per approved operation; a retry reuses the transaction ID and timestamp; excluded and free callers emit nothing; a failed operation emits nothing.

**Do not:** wrap a shared client without tracing every caller, derive the customer from client input, or send live traffic to test.
