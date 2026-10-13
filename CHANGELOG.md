# Changelog

Each release raises the version in every manifest (`bun scripts/release.ts <version>`). Claude Code and Codex cache an installed plugin by version, so a change shipped without a new version doesn't reach anyone who already installed it.

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
