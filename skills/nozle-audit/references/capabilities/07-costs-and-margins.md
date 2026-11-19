# 7. Track costs and margins

**Account:** `cost_models` (a missing or unpublished Cost Sheet is a dashboard step); `margin_policies`.
**Read first:** `/guides/ai/token-billing`, `/guides/margin/cost-models`, `/guides/margin/shared-prices`, `/api/cost-events`, `/api/llm-proxy`, and the stack's capture page (`/sdks/node/llm-auto-capture`, `/sdks/python/llm-auto-capture`, `/sdks/go/llm-usage`).

**Decide:** `cost-only-vs-billable` per provider call (free never implies cost-only); `cost-attribution` (which customer or feature a cost belongs to).

**Build**
- Capture helpers send a billable usage event for every call they see. Trace a shared client's callers first; never add a manual event for a captured call; cost-only sends cost events directly, with the customer id and no parent.
- Read the capture page for recognised clients and response shapes, how the customer is chosen per request (no customer records nothing, which keeps free callers unbilled), and its error callback. Without capture, send the usage call, then one cost event per non-zero token type linked to its transaction id.
- Each cost event names the real vendor and model and every reported token type (fields from the token-billing and shared-prices pages); always send the vendor (financial-rules.md, `cost-event-id`).
- Use only cost meter codes and rates in the Cost Sheet read. Cost figures lag; never present them as final.
- A spend limit caps the customer's charge; a margin policy refuses on cost.

**Verify:** a cost event per approved call with vendor, model and token type; nothing for excluded callers; no duplicate of the usage event.
