---
type: llm
---

PASS if the answer says all of these:
- `customer_payment_overdue` is a normal state of that customer (blocked by the dunning policy for unpaid invoices), not a configuration error, so it must not page on-call and must not be retried.
- The route should deny the action with a customer-facing message and a way to pay: the customer's unpaid invoices with a pay link (for example a payment URL per invoice or `checkoutInvoice`) or the billing page/portal; the block lifts once the invoices are paid.
- A different reason (such as a staff block, `customer_blocked`, or a limit) is handled by its own exact code rather than the same generic branch.

FAIL if it keeps the alert or the 500 error for this reason, suggests retrying, or matches on the message text.
