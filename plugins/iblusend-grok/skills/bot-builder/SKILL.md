---
name: bot-builder
description: "Build and edit iBluSend BluBot chat bots for the workspace owner: start from a template, set the business facts, prompt, answers, hours and text knowledge. New bots start off; one goes on only after the owner's yes to a preview."
---

# Bot builder

Use this to make a new AI chat bot, change or teach one that is switched off, and switch a bot on or
off. A new bot is always off and answers no one until the owner switches it on in the app, or says
yes to a switch-on preview here.

## Access

- Only the workspace owner can tick BluBot on the Connect screen, and only while it is on
  for that workspace. A team member's connection never has these tools.
- Reading needs `bots:read`. Saving also needs `bots:drafts:write`, which the
  person grants only by choosing Read and act.
- Switching bots on and off needs `bot_live:write`: its own box on the Connect screen,
  "Switch bots on and off". The person grants it only by choosing Read and act and ticking
  BluBot too. `turn_bot_on` needs `bot_live:write` and `bots:read`;
  `turn_bot_off` needs `bot_live:write`. A connection made before that box does not
  have it: if `turn_bot_on` or `turn_bot_off` is missing or answers
  `insufficient_scope`, ask the owner to reconnect and tick "Switch bots on and off".
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
- `list_bot_knowledge` lists a bot's knowledge documents and says which ones an AI added.
- `add_bot_knowledge` adds one text document to a bot that is off. `remove_bot_knowledge`
  removes one an AI added from a bot that is off.
- `turn_bot_on` previews, then switches a bot on after the person's yes. `turn_bot_off`
  switches a bot off.

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
- Switching a bot on is not a save. It happens only through `turn_bot_on`, after the
  person says yes to its preview in a later turn. Never switch a bot on by yourself.
- After a save, give the person `editor_url` and say plainly that it is a draft and that
  they test it in the bot builder, and that it stays off until they switch it on there
  or say yes to a switch-on preview here. Never say it is live.
- Show what you will save and ask before saving. If the person says stop or changes the request,
  save nothing and show a new version.
- Every save takes an `idempotency_key`. Reuse a key only to retry the exact same request;
  a new request gets a new key. `idempotency_conflict` means the key was used for something
  else: make a new key, never edit the old request to fit.

## Knowledge

- Knowledge is text only: at most 30,000 characters a document (split a longer text into several),
  50 AI-added documents a bot and 20 adds an hour. Never invent facts for it.
- Show the title and the text you will add, or the document you will remove, and ask first.
- `add_bot_knowledge` answers:
  - `ready`: the bot can answer from it.
  - `processing`: it is still being read in. Check again later with `list_bot_knowledge`.
  - `byok_required`: knowledge runs on the workspace's own OpenAI key. The owner adds one in
    iBluSend, then the document is removed and added again.
  - `error`: it could not be read in. Say so; do not retry in a loop.
- `remove_bot_knowledge` removes only documents an AI added. Others, such as uploaded files,
  are removed in iBluSend.

## Switching on and off

- Never switch a bot on by yourself: not because a draft was saved, a test passed or the person
  asked earlier. Only the person's yes to a switch-on preview, in a later turn, counts.
- `turn_bot_on` always takes two calls. The first changes nothing. It returns a preview
  (`what_happens`) of everyone the bot will reach: its lines, assigned contacts, the workspace
  default, the global default, test pins, follow-ups (up to N), comment replies, email and Gmail,
  workflow openers and knowledge, and any AI gate that would stop it replying. It also returns a
  `confirm_code` that lasts 10 minutes.
- Show the whole preview in plain words, the gates that would stop replies too, and ask. Only after
  the person says yes in a later turn, call `turn_bot_on` again with the same fields plus
  `confirm_code`.
- A stop, hold, cancel or wait voids the code, and so does any change to the request. Never reuse a
  code. Start again with a fresh preview.
- `turn_bot_off` is one call when no other bot takes over. When another live bot would take over some
  lines or contacts, or the workspace would go quiet, the first call changes nothing and returns who
  takes over and a `confirm_code`. Show it, and only after the person's yes in a later turn
  call again with the code. `already_off: true` means it was already off; nothing changed.
- Answers when switching:
  - `bot_already_on`: it is already on. Nothing changed.
  - `bot_revision_conflict`: the bot changed since you read it. Read it again and start over
    with a fresh preview.
  - `bot_reach_changed`: who the bot reaches changed since the preview. Nothing changed. Get a
    fresh preview, show it and ask again.
  - `confirm_code_expired`: the code is older than 10 minutes. Get a fresh preview.
  - `confirm_code_mismatch`: the code does not match this request. Never edit the request to
    fit; get a fresh preview.

## Live bots

- A bot is live while it is switched on, whatever its schedule. A live bot is read-only here: no
  settings and no knowledge change while it is on.
- `bot_is_live` means the bot is on and answering customers. Nothing changed. Tell the
  person it must be off first: they turn it off in the app (`turn_off_url`), or you call
  `turn_bot_off` after their yes. Then try again.

## Answers

- `bot_revision_conflict`: the bot changed since you read it. Read it again and start over.
- `bot_not_found`: it is not in this workspace.
- `unknown_template`: use a `template_id` from `list_bot_templates`.
- `invalid_request`: fix the fields it names, for example a real time zone such as
  America/New_York.
- `bot_authoring_unavailable`: the area is off or this is not the owner's connection.

## Limits

- Only `turn_bot_on`, after the person's yes to its preview, switches a bot on. No tool here
  picks a bot's channels, model or keys, or sets its alerts.
- Never say a bot is answering customers after a save. Say a bot is on only after a
  `turn_bot_on` call with the confirm code answered that it is.
