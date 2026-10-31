/**
 * Build-quality checks on code the agent wrote inside an approved Nozle scope. They match code patterns,
 * never user text, and catch the faults the end-to-end rounds kept finding. A block is a rule the plugin
 * enforces; advice goes back to the agent to fix or explain.
 * shortcut: line-level patterns, not a parser; a random id passed through a function or another file is missed.
 */
export interface LintResult {
  block?: string;
  advice: string[];
  /** Shown after an edit only; never blocks at stop, because the right fix depends on the design. */
  notes?: string[];
}

export type BackendPath = "node-sdk" | "python-sdk" | "go-sdk" | "rest";
export const backendPaths: readonly BackendPath[] = ["node-sdk", "python-sdk", "go-sdk", "rest"];

const publicSecret = /\b(?:NEXT_PUBLIC|VITE|PUBLIC|REACT_APP|EXPO_PUBLIC|NUXT_PUBLIC)_NOZLE_\w*(?:SECRET|API_KEY)\w*/;
const serverSecret = /\bNOZLE_(?:SECRET_KEY|API_KEY)\b/;
const clientDirective = /^\s*["']use client["']/m;
// A value import of the server SDK; `import type` is erased at build time and is fine in client code.
const serverSdkImport = /^\s*import\s+(?!type\b)[^\n]*["']@nozle-js\/node["']|\brequire\(\s*["']@nozle-js\/node["']\s*\)/m;
const randomKey = /(?:idempotency|transaction)[_-]?(?:key|id)[^\n]*?(?:randomUUID|uuid4|uuidv4|uuid\.v4|uuid\.New|nanoid|Math\.random|Date\.now|time\.time|time\.Now)/i;
const randomAssign = /\b(\w+)\s*(?::\s*\w+\s*)?=\s*(?:await\s+)?(?:str\()?(?:crypto\.randomUUID|randomUUID|uuid\.uuid4|uuid4|uuidv4|uuid\.v4|uuid\.New(?:String)?|nanoid|Date\.now)\(/g;
const keyField = /(?:idempotency|transaction)[_-]?(?:key|id)|idempotencyKey|transactionId|TransactionID|IdempotencyKey|operation_key|cost_event_id/i;
const textConflict = /(?:\.message|\bstr\(\w+\)|\bString\(\w+\)|\.Error\(\))[^\n]*?(?:\.includes\(|\.match\(|\.indexOf\(|\.test\(|\bin\b|strings\.Contains)[^\n]*?(?:409|duplicate|already)/i;
const conflictTextFirst = /["'`](?:[^"'`\n]*?(?:409|duplicate|already)[^"'`\n]*?)["'`]\s+in\s+(?:str\(\w+\)|\w+\.message)/i;
const creditTrack = /\busage\.(?:track|Track)\(|\bTrackUsage\(/;
// Not usage.track (credit consumption) and not costEvents.track (cost only, never bills).
const featureTrack = /(?<!usage|costEvents|cost_events)\.(?:track|Track)\(/;
const llmWrapper = /\b(?:wrapOpenAI|wrapAnthropic|captureFetch|recordUsage|wrap_openai|wrap_anthropic|wrap_http_client|capture_http_client|capture_async_http_client|record_usage|WrapOpenAIHTTPClient|WrapAnthropicHTTPClient|WrapHTTPClient|RecordUsage)\(/;
// Direct Nozle calls only, so a file that calls the app's own track() wrapper is not flagged.
const testFile = /(?:^|\/)(?:tests?|__tests__|spec)\/|[._-](?:test|spec)\.[a-z]+$|(?:^|\/)test_[^/]+\.py$/;
const usageCall = /\.(?:usage\.)?[Tt]rack\(|\bTrackUsage\(|\.holds\.(?:create|finalize)\(|\b(?:Create|Finalize)CreditHold\(|\/api\/v1\/(?:events|usage\/track|usage\/holds)\b/;
// An event buffer (Node 0.28+, Python 0.26+, Go v0.25+) queues in memory and reports refusals to its error callback, never as a 409.
const bufferCreate = /\bcreateEventBuffer\(|\bevent_buffer\(|\bNewEventBuffer\(/;
const bufferAssign = /\b(\w+)\s*(?::\s*\w+\s*)?:?=\s*(?:await\s+)?[\w.]*(?:createEventBuffer|event_buffer|NewEventBuffer)\(|\bevent_buffer\([^\n]*\)\s+as\s+(\w+)/g;
// shortcut: `.close(` and `.flush(` on any receiver count; a buffer drained only in another file gets the note.
const bufferDrain = /\.(?:flush|close|Flush|Close)\(|\bwith\s+[\w.]*event_buffer\(/;
// A credit hold (Engine 2.30+) reserves credits until it is finalized, released or expires.
const holdCreate = /\.holds\.create\(|\bCreateCreditHold\(|\/usage\/holds["'`]/;
// Engine 2.30+ refuses an Idempotency-Key that starts with `hold:` (reserved for finalized holds) with 400.
const reservedHoldKey = /(?:idempotency[_-]?key|Idempotency-Key)["']?\s*[:=,]\s*f?[`"']hold:|\b(?:TrackUsage|CreateCreditHold)\([^\n]*,\s*[`"']hold:/i;
const holdRelease = /\.holds\.release\(|\bReleaseCreditHold\(|\/usage\/holds\/[^\n]*\/release\b/;
const mentionsNozle = /nozle/i;
const conflictStatus = /\b(?:status|status_code|statusCode|StatusCode)\b[^\n]{0,20}409|409[^\n]{0,20}\b(?:status|status_code|statusCode|StatusCode)\b|StatusConflict|HTTP_409|\b(?:hasCode|has_code|HasCode)\(\s*["']idempotency_key_reused["']/;
// A literal prefix before the placeholder (`sub_${id}`); a reference such as f"{record}.id" is not an id built from a template.
const builtSubscriptionId = /\b(?:subscriptionId|subscription_id|external_subscription_id|SubscriptionID)\b["']?\s*[:=]\s*(?:`[A-Za-z][^`$\n]*\$\{|f["'][A-Za-z][^"'{\n]*\{|["'][A-Za-z][^"'\n]*["']\s*\+)/;
// A transaction callback: sequelize.transaction(async (t) => {, prisma.$transaction(async (tx) => {, knex.transaction(async (trx) => {.
const transactionOpen = /\.(?:\$)?transaction\(\s*(?:async\s*)?(?:\(?[\w,\s]*\)?)\s*=>\s*\{|\.(?:\$)?transaction\(\s*async\s+function\s*\([^)]*\)\s*\{/g;

/** True when a Nozle usage call sits inside a database transaction callback (shortcut: brace matching, not a parser). */
export function chargesInsideTransaction(text: string): boolean {
  for (const match of text.matchAll(transactionOpen)) {
    let depth = 0;
    const start = (match.index ?? 0) + match[0].length - 1;
    for (let i = start; i < text.length; i += 1) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          if (usageCall.test(text.slice(start, i))) return true;
          break;
        }
      }
    }
  }
  return false;
}

const clientAbortToProvider = /\bsignal\s*:\s*(?:request|req|event\.request|c\.req\.raw|ctx\.request)\.signal\b/;
const subscriptionCreate = /\bsubscriptions\.create\(|\bcreateSubscription\(|\bSubscriptions\.Create\(|["'`][^"'`\n]*\/subscriptions["'`]\s*,\s*\{[^\n]*method:\s*["']POST/;

// Dependency manifests name the SDK without using it; only source imports decide the path.
const manifest = /(?:^|\/)(?:package(?:-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|Pipfile(?:\.lock)?|go\.(?:mod|sum))$/;
const serverSdks: Record<Exclude<BackendPath, "rest">, RegExp> = {
  "node-sdk": /["']@nozle-js\/node["']/,
  "python-sdk": /^\s*(?:from\s+nozle\b|import\s+nozle\b)/m,
  "go-sdk": /["']github\.com\/nozle-dev\/nozle-go[^"']*["']/,
};

/** `conflictHandled`: some scoped file already branches on a 409, so the per-file advice would be a false alarm (a helper in another file). */
export function lintSource(path: string, text: string, backendPath?: string, { conflictHandled = false } = {}): LintResult {
  const advice: string[] = [];
  if (publicSecret.test(text)) {
    return { block: `${path} reads a Nozle secret key through a browser-exposed variable; keep secret keys on the server`, advice };
  }
  if (clientDirective.test(text) && serverSecret.test(text)) {
    return { block: `${path} is client code and reads a Nozle secret key; move the call to a server route`, advice };
  }
  if (clientDirective.test(text) && serverSdkImport.test(text)) {
    return { block: `${path} is client code and imports @nozle-js/node, which reads the secret key; call a server route instead (on Node, createBillingHandler serves the React billing hooks)`, advice };
  }
  if (backendPath && (backendPaths as readonly string[]).includes(backendPath) && !manifest.test(path)) {
    for (const [sdk, pattern] of Object.entries(serverSdks)) {
      if (sdk !== backendPath && pattern.test(text)) {
        return {
          block: `${path} uses the ${sdk} but the recorded stack is ${backendPath}; ask the user before changing the SDK path, then update stack in nozle.integration.yaml`,
          advice,
        };
      }
    }
  }
  const randomNames = [...text.matchAll(randomAssign)].map((match) => match[1]!);
  const keyFromRandom = randomNames.some((name) =>
    text.split("\n").some((line) => keyField.test(line) && new RegExp(`\\b${name}\\b`).test(line) && !randomAssign.test(line)));
  randomAssign.lastIndex = 0;
  const notes: string[] = [];
  if (randomKey.test(text) || keyFromRandom) {
    notes.push(`${path}: a usage key comes from a random id or the clock; that is fine only when it is made once when the unit is stored and reused on every retry; otherwise use the stored row, job or message id`);
  }
  if (textConflict.test(text) || conflictTextFirst.test(text)) {
    advice.push(`${path}: a duplicate (409) is detected from the error text; check the status code instead`);
  }
  if (featureTrack.test(text) && (creditTrack.test(text) || llmWrapper.test(text))) {
    advice.push(`${path}: calls track() next to ${creditTrack.test(text) ? "usage.track" : "an LLM wrapper or capture helper"}; both bill, so make sure they never record the same action`);
  }
  const bufferNames = [...text.matchAll(bufferAssign)].map((match) => (match[1] ?? match[2])!);
  const bufferTrack = bufferNames.length ? new RegExp(`\\b(?:${bufferNames.join("|")})\\.(?:track|Track)\\(`) : undefined;
  const directUsage = text.split("\n").some((line) => usageCall.test(line) && !(bufferTrack?.test(line) ?? false));
  if (!conflictHandled && !testFile.test(path) && mentionsNozle.test(text) && directUsage && !conflictStatus.test(text)) {
    advice.push(`${path}: sends usage but never checks for a 409 by status; log a 409 separately as a caller bug (the key was reused with a different body)`);
  }
  if (builtSubscriptionId.test(text)) {
    notes.push(`${path}: builds a subscription id from a template; that is fine only for a subscription this code creates with that id, so when a lookup finds an existing one, use the id it returned`);
  }
  if (clientAbortToProvider.test(text)) {
    advice.push(`${path}: passes the client's abort signal to the provider call, so a disconnect cancels the provider and the usage is never billed; keep reading to the final usage, then bill`);
  }
  if (!testFile.test(path) && chargesInsideTransaction(text)) {
    advice.push(`${path}: calls Nozle inside a database transaction; charge after the commit, keyed by the committed record, so a rollback can't leave a charge behind`);
  }
  if (reservedHoldKey.test(text)) {
    advice.push(`${path}: an idempotency key starts with "hold:", which Nozle reserves and refuses with 400; use another prefix, such as the run or job name`);
  }
  if (!testFile.test(path) && bufferCreate.test(text) && !bufferDrain.test(text)) {
    notes.push(`${path}: creates an event buffer but never flushes or closes it; await flush() or close() before a serverless handler returns and close() on shutdown, or the queued events are lost`);
  }
  if (!testFile.test(path) && holdCreate.test(text) && !holdRelease.test(text)) {
    notes.push(`${path}: creates a credit hold but never releases it; release the hold when the work fails or is cancelled, or its credits stay reserved until it expires`);
  }
  return notes.length ? { advice, notes } : { advice };
}

/** True when the text branches on a 409 status anywhere. */
export function handlesConflict(text: string): boolean {
  return conflictStatus.test(text);
}

export function createsSubscription(text: string): boolean {
  return subscriptionCreate.test(text);
}
