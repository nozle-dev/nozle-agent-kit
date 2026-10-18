import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import YAML from "yaml";

import { progressFor, type PlanProgress, type TaskResult } from "./plan.ts";
import { createsSubscription, handlesConflict, lintSource } from "./lint.ts";
import { hasCredentialText, isHandoff, validateIntegrationRecord, validateSetupPlan, yamlProblem } from "./record.ts";

export interface HookInput {
  cwd?: string;
  path?: string;
  /** Hosts that edit several files in one call (a patch) list every target here. */
  paths?: string[];
  command?: string;
  tool?: string;
  stop_hook_active?: boolean;
}

export interface HookResult {
  decision: "allow" | "deny";
  reason?: string;
  context?: string;
  /** Permission events only: no opinion, so the host asks the user as usual. */
  abstain?: boolean;
}

export const hookEvents = ["session-start", "pre-edit", "pre-command", "pre-mcp", "post-edit", "stop", "permission"] as const;

const recordName = "nozle.integration.yaml";
const setupName = "nozle-setup-plan.yaml";
const artifacts = new Set([recordName, setupName, "nozle-integration-report.md", "nozle-tasks.yaml", "nozle-study.yaml"]);
const readOnlyTools = new Set([
  "get_account_context",
  "get_integration_configuration",
  "list_integration_resources",
  "get_integration_resource",
  "get_capability_catalog",
]);
const productionHost = /api\.nozle\.app/i;
// A command word that talks to the network; reading or searching for the host is fine.
// Scripts that send real events are run by the user; the agent writes and reads them with its file tools only.
const userRunScript = /nozle-first-event|nozle-live-check/;
// The legacy Nozle MCP package is outdated and undocumented; the plugin never installs or runs it.
const legacyMcpPackage = /@nozle-js\/mcp/;
const networkClient = /(^|[;&|(\s])(curl|wget|http|xh|nc|ncat|telnet)(\s|$)/;
const maxScanBytes = 1_000_000;
// Real env files hold the user's keys; templates are where the agent lists variable names.
const envFile = /^\.env(\..+)?$/;
const envTemplates = new Set([".env.example", ".env.sample", ".env.template"]);

type ObjectValue = Record<string, unknown>;

const checkSubcommands = new Set(["env", "plan", "progress", "hash", "resume", "check", "key"]);

/**
 * True only for `nozle-check <read-only subcommand> <plain arguments>` (or `node <path>/nozle-check.mjs ...`).
 * Anything with a quote, `$`, `;`, `|`, `&`, redirect or backtick is not approved here and is asked as usual.
 * `hosts` and `hook` are left out because `hosts --write` creates files.
 */
export function isReadOnlyCheckCommand(command: string): boolean {
  if (!/^[A-Za-z0-9_.\/@:=+,~ -]+$/.test(command)) return false;
  let words = command.trim().split(/ +/);
  if (words[0] === "node") {
    if (!/(^|\/)nozle-check\.mjs$/.test(words[1] ?? "")) return false;
    words = words.slice(2);
  } else if (words[0] === "nozle-check") {
    words = words.slice(1);
  } else {
    return false;
  }
  const [subcommand = ""] = words;
  return checkSubcommands.has(subcommand) || /\.ya?ml$/.test(subcommand);
}

function allow(context?: string): HookResult {
  return context ? { decision: "allow", context } : { decision: "allow" };
}

function deny(reason: string): HookResult {
  return { decision: "deny", reason };
}

function realpathLoose(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    const parent = dirname(path);
    return parent === path ? path : join(realpathLoose(parent), basename(path));
  }
}

export function repositoryRelative(root: string, path: string): string | undefined {
  const rel = relative(realpathLoose(root), realpathLoose(resolve(root, path)));
  return rel === "" || rel.startsWith("..") || isAbsolute(rel) ? undefined : rel;
}

export function sha256(path: string): string {
  return existsSync(path) ? createHash("sha256").update(readFileSync(path)).digest("hex") : "absent";
}

/**
 * The directory holding an integration record, searched upward from `start`. No record means no
 * integration is in progress, and every guard stays out of the way of unrelated work.
 */
export function findIntegrationRoot(start: string): string | undefined {
  let dir = resolve(start);
  for (let depth = 0; depth < 25; depth += 1) {
    if (existsSync(join(dir, recordName)) || existsSync(join(dir, setupName))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

function loadRecord(root: string): { record?: ObjectValue; error?: string } {
  const file = join(root, recordName);
  if (!existsSync(file)) return {};
  try {
    const value = YAML.parse(readFileSync(file, "utf8"), { uniqueKeys: true });
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? { record: value as ObjectValue }
      : { error: `${recordName} must be an object` };
  } catch (error) {
    return { error: `${recordName}: ${yamlProblem(error)}` };
  }
}

function progressOf(record: ObjectValue): PlanProgress | undefined {
  if (!Array.isArray(record.tasks)) return undefined;
  const tasks = record.tasks as ObjectValue[];
  const results: Record<string, TaskResult> = {};
  for (const task of tasks) {
    results[String(task.id)] = {
      status: task.status as TaskResult["status"],
      evidence: task.evidence as string | undefined,
      reason: task.reason as string | undefined,
    };
  }
  return progressFor({
    selectedGoals: [],
    tasks: tasks.map((task) => ({
      id: String(task.id),
      label: String(task.label ?? task.id),
      goals: [],
      dependsOn: Array.isArray(task.depends_on) ? task.depends_on.map(String) : [],
      required: task.required !== false,
    })),
  }, results);
}

function sessionContext(root: string): HookResult {
  const { record, error } = loadRecord(root);
  if (error) return allow(`Nozle integration record problem: ${error}. Fix it before continuing.`);
  if (!record) return allow();
  let summary = `Nozle integration in progress. Record: ${recordName}.`;
  try {
    const progress = progressOf(record);
    if (progress) {
      const next = progress.tasks.find((task) => task.status === "active") ??
        progress.tasks.find((task) => task.status === "pending" &&
          task.dependsOn.every((id) => progress.tasks.find((other) => other.id === id)?.status === "completed"));
      if (progress.total > 0) summary += ` ${progress.completed}/${progress.total} steps completed.`;
      if (next) summary += ` Next step: ${next.id}.`;
    }
  } catch (error) {
    summary += ` Record tasks are inconsistent: ${(error as Error).message}.`;
  }
  return allow(`${summary}${bindingFacts(root, record)} Run nozle-check progress to see the checklist; re-read changed files and account configuration before reusing earlier findings.`);
}

const clip = (value: unknown, max: number): string => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/**
 * What the record already settled, restated after a start, resume or context compaction so the agent keeps
 * to it instead of asking again or changing course. Bounded, because it is injected into every such session.
 */
function bindingFacts(root: string, record: ObjectValue): string {
  const facts: string[] = [];
  if (Array.isArray(record.selected_goals)) facts.push(`goals ${record.selected_goals.join(", ")}`);
  const stack = record.stack as ObjectValue | undefined;
  if (stack?.backend_path) facts.push(`stack ${String(stack.backend_path)} on ${clip(stack.runtime, 40)} (change it only with the user's yes)`);
  const scope = record.approved_scope as ObjectValue | undefined | null;
  facts.push(scope ? "scope approved: edit only its included_paths" : "scope not approved yet: no application edits");
  const excluded = Array.isArray(scope?.excluded_paths) ? (scope.excluded_paths as unknown[]).map(String) : [];
  if (excluded.length) facts.push(`do not track, never edit: ${excluded.slice(0, 10).join(", ")}${excluded.length > 10 ? ` and ${excluded.length - 10} more` : ""}`);
  const decisions = Array.isArray(record.decisions) ? (record.decisions as ObjectValue[]) : [];
  if (decisions.length) {
    const shown = decisions.slice(0, 12).map((item) => `${clip(item?.id, 40)}: ${clip(item?.answer, 100)}`);
    facts.push(`decisions already answered (binding, do not ask again): ${shown.join("; ")}${decisions.length > 12 ? `; and ${decisions.length - 12} more in the record` : ""}`);
  }
  const open = unansweredActivities(root, record);
  if (open.length) facts.push(`activities still waiting for the user's answer: ${open.slice(0, 10).join(", ")}`);
  return facts.length ? ` Settled in the record: ${facts.join(". ")}.` : "";
}

const editTargets = (input: HookInput): string[] => [...(input.path ? [input.path] : []), ...(input.paths ?? [])];

/** A path is under an excluded entry when it equals it or sits inside it (the entry is a file, or a folder). */
export const underPath = (rel: string, entry: string): boolean => {
  const base = entry.replace(/\/+$/, "");
  return rel === base || rel.startsWith(`${base}/`);
};

/** Study activities that no answered decision covers: the user has not said whether to track them. */
function unansweredActivities(root: string, record: ObjectValue | undefined): string[] {
  const file = join(root, "nozle-study.yaml");
  if (!record || !existsSync(file)) return [];
  let study: ObjectValue | undefined;
  try {
    study = YAML.parse(readFileSync(file, "utf8")) as ObjectValue;
  } catch {
    return [];
  }
  const activities = Array.isArray(study?.activities) ? (study.activities as ObjectValue[]) : [];
  const decisions = Array.isArray(record.decisions) ? (record.decisions as ObjectValue[]) : [];
  const answered = new Set(decisions.flatMap((item) => (Array.isArray(item?.activities) ? item.activities.map(String) : [])));
  return activities.map((activity) => String(activity?.id ?? "")).filter((id) => id && !answered.has(id));
}

function checkTarget(root: string, cwd: string | undefined, record: ObjectValue | undefined, target: string): HookResult {
  const rel = repositoryRelative(root, resolve(cwd ?? root, target));
  if (!rel) return deny(`${target} is outside the repository`);
  if (artifacts.has(rel)) return allow();
  if (envFile.test(basename(rel)) && !envTemplates.has(basename(rel))) {
    return deny(`${rel} is a real env file and holds the user's keys; leave it alone and list variable names in .env.example`);
  }
  const scope = record?.approved_scope as ObjectValue | undefined | null;
  if (!scope) {
    return deny(`${rel}: the user has not approved an integration scope yet; get approval and save it in ${recordName} before editing application code`);
  }
  const open = unansweredActivities(root, record);
  if (open.length) {
    return deny(`${rel}: the user has not answered what to measure for ${open.join(", ")} (from nozle-study.yaml). Ask with the question tool, grouped by area, offering track as billable usage, track cost only, do not track and decide later with your recommendation first; save each answer in decisions with activities: [ids]`);
  }
  const excluded = scope.excluded_paths;
  if (Array.isArray(excluded) && excluded.some((path) => underPath(rel, String(path)))) {
    return deny(`${rel} belongs to an activity the user answered "do not track"; leave it unchanged, or ask the user again and update excluded_paths in ${recordName}`);
  }
  const included = scope.included_paths;
  if (Array.isArray(included) && included.includes(rel)) return allow();
  return deny(`${rel} is outside the approved Nozle integration scope; revisit scope approval before editing it`);
}

/** Peer folders the record names (one product split across repositories), as absolute paths. */
function peerRoots(root: string, record: ObjectValue | undefined): string[] {
  const peers = Array.isArray(record?.peers) ? (record.peers as ObjectValue[]) : [];
  return peers
    .map((peer) => String(peer?.location ?? ""))
    .filter((location) => location && location !== "unavailable" && !/^[a-z][a-z0-9+.-]*:/i.test(location))
    .map((location) => resolve(root, location));
}

/**
 * A target inside a peer repository is judged by that repository's own record and scope, so one session
 * with both folders open can keep a record in each without widening either scope.
 */
function judgeTarget(root: string, cwd: string | undefined, record: ObjectValue | undefined, target: string): HookResult {
  const abs = resolve(cwd ?? root, target);
  if (repositoryRelative(root, abs) === undefined) {
    const peer = peerRoots(root, record).find((dir) => repositoryRelative(dir, abs) !== undefined);
    if (peer) {
      const { record: peerRecord, error } = loadRecord(peer);
      if (error) return deny(`peer ${error}`);
      return checkTarget(peer, undefined, peerRecord, abs);
    }
  }
  return checkTarget(root, cwd, record, target);
}

function preEdit(root: string, input: HookInput): HookResult {
  const targets = editTargets(input);
  if (targets.length === 0) return deny("edit target path is missing");
  const { record, error } = loadRecord(root);
  if (error && !targets.every((target) => isRecordFile(root, input.cwd, target))) return deny(`${error}; fix the record first (edits to it are allowed)`);
  for (const target of targets) {
    const verdict = judgeTarget(root, input.cwd, record, target);
    if (verdict.decision === "deny") return verdict;
  }
  return allow();
}

/** The record files themselves stay editable while the record is broken, so the agent can repair it. */
const isRecordFile = (root: string, cwd: string | undefined, target: string): boolean =>
  artifacts.has(repositoryRelative(root, resolve(cwd ?? root, target)) ?? "");

function readSmall(file: string): string | undefined {
  return existsSync(file) && statSync(file).isFile() && statSync(file).size <= maxScanBytes ? readFileSync(file, "utf8") : undefined;
}

const backendPathOf = (record: ObjectValue | undefined): string | undefined =>
  String((record?.stack as ObjectValue | undefined)?.backend_path ?? "") || undefined;

function postEdit(root: string, input: HookInput): HookResult {
  const { record } = loadRecord(root);
  const advice: string[] = [];
  for (const target of editTargets(input)) {
    const text = readSmall(resolve(input.cwd ?? root, target));
    if (text === undefined) continue;
    if (hasCredentialText(text)) {
      return deny(`${target} contains credential-like text; reference an environment variable instead`);
    }
    const rel = repositoryRelative(root, resolve(input.cwd ?? root, target));
    if (!rel || artifacts.has(rel)) continue;
    const lint = lintSource(rel, text, backendPathOf(record));
    if (lint.block) return deny(lint.block);
    advice.push(...lint.advice, ...(lint.notes ?? []));
  }
  return allow(advice.length ? `Nozle build check: ${advice.join("; ")}.` : undefined);
}

/** Files a shell command writes: redirect targets, tee arguments, and sed/perl in-place edits. */
// shortcut: a small tokenizer, not a shell parser; cp, mv and scripts that write files are not seen.
export function shellWriteTargets(command: string): string[] {
  const body = command.replace(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, "<<heredoc$3");
  const targets: string[] = [];
  for (const segment of body.split(/\n|&&|\|\||[;|]/)) {
    const words = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
    const unquote = (word: string) => word.replace(/^(["'])(.*)\1$/, "$2");
    for (let i = 0; i < words.length; i += 1) {
      const redirect = /^\d*(?:>>?|&>>?)(.*)$/.exec(words[i]!);
      if (redirect) {
        const target = redirect[1] || words[i + 1];
        if (target && !target.startsWith("&")) targets.push(unquote(target));
      }
    }
    const [head, ...args] = words.map(unquote);
    const files = args.filter((word) => !word.startsWith("-") && !/^\d*>/.test(word));
    if (head === "tee") targets.push(...files);
    if ((head === "sed" || head === "perl") && args.some((word) => /^-[a-zA-Z]*i/.test(word) || word === "--in-place")) {
      const last = files[files.length - 1];
      if (files.length > 1 && last) targets.push(last);
    }
  }
  return targets;
}

function preCommandWrites(root: string, input: HookInput): HookResult {
  const { record, error } = loadRecord(root);
  const guarded = [root, ...peerRoots(root, record)];
  const targets = shellWriteTargets(input.command ?? "")
    .filter((target) => guarded.some((dir) => repositoryRelative(dir, resolve(input.cwd ?? root, target)) !== undefined));
  if (targets.length === 0) return allow();
  if (error && !targets.every((target) => isRecordFile(root, input.cwd, target))) return deny(`${error}; fix the record first (edits to it are allowed)`);
  for (const target of targets) {
    const verdict = judgeTarget(root, input.cwd, record, target);
    if (verdict.decision === "deny") return deny(`shell write: ${verdict.reason}`);
  }
  return allow();
}

/** Peer links that are missing or stale: the other repository of the product must be named in every record. */
function peerFindings(root: string, record: ObjectValue): string[] {
  // A handoff record without peers already fails validation; this message is for drafts.
  if (record.peers === undefined) {
    if (record.approved_scope) return [];
    return [`${recordName} has no peers entry. If the user named another repository of this product (a backend or frontend), record it in peers with its location; otherwise write peers: [].`];
  }
  return peerRoots(root, record)
    .filter((dir) => existsSync(join(dir, recordName)))
    .filter((dir) => (record.peers as ObjectValue[]).some((peer) => resolve(root, String(peer?.location)) === dir && peer?.record_seen !== true))
    .map((dir) => `The peer at ${dir} has a ${recordName}: read it, reuse its decisions and interfaces, and set record_seen: true.`);
}

function stop(root: string, input: HookInput): HookResult {
  if (input.stop_hook_active) return allow();
  const { record } = loadRecord(root);
  if (!record) return allow();
  if (!Array.isArray(record.source_files)) {
    // A draft is checked only for the fields it already holds; the full record is required at handoff.
    const draft = validateIntegrationRecord(record, { requireReview: false })
      .filter((error) => /^(selected_goals|stack|peers|interfaces)/.test(error));
    const findings = [...peerFindings(root, record), ...draft.map((error) => `${recordName}: ${error}.`)];
    return findings.length ? deny(findings.join(" ")) : allow();
  }
  const stoppedOnPurpose = Array.isArray(record.tasks) &&
    (record.tasks as ObjectValue[]).some((task) => ["failed", "blocked", "deferred"].includes(String(task.status)));
  if (stoppedOnPurpose) return allow();
  const findings: string[] = peerFindings(root, record);
  const drifted = (record.source_files as ObjectValue[])
    .filter((file) => sha256(join(root, String(file.path))) !== file.sha256)
    .map((file) => String(file.path));
  if (drifted.length) {
    findings.push(`Scoped files changed since the record was last updated: ${drifted.join(", ")}. Run the step's tests, then update task evidence and source_files hashes in ${recordName}.`);
  }
  // The handoff fields and the code checks are due at hand-off; a session on an older mid-build record is not turned into a rebuild.
  // Every planned file is on disk: the code is written, so the hand-off checks apply even when the agent left tasks open.
  const written = Boolean(record.approved_scope) &&
    (record.source_files as ObjectValue[]).every((file) => existsSync(join(root, String(file.path))));
  const handoff = isHandoff(record) || written;
  if (record.approved_scope) {
    const recordErrors = validateIntegrationRecord(record, { requireReview: handoff });
    if (recordErrors.length) findings.push(`${recordName} does not validate: ${recordErrors.join("; ")}.`);
    const setup = join(root, setupName);
    if (existsSync(setup)) {
      try {
        const setupErrors = validateSetupPlan(YAML.parse(readFileSync(setup, "utf8")));
        if (setupErrors.length) findings.push(`${setupName} does not validate: ${setupErrors.join("; ")}.`);
      } catch (error) {
        findings.push(`${setupName}: ${yamlProblem(error)}.`);
      }
    }
  }
  const review = record.self_review as Record<string, ObjectValue | undefined> | undefined;
  const failed = review && typeof review === "object"
    ? Object.entries(review).filter(([, item]) => item?.result === "fail").map(([check]) => check)
    : [];
  if (failed.length) {
    findings.push(`self_review marks ${failed.join(", ")} as fail; fix each one, or ask the user before handing off with it.`);
  }
  const creators: string[] = [];
  const scoped = (handoff ? (record.source_files as ObjectValue[]) : [])
    .map((file) => String(file.path))
    .filter((path) => !artifacts.has(path))
    .map((path) => ({ path, text: readSmall(join(root, path)) }))
    .filter((file): file is { path: string; text: string } => file.text !== undefined);
  const conflictHandled = scoped.some((file) => handlesConflict(file.text));
  for (const { path, text } of scoped) {
    const lint = lintSource(path, text, backendPathOf(record), { conflictHandled });
    if (lint.block) findings.push(`${lint.block}.`);
    findings.push(...lint.advice.map((line) => `${line}.`));
    if (createsSubscription(text)) creators.push(path);
  }
  if (creators.length > 1) {
    findings.push(`More than one file creates subscriptions (${creators.join(", ")}); keep one code path that looks up the active subscription before creating one.`);
  }
  return findings.length
    ? deny(`${findings.join(" ")} Fix each one in the code when this session's task includes editing; when it does not (status, audit, verify without approval), list them for the user as open findings instead. Write an exception in nozle-integration-report.md only when the fix is impossible (for example no stored or request id identifies the unit), and never argue with this check in your reply. ${handoff
      ? "Then end with your normal hand-off summary for the user: what was built, what changed from the approved scope, what is unverified, and the dashboard steps."
      : "Then finish this step's reply as usual (the choices, the scope for approval, or the build progress) with these items as one short list; the build is not finished, so do not write a hand-off summary."}`)
    : allow();
}

/**
 * Records below `start` (a workspace that keeps one record per service, opened at the workspace root).
 * Only inside one git repository: a folder of unrelated repositories (~/Code) is not a workspace, and a
 * nested repository is another project whose records this session did not write.
 * shortcut: three levels deep and skipping dependency folders, enough for service folders in a repository.
 */
export function nestedIntegrationRoots(start: string, depth = 3): string[] {
  const found: string[] = [];
  if (!insideGitRepository(resolve(start))) return found;
  const skip = new Set(["node_modules", ".git", ".venv", "venv", "dist", "build", ".next", "vendor", "target"]);
  const walk = (dir: string, level: number) => {
    if (level > depth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    if (level > 0 && entries.includes(".git")) return;
    if (level > 0 && (entries.includes(recordName) || entries.includes(setupName))) {
      found.push(dir);
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry) || entry.startsWith(".")) continue;
      const path = join(dir, entry);
      try {
        if (statSync(path).isDirectory()) walk(path, level + 1);
      } catch {
        // unreadable entries are skipped
      }
    }
  };
  walk(resolve(start), 0);
  return found;
}

function insideGitRepository(dir: string): boolean {
  for (let current = dir; ; current = dirname(current)) {
    if (existsSync(join(current, ".git"))) return true;
    if (dirname(current) === current) return false;
  }
}

/** The record that owns a path: the nearest one above the file itself, else the one above the working directory. */
const rootFor = (cwd: string | undefined, target: string, fallback: string | undefined): string | undefined =>
  findIntegrationRoot(dirname(resolve(cwd ?? ".", target))) ?? fallback;

function combine(results: HookResult[]): HookResult {
  const denied = results.filter((result) => result.decision === "deny");
  if (denied.length) return deny(denied.map((result) => result.reason).join(" "));
  const context = results.map((result) => result.context).filter(Boolean).join(" ");
  return allow(context || undefined);
}

export function runHook(event: string, input: HookInput): HookResult {
  if (!(hookEvents as readonly string[]).includes(event)) throw new Error(`unknown hook event ${event}`);
  if (event === "permission") return isReadOnlyCheckCommand(input.command ?? "") ? allow() : { decision: "allow", abstain: true };
  const cwdRoot = findIntegrationRoot(input.cwd ?? ".");

  // Each edited file is judged by its own service's record, even when the session runs at the workspace root.
  if (event === "pre-edit" || event === "post-edit") {
    const targets = editTargets(input);
    if (targets.length === 0) return cwdRoot ? preEdit(cwdRoot, input) : allow();
    return combine(targets.map((target) => {
      const root = rootFor(input.cwd, target, cwdRoot);
      if (!root) return allow();
      const single = { ...input, path: target, paths: undefined };
      return event === "pre-edit" ? preEdit(root, single) : postEdit(root, single);
    }));
  }
  if (event === "pre-command" && !cwdRoot) {
    const roots = [...new Set(shellWriteTargets(input.command ?? "").map((target) => rootFor(input.cwd, target, undefined)).filter((root): root is string => !!root))];
    return combine(roots.map((root) => runRooted(event, root, input)));
  }
  if (!cwdRoot) {
    if (event === "session-start" || event === "stop") {
      return combine(nestedIntegrationRoots(input.cwd ?? ".").map((root) => runRooted(event, root, input)));
    }
    return allow();
  }
  return runRooted(event, cwdRoot, input);
}

function runRooted(event: string, root: string, input: HookInput): HookResult {

  switch (event) {
    case "session-start":
      return sessionContext(root);
    case "pre-edit":
      return preEdit(root, input);
    case "post-edit":
      return postEdit(root, input);
    case "pre-command": {
      const command = input.command ?? "";
      if (hasCredentialText(command)) return deny("command contains credential-like text; use an environment variable");
      if (legacyMcpPackage.test(command)) {
        return deny("@nozle-js/mcp is an outdated, undocumented package and is never used here; use the documentation MCP and the account connection the plugin registers");
      }
      if (userRunScript.test(command)) {
        return deny("billable test events are sent by the user, not the agent; list the script in the user's manual steps instead");
      }
      if (productionHost.test(command) && networkClient.test(command)) {
        return deny("command sends a request to the production Nozle API; the plugin never sends live traffic");
      }
      return preCommandWrites(root, input);
    }
    case "pre-mcp":
      return input.tool && readOnlyTools.has(input.tool)
        ? allow()
        : deny(`Nozle account tool ${input.tool ?? "(unnamed)"} is not on the read-only allowlist`);
    case "stop":
      return stop(root, input);
    default:
      return allow();
  }
}
