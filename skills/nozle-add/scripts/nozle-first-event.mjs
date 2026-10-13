#!/usr/bin/env node
// Send ONE usage event to Nozle, run by the developer (never by a coding agent), to confirm that
// the key, customer, subscription and meter are wired up. It is a real billable event.
//
//   NOZLE_SECRET_KEY=sk_... node nozle-first-event.mjs --customer <external id> --event <meter code> \
//       --subscription <external subscription id> [--properties '{"tokens":1}'] [--yes]
//
// Without --yes it prints the exact request and sends nothing. The key is read from NOZLE_SECRET_KEY
// (or NOZLE_API_KEY) and is never printed.

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const usage = "Usage: nozle-first-event.mjs --customer <id> --event <code> --subscription <id> [--properties <json>] [--transaction-id <id>] [--base <core url>] [--yes]";
const die = (message, code = 2) => {
  process.stderr.write(`${message}\n`);
  process.exit(code);
};

const customer = flag("customer");
const event = flag("event");
const subscription = flag("subscription");
if (!customer || !event || !subscription) die(usage);

let properties = {};
if (flag("properties") !== undefined) {
  try {
    properties = JSON.parse(flag("properties"));
  } catch {
    die("--properties must be valid JSON");
  }
}

const base = (flag("base") ?? "https://api.nozle.app/core").replace(/\/+$/, "");
// Stable by default, so running it twice counts once.
const transactionId = flag("transaction-id") ?? `agent-kit-first-event:${customer}:${event}`;
const body = {
  event: {
    transaction_id: transactionId,
    external_customer_id: customer,
    external_subscription_id: subscription,
    code: event,
    properties,
    timestamp: Math.floor(Date.now() / 1000),
  },
};
const url = `${base}/api/v1/events`;
const key = process.env.NOZLE_SECRET_KEY ?? process.env.NOZLE_API_KEY ?? "";

if (!args.includes("--yes")) {
  process.stdout.write(`Dry run. Nothing was sent. With --yes this would send a real, billable event:\n\nPOST ${url}\nAuthorization: Bearer <your secret key from NOZLE_SECRET_KEY>\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}\n`);
  process.exit(0);
}

if (!key) die("Set NOZLE_SECRET_KEY to your server-side secret key (create it in the Nozle dashboard under Settings > API Keys).");
if (!key.startsWith("sk_")) die("The key must be a secret key (sk_...). Publishable keys cannot send events.");

const scrub = (text) => text.split(key).join("<key>");
try {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const text = scrub(await response.text());
  process.stdout.write(`${response.status} ${response.statusText}\n${text}\n`);
  if (!response.ok) {
    process.stderr.write("The event was not accepted. Check the customer id, the subscription id, and that the event code matches a meter on the customer's plan.\n");
    process.exit(1);
  }
  process.stdout.write(`Accepted. Transaction id: ${transactionId}. Look for it in the dashboard events list.\n`);
} catch (error) {
  die(scrub(`Request failed: ${error?.message ?? error}`), 1);
}
