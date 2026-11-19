---
name: nozle-status
description: Use when the user asks where a Nozle integration stands, what is done, what is left, or whether it is finished, and a nozle.integration.yaml record exists.
---

# Report the state of a Nozle integration

Read-only: no account connection, no edits. Run each `nozle-check <args>` (or `node <skill folder>/scripts/nozle-check.mjs <args>`) as one plain command. Record layout: [record-format.md](references/record-format.md).

1. Run `nozle-check scan <absolute app path>`, `nozle-check progress <absolute path>/nozle.integration.yaml` and `nozle-check <absolute path>/nozle.integration.yaml`. Without a record, say so and offer `nozle-integrate`.
2. Report four groups, nothing blended between them:
   - **Implemented:** tasks whose code is written (files).
   - **Verified:** tasks `completed` with evidence. Written but unrun code stays under Implemented.
   - **Pending:** tasks `pending`, `active` or `blocked`, and every setup item not yet verified (what the user must do, and which code waits).
   - **Not done:** live Nozle calls, deployment, production billing, rollout beyond `off`.
3. Add the validator's verdict, the recorded decisions and answers, the exclusions (`excluded_operations`, `excluded_paths`), and the one next step.
4. Never call it complete, live, production-ready or deployed unless every task is `completed` with evidence and the setup plan says live. Point to `nozle-resume` to continue and `nozle-doctor` to check the code.
