# 9. Keep billing and application data in sync

**Covers:** webhooks, deduplication, and reconciliation.
**Account needs:** `webhooks` (a Nozle endpoint pointing at the application; a missing one is a manual dashboard step).
**Shared prerequisites:** `webhook_endpoint`, `server_key`.
**Read first:** `/api/receive-webhooks`, `/api/webhook-events`, `/api/webhooks`, `/sdks/<lang>/billing`.

**Decide with the user**
- `synced-state`: which local fields mirror Nozle (plan, status, balance, entitlement, a customer's blocked state).
- `source-of-truth`: which system wins on conflict.

**Implement**
- Verify every delivery's signature on the raw request body before acting, with the SDK's verifier (or, without an SDK, the scheme the receive page describes). Body parsing before this route breaks verification. The signing secret comes from the environment, and rotation keeps two secrets valid for a while: pass both.
- Read payload fields by the names in `/api/webhook-events` or the installed SDK's types, never by a guessed name. Subscribe to the events this app's synced state needs, including dunning steps when the app shows a customer's blocked state, and plan archival when the app caches plan codes.
- An event for an object the app does not know yet (a signup still committing) is not done: answer an error status or queue it, so it is processed later. Decide state from the object re-read from the API, not from the event type alone: the end of an old subscription after a plan change does not end the customer's access while another subscription is active.
- Process deliveries for one customer one at a time (a row lock or a per-customer queue), and never move a stored state or timestamp backwards.
- Ignore events for customers the app does not hold: webhooks are organization-wide.
- Deduplicate on the delivery id and process each delivery once. Delivery order is not guaranteed and delivery is at least once; read the receive page for the retry schedule, how to stop retries of a message that can never succeed, and how to recover missed deliveries after an outage. Keep a reconciliation job that re-reads state: a webhook alone can still be missed.
- Nozle emails customers and admins for some events (limits, dunning) by default; an app email for the same event is a decision for the user.
- When the app deletes a user account or a user asks to be forgotten, ask the user (`account-deletion`) whether the Nozle customer is erased (personal data removed, billing records kept) or deleted, and build that call into the app's own deletion flow. Read `/api/create-customer#erase-a-customer` for what each does and when an erasure is refused (open subscriptions or invoices still owed), and handle each refusal by its code.
- Respond quickly; do heavy work asynchronously.

**Verify (local only):** a bad signature is rejected, a duplicate delivery changes nothing, and an older event after a newer one is ignored.

**Do not:** skip signature checks, trust delivery order, or fulfill from a browser redirect.
