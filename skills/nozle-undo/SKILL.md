---
name: nozle-undo
description: Use when the user wants to back out, revert or remove changes made by a Nozle integration, for the whole integration, one step, or one file.
---

# Back out Nozle integration changes

Local files only. Nothing here touches the Nozle account: dashboard items the user already created stay, and the skill says so. Record layout: [record-format.md](references/record-format.md). Run each `nozle-check` command as one plain command (`nozle-check <args>` or `node <skill folder>/scripts/nozle-check.mjs <args>`).

Whenever you need the user to choose or approve something, use the host's question tool as described in [asking.md](references/asking.md) (a typed numbered list only when there is no such tool).

1. Read `nozle.integration.yaml`: `approved_scope.included_paths`, `source_files` (a hash of `absent` marks a file the integration created) and `tasks`. No record, or the project is not under git: stop and explain that there is no safe automatic revert; offer a reviewed reverse patch for the user to apply.
2. Show, per task and per file, what changed: `git status --short` and `git diff -- <file>` for scope files only. Mark files that also hold changes the integration did not make (the diff shows more than the task's work).
3. Ask with the question tool what to back out: everything, selected tasks, or selected files. Say what each choice removes and what stays (the records, the dashboard setup, installed packages and the lockfile).
4. Only after the user confirms the exact file list in a later reply (a request that names the step is not that confirmation; show the list and end the turn): restore modified files with `git restore -- <file>`, remove files the integration created (`absent` hash) with `rm -- <file>`, and revert the `package.json` or lockfile entries the integration added by hand. Never use `git reset --hard`, `git clean` or `git checkout .`, and never touch a file outside the list.
5. Update the record: mark the backed-out tasks `pending` (or `cancelled` in the report), keep `decisions`, and recompute `source_files` hashes with `nozle-check hash <repository> <paths>`. If the user wants the integration fully gone, delete `nozle.integration.yaml`, `nozle-setup-plan.yaml`, `nozle-tasks.yaml` and `nozle-integration-report.md` only after a second confirmation; deleting them switches the plugin's guards off.
6. Finish with the list of what was reverted, what remains in the account (their dashboard entries and any API key), and the env variable names left in `.env.example`.
