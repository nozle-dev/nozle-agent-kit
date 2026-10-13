import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { adapters } from "../src/hook-adapters.ts";
import { runHook } from "../src/hook.ts";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "nozle-hosts-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "nozle.integration.yaml"), "schema: nozle.integration\nversion: 1\n");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** Payloads follow each host's hook reference; they are not captured from live sessions. */
const edit = (): Record<string, Record<string, unknown>> => ({
  cursor: { hook_event_name: "preToolUse", workspace_roots: [root], tool_name: "Write", tool_input: { file_path: join(root, "src/b.ts") } },
  windsurf: { agent_action_name: "pre_write_code", tool_info: { file_path: join(root, "src/b.ts"), cwd: root } },
  gemini: { hook_event_name: "BeforeTool", cwd: root, tool_name: "write_file", tool_input: { file_path: join(root, "src/b.ts") } },
  "copilot-vscode": { hook_event_name: "PreToolUse", cwd: root, tool_name: "edit", tool_input: { file_path: join(root, "src/b.ts") } },
  "copilot-cli": { event: "preToolUse", cwd: root, toolName: "edit", toolArgs: JSON.stringify({ path: join(root, "src/b.ts") }) },
});
const shell = (command: string): Record<string, Record<string, unknown>> => ({
  cursor: { hook_event_name: "beforeShellExecution", cwd: root, command },
  windsurf: { agent_action_name: "pre_run_command", tool_info: { command_line: command, cwd: root } },
  gemini: { hook_event_name: "BeforeTool", cwd: root, tool_name: "run_shell_command", tool_input: { command } },
  "copilot-vscode": { hook_event_name: "PreToolUse", cwd: root, tool_name: "bash", tool_input: { command } },
  "copilot-cli": { event: "preToolUse", cwd: root, toolName: "bash", toolArgs: { command } },
});
const hosts = ["cursor", "windsurf", "gemini", "copilot-vscode", "copilot-cli"];
const adapterFor = (key: string) => adapters[key.split("-")[0]!]!;

describe("every host's adapter enforces the same guards", () => {
  for (const key of hosts) {
    test(`${key}: blocks an unapproved edit with exit 2 and a reason`, () => {
      const adapter = adapterFor(key);
      const parsed = adapter.parse(edit()[key]!)!;
      expect(parsed.event).toBe("pre-edit");
      const out = adapter.render(parsed, runHook(parsed.event, parsed.input));
      expect(out.exitCode).toBe(2);
      expect(out.stderr).toContain("not approved");
    });
  }

  for (const key of hosts) {
    test(`${key}: blocks the user-run first-event script`, () => {
      const adapter = adapterFor(key);
      const parsed = adapter.parse(shell("node scripts/nozle-first-event.mjs --yes")[key]!)!;
      expect(parsed.event).toBe("pre-command");
      const out = adapter.render(parsed, runHook(parsed.event, parsed.input));
      expect(out.exitCode).toBe(2);
      expect(out.stderr).toContain("sent by the user");
    });
  }

  for (const key of hosts) {
    test(`${key}: lets a harmless command through silently`, () => {
      const adapter = adapterFor(key);
      const parsed = adapter.parse(shell("ls src")[key]!)!;
      expect(adapter.render(parsed, runHook(parsed.event, parsed.input))).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    });
  }
});

describe("host-specific shapes", () => {
  test("ignores events and tools no guard handles", () => {
    expect(adapters["cursor"]!.parse({ hook_event_name: "beforeReadFile" })).toBeNull();
    expect(adapters["windsurf"]!.parse({ agent_action_name: "pre_read_code", tool_info: {} })).toBeNull();
    expect(adapters["gemini"]!.parse({ hook_event_name: "BeforeTool", tool_name: "read_file", tool_input: {} })).toBeNull();
    expect(adapters["copilot"]!.parse({ hook_event_name: "PreToolUse", tool_name: "view", tool_input: {} })).toBeNull();
  });

  test("reduces MCP tool names to the tool", () => {
    expect(adapters["gemini"]!.parse({ hook_event_name: "BeforeTool", tool_name: "mcp_nozle-account_get_account_context", tool_input: {} })?.input.tool).toBe("get_account_context");
    expect(adapters["cursor"]!.parse({ hook_event_name: "preToolUse", tool_name: "MCP:create_plan", tool_input: {} })?.input.tool).toBe("create_plan");
    expect(adapters["windsurf"]!.parse({ agent_action_name: "pre_mcp_tool_use", tool_info: { mcp_tool_name: "create_plan" } })?.input.tool).toBe("create_plan");
  });

  test("stop and session-start use each host's own continue and context keys", () => {
    const deny = { decision: "deny", reason: "fix it" } as const;
    const cursorStop = adapters["cursor"]!.render({ event: "stop", input: {} }, deny);
    expect(JSON.parse(cursorStop.stdout)).toEqual({ followup_message: "Nozle guard: fix it" });
    const geminiStop = adapters["gemini"]!.render({ event: "stop", input: {} }, deny);
    expect(JSON.parse(geminiStop.stdout)).toEqual({ decision: "deny", reason: "Nozle guard: fix it" });
    const vscodeStop = adapters["copilot"]!.render({ event: "stop", input: {}, format: "vscode" }, deny);
    expect(JSON.parse(vscodeStop.stdout).hookSpecificOutput).toEqual({ hookEventName: "Stop", decision: "block", reason: "Nozle guard: fix it" });
    const cliStop = adapters["copilot"]!.render({ event: "stop", input: {}, format: "cli" }, deny);
    expect(JSON.parse(cliStop.stdout)).toEqual({ decision: "block", reason: "Nozle guard: fix it" });

    const ctx = { decision: "allow", context: "3/7 done" } as const;
    expect(JSON.parse(adapters["cursor"]!.render({ event: "session-start", input: {} }, ctx).stdout)).toEqual({ additional_context: "3/7 done" });
    expect(JSON.parse(adapters["copilot"]!.render({ event: "session-start", input: {}, format: "cli" }, ctx).stdout)).toEqual({ additionalContext: "3/7 done" });
    expect(JSON.parse(adapters["gemini"]!.render({ event: "session-start", input: {} }, ctx).stdout).hookSpecificOutput.additionalContext).toBe("3/7 done");
  });

  test("Windsurf has no stop or session events", () => {
    expect(adapters["windsurf"]!.parse({ agent_action_name: "post_cascade_response", tool_info: {} })).toBeNull();
  });
});

describe("nozle-check hosts", () => {
  const cli = (...args: string[]) => Bun.spawnSync(["bun", join(import.meta.dir, "../src/check.ts"), "hosts", ...args]);

  test("--write creates each host's files with the hook path, then skips what exists", () => {
    const first = cli("cursor", "--write", root).stdout.toString();
    expect(first).toContain("wrote .cursor/hooks.json");
    const hooks = JSON.parse(require("node:fs").readFileSync(join(root, ".cursor/hooks.json"), "utf8"));
    expect(hooks.hooks.beforeShellExecution[0].command).toContain("nozle-hook\" --host cursor");
    expect(cli("cursor", "--write", root).stdout.toString()).toContain("skipped .cursor/hooks.json");
  });

  test("rejects an unknown host and prints Cline's note", () => {
    expect(cli("vim").exitCode).toBe(2);
    expect(cli("cline").stdout.toString()).toContain("hook interface is unconfirmed");
  });
});
