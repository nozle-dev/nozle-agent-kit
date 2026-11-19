# 10. Move my existing billing to Nozle

**Account:** `plans`, `payment_connection`.
**Read first:** `/api/create-customer`, `/guides/billing/checkout`, `/integrations/index` and the provider's page.

**Decide:** `ownership` (who owns each customer, payment and subscription now and after); `overlap` (never charge twice while both systems run); `migration-scope` (new customers only, selected plans, or all, and when each subscriber moves: next renewal or now).

**Build**
- Billing moves only to a documented provider through Nozle checkout, with the user's explicit yes and the connection added in the dashboard (decision-questions.md, "Payment provider"). No external billing imports.
- Upsert each existing customer with its stable id (never an email) and the approved connection; read how an existing provider customer on the same provider account is linked so stored payment methods carry over.
- Each subscriber moves through checkout (or a saved payment method where the docs allow) at the chosen point. Until then the old system bills them and Nozle bills none of their usage; subscriptions do not migrate automatically.
- Drain existing app balances (financial-rules.md, `legacy-balance`).
- Keep the old behavior for anyone not yet moved, behind a switch the app controls.

**Verify:** a customer not yet moved is untouched; a moved customer is billed once, by Nozle; switching back leaves no double charge.
