---
description: Asked for an SDK call the kit does not carry, the agent looks it up in the docs and says to confirm it in the installed types.
tags: [docs-first]
runs: 2
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

Our Node backend uses @nozle-js/node 0.43.0. Support sometimes sends a usage event by mistake (wrong customer). Show me the exact code to cancel one of those events in Nozle by its transaction id, which we keep in our `usage_units` table, and what can go wrong. Don't create files, just reply with the code.
