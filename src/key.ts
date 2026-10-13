import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Checks that the user's Nozle keys work, without the agent ever seeing them: values are read here,
// sent only to Nozle, and never printed. The request is a read of the plan catalog (nothing billable).

const defaultNames = ["NOZLE_SECRET_KEY", "NOZLE_PUBLISHABLE_KEY", "NOZLE_API_KEY"];
const envFiles = [".env.local", ".env"];

export type KeyFound = { name: string; source: string; value: string };
export type KeyResult = { name: string; source: string; kind: "secret" | "publishable" | "unknown"; ok: boolean; message: string };

/** `NAME=value` lines of a dotenv file (quotes and `export` stripped); comments and blanks skipped. */
export function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2]!;
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    out[match[1]!] = value;
  }
  return out;
}

/** Key variable names: the defaults plus any `NOZLE_*KEY` the app lists in `.env.example`. */
export function keyNames(directory: string): string[] {
  const names = new Set(defaultNames);
  const template = join(directory, ".env.example");
  if (existsSync(template)) {
    for (const name of Object.keys(parseDotenv(readFileSync(template, "utf8")))) {
      if (/^(?:[A-Z0-9_]*_)?NOZLE_[A-Z0-9_]*KEY$/.test(name)) names.add(name);
    }
  }
  return [...names];
}

/** Each key that has a value: the process environment first, then `.env.local`, then `.env`. */
export function findKeys(directory: string, env: Record<string, string | undefined> = process.env): KeyFound[] {
  const files = envFiles
    .filter((file) => existsSync(join(directory, file)))
    .map((file) => ({ file, values: parseDotenv(readFileSync(join(directory, file), "utf8")) }));
  const found: KeyFound[] = [];
  for (const name of keyNames(directory)) {
    if (env[name]) {
      found.push({ name, source: "environment", value: env[name]! });
      continue;
    }
    const hit = files.find(({ values }) => values[name]);
    if (hit) found.push({ name, source: hit.file, value: hit.values[name]! });
  }
  return found;
}

export function kindOf(value: string): KeyResult["kind"] {
  if (value.startsWith("sk_")) return "secret";
  if (value.startsWith("pk_")) return "publishable";
  return "unknown";
}

/** What an HTTP status from the plan catalog says about the key. */
export function describeStatus(status: number): { ok: boolean; message: string } {
  if (status >= 200 && status < 300) return { ok: true, message: `works (HTTP ${status})` };
  if (status === 401) return { ok: false, message: "rejected (HTTP 401): the key is wrong, revoked, or for another environment" };
  if (status === 403) return { ok: true, message: "accepted, but not allowed to read plans (HTTP 403): check its permissions in Settings > API Keys" };
  if (status === 429) return { ok: false, message: "not checked: rate limited (HTTP 429), try again shortly" };
  return { ok: false, message: `not checked: Nozle answered HTTP ${status}` };
}

export async function checkKeys(directory: string, base: string, request: typeof fetch = fetch): Promise<KeyResult[]> {
  const url = `${base.replace(/\/+$/, "")}/api/v1/plans?per_page=1`;
  const results: KeyResult[] = [];
  for (const key of findKeys(directory)) {
    const kind = kindOf(key.value);
    if (kind === "unknown") {
      results.push({ name: key.name, source: key.source, kind, ok: false, message: "is not a Nozle key (it should start with sk_ or pk_)" });
      continue;
    }
    try {
      const response = await request(url, { headers: { Authorization: `Bearer ${key.value}` } });
      results.push({ name: key.name, source: key.source, kind, ...describeStatus(response.status) });
    } catch {
      results.push({ name: key.name, source: key.source, kind, ok: false, message: `not checked: could not reach ${base}` });
    }
  }
  return results;
}

export function renderKeyResults(results: KeyResult[]): string {
  if (results.length === 0) {
    return "no Nozle key found: set NOZLE_SECRET_KEY (and NOZLE_PUBLISHABLE_KEY if the browser shows pricing) in .env or the environment\n";
  }
  return results.map((r) => `${r.name} (${r.kind} key, from ${r.source}): ${r.message}\n`).join("");
}
