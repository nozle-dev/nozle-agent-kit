---
type: fixed
---

/guides/billing/event-pipeline.mdx (excerpt)
## Correct wrongly sent usage

Void an event you sent by mistake. A void reverses what the event changed:

- **Event.** Billing no longer reads it.
- **Counters.** Usage totals drop by the event's amount. Maximum, latest and unique values are recomputed from the remaining events.
- **Credits.** Credits the event used go back to the sources they came from.
- **Cost and margin.** The event's cost and margin are reversed. Late events in a tiered period are re-rated.

<CodeGroup>

```ts Node.js
const { void: result } = await nozle.events.void('request_0183f', { reason: 'wrong quantity' })
```

```python Python
result = nozle.events.void("request_0183f", reason="wrong quantity")
```

```go Go
result, err := client.Events.Void(ctx, "request_0183f", "wrong quantity")
```

</CodeGroup>

The response has `status: voided` and an `effects` object. Credits, cost and margin finish in the background, so an effect can read `pending` at first. Repeat the call to read the current states.

- **Invoiced periods.** A void is refused with `409 period_invoiced` when an invoice already covers the event's billing period, whether the invoice is finalized, open or pending. Nothing changes. Issue an adjustment on the invoice instead.
- **Idempotency.** Voiding the same `transaction_id` again returns `status: already_voided` and changes nothing.
- **No re-send.** A voided `transaction_id` cannot be sent again. `POST /events` returns `409 transaction_voided`. Send the corrected event with a new `transaction_id`.

See [Events](/api/events#void-an-event) for the endpoint.


/api/events.mdx (excerpt)
## Void an event

`POST https://api.nozle.app/engine/api/v1/events/{transaction_id}/void` voids an event you sent by mistake. Send a secret key and a JSON body with a `reason` of 1 to 500 characters.

```json
{ "reason": "wrong quantity" }
```

| Case | Result |
|---|---|
| Voided | `200` with `void` holding `transaction_id`, `status: voided`, `reason`, `voided_at`, `actor` and `effects`. |
| Repeated call | `200` with `status: already_voided`. Nothing changes. |
| Unknown `transaction_id` | `404 event_not_found`. |
| An invoice covers the event's billing period | `409 period_invoiced`. Nothing changes. Issue an adjustment on the invoice instead. |
| Missing or too long `reason` | `422 reason_required`. |
| Your organization stores events in ClickHouse | `501 unsupported_event_store`. Voiding is not available for these organizations. |
| Sending the voided `transaction_id` again | `POST /events` returns `409 transaction_voided`. Use a new `transaction_id`. |

`effects` reports `event`, `usage`, `credits`, `cost` and `margin`. An effect reads `pending` until its background step finishes. See [Correct wrongly sent usage](/guides/billing/event-pipeline#correct-wrongly-sent-usage).
