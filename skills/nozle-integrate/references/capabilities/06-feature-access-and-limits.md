# 6. Control feature access and limits

**Covers:** entitlement checks and approved limit behavior.
**Account needs:** `entitlements` and/or `features`; plans that grant the entitlements.
**Shared prerequisites:** `customer_identity`, `server_key`.

**Decide with the user**
- `gate-points`: which actions are gated, and where the check runs (server side).
- `limit-behavior`: block, warn, or degrade when a limit is reached.
- `unreserved-limits`: whether a limit needs atomic enforcement (then use usage tracking, not a check followed by a deduct).

**Implement**
- Check eligibility on the server with `can()` right before the work. It reports eligibility and does not reserve credits; answer a denial with 403, or 429 when `overage` is set.
- For a credit-backed action the gate is `usage.track`'s `allowed`, not `can()` or `usage.check`; run the work only when it is true.
- Where enforcement and consumption must be one step, use `nozle.usage.track(input, { idempotencyKey })` (atomic, retry-safe with a stable key). Source: https://docs.nozle.dev/sdks/node/credits.md
- Gate only what the account configures; use feature and privilege codes from the entitlement read. When the plan belongs to a plan family, an entitlement change applies to the whole family.
- `can()` also returns `economics` (estimated incremental cost, revenue and margin, and the minimum margin of a margin policy). For a sum Feature, pass the summed field in `metadata` under the Feature's `field_name`, or `economics` is `unavailable` and the margin policy's `on_unavailable` decides, which may deny.

**Verify (local only):** a denied check blocks the action; the limit behavior matches the decision; a retry does not double-consume.

**Account facts (docs, verified):** `POST /plans/{code}/entitlements` replaces every existing entitlement of the plan and `PATCH` adds or updates, so never call POST twice; deleting a privilege removes it from every plan and subscription; a feature's type and code are immutable; `can()` takes a customer and a feature (no entity), reports `used`, `limit` and `remaining` (both `null` when the feature has no cap: test with `== null`), and may be cached, so enforce it right before the work; per-subscription overrides exist (`PATCH /subscriptions/{id}/entitlements`).

**Do not:** gate only in the browser, treat `can()` as a reservation, or invent privilege codes.
