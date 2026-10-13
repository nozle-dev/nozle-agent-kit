# 7. Track costs and margins

**Covers:** provider costs, Cost Sheets, and reporting.
**Account needs:** `cost_models` (Cost Sheets; a missing or unpublished sheet is a manual dashboard step); `margin_policies` shows enforcement if configured.
**Shared prerequisites:** `usage_attribution`, `server_key`.

**Decide with the user**
- `cost-only-vs-billable`: for each provider call, is it cost-only tracking, billable usage, or untouched? (Never assume "free" means cost-only.)
- `cost-attribution`: which customer or feature a provider cost belongs to.

**Implement**
- `wrapOpenAI` and `wrapAnthropic` patch a client instance and emit one Feature Event when usage is present; `costMeterCode` adds detailed Cost Events. Inspect shared clients and every caller first, because a wrapper can emit billable usage for free callers. A wrapper always emits a billable Feature Event, so cost-only tracking cannot use one: send Cost Events (`POST /cost-events` with `cost_meter_code`, `external_customer_id` or `parent_transaction_id`, a stable `cost_event_id`, token `properties` and a Unix-seconds `timestamp`). Use the SDK method: Node `nozle.costEvents.track({...})`, Python `nozle.cost_events.track(...)` (both Engine host, `timestamp` as a number of Unix seconds), Go `TrackCostEvent`; REST from any other language. The Python docs do not list the method; it is in the published package. Cost Events never bill the customer. See runtime-contracts.md. Source: https://docs.nozle.dev/sdks/node/llm-auto-capture.md
- Never emit the same consumption twice (wrapper plus a manual call).
- **Without auto-capture** (LiteLLM, Gemini, the Vercel AI SDK, raw HTTP, a remote AI service, or any language without a wrapper) track the same data manually; nothing is lost. After each provider call, read the provider's reported usage (for a stream, the final usage chunk; with OpenAI-compatible clients and LiteLLM set `stream_options={"include_usage": True}`). Then send the usage: `usage.track` alone when the action spends credits, otherwise `track()` after success with `provider`, `model`, `input_tokens`, `output_tokens` properties, a key from the message or request id and a fixed timestamp. Then send one Cost Event per non-zero token type (`POST /cost-events` with `cost_meter_code`, `parent_transaction_id` set to the usage event's transaction id, a stable `cost_event_id`, and `properties: { tokens, provider, model, type }`). The model name must match a Cost Sheet rate, or the cost lands in the Uncosted queue. Unlike the wrappers, this path can retry from a queue.
- Use only cost meter codes and rates that exist in the Cost Sheet read. Unknown rates stay uncosted; cost processing is asynchronous, so figures can lag.

**Verify (local only):** a mock shows the cost event for an approved call, nothing for excluded callers, and no duplicate with the usage event.

**Do not:** invent rates, double count shared costs, or present delayed figures as final.
