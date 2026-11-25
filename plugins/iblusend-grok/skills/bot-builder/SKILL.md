---
name: bot-builder
description: "Build and edit iBluSend BluBot chat bots for the workspace owner: start from a template, set the business facts, prompt, answers and hours. New bots start off."
---

# Bot builder

Use this to make a new AI chat bot or change one that is switched off. A new bot is always off and
answers no one until the owner switches it on in the app.

## Access

- Only the workspace owner can tick BluBot on the Connect screen, and only while it is on
  for that workspace. A team member's connection never has these tools.
- Reading needs `bots:read`. Saving also needs `bots:drafts:write`, which the
  person grants only by choosing Read and act.
- The tools appear only on a connection that ticked BluBot. If they are missing, or a
  tool answers `insufficient_scope` or an `_unavailable` code, stop. Ask the owner
  to reconnect and tick BluBot on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tools

- `list_bot_templates` lists the templates, industries and every setting a bot can have.
- `list_bots` and `get_bot` read bots. Each says if it is `live` and if AI
  tools can change it (`ai_can_edit`). `get_bot` gives the `revision`.
- `create_bot_draft` makes a new bot from a template (`template_id`) or from scratch
  (`template_id: null`), with `name` and `settings`.
- `update_bot_draft` changes a bot that is off, with `expected_revision` and the
  `settings` to change.

## Workflow

1. Start with `list_bot_templates`. Pick the closest template and industry, or ask.
2. Collect the business facts from the person: name, what the business does, website, hours and
   time zone, the questions customers ask. Never invent prices, hours, policies or facts.
3. Show the name, the template and the settings you will save, and ask before saving.
4. To change a bot, read it with `get_bot` first and send its revision. Never guess one.
5. Use only setting names from `list_bot_templates`. Unknown fields are refused.

## Drafts only

- Saving here changes a draft. It never runs, publishes, switches on or applies anything, and it
  never messages anyone.
- After a save, give the person `editor_url` and say plainly that it is a draft and that
  they test it and switch it on in the bot builder. Never say it is live.
- Show what you will save and ask before saving. If the person says stop or changes the request,
  save nothing and show a new version.
- Every save takes an `idempotency_key`. Reuse a key only to retry the exact same request;
  a new request gets a new key. `idempotency_conflict` means the key was used for something
  else: make a new key, never edit the old request to fit.

## Live bots

- A bot is live while it is switched on, whatever its schedule. A live bot is read-only here.
- `bot_is_live` means the bot is on and answering customers. Nothing changed. Tell the
  person to turn it off in the app first, using `turn_off_url`, then try again.

## Answers

- `bot_revision_conflict`: the bot changed since you read it. Read it again and start over.
- `bot_not_found`: it is not in this workspace.
- `unknown_template`: use a `template_id` from `list_bot_templates`.
- `invalid_request`: fix the fields it names, for example a real time zone such as
  America/New_York.
- `bot_authoring_unavailable`: the area is off or this is not the owner's connection.

## Limits

- No tool here switches a bot on, picks its channels, model or keys, or sets its alerts.
- Never say a bot is answering customers after a save.
