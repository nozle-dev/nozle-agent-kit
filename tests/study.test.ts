import { describe, expect, test } from "bun:test";
import { studyDrift, validateStudy } from "../src/study.ts";

const hash = "a".repeat(64);
const study = {
  schema: "nozle.study", version: 1,
  account_read: { status: "not_read" },
  stack: { backend_path: "rest", runtime: "workers" },
  activities: [{ id: "render", label: "Render an image", location: "src/index.ts:128", status: "suggested" }],
  findings: [{ id: "paid-tier-hole", text: "tier=pro accepted without payment", location: "src/index.ts:220" }],
  source_files: [{ path: "src/index.ts", sha256: hash }, { path: "src/new.ts", sha256: "absent" }],
};

describe("study", () => {
  test("a study with no account read is valid and says so", () => {
    expect(validateStudy(study)).toEqual([]);
  });
  test("read needs a timestamp; statuses and paths are checked", () => {
    expect(validateStudy({ ...study, account_read: { status: "read" } })[0]).toContain("read_at");
    expect(validateStudy({ ...study, account_read: { status: "later" } })[0]).toContain("account_read.status");
    expect(validateStudy({ ...study, activities: [{ id: "x", label: "y", location: "z", status: "maybe" }] })[0]).toContain("activities entries");
    expect(validateStudy({ ...study, source_files: [{ path: "../x", sha256: hash }] })[0]).toContain("outside the repository");
    expect(validateStudy({ ...study, schema: "other" })[0]).toContain("nozle.study");
  });
  test("drift names changed, created and removed files and leaves the rest alone", () => {
    expect(studyDrift(study, { "src/index.ts": hash, "src/new.ts": "absent" })).toEqual([]);
    expect(studyDrift(study, { "src/index.ts": "b".repeat(64), "src/new.ts": hash })).toEqual(["src/index.ts: changed", "src/new.ts: now exists"]);
    expect(studyDrift(study, { "src/index.ts": "absent", "src/new.ts": "absent" })).toEqual(["src/index.ts: was removed"]);
  });
});
