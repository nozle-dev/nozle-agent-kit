---
name: nozle-audit
description: Use when a developer wants to know what Nozle could do for their application, or to review billing opportunities and gaps in a codebase, without changing any code.
---

# Audit an application for Nozle opportunities

Findings only: no application edits, no files in the repository, no Nozle tool that changes the account. Look up every API fact in the docs MCP ([docs-lookup.md](references/docs-lookup.md)). Run each `nozle-check <args>` (or `node <skill folder>/scripts/nozle-check.mjs <args>`) as one plain command, never chained with `cd`, `&&`, `||` or pipes. Ask with the host's question tool ([asking.md](references/asking.md)), and only for business decisions the code and account cannot answer; never guess a charge, exclusion or payer.

## Steps

1. **Stack.** Run `nozle-check scan` and `nozle-check env` on the absolute app path and open with the stack statement ([stack-support.md](references/stack-support.md)). With no server code, say what that rules out and ask whether to continue.
2. **Account** ([connect-and-read.md](references/connect-and-read.md)). If unavailable, continue as a docs-and-code audit with account facts `unavailable`. On `onboarding_incomplete`, stop until onboarding is done.
3. **Code** ([inspect-stack.md](references/inspect-stack.md)): each finding `confirmed` with `file:line` or `inferred` with its basis.
4. **Assess the ten choices** ([capability-menu.md](references/capability-menu.md)) against code and account evidence. Report only those that apply; zero is valid.
5. **Report** one entry per opportunity or gap: what it is, evidence (code and account family), status (`supported`, `app-owned logic needed`, `manual configuration needed`, `unsupported/unverified`), what it depends on, rough effort. Flag money risks from [financial-rules.md](references/financial-rules.md): shared clients serving paid and free features, retries that duplicate usage, check-then-debit treated as atomic, activation from a redirect, per-attempt random keys, unbilled stream aborts, paid subscriptions without payment, refusals matched by text.
6. **Hand off.** Name the options the user could choose next; `nozle-integrate` plans and builds them after scope approval.
