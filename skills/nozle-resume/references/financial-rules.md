# Money rules

These hold whatever the API looks like this week. The facts they need (which call, field, code or default) come from the docs and the installed SDK: [docs-lookup.md](docs-lookup.md).

## Contents

- Principles
- Credentials stay with the user
- Refusals and errors
- Charge order
- Self-review checks

## Principles

- The Nozle customer and organization come from authenticated backend identity. Secret keys live on the server only. The external customer id is the app's stable id, never an email address or another personal value (it outlives an erasure; `/api/create-customer`).
- One billable event per successful operation, sent after the result exists and before the response is final.
- One primitive per purpose, never two for one consumption. A metered action without credits sends a usage event after it succeeds. A credit-backed action spends through the credit call, which is the gate and the charge, so no usage event follows it. Work whose cost is known only afterwards, with several spenders on one balance, holds first, then finalizes with the actual usage or releases. An access check reserves nothing. Cost events never bill; capture helpers always bill, so cost-only tracking never uses one.
- Every unit has one identity: its key or transaction id comes from a business or request id, and its timestamp is fixed when the unit is first stored. Both stay identical on every retry, from any process.
- Plan grants and purchased credits are distinct sources. Keep amounts as exact decimal strings; Nozle money amounts are minor units, converted for display only.
- Fulfil only after a verified webhook or a server-side status read, never a browser redirect.
- Nozle owns the period: it renews, issues the next grant and applies plan changes and cancellations. The app follows Nozle's state from webhooks and reads, and never creates a subscription per period or grants a period's credits itself.
- Billing runs only through Nozle checkout and subscriptions with a documented provider; never external billing imports (billing-state or opening-balance). Otherwise that job stays out of scope (decision-questions.md, "Payment provider").
- What the account cannot model is stated as a gap, never emulated in a way that charges differently.

## Credentials stay with the user

- Never create, request, read, paste or store a Nozle API key, and never write a key value to a file. Add each variable the code needs to `.env.example` with an empty value and a one-line comment; the code fails with a clear message when one is unset. Leave `.env` untouched.
- When the user says the keys are in place, run `nozle-check key <app directory>`. It prints each variable name, its source and a verdict, never a value. A rejected key goes back to the user's steps.
- The hand-off ends with the user's own dashboard steps, in order: create the key (Settings > API Keys), copy it into their `.env`, then each missing setup item this app needs.
- First-event check, the last user step: the user runs `node <skill folder>/scripts/nozle-first-event.mjs --customer <id> --event <meter code> --subscription <id>` from their own shell. That dry run sends nothing and prints the request and the send command with a fixed `--timestamp <seconds> --yes`; running the printed command sends one real, billable usage event to the Engine, and rerunning it sends the identical event. The agent never runs the script, with or without `--yes`; the guard denies any command that names it.

## Refusals and errors

Every refusal has a status and a machine-readable `code`; the endpoint's page and `/api/errors` list each code and its action. Read that list before writing a call, then branch on the exact status and code (in an SDK, the error class and code fields its types declare), never on message text. An unlisted refusal is a failure for review, not a guess.

- **Transient** (network error, timeout, 5xx, 503 with `Retry-After`, rate limit): retry with the same key, body and timestamp. The SDKs retry these by default (`/sdks/<lang>/installation` gives the count); size timeouts for every attempt and never stack an app retry loop on the SDK's. After a timeout the charge may have landed, so the unit stays `pending` with its key.
- **Product refusal** (spend limit, unit limit, too few credits, `allowed: false` with a reason): deny the action, show the reason and the customer's next step, never retry and never fail open.
- **Customer blocked** (`402 customer_payment_overdue`, `402 customer_blocked`): a normal customer state, not a configuration error, so it never pages an operator. Overdue shows a way to pay: the unpaid invoices with a pay link each, or the customer billing page (`/guides/billing/dunning`, `/guides/billing/checkout#pay-links`). A staff block shows "contact support". A blocked customer's usage is refused, not queued; what happens to work that already ran is the user's `blocked-usage` decision (keep it pending until the block lifts, or let it go).
- **Late usage** (`409 period_invoiced`): the unit is dated in a period whose invoice is final. Nothing was stored, and replaying the stored timestamp is refused forever, so a settle job that replays it never bills the unit. Follow the user's `late-usage` decision, from `/api/events#late-events`, `/api/usage-track` and `/api/finalize-usage-hold`: resend once with the same key and a current timestamp, and store that timestamp on the unit in place of the old one so every later retry sends the identical body; or record it for a one-off invoice; or let it go. After the subscription ended only the last two remain. A hold refused this way stays open: finalize it again with a current timestamp, or release it.
- **Changed payload** (`409 idempotency_key_reused`, `409 transaction_id_conflict`): the code that keeps the payload stable has a bug. It never proves a charge. Log it with the request id, mark the unit failed for review, fix the cause, and never resend under a new key.
- **Other conflicts** (checkout in progress, hold resolved, voided id resent, tax check pending, archived plan): do what the docs say for that code.
- **Configuration or caller error** (authentication, unknown code, no or several active subscriptions, validation): surface it; never swallow it or fail open.

Fail open only on a transient failure, and only when the user chose fail-open; the label comes from whether the work goes ahead without a confirmed charge. One unit's permanent failure never blocks other units: a settle loop catches, records and continues per unit. Log the request id with every failure.

## Charge order

For work that can fail after it starts, the user chooses (`charge-order`), and the scope records it:

- **(a) Charge first** through the credit call; run the work only when allowed. A failed job stays charged unless the app voids the event while its period is not invoiced (`/guides/billing/event-pipeline`) or compensates in its own records.
- **(b) Hold, then settle:** hold the most the work can use, run only when the hold is allowed, finalize with the actual usage on success, release on failure or cancel. Recommend it when the cost is known only afterwards and several workers spend one balance, or when a money cap must be exact under concurrency.
- **(c) Check, then charge on success**, keyed by the job id. Concurrent requests can overspend; a denied charge records a debt and denies the next request.

A denial is never only a log line. Under (b) a finalize above the hold can be denied too; the same debt rule applies.

## Self-review checks

Before the hand-off, check your own diff against every row and write one `self_review` entry per id (record-format.md). Rows marked **test** pass only when a test drives the case; rows marked **producer** pass only when the evidence names where the existing app produces that data. Most live-test failures sat in existing code the integration consumed.

| Id | Pass when |
|---|---|
| `usage-key` | Key and transaction id come from a business or request id, never per attempt (`randomUUID()`, `Date.now()`), unique across environments, timestamp stored beside it. |
| `conflict-409` | Every 409 code the calls can return has its own branch: `409 period_invoiced` follows `late-usage` and is never replayed with its stored timestamp; a changed-payload conflict is logged as a caller bug. |
| `retries` | Only transient failures are retried, with the same key, body and timestamp, and never on top of the SDK's own retries. |
| `error-types` | Refusals are read by exact status and code; `402 customer_payment_overdue` shows a pay path; no refusal is matched by message text or retried. |
| `charge-order` | The chosen order is built; every hold is finalized or released on every path, keyed from the unit (never a reserved prefix), never followed by a credit call for the same work; caps match the user's choice. |
| `stream-abort` | A stream is billed when the provider reports final usage, before the last chunk, whether or not the client is still connected; the provider call does not share the client's abort signal. |
| `client-ids` | A client-sent id used as a key is also deduped on the server (unique row, stored result returned) so a reused id gets no free work. |
| `subscription-id` | The code stores the id of the subscription it found, never a rebuilt one. **producer** |
| `paid-without-payment` | A paid subscription exists only after checkout or confirmed payment; one code path creates subscriptions (look up first); a free plan is assigned once. |
| `shadow-writes` | Off and shadow create no customers or subscriptions and change no account, unless the user chose a sending shadow. |
| `stuck-unit` | An uncertain charge stays `pending` with key, body and timestamp; a user retry resumes it. |
| `legacy-balance` | Every existing app balance has the drain the user chose (legacy first, or honored beside Nozle) and a sub-unit remainder is never stranded; purchased credits have no import. |
| `migration` | Each schema change ships its migration and the code works before it runs. |
| `secret-key` | No key in client code, files or records; variables only in `.env.example`. |
| `scope-changes` | Every recorded decision maps to a file and line; every difference from the approved scope is listed for the user. |
| `ledger-once` | A debit of the app's own ledger inserts a unique claim (customer and period) or re-checks under a row lock, with the amount computed inside that transaction. |
| `pending-owner` | A job outside user traffic settles pending units with stored key and timestamp and records each outcome; queues are named per service; a buffer carries only usage events, its error callback wired, flushed on exit. |
| `charge-in-transaction` | No Nozle call inside a database transaction that can roll back; charge after commit. |
| `key-provenance` | A key comes from one stored record whose existence is the billable event, never a content hash that can recur. |
| `check-quantity` | The check before the work covers the whole quantity and runs before any paid call; an app ledger never goes below zero. |
| `off-mode` | Every service reads one off, shadow and enforce setting; off sends nothing and needs no new table or column; going back from enforce strands no Nozle credits. |
| `renewal` | The app never renews, grants or changes plans itself for a customer whose allowance is in Nozle. |
| `identity-lookup` | The customer is found by a stored id, not a lossy derived value. **producer** |
| `legacy-gates` | Every existing balance, quota or plan gate on a moved path reads Nozle or is removed. **test**: enforce for a customer whose only credits are in Nozle. |
| `nullable-fields` | Every plan (free plans without period dates included) and every nullable field the integration reads is handled; every app plan is mapped or reported. **producer** |
| `one-clock` | A period's start and end come from one clock reading (`end = addPeriod(start)`). **producer** |
| `denial-retry` | A retry after a recorded denial uses a new attempt number on the business id; a recorded debt has a collector. |
| `claim-after-fulfil` | A webhook or order is marked handled in the same transaction as its fulfilment. |
| `status-reader` | The error-to-status reader is tested with the installed SDK's real errors (401, 402, 404, each 409 code, 422, network). |
| `codes-exist` | Every code sent exists and is usable (not archived) in the account read, or a setup step creates it first; every new queue, cron or worker is a setup step. |
| `lint-clean` | The project's lint and type check pass on changed files; `fail` with the reason when they could not run. |
| `charge-parity` | Every outcome of every billed path charges what it did before, or the difference is a user decision. |
| `shadow-seed` | Shadow creates the customer and subscription before comparing; a path that cannot enforce logs its reason once and shows it in a status read. |
| `dedupe-scope` | An app dedupe record is keyed by customer, action and key with a unique index. **test**: two companies, and three parallel requests with one key move the ledger and Nozle once. |
| `route-coverage` | Every route and job that changes a balance or calls a paid provider (still-mounted legacy routes too) is metered or excluded by the user. |
| `seed-before-read` | The first call for a new customer waits for the customer and subscription to exist; a lookup miss is never cached. |
| `next-period` | Renewal reads what Nozle renewed (detected from the new period's grant), never creates a second active subscription, and counts the allowance once. **test**: a period end in the past. **producer** |
| `cost-event-id` | A cost event carries the provider call's id scoped to the customer, the real vendor, model and token types, and a parent only when that usage event was sent. |
| `denial-after-work` | A denial after the work ran follows the charge-order decision, never silence. **test** |
| `limit-source` | A "used up" display reads the balance for credit-backed features and the access check for capped or boolean ones. |
| `peer-contract` | A call to another service matches that service's real route (prefix, method, headers, body), tested against its router. |
| `fake-refusals` | Tests fake Nozle at the HTTP boundary, assert method, full URL and body, and return each documented refusal for each call. **test** |
| `step-isolation` | A sync or settle job saves each step as it succeeds and moves on past one failing call. **test**: one remote call failing mid-job. |

A call site that moves money is not `completed` without a test that drives it, run once against a real database or the ORM's real query layer.
