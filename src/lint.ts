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
const randomKey = /(?:idempotency|transaction)[_-]?(?:key|id)[^\n]*?(?:randomUUID|uuid4|uuidv4|uuid\.v4|uuid\.New|nanoid|Math\.random|Date\.now|time\.time|time\.Now)/i;
const randomAssign = /\b(\w+)\s*(?::\s*\w+\s*)?=\s*(?:await\s+)?(?:str\()?(?:crypto\.randomUUID|randomUUID|uuid\.uuid4|uuid4|uuidv4|uuid\.v4|uuid\.New(?:String)?|nanoid|Date\.now)\(/g;
const keyField = /(?:idempotency|transaction)[_-]?(?:key|id)|idempotencyKey|transactionId|TransactionID|IdempotencyKey|operation_key|cost_event_id/i;
const textConflict = /(?:\.message|\bstr\(\w+\)|\bString\(\w+\)|\.Error\(\))[^\n]*?(?:\.includes\(|\.match\(|\.indexOf\(|\.test\(|\bin\b|strings\.Contains)[^\n]*?(?:409|duplicate|already)/i;
const conflictTextFirst = /["'`](?:[^"'`\n]*?(?:409|duplicate|already)[^"'`\n]*?)["'`]\s+in\s+(?:str\(\w+\)|\w+\.message)/i;
const creditTrack = /\busage\.(?:track|Track)\(|\bTrackUsage\(/;
const featureTrack = /(?<!usage)\.(?:track|Track)\(/;
const llmWrapper = /\b(?:wrapOpenAI|wrapAnthropic|wrap_openai|wrap_anthropic|WrapOpenAIHTTPClient|WrapAnthropicHTTPClient)\(/;
// Direct Nozle calls only, so a file that calls the app's own track() wrapper is not flagged.
const testFile = /(?:^|\/)(?:tests?|__tests__|spec)\/|[._-](?:test|spec)\.[a-z]+$|(?:^|\/)test_[^/]+\.py$/;
const usageCall = /\.(?:usage\.)?[Tt]rack\(|\bTrackUsage\(|\/api\/v1\/(?:events|usage\/track)\b/;
const mentionsNozle = /nozle/i;
const conflictStatus = /\b(?:status|status_code|statusCode|StatusCode)\b[^\n]{0,20}409|409[^\n]{0,20}\b(?:status|status_code|statusCode|StatusCode)\b|StatusConflict|HTTP_409/;
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
    advice.push(`${path}: calls track() next to ${creditTrack.test(text) ? "usage.track" : "an LLM wrapper"}; both bill, so make sure they never record the same action`);
  }
  if (!conflictHandled && !testFile.test(path) && mentionsNozle.test(text) && usageCall.test(text) && !conflictStatus.test(text)) {
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
  return notes.length ? { advice, notes } : { advice };
}

/** True when the text branches on a 409 status anywhere. */
export function handlesConflict(text: string): boolean {
  return conflictStatus.test(text);
}

export function createsSubscription(text: string): boolean {
  return subscriptionCreate.test(text);
}
