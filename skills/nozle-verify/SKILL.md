---
name: nozle-verify
description: Use when the user wants the Nozle integration's own tests or checks actually run (instead of traced by hand) and the results recorded in nozle.integration.yaml.
---

# Run and record the integration's verification

Code that was never run stays `written, not verified`. This skill runs it, with the user's approval, and records what happened. Record layout: [record-format.md](references/record-format.md). Run each `nozle-check` command as one plain command (`nozle-check <args>` or `node <skill folder>/scripts/nozle-check.mjs <args>`).

Whenever you need the user to choose or approve something, use the host's question tool as described in [asking.md](references/asking.md) (a typed numbered list only when there is no such tool).

1. Find the project's own test command (a `package.json` script, `pytest`, `go test ./...`, whatever the repository documents) and its lint and typecheck commands (always propose both for the changed files: a lint or type error in a changed file is a failed check, `lint-clean` in the record), and the environment it runs in: a virtualenv inside the repository (`.venv/bin/python -m pytest`, `venv/`), the project's runner (`uv run`, `poetry run`, `pipenv run`), or `node_modules/.bin`. Check the interpreter exists before proposing the command. When no environment has the dependencies, say so and offer to create one inside the repository as a separate command to approve. Show each exact command and say plainly that it is repository-controlled code that will run on the user's machine.
2. Ask with the question tool for approval of each exact command. Invoking this skill is not approval. A command the user declines is recorded `skipped_by_user`.
3. Run an approved command with the Nozle credentials left out of its environment (`env -u NOZLE_SECRET_KEY -u NOZLE_API_KEY <command>`, plus every other variable the integration reads). Never put a real key in the environment, never run the app against the production host, and never send a billable event: tests use the mocks the integration wrote. If a test needs a live Nozle call, mark it `blocked` and say so.
4. Record each check as `passed`, `failed`, `blocked`, `unavailable`, `skipped_by_user`, `not_applicable`, `not_run` or `stale` (the code changed after the run), with the command and exit code as evidence, never the full output. Only `passed` proves a check. Update the matching task: `completed` only when its checks passed; otherwise it stays `pending` with the reason.
5. Fix what a failing test shows only inside the approved scope, rerun, and say what changed. A failure outside the scope is reported, not edited.
6. **Live check against a test organization (opt-in, user-run).** Local tests use mocks, so they miss what only a real account shows (a code the account does not have, a customer lookup that misses, a denial replayed). Offer it once the local checks pass; never run it yourself, because it sends real events. If the user agrees, write `nozle-live-check` (a script in the project's language, inside the approved scope, for example `scripts/nozle-live-check.mjs`) that:
   - refuses to run unless the user passes `--org <organization id>` for a test organization, and runs `nozle-check key` first;
   - drives each integrated flow through the app's own code (its service functions or its local HTTP routes), with test data whose ids carry a `nozle-live-` prefix: customer creation, subscription, each billed action once, the same action again with the same id (must charge once), a denial and the retry after credits are added, and each error path the code handles;
   - after each step, reads the result back from Nozle (customer, subscription, events or credit operations, balance) and prints one line per flow with PASS or FAIL and the expected and actual values, never a key value;
   - leaves the test data in place and prints the ids it created.
   Give the user the exact command, ask them to run it and paste the result, then record each flow under the matching task as `passed` or `failed` with that evidence and fix failures inside the approved scope.
7. Close with the same four groups as `nozle-status` (Implemented, Verified, Pending, Not done) and state that local tests do not prove sandbox behavior, deployment or live billing.
