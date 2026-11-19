// The kit delegates API facts to the Nozle docs and the SDKs. This test keeps that delegation honest:
// every docs page, error code and SDK method the kit still names must exist in the current docs and SDKs.
//   NOZLE_DOCS_DIR      a NozleDocs checkout (default: ~/Code/NozleDocs at origin/main)
//   NOZLE_SDK_NODE_DIR, NOZLE_SDK_PYTHON_DIR, NOZLE_SDK_GO_DIR   SDK source folders (CI checkouts);
//   without them, ~/Code/nozle-js, ~/Code/nozle-python and ~/Code/nozle-go are read at origin/main.
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const home = homedir();
/** NOZLE_DOCS_DIR as is; otherwise the pages of ~/Code/NozleDocs at origin/main, unpacked once into a temporary folder. */
function docsFolder(): string {
  if (process.env.NOZLE_DOCS_DIR) return process.env.NOZLE_DOCS_DIR;
  const repo = join(home, "Code/NozleDocs");
  if (!existsSync(join(repo, ".git"))) return repo;
  const out = mkdtempSync(join(tmpdir(), "nozle-docs-"));
  const archive = spawnSync("git", ["-C", repo, "archive", "origin/main", "docs.json", "api", "guides", "sdks", "integrations", "billing-api"], { maxBuffer: 512 * 1024 * 1024 });
  if (archive.status !== 0) return repo;
  spawnSync("tar", ["-x", "-C", out], { input: archive.stdout });
  return out;
}
const docsDir = docsFolder();
afterAll(() => {
  if (docsDir.startsWith(tmpdir())) rmSync(docsDir, { recursive: true, force: true });
});

const kitFiles = [
  ...readdirSync(join(root, "shared/references"), { recursive: true }).map(String).filter((f) => f.endsWith(".md")).map((f) => join(root, "shared/references", f)),
  ...readdirSync(join(root, "skills")).map((s) => join(root, "skills", s, "SKILL.md")),
  ...readdirSync(join(root, "agents")).map((a) => join(root, "agents", a)),
];
const kitText = kitFiles.map((file) => readFileSync(file, "utf8")).join("\n");

const unique = (values: string[]) => [...new Set(values)].sort();
/** `/api/events#late-events` and `/sdks/<lang>/errors` as written in the kit; `<lang>` stands for each server SDK. */
const docRefs = unique([...kitText.matchAll(/`(\/(?:api|guides|sdks|integrations|billing-api)\/[\w<>/-]+(?:#[\w-]+)?)`/g)].map((m) => m[1]!))
  .flatMap((ref) => (ref.includes("<lang>") ? ["node", "python", "go"].map((lang) => ref.replace("<lang>", lang)) : [ref]));
/** `409 period_invoiced`: a status and a code in one span. */
const codeRefs = unique([...kitText.matchAll(/`[1-5]\d\d ([a-z][a-z_]+)`/g)].map((m) => m[1]!));
/** `nozle.usage.track()`: an SDK method. */
const sdkRefs = unique([...kitText.matchAll(/`nozle\.([\w.]+)\(\)`/g)].map((m) => m[1]!));

function navPages(): Set<string> {
  const pages = new Set<string>();
  const walk = (node: unknown): void => {
    if (typeof node === "string") pages.add(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) if (!["openapi", "href", "icon"].includes(key)) walk(value);
  };
  walk(JSON.parse(readFileSync(join(docsDir, "docs.json"), "utf8")).navigation);
  return pages;
}

/** Mintlify's heading anchor: lowercase, punctuation dropped, spaces to hyphens. */
const slug = (heading: string) => heading.toLowerCase().replace(/[`*_]/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

describe.skipIf(!existsSync(join(docsDir, "docs.json")))(`docs the kit names exist in ${docsDir}`, () => {
  const nav = navPages();
  const page = (path: string) => readFileSync(join(docsDir, `${path}.mdx`), "utf8");

  test("the kit names docs pages, codes and SDK methods (the extractors still match the writing convention)", () => {
    expect(docRefs.length).toBeGreaterThan(20);
    expect(codeRefs).toContain("period_invoiced");
    expect(sdkRefs.length).toBeGreaterThan(0);
  });

  for (const ref of docRefs) {
    test(`${ref} is a page in the docs navigation`, () => {
      const [path, anchor] = ref.slice(1).split("#") as [string, string | undefined];
      expect(nav.has(path) ? path : `${path} (not in docs.json navigation, so the docs MCP does not serve it)`).toBe(path);
      expect(existsSync(join(docsDir, `${path}.mdx`))).toBe(true);
      if (anchor) {
        const anchors = [...page(path).matchAll(/^#{2,4}\s+(.+)$/gm)].map((m) => slug(m[1]!));
        expect(anchors).toContain(anchor);
      }
    });
  }

  test("every error code the kit names is documented on a page in the navigation", () => {
    const text = [...nav].filter((p) => existsSync(join(docsDir, `${p}.mdx`))).map(page).join("\n");
    expect(codeRefs.filter((code) => !text.includes(code))).toEqual([]);
  });
});

type Sdk = { name: string; env: string; repo: string; paths: string[] };
const sdks: Sdk[] = [
  { name: "node", env: "NOZLE_SDK_NODE_DIR", repo: join(home, "Code/nozle-js"), paths: ["packages/node/src"] },
  { name: "python", env: "NOZLE_SDK_PYTHON_DIR", repo: join(home, "Code/nozle-python"), paths: ["nozle"] },
  { name: "go", env: "NOZLE_SDK_GO_DIR", repo: join(home, "Code/nozle-go"), paths: ["."] },
];
const normal = (name: string) => name.toLowerCase().replace(/_/g, "");

/**
 * Identifiers in an SDK's latest source, or undefined when it is not available here.
 * shortcut: a method passes when its last name appears anywhere in the source, so a removed method whose name is still used elsewhere is missed; parse the exported types if that bites.
 */
function identifiers(sdk: Sdk): Set<string> | undefined {
  const dir = process.env[sdk.env];
  let source: string;
  if (dir) {
    if (!existsSync(dir)) return undefined;
    source = readdirSync(dir, { recursive: true }).map(String)
      .filter((f) => /\.(ts|py|pyi|go)$/.test(f) && !/(test|__tests__)/.test(f))
      .map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  } else {
    if (!existsSync(join(sdk.repo, ".git"))) return undefined;
    const out = spawnSync("git", ["-C", sdk.repo, "grep", "-h", "-I", "-o", "-E", "[A-Za-z_][A-Za-z0-9_]*", "origin/main", "--", ...sdk.paths, ":!*test*"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    if (out.status !== 0) return undefined;
    source = out.stdout;
  }
  return new Set([...source.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)].map((m) => normal(m[0])));
}

describe("SDK methods the kit names exist in the latest SDKs", () => {
  const sets = sdks.map((sdk) => ({ sdk, ids: identifiers(sdk) }));
  const available = sets.filter((s) => s.ids);
  if (!available.length) {
    test.skip("no SDK source found (set NOZLE_SDK_NODE_DIR, NOZLE_SDK_PYTHON_DIR or NOZLE_SDK_GO_DIR)", () => {});
    return;
  }
  for (const { sdk, ids } of sets) if (!ids) test.skip(`${sdk.name} SDK source not found; set ${sdk.env}`, () => {});
  for (const ref of sdkRefs) {
    test(`nozle.${ref}() exists in every available SDK`, () => {
      const method = normal(ref.split(".").pop()!);
      // Go names a namespaced call by its verb and noun (usage.track is TrackUsage), so Go is matched on either order.
      const goName = normal(ref.split(".").reverse().join(""));
      const missing = available.filter(({ sdk, ids }) => !(ids!.has(method) || (sdk.name === "go" && ids!.has(goName))));
      expect(missing.map(({ sdk }) => sdk.name)).toEqual([]);
    });
  }
});
