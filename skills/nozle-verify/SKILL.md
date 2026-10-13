---
name: nozle-verify
description: Use when the user wants the Nozle integration's own tests or checks actually run (instead of traced by hand) and the results recorded in nozle.integration.yaml.
---

# Run and record the integration's verification

Code that was never run stays `written, not verified`. This skill runs it, with the user's approval, and records what happened. Record layout: [record-format.md](references/record-format.md). Run each `nozle-check` command as one plain command (`nozle-check <args>` or `node <skill folder>/scripts/nozle-check.mjs <args>`).

Whenever you need the user to choose or approve something, use the host's question tool as described in [asking.md](references/asking.md) (a typed numbered list only when there is no such tool).

1. Find the project's own test command (a `package.json` script, `pytest`, `go test ./...`, whatever the repository documents) and any typecheck or lint command, and the environment it runs in: a virtualenv inside the repository (`.venv/bin/python -m pytest`, `venv/`), the project's runner (`uv run`, `poetry run`, `pipenv run`), or `node_modules/.bin`. Check the interpreter exists before proposing the command. When no environment has the dependencies, say so and offer to create one inside the repository as a separate command to approve. Show each exact command and say plainly that it is repository-controlled code that will run on the user's machine.
2. Ask with the question tool for approval of each exact command. Invoking this skill is not approval. A command the user declines is recorded `skipped_by_user`.
3. Run an approved command with the Nozle credentials left out of its environment (`env -u NOZLE_SECRET_KEY -u NOZLE_API_KEY <command>`, plus every other variable the integration reads). Never put a real key in the environment, never run the app against the production host, and never send a billable event: tests use the mocks the integration wrote. If a test needs a live Nozle call, mark it `blocked` and say so.
4. Record each check as `passed`, `failed`, `blocked`, `unavailable`, `skipped_by_user`, `not_applicable`, `not_run` or `stale` (the code changed after the run), with the command and exit code as evidence, never the full output. Only `passed` proves a check. Update the matching task: `completed` only when its checks passed; otherwise it stays `pending` with the reason.
5. Fix what a failing test shows only inside the approved scope, rerun, and say what changed. A failure outside the scope is reported, not edited.
6. Close with the same four groups as `nozle-status` (Implemented, Verified, Pending, Not done) and state that local tests do not prove sandbox behavior, deployment or live billing.
