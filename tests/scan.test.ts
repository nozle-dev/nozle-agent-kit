import { describe, expect, test } from "bun:test";
import { renderUsageScan, scanNozleUsage } from "../src/scan.ts";

const files = {
  "src/billing.ts": 'import { Nozle } from "@nozle-js/node";\nconst nozle = new Nozle({ apiKey: process.env.NOZLE_SECRET_KEY });\nawait nozle.usage.track({ customerId, credits: 2 }, { idempotencyKey });\nconst access = await nozle.can(customerId, "chat");\nawait nozle.checkout(customerId, "pro", url);',
  "src/other.ts": "const x = analytics.track('page'); const y = fetch('/events');",
  "app/routes.py": 'import nozle\nnozle.cost_events.track(cost_meter_code="gpt")\n@app.post("/webhooks/nozle")',
};

describe("scanNozleUsage", () => {
  const scan = scanNozleUsage(files);
  test("only files that import or call Nozle count; an unrelated .track( does not", () => {
    expect(scan.files.sort()).toEqual(["app/routes.py", "src/billing.ts"]);
    expect(scan.envVars).toEqual(["NOZLE_SECRET_KEY"]);
  });
  test("maps calls to capabilities with file and line", () => {
    const by = Object.fromEntries(scan.rows.map((row) => [row.capability, row.hits[0]]));
    expect(by[4]).toMatchObject({ file: "src/billing.ts", line: 3 });
    expect(by[6]).toMatchObject({ file: "src/billing.ts", line: 4 });
    expect(by[2]).toMatchObject({ line: 5 });
    expect(by[7]).toMatchObject({ file: "app/routes.py", line: 2 });
    expect(by[9]).toMatchObject({ file: "app/routes.py", line: 3 });
  });
  test("finds capture helpers and the billing handler", () => {
    const by = Object.fromEntries(scanNozleUsage({
      "src/ai.ts": 'import { Nozle } from "@nozle-js/node";\nconst f = nozle.captureFetch({ customerId });',
      "src/api/billing.ts": 'import { createBillingHandler } from "@nozle-js/node";\nexport const GET = createBillingHandler(nozle, { getCustomerId });',
    }).rows.map((row) => [row.capability, row.hits[0]]));
    expect(by[5]).toMatchObject({ file: "src/ai.ts", line: 2 });
    expect(by[8]).toMatchObject({ file: "src/api/billing.ts" });
  });
  test("finds event buffers and credit holds", () => {
    const by = Object.fromEntries(scanNozleUsage({
      "src/meter.ts": 'import { Nozle } from "@nozle-js/node";\nconst buffer = nozle.createEventBuffer({ onError });',
      "agent.go": 'import "github.com/nozle-dev/nozle-go"\nhold, err := client.CreateCreditHold(ctx, p, key)',
    }).rows.map((row) => [row.capability, row.hits[0]]));
    expect(by[5]).toMatchObject({ file: "src/meter.ts", line: 2 });
    expect(by[4]).toMatchObject({ file: "agent.go", line: 2 });
  });
  test("says plainly when nothing is there", () => {
    expect(renderUsageScan(scanNozleUsage({ "a.ts": "console.log(1)" }), [])).toContain("No Nozle usage found");
    expect(renderUsageScan(scan, [{ name: "@nozle-js/node", spec: "^0.10.0" }])).toContain("src/billing.ts:3");
  });
});
