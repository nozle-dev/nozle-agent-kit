import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectManifests } from "../src/check.ts";
import { detectEnvironment, renderEnvironment } from "../src/env.ts";

const pkg = (value: object) => JSON.stringify(value);

describe("detectEnvironment", () => {
  test("React with Vite and no server: React SDK in the browser, no server for secret keys", () => {
    const env = detectEnvironment({ "package.json": pkg({ type: "module", dependencies: { react: "^19.0.0" }, devDependencies: { vite: "^7" } }) });
    expect(env.frontend.path).toBe("react-sdk");
    expect(env.backend.path).toBe("no-server");
    expect(env.runtime).toBe("static");
  });

  test("Next.js is both halves: Node SDK on the server, React SDK in components", () => {
    const env = detectEnvironment({ "package.json": pkg({ dependencies: { next: "15", react: "19" } }) });
    expect(env.backend.path).toBe("node-sdk");
    expect(env.frontend.path).toBe("react-sdk");
    expect(env.backend.reasons.join(" ")).toContain("both ESM and CommonJS");
    expect(env.backend.reasons.join(" ")).not.toContain("dynamic");
  });

  test("SvelteKit with adapter-auto: native components, Node SDK only conditionally", () => {
    const env = detectEnvironment({ "package.json": pkg({ type: "module", devDependencies: { "@sveltejs/kit": "2", svelte: "5", "@sveltejs/adapter-auto": "6" } }) });
    expect(env.frontend.path).toBe("native-components");
    expect(env.frontend.reasons.join(" ")).toContain("No Nozle SDK for");
    expect(env.backend.path).toBe("node-sdk");
    expect(env.unknowns.join(" ")).toContain("adapter-auto");
    expect(env.backend.reasons.join(" ")).toContain("edge runtime");
  });

  test("SvelteKit on Cloudflare goes through REST; with adapter-node it uses the Node SDK; static has no server", () => {
    const sk = (adapter: string) => detectEnvironment({ "package.json": pkg({ type: "module", devDependencies: { "@sveltejs/kit": "2", svelte: "5", [adapter]: "1" } }) });
    expect(sk("@sveltejs/adapter-cloudflare").backend.path).toBe("rest");
    expect(sk("@sveltejs/adapter-node").backend.path).toBe("node-sdk");
    expect(sk("@sveltejs/adapter-static").backend.path).toBe("no-server");
  });

  test("Astro: static by default, SSR with the node adapter, React island option", () => {
    const astro = (deps: object, config = "export default {}") => detectEnvironment({ "package.json": pkg({ type: "module", dependencies: { astro: "7", ...deps } }), "astro.config.mjs": config });
    const stat = astro({});
    expect(stat.runtime).toBe("static");
    expect(stat.backend.path).toBe("no-server");
    expect(stat.frontend.path).toBe("native-components");
    const ssr = astro({ "@astrojs/node": "9", "@astrojs/react": "4" }, "export default { adapter: node() }");
    expect(ssr.backend.path).toBe("node-sdk");
    expect(ssr.frontend.reasons.join(" ")).toContain("React island");
  });

  test("a static Astro site with a wrangler file is still static, not Workers", () => {
    const env = detectEnvironment({ "package.json": pkg({ type: "module", dependencies: { astro: "7" } }), "astro.config.ts": "export default defineConfig({})", "wrangler.jsonc": "{}" });
    expect(env.runtime).toBe("static");
    expect(env.backend.path).toBe("no-server");
  });

  test("a server framework named only in dependencies asks the agent to confirm the code exists", () => {
    const env = detectEnvironment({ "package.json": pkg({ dependencies: { express: "5", react: "19" }, devDependencies: { vite: "7" } }) });
    expect(env.backend.reasons.join(" ")).toContain("confirm the server code");
  });

  test("Vue, Nuxt and Angular have no Nozle SDK", () => {
    expect(detectEnvironment({ "package.json": pkg({ dependencies: { vue: "3" } }) }).frontend.path).toBe("native-components");
    expect(detectEnvironment({ "package.json": pkg({ dependencies: { nuxt: "3", vue: "3" } }) }).backend.path).toBe("node-sdk");
    expect(detectEnvironment({ "package.json": pkg({ dependencies: { "@angular/core": "19" } }) }).frontend.path).toBe("native-components");
  });

  test("Python backends use the Python SDK; a manifest-less folder is reported, not guessed", () => {
    const env = detectEnvironment({ "backend/requirements.txt": "fastapi==0.115\nuvicorn\nnozle-sdk==0.9.0\n" });
    expect(env.languages).toEqual(["python"]);
    expect(env.backend.path).toBe("python-sdk");
    expect(env.nozlePackages).toEqual([{ name: "nozle-sdk", spec: "==0.9.0" }]);
    expect(env.targets).toEqual(["backend"]);
    const empty = detectEnvironment({});
    expect(empty.runtime).toBe("none");
    expect(empty.backend.path).toBe("none");
    expect(empty.unknowns.join(" ")).toContain("new project");
  });

  test("a Python server with no manifest is still a Python backend", () => {
    const env = detectEnvironment({ "frontend/package.json": pkg({ dependencies: { react: "19", vite: "6" } }), "backend/main.py": "from fastapi import FastAPI\napp = FastAPI()" });
    expect(env.backend.path).toBe("python-sdk");
    expect(env.unknowns.join(" ")).toContain("no requirements.txt or pyproject.toml");
  });

  test("Go uses the Go SDK", () => {
    const env = detectEnvironment({ "go.mod": "module x" });
    expect(env.backend.path).toBe("go-sdk");
    expect(env.backend.reasons.join(" ")).toContain("nozle-go");
  });

  test("Ruby, PHP and Java use the REST API", () => {
    for (const [file, language] of [["Gemfile", "ruby"], ["composer.json", "php"], ["pom.xml", "java"]] as const) {
      const env = detectEnvironment({ [file]: file === "composer.json" ? "{}" : "x" });
      expect(env.languages).toContain(language);
      expect(env.backend.path).toBe("rest");
      expect(env.backend.reasons.join(" ")).toContain("No Nozle SDK");
    }
  });

  test("Workers use REST", () => {
    const env = detectEnvironment({ "package.json": pkg({ dependencies: { hono: "4" }, devDependencies: { wrangler: "4" } }), "wrangler.toml": "name='x'" });
    expect(env.runtime).toBe("workers");
    expect(env.backend.path).toBe("rest");
  });

  test("full-stack folder reports both halves and its targets", () => {
    const env = detectEnvironment({ "requirements.txt": "fastapi\n", "frontend/package.json": pkg({ dependencies: { react: "19" }, devDependencies: { vite: "7" } }) });
    expect(env.backend.path).toBe("python-sdk");
    expect(env.frontend.path).toBe("react-sdk");
    expect(env.targets).toEqual([".", "frontend"]);
    expect(env.runtime).not.toBe("static");
  });

  test("lockfile state: in sync, out of sync, missing", () => {
    const manifest = pkg({ dependencies: { a: "^1" }, devDependencies: { b: "^2" } });
    const lock = (deps: object) => pkg({ packages: { "": { dependencies: deps, devDependencies: { b: "^2" } } } });
    expect(detectEnvironment({ "package.json": manifest, "package-lock.json": lock({ a: "^1" }) }).lockfile).toBe("in_sync");
    expect(detectEnvironment({ "package.json": manifest, "package-lock.json": lock({}) }).lockfile).toBe("out_of_sync");
    expect(detectEnvironment({ "package.json": manifest }).lockfile).toBe("missing");
    expect(detectEnvironment({ "package.json": manifest, "pnpm-lock.yaml": "" }).packageManager).toBe("pnpm");
  });

  test("an installed Nozle package is reported with its pin", () => {
    const env = detectEnvironment({ "package.json": pkg({ dependencies: { "@nozle-js/node": "0.9.0", express: "5" } }) });
    expect(env.nozlePackages).toEqual([{ name: "@nozle-js/node", spec: "0.9.0" }]);
  });

  test("a React version below 18 is flagged", () => {
    const env = detectEnvironment({ "package.json": pkg({ dependencies: { react: "^17.0.2" } }) });
    expect(env.frontend.reasons.join(" ")).toContain("below the SDK minimum");
  });

  test("renderEnvironment prints every field", () => {
    const text = renderEnvironment(detectEnvironment({ "package.json": pkg({ dependencies: { next: "15", react: "19" }, scripts: { build: "x" } }) }));
    for (const label of ["targets", "frameworks", "package manager", "runtime", "backend path", "frontend path"]) expect(text).toContain(label);
  });
});

describe("collectManifests", () => {
  test("reads manifests two levels deep and skips dependency folders", () => {
    const root = mkdtempSync(join(tmpdir(), "nozle-env-"));
    mkdirSync(join(root, "frontend"), { recursive: true });
    mkdirSync(join(root, "node_modules", "x"), { recursive: true });
    mkdirSync(join(root, "a", "b", "c"), { recursive: true });
    writeFileSync(join(root, "requirements.txt"), "fastapi\n");
    writeFileSync(join(root, "frontend", "package.json"), "{}");
    writeFileSync(join(root, "node_modules", "x", "package.json"), "{}");
    writeFileSync(join(root, "a", "b", "c", "package.json"), "{}");
    writeFileSync(join(root, "astro.config.mjs"), "export default {}");
    expect(Object.keys(collectManifests(root)).sort()).toEqual(["astro.config.mjs", "frontend/package.json", "requirements.txt"]);
  });
});

describe("nozle-check env", () => {
  test("prints JSON for a directory through the built CLI", () => {
    const root = mkdtempSync(join(tmpdir(), "nozle-env-cli-"));
    writeFileSync(join(root, "package.json"), pkg({ type: "module", devDependencies: { "@sveltejs/kit": "2", svelte: "5" } }));
    const run = Bun.spawnSync(["bun", join(import.meta.dir, "../src/check.ts"), "env", root, "--json"]);
    const out = JSON.parse(run.stdout.toString());
    expect(run.exitCode).toBe(0);
    expect(out.frontend.path).toBe("native-components");
    const missing = Bun.spawnSync(["bun", join(import.meta.dir, "../src/check.ts"), "env", join(root, "nope")]);
    expect(missing.exitCode).toBe(2);
  });
});
