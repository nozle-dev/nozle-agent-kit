---
name: nozle-status
description: Use when the user asks where a Nozle integration stands, what is done, what is left, or whether it is finished, and a nozle.integration.yaml record exists.
---

# Report the state of a Nozle integration

Read-only. No account connection, no edits. Run each `nozle-check` command as one plain command: `nozle-check <args>` where the plugin's bin is on PATH, otherwise `node <skill folder>/scripts/nozle-check.mjs <args>` with the skill's absolute base directory. Record layout: [record-format.md](references/record-format.md).

## Steps

1. Run `nozle-check scan <absolute application path>` for where Nozle is used in the code, then `nozle-check progress <absolute path>/nozle.integration.yaml` and `nozle-check <absolute path>/nozle.integration.yaml`. Without a record, say so and offer `nozle-integrate`.
2. Report four groups, with these labels and nothing blended between them:
   - **Implemented:** tasks whose code is written (name the files).
   - **Verified:** tasks `completed` with evidence (name the evidence). Code that is written but not run stays under Implemented.
   - **Pending:** tasks still `pending`, `active` or `blocked`, and every dashboard item in `nozle-setup-plan.yaml` that is not `verified` (what the user must do, and which code waits for it).
   - **Not done:** what no run has covered: live Nozle calls, deployment, production billing, rollout beyond `off`.
3. Add the validator's verdict (valid, or the first errors), the decisions recorded with their answers, the exclusions (`excluded_operations`, `excluded_paths`), and the one next step.
4. Never call the integration complete, live, production-ready or deployed unless every task is `completed` with evidence and the setup plan says `live`; otherwise say what is missing. To continue, point to `nozle-resume`; to check the code, `nozle-doctor`.
