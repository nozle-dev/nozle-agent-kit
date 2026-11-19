# 9. Keep billing and application data in sync

**Account:** `webhooks` (a missing endpoint is a dashboard step).
**Read first:** `/api/receive-webhooks`, `/api/webhook-events`, `/api/webhooks`, `/sdks/<lang>/billing`.

**Decide:** `synced-state` (which local fields mirror Nozle: plan, status, balance, entitlement, blocked state); `source-of-truth`; `account-deletion` (when the app deletes a user, is the Nozle customer erased or deleted; read `/api/create-customer#erase-a-customer` for each and its refusals).

**Build**
- Verify the signature on the raw body with the SDK's verifier (or the documented scheme) before acting; body parsing before this route breaks it. The secret comes from the environment; pass both secrets during rotation.
- Read payload fields by the names in `/api/webhook-events` or the installed types. Subscribe to what the synced state needs, dunning steps and plan archival included.
- An event for an object the app does not know yet is answered with an error or queued. Decide state from the object re-read from the API, not the event type: an old subscription ending after a plan change does not end access while another is active.
- One delivery per customer at a time; never move stored state or a timestamp backwards; ignore customers the app does not hold.
- Dedupe on the delivery id. Delivery is at least once and unordered; read the retry schedule and missed-delivery recovery, and keep a reconciliation job.
- Nozle emails customers for some events by default; an app email for the same event is the user's decision.

**Verify:** a bad signature is rejected; a duplicate changes nothing; an older event after a newer one is ignored.
