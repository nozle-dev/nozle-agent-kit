/** `nozle-study.yaml`: what the code study found before (or without) an account login, so a later login continues from it. */
import type { ObjectValue } from "./record.ts";
import { repositoryPath } from "./record.ts";

const activityStatus = ["matched", "suggested", "partial", "unknown"];
const accountStatus = ["not_read", "read"];

const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function validateStudy(value: unknown): string[] {
  const errors: string[] = [];
  const study = value && typeof value === "object" ? (value as ObjectValue) : undefined;
  if (!study) return ["study must be an object"];
  if (study.schema !== "nozle.study" || study.version !== 1) errors.push("study schema must be nozle.study version 1");
  const account = study.account_read as ObjectValue | undefined;
  if (!account || !accountStatus.includes(String(account.status))) {
    errors.push(`account_read.status must be one of ${accountStatus.join(", ")}`);
  } else if (account.status === "read" && (!nonempty(account.read_at) || Number.isNaN(Date.parse(String(account.read_at))))) {
    errors.push("account_read needs read_at when status is read");
  }
  if (!Array.isArray(study.activities)) {
    errors.push("activities must be a list");
  } else {
    for (const raw of study.activities) {
      const item = raw as ObjectValue | undefined;
      if (!item || !nonempty(item.id) || !nonempty(item.label) || !nonempty(item.location) || !activityStatus.includes(String(item.status))) {
        errors.push(`activities entries need id, label, location and status (${activityStatus.join(", ")})`);
        break;
      }
    }
  }
  if (study.findings !== undefined && !Array.isArray(study.findings)) errors.push("findings must be a list");
  if (!Array.isArray(study.source_files)) {
    errors.push("source_files must be a list of the files the study relied on");
  } else {
    for (const raw of study.source_files) {
      const file = raw as ObjectValue | undefined;
      if (!file || !nonempty(file.path) || !(/^[0-9a-f]{64}$/i.test(String(file.sha256)) || file.sha256 === "absent")) {
        errors.push("source_files entries need path and SHA-256");
        break;
      }
      if (!repositoryPath(String(file.path))) {
        errors.push("source_files contains a path outside the repository");
        break;
      }
    }
  }
  return errors;
}

/** Files whose content no longer matches the study: those findings need a fresh look, the rest can be reused. */
export function studyDrift(study: ObjectValue, currentHashes: Record<string, string>): string[] {
  const drift: string[] = [];
  for (const raw of Array.isArray(study.source_files) ? study.source_files : []) {
    const file = raw as ObjectValue;
    const now = currentHashes[String(file.path)];
    if (now === undefined) drift.push(`${file.path}: not checked`);
    else if (now !== file.sha256) drift.push(`${file.path}: ${file.sha256 === "absent" ? "now exists" : now === "absent" ? "was removed" : "changed"}`);
  }
  return drift;
}
