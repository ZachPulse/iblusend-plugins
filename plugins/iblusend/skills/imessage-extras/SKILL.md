---
name: imessage-extras
description: "Send iBluSend iMessage tapbacks, typing bubbles, read receipts and voice memos to one approved contact, never a group."
---

# iMessage extras

Use this for the small iMessage touches around a conversation: a tapback on a message, the typing
bubble, a read receipt, or a voice memo. Each one reaches one contact and the contact sees it.

## Access

- These tools work only when the person chose Read and act and ticked iMessage extras on the
  Connect screen.
- Every tool here needs `signals:write`. It comes only with Read and act; a Read only
  connection never has it.
- If a tool answers `insufficient_scope`, stop. Ask the person to reconnect, choose Read
  and act, and tick iMessage extras on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Approved contacts

- The person approves contacts for this connection in the app: Developer, then AI Agent API,
  then Connected AI assistants, then Manage actions on this assistant. An approval lasts up to
  seven days.
- An approval is for one contact's phone number. A group is never approved.
- When a tool says the contact is not approved, nothing happened. Tell the person which contact
  to approve and where. Do not try another contact, another tool or another number.
- Never approve a contact yourself, and never ask the person to read you a code from the app.

## Who it reaches

- Every extra goes only to a contact approved under Manage actions, and never to a group.
- `oauth_recipient_not_allowed` means this contact is not approved.
  `oauth_send_disabled` means no contact is approved on this connection yet.
  `oauth_group_send_not_allowed` means the target is a group; that cannot work here.
- `mark_read` without `native` only clears the unread badge in the app. The contact
  sees nothing, so it needs no approval.

## Tools

- `send_reaction` puts a tapback on one message. Use `message_id` from
  `get_conversation`, or `phone` with `external_id`. Any single emoji works;
  words do not. A text message (SMS, green bubble) cannot take a tapback. Sending the same tapback
  again answers `already_delivered`.
- `remove_reaction` takes back a tapback you sent. `removal_queued: true` means it
  comes off after the Mac confirms. Never say the contact did not see it.
- `send_typing_indicator` shows the typing bubble from a line (`phone`,
  `device_id` from `list_devices`, `is_typing`). It lasts
  `duration_ms`, 3 to 60 seconds. Call again at `keepalive_interval_ms` to hold it,
  and send `is_typing: false` to clear it. iMessage only.
- `mark_read` clears the unread badge for one contact. With `native: true` and a
  `device_id` it also queues a read receipt from the Mac; `native_read_queued` says so.
- `send_voice_memo` sends a voice bubble to one contact (`to`, `audio_url`).
  The audio must be a public https link to an mp3, m4a, wav or aac file up to 25 MB.
  `memo_format` says whether it went as a voice bubble or as an attachment. Track it with
  `check_message_status` and its `message_id`.

## Before you act

- A voice memo is a message. Before `send_voice_memo`, check `get_opt_out_status`,
  then show the workspace, the exact recipient, the audio link and the line, and wait for a yes,
  as for a text. Call it once. If the result is unclear, check status; never send it again.
- A tapback or a read receipt is seen by the contact. If the person named the message and the
  emoji, that request is the go-ahead. If you chose the message or the emoji, show it and ask first.
- Show the typing bubble only just before a message the person already approved. It is never a
  stand-in for a reply.

## Stop and cancellation control

- The newest user instruction is authoritative. If, before a write tool starts, the user says
  stop, cancel, hold, pause, do not send, changes the request, or otherwise withdraws approval,
  cancel the pending action immediately.
- Cancellation invalidates every earlier preview and confirmation.
- Do not call `send_reaction` or `remove_reaction` or `send_typing_indicator` or `mark_read` or `send_voice_memo` for the cancelled action, even if an earlier message approved it.
- If the provider or host rejects or closes its confirmation, treat that as cancellation too.
- Silence, elapsed time, or approval for a different payload never restores authorization.
- To resume or act on a changed request, rebuild the exact preview from current state and obtain
  fresh explicit confirmation in a later user turn.
- After a pre-call cancellation, acknowledge that no write ran and stop this workflow unless the
  newest instruction explicitly replaces it with read-only work.
- If a write tool may already have started, do not claim that it was cancelled. Check status or
  current state, report the facts, and never retry the write automatically.

## Limits

- One contact per call. Never loop over contacts or conversations.
- `delivered: false` on a tapback means the platform has no acknowledgement yet; it does not
  prove the tapback is waiting. Read the status before you say anything about it.
- A voice memo needs a Mac with Apple silicon on the sending line.
