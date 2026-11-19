---
name: nozle-undo
description: Use when the user wants to back out, revert or remove changes made by a Nozle integration, for the whole integration, one step, or one file.
---

# Back out Nozle integration changes

Local files only. Dashboard items the user created stay, and you say so. Ask with the host's question tool ([asking.md](references/asking.md)). Record layout: [record-format.md](references/record-format.md). Run each `nozle-check <args>` as one plain command.

1. Read `nozle.integration.yaml`: `approved_scope.included_paths`, `source_files` (an `absent` hash marks a file the integration created) and `tasks`. No record, or no git: stop, explain there is no safe automatic revert, and offer a reverse patch for the user to review.
2. Show per task and file what changed (`git status --short`, `git diff -- <file>` for scope files only), marking files that also hold changes the integration did not make.
3. Ask what to back out: everything, selected tasks, or selected files, saying what each removes and what stays (records, dashboard setup, installed packages until the package manager runs again).
4. Only after the user confirms the exact file list in a later reply (a request naming the step is not that confirmation): `git restore -- <file>` for modified files, `rm -- <file>` for created ones, and hand-revert the manifest and lockfile entries the integration added. Never `git reset --hard`, `git clean` or `git checkout .`, and never a file outside the list.
5. Update the record: backed-out tasks `pending`, `decisions` kept, hashes recomputed with `nozle-check hash <repository> <paths>`. Delete the record files (which switches the guards off) only after a second confirmation.
6. Finish with what was reverted, what remains in the account (dashboard entries, API keys), and the variable names left in `.env.example`.
