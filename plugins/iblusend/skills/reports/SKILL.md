---
name: reports
description: "Read the iBluSend Reports page numbers for one workspace: texts, replies, delivery, calls, deals and usage over a chosen period."
---

# Reports

Use this to answer questions like "how did my texts do this week?". It only reads.

## Access

- These tools work only when the person ticked Reports on the Connect screen.
- Every tool here needs only `reports:read`.
- If a tool answers `insufficient_scope`, stop. Ask the person to reconnect and tick
  Reports on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tool

- `get_report` returns the numbers for the last `days` days (1 to 365, default 7)
  and the same number of days before, for comparison. Pass `timezone` (for example
  America/Denver) when day boundaries matter; the default is UTC.

## Workflow

1. Ask for the period only if the request does not imply one.
2. Call `get_report` once.
3. Report the numbers as returned. Name the period and the comparison period.
4. Reply rate is contacts who replied divided by contacts texted. Do not recompute it another way.
5. Separate what the numbers show from your reading of them. Do not invent causes.
6. Nothing here changes data. Suggest a next step only when asked.
