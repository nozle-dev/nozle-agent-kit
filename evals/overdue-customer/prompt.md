---
description: A customer blocked for unpaid invoices must get a pay path, not a configuration error or a retry.
tags: [refusals, p0]
runs: 2
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

In our Next.js app (Node backend, @nozle-js/node) the /api/generate route does this before running the model:

```ts
const decision = await nozle.can(session.customerId, 'ai_generations')
if (!decision.allowed) {
  alertOnCall('Nozle billing misconfigured', decision)
  return Response.json({ error: 'Billing configuration error. Please contact your administrator.' }, { status: 500 })
}
```

This week some customers get `allowed: false` with `reason: "customer_payment_overdue"`, on-call is paged every time, and the customers see the configuration error. What should this route do instead? Answer only, no edits.
