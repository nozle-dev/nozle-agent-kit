---
name: nozle-add
description: Use when the user names one Nozle capability to add (checkout, subscriptions, credits, usage tracking, feature limits, costs and margins, billing screens, data sync, moving existing billing) and wants it started directly, with or without an existing integration.
---

# Add one Nozle capability

A direct request skips the menu, not the chain. Ask with the host's question tool ([asking.md](references/asking.md)). Look up every API fact in the docs MCP and the installed SDK's types ([docs-lookup.md](references/docs-lookup.md)).

1. Match the request to the capability in [capability-menu.md](references/capability-menu.md) by meaning and say which you took. If two fit, ask once.
2. Invoke the `nozle-integrate` skill with that choice selected and follow it from step 1 (stack, connect, account, code). Do not show the menu again.
3. With an existing `nozle.integration.yaml`, this is a delta: the record is the baseline, only new steps are shown and approved, and approved items stay untouched.
4. Say up front what the capability stands on (the base and its own chain from capability-menu.md), which parts are present or missing, and that missing account items are dashboard steps for the user. Ask only what the code and account leave open ([decision-questions.md](references/decision-questions.md)), one area at a time.
