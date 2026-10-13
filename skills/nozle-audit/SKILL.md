---
name: nozle-audit
description: Use when a developer wants to know what Nozle could do for their application, or to review billing opportunities and gaps in a codebase, without changing any code.
---

# Audit an application for Nozle opportunities

Findings only. Do not edit application code, create files in the repository, or call any Nozle tool that changes the account. Details: [connect-and-read.md](references/connect-and-read.md), [inspect-stack.md](references/inspect-stack.md), [capability-menu.md](references/capability-menu.md), [financial-rules.md](references/financial-rules.md), [runtime-contracts.md](references/runtime-contracts.md). If a reference cannot be read, use this file and say what was unavailable. Run each `nozle-check` command as one plain command: `nozle-check <args>` where the plugin's bin is on PATH, otherwise `node <skill folder>/scripts/nozle-check.mjs <args>` with the skill's absolute base directory. Never chain it with `cd`, `&&`, `||` or a subshell; hosts that run without an approver refuse chained commands.

Whenever you need the user to choose or approve something, use the host's question tool as described in [asking.md](references/asking.md) (a typed numbered list only when there is no such tool).

## Steps

1. (Start with `nozle-check scan <absolute application path>`: it lists where Nozle is already used, with file and line.) **Check the stack first.** Run `nozle-check env <absolute application path>` and open the report with the stack-support statement from stack-support.md (including "There is no Nozle SDK for <framework>" when true). With no server code at all, say what that rules out and ask whether to continue.
2. **Connect and read** the account as described in connect-and-read.md. If the account is unavailable, continue as a documentation-and-code audit and mark every account fact `unavailable`. If the login ends with `onboarding_incomplete`, say the organization is not onboarded and stop until the user finishes onboarding.
3. **Inspect the code** as described in inspect-stack.md. Where the host offers subagents, `nozle-scanner` can scan the areas in parallel. Every finding is `confirmed` with `file:line` or `inferred` with its basis.
4. **Assess the ten choices** against code and account evidence: pricing and plans; checkout and payments; subscriptions; credits and top-ups; usage metering; feature access and limits; cost and margin tracking; customer billing dashboard; billing and application data sync; connecting an existing billing setup. Report only the ones that apply; never imply every option is configured or supported the same way. Zero recommendations is a valid result.
5. **Report** one entry per opportunity or gap: what it is, evidence (code location and account family), status (`supported`, `app-owned logic needed`, `manual configuration needed`, or `unsupported/unverified`), what it depends on, and rough effort. Flag financial risks: shared clients serving paid and free features, retries that could duplicate usage, a check followed by a debit treated as atomic, activation from a browser redirect, usage keys built from a per-attempt random id, streams not billed when the client aborts, a paid subscription created without payment (see "Build traps" in financial-rules.md).
6. **Hand off.** End by naming the options the user could choose next and say that `nozle-integrate` plans and implements them after explicit scope approval.

Ask a question only when a finding needs a business decision that code and account cannot answer. Never guess a charge, exclusion, or payer.
