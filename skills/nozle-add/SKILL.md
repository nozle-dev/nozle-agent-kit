---
name: nozle-add
description: Use when the user names one Nozle capability to add (checkout, subscriptions, credits, usage tracking, feature limits, costs and margins, billing screens, data sync) and wants it started directly, with or without an existing integration.
---

# Add one Nozle capability

A direct request skips the menu, not the chain. Menu of ten capabilities: [capability-menu.md](references/capability-menu.md). What each depends on: [prerequisites.md](references/prerequisites.md). How to ask: [decision-questions.md](references/decision-questions.md).

Whenever you need the user to choose or approve something, use the host's question tool as described in [asking.md](references/asking.md) (a typed numbered list only when there is no such tool).

1. Match what the user named to the capability (or capabilities) in the menu by meaning, and state which choice you took. If two fit, ask once.
2. Invoke the `nozle-integrate` skill with that choice already selected and follow it from step 1 (stack check, connect, account read, code study). Do not show the menu again.
3. When `nozle.integration.yaml` exists, treat this as the later-addition delta described there: baseline from the record, only the new steps shown, approval before editing, approved items untouched.
4. Say up front what the capability stands on (the base plus its own chain), which rows are present or missing, and that missing account items are dashboard steps for the user. Ask only what the code and account leave open, with the question tool, one area at a time.
