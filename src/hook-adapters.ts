import type { HookInput, HookResult } from "./hook.ts";

export type HookEventName = "session-start" | "pre-edit" | "pre-command" | "pre-mcp" | "post-edit" | "stop" | "permission";

export interface Parsed {
  event: HookEventName;
  input: HookInput;
  /** Hosts with two payload formats (Copilot in VS Code and Copilot CLI) record which one sent this. */
  format?: "vscode" | "cli";
}

export interface Rendered {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface Adapter {
  /** Maps a host's native hook payload onto a guard event, or null when the call is not one the guards handle. */
  parse(payload: Record<string, unknown>): Parsed | null;
  render(parsed: Parsed, result: HookResult): Rendered;
}

const none: Rendered = { stdout: "", stderr: "", exitCode: 0 };
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
const text = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

/**
 * The guard's read-only allowlist is about the Nozle account server only. A host that passes every MCP call to the
 * hook (Codex has no matcher) must not have the docs server judged as an account tool.
 */
const isAccountServer = (server: string): boolean => server.includes("nozle-account");

const claudeEditTools = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/** Claude Code: payload fields verified against a live session (hook_event_name, cwd, tool_name, tool_input, stop_hook_active). */
export const claude: Adapter = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const tool = text(payload["tool_name"]) ?? "";
    const toolInput = object(payload["tool_input"]);
    const path = text(toolInput["file_path"]) ?? text(toolInput["notebook_path"]);

    switch (payload["hook_event_name"]) {
      case "SessionStart":
        return { event: "session-start", input: { cwd } };
      case "PreToolUse":
        if (claudeEditTools.has(tool)) return { event: "pre-edit", input: { cwd, path } };
        if (tool === "Bash") return { event: "pre-command", input: { cwd, command: text(toolInput["command"]) ?? "" } };
        // mcp__<server>__<tool>; the host's matcher decides which server's calls reach the guard.
        if (tool.startsWith("mcp__")) {
          const [, server = ""] = tool.split("__");
          return isAccountServer(server) ? { event: "pre-mcp", input: { cwd, tool: tool.slice(tool.lastIndexOf("__") + 2) } } : null;
        }
        return null;
      case "PostToolUse":
        return claudeEditTools.has(tool) ? { event: "post-edit", input: { cwd, path } } : null;
      case "PermissionRequest":
        return tool === "Bash" ? { event: "permission", input: { cwd, command: text(toolInput["command"]) ?? "" } } : null;
      case "Stop":
      case "SubagentStop":
        return { event: "stop", input: { cwd, stop_hook_active: payload["stop_hook_active"] === true } };
      default:
        return null;
    }
  },

  render(parsed, result) {
    if (parsed.event === "permission") {
      return result.abstain
        ? none
        : { stdout: `${JSON.stringify({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } } })}\n`, stderr: "", exitCode: 0 };
    }
    if (result.decision === "deny") {
      const reason = `Nozle guard: ${result.reason}`;
      // Before a tool runs, exit 2 blocks it and the reason reaches the model.
      if (parsed.event === "pre-edit" || parsed.event === "pre-command" || parsed.event === "pre-mcp") {
        return { stdout: "", stderr: `${reason}\n`, exitCode: 2 };
      }
      // After a tool or at stop, a block decision tells the model to continue and fix it.
      return { stdout: `${JSON.stringify({ decision: "block", reason })}\n`, stderr: "", exitCode: 0 };
    }
    if ((parsed.event === "session-start" || parsed.event === "post-edit") && result.context) {
      const hookEventName = parsed.event === "session-start" ? "SessionStart" : "PostToolUse";
      return {
        stdout: `${JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: result.context } })}\n`,
        stderr: "",
        exitCode: 0,
      };
    }
    return none;
  },
};

/** Paths a Codex `apply_patch` touches: each Add, Update, Delete, and Move target in the patch text. */
export function patchPaths(patch: string): string[] {
  return [...patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)].map((match) => match[1]!.trim());
}

/**
 * Codex CLI: payload fields verified against a live session. It names events and fields like Claude Code,
 * but edits arrive as `apply_patch` with the patch text in `tool_input.command`.
 */
export const codex: Adapter = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const tool = text(payload["tool_name"]) ?? "";
    const command = text(object(payload["tool_input"])["command"]) ?? "";

    switch (payload["hook_event_name"]) {
      case "SessionStart":
        return { event: "session-start", input: { cwd } };
      case "PreToolUse":
        if (tool === "apply_patch") return { event: "pre-edit", input: { cwd, paths: patchPaths(command) } };
        if (tool === "Bash") return { event: "pre-command", input: { cwd, command } };
        if (tool.startsWith("mcp__")) {
          const [, server = ""] = tool.split("__");
          return isAccountServer(server) ? { event: "pre-mcp", input: { cwd, tool: tool.slice(tool.lastIndexOf("__") + 2) } } : null;
        }
        return null;
      case "PostToolUse":
        return tool === "apply_patch" ? { event: "post-edit", input: { cwd, paths: patchPaths(command) } } : null;
      case "Stop":
        return { event: "stop", input: { cwd, stop_hook_active: payload["stop_hook_active"] === true } };
      default:
        return null;
    }
  },

  // Output formats for denying and adding context are the same shape as Claude Code's until a live run shows otherwise.
  render: claude.render,
};



const json = (value: unknown): string => `${JSON.stringify(value)}\n`;
const isPre = (event: HookEventName): boolean => event === "pre-edit" || event === "pre-command" || event === "pre-mcp";
const blockPre = (reason: string): Rendered => ({ stdout: "", stderr: `Nozle guard: ${reason}\n`, exitCode: 2 });
const filePath = (args: Record<string, unknown>): string | undefined =>
  text(args["file_path"]) ?? text(args["filePath"]) ?? text(args["path"]) ?? text(args["target_file"]);
/** The tool part of an MCP tool name: everything after the server segment(s) the host prefixes. */
const mcpTool = (name: string, prefixLength: number): string => name.slice(prefixLength);

/**
 * Cursor (docs: cursor.com/docs/hooks; not yet run in a live Cursor session). Pre-hooks deny with exit 2;
 * stop continues through `followup_message`; sessionStart injects `additional_context`.
 */
export const cursor: Adapter = {
  parse(payload) {
    const cwd = text(payload["cwd"]) ?? (Array.isArray(payload["workspace_roots"]) ? text(payload["workspace_roots"][0]) : undefined);
    const tool = text(payload["tool_name"]) ?? "";
    const toolInput = object(payload["tool_input"]);
    switch (payload["hook_event_name"]) {
      case "sessionStart":
        return { event: "session-start", input: { cwd } };
      case "beforeShellExecution":
        return { event: "pre-command", input: { cwd, command: text(payload["command"]) ?? "" } };
      case "beforeMCPExecution":
        return { event: "pre-mcp", input: { cwd, tool } };
      case "preToolUse":
        if (tool === "Shell") return { event: "pre-command", input: { cwd, command: text(toolInput["command"]) ?? "" } };
        if (tool.startsWith("MCP:")) return { event: "pre-mcp", input: { cwd, tool: mcpTool(tool, 4) } };
        if (["Write", "Edit", "StrReplace", "Delete", "EditNotebook"].includes(tool)) return { event: "pre-edit", input: { cwd, path: filePath(toolInput) } };
        return null;
      case "afterFileEdit":
        return { event: "post-edit", input: { cwd, path: text(payload["file_path"]) } };
      case "stop":
        return { event: "stop", input: { cwd, stop_hook_active: Number(payload["loop_count"] ?? 0) > 0 } };
      default:
        return null;
    }
  },

  render(parsed, result) {
    if (result.decision === "deny") {
      if (isPre(parsed.event)) return blockPre(result.reason ?? "denied");
      if (parsed.event === "stop") return { stdout: json({ followup_message: `Nozle guard: ${result.reason}` }), stderr: "", exitCode: 0 };
      return { stdout: "", stderr: `Nozle guard: ${result.reason}\n`, exitCode: 0 };
    }
    return parsed.event === "session-start" && result.context ? { stdout: json({ additional_context: result.context }), stderr: "", exitCode: 0 } : none;
  },
};

/**
 * Windsurf Cascade, now Devin Desktop (docs: docs.devin.ai/desktop/cascade/hooks; not yet run live). Hooks block only
 * with exit 2, carry paths and commands in `tool_info`, and have no session-start or stop event, so those guards do not apply.
 */
export const windsurf: Adapter = {
  parse(payload) {
    const info = object(payload["tool_info"]);
    const cwd = text(info["cwd"]);
    switch (payload["agent_action_name"]) {
      case "pre_write_code":
        return { event: "pre-edit", input: { cwd, path: text(info["file_path"]) } };
      case "post_write_code":
        return { event: "post-edit", input: { cwd, path: text(info["file_path"]) } };
      case "pre_run_command":
        return { event: "pre-command", input: { cwd, command: text(info["command_line"]) ?? "" } };
      case "pre_mcp_tool_use":
        return { event: "pre-mcp", input: { cwd, tool: text(info["mcp_tool_name"]) ?? "" } };
      default:
        return null;
    }
  },

  render: (parsed, result) => (result.decision === "deny" && isPre(parsed.event) ? blockPre(result.reason ?? "denied") : none),
};

/**
 * Gemini CLI (docs: geminicli.com/docs/hooks; not yet run live). Edit tools are `write_file` and `replace`;
 * MCP tools are named `mcp_<server>_<tool>` and the host's matcher decides which server reaches the guard.
 */
export const gemini: Adapter = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const tool = text(payload["tool_name"]) ?? "";
    const toolInput = object(payload["tool_input"]);
    const edit = tool === "write_file" || tool === "replace";
    switch (payload["hook_event_name"]) {
      case "SessionStart":
        return { event: "session-start", input: { cwd } };
      case "BeforeTool":
        if (edit) return { event: "pre-edit", input: { cwd, path: filePath(toolInput) } };
        if (tool === "run_shell_command") return { event: "pre-command", input: { cwd, command: text(toolInput["command"]) ?? "" } };
        if (tool.startsWith("mcp_")) return isAccountServer(tool.slice(4, tool.indexOf("_", 4))) ? { event: "pre-mcp", input: { cwd, tool: mcpTool(tool, tool.indexOf("_", 4) + 1) } } : null;
        return null;
      case "AfterTool":
        return edit ? { event: "post-edit", input: { cwd, path: filePath(toolInput) } } : null;
      case "AfterAgent":
        return { event: "stop", input: { cwd, stop_hook_active: payload["stop_hook_active"] === true } };
      default:
        return null;
    }
  },

  render(parsed, result) {
    if (result.decision === "deny") {
      if (isPre(parsed.event)) return blockPre(result.reason ?? "denied");
      return { stdout: json({ decision: "deny", reason: `Nozle guard: ${result.reason}` }), stderr: "", exitCode: 0 };
    }
    return parsed.event === "session-start" && result.context
      ? { stdout: json({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: result.context } }), stderr: "", exitCode: 0 }
      : none;
  },
};

const copilotEdits = new Set(["edit", "create", "write", "Edit", "Write", "MultiEdit", "str_replace_editor", "replace_string_in_file", "create_file", "insert_edit_into_file"]);
const copilotShell = new Set(["bash", "powershell", "Bash", "run_in_terminal"]);

/** Tool arguments arrive as an object or as a JSON string depending on the host. */
function toolArguments(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return object(value);
  try {
    return object(JSON.parse(value));
  } catch {
    return {};
  }
}

/**
 * GitHub Copilot in VS Code (PascalCase events, snake_case fields) and Copilot CLI (camelCase events and fields),
 * from the hook references; neither is run live yet. The two formats are told apart by the `hook_event_name` field.
 */
export const copilot: Adapter = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const format = payload["hook_event_name"] !== undefined ? "vscode" : "cli";
    const name = String(payload["hook_event_name"] ?? payload["event"] ?? payload["hookEventName"] ?? "");
    const tool = text(payload["tool_name"]) ?? text(payload["toolName"]) ?? "";
    const args = toolArguments(payload["tool_input"] ?? payload["toolArgs"]);
    const path = filePath(args);
    const parsed = (event: HookEventName, input: HookInput): Parsed => ({ event, input, format });
    switch (name.charAt(0).toLowerCase() + name.slice(1)) {
      case "sessionStart":
        return parsed("session-start", { cwd });
      case "preToolUse":
        if (copilotEdits.has(tool)) return parsed("pre-edit", { cwd, path });
        if (copilotShell.has(tool)) return parsed("pre-command", { cwd, command: text(args["command"]) ?? "" });
        if (tool.startsWith("mcp_")) return isAccountServer(tool.slice(4, tool.indexOf("_", 4))) ? parsed("pre-mcp", { cwd, tool: mcpTool(tool, tool.indexOf("_", 4) + 1) }) : null;
        return null;
      case "postToolUse":
        return copilotEdits.has(tool) ? parsed("post-edit", { cwd, path }) : null;
      case "stop":
      case "agentStop":
        return parsed("stop", { cwd, stop_hook_active: payload["stop_hook_active"] === true });
      default:
        return null;
    }
  },

  render(parsed, result) {
    const vscode = parsed.format === "vscode";
    if (result.decision === "deny") {
      if (isPre(parsed.event)) return blockPre(result.reason ?? "denied");
      const reason = `Nozle guard: ${result.reason}`;
      if (parsed.event === "stop") {
        const out = vscode ? { hookSpecificOutput: { hookEventName: "Stop", decision: "block", reason } } : { decision: "block", reason };
        return { stdout: json(out), stderr: "", exitCode: 0 };
      }
      // Copilot CLI cannot block after a tool, so the finding goes back as context.
      return { stdout: json(vscode ? { decision: "block", reason } : { additionalContext: reason }), stderr: "", exitCode: 0 };
    }
    if (parsed.event === "session-start" && result.context) {
      const out = vscode ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: result.context } } : { additionalContext: result.context };
      return { stdout: json(out), stderr: "", exitCode: 0 };
    }
    return none;
  },
};

const opencodeEdits = new Set(["write", "edit", "patch", "multiedit", "apply_patch"]);

/**
 * OpenCode, through the generated plugin (`nozle-check hosts opencode`), which sends `{ phase, cwd, tool, args }`.
 * Tool names and the `filePath` and `command` arguments were captured from a live OpenCode 1.18 session; OpenCode
 * names MCP tools `<server>_<tool>`. A plugin can only throw to block, so there is no stop or session-start guard.
 */
export const opencode: Adapter = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const tool = text(payload["tool"]) ?? "";
    const args = object(payload["args"]);
    const before = payload["phase"] === "before";
    if (opencodeEdits.has(tool)) return { event: before ? "pre-edit" : "post-edit", input: { cwd, path: filePath(args) } };
    if (!before) return null;
    if (tool === "bash") return { event: "pre-command", input: { cwd, command: text(args["command"]) ?? "" } };
    if (tool.startsWith("nozle-account_")) return { event: "pre-mcp", input: { cwd, tool: tool.slice("nozle-account_".length) } };
    return null;
  },

  render: (parsed, result) => (result.decision === "deny" ? (isPre(parsed.event) ? blockPre(result.reason ?? "denied") : { stdout: "", stderr: `Nozle guard: ${result.reason}\n`, exitCode: 2 }) : none),
};

export const adapters: Record<string, Adapter> = { claude, codex, cursor, windsurf, gemini, copilot, opencode };
