# 9. Keep billing and application data in sync

**Covers:** webhooks, deduplication, and reconciliation.
**Account needs:** `webhooks` (a Nozle endpoint pointing at the application; a missing one is a manual dashboard step).
**Shared prerequisites:** `webhook_endpoint`, `server_key`.

**Decide with the user**
- `synced-state`: which local fields mirror Nozle (plan, status, balance, entitlement).
- `source-of-truth`: which system wins on conflict.

**Implement**
- Verify the webhook signature with the algorithm shown in the `webhooks` family before acting. Look up the verification helper in the current docs and installed SDK; mark it unverified if you cannot confirm it.
- Store the delivery ID and process each delivery once. Tolerate out-of-order deliveries by comparing the resource's version or timestamp.
- Respond quickly; do heavy work asynchronously.

**Verify (local only):** a bad signature is rejected, a duplicate delivery changes nothing, and an older event after a newer one is ignored.

**Do not:** skip signature checks, trust delivery order, or fulfill from a browser redirect.
