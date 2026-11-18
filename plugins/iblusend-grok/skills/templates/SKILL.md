---
name: templates
description: "Find and read iBluSend message templates, and save a new or edited template after the person approves it. A template sends nothing."
---

# Templates

Use this to find, read, write or edit saved message templates. A template sends nothing on its own:
a person picks it later in a campaign or a conversation.

## Access

- These tools work only when the person ticked Templates on the Connect screen.
- Reading needs `templates:read`. Saving a draft also needs `templates:drafts:write`,
  which the person grants only by choosing Read and act.
- If a tool answers `insufficient_scope`, stop. Ask the person to reconnect and tick
  Templates on the Connect screen, and to choose Read and act if they want drafts saved.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tools

- `list_templates` finds templates by `search`, `category` or `channel`.
  `include_system: true` adds the read-only starter templates.
- `get_template` reads one template in full by `template_id`.
- `create_template` saves a new template (`name` and `content` required).
- `update_template` changes only the fields you send.

## Workflow

1. Look before you write. Check whether a similar template exists and offer to edit it instead.
2. Write variables like {{contact.first_name}}. They are read from the words.
3. Show the exact name, words, category and channel you will save, and ask before saving. If the
   person says stop or changes the request, save nothing and show a new version.
4. Call `create_template` or `update_template` once.
5. `created: false` means the same name and words already exist. Say so; do not make a copy.

## Limits

- Starter templates are read-only. To change one, save a copy with `create_template`.
- `template_in_live_campaign` means a running or paused campaign sends these words. They
  cannot change here; the person changes them in the app.
- Saving a template never sends a message. Never say that it did.
