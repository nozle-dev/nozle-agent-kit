# Nozle Agent Kit

Skills, guard hooks and a small checker (`nozle-check`) that let a coding agent integrate Nozle billing into your application the careful way. It checks your stack, reads your real Nozle account, studies your code, asks only what is still open (with a recommendation first), shows a plan, waits for your approval, and then edits only what you approved.

Supported hosts: **Claude Code**, **Codex CLI** and **OpenCode**. Other hosts (Cursor, Windsurf, Gemini CLI, VS Code Copilot) can use the skills and guards, with less support.

## Quick start

1. **Install** (once): see [Install](#install) for your host. For Claude Code:
   ```sh
   claude plugin marketplace add nozle-dev/nozle-agent-kit
   claude plugin install nozle-agent-kit@nozle
   ```
2. **Open your app's repository,** on a clean git branch, and start the agent there.
3. **Say "integrate Nozle".** The agent checks your stack and asks you to log in to Nozle once (browser, then Allow). It studies your code and shows the choices that fit, with a recommendation first.
4. **Answer its questions, read the scope and approve it.** It edits only the files you approved.
5. **Do the dashboard steps it lists:** create your API keys and put them in your `.env`, plus anything your account is missing. Then ask it to run `nozle-verify`.

- **What it does:** inspects your code and your Nozle configuration, asks focused billing questions, implements the approved integration, installs the packages it needs with your package manager (you approve the command), and verifies it with your tests.
- **What it never does:** change your Nozle account, create an API key or see its value, install a package the approved scope does not list, run your app, or send a billable event. The account connection is OAuth and read-only. You create plans, meters and credit systems in the dashboard; the agent tells you which ones, and why.

## The skills at a glance

| You want to | Say or run | What happens |
|---|---|---|
| Integrate Nozle (first time, or the whole thing) | "integrate Nozle", `nozle-integrate` | Stack check, login, account read, code study, choices, questions, scope approval, build, hand-off |
| Add one capability (credits, checkout, limits, ...) | `nozle-add credits` | Same chain, menu skipped, only the open questions asked |
| See where things stand | `nozle-status` | Four groups: Implemented, Verified, Pending, Not done |
| Pick the work back up after a break or a change | `nozle-resume` | Re-reads the account and code, shows drift, continues with the next step |
| Run the tests the integration wrote | `nozle-verify` | You approve each command (tests, lint, type check); it runs without Nozle keys and records pass or fail. It can also write a live check you run against a test organization |
| Look for opportunities and gaps | `nozle-audit` | Read-only: no edits |
| Check an existing integration for mistakes | `nozle-doctor` | Pass, fail or unverified for each known trap, with file and line |
| Connect the account and finish dashboard setup | `nozle-setup` | Connects, reads, and lists the dashboard steps for you |
| Back changes out | `nozle-undo` | Shows the diff, reverts only the files you confirm |

In Claude Code the skills are `/nozle-agent-kit:<name>`. In Codex, name the skill or describe the task.

## Before you start

| You need | Why |
|---|---|
| Claude Code, Codex CLI or OpenCode | The agent that runs the skills. |
| Node.js 18 or newer on `PATH` | `nozle-check` and the guard hooks are Node scripts. |
| Your application in a git repository, on a clean branch | The guards, `nozle-undo` and the hand-off rely on git; `git diff` then shows exactly what the agent did. |
| A Nozle organization at [app.nozle.dev](https://app.nozle.dev), onboarded (at least one meter and one plan) | The agent reads it during the run. An organization that is not onboarded cannot connect an agent. |
| Internet access to GitHub | The install commands fetch the public repository `nozle-dev/nozle-agent-kit`. |

### Your part: keys and dashboard items

- **API keys:** in the dashboard, open **Settings > API Keys**. Create a secret key (`sk_`, server only) and, if you show pricing in the browser, a publishable key (`pk_`). Put them in your own `.env` (for example `NOZLE_SECRET_KEY=sk_...`). The agent writes only the variable names to `.env.example`. It never creates or asks for a key, and the guards refuse edits to real `.env` files. To check that your keys work, the agent runs `nozle-check key`: it reads them itself, asks Nozle's plan catalog (nothing billable), and prints only whether each key works, never its value.
- **Dashboard items:** the agent lists what your account is missing for the goals you pick (a meter, a credit system, a Cost Sheet, a webhook endpoint) and saves the list in `nozle-setup-plan.yaml`. You create them; the agent re-reads the account and continues.

## Install

### Claude Code

```sh
claude plugin marketplace add nozle-dev/nozle-agent-kit
claude plugin install nozle-agent-kit@nozle
```

This installs the nine skills, three helper agents, the guard hooks, and two MCP servers: `nozle-docs` (public docs) and `nozle-account` (your account, `https://api.nozle.app/core/mcp`). `claude plugin details nozle-agent-kit@nozle` lists them. Update later with `claude plugin marketplace update nozle` and `claude plugin update nozle-agent-kit@nozle` (see "Updating an installed plugin").

### Codex CLI

```sh
codex plugin marketplace add nozle-dev/nozle-agent-kit
codex plugin add nozle-agent-kit@nozle
```

This installs the skills and registers both MCP servers (`codex mcp list` shows `nozle-account` and `nozle-docs`). Codex does not run plugin hooks, so add the guards to each application repository once:

```sh
cd my-app
node "$(ls -d "${CODEX_HOME:-$HOME/.codex}"/plugins/cache/nozle/nozle-agent-kit/*/ | sort -V | tail -1)skills/nozle-integrate/scripts/nozle-check.mjs" hosts codex --write
```

The command picks the newest installed version of the kit and writes `.codex/hooks.json` pointing at its guard. Codex runs a project's hooks only when the folder is trusted: accept the trust prompt the first time you start Codex there, and approve the hooks with `/hooks`. After a plugin update, run the same command again.

Start Codex with the question picker turned on (it is off by default; without it the questions come as a numbered list):

```sh
codex --enable default_mode_request_user_input
```

### OpenCode

Tested on OpenCode 1.18. Run in your application folder:

```sh
npx skills add nozle-dev/nozle-agent-kit --skill '*' --agent opencode --copy -y
node .agents/skills/nozle-integrate/scripts/nozle-check.mjs hosts opencode --write
opencode mcp auth nozle-account
```

- **Skills:** the first command copies them into the repository.
- **Guard and servers:** the second writes `.opencode/plugins/nozle-guard.js` and adds `nozle-docs` and `nozle-account` to `opencode.json`.
- **Login:** the third logs you in to your Nozle account (browser, consent page, Allow).
- **Questions:** asked through OpenCode's `question` tool.
- **Not on OpenCode:** a stop or session-start guard, because a plugin there can only block by throwing. So the end-of-turn record check and the context restored after compaction don't run.
- **After a plugin update:** run the `hosts` command again, because the guard path is absolute.

### Other hosts

Cursor, Windsurf, Gemini CLI and VS Code Copilot: copy the skills into the repository (`npx skills add nozle-dev/nozle-agent-kit --skill '*'`), then run `node <skill folder>/scripts/nozle-check.mjs hosts <cursor|windsurf|gemini|copilot> --write` to add the guard config. Cline gets the skills and the docs MCP only. These hosts are less tested than Claude Code, Codex and OpenCode.

### Self-hosted Nozle

Point the account connection at your own Core: Claude Code reads `NOZLE_ACCOUNT_MCP_URL` from the environment when it starts; in Codex, `codex mcp add nozle-account --url <your Core URL>/mcp` overrides the plugin's server.

## Log in

The first time the agent needs your account it starts the login, or you start it yourself:

- **Claude Code:** type `/mcp`, select `plugin:nozle-agent-kit:nozle-account`, choose Authenticate.
- **Codex:** `codex mcp login nozle-account`.

A browser opens the Nozle sign-in page. Sign in, choose the organization, and click **Allow**. If your browser runs on another machine, the page after Allow (the callback address on the agent's machine) does not load; copy that whole address from the address bar into the agent when it asks.

- **Once per agent.** Claude Code and Codex each keep their own login. When you are already signed in to the dashboard in that browser, the second login is one click.
- **Renews by itself.** The access token lasts an hour and the agent renews it silently, across sessions.
- **Ends after 7 days without use,** or when you disconnect it on the dashboard's **Account** page (Connected coding agents). The agent then says the login ended, gives the login step above, and continues from its saved records after you log in.

## Update or remove

New versions are listed in [CHANGELOG.md](CHANGELOG.md) and on the [releases page](https://github.com/nozle-dev/nozle-agent-kit/releases). Your records (`nozle.integration.yaml` and the others) stay in your repository across updates.

| Host | Update | Remove |
|---|---|---|
| Claude Code | `claude plugin marketplace update nozle`, then `claude plugin update nozle-agent-kit@nozle` (restart Claude Code) | `claude plugin uninstall nozle-agent-kit@nozle` |
| Codex CLI | `codex plugin marketplace upgrade nozle`, then `codex plugin add nozle-agent-kit@nozle`; then run the `hosts codex --write` command again in each app, because the hook path contains the version | `codex plugin remove nozle-agent-kit@nozle`, then delete `.codex/hooks.json` from your apps |
| OpenCode and other hosts | `npx skills update`, then run the `hosts <host> --write` command again in each app | `npx skills remove`, then delete `.opencode/plugins/nozle-guard.js` and the two `nozle-*` entries in `opencode.json` |

To log out of the account connection: `/mcp` and choose Clear authentication in Claude Code, `codex mcp logout nozle-account`, or `opencode mcp logout nozle-account`. You can also revoke an agent from **Account > Connected agents** in the dashboard.

## Where to run the session

Where you start the agent decides what it can see, and the integration is only as good as what it sees.

- **One repository:** start in the repository root.
- **A monorepo:** start in the monorepo root, so every service is visible. The agent finds the target app and keeps its edits inside it.
- **Backend and frontend in separate repositories:** start one session in the **backend** repository and add the frontend:
  - Claude Code: `claude --add-dir ../frontend`
  - Codex: `codex --add-dir ../frontend`

  The backend holds the secret key and owns customers, subscriptions, usage, limits and webhooks, and it publishes the routes the frontend calls. Starting there lets the agent design those routes first and build the frontend against them. If one session is not possible, run the backend session first, then a second session in the frontend repository; it reads the backend's record and reuses its decisions.
- **Other services of the same product** (a worker, an AI service, an email sender): add their folders too (`--add-dir`). If they are missing, the agent says it has no access to that code and asks what you want to do: give it the folder, meter the work where your code calls that service, decide later, or not track it.
- **A frontend with no backend anywhere:** the agent asks first: point it at the backend (recommended, because checkout, usage, limits and credits need the secret key on a server), add a server route, build the frontend only for now (a pricing page from the public plan catalog, and screens waiting for backend routes), or stop.

Start on a clean git branch, so `git diff` shows the agent's work and `nozle-undo` can back it out.

## Examples

### 1. First integration, end to end

```sh
git switch -c nozle-billing
claude                     # or: codex --enable default_mode_request_user_input
```

You: *"I want to add Nozle billing to this product."*

1. **Stack.** The agent runs `nozle-check env` and says what Nozle supports on your stack. *"Backend: Node, so the `@nozle-js/node` SDK. Frontend: React, so `@nozle-js/react` components are available."*
2. **Login,** if this agent has not logged in yet (see "Log in").
3. **Account and code.** It reads your plans, meters, entitlements, credit systems and providers, then your authentication, payer, AI calls and every action that spends, sends or generates something.
4. **Already in place.** If Nozle code or a record already exists, it shows what is integrated, where, and what is left, and works on the gaps only.
5. **Choices,** as a table:

   | # | Choice | Account | Advice | Changes |
   |---|---|---|---|---|
   | 5 | Track usage for billing | Ready (meter `api_calls`) | Recommended: the generate route is where each request is counted | Backend |
   | 6 | Control feature access and limits | Ready | Recommended with 5 | Backend |
   | 4 | Add credits and top-ups | Needs a credit system (dashboard) | Optional | Backend and frontend |
   | 1 | Show pricing and plans | Ready | Optional | Frontend |

   **Account** says whether your account already has what the choice needs. **Advice** is the agent's recommendation from your code. **Changes** says where the code is edited. You tick the goals in the picker.
6. **Questions.** For every activity it found, you choose: track as billable usage, track cost only, do not track, or decide later. Activities are grouped by area, the recommendation comes first, and the agent never decides one for you. Then the payer, when to charge, and your payment provider (kept by default).
7. **Scope.** It shows the files it will change, what is excluded, the financial rules, the effect on current users, the tests, and your dashboard steps. You approve the whole scope, selected phases, or change it. Nothing in your application is edited before this.
8. **Build.** It works step by step, re-reads the account before the first edit, and reviews its own diff against the known billing mistakes.
9. **Hand-off,** in four groups: Implemented, Verified, Pending (your dashboard steps and the key in `.env`), Not done.

### 2. Add credits later

```text
/nozle-agent-kit:nozle-add credits        # Codex: "use nozle-add to add credits"
```

The agent says what credits depend on: a credit system with a rate per feature (dashboard), a grant rule or a top-up package, consumable meters, one active subscription per customer, and the spend paths on `usage.track`. Each is marked present, missing or unknown, with evidence. Work already approved is not touched; only the new steps are shown for approval.

### 3. Resume after a break

```text
/nozle-agent-kit:nozle-resume
```

The agent validates the record, re-reads the account and re-hashes every file in scope. With nothing changed, it shows the checklist and continues:

```text
nozle-check progress
2/4 completed
[x] client: Nozle client for customers, can and usage
[x] wire-generate: Gate and meter POST /generate
[>] register: Sign-up creates the Nozle customer
[ ] tests: Tests for the client and the route
next: register
```

If a file or the account changed, it says what changed and asks you to approve the affected steps again.

### 4. Verify before you merge

```text
/nozle-agent-kit:nozle-verify
```

The agent shows each test command it wants to run and asks for approval. It runs them with the Nozle keys removed from the environment, records `passed` or `failed` with the exit code, fixes failures inside the approved scope, and reports the rest. Then run `nozle-doctor` for the billing-specific checks.

## Answering the questions

The agent asks through the host's question tool, so you pick from a list.

| Key (Claude Code) | Does |
|---|---|
| Up / Down | move between options |
| Enter | tick or untick in a multi-select list; pick in a single-choice list |
| Left / Right (or Tab) | move between the questions of one call, then to Submit |
| "Type something" | answer in your own words |
| "Chat about this" | stop the form and discuss first |
| Esc | cancel the question |

The first option is the agent's recommendation and ends in "(Recommended)". A question holds at most four options, so a longer list comes as up to four questions grouped by theme, each option starting with its choice number. In Codex, the picker needs `--enable default_mode_request_user_input`; without it, and in non-interactive runs, the same questions come as a numbered list you answer in your next message ("5 and 6, charge after, do not track the chatbot").

**What happens to an answer:** it is saved in `nozle.integration.yaml` under `decisions`. A "do not track" answer adds that activity's files to `approved_scope.excluded_paths`, and the guard refuses any change there. A free-text answer is restated before the agent acts on it. Work that depends on an unanswered question waits; independent work continues.

## Working without a login

You can start before logging in. The agent checks the stack, studies the code and saves its findings in `nozle-study.yaml`. It then says the account is not connected, gives the login step, and offers: log in now, continue with docs and code only (account facts marked unknown), or stop. After you log in it reuses the study, reads the account, and carries on. Nothing is edited before a scope is approved.

## Backend and frontend records

Each repository keeps its own `nozle.integration.yaml` with only its own goals and stack, and names the other repository under `peers`.

- **The backend** publishes the routes the frontend needs under `interfaces` (`provides`).
- **The frontend** builds only against those routes (`consumes`). When the backend's record is readable, the agent reuses its payer, decisions and routes. When it is not, each needed route is `unmatched`, the dependent tasks are `blocked`, and the agent tells you which backend work is missing. It never invents a backend endpoint in the frontend repository.

## What the guards do

The guards are on while `nozle.integration.yaml` or `nozle-setup-plan.yaml` exists above the working directory, and off otherwise. They are a backstop: the account connection is read-only on the server regardless.

| The agent tries to | Result |
|---|---|
| Edit application code before you approved a scope | Refused |
| Edit before you answered what to measure for every activity it found | Refused, with the activities still open |
| Edit a file outside the approved list | Refused |
| Edit a file you answered "do not track" for | Refused |
| Write through the shell (`cat >>`, `tee`, `sed -i`) | Judged by the same rules |
| Touch a real `.env` file | Refused; variable names go in `.env.example` |
| Put a secret key in browser code, or import an SDK that contradicts the recorded stack | Blocked after the edit |
| Build a usage key from a random id, or detect a 409 from message text | Advice after the edit |
| Run a command with a Nozle key in it, call the production API, or send a billable event (including `nozle-first-event` and `nozle-live-check`) | Refused |
| Call an account tool that writes | Refused |
| Finish with changed files not recorded, an invalid record, or a failed self-review check | Stop blocked once, with the list |

## Records in your repository

- `nozle.integration.yaml`: goals, stack, approved scope, decisions, peers and interfaces, file hashes, tasks with evidence, self-review.
- `nozle-study.yaml`: the code study (activities, what is already integrated).
- `nozle-setup-plan.yaml`: your dashboard steps and their state.
- `nozle-integration-report.md`: findings, decisions, test results, remaining manual work.

They hold no keys. Commit them with the code, so the next session or a teammate can resume. Validate with `nozle-check nozle.integration.yaml`; field reference: [shared/references/record-format.md](shared/references/record-format.md).

## After the agent finishes

1. If the agent could not install a package (you refused the command, or it had no network), run the install command it gave you.
2. Put your keys in `.env` and fill the variables listed in `.env.example`.
3. Create the dashboard items in `nozle-setup-plan.yaml`, then run `nozle-resume`.
4. Run your tests and build (or `nozle-verify`).
5. Send one real event yourself with `nozle-first-event.mjs` in the skill folder (dry run first, then `--yes`); the agent never sends it.

## When something goes wrong

| Symptom | What it means | What to do |
|---|---|---|
| The login ends with `onboarding_incomplete` | The organization is not onboarded | Finish onboarding in the dashboard (a meter and a plan), then log in again |
| The account tools are missing, or the agent says the login ended | The login was unused for 7 days, removed, or never done in this agent | Claude Code: `/mcp`, `nozle-account`, Authenticate. Codex: `codex mcp login nozle-account`. Then say "continue" |
| The page after Allow does not load | Your browser is on another machine | Copy the full address into the agent |
| Codex shows no picker | The feature is off | Start with `codex --enable default_mode_request_user_input` |
| No guard runs in Codex | The project is not trusted, or `.codex/hooks.json` is missing | Run the `hosts codex --write` command, trust the folder, approve with `/hooks` |
| *"invalid YAML at line N"* | A record was hand-edited with an unquoted `:` | The agent repairs it; edits to the record stay allowed |
| An edit is refused as outside the scope | The plan changed | Approve the changed scope, or tell the agent to leave the file |
| A step is `blocked` | A dashboard item it needs is missing | Create it (see `nozle-setup-plan.yaml`), then `nozle-resume` |
| You want the guards off | They are on while a record exists | `nozle-undo`, or delete the record files |

## Development

```sh
bun install
bun test
bun run build:validator      # rebuilds nozle-check and copies the shared references into every skill
claude plugin validate --strict .
```

### Releasing

Claude Code and Codex cache an installed plugin by its version, so every release needs a new version number, or users who already installed it keep the old copy.

1. Add a `## [x.y.z] - YYYY-MM-DD` section at the top of `CHANGELOG.md` describing the changes.
2. `bun run release x.y.z` sets the version in `plugin.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `package.json`. It refuses a version that isn't newer, or one without a changelog entry.
3. `bun run build:validator && bun test && claude plugin validate --strict .`. A test fails if the manifests disagree on the version or the changelog lacks it.
4. Commit, tag `vx.y.z`, and push `main` and that tag (`git push origin main vx.y.z`; never `--tags`).
5. `gh release create vx.y.z --notes "<the changelog section>"`.

Shared sources live in `shared/references/` and `shared/scripts/`; `build:validator` copies them into each skill so every skill installs on its own (a test fails if a copy drifts). `.claude-plugin/` holds the Claude Code manifest and marketplace, `plugin.json`, `mcp.json` and `.agents/plugins/marketplace.json` the portable and Codex ones, and `hooks/hooks.json` the Claude Code hooks.

`nozle-check` commands: `env <dir>` (stack check), `scan [dir]` (existing Nozle usage), `key [dir]` (check that your API keys work, without printing them), `<file>` or `check <file>` (validate a record), `study`, `plan`, `progress`, `resume`, `hash`, `hosts <host> [--write]` (guard config for a host), and `hook <event>` (the guards).
