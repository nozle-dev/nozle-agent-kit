# Decisions the user makes

Questions come from this run's docs reads, account read and code study. A fact they settle is a finding, not a question. Never ask what the user already answered here or in the record. How to ask: [asking.md](asking.md).

## A named outcome asks only its gaps

When the user names an outcome, run the whole chain (stack, connect, account, code), then ask only the unresolved parts. No menu again. With nothing open, show the plan and ask for scope approval.

## Payment provider

1. Find what the product uses today from the code (manifests, imports, env variable names, webhook routes, billing tables), whatever it is, homegrown included. Describe the library and the jobs it does (checkout, subscriptions, invoices, metering, credits, webhooks). Never match against a fixed list of vendor names.
2. For each job a provider the docs do not document does, ask once:
   - move it to Nozle checkout with a documented provider (Recommended, even when larger; name the one that fits the product's currency and market, and what migrates: customers, subscriptions, open invoices, stored payment methods, webhooks; capability 10);
   - leave it out: the current system keeps it, with no Nozle paid plans or credits for those customers, while Nozle can still track usage and costs.
   Never offer to keep an undocumented provider beside Nozle billing, and never plan a move without an explicit yes. A move is its own scope item with a migration and a rollback.
3. With no provider yet, offer only providers that both have a docs checkout guide and appear in the account read. A documented provider the account lacks is a dashboard step; a connected provider without a guide is `unverified`. Never offer one from memory.
4. Per-provider facts (currency, hosted or modal, webhook setup, refunds) come from that provider's docs page at run time.

## What to measure: one decision per activity

Classify each activity from the code study (anything that spends, sends, generates, looks up or consumes):

| Status | Evidence | Do |
|---|---|---|
| `matched` | The account has a meter or feature for it and the code point is found | Confirm in one grouped question; no dashboard step |
| `suggested` | Code point found, nothing in the account | Propose unit, meter and count point; the meter is a dashboard step and the code waits for a fresh read |
| `partial` | Some siblings are tracked, this one is not | Name the tracked ones, suggest the missing one, ask |

- The user answers for every activity; never decide one yourself, "decide later" included. Group by area (onboarding, copilot, outbound channels), up to four questions per call, suggestion first.
- Always offer: track as billable usage, track cost only, do not track (code unchanged, exclusion recorded), decide later (nothing built).
- Anything that costs money or consumes a resource (AI generation, sends, lookups, enrichment, storage) is `suggested` even when nothing charges for it today; recommend tracking it (cost only when billing would change what users pay today).
- Code outside the folder is its own question first: give me the folder or repository (Recommended); meter it at this code's call site, when one exists; decide later; do not track. Mark conclusions about it `inferred`.
- Use the product's and the account's own billing names.

## Recording decisions

- Each answered question becomes a `decisions` entry in `nozle.integration.yaml`: `id`, `question`, `answer`, `basis` (`user`, `user_confirmed_recommendation`, or `matched_in_account`). Measure decisions use id `activity:<name>` and `activities: [<study activity ids>]`; edits are refused while a study activity has no answer.
- A recorded decision binds the build; changing it needs a new question. The scope lists the decisions it rests on.
- "Do not track" puts the activity's files (or folder with a trailing `/`) in `approved_scope.excluded_paths`; the edit guard refuses changes there. A file holding both a tracked and an untracked activity is a question before the scope.
- An unanswered decision blocks only the work that depends on it.
