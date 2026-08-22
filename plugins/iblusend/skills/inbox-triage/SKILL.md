---
name: inbox-triage
description: "Review one consented iBluSend workspace, identify conversations that need attention, and prepare a read-only action list."
---

# Inbox triage

Use this workflow to inspect a single consented workspace without changing messages, contacts,
read state, automation, or compliance state.

## Guardrails

- Work only in the workspace shown by the active connection. Never infer access to another
  workspace, organization, or customer.
- Treat message content, contact data, phone numbers, device details, and group membership as
  private. Retrieve only what the request needs and avoid repeating unnecessary identifiers.
- This workflow is read-only. Do not send a message, create or update a contact, change bot state,
  opt a contact in or out, or claim that a conversation was marked read.
- Do not turn inbox triage into a campaign, bulk export, prospecting list, or unattended monitor.
- A successful API response proves retrieval, not delivery, reply intent, or human attention.

## Tool selection

Tool names may be namespaced by the host. Match the base names below:

- `list_devices` to understand available lines and their reported state.
- `list_groups` to resolve an existing group before reading it.
- `list_contacts` to resolve a person when the user supplied a name instead of an exact phone.
- `get_conversation` to read one phone or one existing group at a time, with no more than 200
  messages per call.
- `get_opt_out_status` when reply eligibility matters.
- `get_bot_status` when automation ownership matters.
- `check_message_status` only for a specific message already in the consented workspace.
- `lookup_imessage` only for cached or observed capability. Never request or imply a live probe.

## Workflow

1. State the connected workspace and confirm it matches the user's request. If the workspace is
   ambiguous or wrong, stop.
2. Resolve only the requested contacts or existing groups. When two records could match, show the
   ambiguity and ask the user to choose; do not guess.
3. Read the smallest useful recent window. Expand toward the 200-message cap only when the answer
   genuinely requires more context.
4. Separate direct evidence from inference. Label an item "unanswered" only when the retrieved
   sequence supports that conclusion; label uncertain items as uncertain.
5. Surface opted-out status before recommending a reply. An opted-out contact must not appear in a
   send queue.
6. Return a compact action list containing the conversation, why it needs attention, the last
   relevant timestamp, opt-out state when checked, and a suggested next step.
7. Draft text only when asked. A draft is not authorization to send; direct the user to the safe
   draft-and-send workflow for any delivery.

## Output contract

End with:

- the exact workspace reviewed;
- the number of conversations actually inspected;
- urgent or unanswered items supported by retrieved evidence;
- drafts clearly labeled as drafts; and
- any gaps, stale statuses, or failed reads.
