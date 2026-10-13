import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { versionsIn } from "../scripts/release.ts";

const root = join(import.meta.dir, "..");

describe("release", () => {
  test("every manifest carries the same version", () => {
    const versions = versionsIn(root);
    expect(new Set(Object.values(versions)).size).toBe(1);
  });

  test("the current version is described in the changelog", () => {
    const version = versionsIn(root)["plugin.json"];
    expect(readFileSync(join(root, "CHANGELOG.md"), "utf8")).toContain(`## [${version}]`);
  });
});
