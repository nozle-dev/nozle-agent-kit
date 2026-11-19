# Integration records

## Contents

- Files and guards
- Example
- Field rules
- Self-review
- Commands

## Files and guards

In the application repository:

- `nozle.integration.yaml` and `nozle-setup-plan.yaml` (example below).
- `nozle-study.yaml`: the code study from before a login (inspect-stack.md).
- `nozle-integration-report.md`: readable findings, decisions, tests, manual work, gaps. `nozle-tasks.yaml`: input to `nozle-check plan`.

While a record file exists the guards are active: application edits are refused until `approved_scope` is saved, then limited to `included_paths` and kept out of `excluded_paths`; commands with a Nozle key, network commands to the production API host, and non-read Nozle tools are refused. Without a record the guards do nothing. Keep records free of credentials and personal data, and use repository-relative paths.

## Example

```yaml
# nozle.integration.yaml
schema: nozle.integration
version: 1
organization_id: org_example
selected_goals: [5, 7]
stack: { backend_path: node-sdk, runtime: node }
peers: []
configuration:
  plans: { status: complete, revision: plan-revision-from-account-read }
  meters: { status: unavailable, reason: account MCP unavailable }
approved_scope:
  approved_at: 2026-10-10T10:00:00Z
  included_paths: [src/paid-generation.ts]
  excluded_operations: [internal copilot]
  excluded_paths: [src/copilot/]
  billing_rules: [bill one successful document generation once]
source_files:
  - path: src/paid-generation.ts
    sha256: "0000000000000000000000000000000000000000000000000000000000000000"
tasks:
  - id: identity
    label: Map the authenticated customer
    phase: 1
    status: completed
    evidence: bun test src/identity.test.ts passed
  - id: paid-usage
    label: Track paid document generation
    phase: 2
    status: pending
    depends_on: [identity]
decisions:
  - { id: goals, question: "Which goals?", answer: "5 and 7", basis: user }
  - { id: "activity:copilot", question: "Track the copilot?", answer: do not track, basis: user, activities: [copilot] }
self_review:
  usage-key: { result: pass, evidence: "src/paid-generation.ts:42" }
  # one entry per check in financial-rules.md, "Self-review checks"
```

```yaml
# nozle-setup-plan.yaml
schema: nozle.setup-plan
version: 1
items:
  - id: create-document-meter
    status: manual_pending
    instructions: Create the document meter in the Nozle dashboard.
```

## Field rules

- Placeholders in the example are replaced only with verified values. `approved_at` is the real approval time.
- `stack` is the `nozle-check env` verdict: `backend_path` is `node-sdk`, `python-sdk`, `go-sdk` or `rest`; `runtime` is what the check confirmed, or `unknown`. The guard refuses an SDK import that contradicts it; change it only with the user's yes.
- `configuration`: copy each family's `status` and `revision` from `get_integration_configuration`. A `complete` family keeps its revision even when empty ("none configured" goes in the report); any other status needs a one-line `reason`.
- `included_paths` lists application files only, never the records. Each needs a `source_files` entry with its SHA-256 (`absent` for a planned new file), from `nozle-check hash`. Refresh hashes after each verified task.
- Task statuses: `pending`, `active`, `completed`, `failed`, `blocked`, `deferred`. `completed` needs a command and its observed result; written but unrun code stays `pending` with "written, not verified". A task waits for its `depends_on` and for every earlier `phase` to be `completed`.
- Setup item statuses: `manual_pending`, `code_written`, `code_verified`, `awaiting_activation`, `live_observed`. Never mark a live result the user has not observed.
- `decisions`, `peers` and `self_review` are required at hand-off (a record with `self_review`, all tasks completed, or every source file present); an earlier mid-build record can resume without them.
- A record for work that was not built is `blocked: { reason: ... }` plus `decisions`; nothing else is required.
- Write lists in block style. Quote any value containing `: `, `,` or `#`, or starting with a special character. Commentary goes in the report, not the YAML.

## Self-review

One entry per check id in financial-rules.md, "Self-review checks": `result` (`pass`, `fail`, `not_applicable`) and `evidence` with file and line. Read the code for each; never copy the result from the plan.

- `dedupe-scope`, `legacy-gates`, `next-period`, `denial-after-work`, `fake-refusals`, `step-isolation` pass only when a test drives that case, the evidence names the test file, and that file is in `source_files`.
- `one-clock`, `nullable-fields`, `identity-lookup`, `next-period`, `subscription-id` pass only when the evidence names where the existing app produces that data and how the integration handles it.
- `conflict-409` passes only when every 409 code the calls can return has its own handling; `error-types` covers the 402 customer refusals.

The Stop guard refuses to finish while an entry is `fail`: fix it or ask the user.

## Commands

Run each as one plain command: `nozle-check <args>` where the plugin's bin is on PATH, otherwise `node <skill folder>/scripts/nozle-check.mjs <args>` with the skill's absolute base directory. Never chain with `cd`, `&&`, `||`, `;`, pipes or a subshell; hosts without an approver refuse chained commands. If it cannot run, follow the example exactly and list the records as unvalidated.

```sh
nozle-check nozle.integration.yaml        # validate (also nozle-setup-plan.yaml, nozle-study.yaml)
nozle-check plan nozle-tasks.yaml         # selected_goals + tasks -> ordered tasks, shared prerequisites merged
nozle-check progress                      # "3/7 completed", checklist, blockers, next step
nozle-check resume --config current.yaml  # rehash scoped files, compare { family: { status, revision } }
nozle-check hash <repository> <paths>     # source_files block
```
