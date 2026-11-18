---
name: safe-draft-and-send
description: "Draft one message, show its exact destination and content, require confirmation, send once, and check status."
---

# Safe draft and send

Use this workflow for one deliberate message to one phone number. A request to draft, rewrite,
summarize, or prepare is not permission to send.

## Non-negotiable send boundary

- Before calling `send_message`, show the connected workspace, exact E.164 phone destination,
  chosen device when applicable, exact final text, every media URL, and any message effect.
- Ask for explicit confirmation of that exact preview. Stop before the tool call until the user
  confirms. Provider confirmation UI is an additional approval boundary, not a replacement for
  the preview.
- If any destination, workspace, device, attachment, effect, or text changes after confirmation,
  show a new preview and obtain new confirmation.
- Call `send_message` once. Never retry an ambiguous timeout or transport failure; first check the
  returned message identifier or status so a retry cannot create a duplicate.
- Never split one request into multiple recipients, loop over contacts, or present this workflow as
  bulk messaging.
- Public OAuth sends are 1:1 only. If the requested destination is a group, multiple recipients, or
  a `group_chat_id`, stop and explain that this connection cannot send there.
- Never call `send_message` with `group_chat_id`.

## Stop and cancellation control

- The newest user instruction is authoritative. If, before a write tool starts, the user says
  stop, cancel, hold, pause, do not send, changes the request, or otherwise withdraws approval,
  cancel the pending action immediately.
- Cancellation invalidates every earlier preview and confirmation.
- Do not call `send_message` for the cancelled action, even if an earlier message approved it.
- If the provider or host rejects or closes its confirmation, treat that as cancellation too.
- Silence, elapsed time, or approval for a different payload never restores authorization.
- To resume or act on a changed request, rebuild the exact preview from current state and obtain
  fresh explicit confirmation in a later user turn.
- After a pre-call cancellation, acknowledge that no write ran and stop this workflow unless the
  newest instruction explicitly replaces it with read-only work.
- If a write tool may already have started, do not claim that it was cancelled. Check status or
  current state, report the facts, and never retry the write automatically.

## Public-v1 limits

- One-to-one: text, supported media, or a supported effect.
- Group conversations remain available to read, but every group-send target is unavailable.
- No group sends, group creation, reactions, voice memos, typing indicators, or native mark-read
  operation.
- Respect platform pacing, plan, device, and compliance enforcement. Never suggest a bypass.

## Workflow

1. Confirm the active connection is the intended workspace. Stop on ambiguity.
2. Resolve one phone recipient using `list_contacts`. Never guess between partial matches, and
   stop if the request resolves to a group or more than one recipient.
3. Call `get_opt_out_status`. If the recipient is opted out, stop; do not draft around or bypass
   the restriction.
4. Use `list_devices` when line selection matters. Report stale, offline, or missing device state
   instead of promising delivery.
5. Draft the message. Keep factual claims grounded in context the user supplied or conversation
   content they asked you to retrieve.
6. Display the exact confirmation preview described above and wait.
7. After explicit confirmation and the host's approval, call `send_message` exactly once with only
   the approved fields.
8. Preserve the returned message identifier. Use `check_message_status` once when available and
   report the status literally: queued, sent, delivered, read, failed, or unknown.

## Failure handling

- A queued or sent status is not proof of delivery or a reply.
- On an ambiguous call result, do not resend. Report the uncertainty and check status by the
  original identifier when one exists.
- On a scope, workspace, opt-out, device, or validation error, stop and explain the failed boundary.
- Never claim that provider approval is cryptographically proven by MCP; it is enforced jointly by
  this pause, provider UI, and server safeguards.
