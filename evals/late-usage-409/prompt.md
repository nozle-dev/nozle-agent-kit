---
description: A settle job meets 409 period_invoiced; the kit must not treat it as a caller bug or replay it forever.
tags: [refusals, p0]
runs: 2
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

Our Node backend bills usage to Nozle. Every unit is stored first and a nightly job settles it like this (TypeScript, @nozle-js/node):

```ts
for (const unit of await db.pendingUnits()) {
  try {
    await nozle.usage.track(
      { customerId: unit.customerId, featureCode: unit.feature, properties: unit.properties, timestamp: unit.timestamp },
      { idempotencyKey: unit.key },
    )
    await db.markSettled(unit.id)
  } catch (err) {
    if (err.status === 409) { log.error('caller bug: key reused', err); continue } // leave it pending, try again tomorrow
    throw err
  }
}
```

Since our October invoices were finalized, about 300 October units fail every night with a 409 whose code is `period_invoiced`, and they stay pending forever. Is our handling right? Tell me exactly how the job should treat this 409 and what I need to decide. Don't edit anything, just answer.
