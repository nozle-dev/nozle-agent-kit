import { describe, expect, test } from "bun:test";

import { assessResume, hasCredentialText, reviewChecks, validateIntegrationRecord, validateSetupPlan } from "../src/record.ts";

const record = {
  schema: "nozle.integration",
  version: 1,
  organization_id: "org_1",
  selected_goals: [5, 7],
  configuration: {
    plans: { status: "complete", revision: "plan-rev-1" },
    meters: { status: "unavailable", reason: "permission_denied" },
  },
  approved_scope: {
    approved_at: "2026-10-10T10:00:00Z",
    included_paths: ["src/paid.ts"],
    excluded_operations: ["internal copilot"],
    billing_rules: ["Bill only successful document generations"],
  },
  source_files: [{ path: "src/paid.ts", sha256: "a".repeat(64) }],
  tasks: [{ id: "meter-paid", status: "completed", evidence: "paid fixture emits one event" }],
  decisions: [{ id: "charge-order", question: "Charge before or after the work?", answer: "After", basis: "user" }],
  peers: [],
  self_review: Object.fromEntries(reviewChecks.map((check) => [check, { result: "pass", evidence: "src/a.ts:1" }])),
};

describe("credential text", () => {
  test("flags real-looking tokens but not placeholders or env references", () => {
    expect(hasCredentialText("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc")).toBe(true);
    expect(hasCredentialText("authorization: bearer abcdef123456ghijkl")).toBe(true);
    expect(hasCredentialText("SK_LIVE_abc123def456")).toBe(true);
    expect(hasCredentialText("sk_live_abc123456789")).toBe(true);
    expect(hasCredentialText("sk_live_123")).toBe(true);
    expect(hasCredentialText("sk_test_abcdefghijklmnopqrstuvwxyzabcdef")).toBe(true);
    expect(hasCredentialText('API_KEY = "sk_test_placeholder"')).toBe(false);
    expect(hasCredentialText("sk_live_your_key_here")).toBe(false);
    expect(hasCredentialText('Authorization: "Bearer scoped-ai-token"')).toBe(false);
    expect(hasCredentialText("Bearer eyJhbGciOi.eyJzdWIiOiIx.SflKxwRJSMeKKF")).toBe(true);
    expect(hasCredentialText("Bearer abcdefghijklmnopqrstuvwxyz1")).toBe(true);
    expect(hasCredentialText('curl -H "Authorization: Bearer YOUR_AUTH_SECRET"')).toBe(false);
    expect(hasCredentialText("headers: { Authorization: `Bearer ${env.NOZLE_SECRET_KEY}` }")).toBe(false);
  });
});

describe("integration record", () => {
  test("accepts a reviewable approved scope with completion evidence", () => {
    expect(validateIntegrationRecord(record)).toEqual([]);
  });

  test("excluded_paths must be repository paths and may not overlap included_paths", () => {
    const scope = (excluded: unknown) => ({ ...record, approved_scope: { ...record.approved_scope, excluded_paths: excluded } });
    expect(validateIntegrationRecord(scope(["src/copilot/"]))).toEqual([]);
    expect(validateIntegrationRecord(scope(["../x"]))[0]).toContain("excluded_paths must be repository-relative");
    const inside = { ...record, approved_scope: { ...record.approved_scope, included_paths: ["src/copilot/agent.ts"], excluded_paths: ["src/copilot/"] } };
    expect(validateIntegrationRecord(inside).join()).toContain("approved_scope includes src/copilot/agent.ts");
  });

  test("validates decisions: required at handoff, each with an id, answer and a known basis", () => {
    const { decisions: _, ...without } = record;
    expect(validateIntegrationRecord(without)[0]).toContain("decisions must be a list");
    expect(validateIntegrationRecord(without, { requireReview: false })).toEqual([]);
    expect(validateIntegrationRecord({ ...record, decisions: [] })).toEqual([]);
    expect(validateIntegrationRecord({ ...record, decisions: [{ id: "a", question: "q", answer: "x", basis: "guess" }] })[0]).toContain("need id, question, answer and basis");
    const dup = { id: "a", question: "q", answer: "x", basis: "user" };
    expect(validateIntegrationRecord({ ...record, decisions: [dup, dup] })[0]).toContain("duplicate id a");
  });

  test("requires every self_review check with a result and evidence at handoff, not on resume", () => {
    const { self_review: _, ...withoutReview } = record;
    expect(validateIntegrationRecord(withoutReview)[0]).toContain("self_review is required");
    expect(validateIntegrationRecord(withoutReview, { requireReview: false })).toEqual([]);
    const partial = { ...record, self_review: { ...record.self_review, "usage-key": { result: "maybe", evidence: "" } } };
    expect(validateIntegrationRecord(partial)).toEqual(["self_review usage-key needs result (pass, fail or not_applicable) and evidence"]);
    const failing = { ...record, self_review: { ...record.self_review, "shadow-writes": { result: "fail", evidence: "src/a.ts:9 shadow subscribes" } } };
    expect(validateIntegrationRecord(failing)).toEqual([]);
  });

  test("accepts a recorded stack verdict and rejects an unknown backend path", () => {
    expect(validateIntegrationRecord({ ...record, stack: { backend_path: "go-sdk", runtime: "go" } })).toEqual([]);
    expect(validateIntegrationRecord({ ...record, stack: { backend_path: "ruby-sdk", runtime: "ruby" } })[0]).toContain("stack needs backend_path");
    expect(validateIntegrationRecord({ ...record, stack: { backend_path: "rest" } })[0]).toContain("runtime");
  });

  test("rejects unsupported goals, secrets, and unapproved completed work", () => {
    const unsafe = structuredClone(record) as Record<string, any>;
    unsafe.selected_goals = [11];
    unsafe.approved_scope = null;
    unsafe.api_key = "live_secret_value";
    expect(validateIntegrationRecord(unsafe)).toEqual(expect.arrayContaining([
      "selected_goals must contain only options 1 through 10",
      "completed tasks require an approved scope",
      "record contains forbidden credential field api_key",
    ]));
  });

  test("requires evidence on every completed task and distinct unavailable status", () => {
    const incomplete = structuredClone(record);
    incomplete.tasks[0]!.evidence = "";
    incomplete.configuration.meters = { status: "unavailable", reason: "" };
    expect(validateIntegrationRecord(incomplete)).toEqual(expect.arrayContaining([
      "task meter-paid is completed without evidence",
      "configuration family meters needs a reason for unavailable",
    ]));
  });

  test("flags source or configuration drift before resuming approved edits", () => {
    const unchanged = assessResume(record, { "src/paid.ts": "a".repeat(64) }, {
      plans: { status: "complete", revision: "plan-rev-1" },
      meters: { status: "unavailable" },
    });
    expect(unchanged).toEqual({ requires_review: false, drift: [] });

    const changed = assessResume(record, { "src/paid.ts": "b".repeat(64) }, {
      plans: { status: "complete", revision: "plan-rev-2" },
      meters: { status: "unavailable" },
    });
    expect(changed.requires_review).toBe(true);
    expect(changed.drift).toEqual([
      "source file changed: src/paid.ts",
      "configuration changed: plans",
    ]);
  });

  test("rejects an empty or unapproved handoff record", () => {
    const empty = structuredClone(record) as Record<string, any>;
    empty.approved_scope = null;
    empty.configuration = {};
    empty.source_files = [];
    empty.tasks = [];
    expect(validateIntegrationRecord(empty)).toEqual(expect.arrayContaining([
      "approved_scope is required for a handoff record",
      "configuration needs at least one family",
      "source_files must cover included paths",
      "tasks need at least one planned step",
    ]));
    expect(assessResume(empty, {}, {}).requires_review).toBe(true);
  });

  test("detects a previously unavailable family becoming available", () => {
    const drift = assessResume(record, { "src/paid.ts": "a".repeat(64) }, {
      plans: { status: "complete", revision: "plan-rev-1" },
      meters: { status: "complete", revision: "meter-rev-1" },
    });
    expect(drift).toEqual({
      requires_review: true,
      drift: ["configuration changed: meters"],
    });
  });

  test("tracks a planned new file through creation and later resume", () => {
    const next = structuredClone(record);
    next.approved_scope.included_paths.push("src/new.ts");
    next.source_files.push({ path: "src/new.ts", sha256: "absent" });
    expect(validateIntegrationRecord(next)).toEqual([]);
    const currentConfiguration = {
      plans: { status: "complete", revision: "plan-rev-1" },
      meters: { status: "unavailable" },
    };
    expect(assessResume(next, {
      "src/paid.ts": "a".repeat(64),
      "src/new.ts": "absent",
    }, currentConfiguration).requires_review).toBe(false);
    expect(assessResume(next, { "src/paid.ts": "a".repeat(64) }, currentConfiguration).drift)
      .toContain("source file not rechecked: src/new.ts");
    expect(assessResume(next, {
      "src/paid.ts": "a".repeat(64),
      "src/new.ts": "b".repeat(64),
    }, currentConfiguration).drift).toContain("source file changed: src/new.ts");
  });

  test("detects revision drift in an incomplete family", () => {
    const next = structuredClone(record);
    Object.assign(next.configuration.meters, { status: "incomplete", reason: "partial", revision: "r1" });
    expect(assessResume(next, { "src/paid.ts": "a".repeat(64) }, {
      plans: { status: "complete", revision: "plan-rev-1" },
      meters: { status: "incomplete", revision: "r2" },
    }).drift).toContain("configuration changed: meters");
  });

  test("rejects missing hashes for approved paths and common credential forms", () => {
    const unsafe = structuredClone(record) as Record<string, any>;
    unsafe.approved_scope.included_paths.push("src/other.ts");
    unsafe.clientSecret = "abc";
    unsafe.authToken = "opaque";
    unsafe.apiToken = "opaque";
    unsafe.tasks[0].evidence = "paste sk_live_123";
    expect(validateIntegrationRecord(unsafe)).toEqual(expect.arrayContaining([
      "source_files must cover included paths",
      "record contains forbidden credential field clientSecret",
      "record contains forbidden credential field authToken",
      "record contains forbidden credential field apiToken",
      "record contains credential-like text",
    ]));
  });

  test("rejects paths outside the selected repository", () => {
    const unsafe = structuredClone(record);
    unsafe.approved_scope.included_paths = ["../other-app/src/paid.ts"];
    unsafe.source_files = [{ path: "/tmp/paid.ts", sha256: "a".repeat(64) }];
    expect(validateIntegrationRecord(unsafe)).toEqual(expect.arrayContaining([
      "approved_scope contains a path outside the repository",
      "source_files contains a path outside the repository",
    ]));
  });
});

describe("setup plan", () => {
  test("keeps manual setup separate from verified code", () => {
    expect(validateSetupPlan({
      schema: "nozle.setup-plan",
      version: 1,
      items: [
        { id: "create-meter", status: "manual_pending", instructions: "Create document meter in dashboard" },
        { id: "wire-event", status: "code_verified", evidence: "local mock event matched" },
      ],
    })).toEqual([]);
  });

  test("does not label an item verified without evidence", () => {
    expect(validateSetupPlan({
      schema: "nozle.setup-plan",
      version: 1,
      items: [{ id: "wire-event", status: "code_verified" }],
    })).toContain("setup item wire-event is verified without evidence");
  });

  test("rejects credential-like text in manual instructions", () => {
    expect(validateSetupPlan({
      schema: "nozle.setup-plan",
      version: 1,
      items: [{ id: "key", status: "manual_pending", instructions: "paste sk_live_123" }],
    })).toContain("setup plan contains credential-like text");
  });
});

describe("task dependencies in the record", () => {
  const base = () => ({
    schema: "nozle.integration",
    version: 1,
    organization_id: "org_example",
    selected_goals: [5],
    configuration: { meters: { status: "complete", revision: "r1" } },
    approved_scope: {
      approved_at: "2026-10-10T10:00:00Z",
      included_paths: ["src/a.ts"],
      excluded_operations: ["copilot"],
      billing_rules: ["bill once"],
    },
    source_files: [{ path: "src/a.ts", sha256: "absent" }],
    tasks: [
      { id: "identity", status: "pending" },
      { id: "meter", status: "pending", depends_on: ["identity"] },
    ],
    decisions: [],
    peers: [],
    self_review: Object.fromEntries(reviewChecks.map((check) => [check, { result: "pass", evidence: "src/a.ts:1" }])),
  });

  test("accepts ordered tasks", () => {
    expect(validateIntegrationRecord(base())).toEqual([]);
  });

  test("rejects an unknown dependency and work done before its prerequisite", () => {
    const record = base();
    record.tasks[1] = { id: "meter", status: "active", depends_on: ["identity", "ghost"] };
    expect(validateIntegrationRecord(record)).toEqual(expect.arrayContaining([
      "task meter depends on unknown task ghost",
      "task meter is active before dependency identity",
    ]));
  });

  test("flags Nozle secret keys", () => {
    const record = base();
    record.tasks[0] = { id: "identity", status: "pending", note: "sk_nozle_abcdef123456" } as never;
    expect(validateIntegrationRecord(record)).toContain("record contains credential-like text");
  });
});

describe("blocked integrations and YAML problems", () => {
  const blocked = { schema: "nozle.integration", version: 1, organization_id: "o", selected_goals: [5], blocked: { reason: "no server identity" }, decisions: [], peers: [] };
  test("a blocked record needs only a reason and decisions", () => {
    expect(validateIntegrationRecord(blocked)).toEqual([]);
    expect(validateIntegrationRecord({ ...blocked, blocked: {} })[0]).toContain("blocked needs a reason");
    const { decisions: _, ...without } = blocked;
    expect(validateIntegrationRecord(without)[0]).toContain("decisions must be a list");
  });
  test("a parse error names the line and the fix", async () => {
    const { yamlProblem } = await import("../src/record.ts");
    const YAML = (await import("yaml")).default;
    try { YAML.parse("items:\n  - note: a: b\n"); } catch (error) {
      expect(yamlProblem(error)).toMatch(/at line 2, column \d+/);
      expect(yamlProblem(error)).toContain("double quotes");
    }
  });
});

describe("peers and interfaces", () => {
  const base = { schema: "nozle.integration", version: 1, organization_id: "o", selected_goals: [5], blocked: { reason: "waiting for the backend" }, decisions: [], peers: [] };
  test("accepts a backend contract and a frontend consumer", () => {
    expect(validateIntegrationRecord({ ...base, peers: [{ role: "backend", location: "../api", record_seen: true }], interfaces: [
      { id: "balance", method: "GET", route: "/billing/credits", provides: true, status: "provided" },
      { id: "plans", method: "GET", route: "/billing/plans", consumes: true, status: "unmatched" },
    ] })).toEqual([]);
  });
  test("rejects a bad role, a missing seen flag, both or neither direction, and an unknown status", () => {
    expect(validateIntegrationRecord({ ...base, peers: [{ role: "mobile", location: "x", record_seen: true }] })[0]).toContain("peers entries");
    expect(validateIntegrationRecord({ ...base, peers: [{ role: "backend", location: "x" }] })[0]).toContain("peers entries");
    expect(validateIntegrationRecord({ ...base, interfaces: [{ id: "a", method: "GET", route: "/a", status: "provided" }] })[0]).toContain("interfaces entries");
    expect(validateIntegrationRecord({ ...base, interfaces: [{ id: "a", method: "GET", route: "/a", provides: true, consumes: true, status: "provided" }] })[0]).toContain("interfaces entries");
    expect(validateIntegrationRecord({ ...base, interfaces: [{ id: "a", method: "GET", route: "/a", provides: true, status: "done" }] })[0]).toContain("interfaces entries");
  });
});
