# 9. Keep billing and application data in sync

**Covers:** webhooks, deduplication, and reconciliation.
**Account needs:** `webhooks` (a Nozle endpoint pointing at the application; a missing one is a manual dashboard step).
**Shared prerequisites:** `webhook_endpoint`, `server_key`.

**Decide with the user**
- `synced-state`: which local fields mirror Nozle (plan, status, balance, entitlement).
- `source-of-truth`: which system wins on conflict.

**Implement**
- Verify the signature on the raw request body before acting (JSON body parsing before this route breaks it). Use the SDK: Node 0.13+ `nozle.webhooks.verify({ body, headers, hmacKey? })` or `createWebhookHandler(nozle, { hmacKey?, onEvent })` (answers 200, 400 for a forged request, 500 when `onEvent` throws); Python 0.13+ `nozle.webhooks.verify(body, headers, hmac_key=...)` (awaited on `AsyncNozle`); Go v0.12+ `VerifyWebhook` or `WebhookHandler`. Without an SDK: `X-Nozle-Signature-Algorithm` names the scheme; `hmac` is a Base64 HMAC-SHA256 of the raw body with the organization's signing secret, `jwt` is RS256 with the public key from `GET /webhooks/json_public_key`. The signature carries no timestamp. Source: https://docs.nozle.dev/api/receive-webhooks
- Prefer `hmac` signing for a Node receiver: a `jwt` signature carries the whole payload in a header, and a large delivery exceeds Node's default 16 KB header limit and gets HTTP 431 (raise `--max-http-header-size` if `jwt` must stay).
- Read payload fields by the names in the docs or the installed SDK's types (a subscription's period end is `current_billing_period_ending_at`), never by a guessed name.
- An event for an object the app does not know yet (a signup still committing) is not done: answer 5xx or queue it, so it is processed later. Decide state from the object re-read from the API, not from the event type alone: the end of an old subscription after a plan change does not end the customer's access while another subscription is active.
- Deduplicate on `X-Nozle-Unique-Key` (the event `id`) and process each delivery once. Delivery order is not guaranteed: re-read the object from the API instead of trusting the payload order. Nozle makes only 3 attempts (about 25 seconds), so add a reconciliation job that re-reads state; a webhook alone can be missed.
- Usage and wallet balance alerts (`alerts` in the SDKs) fire `alert.triggered`.
- Respond quickly; do heavy work asynchronously.

**Verify (local only):** a bad signature is rejected, a duplicate delivery changes nothing, and an older event after a newer one is ignored.

**Do not:** skip signature checks, trust delivery order, or fulfill from a browser redirect.
