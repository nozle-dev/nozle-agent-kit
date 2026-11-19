---
name: nozle-verify
description: Use when the user wants the Nozle integration's own tests, lint and type checks actually run (instead of traced by hand) and the results recorded in nozle.integration.yaml, or wants a live check against a test organization.
---

# Run and record the integration's verification

Code never run stays `written, not verified`. Ask with the host's question tool ([asking.md](references/asking.md)). Record layout and self-review rules: [record-format.md](references/record-format.md). Run each `nozle-check <args>` as one plain command.

1. With phases, verify the earliest incomplete phase first; move on only when its checks pass.
2. Find the project's test, lint and type-check commands and the environment they need (`.venv/bin/python -m pytest`, `uv run`, `poetry run`, `node_modules/.bin`). Confirm the interpreter exists, or offer to create the environment as its own command. Say each command is repository code that runs on the user's machine.
3. Ask approval for each exact command; invoking this skill is not approval. A declined command is `skipped_by_user`.
4. Run approved commands with every Nozle variable removed from the environment (`env -u NOZLE_SECRET_KEY -u NOZLE_API_KEY <command>` plus any other the integration reads). No real key, no production host, no billable event; a test that needs a live call is `blocked`.
5. Record each check as `passed`, `failed`, `blocked`, `unavailable`, `skipped_by_user`, `not_applicable`, `not_run` or `stale`, with the command and exit code. A task is `completed` only when its checks passed. Refresh `self_review`: the test-backed checks pass only with a test that drove the case, and `peer-contract` only with each cross-service client tested against the provider's real route. A missing test is written inside the approved scope and its command proposed.
6. Fix failures only inside the approved scope and rerun; report failures outside it.
7. **Live check (opt-in, the user runs it).** Once local checks pass, offer to write a `nozle-live-check` script in scope. It refuses to run without `--org <test organization id>`, runs `nozle-check key` first, drives each flow through the app's own code with `nozle-live-` ids (each billed action, its repeat charging once, a denial and the retry after credits, each handled error), reads results back from Nozle, and prints PASS or FAIL per flow, never a key. Never run it yourself; record the user's pasted result per task.
8. Close with Implemented, Verified, Pending and Not done, and say local tests do not prove sandbox behavior, deployment or live billing.
