# Scope, build and hand-off

## Contents

- What the scope shows
- Phases
- Building
- Hand-off

## What the scope shows

The draft record exists before the scope is shown. The scope lists:

- integration points, exclusions, attribution, the decisions it rests on, behavior to preserve;
- every file expected to change, including the one that supplies a stable id for the usage key, so the build never falls back to a random id;
- every existing balance, credit, quota or plan gate on paths that move to Nozle, and what happens to each;
- a charge table: each billed outcome (success, empty result, duplicate, provider failure) charged today and after (financial-rules.md, `charge-parity`);
- packages (name, exact version, install command, manifest and lockfile), dashboard prerequisites, effects on current users, tests.

When the app already holds balances or quotas, the scope has off, shadow and enforce modes, each defined exactly (what is sent to Nozle, which system is authoritative for a denial, what users see), and a drain the user chooses for every existing balance before enforce. A log-only stub is not shadow mode unless the user chose it. For credit-backed work that can fail after it starts, ask the charge-order question (financial-rules.md, "Charge order").

Approving the whole scope, or "answer the open questions yourself", approves the recommendations you showed, never anything riskier (charging without payment, letting users without a subscription through, a hard cutover). Ask before changing an approved item or touching a file outside the list.

## Phases

Numbered phases in dependency order, each small enough to test alone: (1) foundation (customer identity, the Nozle client module, migrations, records); (2) the service that holds the secret key, one billed path at a time; (3) each service that relays to it or sends costs, one per phase; (4) the frontend; (5) rollout tooling (modes, imports, settle jobs). Each step names its files, its Nozle surface (method or REST endpoint, with its docs page), its dashboard steps and its check. Each phase lists the exact test, lint and type-check commands that prove it, including the test-backed cases its paths touch (financial-rules.md, rows marked **test**). Ask once, with the scope, to approve those commands and a local commit per verified phase (never a push).

## Building

- Save the approved scope, then re-read `get_integration_configuration` and the plans and drop dashboard steps for items that now exist.
- Write tasks with `depends_on` and `phase` to `nozle-tasks.yaml`, run `nozle-check plan`, and paste the result into the record. Use the host's task list, or show `nozle-check progress`.
- Install every listed package with the project's own manager (the one `nozle-check env` reports), exact version pinned, one plain command per package folder using the manager's folder option (`npm --prefix`, `pnpm -C`, `yarn --cwd`, `bun --cwd`, `uv --directory`, `poetry -C`, `go -C`). No other package, no global install. If the install is refused or fails, edit the manifest by hand, say why, and give the user the command. On the REST path add no SDK, even when asked; say why.
- Never use, install or recommend `@nozle-js/mcp` or any Nozle MCP besides the docs MCP and the account connection this plugin registers.
- One phase at a time, one step at a time inside it: write the code, run its approved checks with the Nozle variables unset, fix failures inside scope, mark tasks `completed` with commands and results, refresh hashes, commit the phase locally when approved (`nozle: phase 2, <path>`). A phase with a failing or unrun check stops the build: ask instead of moving on.
- Write no files besides the records, `nozle-study.yaml`, `.env.example` and approved application files (no plan documents from other workflows).
- Missing account configuration is a dashboard item in `nozle-setup-plan.yaml`; never configure the account or write a script that does. Code that needs it waits for a fresh read showing it, or for the user's choice to continue with it pending.
- When you cannot build (no server identity, a missing dependency only the user can supply, a declined decision), write the record as `blocked` and stop.

## Hand-off

1. Review your diff against financial-rules.md ("Refusals and errors", "Self-review checks"), fix what you find, and write `self_review` (record-format.md). Confirm every refusal its docs page lists is handled by code, and every call, field and method was confirmed in the docs or the installed types.
2. Run lint and the type check on changed files where the host allows; otherwise offer `nozle-verify`. Run local or fixture tests for approved and excluded paths (a `nozle-verifier` agent may run them). A test you could not run is traced through its code path and listed as unverified.
3. Validate `nozle.integration.yaml` and `nozle-setup-plan.yaml` and write the report.
4. Report four labelled groups: **Implemented** (files), **Verified** (what ran, with evidence), **Pending** (dashboard steps and what waits on them; when the user says keys are in place, run `nozle-check key` and give its verdict), **Not done** (live calls, deployment, production billing, rollout beyond `off`). Never call it complete or live while Pending or Not done applies. End with the user's dashboard steps and the first-event check (financial-rules.md, "Credentials stay with the user").
