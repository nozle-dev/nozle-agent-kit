---
type: llm
---

PASS if the answer uses the documented void call for an event by its transaction id (`nozle.events.void(transactionId, { reason })` in Node, or the equivalent REST void endpoint), and covers what can go wrong as the docs say: it is refused with `409 period_invoiced` once an invoice covers the event's period (then an invoice adjustment is needed), and a voided transaction id cannot be sent again (send a corrected event with a new id). It should also tell the user to confirm the method name and types in the installed SDK (node_modules type definitions) or say it took them from the docs.

FAIL if it invents a different method, sends a negative or compensating event instead of voiding, or omits the invoiced-period refusal.
