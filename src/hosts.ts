/** Per-host guard and docs-MCP configuration, generated against the installed `nozle-hook` path. */
export const hostNames = ["codex", "cursor", "windsurf", "gemini", "copilot", "opencode"] as const;
export type HostName = (typeof hostNames)[number];

export interface HostFile {
  path: string;
  content: string;
}

const docsUrl = "https://docs.nozle.dev/mcp";
// Self-hosted Core: set NOZLE_ACCOUNT_MCP_URL before running `hosts --write`.
const accountUrl = process.env.NOZLE_ACCOUNT_MCP_URL || "https://api.nozle.app/core/mcp";
const pretty = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** Hosts whose MCP or guard setup lives outside the project, so nothing here can write it. */
export const hostNotes: Record<string, string> = {
  windsurf: "Docs MCP: add {\"mcpServers\":{\"nozle-docs\":{\"serverUrl\":\"" + docsUrl + "\"}}} to ~/.config/devin/mcp_config.json (user level). Windsurf has no session-start or stop hook, so those guards do not apply.",
  copilot: "One file serves VS Code and Copilot CLI. Docs MCP for the CLI: add the same server to .mcp.json as {\"mcpServers\":{\"nozle-docs\":{\"type\":\"http\",\"url\":\"" + docsUrl + "\"}}}.",
  opencode: "A plugin can only block by throwing, so OpenCode has no stop or session-start guard.",
  cline: "Cline: skills install to .cline/skills or .agents/skills. Add the docs MCP in Cline's MCP Servers panel (type streamableHttp, url " + docsUrl + "). Guard hooks are not generated: Cline's hook interface is unconfirmed.",
};

export function hostFiles(host: HostName, hookPath: string): HostFile[] {
  const command = (name: string): string => `"${hookPath}" --host ${name}`;
  const entry = (name: string, extra: object = {}) => ({ type: "command", command: command(name), timeout: 10, ...extra });

  switch (host) {
    case "codex":
      return [{
        path: ".codex/hooks.json",
        content: pretty({ hooks: Object.fromEntries(["SessionStart", "PreToolUse", "PostToolUse", "Stop"].map((event) => [event, [{ hooks: [entry("codex")] }]])) }),
      }];
    case "cursor":
      return [
        {
          path: ".cursor/hooks.json",
          content: pretty({
            version: 1,
            hooks: {
              sessionStart: [{ command: command("cursor") }],
              beforeShellExecution: [{ command: command("cursor"), failClosed: true }],
              preToolUse: [{ command: command("cursor"), matcher: "Write|Edit|StrReplace|Delete|MCP:.*", failClosed: true }],
              afterFileEdit: [{ command: command("cursor") }],
              stop: [{ command: command("cursor") }],
            },
          }),
        },
        { path: ".cursor/mcp.json", content: pretty({ mcpServers: { "nozle-docs": { url: docsUrl } } }) },
      ];
    case "windsurf":
      return [{
        path: ".devin/hooks.json",
        content: pretty({
          hooks: Object.fromEntries(["pre_write_code", "post_write_code", "pre_run_command", "pre_mcp_tool_use"].map((event) => [event, [{ command: command("windsurf"), show_output: true }]])),
        }),
      }];
    case "gemini":
      return [{
        path: ".gemini/settings.json",
        content: pretty({
          mcpServers: { "nozle-docs": { httpUrl: docsUrl } },
          hooks: {
            SessionStart: [{ matcher: "*", hooks: [entry("gemini", { name: "nozle-guard" })] }],
            BeforeTool: [{ matcher: "write_file|replace|run_shell_command|mcp_nozle-account_.*", hooks: [entry("gemini", { name: "nozle-guard", timeout: 10000 })] }],
            AfterTool: [{ matcher: "write_file|replace", hooks: [entry("gemini", { name: "nozle-guard", timeout: 10000 })] }],
            AfterAgent: [{ matcher: "*", hooks: [entry("gemini", { name: "nozle-guard", timeout: 10000 })] }],
          },
        }),
      }];
    case "copilot":
      return [
        {
          path: ".github/hooks/nozle.json",
          content: pretty({ hooks: Object.fromEntries(["SessionStart", "PreToolUse", "PostToolUse", "Stop"].map((event) => [event, [entry("copilot")]])) }),
        },
        { path: ".vscode/mcp.json", content: pretty({ servers: { "nozle-docs": { type: "http", url: docsUrl } } }) },
      ];
    case "opencode":
      return [
        { path: "opencode.json", content: pretty({ $schema: "https://opencode.ai/config.json", mcp: {
          "nozle-docs": { type: "remote", url: docsUrl, enabled: true },
          // OAuth: log in once with `opencode mcp auth nozle-account`.
          "nozle-account": { type: "remote", url: accountUrl, enabled: true },
        } }) },
        { path: ".opencode/plugins/nozle-guard.js", content: opencodePlugin(hookPath) },
      ];
  }
}

function opencodePlugin(hookPath: string): string {
  return `// Nozle guard for OpenCode: runs the same checks as the other hosts and blocks by throwing.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const hook = ${JSON.stringify(hookPath)};

function guard(phase, cwd, tool, args) {
  if (!existsSync(hook)) return;
  const run = spawnSync("sh", [hook, "--host", "opencode"], { input: JSON.stringify({ phase, cwd, tool, args }), encoding: "utf8" });
  // The hook is silent outside an integration; any failure while one exists blocks, like the other hosts.
  if (run.status !== 0) throw new Error(run.stderr.trim() || "Nozle guard: could not run");
}

export const NozleGuard = async ({ directory }) => ({
  "tool.execute.before": async (input, output) => guard("before", directory, input.tool, output.args),
  "tool.execute.after": async (input) => guard("after", directory, input.tool, input.args),
});
`;
}
