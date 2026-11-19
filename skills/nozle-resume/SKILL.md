---
name: nozle-resume
description: Use when continuing a previously approved Nozle integration after an interruption, or after the code or account changed, and a nozle.integration.yaml or nozle-study.yaml record exists.
---

# Resume an approved Nozle integration

Continue only within the approved scope, after rechecking what changed. Run each `nozle-check <args>` (or `node <skill folder>/scripts/nozle-check.mjs <args>`) as one plain command, never chained with `cd`, `&&`, `||` or pipes. Ask with the host's question tool ([asking.md](references/asking.md)). Record layout and commands: [record-format.md](references/record-format.md). Money rules: [financial-rules.md](references/financial-rules.md).

1. **Load.** Only a `nozle-study.yaml`: a study waiting for the account. Run `nozle-check study`, reuse unchanged findings, read the account, update the study, and continue as `nozle-integrate` does from its first response. Otherwise validate `nozle.integration.yaml`; its `stack`, scope and decisions bind you, and changing one needs the user's yes. Missing or invalid: say what is wrong and offer `nozle-integrate`.
2. **Re-read the account** ([connect-and-read.md](references/connect-and-read.md)) and write each family's current `status` and `revision` to a temporary file as `family: { status, revision }`. Never reuse recorded values.
3. **Check drift** with `nozle-check resume --config <that file>`; exit 0 means none.
4. **Drift** (changed files or families, or a new finding about charges, attribution or exclusions): re-read the affected code ([inspect-stack.md](references/inspect-stack.md)), explain the change, re-plan only affected steps with `nozle-check plan`, and return to scope approval before any edit.
5. **No drift:** show `nozle-check progress` and continue with the next step whose dependencies are completed, one at a time: edit within scope, run its checks, record evidence, refresh `source_files` hashes.
6. **Finish** as `nozle-integrate` does: `self_review`, both records validated, and Implemented, Verified, Pending and Not done kept separate. Never send live billable traffic or call an account tool that changes anything.
