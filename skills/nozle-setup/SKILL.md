---
name: nozle-setup
description: Use when a developer needs to connect their coding agent to their Nozle account, or to finish Nozle dashboard setup (onboarding, plans, meters, payment connection, webhooks) before or alongside an integration, or to check that the Nozle API keys in the app's `.env` or environment work (without ever seeing them).
---

# Connect to Nozle and plan dashboard setup

Connect the account, read it, and turn gaps into manual dashboard steps. No application code changes. Details: [connect-and-read.md](references/connect-and-read.md), [record-format.md](references/record-format.md), [capability-menu.md](references/capability-menu.md). Run each `nozle-check` command as one plain command: `nozle-check <args>` where the plugin's bin is on PATH, otherwise `node <skill folder>/scripts/nozle-check.mjs <args>` with the skill's absolute base directory. Never chain it with `cd`, `&&`, `||` or a subshell; hosts that run without an approver refuse chained commands.

Whenever you need the user to choose or approve something, use the host's question tool as described in [asking.md](references/asking.md) (a typed numbered list only when there is no such tool).

## Steps

1. **Connect** as in connect-and-read.md: OAuth in the browser, configuration read only, never a pasted key. Help with the host's login step. Explain a blocker plainly: unreachable account MCP, organization not onboarded, permission denied.
2. **Confirm the organization** and its onboarding state. If it is not onboarded, point to the dashboard account and pricing setup and stop until the user returns.
3. **Read and summarize** the configuration by family with status and revision: features and meters, plans and pricing, entitlements, credits and pool policies, Cost Sheets and margin policies, payment connection, webhooks, availability. Mark gaps `missing`, `incomplete`, `unavailable`, or `unsupported`; never fill them from docs.
4. **List manual setup.** Each gap becomes an item in `nozle-setup-plan.yaml` (`schema: nozle.setup-plan`, `version: 1`, `items` with an ID, `status: manual_pending`, and clear `instructions` for the dashboard). The plugin never creates plans, meters, Cost Sheets, subscriptions, balances, payments, or webhooks. Validate with `nozle-check <absolute path>/nozle-setup-plan.yaml` and keep the file free of credentials.
   Include the API key step as a manual item: the user creates the key under Settings > API Keys and puts it in their own `.env`. The plugin never creates, asks for, or reads a key; any variable the app needs is added to `.env.example` with an empty value. When the user says the keys are in place, run `nozle-check key <app directory>` (one plain command; it never prints a key) and mark the key item done only when every key it finds works.
5. **Next.** Offer `nozle-integrate` for the application work, or `nozle-audit` to see what applies first.
