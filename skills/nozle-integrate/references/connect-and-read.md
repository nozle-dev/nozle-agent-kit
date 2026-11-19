# Connect and read the account

The account MCP (`nozle-account`) is OAuth in the browser, read-only, configuration scope only. Never ask for a pasted key. Account access needs an organization the server has verified as onboarded.

## Login by host

| Host | Login |
|---|---|
| Claude Code | `/mcp`, select `nozle-account` (under the plugin), Authenticate |
| Codex CLI | `codex mcp login nozle-account` |
| OpenCode | `opencode mcp auth <server>` |
| Gemini CLI | `/mcp auth <server>` |
| Cursor, VS Code, Cline, Windsurf | the host's MCP settings screen |

When the account tools are missing, name this host's exact login step. When you start the login, say in one line: an organization that is not onboarded is offered onboarding, but the agent waits only about 5 minutes, so finish a longer onboarding first and log in again (one click). A login ends after 7 days unused or when removed in the dashboard; if the repository shows an earlier read (`organization_id` in the record, or `account_read.status: read` in the study), say the login ended and that the records are kept.

| Situation | Do |
|---|---|
| Tools not registered, not logged in, unreachable | Do the code study anyway, save `nozle-study.yaml`, show the findings, then give the login step and offer: log in now, docs-and-code only, or stop. Never present docs as this account. |
| Login ends with `onboarding_incomplete` (the user cancelled on the consent page, which lists what is missing) | Say the organization is not onboarded and stop: no menu, plan or edits. Start the login again when the user says onboarding is done. |
| Account MCP address answers not found | This deployment has no account connection: continue with the code study and a docs-based plan; the user configures the account in the dashboard. |
| Several organizations | Ask which; record its id. |
| A family is permission denied | Record it `unavailable` with the reason; continue. |

## Read

1. `get_account_context`: organization, onboarding, scopes, families.
2. `get_integration_configuration`: families with `status` and `revision`.
3. `list_integration_resources`, `get_integration_resource`: only what the selected goals need.
4. `get_capability_catalog`: the ten capabilities for this organization.

A family is `complete`, `missing`, `incomplete`, `unavailable` or `unsupported`; never fill a gap from memory or docs. Summarize the real plans, meters, entitlements, credits, Cost Sheets (API name: cost models), margin policies, payment connection and webhooks before recommending. Entitlements are listed under each plan in `plans`; an empty `entitlements` family does not mean plans include no features. When several offerings could apply, ask which.

Never call a Nozle tool that creates, updates or deletes anything, and never send billable or test events. Missing items become dashboard steps the user does.
