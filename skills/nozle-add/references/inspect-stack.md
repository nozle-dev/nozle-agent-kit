# Study the application's code

Code never leaves the machine. The study never waits for the account login.

## Trace

1. Run `nozle-check env` and `nozle-check scan` on the absolute application path; read the manifests. In a monorepo, confirm the target app and keep every path inside it.
2. Trace in order: authentication and customer identity; team or organization membership; payment, subscription and billing ownership; AI clients and every caller; jobs, queues and streams; webhooks; existing Nozle usage; tests and fakes.
3. Read environment variable names only when needed, never values.
4. Label each finding `confirmed` (`file:line`) or `inferred` (with its basis). Code facts are findings, not questions.
5. For a shared client, list every caller before judging it; paid and free callers are separate decisions.
6. Where the host offers subagents, run read-only `nozle-scanner` agents per area (identity, billing and checkout, AI clients, jobs and webhooks, tests) in parallel. Questions, approvals and edits stay in the main conversation.

## Spending inventory

When the product already spends credits or quotas, list every spending action before the menu, one row each with its own identifier (rule, action key, feature, event name), never merged:

- where the check and the deduction happen, how the amount is computed, who is charged, retry and refund behavior;
- sources: rule and feature tables (read from seeds and migrations), every route guarded by a feature or credit check, consumers that debit for other services, and credit calls the browser makes (propose a server route that owns the amount instead of dropping them);
- management: how credits are granted, bought, split, expired, refunded, limited and logged; who holds a balance (company pool, per user, per team); how an owner delegates or takes back credits and who may; which balance each path draws from; whether totals add up;
- volume: every operation that scales (emails, messages, requests, lookups, AI generations, invites, storage), whether it is counted per unit today, where (per recipient, message, request, batch), and whether failed or retried units count.

An untraceable action is `unknown`. Untracked costly operations are suggestions, not faults. Members with their own balances or plans get a proposed entity mapping (capability 4). The inventory feeds the measure decisions (decision-questions.md).

## Linked services

Find calls to services not in the folder (base-URL and queue variables, hostnames, HTTP and RPC clients, shared tables, event names). List each with its apparent role (AI calls, credit deduction, sending) in a **Linked services** line, or say none were found. Ask where each lives (folder, repository, unavailable) before concluding where billable usage or credits happen; mark dependent conclusions `inferred`. Several services of one product: the common parent is the scope, and edits stay inside the service being changed.

## Study file

Without an account read, the study is not finished until `nozle-study.yaml` is written at the repository root (allowed by the guards even under "no edits"; no secrets) and validated with `nozle-check nozle-study.yaml`:

`schema: nozle.study`, `version: 1`, `account_read: { status: not_read | read, read_at }`, `stack`, `existing` (from `nozle-check scan`), `activities` (`id`, `label`, `location` as `path:line`, `status`, optional `proposed_meter`), `linked_services`, `findings` (`id`, `text`, `location`), `source_files` (`path` and SHA-256 from `nozle-check hash`) for every file the findings rely on.

After the login, `nozle-check study` lists changed files; reuse every finding from unchanged files, re-read only the changed ones, set `account_read` to `read` with `read_at`, and set each activity to `matched`, `suggested` or `partial`.
