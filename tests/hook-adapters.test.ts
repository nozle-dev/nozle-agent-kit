import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { codex, claude, gemini, patchPaths } from "../src/hook-adapters.ts";
import { runHook } from "../src/hook.ts";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "nozle-adapter-"));
  mkdirSync(join(root, "src"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("claude adapter parsing", () => {
  test("maps the payloads a live Claude Code session sends", () => {
    expect(claude.parse({ hook_event_name: "SessionStart", cwd: root, source: "startup" })).toEqual({ event: "session-start", input: { cwd: root } });
    expect(claude.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "Write", tool_input: { file_path: `${root}/src/a.ts` } }))
      .toEqual({ event: "pre-edit", input: { cwd: root, path: `${root}/src/a.ts` } });
    expect(claude.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "Bash", tool_input: { command: "echo ok" } }))
      .toEqual({ event: "pre-command", input: { cwd: root, command: "echo ok" } });
    expect(claude.parse({ hook_event_name: "PostToolUse", cwd: root, tool_name: "Edit", tool_input: { file_path: "src/a.ts" } }))
      .toEqual({ event: "post-edit", input: { cwd: root, path: "src/a.ts" } });
    expect(claude.parse({ hook_event_name: "Stop", cwd: root, stop_hook_active: true })).toEqual({ event: "stop", input: { cwd: root, stop_hook_active: true } });
  });

  test("reduces an MCP tool name to the tool and ignores calls no guard handles", () => {
    expect(claude.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "mcp__plugin_nozle-agent-kit_nozle-account__get_account_context", tool_input: {} }))
      .toEqual({ event: "pre-mcp", input: { cwd: root, tool: "get_account_context" } });
    // The docs server is not an account tool, whichever host passes it to the hook.
    expect(claude.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "mcp__plugin_nozle-agent-kit_nozle-docs__query_docs_filesystem_nozle", tool_input: {} })).toBeNull();
    expect(codex.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "mcp__nozle-docs__search_nozle", tool_input: {} })).toBeNull();
    expect(codex.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "mcp__nozle-account__create_plan", tool_input: {} }))
      .toEqual({ event: "pre-mcp", input: { cwd: root, tool: "create_plan" } });
    expect(gemini.parse({ hook_event_name: "BeforeTool", cwd: root, tool_name: "mcp_nozle-docs_search_nozle", tool_input: {} })).toBeNull();
    expect(gemini.parse({ hook_event_name: "BeforeTool", cwd: root, tool_name: "mcp_nozle-account_create_plan", tool_input: {} }))
      .toEqual({ event: "pre-mcp", input: { cwd: root, tool: "create_plan" } });
    expect(claude.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "Read", tool_input: { file_path: "x" } })).toBeNull();
    expect(claude.parse({ hook_event_name: "Notification" })).toBeNull();
  });

  test("a notebook edit uses its notebook path", () => {
    expect(claude.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "NotebookEdit", tool_input: { notebook_path: "n.ipynb" } })?.input.path).toBe("n.ipynb");
  });
});

describe("claude adapter rendering", () => {
  test("blocks a tool before it runs with exit 2 and a reason for the model", () => {
    const out = claude.render({ event: "pre-edit", input: {} }, { decision: "deny", reason: "outside scope" });
    expect(out).toEqual({ stdout: "", stderr: "Nozle guard: outside scope\n", exitCode: 2 });
  });

  test("asks the model to continue after a tool or at stop with a block decision", () => {
    for (const event of ["post-edit", "stop"] as const) {
      const out = claude.render({ event, input: {} }, { decision: "deny", reason: "fix it" });
      expect(out.exitCode).toBe(0);
      expect(JSON.parse(out.stdout)).toEqual({ decision: "block", reason: "Nozle guard: fix it" });
    }
  });

  test("returns session context as additionalContext and stays silent otherwise", () => {
    const out = claude.render({ event: "session-start", input: {} }, { decision: "allow", context: "3/7 steps completed." });
    expect(JSON.parse(out.stdout)).toEqual({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "3/7 steps completed." } });
    const asked = claude.parse({ hook_event_name: "PermissionRequest", cwd: root, tool_name: "Bash", tool_input: { command: "nozle-check env /x" } });
    expect(asked).toEqual({ event: "permission", input: { cwd: root, command: "nozle-check env /x" } });
    expect(claude.parse({ hook_event_name: "PermissionRequest", cwd: root, tool_name: "Edit", tool_input: {} })).toBeNull();
    expect(JSON.parse(claude.render(asked!, { decision: "allow" }).stdout)).toEqual({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } } });
    expect(claude.render(asked!, { decision: "allow", abstain: true })).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    const advice = claude.render({ event: "post-edit", input: {} }, { decision: "allow", context: "Nozle build check: x." });
    expect(JSON.parse(advice.stdout)).toEqual({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "Nozle build check: x." } });
    expect(claude.render({ event: "pre-edit", input: {} }, { decision: "allow" })).toEqual({ stdout: "", stderr: "", exitCode: 0 });
  });
});

describe("hook --host claude through the CLI", () => {
  const run = (payload: object) => {
    const proc = Bun.spawnSync(["bun", join(import.meta.dir, "../src/check.ts"), "hook", "--host", "claude"], {
      stdin: new TextEncoder().encode(JSON.stringify(payload)),
    });
    return { code: proc.exitCode, out: proc.stdout.toString(), err: proc.stderr.toString() };
  };

  test("does nothing outside an integration and blocks an out-of-scope edit inside one", () => {
    const edit = { hook_event_name: "PreToolUse", cwd: root, tool_name: "Write", tool_input: { file_path: join(root, "src/b.ts") } };
    expect(run(edit)).toEqual({ code: 0, out: "", err: "" });

    writeFileSync(join(root, "nozle.integration.yaml"), "schema: nozle.integration\nversion: 1\n");
    const blocked = run(edit);
    expect(blocked.code).toBe(2);
    expect(blocked.err).toContain("not approved");
  });

  test("fails closed on malformed input", () => {
    const proc = Bun.spawnSync(["bun", join(import.meta.dir, "../src/check.ts"), "hook", "--host", "claude"], { stdin: new TextEncoder().encode("{nope") });
    expect(proc.exitCode).toBe(2);
  });
});

describe("installed hook script", () => {
  const hook = join(import.meta.dir, "../shared/scripts/nozle-hook");
  const run = (cwd: string, payload: object, path = process.env["PATH"] ?? "") => {
    const proc = Bun.spawnSync(["/bin/sh", hook, "--host", "claude"], {
      cwd,
      env: { PATH: path },
      stdin: new TextEncoder().encode(JSON.stringify(payload)),
    });
    return { code: proc.exitCode, err: proc.stderr.toString() };
  };
  const edit = () => ({ hook_event_name: "PreToolUse", cwd: root, tool_name: "Write", tool_input: { file_path: join(root, "src/b.ts") } });

  test("is silent outside an integration even when node is unavailable", () => {
    expect(run(root, edit(), "/nonexistent")).toEqual({ code: 0, err: "" });
  });

  test("runs the built checker from a subdirectory once a record exists", () => {
    writeFileSync(join(root, "nozle.integration.yaml"), "schema: nozle.integration\nversion: 1\n");
    const blocked = run(join(root, "src"), edit());
    expect(blocked.code).toBe(2);
    expect(blocked.err).toContain("not approved");
  });

  test("blocks the first-event script through the Claude and Codex wrappers", () => {
    writeFileSync(join(root, "nozle.integration.yaml"), "schema: nozle.integration\nversion: 1\n");
    const payload = { hook_event_name: "PreToolUse", cwd: root, tool_name: "Bash", tool_input: { command: "node scripts/nozle-first-event.mjs --yes" } };
    const claude = run(root, payload);
    expect(claude.code).toBe(2);
    expect(claude.err).toContain("sent by the user");
    const proc = Bun.spawnSync(["/bin/sh", hook, "--host", "codex"], { cwd: root, env: { PATH: process.env.PATH ?? "" }, stdin: new TextEncoder().encode(JSON.stringify(payload)) });
    expect(proc.exitCode).toBe(2);
    expect(proc.stderr.toString()).toContain("sent by the user");
  });

  test("fails closed during an integration if the checker cannot run", () => {
    writeFileSync(join(root, "nozle.integration.yaml"), "schema: nozle.integration\nversion: 1\n");
    expect(run(root, edit(), "/nonexistent").code).not.toBe(0);
  });

  test("is installed, executable, with the checker, into every skill", () => {
    for (const skill of ["nozle-integrate", "nozle-audit", "nozle-doctor", "nozle-resume", "nozle-setup"]) {
      const installed = join(import.meta.dir, "../skills", skill, "scripts/nozle-hook");
      expect(statSync(installed).mode & 0o111).not.toBe(0);
      expect(readFileSync(installed, "utf8")).toBe(readFileSync(hook, "utf8"));
    }
  });
});

describe("built checker", () => {
  test("matches the source", async () => {
    const built = await Bun.build({ entrypoints: [join(import.meta.dir, "../src/check.ts")], target: "node" });
    const fresh = await built.outputs[0]!.text();
    expect(readFileSync(join(import.meta.dir, "../shared/scripts/nozle-check.mjs"), "utf8").trim()).toBe(fresh.trim());
  });
});

describe("codex adapter", () => {
  const patch = "*** Begin Patch\n*** Add File: src/new.ts\n+x\n*** Update File: src/a.ts\n@@\n-1\n+2\n*** Delete File: src/old.ts\n*** Move to: src/moved.ts\n*** End Patch";

  test("reads every file an apply_patch touches", () => {
    expect(patchPaths(patch)).toEqual(["src/new.ts", "src/a.ts", "src/old.ts", "src/moved.ts"]);
    expect(codex.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "apply_patch", tool_input: { command: patch } }))
      .toEqual({ event: "pre-edit", input: { cwd: root, paths: ["src/new.ts", "src/a.ts", "src/old.ts", "src/moved.ts"] } });
    expect(codex.parse({ hook_event_name: "PostToolUse", cwd: root, tool_name: "apply_patch", tool_input: { command: patch } })?.event).toBe("post-edit");
  });

  test("maps shell, session, and stop payloads the way a live session sends them", () => {
    expect(codex.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "Bash", tool_input: { command: "echo ok" } }))
      .toEqual({ event: "pre-command", input: { cwd: root, command: "echo ok" } });
    expect(codex.parse({ hook_event_name: "SessionStart", cwd: root, source: "startup" })?.event).toBe("session-start");
    expect(codex.parse({ hook_event_name: "Stop", cwd: root, stop_hook_active: false })?.input.stop_hook_active).toBe(false);
    expect(codex.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "web_search", tool_input: {} })).toBeNull();
  });

  test("blocks a patch when any one of its files is outside the approved scope", () => {
    writeFileSync(join(root, "nozle.integration.yaml"), [
      "schema: nozle.integration", "version: 1", "approved_scope:", "  included_paths: [src/new.ts, src/a.ts]",
    ].join("\n"));
    const parsed = codex.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: "apply_patch", tool_input: { command: patch } })!;
    const result = runHook(parsed.event, parsed.input);
    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("src/old.ts");
  });
});

describe("question tools are never intercepted", () => {
  test("Claude, Codex and OpenCode style question tool calls produce no guard event", () => {
    for (const tool of ["AskUserQuestion", "request_user_input", "question"]) {
      expect(claude.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: tool, tool_input: { questions: [] } })).toBeNull();
      expect(codex.parse({ hook_event_name: "PreToolUse", cwd: root, tool_name: tool, tool_input: { questions: [] } })).toBeNull();
    }
  });
});
