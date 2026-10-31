# 9. Keep billing and application data in sync

**Covers:** webhooks, deduplication, and reconciliation.
**Account needs:** `webhooks` (a Nozle endpoint pointing at the application; a missing one is a manual dashboard step).
**Shared prerequisites:** `webhook_endpoint`, `server_key`.

**Decide with the user**
- `synced-state`: which local fields mirror Nozle (plan, status, balance, entitlement).
- `source-of-truth`: which system wins on conflict.

**Implement**
- Nozle signs every webhook with the `standard` scheme (Standard Webhooks, the only scheme): headers `webhook-id`, `webhook-timestamp` and `webhook-signature`. Verify the raw request body before acting (JSON body parsing before this route breaks it) with the SDK: Node 0.25+ `nozle.webhooks.verify({ body, headers, secret })` or `createWebhookHandler(nozle, { secret, onEvent })` (answers 200, 400 for a forged request, 500 when `onEvent` throws); Python 0.23+ `nozle.webhooks.verify(body, headers, webhook_secret=...)` (awaited on `AsyncNozle`); Go v0.22+ `VerifyWebhook(ctx, body, header, nozle.WithWebhookSecrets(...))` or `WebhookHandler`. The secret is the endpoint's `whsec_` secret from the dashboard, kept in the environment as `NOZLE_WEBHOOK_SECRET`, never in code; pass both secrets while one is rotated (the previous one stays valid for 24 hours). A timestamp more than 5 minutes from now is rejected. Without an SDK, any Standard Webhooks library verifies it: HMAC-SHA256 over `id.timestamp.body` keyed by the base64 part of the secret, `v1,<base64>` values separated by spaces. Source: https://docs.nozle.dev/api/receive-webhooks
- Read payload fields by the names in the docs or the installed SDK's types (a subscription's period end is `current_billing_period_ending_at`), never by a guessed name.
- An event for an object the app does not know yet (a signup still committing) is not done: answer 5xx or queue it, so it is processed later. Decide state from the object re-read from the API, not from the event type alone: the end of an old subscription after a plan change does not end the customer's access while another subscription is active.
- Process deliveries for one customer one at a time (a row lock or a per-customer queue), and never move a stored state or timestamp backwards: a subscription's `external_id` stays the same across plan changes, so it does not tell an old event from a new one.
- Ignore events for customers the app does not hold: webhooks are organization-wide.
- Deduplicate on `webhook-id` (the same on every attempt of one delivery) and process each delivery once. Delivery order is not guaranteed: re-read the object from the API instead of trusting the payload order. Delivery is at least once, with up to 8 attempts over about a day, a 10-second timeout and only `2xx` counted as success (a `3xx` is a failure); an endpoint failing for days is disabled and the owner is emailed. Answer `webhook-delivery: abort-message` to stop the retries of a message that can never succeed. After an outage, recover missed deliveries with `POST /webhook_endpoints/{id}/recover` rather than a hand-written backfill, and keep a reconciliation job that re-reads state: a webhook alone can still be missed.
- Usage and wallet balance alerts (`alerts` in the SDKs) fire `alert.triggered`.
- Respond quickly; do heavy work asynchronously.

**Verify (local only):** a bad signature is rejected, a duplicate delivery changes nothing, and an older event after a newer one is ignored.

**Do not:** skip signature checks, trust delivery order, or fulfill from a browser redirect.
