import { describe, expect, test } from "bun:test";
import YAML from "yaml";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDocument, planDocument, progressDocument, resumeDocument } from "../src/check.ts";

describe("installed record checker", () => {
  test("accepts a valid setup plan written as YAML", () => {
    const source = `schema: nozle.setup-plan
version: 1
items:
  - id: create-meter
    status: manual_pending
    instructions: Create the meter in the dashboard
`;
    expect(checkDocument(source, "nozle-setup-plan.yaml")).toEqual([]);
  });

  test("rejects a false verified claim", () => {
    const source = `schema: nozle.setup-plan
version: 1
items:
  - id: meter
    status: code_verified
`;
    expect(checkDocument(source, "nozle-setup-plan.yaml")).toContain(
      "setup item meter is verified without evidence",
    );
  });

  test("reports malformed YAML and unknown artifact names", () => {
    expect(checkDocument("items: [", "nozle-setup-plan.yaml")[0]).toStartWith("invalid YAML");
    expect(checkDocument("{}", "other.yaml")).toEqual(["unsupported artifact other.yaml"]);
  });
});

describe("plan and progress commands", () => {
  const input = `selected_goals: [2, 5]
tasks:
  - { id: checkout, label: Add checkout, goals: [2], depends_on: [identity] }
  - { id: identity, label: Map identity, goals: [2] }
  - { id: identity, label: Map identity, goals: [5] }
  - { id: meter, label: Track usage, goals: [5], depends_on: [identity] }
`;

  test("orders tasks by dependency and merges shared prerequisites", () => {
    const out = YAML.parse(planDocument(input));
    expect(out.tasks.map((task: { id: string }) => task.id)).toEqual(["identity", "checkout", "meter"]);
    expect(out.tasks[0]).toMatchObject({ goals: [2, 5], status: "pending" });
  });

  test("reports a cycle instead of a plan", () => {
    expect(() => planDocument(`selected_goals: [5]
tasks:
  - { id: a, label: A, goals: [5], depends_on: [b] }
  - { id: b, label: B, goals: [5], depends_on: [a] }
`)).toThrow("Task dependencies contain a cycle");
  });

  test("prints a checklist with the count, blockers, and next step", () => {
    const text = progressDocument(`selected_goals: [5]
tasks:
  - { id: identity, label: Map identity, status: failed, reason: unresolved }
  - { id: meter, label: Track usage, status: pending, depends_on: [identity] }
  - { id: report, label: Write report, status: pending }
`);
    expect(text).toBe(`0/3 completed
[!] identity: Map identity (unresolved)
[!] meter: Track usage (blocked by identity)
[ ] report: Write report
next: report
`);
  });
});

describe("resume command", () => {
  const record = (hash: string, revision: string) => `schema: nozle.integration
version: 1
organization_id: org_example
selected_goals: [5]
decisions: [{ id: goals, question: Which goals?, answer: "5", basis: user }]
configuration:
  meters: { status: complete, revision: ${revision} }
approved_scope:
  approved_at: 2026-10-10T10:00:00Z
  included_paths: [src/a.ts]
  excluded_operations: [copilot]
  billing_rules: [bill once]
source_files:
  - { path: src/a.ts, sha256: "${hash}" }
tasks:
  - { id: identity, status: pending }
`;

  test("reports no drift, then changed files and configuration", () => {
    const root = mkdtempSync(join(tmpdir(), "nozle-resume-"));
    try {
      mkdirSync(join(root, "src"));
      writeFileSync(join(root, "src/a.ts"), "one");
      const hash = createHash("sha256").update("one").digest("hex");
      const config = "meters: { status: complete, revision: r1 }\n";
      expect(resumeDocument(record(hash, "r1"), root, config)).toEqual({ requires_review: false, drift: [] });

      writeFileSync(join(root, "src/a.ts"), "two");
      const drift = resumeDocument(record(hash, "r1"), root, "meters: { status: complete, revision: r2 }\n").drift;
      expect(drift).toEqual(["source file changed: src/a.ts", "configuration changed: meters"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("never trusts a path outside the repository", () => {
    const root = mkdtempSync(join(tmpdir(), "nozle-resume-"));
    try {
      const result = resumeDocument(record("absent", "r1").replace("src/a.ts", "../a.ts"), root, "meters: { status: complete, revision: r1 }\n");
      expect(result.requires_review).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

import { hashDocument } from "../src/check.ts";
import { mkdtempSync as mkHashDir, writeFileSync as writeHashFile } from "node:fs";
import { tmpdir as hashTmp } from "node:os";
import { join as hashJoin } from "node:path";

describe("hash", () => {
  test("prints a source_files block with absent for new files and refuses paths outside", () => {
    const root = mkHashDir(hashJoin(hashTmp(), "nozle-hash-"));
    writeHashFile(hashJoin(root, "a.ts"), "one");
    const out = hashDocument(root, ["a.ts", "new.ts"]);
    expect(out).toContain("path: a.ts");
    expect(out).toContain("7692c3ad3540bb803c020b3aee66cd8887123234ea0c6e7143c0add73ff431ed");
    expect(out).toContain("sha256: absent");
    expect(() => hashDocument(root, ["../x"])).toThrow("outside the repository");
  });
});
