// Each skill is installable on its own (`skills add --skill X --copy` copies only its directory),
// so it carries copies of the shared references it reads and of the checker. Only the references a skill
// reaches (from its SKILL.md, then from those references, by file name) are copied, so a skill ships no
// reference it never opens.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const shared = join(root, "shared/references");

/** Reference paths (relative to shared/references) a text names: `financial-rules.md`, or `capabilities/` for the whole folder. */
function named(text: string): string[] {
  const all = readdirSync(shared, { recursive: true }).map(String).filter((file) => file.endsWith(".md"));
  return all.filter((file) => {
    const base = file.split("/").pop()!;
    return text.includes(base) || (file.startsWith("capabilities/") && text.includes("capabilities/"));
  });
}

/** Every shared reference reachable from a skill's SKILL.md, following names inside references. */
export function referencesFor(skillText: string): string[] {
  const seen = new Set<string>();
  const queue = named(skillText);
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...named(readFileSync(join(shared, file), "utf8")));
  }
  return [...seen].sort();
}

/** The first-event script is copied only where the skill or a reference it reads tells the user to run it. */
export function scriptsFor(skillText: string, references: string[]): string[] {
  const scripts = readdirSync(join(root, "shared/scripts"));
  const firstEvent = [skillText, ...references.map((file) => readFileSync(join(shared, file), "utf8"))].some((text) => text.includes("nozle-first-event.mjs"));
  return scripts.filter((name) => name !== "nozle-first-event.mjs" || firstEvent);
}

if (import.meta.main) {
  for (const skill of readdirSync(join(root, "skills"), { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const dir = join(root, "skills", skill.name);
    rmSync(join(dir, "references"), { recursive: true, force: true });
    rmSync(join(dir, "scripts"), { recursive: true, force: true });
    mkdirSync(join(dir, "scripts"), { recursive: true });
    const skillText = readFileSync(join(dir, "SKILL.md"), "utf8");
    const references = referencesFor(skillText);
    for (const file of references) {
      mkdirSync(join(dir, "references", file, ".."), { recursive: true });
      cpSync(join(shared, file), join(dir, "references", file));
    }
    for (const name of scriptsFor(skillText, references)) cpSync(join(root, "shared/scripts", name), join(dir, "scripts", name));
  }
}
