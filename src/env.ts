/** Detect the application's stack from manifests and decide which Nozle SDK or API path applies. */

export type Files = Record<string, string>;

export interface Environment {
  /** Manifest directories found, relative to the scan root ("." for the root). */
  targets: string[];
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  lockfile: "in_sync" | "out_of_sync" | "missing" | "unknown";
  moduleType?: "esm" | "commonjs";
  runtime: "node" | "workers" | "edge" | "static" | "unknown" | "none";
  nozlePackages: { name: string; spec: string }[];
  scripts: string[];
  backend: Verdict;
  frontend: Verdict;
  unknowns: string[];
}

export interface Verdict {
  path: "node-sdk" | "python-sdk" | "go-sdk" | "react-sdk" | "native-components" | "rest" | "no-server" | "none";
  reasons: string[];
}

const NODE_FRAMEWORKS: Record<string, string> = {
  next: "next", "@sveltejs/kit": "sveltekit", svelte: "svelte", astro: "astro", vue: "vue", nuxt: "nuxt",
  "@angular/core": "angular", "solid-js": "solid", "@remix-run/react": "remix", "react-router": "react-router",
  react: "react", vite: "vite", express: "express", hono: "hono", fastify: "fastify", "@nestjs/core": "nestjs", koa: "koa",
};
const SERVER_FRAMEWORKS = new Set(["next", "nuxt", "remix", "express", "hono", "fastify", "nestjs", "koa"]);
const FRONTEND_NATIVE = new Set(["svelte", "sveltekit", "vue", "nuxt", "angular", "solid", "astro"]);
const PY_FRAMEWORKS = ["fastapi", "django", "flask", "starlette"];
const NOZLE_NAMES = ["@nozle-js/node", "@nozle-js/react", "nozle-sdk"];

function json(text: string | undefined): Record<string, any> | undefined {
  if (text === undefined) return undefined;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value : undefined;
  } catch {
    return undefined;
  }
}

const base = (path: string) => path.split("/").pop() ?? path;
const dir = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".");

function pythonDeps(files: Files): Record<string, string> {
  const deps: Record<string, string> = {};
  for (const [path, text] of Object.entries(files)) {
    if (base(path) === "requirements.txt") {
      for (const line of text.split("\n")) {
        const match = /^\s*([A-Za-z0-9_.-]+)\s*(\[[^\]]*\])?\s*([<>=!~].*)?$/.exec(line.split("#")[0] ?? "");
        if (match?.[1]) deps[match[1].toLowerCase().replace(/_/g, "-")] = (match[3] ?? "").trim();
      }
    } else if (base(path) === "pyproject.toml") {
      for (const match of text.matchAll(/["']([A-Za-z0-9_.-]+)\s*(\[[^\]]*\])?\s*([<>=!~][^"']*)?["']/g)) {
        deps[match[1]!.toLowerCase().replace(/_/g, "-")] = (match[3] ?? "").trim();
      }
    }
  }
  return deps;
}

export function detectEnvironment(files: Files): Environment {
  const paths = Object.keys(files);
  const unknowns: string[] = [];
  const targets = [...new Set(paths.filter((p) => ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Gemfile", "composer.json", "pom.xml", "build.gradle"].includes(base(p))).map(dir))].sort();
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const nozlePackages: { name: string; spec: string }[] = [];
  const scripts = new Set<string>();

  // Node and TypeScript manifests, merged across targets.
  const nodeDeps: Record<string, string> = {};
  let rootPackage: Record<string, any> | undefined;
  for (const path of paths.filter((p) => base(p) === "package.json")) {
    const pkg = json(files[path]);
    if (!pkg) continue;
    if (dir(path) === "." || !rootPackage) rootPackage = dir(path) === "." ? pkg : rootPackage ?? pkg;
    languages.add("javascript");
    Object.assign(nodeDeps, pkg.dependencies, pkg.devDependencies);
    for (const name of ["build", "typecheck", "test", "lint"]) if (pkg.scripts?.[name]) scripts.add(name);
    if (pkg.workspaces) frameworks.add("workspaces");
  }
  if (nodeDeps["typescript"] || paths.some((p) => base(p) === "tsconfig.json")) languages.add("typescript");
  for (const [name, framework] of Object.entries(NODE_FRAMEWORKS)) if (nodeDeps[name]) frameworks.add(framework);

  // Other languages.
  const py = pythonDeps(files);
  if (paths.some((p) => ["requirements.txt", "pyproject.toml"].includes(base(p)))) languages.add("python");
  for (const name of PY_FRAMEWORKS) if (py[name]) frameworks.add(name);
  // A Python server with no dependency manifest: read the framework from the entry file's imports.
  const pyEntries = paths.filter((p) => p.endsWith(".py"));
  if (pyEntries.length && !paths.some((p) => ["requirements.txt", "pyproject.toml"].includes(base(p)))) {
    const imported = PY_FRAMEWORKS.filter((name) => pyEntries.some((p) => new RegExp(`^\\s*(from|import)\\s+${name}\\b`, "m").test(files[p] ?? "")));
    if (imported.length) {
      languages.add("python");
      for (const name of imported) { frameworks.add(name); py[name] = "*"; }
      unknowns.push(`Python server code (${imported.join("/")}) has no requirements.txt or pyproject.toml: declare its dependencies before adding \`nozle-sdk\``);
    }
  }
  if (paths.some((p) => base(p) === "go.mod")) languages.add("go");
  if (paths.some((p) => base(p) === "Gemfile")) languages.add("ruby");
  if (paths.some((p) => base(p) === "composer.json")) languages.add("php");
  if (paths.some((p) => ["pom.xml", "build.gradle"].includes(base(p)))) languages.add("java");
  for (const [name, spec] of Object.entries(nodeDeps)) if (NOZLE_NAMES.includes(name)) nozlePackages.push({ name, spec: String(spec) });
  for (const [name, spec] of Object.entries(py)) if (NOZLE_NAMES.includes(name)) nozlePackages.push({ name, spec });

  // Package manager, module type, lockfile.
  const lockfiles: Record<string, string> = { "package-lock.json": "npm", "pnpm-lock.yaml": "pnpm", "yarn.lock": "yarn", "bun.lock": "bun", "bun.lockb": "bun" };
  const lock = paths.find((p) => lockfiles[base(p)] !== undefined);
  const declaredManager = typeof rootPackage?.packageManager === "string" ? String(rootPackage.packageManager).split("@")[0] : undefined;
  const packageManager = lock ? lockfiles[base(lock)] : declaredManager;
  let lockfileState: Environment["lockfile"] = rootPackage ? "missing" : "unknown";
  if (lock && base(lock) === "package-lock.json") {
    const root = json(files[lock])?.packages?.[""];
    if (root) {
      const wanted = { ...rootPackage?.dependencies, ...rootPackage?.devDependencies };
      const locked = { ...root.dependencies, ...root.devDependencies };
      const same = Object.keys(wanted).length === Object.keys(locked).length && Object.entries(wanted).every(([k, v]) => locked[k] === v);
      lockfileState = same ? "in_sync" : "out_of_sync";
    } else lockfileState = "unknown";
  } else if (lock) lockfileState = "unknown";
  const moduleType = rootPackage ? (rootPackage.type === "module" ? "esm" : "commonjs") : undefined;

  // Runtime, from deployment and adapter signals.
  const text = (re: RegExp) => paths.filter((p) => re.test(base(p))).map((p) => files[p] ?? "").join("\n");
  const svelteConfig = text(/^svelte\.config\./);
  const astroConfig = text(/^astro\.config\./);
  let runtime: Environment["runtime"] = frameworks.size || languages.size ? "unknown" : "none";
  const hasWrangler = paths.some((p) => base(p) === "wrangler.toml" || base(p) === "wrangler.jsonc") || Boolean(nodeDeps["wrangler"]);
  // A framework's own adapter decides first; a wrangler file alone only deploys assets or a worker.
  if (frameworks.has("sveltekit")) {
    if (nodeDeps["@sveltejs/adapter-static"]) runtime = "static";
    else if (nodeDeps["@sveltejs/adapter-cloudflare"]) runtime = "workers";
    else if (nodeDeps["@sveltejs/adapter-node"]) runtime = "node";
    else if (nodeDeps["@sveltejs/adapter-vercel"] || nodeDeps["@sveltejs/adapter-netlify"]) runtime = "node";
    else if (nodeDeps["@sveltejs/adapter-auto"]) unknowns.push("SvelteKit uses adapter-auto, so the runtime depends on the deploy target");
  } else if (frameworks.has("astro")) {
    if (nodeDeps["@astrojs/cloudflare"]) runtime = "workers";
    else if (nodeDeps["@astrojs/node"] || nodeDeps["@astrojs/vercel"] || nodeDeps["@astrojs/netlify"]) runtime = "node";
    else if (!/adapter\s*:/.test(astroConfig)) runtime = "static";
  } else if (hasWrangler) runtime = "workers";
  else if ([...frameworks].some((f) => SERVER_FRAMEWORKS.has(f))) runtime = "node";
  else if (languages.has("javascript") && !languages.has("python") && !["go", "ruby", "php", "java"].some((l) => languages.has(l)) && frameworks.has("vite")) runtime = "static";

  // Backend verdict.
  const backend: Verdict = { path: "none", reasons: [] };
  const hasPyServer = languages.has("python") && PY_FRAMEWORKS.some((n) => py[n]);
  const hasNodeServer = [...frameworks].some((f) => SERVER_FRAMEWORKS.has(f)) || (frameworks.has("sveltekit") && runtime !== "static" && runtime !== "workers") || (frameworks.has("astro") && runtime === "node");
  if (hasPyServer || (languages.has("python") && !hasNodeServer)) {
    backend.path = "python-sdk";
    backend.reasons.push("Python backend: `nozle-sdk` (Python >= 3.9; under async frameworks use `AsyncNozle` from 0.13, or run the sync client in a thread)");
  } else if (runtime === "workers") {
    backend.path = "rest";
    backend.reasons.push("Workers/edge runtime: SDK support is not documented, so use the REST API with `fetch`");
  } else if (hasNodeServer) {
    backend.path = "node-sdk";
    backend.reasons.push("Node server code: `@nozle-js/node` (Node >= 18; ships both ESM and CommonJS)");
    if ([...frameworks].some((f) => ["express", "hono", "fastify", "nestjs", "koa"].includes(f))) backend.reasons.push("detected from dependencies only: confirm the server code is in this folder");
    if (runtime === "unknown") backend.reasons.push("runtime is not fixed by the config; if it deploys to an edge runtime use REST instead");
  } else if (languages.has("go")) {
    backend.path = "go-sdk";
    backend.reasons.push("Go backend: `github.com/nozle-dev/nozle-go` (Go >= 1.22)");
  } else if (["ruby", "php", "java"].some((l) => languages.has(l))) {
    backend.path = "rest";
    backend.reasons.push(`No Nozle SDK for ${[...languages].filter((l) => ["ruby", "php", "java"].includes(l)).join("/")}: call the REST API from the backend`);
  } else if (runtime === "static" || (languages.has("javascript") && !hasNodeServer)) {
    backend.path = "no-server";
    backend.reasons.push("No server code found: secret-key calls need a backend (add an SSR adapter/server route or use a separate backend)");
  }

  // Frontend verdict.
  const frontend: Verdict = { path: "none", reasons: [] };
  const hasReact = frameworks.has("react") || frameworks.has("next") || frameworks.has("remix") || frameworks.has("react-router");
  const native = [...frameworks].filter((f) => FRONTEND_NATIVE.has(f));
  if (hasReact) {
    frontend.path = "react-sdk";
    frontend.reasons.push("React: `@nozle-js/react` (React >= 18; peers `@stripe/stripe-js`, `@stripe/react-stripe-js` and, from 0.11, `@tanstack/react-query` v5; themed with `appearance`, not Tailwind; publishable key only, customer billing goes through your backend)");
    const major = Number(/(\d+)/.exec(String(nodeDeps["react"] ?? ""))?.[1]);
    if (major && major < 18) frontend.reasons.push(`React ${major} is below the SDK minimum of 18`);
  } else if (native.length) {
    frontend.path = "native-components";
    frontend.reasons.push(`No Nozle SDK for ${native.join("/")}: build native components that read plans from a backend route or the public catalog (publishable key)`);
    if (nodeDeps["@astrojs/react"]) frontend.reasons.push("`@astrojs/react` is present, so a React island could use `@nozle-js/react`");
  }
  if (!targets.length) unknowns.push("no manifests found: nothing to detect (a new project)");
  return {
    targets, languages: [...languages].sort(), frameworks: [...frameworks].sort(), ...(packageManager ? { packageManager } : {}),
    lockfile: lockfileState, ...(moduleType ? { moduleType } : {}), runtime, nozlePackages, scripts: [...scripts].sort(), backend, frontend, unknowns,
  };
}

export function renderEnvironment(env: Environment): string {
  const line = (label: string, value: string) => `${label.padEnd(16)}${value}\n`;
  let out = "";
  out += line("targets", env.targets.join(", ") || "none");
  out += line("languages", env.languages.join(", ") || "none");
  out += line("frameworks", env.frameworks.join(", ") || "none");
  out += line("package manager", `${env.packageManager ?? "unknown"} (lockfile ${env.lockfile.replace("_", " ")})`);
  out += line("module type", env.moduleType ?? "n/a");
  out += line("runtime", env.runtime);
  out += line("nozle packages", env.nozlePackages.map((p) => `${p.name}@${p.spec || "*"}`).join(", ") || "none");
  out += line("scripts", env.scripts.join(", ") || "none");
  out += line("backend path", `${env.backend.path}${env.backend.reasons.length ? ` - ${env.backend.reasons.join("; ")}` : ""}`);
  out += line("frontend path", `${env.frontend.path}${env.frontend.reasons.length ? ` - ${env.frontend.reasons.join("; ")}` : ""}`);
  for (const unknown of env.unknowns) out += line("unknown", unknown);
  return out;
}
