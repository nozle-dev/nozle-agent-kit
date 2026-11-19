# 10. Move my existing billing to Nozle

**Covers:** moving customers, subscribers and balances from the product's current billing to Nozle checkout and Nozle subscriptions, with explicit ownership boundaries during the move.
**Account needs:** `plans` and `payment_connection`, as the chosen scope requires.
**Shared prerequisites:** `customer_identity`, `server_key`.
**Read first:** `/api/create-customer`, `/guides/billing/checkout`, `/integrations/index` and the provider's page.

**Decide with the user**
- `ownership`: for each customer, payment, and subscription, which system owns it today and after the move.
- `overlap`: what happens while both systems exist (never charge twice).
- `migration-scope`: new customers only, selected plans, or everything, and when each existing subscriber moves (at their next renewal, or now).

**Implement**
- Nozle bills through the providers it documents, read from the docs at run time. A product on another provider moves to one of them through Nozle checkout, with the user's explicit yes and the provider connection added in the dashboard; see the provider question in capability 2. Never assume it.
- The plugin does not use external billing authority (billing-state imports with external authority, opening-balance imports). Nozle cannot renew, change or cancel such a subscription, so the app would keep a second billing engine.
- Existing customers: create or upsert each one with its stable id (never an email address) and the approved provider connection; read the customer page for how an existing provider customer on the same provider account is linked so stored payment methods carry over.
- Existing subscribers: each one moves to a Nozle subscription through checkout (or a saved payment method where the provider and the docs support it), at the point the user chose. Until then the old system keeps billing that subscriber, and Nozle bills none of their usage. Subscriptions are not migrated automatically.
- Existing app balances: drain them (see "Replacing an existing app balance" in financial-rules.md); purchased balances have no import.
- After the move, Nozle owns renewals, plan changes, cancellations, dunning and grants, and the app follows Nozle's state through webhooks and reads.
- Preserve the existing system's behavior for anything and anyone not yet moved, behind a switch the application controls.

**Verify (local only):** a customer not yet moved is untouched; a moved customer is billed once, by Nozle; a switch back leaves no double charge.

**Do not:** run both systems against the same charge, or move a subscriber without the user's approved migration plan.
