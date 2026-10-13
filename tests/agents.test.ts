import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

const dir = join(import.meta.dir, "../agents");
const agent = (name: string) => YAML.parse(readFileSync(join(dir, `${name}.md`), "utf8").split("---")[1]);
const writers = ["Write", "Edit", "NotebookEdit"];

describe("subagents", () => {
  test("ships the scanner, mapper, and verifier with matching names", () => {
    expect(readdirSync(dir).sort()).toEqual(["nozle-mapper.md", "nozle-scanner.md", "nozle-verifier.md"]);
    for (const name of ["nozle-scanner", "nozle-mapper", "nozle-verifier"]) {
      expect(agent(name).name).toBe(name);
      expect(agent(name).description.length).toBeGreaterThan(20);
    }
  });

  test("the scanner can only read", () => {
    expect(agent("nozle-scanner").tools.split(", ")).toEqual(["Read", "Grep", "Glob"]);
  });

  test("the mapper cannot write or run commands, and keeps access to Nozle read tools", () => {
    const mapper = agent("nozle-mapper");
    expect(mapper.tools).toBeUndefined();
    expect(mapper.disallowedTools.split(", ")).toEqual(expect.arrayContaining([...writers, "Bash"]));
  });

  test("the verifier can run tests but never edit", () => {
    const tools = agent("nozle-verifier").tools.split(", ");
    expect(tools).toContain("Bash");
    for (const tool of writers) expect(tools).not.toContain(tool);
  });
});
