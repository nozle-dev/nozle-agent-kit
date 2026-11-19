---
name: nozle-setup
description: Use when a developer needs to connect their coding agent to their Nozle account, finish Nozle dashboard setup (onboarding, plans, meters, payment connection, webhooks) before or alongside an integration, check that the Nozle API keys in the app's `.env` or environment work without exposing them, or send a first test usage event to see it in the dashboard.
---

# Connect to Nozle and plan dashboard setup

Connect, read the account, and turn gaps into dashboard steps the user does. No application code changes, and the plugin never creates plans, meters, Cost Sheets, subscriptions, balances, payments or webhooks. Run each `nozle-check <args>` (or `node <skill folder>/scripts/nozle-check.mjs <args>`) as one plain command, never chained with `cd`, `&&`, `||` or pipes. Ask with the host's question tool ([asking.md](references/asking.md)).

1. **Connect** ([connect-and-read.md](references/connect-and-read.md)): OAuth in the browser, never a pasted key. Give this host's login step and explain any blocker plainly.
2. **Confirm the organization** and onboarding. Not onboarded: point to the dashboard setup and stop until the user returns.
3. **Summarize** each configuration family with status and revision. Gaps are `missing`, `incomplete`, `unavailable` or `unsupported`, never filled from docs.
4. **Write `nozle-setup-plan.yaml`** with one `manual_pending` item per gap and clear dashboard instructions, plus the API key item: the user creates the key under Settings > API Keys and puts it in their own `.env`; variable names go in `.env.example` empty ([record-format.md](references/record-format.md)). Validate it. When the user says the keys are in place, run `nozle-check key <app directory>` (it never prints a key) and mark the item done only when every key works.
5. **First test event: the user runs it, never you.** It sends one real, billable usage event, so give the user these commands for their own shell, with their secret key in their own environment (the guard denies any command naming the script):
   - Dry run, which sends nothing and prints the request and a fixed timestamp: `node <this skill's absolute folder>/scripts/nozle-first-event.mjs --customer <external customer id> --event <meter code> --subscription <external subscription id>`
   - Then the command the dry run prints, which adds `--timestamp <seconds> --yes`. Rerunning it sends the identical event, so it counts once.
6. **Next:** offer `nozle-integrate` for the application work, or `nozle-audit` to see what applies first.
