# Connect and read the account

Shared by setup, integrate, audit, and doctor.

## Connect

The Nozle account MCP uses OAuth in the browser. Never ask for a pasted Nozle key. Ask for configuration read; request billing read only when targeted customer or usage evidence is needed. The connection is read-only.

Login trigger by host (vendor documentation; confirm against the installed host version):

| Host | Login |
|---|---|
| Claude Code | `/mcp`, select `nozle-account` (listed under the plugin), then Authenticate |
| Codex CLI | `codex mcp login nozle-account` |
| OpenCode | `opencode mcp auth <server>` |
| Gemini CLI | `/mcp auth <server>` |
| Cursor, VS Code, Cline, Windsurf | the host's MCP settings screen |

Account access needs an organization the server has verified as onboarded.

A login lasts per agent: the access token renews on its own, and the login ends after 7 days without use or when the user removes the connection in the dashboard. Claude Code and Codex each log in once.

Whenever the account tools are missing, the response names the exact login step for this host from the table above (not just "log in"). If this repository shows the account was read before (`nozle.integration.yaml` has an `organization_id`, or `nozle-study.yaml` has `account_read.status: read`), say the earlier login has ended (unused for 7 days, or removed in the dashboard), that the records and study are kept, and that the work continues from them after the login.

| Situation | Do |
|---|---|
| Account MCP not registered, not logged in, or unreachable | Do the code study anyway and show the findings, saved in `nozle-study.yaml`; then say so, give the login command for this host, and offer: log in now, docs-and-code only, or stop. After the login, reuse the study (`nozle-check study`) and read the account. Never present documentation as this account's configuration. |
| Organization not onboarded (the login ends with `onboarding_incomplete`) | The user chose Cancel on the consent page, which shows what is missing (a meter, a plan, onboarding). Say the account is not onboarded and stop: no menu, plan or edits. When the user says onboarding is done, start the login again. |
| The login timed out while the user was onboarding | Agents wait only about 5 minutes for the approval (Claude Code's limit is fixed), and onboarding usually takes longer. Say so, and start the login again once the user has finished onboarding: it is a one-click approval because they are already signed in. |
| Several organizations | Ask which one; record its ID. |
| Permission denied for a family | Record the family as `unavailable` with the reason; continue with the rest. |

## Read

Call the account tools in this order and check status and completeness for every family:

1. `get_account_context`: organization, onboarding eligibility, granted scopes, available families.
2. `get_integration_configuration`: overview and requested families, with `status` and `revision`.
3. `list_integration_resources` and `get_integration_resource`: only for the resources the selected goals need.
4. `get_capability_catalog`: the ten capabilities evaluated for this organization.

A family is `complete`, `missing`, `incomplete`, `unavailable`, or `unsupported`. Never fill a gap from memory or docs. If several offerings could apply, ask which one. Summarize the real plans, meters, entitlements, credits, Cost Sheets (API name: cost models), margin policies, payment connection, and webhook metadata before recommending anything. Plan entitlements are listed under each plan in the `plans` family; an empty `entitlements` family does not mean the plans include no features, so read the plans before saying so.

Plugin tools are read-only. Never call a Nozle tool that creates, updates, or deletes anything, and never send billable or production test events.
