---
type: fixed
---

/guides/billing/dunning.mdx (excerpt)
## The blocked customer

While blocked, the Engine refuses the customer with HTTP `402` and the code `customer_payment_overdue`. The customer is matched by `external_customer_id` or by the external id of its subscription. The state is read on every request, so paying lifts the block on the next call.

| Route | What the customer gets |
|---|---|
| `GET /can` | `402` `{"allowed": false, "reason": "customer_payment_overdue", "code": "customer_payment_overdue", "error": "..."}`. Checked once the customer's subscription is found. |
| `POST /usage/check`, `POST /usage/track` | `402` `{"code": "customer_payment_overdue", "error": "..."}`. Nothing is tracked. |
| `POST /events` | `402` `{"status": 402, "error": "...", "code": "customer_payment_overdue"}`. The event is not stored. |
| `POST /events/batch` | See [Batches](#batches). |
| LLM proxy (`/proxy/openai/*`, `/proxy/anthropic/*`) | `402` in the error shape of the provider, with `code` `customer_payment_overdue` in `error.code` and at the top level, for the `X-Nozle-Customer-Id` customer, before the provider is called. See [LLM proxy errors](/api/llm-proxy#errors). |

Events refused while the customer is blocked are not queued. Your app decides what the customer sees: the Node SDK returns `can()` as a denial with `reason: "customer_payment_overdue"`, so you can show a "pay your invoice" screen instead of an error. See [Node.js errors](/sdks/node/errors#customer-payment-overdue).

### Let a blocked customer pay

Your backend lets the customer pay from that screen:

1. List the customer's unpaid invoices: finalized invoices whose `payment_status` is `failed` or `pending`. Use `GET /invoices` with `external_customer_id`, `status=finalized` and `payment_status`, or the SDKs: Node `invoices.list(customerId, { status: 'finalized', paymentStatus: 'failed' })`, Python `invoices.list(customer_id, status="finalized", payment_status="failed")`, Go `ListInvoices(ctx, customerID, nozle.ListInvoicesParams{Status: "finalized", PaymentStatus: "failed"})`. Ask again with `pending`.
2. Create a [pay link](/guides/billing/checkout#pay-links) for each invoice and send the customer to it: `POST /invoices/{id}/payment_url`, or Node `checkoutInvoice(invoiceId, { returnUrl })`, Python `checkout_invoice(invoice_id)`, Go `CheckoutInvoice(ctx, invoiceID, key)`. Only the Node SDK takes a return URL. A pay link is refused with `422` `payment_already_processing` while an automatic debit of the invoice is waiting for the bank.
3. _Unreleased._ Or send the customer to the hosted customer portal: [`GET /customers/{external_customer_id}/portal_url`](/api-reference/customers/get-a-customer-portal-url) returns its `portal_url`, and **Pay** there opens the same payment page for each invoice the customer owes. See [Pay from the customer portal](/guides/billing/invoices#pay-from-the-customer-portal).

The block lifts on the next request once no invoice past its grace is owed. See [What resolves it](#what-resolves-it).

Paying does not lift `402` `customer_blocked`. That code means Nozle staff blocked the customer, and only they lift it. See [Customer blocked](/api/errors#customer-blocked).


/api/errors.mdx (excerpt)
## Customer payment overdue

The Engine answers `402` `customer_payment_overdue` for one of your customers whose unpaid invoices are past the grace of their plan, when the dunning campaign they follow ends with `block`. Your other customers are not affected. See [Dunning policy](/guides/billing/dunning).

| Surface | Body |
|---|---|
| `GET /can` | `{"allowed": false, "reason": "customer_payment_overdue", "code": "customer_payment_overdue", "error": "<text>"}` |
| `POST /usage/check`, `POST /usage/track` | `{"code": "customer_payment_overdue", "error": "<text>"}` |
| LLM proxy, OpenAI routes | `{"error": {"message": "<text>", "type": "payment_required", "code": "customer_payment_overdue"}, "code": "customer_payment_overdue"}` |
| LLM proxy, Anthropic routes | `{"type": "error", "error": {"type": "billing_error", "message": "<text>", "code": "customer_payment_overdue"}, "code": "customer_payment_overdue"}` |
| `POST /events` | `{"status": 402, "error": "<text>", "code": "customer_payment_overdue"}` |
| `POST /events/batch`, every event refused | `{"status": 402, "error": "<text>", "code": "customer_payment_overdue", "error_details": {"<index>": {"external_customer_id": ["customer_payment_overdue"]}}}` |
| `POST /events/batch`, some events refused | `200` with the stored `events` and the refused ones in `error_details`, keyed by index. From Engine 2.28.0 invalid events are refused the same way, so a batch is no longer all or nothing. |

The text is `This customer's invoices are unpaid past their grace period. Usage resumes once they are paid.` Do not retry: the block lifts on the next request after the invoices are paid, voided or credited. Refused events are not queued. To let the customer pay, see [Let a blocked customer pay](/guides/billing/dunning#let-a-blocked-customer-pay).

### Customer blocked

_Engine 2.27.0._ The Engine answers `402` `customer_blocked` for a customer that Nozle staff blocked. It is refused on the same surfaces and in the same bodies as `customer_payment_overdue`, with `customer_blocked` in place of `customer_payment_overdue` and the text `This customer is blocked. Contact support.` The reason for the block is never returned.

- Paying the customer's invoices does not lift it. Only Nozle staff lift it, and the next request works again.
- When a customer is blocked both by dunning and by staff, the code is `customer_blocked`.
- In `POST /events/batch`, each refused event carries the code of its own customer. When every event is refused, the batch answers `customer_blocked` if any of them belongs to a customer blocked by staff.

Do not retry. Refused events are not queued.

