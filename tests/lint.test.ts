import { describe, expect, test } from "bun:test";

import { createsSubscription, lintSource } from "../src/lint.ts";

describe("lintSource", () => {
  test("blocks a Nozle secret in browser code", () => {
    expect(lintSource("a.ts", "const k = import.meta.env.VITE_NOZLE_SECRET_KEY;").block).toContain("browser-exposed");
    expect(lintSource("a.tsx", '"use client";\nconst k = process.env.NOZLE_SECRET_KEY;').block).toContain("client code");
    expect(lintSource("route.ts", "const k = process.env.NOZLE_SECRET_KEY;").block).toBeUndefined();
  });

  test("blocks a server SDK that contradicts the recorded stack", () => {
    expect(lintSource("a.ts", 'import { Nozle } from "@nozle-js/node";', "rest").block).toContain("node-sdk");
    expect(lintSource("a.py", "from nozle import Nozle", "node-sdk").block).toContain("python-sdk");
    expect(lintSource("a.ts", 'import { Nozle } from "@nozle-js/node";', "node-sdk").block).toBeUndefined();
    expect(lintSource("package.json", '{ "dependencies": { "@nozle-js/node": "^0.9.0" } }', "rest").block).toBeUndefined();
    expect(lintSource("a.tsx", 'import { Gate } from "@nozle-js/react";', "rest").block).toBeUndefined();
  });

  test("advises on per-attempt random keys, not business ids", () => {
    expect(lintSource("a.ts", "track(x, { idempotencyKey: crypto.randomUUID() })").notes).toHaveLength(1);
    expect(lintSource("a.py", "idempotency_key = str(uuid.uuid4())").notes).toHaveLength(1);
    expect(lintSource("a.ts", "const transactionId = `msg-${Date.now()}`").notes).toHaveLength(1);
    expect(lintSource("a.ts", "const messageId = crypto.randomUUID();\nawait nozle.track(c, e, {}, { transactionId: messageId });").notes?.some((line) => line.includes("random id"))).toBe(true);
    expect(lintSource("a.ts", "const messageId = crypto.randomUUID();\nawait nozle.track(c, e, {}, { transactionId: `chat:${body.clientMessageId}` });").notes?.some((line) => line.includes("random id")) ?? false).toBe(false);
    expect(lintSource("a.ts", "track(x, { idempotencyKey: `job:${job.id}:${item.id}` })").notes).toBeUndefined();
  });

  test("blocks a value import of the server SDK in client code", () => {
    expect(lintSource("a.tsx", '"use client";\nimport { Nozle } from "@nozle-js/node";').block).toContain("imports @nozle-js/node");
    expect(lintSource("a.tsx", '"use client";\nimport type { CanResult } from "@nozle-js/node";').block).toBeUndefined();
    expect(lintSource("route.ts", 'import { Nozle } from "@nozle-js/node";').block).toBeUndefined();
  });

  test("a 409 checked with hasCode counts as handled", () => {
    const text = 'import { Nozle } from "@nozle-js/node";\nawait nozle.usage.track(input, { idempotencyKey: k });\nif (err.hasCode("idempotency_key_reused")) log(err);';
    expect(lintSource("a.ts", text).advice.some((line) => line.includes("409"))).toBe(false);
  });

  test("capture helpers count as wrappers, cost events do not bill", () => {
    expect(lintSource("a.ts", "const f = nozle.captureFetch({ customerId });\nawait nozle.track(c, e);").advice[0]).toContain("capture helper");
    expect(lintSource("a.py", "client = nozle.wrap_http_client(http, customer_id=uid)\nnozle.track(c, e)").advice[0]).toContain("capture helper");
    expect(lintSource("a.ts", "await nozle.usage.track(input, { idempotencyKey: k });\nawait nozle.costEvents.track(cost);").advice.some((line) => line.includes("both bill"))).toBe(false);
  });

  test("advises on a 409 found by error text, not by status", () => {
    expect(lintSource("a.ts", 'if (err.message.includes("409")) return;').advice).toHaveLength(1);
    expect(lintSource("a.py", 'if "already" in str(e): pass').advice).toHaveLength(1);
    expect(lintSource("a.ts", "if (err.status === 409) return;").advice).toEqual([]);
  });

  test("advises when one file both tracks and consumes or wraps", () => {
    expect(lintSource("a.ts", "await nozle.usage.track(input, { idempotencyKey: k });\nawait nozle.track(c, e);").advice[0]).toContain("usage.track");
    expect(lintSource("a.ts", "const ai = wrapOpenAI(client, nozle, { customerId });\nawait nozle.track(c, e);").advice[0]).toContain("LLM wrapper");
    expect(lintSource("a.ts", "await nozle.usage.track(input, { idempotencyKey: k });").advice.some((line) => line.includes("both bill"))).toBe(false);
  });

  test("advises on usage without a 409 status branch", () => {
    const send = "await nozle.track(c, e, {}, { transactionId: `og:${row.id}` });";
    expect(lintSource("a.ts", send).advice.some((line) => line.includes("409 by status"))).toBe(true);
    expect(lintSource("a.ts", `${send}\nif (err.status === 409) log.error("caller bug");`).advice).toEqual([]);
    expect(lintSource("tests/test_billing.py", "nozle.track(c, e)").advice).toEqual([]);
    expect(lintSource("app/billing.py", "_nozle().usage.track(user, feature, idempotency_key=k)").advice.some((line) => line.includes("409 by status"))).toBe(true);
    expect(lintSource("app/analytics.py", "analytics.track(user, event)").advice).toEqual([]);
    expect(lintSource("app/billing.py", "_nozle().track(u, f)\nif exc.status_code == 409: log.error(exc)").advice).toEqual([]);
  });

  test("advises on a subscription id built from a template", () => {
    expect(lintSource("a.ts", "const body = { subscriptionId: `sub_${userId}` };").notes?.[0]).toContain("subscription id");
    expect(lintSource("a.py", 'payload = {"external_subscription_id": f"sub_{user.id}"}').notes?.[0]).toContain("subscription id");
    expect(lintSource("a.ts", "const body = { subscriptionId: sub.id };").notes).toBeUndefined();
    // a query reference or a pass-through expression is not an id built from a template (seen in the Nozle Copilot)
    expect(lintSource("a.py", '{"parameters": {"subscriptionId": f"{record}.id"}}').notes).toBeUndefined();
    expect(lintSource("a.py", '{"parameters": {"subscriptionId": selection}}').notes).toBeUndefined();
  });

  test("advises when the client's abort signal reaches the provider", () => {
    expect(lintSource("a.ts", "await fetch(url, { body, signal: request.signal });").advice[0]).toContain("abort signal");
    expect(lintSource("a.ts", "await fetch(url, { body, signal: upstream.signal });").advice).toEqual([]);
  });

  test("recognizes subscription creation", () => {
    expect(createsSubscription("await nozle.subscriptions.create({ customerId })")).toBe(true);
    expect(createsSubscription("nozle.subscriptions.list({ customerId })")).toBe(false);
  });
});

describe("charge inside a database transaction", () => {
  test("flags a usage call inside a transaction callback and stays quiet after the commit", () => {
    const inside = `await sequelize.transaction(async (t) => {\n  await Wallet.decrement('credits', { transaction: t });\n  await nozle.usage.track({ idempotencyKey: unit.key });\n});`;
    const after = `const unit = await sequelize.transaction(async (t) => { return Unit.create({}, { transaction: t }); });\nawait nozle.usage.track({ idempotencyKey: unit.key });`;
    expect(lintSource("src/purchase.js", inside).advice.join(" ")).toContain("inside a database transaction");
    expect(lintSource("src/purchase.js", after).advice.join(" ")).not.toContain("inside a database transaction");
  });
});
