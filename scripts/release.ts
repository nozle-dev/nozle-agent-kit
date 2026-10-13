// Sets the plugin version in every manifest at once. Claude Code and Codex cache an installed plugin
// by its version, so a release that keeps the old number never reaches users who already have it.
//   bun scripts/release.ts 1.0.1
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const manifests = ["plugin.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", "package.json"];
const semver = /^(\d+)\.(\d+)\.(\d+)$/;

export function versionsIn(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of manifests) {
    const json = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const plugins = json.plugins as { name: string; version?: string }[] | undefined;
    out[file] = plugins ? String(plugins.find((p) => p.name === "nozle-agent-kit")?.version) : String(json.version);
  }
  return out;
}

const newer = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.match(semver)!.slice(1).map(Number));
  return x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2];
};

if (import.meta.main) {
  const next = process.argv[2] ?? "";
  if (!semver.test(next)) throw new Error("usage: bun scripts/release.ts <major.minor.patch>");
  const current = versionsIn(root)["plugin.json"]!;
  if (!newer(next, current)) throw new Error(`${next} is not newer than the current version ${current}`);
  if (!readFileSync(join(root, "CHANGELOG.md"), "utf8").includes(`## [${next}]`)) {
    throw new Error(`CHANGELOG.md has no "## [${next}]" section; describe the release first`);
  }
  for (const file of manifests) {
    const path = join(root, file);
    const json = JSON.parse(readFileSync(path, "utf8"));
    if (Array.isArray(json.plugins)) {
      for (const plugin of json.plugins) if (plugin.name === "nozle-agent-kit") plugin.version = next;
    } else {
      json.version = next;
    }
    writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  }
  console.log(`version ${current} -> ${next} in ${manifests.join(", ")}`);
}
