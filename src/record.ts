import { backendPaths } from "./lint.ts";

export type ObjectValue = Record<string, unknown>;

const statuses = new Set(["complete", "missing", "incomplete", "unavailable", "unsupported"]);
const taskStatuses = new Set(["pending", "active", "completed", "failed", "blocked", "deferred"]);
/** Build traps the agent checks one by one before handoff; each answer names its evidence. */
export const reviewChecks = [
  "usage-key", "conflict-409", "retries", "error-types", "charge-order", "stream-abort", "client-ids",
  "subscription-id", "paid-without-payment", "shadow-writes", "stuck-unit", "legacy-balance",
  "migration", "secret-key", "scope-changes",
  "ledger-once", "pending-owner", "charge-in-transaction", "key-provenance", "check-quantity", "off-mode", "renewal",
  "identity-lookup", "legacy-gates", "nullable-fields", "one-clock", "denial-retry", "claim-after-fulfil", "status-reader",
  "codes-exist", "lint-clean", "charge-parity", "shadow-seed",
  "dedupe-scope", "route-coverage", "seed-before-read", "next-period", "cost-event-id", "denial-after-work", "limit-source",
  "peer-contract", "fake-refusals", "step-isolation",
] as const;
/**
 * Checks that live tests failed while the agent's own review said pass: a pass needs a test that drives the case,
 * named in the evidence and listed in source_files, because reading the code was not enough.
 */
export const testBackedChecks = ["dedupe-scope", "legacy-gates", "next-period", "denial-after-work", "fake-refusals", "step-isolation"] as const;
// The test file conventions of the stacks the plugin supports (JS/TS, Python, Go).
const testPath = /(?:^|\/)(?:tests?|__tests__|spec)\/|[._-](?:test|spec)\.[a-z]+$|(?:^|\/)test_[^/]+\.py$|_test\.go$/;
const reviewResults = new Set(["pass", "fail", "not_applicable"]);
const setupStatuses = new Set(["manual_pending", "code_written", "code_verified", "awaiting_activation", "live_observed"]);
const forbiddenKey = /(^|_)(api_?key|secret|password|credential|access_?token|refresh_?token|auth_?token|api_?token|session_?token|id_?token|bearer_?token|client_?token|token|authorization|private_?key)(_|$)/i;
// A key has digits mixed in; a short all-letter word after the prefix (`sk_test_placeholder`) is a dummy value.
const credentialText = /\b(?:sk|pk)_(?:live|test|prod|dev|nozle)_?(?![A-Za-z_]{1,20}\b)[A-Za-z0-9]{3,}\b/i;
// An all-caps word after Bearer is an environment-variable placeholder (`Bearer YOUR_AUTH_SECRET`), not a token.
// A token has a digit mixed in (or the dotted shape of a JWT); a plain hyphenated word (`Bearer scoped-ai-token`) is a fixture.
const bearerToken = /\b[Bb][Ee][Aa][Rr][Ee][Rr]\s+(?![A-Z0-9_]+\b)(?=[A-Za-z0-9._~+/-]*(?:\d|[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.))[A-Za-z0-9._~+/-]{12,}/;

function object(value: unknown): ObjectValue | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ObjectValue
    : undefined;
}

function nonempty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonempty);
}

export function repositoryPath(value: string): boolean {
  return !value.startsWith("/") && !value.startsWith("~") &&
    !value.includes("\\") && !/^[A-Za-z]:/.test(value) &&
    value.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

function findCredentialFields(value: unknown, prefix = ""): string[] {
  const fields: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => fields.push(...findCredentialFields(item, `${prefix}${index}.`)));
  } else if (object(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
      if (forbiddenKey.test(normalizedKey)) fields.push(`${prefix}${key}`);
      fields.push(...findCredentialFields(nested, `${prefix}${key}.`));
    }
  }
  return fields;
}

export function hasCredentialText(value: unknown): boolean {
  if (typeof value === "string") return credentialText.test(value) || bearerToken.test(value);
  if (Array.isArray(value)) return value.some(hasCredentialText);
  if (object(value)) return Object.values(value).some(hasCredentialText);
  return false;
}

/** A YAML parse failure with its position and the usual fix, so the agent can repair the file instead of guessing. */
export function yamlProblem(error: unknown): string {
  const e = error as { linePos?: { line: number; col: number }[]; message?: string };
  const where = e.linePos?.[0] ? ` at line ${e.linePos[0].line}, column ${e.linePos[0].col}` : "";
  const what = String(e.message ?? "parse failed").split("\n")[0]!.replace(/\s+at line \d+, column \d+:?/, "");
  return `invalid YAML${where} (${what}); put double quotes around any text value that contains ": " or "#" or starts with a special character`;
}

/**
 * A record is at hand-off once a self-review exists or every task is done. Before that it is mid-build and is checked as
 * resume does, so an older record that predates a handoff field can still be resumed.
 * The Stop guard also treats a record as handed off once every planned file exists on disk (hook.ts), so a build that
 * leaves its tasks open still gets the self-review.
 */
export function isHandoff(value: unknown): boolean {
  const record = value as Record<string, unknown> | null;
  if (!record || typeof record !== "object") return true;
  return record.self_review !== undefined ||
    (Array.isArray(record.tasks) && record.tasks.every((task) => (task as Record<string, unknown> | null)?.status === "completed"));
}

/** `requireReview` is false on resume, which runs mid-build before the handoff self_review exists. */
export function validateIntegrationRecord(value: unknown, { requireReview = true } = {}): string[] {
  const record = object(value);
  if (!record) return ["integration record must be an object"];
  const errors: string[] = [];

  if (record.schema !== "nozle.integration" || record.version !== 1) {
    errors.push("integration record schema must be nozle.integration version 1");
  }
  if (!nonempty(record.organization_id)) errors.push("organization_id is required");
  if (!Array.isArray(record.selected_goals) || record.selected_goals.length === 0 ||
      record.selected_goals.some((goal) => !Number.isInteger(goal) || goal < 1 || goal > 10) ||
      new Set(record.selected_goals).size !== record.selected_goals.length) {
    errors.push("selected_goals must contain only options 1 through 10");
  } else if (!record.approved_scope || requireReview) {
    // Goals are the user's choice: a draft (and the handoff) records them only with the user's answer behind them.
    const decisions = Array.isArray(record.decisions) ? (record.decisions as unknown[]) : [];
    const answered = decisions.some((raw) => {
      const item = object(raw);
      return item?.id === "goals" && ["user", "user_confirmed_recommendation"].includes(String(item.basis));
    });
    if (!answered) {
      errors.push('selected_goals need the user\'s answer: ask the user which goals they want, end your turn, and only after they reply record their words in a decisions entry with id "goals" (basis user, or user_confirmed_recommendation when they accepted your recommendation). Never write that entry yourself: goals from an earlier record, your recommendation, or an empty or timed-out question are not an answer');
    }
  }
  if (record.stack !== undefined) {
    const stack = object(record.stack);
    if (!stack || !(backendPaths as readonly unknown[]).includes(stack.backend_path) || !nonempty(stack.runtime)) {
      errors.push(`stack needs backend_path (${backendPaths.join(", ")}) and runtime`);
    }
  }

  if (record.peers === undefined && requireReview) {
    errors.push("peers must be a list (use [] when this repository is the whole product)");
  } else if (record.peers !== undefined) {
    const peers = record.peers;
    if (!Array.isArray(peers) || peers.some((raw) => {
      const peer = object(raw);
      return !peer || !["backend", "frontend"].includes(String(peer.role)) || !nonempty(peer.location) || typeof peer.record_seen !== "boolean";
    })) errors.push("peers entries need role (backend or frontend), location and record_seen (true or false)");
  }
  if (record.interfaces !== undefined) {
    const interfaces = record.interfaces;
    if (!Array.isArray(interfaces) || interfaces.some((raw) => {
      const item = object(raw);
      return !item || !nonempty(item.id) || !nonempty(item.route) || !nonempty(item.method) ||
        (item.provides === true) === (item.consumes === true) || !["provided", "unmatched", "blocked"].includes(String(item.status));
    })) errors.push("interfaces entries need id, method, route, exactly one of provides or consumes, and status (provided, unmatched or blocked)");
  }

  // An integration the agent could not or should not build ends here: no scope, files, tasks or self-review exist to check.
  if (record.blocked !== undefined) {
    const blocked = object(record.blocked);
    if (!blocked || !nonempty(blocked.reason)) errors.push("blocked needs a reason (what stops the build and what the user must provide)");
    if (!Array.isArray(record.decisions)) errors.push("decisions must be a list (use [] when nothing needed asking)");
    return errors;
  }

  const configuration = object(record.configuration);
  if (!configuration) {
    errors.push("configuration families are required");
  } else if (Object.keys(configuration).length === 0) {
    errors.push("configuration needs at least one family");
  } else {
    for (const [family, raw] of Object.entries(configuration)) {
      const item = object(raw);
      if (!item || !statuses.has(String(item.status))) {
        errors.push(`configuration family ${family} has an invalid status`);
      } else if (item.status === "complete" && !nonempty(item.revision)) {
        errors.push(`configuration family ${family} needs a revision for complete`);
      } else if (item.status !== "complete" && !nonempty(item.reason)) {
        errors.push(`configuration family ${family} needs a reason for ${item.status}`);
      }
    }
  }

  const scope = object(record.approved_scope);
  if (!scope) {
    errors.push("approved_scope is required for a handoff record");
  } else {
    if (!nonempty(scope.approved_at) || Number.isNaN(Date.parse(String(scope.approved_at)))) {
      errors.push("approved_scope needs an approval timestamp");
    }
    if (!stringArray(scope.included_paths) || scope.included_paths.length === 0) {
      errors.push("approved_scope needs included paths");
    } else if (scope.included_paths.some((path) => !repositoryPath(path))) {
      errors.push("approved_scope contains a path outside the repository");
    }
    if (!stringArray(scope.excluded_operations)) errors.push("approved_scope needs explicit exclusions");
    if (scope.excluded_paths !== undefined) {
      if (!stringArray(scope.excluded_paths) || scope.excluded_paths.some((path) => !repositoryPath(path.replace(/\/+$/, "")))) {
        errors.push("approved_scope excluded_paths must be repository-relative paths");
      } else if (stringArray(scope.included_paths)) {
        const clash = scope.included_paths.find((inc) => (scope.excluded_paths as string[]).some((exc) => {
          const base = exc.replace(/\/+$/, "");
          return inc === base || inc.startsWith(`${base}/`);
        }));
        if (clash) errors.push(`approved_scope includes ${clash}, which excluded_paths leaves untouched`);
      }
    }
    if (!stringArray(scope.billing_rules)) errors.push("approved_scope needs billing rules");
  }

  // Every question the user answered, with who decided: the answers drive the scope, so they are part of the record.
  const decisionBasis = ["user", "user_confirmed_recommendation", "matched_in_account"];
  if (record.decisions !== undefined || requireReview) {
    if (!Array.isArray(record.decisions)) {
      errors.push("decisions must be a list (use [] when nothing needed asking)");
    } else {
      const seen = new Set<string>();
      for (const raw of record.decisions) {
        const item = object(raw);
        if (!item || !nonempty(item.id) || !nonempty(item.question) || !nonempty(item.answer) ||
            !decisionBasis.includes(String(item.basis))) {
          errors.push(`decisions entries need id, question, answer and basis (${decisionBasis.join(", ")})`);
        } else if (item.activities !== undefined && !stringArray(item.activities)) {
          errors.push(`decisions ${item.id}: activities must list the study activity ids the answer covers`);
        } else if (seen.has(String(item.id))) {
          errors.push(`decisions has a duplicate id ${item.id}`);
        } else {
          seen.add(String(item.id));
        }
      }
    }
  }

  if (!Array.isArray(record.source_files)) {
    errors.push("source_files must be a list");
  } else {
    for (const raw of record.source_files) {
      const file = object(raw);
      if (!file || !nonempty(file.path) || !(/^[0-9a-f]{64}$/i.test(String(file.sha256)) || file.sha256 === "absent")) {
        errors.push("source_files entries need path and SHA-256");
      } else if (!repositoryPath(String(file.path))) {
        errors.push("source_files contains a path outside the repository");
      }
    }
    const trackedPaths = new Set(record.source_files.map((raw) => object(raw)?.path));
    if (!scope || !stringArray(scope.included_paths) ||
        scope.included_paths.some((path) => !trackedPaths.has(path))) {
      errors.push("source_files must cover included paths");
    }
  }

  if (!Array.isArray(record.tasks)) {
    errors.push("tasks must be a list");
  } else if (record.tasks.length === 0) {
    errors.push("tasks need at least one planned step");
  } else {
    for (const raw of record.tasks) {
      const task = object(raw);
      if (!task || !nonempty(task.id) || !taskStatuses.has(String(task.status))) {
        errors.push("task needs an ID and valid status");
        continue;
      }
      if (task.status === "completed") {
        if (!scope) errors.push("completed tasks require an approved scope");
        if (!nonempty(task.evidence)) errors.push(`task ${task.id} is completed without evidence`);
      }
      if ((task.status === "failed" || task.status === "deferred") && !nonempty(task.reason)) {
        errors.push(`task ${task.id} needs a reason`);
      }
      if (task.phase !== undefined && !(Number.isInteger(task.phase) && (task.phase as number) >= 1)) {
        errors.push(`task ${task.id} phase must be a whole number from 1`);
      }
    }
    // A phase starts only after every earlier phase is verified; a deferred task does not hold the next phase back.
    const phased = record.tasks.map(object).filter((task): task is ObjectValue => Number.isInteger(task?.phase));
    for (const task of phased) {
      if (task.status !== "active" && task.status !== "completed") continue;
      const open = phased.find((earlier) => (earlier.phase as number) < (task.phase as number) &&
        earlier.status !== "completed" && earlier.status !== "deferred");
      if (open) errors.push(`task ${task.id} (phase ${task.phase}) is ${task.status} before phase ${open.phase} task ${open.id} is completed`);
    }
  }

  if (Array.isArray(record.tasks)) {
    const byId = new Map(record.tasks.map((raw) => [String(object(raw)?.id), object(raw)]));
    for (const task of byId.values()) {
      if (!task || !Array.isArray(task.depends_on)) continue;
      for (const dependency of task.depends_on) {
        const prerequisite = byId.get(String(dependency));
        if (!prerequisite) {
          errors.push(`task ${task.id} depends on unknown task ${dependency}`);
        } else if ((task.status === "completed" || task.status === "active") && prerequisite.status !== "completed") {
          errors.push(`task ${task.id} is ${task.status} before dependency ${dependency}`);
        }
      }
    }
  }

  if (scope && requireReview) {
    const review = object(record.self_review);
    if (!review) {
      errors.push(`self_review is required for a handoff record: ${reviewChecks.join(", ")}`);
    } else {
      const tests = Array.isArray(record.source_files)
        ? record.source_files.map((raw) => String(object(raw)?.path ?? "")).filter((path) => testPath.test(path))
        : [];
      for (const check of reviewChecks) {
        const item = object(review[check]);
        if (!item || !reviewResults.has(String(item.result)) || !nonempty(item.evidence)) {
          errors.push(`self_review ${check} needs result (pass, fail or not_applicable) and evidence`);
        } else if (item.result === "pass" && (testBackedChecks as readonly string[]).includes(check) &&
            !tests.some((path) => String(item.evidence).includes(path))) {
          errors.push(`self_review ${check} is pass only with a test that drives that case, named in its evidence and listed in source_files`);
        }
      }
    }
  }

  for (const field of findCredentialFields(record)) errors.push(`record contains forbidden credential field ${field}`);
  if (hasCredentialText(record)) errors.push("record contains credential-like text");
  return errors;
}

export function validateSetupPlan(value: unknown): string[] {
  const plan = object(value);
  if (!plan) return ["setup plan must be an object"];
  const errors: string[] = [];
  if (plan.schema !== "nozle.setup-plan" || plan.version !== 1) {
    errors.push("setup plan schema must be nozle.setup-plan version 1");
  }
  if (!Array.isArray(plan.items)) return [...errors, "setup plan items must be a list"];
  for (const raw of plan.items) {
    const item = object(raw);
    if (!item || !nonempty(item.id) || !setupStatuses.has(String(item.status))) {
      errors.push("setup item needs an ID and valid status");
      continue;
    }
    if (item.status === "manual_pending" && !nonempty(item.instructions)) {
      errors.push(`setup item ${item.id} needs manual instructions`);
    }
    if ((item.status === "code_verified" || item.status === "live_observed") && !nonempty(item.evidence)) {
      errors.push(`setup item ${item.id} is verified without evidence`);
    }
  }
  for (const field of findCredentialFields(plan)) errors.push(`setup plan contains forbidden credential field ${field}`);
  if (hasCredentialText(plan)) errors.push("setup plan contains credential-like text");
  return errors;
}

export function assessResume(
  value: unknown,
  currentFiles: Record<string, string>,
  currentConfiguration: Record<string, { status: string; revision?: string }>,
): { requires_review: boolean; drift: string[] } {
  const validation = validateIntegrationRecord(value, { requireReview: false });
  if (validation.length) return { requires_review: true, drift: validation };
  const record = value as ObjectValue;
  const drift: string[] = [];

  for (const raw of record.source_files as ObjectValue[]) {
    const path = String(raw.path);
    if (!Object.prototype.hasOwnProperty.call(currentFiles, path)) {
      drift.push(`source file not rechecked: ${path}`);
    } else if (currentFiles[path] !== raw.sha256) {
      drift.push(`source file changed: ${path}`);
    }
  }
  for (const [family, raw] of Object.entries(record.configuration as ObjectValue)) {
    const item = raw as ObjectValue;
    const current = currentConfiguration[family];
    if (!current || current.status !== item.status ||
        (current.revision ?? null) !== (item.revision ?? null)) {
      drift.push(`configuration changed: ${family}`);
    }
  }
  return { requires_review: drift.length > 0, drift };
}
