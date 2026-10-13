import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";

const script = join(import.meta.dir, "../shared/scripts/nozle-first-event.mjs");
const KEY = "sk_nozle_testkey1234567890";
let server: ReturnType<typeof Bun.serve>;
let requests: { method: string; path: string; auth: string | null; body: any }[] = [];
let status = 202;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      requests.push({ method: req.method, path: new URL(req.url).pathname, auth: req.headers.get("authorization"), body: await req.json() });
      return new Response(status < 300 ? '{"ok":true}' : `{"error":"rejected, key ${KEY} is wrong"}`, { status });
    },
  });
});
afterAll(() => server.stop(true));

// Async spawn: a blocking spawn would stall the in-process test server the script talks to.
async function run(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn(["node", script, ...args], { env: { PATH: process.env.PATH ?? "", ...env }, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, out, err };
}
const base = () => `http://127.0.0.1:${server.port}`;
const required = ["--customer", "cust_1", "--event", "llm_requests", "--subscription", "sub_1"];

describe("nozle-first-event", () => {
  test("sends the timestamp as Unix seconds, the format the Events API accepts", async () => {
    requests = [];
    status = 202;
    await run([...required, "--base", base(), "--yes"], { NOZLE_SECRET_KEY: KEY });
    const ts = requests[0]?.body.event.timestamp;
    expect(Number.isInteger(ts)).toBe(true);
    expect(Math.abs(ts - Date.now() / 1000)).toBeLessThan(60);
  });

  test("dry run prints the exact request and sends nothing, even with a key set", async () => {
    requests = [];
    const result = await run([...required, "--base", base()], { NOZLE_SECRET_KEY: KEY });
    expect(result.code).toBe(0);
    expect(result.out).toContain("Dry run");
    expect(result.out).toContain("/api/v1/events");
    expect(result.out).toContain('"external_subscription_id": "sub_1"');
    expect(requests).toHaveLength(0);
    expect(result.out + result.err).not.toContain(KEY);
  });

  test("--yes sends one authenticated event with a stable transaction id and never prints the key", async () => {
    requests = [];
    status = 202;
    const result = await run([...required, "--properties", '{"tokens":5}', "--base", base(), "--yes"], { NOZLE_SECRET_KEY: KEY });
    expect(result.code).toBe(0);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("POST");
    expect(requests[0]!.path).toBe("/api/v1/events");
    expect(requests[0]!.auth).toBe(`Bearer ${KEY}`);
    expect(requests[0]!.body.event).toMatchObject({ transaction_id: "agent-kit-first-event:cust_1:llm_requests", external_customer_id: "cust_1", external_subscription_id: "sub_1", code: "llm_requests", properties: { tokens: 5 } });
    expect(result.out + result.err).not.toContain(KEY);
  });

  test("a rejected event exits non-zero, explains, and scrubs the key from the server's reply", async () => {
    status = 422;
    const result = await run([...required, "--base", base(), "--yes"], { NOZLE_SECRET_KEY: KEY });
    expect(result.code).toBe(1);
    expect(result.err).toContain("not accepted");
    expect(result.out + result.err).not.toContain(KEY);
    expect(result.out).toContain("<key>");
  });

  test("refuses to send without a key, with a publishable key, or with missing arguments", async () => {
    requests = [];
    expect((await run([...required, "--base", base(), "--yes"])).code).toBe(2);
    expect((await run([...required, "--base", base(), "--yes"], { NOZLE_SECRET_KEY: "pk_nozle_publishable123" })).err).toContain("secret key");
    expect((await run(["--customer", "c"])).code).toBe(2);
    expect(requests).toHaveLength(0);
  });
});
