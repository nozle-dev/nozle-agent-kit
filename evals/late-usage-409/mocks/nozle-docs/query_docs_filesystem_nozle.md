---
type: fixed
---

/api/events.mdx (excerpt)
## Late events

Nozle bills an event in the billing period of its `timestamp`. An event that arrives late is accepted and billed while that period is still open, and while its invoice is still a draft in the invoice grace period. Once the period's invoice is finalized, its amount is fixed, so an event dated in that period would never be billed. Nozle refuses it with `409 period_invoiced` instead of storing it, so the usage chart and the invoice always agree. A progressive billing or in-advance charge invoice does not close the period: its later usage is still billed by the period's own invoice.

The refused event is not stored and its `transaction_id` stays free. Choose what to do with it:

- **Bill it in the current period.** Send it again with the same `transaction_id` and a current `timestamp`. It appears on the next invoice, at the current plan's price. If the subscription has ended, there is no next invoice: use a one-off invoice.
- **Bill it now as a separate charge.** Create a one-off invoice for the late usage.
- **Let it go.** Do nothing. The customer is not billed for it.

Retrying an event that was already stored before the invoice was finalized still returns `200` with the stored event.

From Engine 2.60.0, credit usage gets the same check. [`POST /usage/track`](/api/usage-track#late-usage) and [finalizing a credit or budget hold](/api/finalize-usage-hold#errors) refuse a `timestamp` in an invoiced period with `409 period_invoiced`, spend nothing and keep the hold open. Before, such usage spent credits and its event was never billed.

Nozle does not otherwise reject events for being old or in the future.

## Retrying

- Retry a network error, a timeout or a `5xx` with the same `transaction_id` and the same payload.
- Do not retry a `4xx`. Fix the event first, because the same request gets the same answer.
- For a batch, resend the whole batch with the same transaction IDs after a network error, a timeout or a `5xx`: each ID is billed once. After a `200`, resend nothing but the events listed in `error_details`, once you have fixed them.

See [idempotency](/api/idempotency) and [errors](/api/errors).


/api/usage-track.mdx (excerpt)
## Late usage

From Engine 2.60.0, `/usage/track` refuses usage whose `timestamp` falls in a billing period that the paying subscription already has a finalized invoice for, as [`POST /events`](/api/events#late-events) does. That usage would spend credits and never be billed. The answer is `409` with code `period_invoiced`:

```json
{
  "status": 409,
  "error": "The billing period of this event's timestamp is already invoiced, so it would never be billed. Resend it with a current timestamp, or bill it with a one-off invoice.",
  "code": "period_invoiced",
  "error_details": { "timestamp": ["period_invoiced"] }
}
```

- Nothing is spent and nothing is stored, so you can send the same `Idempotency-Key` again with a current `timestamp`.
- A replay of a track accepted before the invoice was finalized still returns its first answer.
- Usage without a subscription sends no billing event and is never refused. A progressive billing invoice does not close the period.


/api/errors.mdx (rows)
| `409` | Idempotency key or resource-state conflict, such as another checkout in progress. Reload the state, then retry. Events and usage also answer `409` for a `transaction_id` already taken (`transaction_id_conflict`, `transaction_voided`) and for a period already invoiced (`period_invoiced`); see [Common failures](#common-failures). |
| `409` `idempotency_key_reused` | The `Idempotency-Key` was used before with a different request. | Retry the identical request with the same key, including the same `timestamp`. Use a new key for a new operation. See [usage tracking](/api/usage-track). |
| `409` `period_invoiced` with `error_details` `{"timestamp": ["period_invoiced"]}` (`POST /events` and `POST /events/batch` from Engine 2.59.0, `POST /usage/track` and hold finalize from Engine 2.60.0) | The `timestamp` falls in a billing period whose invoice is already finalized, so the usage would never be billed. Nothing is stored or spent, the `transaction_id` stays free, and a hold stays open. Voiding an event of an invoiced period answers the same code. | Resend with the same `transaction_id` and a current `timestamp`, or bill the usage with a one-off invoice. Finalize a hold again with a current `timestamp`, or release it. See [late events](/api/events#late-events). |
| `409` `transaction_id_conflict` with `transaction_id: ["value_already_exist"]` | `POST /events` with a `transaction_id` that is already stored for a different event (another code, subscription, properties or `timestamp`), on the standard event store. Nothing is stored. | Reuse a `transaction_id` only to retry the identical event. Give a new event a new `transaction_id`. See [events](/api/events#responses-and-limits). |
