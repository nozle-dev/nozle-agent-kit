# Inspect the application

Shared by integrate, audit, doctor, and resume. Code never leaves the machine.

1. Run `nozle-check env` (run it as one plain command with the absolute application path: `nozle-check env <path>` where the plugin's bin is on PATH, otherwise `node <skill folder>/scripts/nozle-check.mjs env <path>` using the skill's base directory; never chain it with `cd`, `&&`, `||` or a subshell, because hosts that run without an approver refuse chained commands, and if one form is refused try the other), then read dependency manifests and the bounded paths that matter. Turn its backend and frontend paths into the support statement described in [stack-support.md](stack-support.md). In a monorepo, identify the target application, confirm it with the user, and keep every path inside it.
2. Trace, in this order: authentication and customer identity; team or organization membership; existing payment, subscription, and billing ownership; AI clients and each caller of them; background jobs, queues, and streams; webhooks; existing Nozle usage; tests and fixtures.
3. Read environment variable names only when needed. Never read or copy credential values.
4. Label each finding `confirmed` (seen in code, with `file:line`) or `inferred` (state the basis). Findings from code are statements, not questions for the user.
5. For a shared client or function, list every caller before judging it. A client used by both paid and free features is not one billing decision.

Where the host offers read-only subagents, one per area (identity, billing and checkout, AI clients, jobs and webhooks, tests) can scan in parallel. Where it does not, scan the areas in sequence. Questions to the user, approvals, and edits stay in the main conversation.

## Linked services

A folder can be one service of a larger product. Search for outbound service calls (base-URL and queue environment variables, hardcoded hostnames, HTTP clients, event and job names) and list those whose code is not present, including AI, credit and enrichment hosts called by services that are in the folder, with the apparent role of each. Ask the user where each lives (folder, repository, or unavailable) before concluding where AI calls, credits or billable usage happen. Work from the code that is present and mark conclusions that depend on a missing service `inferred`. When several services of one product are available, treat the common parent folder as the scope and keep paths inside the service being changed.

When the study ends without an account read (no login), the findings are not finished until `nozle-study.yaml` is written and validated; see "Works without a login" in the integrate skill.
