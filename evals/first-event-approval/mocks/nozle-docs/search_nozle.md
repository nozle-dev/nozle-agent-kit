---
type: fixed
---

/guides/agent-kit/workflow.mdx (excerpt)
7. Send one real event yourself with `nozle-first-event.mjs` in the skill folder. Do a dry run first, then run it with `--yes`. The agent never sends this event.

/api/events.mdx (excerpt)
## Event envelope

```json
{
  "event": {
    "transaction_id": "request_0183f",
    "external_customer_id": "customer_123",
    "external_subscription_id": "subscription_123",
    "code": "api_calls",
    "properties": {
      "model": "example-model",
      "tokens": 1500
    },
    "timestamp": 1785839400
  }
}
```

| Field | Required | Description |
|---|---|---|
| `transaction_id` | yes | Organization-wide identifier for the logical event, created once by your code, for example your own request id. Preserve the identifier and complete payload on retries. The SDKs create one when you omit it and reuse it on every retry. |
| `external_subscription_id` | one of the two | Subscription the event is billed to. When it is given, `external_customer_id` is ignored. |
| `external_customer_id` | one of the two | Used only when `external_subscription_id` is blank: the event is billed to the customer's single active subscription. |
| `code` | yes | Feature code. |
| `properties` | no | Aggregation and attribution metadata. |
| `timestamp` | no | Unix seconds for direct HTTP requests. The SDKs normalize their supported timestamp inputs to this wire format. |

A Feature that aggregates a property (`sum`, `max`, `latest`, `weighted_sum` or a custom aggregation) needs that property in `properties` as a number or a numeric string. An event whose value is missing, empty or not a number is still accepted, but Nozle skips it for usage limits, revenue and cost instead of counting it as 1 unit. `count` and `unique_count` Features do not read a value and count every event.

An event needs `external_subscription_id` or `external_customer_id`. With only the customer, Nozle looks up that customer's active subscription and stores the event with its `external_subscription_id`, as the SDKs do. The customer must have exactly one active subscription; with several, send `external_subscription_id`.

For direct HTTP ingestion, send this envelope to `POST https://api.nozle.app/engine/api/v1/events` with a secret key. Send batches of 1–5000 events to `POST https://api.nozle.app/engine/api/v1/events/batch` using an `events` array, as plain JSON or gzipped with `Content-Encoding: gzip`. The valid events of a batch are stored even when others are refused (Engine 2.28.0; before, the limit was 100 and one invalid event refused the whole batch). Event reads and fee estimates use the Core API. Prefer the SDKs so subscription lookup, `transaction_id` creation, timeout handling, and errors remain consistent.

<Note>
For retry safety, preserve the complete event payload, including `timestamp`, and reuse the same `transaction_id`. Never reuse a `transaction_id` for a different event: on the standard event store the first accepted event owns that identifier, the same event returns the stored one, and a different one (another code, subscription, properties or sent `timestamp`) gets `409 transaction_id_conflict`. On the high-volume event store the repeat is accepted with `200`, which does not tell you how it is counted; a repeat is deduplicated only when `transaction_id` and `timestamp` both match. Without a `timestamp`, each attempt is stamped when it arrives, so send one and reuse it. See [deduplication](/guides/billing/event-pipeline#2-ingest-and-deduplicate).
</Note>

