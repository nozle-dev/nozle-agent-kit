---
name: nozle-integrate
description: Use when a developer wants to add or extend Nozle billing in their application (checkout, subscriptions, credits, usage metering, entitlements and limits, cost tracking, customer billing screens, webhook sync, or moving existing billing to Nozle), or to plan such an integration without editing yet.
---

# Integrate Nozle into an application

This skill holds the workflow and its gates. Nozle's API facts (endpoints, fields, SDK methods, versions, defaults, error codes) are not in it: look each one up in the docs MCP (`search_nozle`, `query_docs_filesystem_nozle`) and confirm SDK names in the installed SDK's type definitions before naming them, as [docs-lookup.md](references/docs-lookup.md) says. If neither source is reachable, mark the contract `unverified` and defer the edits that depend on it.

Read a reference with the file-read tool when a step points to it. If the host refuses, work from this file, say which reference was unavailable, and never ask the user to paste it. Run every command on its own: `nozle-check <args>`, or `node <skill folder>/scripts/nozle-check.mjs <args>` with this skill's absolute folder; never chain with `cd`, `&&`, `||`, `;` or pipes, which hosts without an approver refuse.

Other intents belong to sibling skills: `nozle-audit` (opportunities, no edits), `nozle-doctor` (check existing code), `nozle-resume` (continue from a record), `nozle-setup` (account and dashboard).

## Gates that hold throughout

- **Ask with the host's question tool, then end the turn** ([asking.md](references/asking.md)). An empty answer decides nothing. A request to hurry never removes a question or authorizes a billing assumption.
- **The user decides** goals, every activity's measure decision, the payer, exclusions, charge order and anything that changes what someone pays. You suggest; you never pick.
- **No application edit before the approved scope is saved** in `nozle.integration.yaml`. The guards enforce the scope and the exclusions.
- **Never** create, request, read or store a Nozle API key; run `nozle-first-event.mjs`; call an account tool that changes anything; send billable or live events; configure the dashboard; or use `@nozle-js/mcp`. Money rules: [financial-rules.md](references/financial-rules.md).
- **Refusals are handled by exact status and code** from the call's docs page, never message text: a `409 period_invoiced` follows the user's late-usage choice and is never replayed with its stored timestamp; a `402 customer_payment_overdue` shows the customer a way to pay.

## Workflow

Copy this checklist and keep it current:

```
- [ ] 1 Stack check and existing work
- [ ] 2 Connect
- [ ] 3 Read the account
- [ ] 4 Study the code
- [ ] 5 First response: findings and choices
- [ ] 6 Goals and draft record
- [ ] 7 Coverage map
- [ ] 8 Decisions
- [ ] 9 Scope approval
- [ ] 10 Build by phase
- [ ] 11 Verify and hand off
```

1. **Stack check and existing work.** Run `nozle-check env <absolute app path>` and `nozle-check scan <absolute app path>`, read the manifests, and form the stack statement ([stack-support.md](references/stack-support.md)). With no server code at all, ask before any plan or record: point to the backend repository (Recommended), add a server route or SSR adapter here, frontend only for now (publishable-key work only, backend routes recorded as `consumes` with `status: unmatched`, `peers: [{ role: backend, location: unavailable, record_seen: false }]`, no `stack`), or stop. Read `nozle-study.yaml`, `nozle.integration.yaml` and `nozle-setup-plan.yaml` if present. Existing Nozle code is the baseline: never rebuild it or add a second path for the same job. With a record, its goals, scope, decisions and `stack` bind you; recheck drift as `nozle-resume` does and show only new steps as a delta.
2. **Connect** ([connect-and-read.md](references/connect-and-read.md)). Start the host's login when the account tools are missing. The code study never waits for it.
3. **Read the account** ([connect-and-read.md](references/connect-and-read.md)). For an existing payment provider ask the provider question ([decision-questions.md](references/decision-questions.md)). For existing tiers, allowances, seats or member credits, map them ([plan-design.md](references/plan-design.md)). Empty families become `needs_account_setup` with a suggestion each.
4. **Study the code** ([inspect-stack.md](references/inspect-stack.md)): identity, billing ownership, AI clients, jobs, webhooks, tests, the spending inventory and linked services. Without an account read, write and validate `nozle-study.yaml` before you answer, end with `Saved: nozle-study.yaml`, show **Findings from the code (account not read yet)**, then ask: log in now, continue docs-only, or stop. After a login, reuse the study (`nozle-check study`) and continue here.
5. **First response.** Give the stack statement, which part of the product this repository is ([peers.md](references/peers.md)), a **Linked services** line, an **LLM capture** line per LLM client, two to four lines on what the product does, an **Already in place** table (each choice: in place with `file:line`, partly, or not found), the spending inventory, findings (security, races, wrong statuses) with optional fixes, and the choices table ([capability-menu.md](references/capability-menu.md)). The choices, with fixed numbers, are: 1 Show pricing and plans; 2 Add checkout and payments; 3 Manage subscriptions; 4 Add credits and top-ups; 5 Track usage for billing; 6 Control feature access and limits; 7 Track costs and margins; 8 Build a customer billing dashboard; 9 Keep billing and application data in sync; 10 Move my existing billing to Nozle. A single named capability still gets its whole chain of prerequisites, marked present, missing or unknown. End with the next decision.
6. **Goals and draft record.** Ask for goals with the question tool. After the user answers, write the draft `nozle.integration.yaml` (`schema`, `version`, `organization_id`, `selected_goals`, a `goals` decision with the user's answer, `stack`, `peers`) ([record-format.md](references/record-format.md)). On a host other than Claude Code without guard config, offer `nozle-check hosts <host> --write` and run it only after a yes; it takes effect next session.
7. **Coverage map.** For each selected choice read its guide in `references/capabilities/`; for each operation show location, current owner, Nozle resource, treatment (billable usage, cost-only, feature access, UI, sync, exclusion) and how it is verified, with the SDK method or REST endpoint and the docs page it comes from. One primitive per purpose (financial-rules.md, "Principles"). A large repository may use one read-only `nozle-mapper` per choice.
8. **Decisions** ([decision-questions.md](references/decision-questions.md)). Every activity gets the user's answer (track billable, cost only, do not track, decide later), grouped by area, up to four questions per call; save each to `decisions`, and put "do not track" files in `approved_scope.excluded_paths`. An open decision blocks only what depends on it.
9. **Scope approval** ([scope-and-build.md](references/scope-and-build.md)). Show the full scope in phases, with the charge table, existing gates and balances, packages, dashboard steps and the commands that prove each phase, then ask to approve the whole scope or selected phases.
10. **Build by phase** ([scope-and-build.md](references/scope-and-build.md)). Save the scope, re-read the account, install the listed packages, then one phase and one step at a time: write, run its approved checks, record evidence, refresh hashes. Stop and ask when a check fails or cannot run.
11. **Verify and hand off** ([scope-and-build.md](references/scope-and-build.md)). Write `self_review` against every check in financial-rules.md, validate both records, and report **Implemented**, **Verified**, **Pending** and **Not done**. End with the user's own dashboard steps and the first-event commands for them to run.

When the work cannot or should not be built (no server identity, a dependency only the user can supply, a declined decision), write the record with `blocked: { reason: ... }` and `decisions`, say why, and stop.
