# Asking the user: use the host's question tool

Every point where the user must choose or approve goes through the host's structured question tool, so the user gets a selectable list in the terminal or editor and answers with a keypress. A typed list of questions is the fallback, not the default.

## The rule

1. **Tool first.** If the host has a question tool, call it for goals, business decisions, measure decisions, provider choices and scope approval. Do not print the questions as text and wait. Put the findings, tables and plan in your message first, then call the tool; the tool shows only the questions.
2. **Fall back only when the tool is not there:** the tool is not in your tool list, the call returns "not supported" (headless, `exec` or print runs), or the user denies it. Then ask the same questions as a short numbered list with your recommendation first, and say the user can answer with the numbers.
3. **After the answer,** act on it, restate a free-text ("Other") answer in one line before using it, and save decisions to the record (see decision-questions.md).

## Tool names by host

| Host | Tool | Status |
|---|---|---|
| Claude Code | `AskUserQuestion` | verified live |
| Codex CLI | `request_user_input` | present in the CLI; reports "not supported in exec mode", so interactive sessions only |
| OpenCode | `question` | present in the binary |
| Gemini CLI, Cursor, VS Code Copilot, Cline, Windsurf | the host's own ask-the-user or "ask follow-up question" tool, if it lists one | names not verified here; look in your tool list for one that shows options and returns the choice |

If your tool list shows a question tool under a different name, use it. If the host has none, use the numbered list.

## Shape of a good question (the same for every host)

- **One concrete thing per question,** named in the question itself (the endpoint, the amount, the plan, the feature). It must make sense without the surrounding message.
- **A short header or label** (up to about 12 characters) when the tool has one: `Provider`, `Charge`, `Copilot`.
- **Two to four options.** Your recommendation first, with "(Recommended)" at the end of its label. Each option says in one line what it means for charges or for current users. The user can always type something else.
- **Up to four related questions per call.** More than that: a second call after the first answers. Questions that depend on an earlier answer wait for it.
- **Goals and similar "pick several":** every choice you show must be selectable, not only typed. A question holds at most four options, so split the shown choices over up to four multi-select questions in one call, grouped by theme (for example "Plans and payments", "Usage and limits", "Credits", "Costs and sync"), each label starting with the choice's original number (`5. Track usage for billing (Recommended)`). Choices you left out stay available by typing their number in "Other"; say which ones in the message.
- **Never write choice numbers as a Markdown numbered list.** Terminals renumber `1.`, `3.`, `5.` to 1, 2, 3, so the user sees the wrong numbers. List choices in a table with a `#` column, or as lines that start with the bold number (`**5** Track usage for billing`).
- **Anything that changes charges, exclusions or the payer:** one question each, never a guess, never a default the user did not see.
- **Scope approval:** options such as "Approve the whole scope (Recommended)", "Approve selected phases", "Change the scope". The scope is in your message above; the user approves only what they have read.
- **"Do not track" and "decide later"** are always valid options for an activity.

## Example (Claude Code shape; other hosts take the same content)

```json
{
  "questions": [
    {
      "header": "Copilot",
      "question": "Should the Copilot (POST /copilot/agent) be tracked and billed?",
      "multiSelect": false,
      "options": [
        { "label": "Track as billable usage (Recommended)", "description": "One credit per Copilot turn through usage.track; denied when the balance is empty." },
        { "label": "Track cost only", "description": "Provider cost is recorded for margins; the customer is not charged." },
        { "label": "Do not track", "description": "Nothing is built for it and its files stay unchanged." }
      ]
    }
  ]
}
```
