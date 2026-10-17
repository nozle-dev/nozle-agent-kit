/** Find Nozle that is already in the code, by what the code calls, so a run starts from the real state. */
import type { Files } from "./env.ts";

export interface Hit { file: string; line: number; text: string }
export interface UsageRow { capability: number; label: string; hits: Hit[] }
export interface UsageScan {
  /** A file counts as Nozle client code when it imports an SDK package or names the Nozle API host. */
  files: string[];
  rows: UsageRow[];
  envVars: string[];
}

const nozleFile = /@nozle-js\/(?:node|react)|(?:^|\n)\s*(?:import\s+nozle\b|from\s+nozle\s+import|from\s+nozle\.)|nozle-dev\/nozle-go|api\.nozle\.(?:app|dev)/;
// Each signal is a call the code makes, not a word the user said.
const signals: { capability: number; label: string; pattern: RegExp }[] = [
  { capability: 1, label: "Pricing and plans", pattern: /PricingTable|usePlans|\/plans\/public|public[_-]?plans/ },
  { capability: 2, label: "Checkout and payments", pattern: /\.checkout\(|checkoutMany|checkout_many|\/checkout\b|CheckoutButton|verifyCheckout/ },
  { capability: 3, label: "Subscriptions", pattern: /\.subscribe\(|\/subscribe\b|cancel_?[sS]ubscription|applySubscriptionTransition|subscriptions?\.(?:create|cancel)/ },
  { capability: 4, label: "Credits and top-ups", pattern: /usage\.track|usage_track|\/usage\/track|credits\.|credit_systems|creditSystems/ },
  { capability: 5, label: "Usage tracking", pattern: /\.track\(|\/events\b|wrapOpenAI|wrapAnthropic|captureFetch|recordUsage|wrap_openai|wrap_anthropic|wrap_http_client|capture_(?:async_)?http_client|record_usage|WrapHTTPClient|RecordUsage|WithLLM|transaction_?[iI]d/ },
  { capability: 6, label: "Feature access and limits", pattern: /\.can\(|\/can\b|usage\.check|usage_check|check-and-deduct|useEntitlement/ },
  { capability: 7, label: "Costs and margins", pattern: /costEvents|cost_events|\/cost-events|TrackCostEvent|costMeterCode|CostMeterCode|cost_meter_code/ },
  { capability: 8, label: "Customer billing dashboard", pattern: /BillingPortal|billing-portal|createBillingHandler|billingEndpoint|CurrentPlan|use(?:Subscription|CreditBalance|CreditHistory|Usage|Invoices|InvoiceDownload)\b/ },
  { capability: 9, label: "Billing and data sync", pattern: /webhook/i },
  { capability: 0, label: "Customer record (base)", pattern: /customers\.upsert|customers\.create|\/customers\b|customer_not_found/ },
];

export function scanNozleUsage(sources: Files): UsageScan {
  const files: string[] = [];
  const envVars = new Set<string>();
  const rows = new Map<number, UsageRow>();
  for (const [file, text] of Object.entries(sources)) {
    if (!nozleFile.test(text)) continue;
    files.push(file);
    for (const name of text.match(/\bNOZLE_(?:SECRET|API|PUBLISHABLE)[A-Z0-9_]*\b/g) ?? []) envVars.add(name);
    const lines = text.split("\n");
    lines.forEach((content, index) => {
      for (const { capability, label, pattern } of signals) {
        if (!pattern.test(content)) continue;
        const row = rows.get(capability) ?? { capability, label, hits: [] };
        if (row.hits.length < 5) row.hits.push({ file, line: index + 1, text: content.trim().slice(0, 100) });
        rows.set(capability, row);
      }
    });
  }
  return { files, rows: [...rows.values()].sort((a, b) => a.capability - b.capability), envVars: [...envVars].sort() };
}

export function renderUsageScan(scan: UsageScan, packages: { name: string; spec: string }[]): string {
  if (scan.files.length === 0 && packages.length === 0) {
    return "No Nozle usage found in the code: no SDK dependency, import, API call or NOZLE_ variable.\n";
  }
  const out = [`Nozle already in the code: ${scan.files.length} file(s)${packages.length ? `, packages ${packages.map((p) => `${p.name}@${p.spec || "*"}`).join(", ")}` : ""}`];
  for (const row of scan.rows) {
    out.push(`- ${row.capability === 0 ? "base" : `choice ${row.capability}`} ${row.label}:`);
    for (const hit of row.hits) out.push(`    ${hit.file}:${hit.line}  ${hit.text}`);
  }
  if (scan.envVars.length) out.push(`Environment variables read: ${scan.envVars.join(", ")}`);
  out.push("A row means a call exists, not that it is correct or complete: check each with nozle-doctor before building on it.");
  return `${out.join("\n")}\n`;
}
