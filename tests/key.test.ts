import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { spawnSync } from "node:child_process";

import { checkKeys, describeStatus, findKeys, parseDotenv, renderKeyResults } from "../src/key.ts";

const app = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "nozle-key-"));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
};

describe("key check", () => {
  test("parses dotenv values with quotes, export and comments", () => {
    expect(parseDotenv('export A="x y"\nB=z # note\n# C=no\nD=\'q\'')).toEqual({ A: "x y", B: "z", D: "q" });
  });

  test("reads the environment first, then .env.local, then .env, plus names from .env.example", () => {
    const dir = app({ ".env": "NOZLE_SECRET_KEY=sk_file\nAPP_NOZLE_ADMIN_KEY=sk_custom\n", ".env.local": "NOZLE_PUBLISHABLE_KEY=pk_local\n", ".env.example": "APP_NOZLE_ADMIN_KEY=\n" });
    const found = findKeys(dir, { NOZLE_SECRET_KEY: "sk_env" });
    expect(found.map((k) => [k.name, k.source])).toEqual([
      ["NOZLE_SECRET_KEY", "environment"],
      ["NOZLE_PUBLISHABLE_KEY", ".env.local"],
      ["APP_NOZLE_ADMIN_KEY", ".env"],
    ]);
  });

  test("maps statuses to a verdict", () => {
    expect(describeStatus(200).ok).toBe(true);
    expect(describeStatus(401).ok).toBe(false);
    expect(describeStatus(403).ok).toBe(true);
    expect(describeStatus(500).ok).toBe(false);
  });

  test("calls the plan catalog with each key and never prints a key", async () => {
    const dir = app({ ".env": "NOZLE_SECRET_KEY=sk_good_123\nNOZLE_PUBLISHABLE_KEY=pk_bad_456\nNOZLE_API_KEY=oops\n" });
    const seen: string[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      seen.push(`${url} ${auth}`);
      return new Response("", { status: auth === "Bearer sk_good_123" ? 200 : 401 });
    }) as typeof fetch;
    const saved = { ...process.env };
    delete process.env.NOZLE_SECRET_KEY; delete process.env.NOZLE_PUBLISHABLE_KEY; delete process.env.NOZLE_API_KEY;
    const results = await checkKeys(dir, "https://core.test/core/", fake);
    process.env = saved;
    expect(seen).toEqual(["https://core.test/core/api/v1/plans?per_page=1 Bearer sk_good_123", "https://core.test/core/api/v1/plans?per_page=1 Bearer pk_bad_456"]);
    expect(results.map((r) => [r.name, r.ok])).toEqual([["NOZLE_SECRET_KEY", true], ["NOZLE_PUBLISHABLE_KEY", false], ["NOZLE_API_KEY", false]]);
    const text = renderKeyResults(results);
    for (const secret of ["sk_good_123", "pk_bad_456", "oops"]) expect(text).not.toContain(secret);
  });

  test("the CLI checks the directory it is given, not the current one", () => {
    const dir = app({ ".env": "NOZLE_API_KEY=not_a_key\n" });
    const env = { ...process.env, NOZLE_SECRET_KEY: "", NOZLE_PUBLISHABLE_KEY: "", NOZLE_API_KEY: "" };
    const run = spawnSync("bun", ["src/check.ts", "key", dir], { encoding: "utf8", env });
    expect(run.stdout).toContain("NOZLE_API_KEY (unknown key, from .env): is not a Nozle key");
    expect(run.status).toBe(1);
  });
});
