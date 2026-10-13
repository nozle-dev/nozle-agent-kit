# Changelog

Each release raises the version in every manifest (`bun scripts/release.ts <version>`). Claude Code and Codex cache an installed plugin by version, so a change shipped without a new version doesn't reach anyone who already installed it.

## [1.0.1] - 2026-10-13

### Fixed
- The Stop guard asked for a hand-off summary on a record that was still mid-build, so the choices and the scope came back framed as a finished build. It now asks for the hand-off only once the record has a self-review or every task is complete. Mid-build, the findings are listed with the step's normal reply.

## [1.0.0] - 2026-10-13

First release.

### Added
- **Nine skills:** `nozle-integrate`, `nozle-add`, `nozle-status`, `nozle-resume`, `nozle-verify`, `nozle-undo`, `nozle-audit`, `nozle-doctor`, `nozle-setup`.
- **Three read-only helper agents:** scanner, mapper and verifier.
- **Guard hooks for Claude Code, Codex and other hosts:**
  - scope approval before edits;
  - "do not track" paths;
  - a user answer required for every studied activity;
  - real `.env` files and production API calls refused;
  - record and build checks at Stop;
  - settled decisions restated after compaction.
- **`nozle-check`:** stack detection, existing-Nozle scan, study, plan, progress and record validation.
- **MCP servers:** the account server (`https://api.nozle.app/core/mcp`, OAuth, read-only) and the docs server.
