---
name: nozle-resume
description: Use when continuing a previously approved Nozle integration after an interruption or after the code or account changed, and a nozle.integration.yaml record exists.
---

# Resume an approved Nozle integration

Continue only within the approved scope, after rechecking what changed. Details: [record-format.md](references/record-format.md), [connect-and-read.md](references/connect-and-read.md), [inspect-stack.md](references/inspect-stack.md), [financial-rules.md](references/financial-rules.md). Run each `nozle-check` command as one plain command: `nozle-check <args>` where the plugin's bin is on PATH, otherwise `node <skill folder>/scripts/nozle-check.mjs <args>` with the skill's absolute base directory. Never chain it with `cd`, `&&`, `||` or a subshell; hosts that run without an approver refuse chained commands.

Whenever you need the user to choose or approve something, use the host's question tool as described in [asking.md](references/asking.md) (a typed numbered list only when there is no such tool).

## Steps

1. **Load.** When there is no `nozle.integration.yaml` but a `nozle-study.yaml` exists, this is a study waiting for the account: run `nozle-check study`, reuse unchanged findings, read the account, update the study and continue as `nozle-integrate` does from step 5.
   Otherwise: Validate the record: `nozle-check <absolute path>/nozle.integration.yaml`. Its `stack`, approved scope and recorded decisions are binding: changing any of them needs the user's explicit yes. If it is missing or invalid, stop and say what is wrong; offer `nozle-integrate` to start over.
2. **Reread the account** (connect-and-read.md) and write each family's current `status` and `revision` to a temporary YAML file as `family: { status, revision }`. Do not reuse the recorded values.
3. **Check drift.** Run `nozle-check resume --config <that file>`. It rehashes every scoped file and compares configuration families. Exit 0 means no drift.
4. **If there is drift** (changed files, changed or unavailable families, or a new material finding about charges, attribution, or exclusions), reread the affected code (inspect-stack.md), explain what changed, and return to scope approval. Do not edit until the user approves the changed scope. Re-plan only the affected steps with `nozle-check plan`.
5. **If there is no drift,** show `nozle-check progress`, then continue with the next step whose dependencies are completed. Finish one step at a time: edit within scope, run its targeted tests, record evidence, update the file hashes in `source_files`, and show the checklist again.
6. **Finish** as `nozle-integrate` does: validate both YAML files and separate code written, code verified, manual setup pending, awaiting activation, and live result observed. Never send live billable traffic or call an account tool that changes anything.
