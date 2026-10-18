import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";

import { isReadOnlyCheckCommand, runHook, shellWriteTargets } from "../src/hook.ts";
import { reviewChecks, testBackedChecks } from "../src/record.ts";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
let root: string;

function writeRecord(overrides: Record<string, unknown> = {}) {
  writeFileSync(join(root, "nozle.integration.yaml"), YAML.stringify({
    schema: "nozle.integration",
    version: 1,
    organization_id: "org_example",
    selected_goals: [5],
    configuration: { meters: { status: "complete", revision: "r1" } },
    approved_scope: {
      approved_at: "2026-10-10T10:00:00Z",
      included_paths: ["src/a.ts", "src/new.ts"],
      excluded_operations: ["copilot"],
      billing_rules: ["bill once"],
    },
    source_files: [
      { path: "src/a.ts", sha256: sha("one") },
      { path: "src/new.ts", sha256: "absent" },
    ],
    tasks: [
      { id: "identity", label: "Identity", status: "completed", evidence: "bun test passed" },
      { id: "meter", label: "Meter", status: "pending", depends_on: ["identity"] },
    ],
    decisions: [{ id: "goals", question: "Which goals?", answer: "5", basis: "user" }],
    peers: [],
    self_review: Object.fromEntries(reviewChecks.map((check) => [check, (testBackedChecks as readonly string[]).includes(check) ? { result: "not_applicable", evidence: "no such path" } : { result: "pass", evidence: "src/a.ts:1" }])),
    ...overrides,
  }));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "nozle-hook-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/a.ts"), "one");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const draftRecord = () => writeFileSync(join(root, "nozle.integration.yaml"), "schema: nozle.integration\nversion: 1\n");

describe("activation", () => {
  test("stays out of the way when no integration is in progress", () => {
    expect(runHook("pre-edit", { cwd: root, path: "src/anything.ts" }).decision).toBe("allow");
    expect(runHook("pre-command", { cwd: root, command: "curl https://api.nozle.app/x" }).decision).toBe("allow");
    expect(runHook("pre-mcp", { cwd: root, tool: "update_plan" }).decision).toBe("allow");
    expect(runHook("pre-command", { cwd: root, command: "node nozle-first-event.mjs --yes" }).decision).toBe("allow");
    expect(runHook("stop", { cwd: root })).toEqual({ decision: "allow" });
  });

  test("finds the record from a subdirectory of the application", () => {
    writeRecord();
    expect(runHook("pre-edit", { cwd: join(root, "src"), path: "copilot.ts" }).decision).toBe("deny");
    expect(runHook("pre-edit", { cwd: join(root, "src"), path: "a.ts" }).decision).toBe("allow");
  });
});

describe("pre-edit scope guard", () => {
  test("refuses application edits until a scope is approved, but allows the record files", () => {
    draftRecord();
    const denied = runHook("pre-edit", { cwd: root, path: "src/anything.ts" });
    expect(denied.decision).toBe("deny");
    expect(denied.reason).toContain("not approved");
    for (const path of ["nozle.integration.yaml", "nozle-setup-plan.yaml", "nozle-integration-report.md"]) {
      expect(runHook("pre-edit", { cwd: root, path }).decision).toBe("allow");
    }
  });

  test("allows approved paths and record artifacts, denies the rest", () => {
    writeRecord();
    for (const path of ["src/a.ts", "src/new.ts", "nozle-setup-plan.yaml", join(root, "src/a.ts")]) {
      expect(runHook("pre-edit", { cwd: root, path }).decision).toBe("allow");
    }
    const denied = runHook("pre-edit", { cwd: root, path: "src/copilot.ts" });
    expect(denied.decision).toBe("deny");
    expect(denied.reason).toContain("src/copilot.ts");
  });

  test("refuses paths the user answered \"do not track\", even when they are also listed as included", () => {
    writeRecord({ approved_scope: { approved_at: "2026-10-10T10:00:00Z", included_paths: ["src/a.ts"], excluded_paths: ["src/copilot/", "src/a.ts"], excluded_operations: ["copilot"], billing_rules: ["bill once"] } });
    const denied = runHook("pre-edit", { cwd: root, path: "src/copilot/agent.ts" });
    expect(denied.decision).toBe("deny");
    expect(denied.reason).toContain("do not track");
    expect(runHook("pre-edit", { cwd: root, path: "src/a.ts" }).decision).toBe("deny");
    expect(runHook("pre-edit", { cwd: root, path: "src/copilot-extra.ts" }).reason).toContain("outside the approved");
  });

  test("denies traversal and symlinks that leave the repository", () => {
    writeRecord();
    const outside = mkdtempSync(join(tmpdir(), "nozle-outside-"));
    symlinkSync(outside, join(root, "link"));
    try {
      expect(runHook("pre-edit", { cwd: root, path: "../escape.ts" }).decision).toBe("deny");
      expect(runHook("pre-edit", { cwd: root, path: "link/x.ts" }).decision).toBe("deny");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test("fails closed on a corrupt record or a missing path", () => {
    writeFileSync(join(root, "nozle.integration.yaml"), "tasks: [");
    expect(runHook("pre-edit", { cwd: root, path: "src/a.ts" }).decision).toBe("deny");
    expect(runHook("pre-edit", { cwd: root }).decision).toBe("deny");
  });
});

describe("command, MCP, and secret guards", () => {
  test("denies Nozle keys and the production host in commands", () => {
    draftRecord();
    expect(runHook("pre-command", { cwd: root, command: "curl -H 'Authorization: Bearer sk_nozle_abcdef123456' x" }).decision).toBe("deny");
    expect(runHook("pre-command", { cwd: root, command: "curl https://api.nozle.app/engine/api/v1/usage/track" }).decision).toBe("deny");
    expect(runHook("pre-command", { cwd: root, command: "bun test src/usage.test.ts" }).decision).toBe("allow");
    expect(runHook("pre-command", { cwd: root, command: "wget -qO- https://api.nozle.app/core/api/v1/events" }).decision).toBe("deny");
  });

  test("denies installing or running the legacy @nozle-js/mcp package", () => {
    writeFileSync(join(root, "nozle.integration.yaml"), "schema: nozle.integration\nversion: 1\n");
    for (const command of ["npx @nozle-js/mcp", "npm install @nozle-js/mcp@0.1.0", "pnpm dlx @nozle-js/mcp --stdio"]) {
      const result = runHook("pre-command", { cwd: root, command });
      expect(result.decision).toBe("deny");
      expect(result.reason).toContain("@nozle-js/mcp");
    }
    expect(runHook("pre-command", { cwd: root, command: "npm install @nozle-js/node" }).decision).toBe("allow");
  });

  test("denies the agent from running the first-event script, with or without --yes", () => {
    draftRecord();
    for (const command of [
      "node skills/nozle-integrate/scripts/nozle-first-event.mjs --customer c --event e --subscription s --yes",
      "./nozle-first-event.mjs --customer c --event e --subscription s",
      "NOZLE_SECRET_KEY=$KEY bash -c 'node nozle-first-event.mjs --yes'",
      "node scripts/nozle-live-check.mjs --org org_test",
      "npx tsx scripts/nozle-live-check.ts --org o",
    ]) {
      const result = runHook("pre-command", { cwd: root, command });
      expect(result.decision).toBe("deny");
      expect(JSON.stringify(result)).toContain("sent by the user");
    }
    expect(runHook("pre-command", { cwd: root, command: "ls scripts" }).decision).toBe("allow");
  });

  test("lets the agent search for or print the host without sending anything", () => {
    draftRecord();
    for (const command of ['grep -rn "api.nozle.app" src', "echo https://api.nozle.app/x", "cat src/client.ts | grep nozle"]) {
      expect(runHook("pre-command", { cwd: root, command }).decision).toBe("allow");
    }
  });

  test("allows only the read-only account tools", () => {
    draftRecord();
    for (const tool of ["get_account_context", "get_capability_catalog", "get_integration_configuration", "list_integration_resources", "get_integration_resource"]) {
      expect(runHook("pre-mcp", { cwd: root, tool }).decision).toBe("allow");
    }
    expect(runHook("pre-mcp", { cwd: root, tool: "update_plan" }).decision).toBe("deny");
    expect(runHook("pre-mcp", { cwd: root }).decision).toBe("deny");
  });

  test("blocks a written file that contains a key", () => {
    draftRecord();
    writeFileSync(join(root, "src/a.ts"), 'const key = "sk_nozle_abcdef123456";');
    expect(runHook("post-edit", { cwd: root, path: "src/a.ts" }).decision).toBe("deny");
    writeFileSync(join(root, "src/a.ts"), "const key = process.env.NOZLE_SECRET_KEY;");
    expect(runHook("post-edit", { cwd: root, path: "src/a.ts" }).decision).toBe("allow");
  });
});

describe("session-start and stop", () => {
  test("injects a pointer with the next step, nothing without a record", () => {
    expect(runHook("session-start", { cwd: root })).toEqual({ decision: "allow" });
    writeRecord();
    const result = runHook("session-start", { cwd: root });
    expect(result.context).toContain("1/2 steps completed");
    expect(result.context).toContain("Next step: meter");
  });

  test("blocks stopping while scoped files differ from the record", () => {
    writeRecord();
    expect(runHook("stop", { cwd: root }).decision).toBe("allow");
    writeFileSync(join(root, "src/a.ts"), "edited");
    const blocked = runHook("stop", { cwd: root });
    expect(blocked.decision).toBe("deny");
    expect(blocked.reason).toContain("src/a.ts");
    expect(runHook("stop", { cwd: root, stop_hook_active: true }).decision).toBe("allow");
  });

  test("lets the agent stop when a step failed on purpose", () => {
    writeRecord({ tasks: [{ id: "identity", status: "failed", reason: "customer mapping unresolved" }] });
    writeFileSync(join(root, "src/a.ts"), "edited");
    expect(runHook("stop", { cwd: root }).decision).toBe("allow");
  });

  test("rejects unknown events", () => {
    expect(() => runHook("nope", {})).toThrow("unknown hook event nope");
  });
});

describe("shell writes and env files", () => {
  test("finds redirect, tee and in-place edit targets, not heredoc bodies or quoted text", () => {
    expect(shellWriteTargets("cat >> src/a.ts <<'EOF'\nx > src/b.ts\nEOF")).toEqual(["src/a.ts"]);
    expect(shellWriteTargets("echo hi | tee -a src/a.ts src/c.ts")).toEqual(["src/a.ts", "src/c.ts"]);
    expect(shellWriteTargets("sed -i 's/a/b/' src/a.ts")).toEqual(["src/a.ts"]);
    expect(shellWriteTargets("ls 2>/dev/null; echo \"a > b\"; cmd >&2")).toEqual(["/dev/null"]);
    expect(shellWriteTargets("grep -n foo src/a.ts")).toEqual([]);
  });

  test("applies the edit scope to shell writes inside the repository", () => {
    draftRecord();
    expect(runHook("pre-command", { cwd: root, command: "echo x >> src/a.ts" }).decision).toBe("deny");
    expect(runHook("pre-command", { cwd: root, command: "echo x > /tmp/scratch.txt" }).decision).toBe("allow");
    writeRecord();
    expect(runHook("pre-command", { cwd: root, command: "echo x >> src/a.ts" }).decision).toBe("allow");
    const outside = runHook("pre-command", { cwd: root, command: "printf x | tee .gitignore" });
    expect(outside.decision).toBe("deny");
    expect(outside.reason).toContain("outside the approved");
  });

  test("allows the task file beside the records before approval", () => {
    draftRecord();
    expect(runHook("pre-edit", { cwd: root, path: "nozle-tasks.yaml" }).decision).toBe("allow");
  });

  test("never edits a real env file, even in scope; templates are fine", () => {
    writeRecord({ approved_scope: { approved_at: "2026-10-10T10:00:00Z", included_paths: [".env", ".env.example"], excluded_operations: [], billing_rules: [] } });
    expect(runHook("pre-edit", { cwd: root, path: ".env" }).decision).toBe("deny");
    expect(runHook("pre-edit", { cwd: root, path: ".env.local" }).decision).toBe("deny");
    expect(runHook("pre-edit", { cwd: root, path: ".env.example" }).decision).toBe("allow");
    expect(runHook("pre-command", { cwd: root, command: "echo K= >> .env" }).decision).toBe("deny");
  });
});

describe("build checks", () => {
  test("post-edit returns advice for a random usage key and blocks an SDK that contradicts the stack", () => {
    writeRecord({ stack: { backend_path: "rest", runtime: "workers" } });
    writeFileSync(join(root, "src/a.ts"), "const idempotencyKey = crypto.randomUUID();\n");
    const advised = runHook("post-edit", { cwd: root, path: "src/a.ts" });
    expect(advised.decision).toBe("allow");
    expect(advised.context).toContain("random id");
    writeFileSync(join(root, "src/a.ts"), 'import { Nozle } from "@nozle-js/node";\n');
    const blocked = runHook("post-edit", { cwd: root, path: "src/a.ts" });
    expect(blocked.decision).toBe("deny");
    expect(blocked.reason).toContain("recorded stack is rest");
  });

  test("stop reports lint findings, an invalid record and two subscription creators once", () => {
    const one = "await nozle.subscriptions.create({ customerId, planCode });\n";
    writeFileSync(join(root, "src/a.ts"), one);
    writeFileSync(join(root, "src/new.ts"), one);
    writeRecord({
      source_files: [{ path: "src/a.ts", sha256: sha(one) }, { path: "src/new.ts", sha256: sha(one) }],
      tasks: [],
    });
    const blocked = runHook("stop", { cwd: root });
    expect(blocked.decision).toBe("deny");
    expect(blocked.reason).toContain("More than one file creates subscriptions");
    expect(blocked.reason).toContain("does not validate");
    expect(runHook("stop", { cwd: root, stop_hook_active: true }).decision).toBe("allow");
  });

  test("stop leaves code findings alone on a mid-build record without a self-review", () => {
    const sender = "await nozle.usage.track(user, feature);\n";
    writeFileSync(join(root, "src/a.ts"), sender);
    writeRecord({ source_files: [{ path: "src/a.ts", sha256: sha(sender) }, { path: "src/new.ts", sha256: "absent" }] });
    expect(runHook("stop", { cwd: root }).reason).toContain("409");
    const file = join(root, "nozle.integration.yaml");
    const { self_review: _r, ...rest } = YAML.parse(readFileSync(file, "utf8"));
    writeFileSync(file, YAML.stringify(rest));
    expect(runHook("stop", { cwd: root })).toEqual({ decision: "allow" });
  });

  test("stop asks for the self-review once every planned file is written, even with tasks open", () => {
    const file = join(root, "nozle.integration.yaml");
    writeRecord();
    const { self_review: _r, ...rest } = YAML.parse(readFileSync(file, "utf8"));
    writeFileSync(file, YAML.stringify(rest));
    expect(runHook("stop", { cwd: root })).toEqual({ decision: "allow" });
    writeFileSync(join(root, "src/new.ts"), "export const x = 1;\n");
    writeFileSync(file, YAML.stringify({ ...rest, source_files: [{ path: "src/a.ts", sha256: sha("one") }, { path: "src/new.ts", sha256: sha("export const x = 1;\n") }] }));
    const blocked = runHook("stop", { cwd: root });
    expect(blocked.decision).toBe("deny");
    expect(blocked.reason).toContain("self_review is required");
  });

  test("stop blocks once on a self_review marked fail", () => {
    writeRecord({ self_review: { ...Object.fromEntries(reviewChecks.map((check) => [check, (testBackedChecks as readonly string[]).includes(check) ? { result: "not_applicable", evidence: "no such path" } : { result: "pass", evidence: "src/a.ts:1" }])), "shadow-writes": { result: "fail", evidence: "src/a.ts:1" } } });
    const blocked = runHook("stop", { cwd: root });
    expect(blocked.decision).toBe("deny");
    expect(blocked.reason).toContain("shadow-writes");
    expect(runHook("stop", { cwd: root, stop_hook_active: true }).decision).toBe("allow");
  });

  test("stop does not repeat the 409 advice when another scoped file branches on a 409", () => {
    const sender = "await nozle.usage.track(user, feature);\n";
    const helper = "export const isConflict = (e) => e.status === 409;\n";
    writeFileSync(join(root, "src/a.ts"), sender);
    writeFileSync(join(root, "src/new.ts"), sender);
    writeRecord({ source_files: [{ path: "src/a.ts", sha256: sha(sender) }, { path: "src/new.ts", sha256: sha(sender) }] });
    expect(runHook("stop", { cwd: root }).reason).toContain("409");
    writeFileSync(join(root, "src/new.ts"), helper);
    writeRecord({ source_files: [{ path: "src/a.ts", sha256: sha(sender) }, { path: "src/new.ts", sha256: sha(helper) }] });
    expect(runHook("stop", { cwd: root })).toEqual({ decision: "allow" });
  });

  test("a clean, valid record lets the agent stop", () => {
    writeRecord();
    expect(runHook("stop", { cwd: root })).toEqual({ decision: "allow" });
  });
});

describe("permission requests", () => {
  test("approves only plain read-only nozle-check commands", () => {
    for (const command of [
      "nozle-check env /tmp/app",
      "nozle-check plan nozle-tasks.yaml",
      "nozle-check progress",
      "nozle-check hash /tmp/app src/a.ts package.json",
      "nozle-check nozle.integration.yaml",
      "nozle-check resume --config /tmp/config.yaml",
      "node /opt/plugin/skills/nozle-integrate/scripts/nozle-check.mjs env /tmp/app",
    ]) expect(isReadOnlyCheckCommand(command)).toBe(true);
    for (const command of [
      "nozle-check hosts cursor --write",
      "nozle-check hook pre-edit",
      "nozle-check env /tmp/app && rm -rf x",
      "nozle-check env $PWD",
      "nozle-check env /tmp/app; ls",
      "nozle-check env /tmp/app | sh",
      "nozle-check env \"/tmp/a b\"",
      "nozle-check env /tmp/app > out.txt",
      "node evil.js nozle-check env",
      "node /tmp/x/nozle-check.mjs.sh env",
      "echo nozle-check env",
      "nozle-check",
      "",
    ]) expect(isReadOnlyCheckCommand(command)).toBe(false);
  });

  test("answers before any record exists, and never denies", () => {
    expect(runHook("permission", { cwd: root, command: "nozle-check env /tmp/app" })).toEqual({ decision: "allow" });
    expect(runHook("permission", { cwd: root, command: "rm -rf /" })).toEqual({ decision: "allow", abstain: true });
  });
});

describe("peer repositories", () => {
  let peer: string;
  beforeEach(() => {
    peer = mkdtempSync(join(tmpdir(), "nozle-peer-"));
    mkdirSync(join(peer, "src"));
  });
  afterEach(() => rmSync(peer, { recursive: true, force: true }));

  test("a session with both folders writes the peer's record, and edits peer code only under the peer's scope", () => {
    writeRecord({ peers: [{ role: "frontend", location: peer, record_seen: false }] });
    expect(runHook("pre-edit", { cwd: root, path: join(peer, "nozle.integration.yaml") }).decision).toBe("allow");
    expect(runHook("pre-command", { cwd: root, command: `cat > ${join(peer, "nozle-study.yaml")} <<EOF\nx\nEOF` }).decision).toBe("allow");
    expect(runHook("pre-edit", { cwd: root, path: join(peer, "src/app.tsx") }).reason).toContain("has not approved");
    writeFileSync(join(peer, "nozle.integration.yaml"), YAML.stringify({ approved_scope: { included_paths: ["src/app.tsx"] } }));
    expect(runHook("pre-edit", { cwd: root, path: join(peer, "src/app.tsx") }).decision).toBe("allow");
    expect(runHook("pre-edit", { cwd: root, path: join(peer, "src/other.tsx") }).reason).toContain("outside the approved");
  });

  test("a folder that is not a named peer stays outside the repository", () => {
    writeRecord();
    expect(runHook("pre-edit", { cwd: root, path: join(peer, "nozle.integration.yaml") }).reason).toContain("outside the repository");
  });

  test("stop asks for peers on a draft, and for record_seen when the peer's record is readable", () => {
    writeFileSync(join(root, "nozle.integration.yaml"), "schema: nozle.integration\nversion: 1\nselected_goals: [5]\ndecisions: [{ id: goals, question: Which goals?, answer: \"5\", basis: user }]\n");
    expect(runHook("stop", { cwd: root }).reason).toContain("no peers entry");
    expect(runHook("stop", { cwd: root, stop_hook_active: true }).decision).toBe("allow");
    writeFileSync(join(root, "nozle.integration.yaml"), YAML.stringify({ selected_goals: [5], decisions: [{ id: "goals", question: "Which goals?", answer: "5", basis: "user" }], peers: [{ role: "frontend", location: peer, record_seen: false }] }));
    expect(runHook("stop", { cwd: root }).decision).toBe("allow");
    writeFileSync(join(peer, "nozle.integration.yaml"), "schema: nozle.integration\n");
    expect(runHook("stop", { cwd: root }).reason).toContain("set record_seen: true");
  });
});

test("stop checks the fields a draft record already holds", () => {
  writeFileSync(join(root, "nozle.integration.yaml"), YAML.stringify({ selected_goals: ["1. Show pricing and plans"], peers: [] }));
  expect(runHook("stop", { cwd: root }).reason).toContain("selected_goals must contain only options 1 through 10");
  writeFileSync(join(root, "nozle.integration.yaml"), YAML.stringify({ selected_goals: [1, 8], decisions: [{ id: "goals", question: "Which goals?", answer: "5", basis: "user" }], peers: [] }));
  expect(runHook("stop", { cwd: root }).decision).toBe("allow");
});

test("a record that does not parse can still be repaired, but blocks every other edit", () => {
  writeFileSync(join(root, "nozle.integration.yaml"), "tasks:\n  - { id: a }\n- { id: b }\n");
  expect(runHook("pre-edit", { cwd: root, path: "nozle.integration.yaml" }).decision).toBe("allow");
  expect(runHook("pre-command", { cwd: root, command: "sed -i 's/a/b/' nozle.integration.yaml" }).decision).toBe("allow");
  const other = runHook("pre-edit", { cwd: root, path: "src/a.ts" });
  expect(other.decision).toBe("deny");
  expect(other.reason).toContain("edits to it are allowed");
});

test("stop asks for the handoff fields only once every task is done", () => {
  const withoutHandoffFields = (overrides: Record<string, unknown> = {}) => {
    writeRecord(overrides);
    const file = join(root, "nozle.integration.yaml");
    const { self_review: _r, decisions: _d, peers: _p, ...rest } = YAML.parse(readFileSync(file, "utf8"));
    writeFileSync(file, YAML.stringify(rest));
  };
  withoutHandoffFields();
  expect(runHook("stop", { cwd: root }).decision).toBe("allow");
  withoutHandoffFields({ tasks: [{ id: "identity", label: "Identity", status: "completed", evidence: "bun test passed" }] });
  expect(runHook("stop", { cwd: root }).reason).toContain("self_review is required");
  writeRecord({ peers: undefined });
  const file = join(root, "nozle.integration.yaml");
  const { peers: _p, ...rest } = YAML.parse(readFileSync(file, "utf8"));
  writeFileSync(file, YAML.stringify(rest));
  expect(runHook("stop", { cwd: root }).reason).toContain("peers must be a list");
});

test("application edits wait until every study activity has the user's answer", () => {
  writeRecord({ decisions: [{ id: "copilot", question: "Track the copilot?", answer: "Track", basis: "user", activities: ["copilot"] }] });
  writeFileSync(join(root, "nozle-study.yaml"), YAML.stringify({ activities: [{ id: "copilot" }, { id: "email-send" }] }));
  const refused = runHook("pre-edit", { cwd: root, path: "src/a.ts" });
  expect(refused.decision).toBe("deny");
  expect(refused.reason).toContain("email-send");
  expect(runHook("pre-edit", { cwd: root, path: "nozle.integration.yaml" }).decision).toBe("allow");
  writeRecord({ decisions: [{ id: "all", question: "What to track?", answer: "Copilot billable, sends do not track", basis: "user", activities: ["copilot", "email-send"] }] });
  expect(runHook("pre-edit", { cwd: root, path: "src/a.ts" }).decision).toBe("allow");
});

test("session-start restates what the record settled, so a compacted session keeps to it", () => {
  writeRecord({
    stack: { backend_path: "python-sdk", runtime: "python" },
    approved_scope: { approved_at: "2026-10-10T10:00:00Z", included_paths: ["src/a.ts"], excluded_paths: ["src/chat/"], billing_rules: ["bill once"] },
    decisions: [{ id: "charge-order", question: "Charge before or after?", answer: "After the work succeeds", basis: "user", activities: ["chat"] }],
  });
  writeFileSync(join(root, "nozle-study.yaml"), YAML.stringify({ activities: [{ id: "chat" }, { id: "email-send" }] }));
  const context = runHook("session-start", { cwd: root }).context ?? "";
  expect(context).toContain("stack python-sdk on python");
  expect(context).toContain("do not track, never edit: src/chat/");
  expect(context).toContain("charge-order: After the work succeeds");
  expect(context).toContain("activities still waiting for the user's answer: email-send");
  expect(context.length).toBeLessThan(2000);
});

test("stop asks for a hand-off summary only when the record is at hand-off", () => {
  writeRecord({ self_review: undefined, tasks: [{ id: "identity", status: "pending" }] });
  writeFileSync(join(root, "src/a.ts"), "edited mid-build");
  const midBuild = runHook("stop", { cwd: root }).reason ?? "";
  expect(midBuild).toContain("src/a.ts");
  expect(midBuild).toContain("do not write a hand-off summary");
  writeRecord();
  const handoff = runHook("stop", { cwd: root }).reason ?? "";
  expect(handoff).toContain("normal hand-off summary");
});

test("stop refuses a draft whose goals were not answered by the user", () => {
  writeFileSync(join(root, "nozle.integration.yaml"), YAML.stringify({ schema: "nozle.integration", version: 1, selected_goals: [10], peers: [] }));
  expect(runHook("stop", { cwd: root }).reason).toContain('decisions entry with id "goals"');
});

describe("records kept per service", () => {
  let workspace: string;
  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "nozle-workspace-"));
    mkdirSync(join(workspace, ".git"));
    mkdirSync(join(workspace, "backend", "src"), { recursive: true });
    writeFileSync(join(workspace, "backend", "nozle.integration.yaml"), YAML.stringify({
      schema: "nozle.integration", version: 1, selected_goals: [5], peers: [],
      approved_scope: { approved_at: "2026-10-10T10:00:00Z", included_paths: ["src/billing.ts"], billing_rules: ["bill once"] },
    }));
  });
  afterEach(() => rmSync(workspace, { recursive: true, force: true }));

  test("a session at the workspace root is still held to the service's approved scope", () => {
    expect(runHook("pre-edit", { cwd: workspace, path: "backend/src/billing.ts" }).decision).toBe("allow");
    const outside = runHook("pre-edit", { cwd: workspace, path: "backend/src/other.ts" });
    expect(outside.decision).toBe("deny");
    expect(outside.reason).toContain("outside the approved");
    expect(runHook("pre-command", { cwd: workspace, command: "echo x > backend/src/other.ts" }).decision).toBe("deny");
  });

  test("session start finds the service records below the workspace root", () => {
    expect(runHook("session-start", { cwd: workspace }).context).toContain("Nozle integration in progress");
  });

  test("a folder of separate repositories is not a workspace: records inside them are ignored", () => {
    const parent = mkdtempSync(join(tmpdir(), "nozle-projects-"));
    try {
      mkdirSync(join(parent, "app", ".git"), { recursive: true });
      writeFileSync(join(parent, "app", "nozle.integration.yaml"), YAML.stringify({ schema: "nozle.integration", version: 1, selected_goals: [10], peers: [] }));
      expect(runHook("stop", { cwd: parent }).decision).toBe("allow");
      expect(runHook("session-start", { cwd: parent }).context ?? "").not.toContain("Nozle integration in progress");
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
