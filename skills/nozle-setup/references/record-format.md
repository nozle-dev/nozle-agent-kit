# Integration handoff records

Create a draft `nozle.integration.yaml` (`schema`, `version`, `organization_id`, `selected_goals`) as soon as goals are chosen. While either record file exists in the repository, the plugin's guards are active: application edits are refused until `approved_scope` is saved, then limited to its `included_paths`; commands containing a Nozle secret key, network commands to the production API host, and Nozle tools outside the read-only list are refused. Without a record file the guards do nothing, so unrelated work is unaffected.

Write these files in the **target application repository** after scope approval:

- `nozle.integration.yaml`: selected goals, organization ID, account family status and revisions, approved code scope, explicit exclusions, financial rules, source file hashes, task states, and completion evidence.
- `nozle-setup-plan.yaml`: dashboard actions and activation work with distinct manual, written, verified, awaiting activation, and live states.
- `nozle-study.yaml` (written before or without an account login): the code study, so the run continues after login without redoing it. `nozle-check study` validates it and lists files changed since.
- `nozle-integration-report.md`: readable findings, decisions, test results, remaining manual work, and known product gaps.

Keep the records free of credentials and personal data. The validator catches common credential field names and token patterns; it cannot prove arbitrary text contains no secrets, so inspect the report and YAML before handoff. Use repository-relative file paths. The validator checks path syntax, so the host must resolve symlinks and confirm each real path stays inside the selected repository before reading it. Do not mark a task completed based only on a code diff; include the command and relevant observed result. Do not mark a live result observed unless the user has actually activated and observed it.

## Example

```yaml
# nozle.integration.yaml
schema: nozle.integration
version: 1
organization_id: org_example
selected_goals: [5, 7]
stack: { backend_path: node-sdk, runtime: node }
configuration:
  plans: { status: complete, revision: plan-revision-from-account-read }
  meters: { status: unavailable, reason: account MCP unavailable }
approved_scope:
  approved_at: 2026-10-10T10:00:00Z
  included_paths: [src/paid-generation.ts]
  excluded_operations: [internal copilot]
  excluded_paths: [src/copilot/]   # files or folders the user said not to track; edits there are refused
  billing_rules: [bill one successful document generation once]
source_files:
  - path: src/paid-generation.ts
    sha256: "0000000000000000000000000000000000000000000000000000000000000000"
tasks:
  - id: identity
    label: Map the authenticated customer
    status: completed
    evidence: bun test src/identity.test.ts passed
  - id: paid-usage
    label: Track paid document generation
    status: pending
    depends_on: [identity]
decisions:
  - { id: charge-order, question: "Charge before or after the work?", answer: after the image is stored, basis: user }
  - { id: "activity:copilot", question: "Track the copilot?", answer: do not track, basis: user }
self_review:
  usage-key: { result: pass, evidence: "src/paid-generation.ts:42" }
  conflict-409: { result: not_applicable, evidence: "no such path in this app" }
  retries: { result: not_applicable, evidence: "no such path in this app" }
  # ... one entry for every check listed below
```

```yaml
# nozle-setup-plan.yaml
schema: nozle.setup-plan
version: 1
items:
  - id: create-document-meter
    status: manual_pending
    instructions: Create and confirm the document meter in the Nozle dashboard.
```

The example IDs and hash are placeholders. Replace them only with verified values. The account read must distinguish `complete`, `missing`, `incomplete`, `unavailable`, and `unsupported`; a `complete` family needs a revision. The approved scope lists every file that may change. Store each file's current SHA-256 in `source_files`; use `sha256: absent` for a planned new file. Get the block with `nozle-check hash <absolute repository path> <path>...` instead of `sha256sum`, which some hosts refuse. Save the initial hashes with approval, then update hashes after each verified task so they represent the last verified state. On resume, explicitly recheck every scoped path (record a verified absence as `absent`), compare all family statuses and available revisions, and return to scope review for material drift.

`stack` records the verdict from `nozle-check env`: `backend_path` is `node-sdk`, `python-sdk`, `go-sdk` or `rest`, and `runtime` names where the backend runs (for example `node`, `workers`, `python`), or `unknown` when `nozle-check env` could not tell (for example SvelteKit `adapter-auto`); never assert a runtime the stack check did not confirm. The guard refuses an SDK import that contradicts it; change it only with the user's explicit yes.

Write `approved_at` as the real time the user approved, not a placeholder. Update task statuses as you go: code that is written but not verified stays `pending` with evidence "written, not verified", and a verified step becomes `completed`. In the hand-off, list every difference between the built code and the approved scope (a dropped item, a changed rule, a file moved) as a change that needs the user's yes.

A record is at handoff once it has a `self_review`, every task is `completed`, or (for the Stop guard) every file in `source_files` exists on disk, which means the code is written; until then `nozle-check` and the Stop guard check it the way resume does, so the handoff-only fields below (`decisions`, `peers`, `self_review`) are not yet required and an older mid-build record can still be resumed. Write all three before handing off.

`decisions` lists every question the user answered (`id`, `question`, `answer`, `basis`: `user`, `user_confirmed_recommendation` or `matched_in_account`, and for a measure decision `activities`: the `nozle-study.yaml` activity ids it answers; application edits are refused while a study activity has no answer); it is required at handoff and may be `[]` when nothing needed asking. See decision-questions.md.

A record for an integration that was not built ends with `blocked: { reason: ... }` plus `decisions`; nothing else is required then. Quote text values that contain ": " or "#" so the YAML parses.

`self_review` is required in the handoff record. Before handing off, check your own diff against each build trap in financial-rules.md and write one entry per check: `result` is `pass`, `fail` or `not_applicable`, and `evidence` names the file and line that shows it (or why it does not apply). The checks are: `usage-key`, `conflict-409`, `retries`, `error-types`, `charge-order`, `stream-abort`, `client-ids`, `subscription-id`, `paid-without-payment`, `shadow-writes`, `stuck-unit`, `legacy-balance`, `migration`, `secret-key`, `scope-changes`, `ledger-once`, `pending-owner`, `charge-in-transaction`, `key-provenance`, `check-quantity`, `off-mode`, `renewal`, `identity-lookup`, `legacy-gates`, `nullable-fields`, `one-clock`, `denial-retry`, `claim-after-fulfil`, `status-reader`, `codes-exist`, `lint-clean`, `charge-parity`, `shadow-seed`, `dedupe-scope`, `route-coverage`, `seed-before-read`, `next-period`, `cost-event-id`, `denial-after-work`, `limit-source`, `peer-contract`, `fake-refusals`, `step-isolation`. Read the code for each one; `dedupe-scope`, `legacy-gates`, `next-period`, `denial-after-work`, `fake-refusals` and `step-isolation` are `pass` only when a test drives that case (parallel requests with one key; enforce for a customer whose only credits are in Nozle; a period end in the past; a denial after the work ran; the fake returning a documented refusal; one remote call failing in the middle of a job) and the evidence names that test file, which is listed in `source_files`; do not copy the result from the plan. For a check about data the integration reads (`one-clock`, `nullable-fields`, `identity-lookup`, `next-period`, `subscription-id`), the evidence names where that data is produced in the existing application (the code that writes the period dates, the customer id, the nullable field) and how the integration handles what it produces; evidence that cites only the integration's own new lines is not a pass, because in live tests these bugs sat in existing code the integration consumed. The stop guard refuses to finish while an entry is `fail` until you fix it or ask the user. Resume does not require it.

`peers` and `interfaces` tie a backend and a frontend repository together (see "One product, several repositories or sessions" in the integrate skill): `peers: [{ role, location, record_seen }]` (required at handoff; `[]` when this repository is the whole product) and `interfaces: [{ id, method, route, purpose, provides | consumes, status }]`, where `status` is `provided`, `unmatched` or `blocked`.

Task fields: `id` and `status` are required; `label`, `goals`, `depends_on`, `required` and `phase` are optional. `phase` is a whole number from 1 for the build phase in the approved scope; a task in a later phase cannot be `active` or `completed` until every task in each earlier phase is `completed` (or `deferred` with a reason). A task cannot be `active` or `completed` before every task in `depends_on` is `completed`, and `depends_on` must name tasks in the same record. When you write code for several dependent tasks in one pass and cannot run their verification, mark only a task whose dependencies are all `completed` as `active`; every other written task stays `pending`, with its evidence saying "written, not verified".

Generate and display tasks with the bundled script instead of ordering them by hand:

Run each of these as one plain command: `nozle-check <args>` where the plugin's bin is on PATH, otherwise `node <skill folder>/scripts/nozle-check.mjs <args>` with the skill's base directory as an absolute path. Never chain it with `cd`, `&&`, `||` or a subshell, because hosts that run without an approver refuse chained commands. If it still cannot run, say so, follow the field names, task statuses (`pending`, `active`, `completed`, `failed`, `blocked`, `deferred`) and structure of the example above exactly, add nothing free-form (put commentary in the report, not in the YAML), and list the records as unvalidated in the hand-off.

```sh
nozle-check plan nozle-tasks.yaml   # selected_goals + tasks -> ordered tasks, shared prerequisites merged
nozle-check progress          # "3/7 completed", checklist, blockers, next step
nozle-check resume --config current-configuration.yaml
```

`plan` input is `selected_goals` plus `tasks` with `id`, `label`, `goals`, and optional `depends_on` and `required`; the same `id` from two goals merges into one task. Paste its output into the integration record. `resume` rehashes every scoped file and compares each configuration family's `status` and `revision` with the YAML you write from the fresh account read (`family: { status, revision }`); any drift means return to scope review.

Validate both YAML files before handoff with the bundled Node script:

```sh
nozle-check nozle.integration.yaml
nozle-check nozle-setup-plan.yaml
```

`included_paths` lists application files only, such as code, config templates, tests, and docs you edit. Never list the record files or the report: a file cannot hold its own hash. Every included path needs a `source_files` entry with its SHA-256 (or `absent` for a file you only plan to create); `nozle-check` rejects the record otherwise.

Write task and item lists in block style, one field per line. In `{ ... }` one-line form, an unquoted comma or colon inside a value splits it into extra keys and the record fails validation. Quote any string that contains a comma, colon, or `#`.

For `configuration`, copy each family's status and revision from `get_integration_configuration`. A family the account MCP read as `complete` stays `complete` with its revision even when it holds zero items; say "none configured" in the report, not in the status. Any other status needs a one-line `reason`.
