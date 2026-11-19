#!/usr/bin/env node
// Send ONE usage event to Nozle, run by the developer (never by a coding agent), to confirm that
// the key, customer, subscription and meter are wired up. It is a real billable event.
//
//   node nozle-first-event.mjs --customer <external id> --event <meter code> --subscription <external subscription id>
//       [--properties '{"tokens":1}'] [--timestamp <unix seconds>] [--yes]
//
// Without --yes it prints the exact request and sends nothing, and fixes a timestamp for you to reuse.
// With --yes it needs that --timestamp, so every run sends the identical event (same transaction id and
// timestamp) and Nozle counts it once. The key is read from NOZLE_SECRET_KEY (or NOZLE_API_KEY) and is never printed.

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const usage = "Usage: nozle-first-event.mjs --customer <id> --event <code> --subscription <id> [--properties <json>] [--transaction-id <id>] [--timestamp <unix seconds>] [--base <engine url>] [--yes]";
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

const sending = args.includes("--yes");
const given = flag("timestamp");
if (given !== undefined && !/^\d{9,11}$/.test(given)) die("--timestamp must be Unix seconds, as the dry run prints it");
if (sending && given === undefined) die("--yes needs --timestamp: run without --yes first and copy the command it prints, so a rerun sends the same event");
const timestamp = given === undefined ? Math.floor(Date.now() / 1000) : Number(given);

// Usage events go to the Engine, never to Core.
const base = (flag("base") ?? "https://api.nozle.app/engine").replace(/\/+$/, "");
const transactionId = flag("transaction-id") ?? `agent-kit-first-event:${customer}:${event}`;
const body = {
  event: {
    transaction_id: transactionId,
    external_customer_id: customer,
    external_subscription_id: subscription,
    code: event,
    properties,
    timestamp,
  },
};
const url = `${base}/api/v1/events`;

if (!sending) {
  const quote = (value) => `'${String(value).replace(/'/g, "'\\''")}'`;
  const kept = args.filter((arg, i) => arg !== "--timestamp" && args[i - 1] !== "--timestamp");
  const rerun = ["node", quote(process.argv[1]), ...kept.map(quote), "--timestamp", timestamp, "--yes"].join(" ");
  process.stdout.write(`Dry run. Nothing was sent. With --yes this would send a real, billable event:\n\nPOST ${url}\nAuthorization: Bearer <your secret key from NOZLE_SECRET_KEY>\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}\n\nTo send it, run this yourself (it reuses the same timestamp, so a rerun counts once):\n${rerun}\n`);
  process.exit(0);
}

const key = process.env.NOZLE_SECRET_KEY ?? process.env.NOZLE_API_KEY ?? "";
if (!key) die("Set NOZLE_SECRET_KEY to your server-side secret key (create it in the Nozle dashboard).");
if (!key.startsWith("sk_")) die("The key must be a secret key (sk_...). Publishable keys cannot send events.");

// What to do per refusal code, from https://docs.nozle.dev/api/errors and /api/events. Unknown codes get the generic hint.
const hints = {
  period_invoiced: "The timestamp falls in a billing period that is already invoiced. Run the dry run again for a current timestamp and send that.",
  transaction_id_conflict: "This transaction id was already sent with a different payload (another timestamp, code or properties). Send the original command again, or pass a new --transaction-id.",
  customer_payment_overdue: "This customer is blocked for unpaid invoices past their grace period. Usage resumes once they are paid.",
  customer_blocked: "This customer is blocked by staff. Paying does not lift it; contact support.",
  active_subscription_not_found: "The customer has no active subscription with this id.",
};

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
    let code;
    try {
      code = JSON.parse(text).code;
    } catch {}
    process.stderr.write(`The event was not accepted. ${hints[code] ?? "Check the customer id, the subscription id, and that the event code matches a meter on the customer's plan."}\n`);
    process.exit(1);
  }
  process.stdout.write(`Accepted. Transaction id: ${transactionId}. Look for it in the dashboard events list.\n`);
} catch (error) {
  die(scrub(`Request failed: ${error?.message ?? error}`), 1);
}
