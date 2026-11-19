# Asking the user

Every choice or approval (goals, measure decisions, business decisions, provider, scope) goes through the host's question tool so the user answers with a keypress.

## Rules

1. **Tool first.** Put findings, tables and the plan in your message, then call the tool; it shows only the questions. Fall back to a short numbered list (recommendation first) only when the tool is not in your list, returns "not supported" (headless or `exec` runs), or is denied.
2. **Ask, then stop.** End your turn after asking. Never continue (more reading, records, planning) on an assumed answer.
3. **No selection is no answer.** Empty, dismissed, timed out or auto-resolved means nothing was decided: never take your recommendation as the answer and never record it. Ask again as a numbered list and end the turn.
4. **After the answer,** restate a free-text ("Other") answer in one line before acting; ask again when it is ambiguous. Save it to `decisions` (decision-questions.md). Never write a decision the user did not give in this conversation. Goals enter the draft record only with a `goals` decision behind them; the Stop guard refuses one without it.

## Host tools

| Host | Tool |
|---|---|
| Claude Code | `AskUserQuestion` |
| Codex CLI | `request_user_input` (interactive sessions only; one choice per question, no multi-select; an unanswered question auto-resolves empty after about 2 minutes, which is rule 3) |
| OpenCode | `question` |
| Others | the tool in your list that shows options and returns the choice |

## Shape

- One concrete thing per question, named in the question itself (the endpoint, amount, plan), so it stands alone. A short header (about 12 characters) when the tool has one.
- Two to four options; the recommendation first, its label ending "(Recommended)"; each description says what it means for charges or current users.
- Up to four related questions per call; questions that depend on an answer wait for it.
- Anything that changes charges, exclusions or the payer: one question each, never a guess or an unseen default.
- Goals with a multi-select tool: every shown choice selectable, split over up to four multi-select questions grouped by theme, each label starting with the choice's number (`5. Track usage for billing (Recommended)`). Left-out choices are typed by number in "Other".
- Goals without multi-select: one question whose first option is the recommended set (`10, 5 and 4 (Recommended)`), smaller sets as the others, other numbers typed.
- Never write choice numbers as a Markdown numbered list (terminals renumber it); use a table with a `#` column.
- Scope approval: "Approve the whole scope (Recommended)", "Approve selected phases", "Change the scope", with the scope already in your message.
