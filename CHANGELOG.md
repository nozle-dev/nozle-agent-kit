# Changelog

Each release raises the version in every manifest (`bun scripts/release.ts <version>`). Claude Code and Codex cache an installed plugin by version, so a change shipped without a new version doesn't reach anyone who already installed it.

## [1.2.0] - unreleased

### Added
- **Event buffer** (`@nozle-js/node` 0.28, `nozle-sdk` 0.26, `nozle-go` v0.25). The runtime contract and capability 5 say when to send Feature Events with `track()` (one at a time, result read), `trackBatch` / `track_batch` / `TrackBatch` (a set the code holds) or an event buffer (`createEventBuffer` / `event_buffer` / `NewEventBuffer`, high volume from many requests). A buffer is in memory only: the agent passes business transaction ids, wires the error callback (`buffer_full`, `rejected`, `failed`, `closed`), awaits `flush()` or `close()` before a serverless handler returns and closes it on shutdown, and never routes credit spends or an answer the code acts on through it.
- **Credit holds** (Engine 2.30.0, `@nozle-js/node` 0.29, `nozle-sdk` 0.27, `nozle-go` v0.26). For credit-backed work whose cost is known only afterwards with several workers on one balance (concurrent agents, LLM calls, long jobs), the agent holds the most the work can use, runs it only when the hold is allowed, finalizes with the actual usage and releases on failure, with an idempotency key from the run and a fixed timestamp. The LLM proxy takes `X-Nozle-Credit-Hold`. The charge-order decision gains "hold, then settle" (recommended in that case) next to charge first and check then charge; `usage.check` stays advisory.
- **Money budgets** (NLD-16; Engine 2.31.0, Core 11.23.0, `@nozle-js/node` 0.30, `nozle-sdk` 0.28, `nozle-go` v0.27). Spend limits cap the gross metered usage charges of a subscription per period in money (plan default or subscription override, total or per Feature, `hard` or `soft`), set through Core `/api/v1/spend_limits` or the dashboard (422 `spend_limit_unrateable_charges` for charges the Engine cannot rate). The references separate money caps (`budget_exceeded`, 402 from the proxy) from unit limits (`usage_limit_exceeded`, 429) and credits (`insufficient_credits`): each is a refusal, compared exactly with `RefusalReason` or caught as `BudgetExceededError` / `UsageLimitExceededError`, and never retried. Usage events are never refused, so the cap is enforced where the code gates; a plain `can()` can be overrun by calls in flight, and a budget hold (`usage.holds.create` on a Feature billed in money, whose finalize sends the usage event itself) makes the cap exact. `budgets.list` / `ListBudgets` read the standing, and the `budget.threshold_reached`, `budget.exceeded` and `usage_limit.threshold_reached` webhooks are listed for sync. Plan design says when to recommend a spend limit.
- **Build checks:** a note when an event buffer is never flushed or closed, or a credit hold is never released; advice for an idempotency key starting with the reserved `hold:` prefix. Hold create and finalize count as usage calls for the 409 and database-transaction checks, and `track()` on a buffer made in the same file no longer asks for a 409 branch. A retry of a `budget_exceeded` or `usage_limit_exceeded` refusal, and a refusal read by searching its reason or message text, get advice. `nozle-check scan` finds buffers, holds, budget reads and refusals.

## [1.1.0] - unreleased

### Changed
- **Batch event tracking** (Engine 2.28.0, `@nozle-js/node` 0.26, `nozle-sdk` 0.24, `nozle-go` v0.23). For many events the agent uses `trackBatch` / `track_batch` / `TrackBatch`: up to 5000 events per gzipped request, one result per event, and rejected events reported by index instead of the whole batch failing. It reads `error_details` on a 200 and resends a failed batch with the same transaction ids. Older SDKs keep the 1-100 all-or-nothing rule.

## [1.0.6] - 2026-10-31

### Changed
- **Webhooks use the `standard` signature, the only scheme** (Core 11.18.0+, sent through Svix since Core 11.20.0). The webhook rules (`api-map`, `financial-rules`, capability 9) verify with the SDK helper and the endpoint's `whsec_` secret (`@nozle-js/node` 0.25+, `nozle-sdk` 0.23+, `nozle-go` v0.22+), reject a timestamp more than 5 minutes off, accept two secrets during a 24-hour rotation, and deduplicate on `webhook-id`. Delivery is planned as at least once with up to 8 attempts over about a day, a 10-second timeout, `webhook-delivery: abort-message` to stop retries, and recovery through `POST /webhook_endpoints/{id}/recover`. The `hmac` and `jwt` schemes, `X-Nozle-Signature*`, `X-Nozle-Unique-Key` and the "only 3 delivery attempts" rule are gone.

## [1.0.5] - 2026-10-27

### Changed
- **Stripe checkout is hosted only** (Core 11.4.0, Engine 2.12.0). The agent redirects the buyer to the `url` of a `hosted` checkout result, never loads Stripe.js or a Stripe publishable key on the merchant page, and may pass `cancel_url`. The `stripe` result type and `client_secret` are gone. `@nozle-js/react` no longer needs the `@stripe/*` peers, so the stack rules and the environment check stop listing them.

## [1.0.4] - 2026-10-18

### Changed
- **Billing only through what Nozle offers.** Payments, subscriptions, renewals, plan changes and credit grants go through Nozle checkout and Nozle subscriptions, with a provider Nozle documents. The agent no longer plans external billing imports that leave another provider billing next to Nozle: it offers to move that job to a supported provider, or to leave it out of the integration. Choice 10 is now **Move my existing billing to Nozle**.
- **Rules follow the current SDKs:** `@nozle-js/node` 0.13, `@nozle-js/react` 0.11 and 0.12, `nozle-sdk` 0.13 and `nozle-go` v0.12. Version-specific rules name the minimum version, so integrations on older packages keep working.
  - **LLM capture beyond OpenAI and Anthropic.** On Node, the agent uses `captureFetch` for any client that accepts a custom `fetch`: the Vercel AI SDK, LangChain, Gemini, OpenAI-compatible APIs and raw `fetch`. On Python and Go it captures through the provider's HTTP client. LiteLLM is captured only when its HTTP client is routed through Nozle's. Manual tracking is kept for everything else.
  - **Errors by type:** every Node call now throws `NozleApiError`, so a 409 is read from `status` or `hasCode()`, never from the message. The request id is logged with every failure. The Python and Go error types are listed too.
  - **Retries and timestamps:** SDK retries are opt-in. A repeated key reuses its timestamp only on the same client, so a retry from a queue still passes the stored timestamp.
  - **Async Python:** `AsyncNozle` under async frameworks.
  - **Billing screens:** on Node with React, one `createBillingHandler` route serves the React billing hooks. React 0.11 needs `@tanstack/react-query` v5 and is themed with `appearance`, not Tailwind.
  - **Webhooks:** the SDK verification helpers are used, plus the documented signing contract: Base64 HMAC-SHA256 or RS256 JWT, deduplication on `X-Nozle-Unique-Key`, and only 3 delivery attempts, so a reconciliation job is planned.
  - **`NOZLE_SECRET_KEY`** is the variable name in `.env.example` (the SDKs read it by default).
- **Rules follow the current server contracts:**
  - **Events:** events and cost events go to Engine. An event that matches no active subscription, or several, is refused with 422 (`active_subscription_not_found`, `active_subscription_ambiguous`), so the subscription is passed whenever a customer can have more than one.
  - **Error codes:** state refusals are 422, not 405, and conflicts are 409.
  - **Plan families:** one pricing card per visible family, and entitlements apply to the whole family.
  - **Plan changes:** `change_at` on every plan change. An immediate change with an amount due is paid first (`payment_required`).
  - **Checkout and top-ups:** an unpaid checkout expires after 23 hours, and top-up credits are granted only once the invoice is fully paid.
  - **`can()`:** `limit` and `remaining` are `null` when there is no cap, and economics needs the summed field for a sum Feature. Margin reads honour only `from` and `to`.

### Added
- **Build in phases.** The approved scope is split into small phases in dependency order:
  1. the foundation;
  2. the service that holds the key, one billed path at a time;
  3. each other service;
  4. the frontend;
  5. rollout.

  Each phase runs its approved tests, lint and type check, fixes what fails, records the results, and is committed locally (never pushed) before the next phase starts. Tasks carry a `phase` number, and the record refuses a later phase while an earlier one is open.
- **Self-review backed by tests.** `dedupe-scope`, `legacy-gates`, `next-period` and `denial-after-work` pass only with a test that drives that case, named in the evidence. The cases are 3 parallel requests with one key, enforce with only Nozle credits, a period end in the past, and a denial after the work.
- **A new check, `peer-contract`:** a call between two services is tested against the provider's real route.
- **Two new test-backed checks from the first fix round:**
  - **`fake-refusals`:** test fakes return the documented refusals, not success. Each call the code makes has a test where the fake refuses it and the code handles the refusal. A fake that accepted a cancel Nozle always refuses hid a renewal bug.
  - **`step-isolation`:** a sync or settle job saves each step that succeeded, even when a later call fails, and moves on to the next customer.
- **Broader rules:**
  - events are stored before they are handed to the next hop, not only before Nozle;
  - the check runs before any paid provider call;
  - every recorded debt has a collector when credits arrive;
  - a subscription billed outside Nozle is ended or changed in the app's gate, never through Nozle.
  - billing state is never imported again to move a period or change a plan, and an unsupported plan change is reported as a gap;
  - every Nozle queue (usage and cost events) has a name unique to its service;
  - each new runtime dependency (a queue, cache, cron or worker) is a setup step.
- **Rules from live end-to-end runs with real Stripe and Razorpay test payments:**
  - assign the payment connection when the customer is created;
  - verify works for a customer's first purchase;
  - list a transition policy for each pair of paid plans;
  - put the return-URL allowlist in the setup plan;
  - build a cancel route;
  - handle webhooks one customer at a time, re-read the object, use the documented field names, and prefer HMAC signing on Node;
  - read only response fields that exist;
  - test the charge path once against a real database;
  - give each service its own settle queue;
  - never cache a missed customer lookup;
  - name the code line that carries out each recorded decision;
  - make switching back from enforce safe.

### Fixed
- **The self-review was skipped when tasks stayed open.** The Stop guard now treats a record whose planned files all exist as handed off, so the self-review and the code checks run.
- **A false Stop block from old records:** the scan for nested service records now stays inside one git repository and skips nested repositories.
- **Renewal check in shadow mode:** the renewal rule no longer relies on `usage.check` where Nozle holds no credits.
- **Cost events:** the parent of a cost event must be a usage event that was actually sent.
- **Guards:**
  - a client file that imports `@nozle-js/node` is now blocked;
  - `captureFetch`, `recordUsage` and the Python and Go capture helpers count as LLM wrappers in the double-billing check;
  - `costEvents.track` no longer counts as a billing call;
  - `hasCode("idempotency_key_reused")` counts as handling a 409.
- **Existing-integration scan:** it now finds capture helpers, Go cost events and `createBillingHandler`.

## [1.0.3] - 2026-10-13

### Fixed
- **The guards did nothing when records were kept per service.** The guard looked for `nozle.integration.yaml` only above the session's folder. When the agent kept one record per service and the session ran at the workspace root, every edit was allowed. Now:
  - each edited file (and each shell write) is judged by the record nearest to it;
  - session start and Stop also check the records one to three folders below;
  - the `nozle-hook` wrapper looks there too.
- `hosts opencode --write` now adds the `nozle-account` server to `opencode.json`. Log in with `opencode mcp auth nozle-account`.
- Plan entitlements are read from each plan in the `plans` family. An empty `entitlements` family no longer reads as "no features".

### Added
- **Build rules from a review of agent-built integrations,** each with a self-review check:
  - a money move between two ledgers happens once, enforced by the database (`ledger-once`);
  - every pending charge has an owner that runs without user traffic (`pending-owner`);
  - no Nozle call inside a database transaction that can still roll back (`charge-in-transaction`);
  - keys come from a stored business record, never a hash that can recur (`key-provenance`);
  - the check before the work covers the whole quantity (`check-quantity`);
  - off mode is proven unchanged (`off-mode`);
  - external billing renewal is part of the build (`renewal`);
  - no per-unit request fan-out, and tests drive the money paths.
- **A post-edit guard** that flags a Nozle usage call inside a database transaction callback.
- **README:** OpenCode install and login steps.

### Changed
- **The agent installs the packages the integration needs.** The approved scope now lists each package with its exact version, the install command, and the manifest and lockfile it changes. After you approve the scope, the agent runs the install with your project's own package manager (npm, pnpm, yarn, bun, uv, poetry, pip in the project's virtual environment, or `go get`). Your agent asks you to approve the command first. It installs only the packages the scope lists: no global install, no other package. If you refuse the command or the install fails (no network, a sandbox), the agent adds the dependency to the manifest and gives you the exact command to run.
- **The agent checks that your API keys work.** `nozle-check key [directory]` reads the keys from the environment, `.env.local` or `.env`, asks Nozle's plan catalog (read-only, nothing billable), and prints each variable name with works, rejected, or missing permission. It never prints a key value, so the agent never sees one.
- **Eleven rules from live tests against a real account,** each with a self-review check (`identity-lookup`, `legacy-gates`, `nullable-fields`, `one-clock`, `denial-retry`, `claim-after-fulfil`, `status-reader`, `codes-exist`, `lint-clean`, `charge-parity`, `shadow-seed`). Integrations whose unit tests passed still failed against a live organization because of:
  - a customer looked up through a lossy derived value (a domain rebuilt from a schema name);
  - an old balance gate left on a path that moved to Nozle;
  - a free plan without period dates;
  - a period start and end taken from two clock reads;
  - a denial replayed under the same key after credits were added;
  - a webhook marked handled before fulfilment;
  - an error-status reader that missed the SDK's real format;
  - a meter the account does not have;
  - lint errors in changed files;
  - a charge per outcome that changed silently;
  - a shadow mode with no customer to compare against.
  The scope now lists the existing gates on moved paths and a before-and-after charge table, and `nozle-doctor` and the verifier agent check the same traps.
- **Six more rules from a full-scope live test** (`dedupe-scope`, `route-coverage`, `seed-before-read`, `next-period`, `cost-event-id`, `denial-after-work`): an app-side dedupe record shared across companies and not unique, a still-mounted legacy route left unmetered, a fire-and-forget mirror read too early, renewal code that imported a second subscription although Nozle had already renewed the first, cost event ids that were random or shared across customers, work left uncharged after a track-time denial, and a limit notice that read `can()` for a credit-backed feature (`limit-source`).
- **Self-review evidence for data checks names the producer.** For `one-clock`, `nullable-fields`, `identity-lookup`, `next-period` and `subscription-id`, the evidence must point at the existing code that produces the data, not only the integration's new lines. A live test found these checks marked `pass` while the bug sat in the app's own subscription and auth code.
- **`nozle-verify` always runs lint and the type check** on the changed files, and offers an opt-in **live check**: the agent writes `nozle-live-check`, which drives each integrated flow against a test organization and reads every result back from Nozle. You run it; the guard refuses to let the agent run it.
- The Codex hook setup command picks the newest installed version of the kit, so you run the same command after every update.

## [1.0.2] - 2026-10-13

### Fixed
- An unanswered question was taken as an answer. Codex closes an unanswered `request_user_input` after about two minutes and returns empty answers. The agent then used its own recommendation as the choice, recorded the goal and kept working. Now:
  - an empty, dismissed or timed-out question decides nothing and is asked again as text;
  - after asking, the agent ends its turn and waits;
  - goals enter a draft record only with a `decisions` entry `goals` whose basis is the user's answer, and the Stop guard refuses a draft without one;
  - the guard says to ask and stop, never to write that entry itself. A Codex run had met the check by inventing a `goals` answer for an older record.
- Goal questions on a host without multi-select (Codex) now offer the recommended set as the first option, with smaller sets as the others; any numbers can be typed in the free-text answer.

### Changed
- The login step tells the user the agent waits only about 5 minutes. If onboarding takes longer, they run the agent's login again afterwards; it's one click, because the browser is already signed in.

## [1.0.1] - 2026-10-13

### Fixed
- The Stop guard asked for a hand-off summary on a record that was still mid-build, so the choices and the scope came back framed as a finished build. It now asks for the hand-off only once the record has a self-review or every task is complete. Mid-build, the findings are listed with the step's normal reply.

## [1.0.0] - 2026-10-13

First release.

### Added
- **Nine skills:** `nozle-integrate`, `nozle-add`, `nozle-status`, `nozle-resume`, `nozle-verify`, `nozle-undo`, `nozle-audit`, `nozle-doctor`, `nozle-setup`.
- **Three read-only helper agents:** scanner, mapper and verifier.
- **Guard hooks for Claude Code, Codex and other hosts:**
  - scope approval before edits;
  - "do not track" paths;
  - a user answer required for every studied activity;
  - real `.env` files and production API calls refused;
  - record and build checks at Stop;
  - settled decisions restated after compaction.
- **`nozle-check`:** stack detection, existing-Nozle scan, study, plan, progress and record validation.
- **MCP servers:** the account server (`https://api.nozle.app/core/mcp`, OAuth, read-only) and the docs server.
