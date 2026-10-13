import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import { detectEnvironment, renderEnvironment, type Files } from "./env.ts";
import { renderUsageScan, scanNozleUsage } from "./scan.ts";
import { checkKeys, renderKeyResults } from "./key.ts";
import { adapters } from "./hook-adapters.ts";
import { hostFiles, hostNames, hostNotes, type HostName } from "./hosts.ts";
import { hookEvents, repositoryRelative, runHook, sha256, type HookInput } from "./hook.ts";
import { mergeTasks, preparePlan, progressFor, type GoalId, type TaskInput, type TaskResult } from "./plan.ts";
import { assessResume, isHandoff, validateIntegrationRecord, validateSetupPlan, yamlProblem } from "./record.ts";
import { studyDrift, validateStudy } from "./study.ts";

export function checkDocument(source: string, filename: string): string[] {
  const name = basename(filename);
  if (name !== "nozle.integration.yaml" && name !== "nozle-setup-plan.yaml" && name !== "nozle-study.yaml") {
    return [`unsupported artifact ${name}`];
  }

  let value: unknown;
  try {
    value = YAML.parse(source, { uniqueKeys: true });
  } catch (error) {
    return [yamlProblem(error)];
  }
  if (name === "nozle-study.yaml") return validateStudy(value);
  return name === "nozle.integration.yaml"
    ? validateIntegrationRecord(value, { requireReview: isHandoff(value) })
    : validateSetupPlan(value);
}


const MANIFESTS = new Set(["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Gemfile", "composer.json", "pom.xml", "build.gradle", "wrangler.toml", "wrangler.jsonc", "vercel.json", "tsconfig.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"]);
const CONFIGS = /^(svelte|astro|vite|next|nuxt)\.config\./;
// Python server entry points, read so a backend with no dependency manifest is still found.
const PY_ENTRIES = new Set(["main.py", "app.py", "server.py", "asgi.py", "wsgi.py", "manage.py"]);
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?|py|go|rb|php|java|kt|svelte|vue|astro)$/;
const SKIP = new Set(["node_modules", ".git", ".venv", "venv", "dist", "build", ".next", ".svelte-kit", ".astro", "target"]);

/** Read the manifest files up to two levels below root. Large lockfiles are kept only when small enough to parse. */
export function collectManifests(root: string): Files {
  const files: Files = {};
  const walk = (current: string, depth: number, rel: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const relative = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (depth < 2 && !SKIP.has(entry.name) && !entry.name.startsWith(".")) walk(path, depth + 1, relative);
      } else if (MANIFESTS.has(entry.name) || CONFIGS.test(entry.name) || PY_ENTRIES.has(entry.name)) {
        files[relative] = statSync(path).size <= 5_000_000 ? readFileSync(path, "utf8") : "";
      }
    }
  };
  walk(root, 0, "");
  return files;
}

/** Read source files up to six levels deep (each at most 400 KB) for the Nozle usage scan. */
export function collectSources(root: string): Files {
  const files: Files = {};
  const walk = (current: string, depth: number, rel: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const relative = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (depth < 6 && !SKIP.has(entry.name) && !entry.name.startsWith(".")) walk(path, depth + 1, relative);
      } else if (SOURCE_EXT.test(entry.name) && statSync(path).size <= 400_000) {
        files[relative] = readFileSync(path, "utf8");
      }
    }
  };
  walk(root, 0, "");
  return files;
}

type ObjectValue = Record<string, any>;

const marks = { completed: "[x]", active: "[>]", pending: "[ ]", blocked: "[!]", failed: "[!]", deferred: "[-]" } as const;

export function planDocument(source: string): string {
  const input = YAML.parse(source) as ObjectValue;
  const tasks: TaskInput[] = (input?.tasks ?? []).map((task: ObjectValue) => ({
    id: task.id,
    label: task.label,
    goals: task.goals,
    dependsOn: task.depends_on,
    required: task.required,
  }));
  const plan = preparePlan({ selectedGoals: input?.selected_goals ?? [], tasks: mergeTasks(tasks) });
  return YAML.stringify({
    selected_goals: plan.selectedGoals,
    tasks: plan.tasks.map((task) => ({
      id: task.id,
      label: task.label,
      goals: task.goals,
      depends_on: task.dependsOn,
      required: task.required,
      status: "pending",
    })),
  });
}

export function progressDocument(source: string): string {
  const record = YAML.parse(source) as ObjectValue;
  const rows: ObjectValue[] = record?.tasks ?? [];
  const results: Record<string, TaskResult> = Object.fromEntries(rows.map((task) => [
    task.id,
    { status: task.status, evidence: task.evidence, reason: task.reason },
  ]));
  const plan = {
    selectedGoals: (record?.selected_goals ?? []) as GoalId[],
    tasks: rows.map((task) => ({
      id: task.id,
      label: task.label ?? task.id,
      goals: task.goals ?? [],
      dependsOn: task.depends_on ?? [],
      required: task.required !== false,
    })),
  };
  const progress = progressFor(plan, results);
  const doneIds = new Set(progress.tasks.filter((task) => task.status === "completed").map((task) => task.id));
  const next = progress.tasks.find((task) => task.status === "active") ??
    progress.tasks.find((task) => task.status === "pending" && task.dependsOn.every((id) => doneIds.has(id)));
  const lines = progress.tasks.map((task) => {
    const note = task.status === "blocked"
      ? ` (blocked by ${task.dependsOn.filter((id) => !doneIds.has(id)).join(", ")})`
      : task.reason ? ` (${task.reason})` : "";
    return `${marks[task.status]} ${task.id}: ${task.label}${note}`;
  });
  return `${progress.completed}/${progress.total} completed\n${lines.join("\n")}\nnext: ${next?.id ?? "none"}\n`;
}

export function resumeDocument(recordSource: string, root: string, configSource: string): { requires_review: boolean; drift: string[] } {
  const record = YAML.parse(recordSource) as ObjectValue;
  const currentFiles: Record<string, string> = {};
  for (const file of Array.isArray(record?.source_files) ? record.source_files : []) {
    const rel = typeof file?.path === "string" ? repositoryRelative(root, file.path) : undefined;
    currentFiles[file?.path] = rel ? sha256(join(root, rel)) : "outside-repository";
  }
  return assessResume(record, currentFiles, YAML.parse(configSource) ?? {});
}

function fail(message: string, code = 1): void {
  process.stderr.write(message.endsWith("\n") ? message : `${message}\n`);
  process.exitCode = code;
}

function readFileOrFail(filename: string): string | undefined {
  try {
    return readFileSync(filename, "utf8");
  } catch {
    fail("Could not read artifact", 2);
    return undefined;
  }
}

function readPayload(): Record<string, unknown> | undefined {
  try {
    const raw = readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return undefined;
  }
}

/** Opt-in audit trail for debugging: NOZLE_GUARD_LOG=<file> appends every hook call as a JSON line, so an empty log means the hooks never ran. */
function logGuard(host: string, event: string, result: { decision: string; reason?: string; context?: string }): void {
  const file = process.env.NOZLE_GUARD_LOG;
  if (!file) return;
  try {
    appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), host, event, ...result })}\n`);
  } catch {
    // The log is a test aid; a guard decision never depends on it.
  }
}

function runHookCommand(args: string[]): void {
  const hostFlag = args.indexOf("--host");
  const host = hostFlag === -1 ? undefined : args[hostFlag + 1];

  if (host !== undefined) {
    const adapter = adapters[host];
    if (!adapter) return fail(`Unknown host ${host}`);
    const payload = readPayload();
    if (!payload) return fail("invalid hook input", 2);
    const parsed = adapter.parse(payload);
    if (!parsed) return;
    const result = runHook(parsed.event, parsed.input);
    logGuard(host, parsed.event, result);
    const out = adapter.render(parsed, result);
    process.stdout.write(out.stdout);
    process.stderr.write(out.stderr);
    process.exitCode = out.exitCode;
    return;
  }

  const event = args[0] ?? "";
  if (!(hookEvents as readonly string[]).includes(event)) return fail(`Unknown hook event ${event}`);
  const input = readPayload();
  if (!input) return event === "session-start" ? undefined : fail("invalid hook input", 2);
  const result = runHook(event, input as HookInput);
  if (result.decision === "deny") return fail(`Nozle guard: ${result.reason}`, 2);
  if (result.context) process.stdout.write(`${result.context}\n`);
}

/** `hosts <host> [--write] [dir]`: print, or with --write create, the host's guard and docs-MCP files; an existing file is never overwritten. */
function runHostsCommand(args: string[]): void {
  const host = args.find((arg) => !arg.startsWith("--"));
  const write = args.includes("--write");
  if (host === "cline") return void console.log(hostNotes["cline"]);
  if (!host || !(hostNames as readonly string[]).includes(host)) return fail(`Usage: nozle-check hosts <${[...hostNames, "cline"].join("|")}> [--write] [directory]`, 2);
  const dirArg = args.filter((arg) => !arg.startsWith("--"))[1];
  const root = resolve(dirArg ?? ".");
  const hookPath = join(dirname(fileURLToPath(import.meta.url)), "nozle-hook");
  for (const file of hostFiles(host as HostName, hookPath)) {
    const target = join(root, file.path);
    if (!write) {
      console.log(`# ${file.path}\n${file.content}`);
    } else if (existsSync(target)) {
      console.log(`skipped ${file.path}: exists, merge this by hand:\n${file.content}`);
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content);
      console.log(`wrote ${file.path}`);
    }
  }
  const note = hostNotes[host];
  if (note) console.log(note);
}

/** The source_files block for the record: repository-relative paths and their SHA-256, or absent. */
export function hashDocument(root: string, paths: string[]): string {
  const files = paths.map((path) => {
    const rel = repositoryRelative(root, resolve(root, path));
    if (!rel) throw new Error(`${path} is outside the repository`);
    return { path: rel, sha256: sha256(join(root, rel)) };
  });
  return YAML.stringify({ source_files: files });
}

function main(argv: string[]): void {
  const [command, ...rest] = argv;
  if (command === "hook") return runHookCommand(rest);
  if (command === "hosts") return runHostsCommand(rest);
  if (command === "env") {
    const asJson = rest.includes("--json");
    const root = resolve(rest.find((arg) => !arg.startsWith("--")) ?? ".");
    if (!existsSync(root)) return fail(`Usage: nozle-check env [directory] [--json]`, 2);
    const result = detectEnvironment(collectManifests(root));
    process.stdout.write(asJson ? `${JSON.stringify(result, null, 2)}\n` : renderEnvironment(result));
    return;
  }
  if (command === "scan") {
    const asJson = rest.includes("--json");
    const root = resolve(rest.find((arg) => !arg.startsWith("--")) ?? ".");
    if (!existsSync(root)) return fail("Usage: nozle-check scan [directory] [--json]", 2);
    const scan = scanNozleUsage(collectSources(root));
    const packages = detectEnvironment(collectManifests(root)).nozlePackages;
    process.stdout.write(asJson ? `${JSON.stringify({ ...scan, packages }, null, 2)}\n` : renderUsageScan(scan, packages));
    return;
  }
  if (command === "key") {
    const flag = rest.indexOf("--base");
    const base = flag === -1 ? "https://api.nozle.app/core" : rest[flag + 1];
    const root = resolve(rest.filter((_, i) => flag === -1 || (i !== flag && i !== flag + 1))[0] ?? ".");
    if (!base || !existsSync(root)) return fail("Usage: nozle-check key [directory] [--base <core url>]", 2);
    void checkKeys(root, base).then((results) => {
      process.stdout.write(renderKeyResults(results));
      process.exitCode = results.length === 0 ? 2 : results.every((r) => r.ok) ? 0 : 1;
    });
    return;
  }
  if (command === "study") {
    const file = resolve(rest[0] ?? "nozle-study.yaml");
    const text = readFileOrFail(file);
    if (text === undefined) return;
    const study = YAML.parse(text) as ObjectValue;
    const errors = validateStudy(study);
    if (errors.length) return fail(errors.map((error) => `- ${error}\n`).join(""));
    const hashes: Record<string, string> = {};
    for (const entry of Array.isArray(study.source_files) ? study.source_files : []) {
      const rel = repositoryRelative(dirname(file), String(entry.path));
      hashes[String(entry.path)] = rel ? sha256(join(dirname(file), rel)) : "outside-repository";
    }
    const drift = studyDrift(study, hashes);
    process.stdout.write(`account read: ${(study.account_read as ObjectValue).status}\n`);
    process.stdout.write(drift.length ? `changed since the study (re-read these, reuse the rest):\n${drift.map((line) => `- ${line}\n`).join("")}` : "no drift: every file the study relied on is unchanged\n");
    return;
  }
  if (command === "plan" || command === "progress") {
    const source = rest[0] ?? (command === "progress" ? "nozle.integration.yaml" : undefined);
    if (!source) return fail(`Usage: nozle-check ${command} <file>`, 2);
    const text = readFileOrFail(source);
    if (text === undefined) return;
    try {
      process.stdout.write(command === "plan" ? planDocument(text) : progressDocument(text));
    } catch (error) {
      fail((error as Error).message);
    }
    return;
  }
  if (command === "hash") {
    const [repository, ...paths] = rest;
    if (!repository || paths.length === 0) return fail("Usage: nozle-check hash <repository> <path>...", 2);
    process.stdout.write(hashDocument(resolve(repository), paths));
    return;
  }
  if (command === "resume") {
    const flag = rest.indexOf("--config");
    const configFile = flag === -1 ? undefined : rest[flag + 1];
    const recordFile = rest.filter((_, i) => i !== flag && i !== flag + 1)[0] ?? "nozle.integration.yaml";
    if (!configFile) return fail("Usage: nozle-check resume [nozle.integration.yaml] --config <current-configuration.yaml>", 2);
    const record = readFileOrFail(recordFile);
    const config = record === undefined ? undefined : readFileOrFail(configFile);
    if (record === undefined || config === undefined) return;
    try {
      const result = resumeDocument(record, dirname(resolve(recordFile)), config);
      if (!result.requires_review) return void process.stdout.write("no drift: scoped files and configuration match the record\n");
      return fail(`requires scope review:\n${result.drift.map((line) => `- ${line}\n`).join("")}`);
    } catch {
      return fail("Could not read artifact", 2);
    }
  }
  const filename = command === "check" ? rest[0] : command;
  if (!filename) return fail("Usage: nozle-check [check] <nozle.integration.yaml|nozle-setup-plan.yaml>\n       nozle-check plan <tasks.yaml>\n       nozle-check progress [nozle.integration.yaml]\n       nozle-check resume [nozle.integration.yaml] --config <current-configuration.yaml>\n       nozle-check hash <repository> <path>...\n       nozle-check env [directory] [--json]\n       nozle-check scan [directory] [--json]\n       nozle-check key [directory] [--base <core url>]\n       nozle-check study [nozle-study.yaml]\n       nozle-check hook <event> < payload.json\n       nozle-check hook --host <claude|codex|cursor|windsurf|gemini|copilot|opencode> < native-hook-payload.json\n       nozle-check hosts <codex|cursor|windsurf|gemini|copilot|opencode|cline> [--write] [directory]", 2);
  const text = readFileOrFail(filename);
  if (text === undefined) return;
  const errors = checkDocument(text, filename);
  if (errors.length) return fail(errors.map((error) => `- ${error}\n`).join(""));
  process.stdout.write(`${basename(filename)}: valid\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
