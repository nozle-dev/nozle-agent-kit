import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

const root = join(import.meta.dir, "..");
const skillNames = ["nozle-add", "nozle-audit", "nozle-doctor", "nozle-integrate", "nozle-resume", "nozle-setup", "nozle-status", "nozle-undo", "nozle-verify"];

describe("skills", () => {
  test("ships exactly the nine skills", () => {
    expect(readdirSync(join(root, "skills")).sort()).toEqual(skillNames);
  });

  for (const name of skillNames) {
    const dir = join(root, "skills", name);
    const source = readFileSync(join(dir, "SKILL.md"), "utf8");

    test(`${name} has matching frontmatter and a trigger description`, () => {
      const front = YAML.parse(source.split("---")[1]);
      expect(front.name).toBe(name);
      expect(front.description).toStartWith("Use when");
    });

    test(`${name} links only references it ships and carries the shared copies`, () => {
      for (const link of source.matchAll(/\]\((references\/[^)]+)\)/g)) {
        expect(existsSync(join(dir, link[1]))).toBe(true);
      }
      for (const file of readdirSync(join(root, "shared/references"), { recursive: true }).filter((entry) => String(entry).endsWith(".md"))) {
        expect(readFileSync(join(dir, "references", file), "utf8"))
          .toBe(readFileSync(join(root, "shared/references", file), "utf8"));
      }
      expect(readFileSync(join(dir, "scripts/nozle-check.mjs"), "utf8"))
        .toBe(readFileSync(join(root, "shared/scripts/nozle-check.mjs"), "utf8"));
    });
  }

  test("every menu choice has a guide whose title matches it", () => {
    const menu = readFileSync(join(root, "shared/references/capability-menu.md"), "utf8");
    const rows = [...menu.matchAll(/^\| (\d+) \| ([^|]+) \|/gm)].map((match) => [Number(match[1]), match[2].trim()] as const);
    expect(rows).toHaveLength(10);

    for (const [id, label] of rows) {
      const file = readdirSync(join(root, "shared/references/capabilities")).find((name) => name.startsWith(String(id).padStart(2, "0")));
      expect(file).toBeDefined();
      expect(readFileSync(join(root, "shared/references/capabilities", file!), "utf8")).toStartWith(`# ${id}. ${label}\n`);
    }
  });
});
