# Nozle integration choices

This is the full list; the labels and numbers are fixed. Show only the choices that fit the application, judged from code and account evidence, keep each choice's number, name what was left out and why, and show any of them on request. Users can choose several or describe a custom outcome. Code and account findings determine which questions, tasks, and prerequisites apply.

| # | User-facing choice | Integration scope |
|---|---|---|
| 1 | Show pricing and plans | Plan listings, comparisons, and selection. |
| 2 | Add checkout and payments | Checkout, confirmation, and fulfillment. |
| 3 | Manage subscriptions | Status, supported plan changes, cancellation, and lifecycle sync. |
| 4 | Add credits and top-ups | Balances, consumption, plan grants, purchased credits, and supported allocations. |
| 5 | Track usage for billing | Selected operation events, metering, and correct attribution. |
| 6 | Control feature access and limits | Entitlement checks and approved limit behavior. |
| 7 | Track costs and margins | Provider costs, Cost Sheets, and reporting. |
| 8 | Build a customer billing dashboard | Plans, invoices, subscriptions, usage, credits, and payments. |
| 9 | Keep billing and application data in sync | Webhooks, deduplication, and reconciliation. |
| 10 | Connect Nozle to my existing billing setup | Selective adoption with explicit ownership boundaries. |

Also offer: help me choose, audit an integration, continue previous work, explain a Nozle capability, and connect/change the Nozle organization.

Use account completeness and code evidence to assess availability. Do not imply that every option is already configured or supported in the same way for every app.

What each choice depends on (the base plus its own chain) is in `prerequisites.md`. A request for one choice still plans every dependency. Each choice has a guide in `capabilities/`: decisions to resolve, implementation steps from verified contracts, local verification, and what not to do. `get_capability_catalog` adds this organization's account status, shared prerequisites, code signals, and known limits.
