---
name: past-texts
description: "Read the past texts the iBluSend workspace owner copied from their Mac, for one contact or by words. Read only."
---

# Past texts

Use this to look back at older conversations the owner brought in from their Mac. It only reads.

## Access

- Only the workspace owner can tick Past texts from your Mac on the Connect screen, and only while it is on
  for that workspace. A team member's connection never has these tools.
- Every tool here needs only `history:read`.
- The tools appear only on a connection that ticked Past texts from your Mac. If they are missing, or a
  tool answers `insufficient_scope` or an `_unavailable` code, stop. Ask the owner
  to reconnect and tick Past texts from your Mac on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tools

- `list_history` reads one contact's past texts, newest first (`contact_id`; up to
  500). To read further back, send `next_before` as `before`.
- `search_history` finds words in past texts, across the workspace or for one contact
  (`query`, 3 to 200 characters, plain text).

## Workflow

1. Find the contact with `list_contacts`. If two contacts could match, ask.
2. Read only what the question needs. Quote short parts; do not paste whole conversations.
3. Say when a text is from past texts (`source: mac_history`), so it is not mistaken for a new
   message.
4. Pictures stay in the app. Say so if the person asks for one.

## Answers

- `contact_not_found`: the contact is not in this workspace.
- `workspace_binding_required`: the connection must cover exactly one workspace. Ask the
  owner to reconnect.

## Limits

- Past texts are private to the owner. Never send them to anyone or copy them into a message
  without the owner asking.
- Nothing here sends, changes or deletes a text.
