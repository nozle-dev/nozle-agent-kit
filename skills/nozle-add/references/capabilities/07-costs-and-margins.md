# 7. Track costs and margins

**Covers:** provider costs, Cost Sheets, and reporting.
**Account needs:** `cost_models` (Cost Sheets; a missing or unpublished sheet is a manual dashboard step); `margin_policies` shows enforcement if configured.
**Shared prerequisites:** `usage_attribution`, `server_key`.
**Read first:** `/guides/ai/token-billing`, `/guides/margin/cost-models`, `/guides/margin/shared-prices`, `/api/cost-events`, `/api/llm-proxy`, and the capture page for the stack (`/sdks/node/llm-auto-capture`, `/sdks/python/llm-auto-capture`, `/sdks/go/llm-usage`).

**Decide with the user**
- `cost-only-vs-billable`: for each provider call, is it cost-only tracking, billable usage, or untouched? (Never assume "free" means cost-only.)
- `cost-attribution`: which customer or feature a provider cost belongs to.

**Implement**
- Capture helpers and wrappers bill: they send a billable usage event for every call they see, and optionally cost events. So inspect a shared client and every caller first, never add a manual event for a captured call, and never use a capture helper for cost-only tracking: cost-only sends cost events directly, with the customer id and no parent.
- Read the capture page for which clients and response shapes are recognised, how the customer is chosen per request (a request with no customer records nothing, which keeps free callers unbilled), and what its error callback reports. Without capture (other languages, unrecognised clients or response shapes, remote AI services), send the same data manually: the usage call, then one cost event per non-zero token type, linked to the usage event's transaction id.
- A cost event names the real vendor and model, and every token type the provider reported, using the token types and vendor fields the token-billing and shared-prices pages list. A cost whose vendor or model matches no price stays uncosted; when the shared prices disagree between vendors, the docs say the vendor is required, so always send it. (self-review: `cost-event-id`)
- Use only cost meter codes and rates that exist in the Cost Sheet read. Cost processing is asynchronous, so figures can lag; never present them as final.
- A spend limit (choice 6) caps what the customer is charged, not the provider cost; a margin policy refuses on cost. Recommend a spend limit where usage billed in money can run away.

**Verify (local only):** a mock shows the cost event for an approved call with vendor, model and token type, nothing for excluded callers, and no duplicate with the usage event.

**Do not:** invent rates, double count shared costs, or present delayed figures as final.
