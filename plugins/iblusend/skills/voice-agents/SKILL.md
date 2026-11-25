---
name: voice-agents
description: "Read iBluSend voice agents and propose a new prompt or first message for the workspace owner to apply in Voice Studio."
---

# Voice agents

Use this to review a phone voice agent and suggest a better prompt or greeting. A proposal changes
nothing until the owner applies it.

## Access

- Only the workspace owner can tick Voice agents on the Connect screen, and only while it is on
  for that workspace. A team member's connection never has these tools.
- Reading needs `voice:read`. Saving also needs `voice:drafts:write`, which the
  person grants only by choosing Read and act.
- The tools appear only on a connection that ticked Voice agents. If they are missing, or a
  tool answers `insufficient_scope` or an `_unavailable` code, stop. Ask the owner
  to reconnect and tick Voice agents on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tools

- `list_voice_agents` lists the agents and whether AI tools can propose changes.
- `get_voice_agent` reads one agent: its prompt, first message and `revision`.
- `propose_voice_agent_change` saves a proposal: `reason` plus the full new
  `system_prompt` and/or `first_message`, with `expected_revision`.

## Workflow

1. Read the agent with `get_voice_agent`.
2. Write the whole new prompt or first message. A proposal replaces the whole text, so send all of it.
3. Write `reason` in one or two plain sentences: what changes and why.
4. Show the old and new text side by side and ask before saving.

## Drafts only

- Saving here changes a draft. It never runs, publishes, switches on or applies anything, and it
  never messages anyone.
- After a save, give the person `review_url` and say plainly that it is a draft and that
  they press Apply or Dismiss in Voice Studio. Never say it is live.
- Show what you will save and ask before saving. If the person says stop or changes the request,
  save nothing and show a new version.
- Every save takes an `idempotency_key`. Reuse a key only to retry the exact same request;
  a new request gets a new key. `idempotency_conflict` means the key was used for something
  else: make a new key, never edit the old request to fit.

## Answers

- `revision_conflict`: the agent changed. Read it again and start over.
- `no_change`: the proposal matches what the agent already has.
- `voice_agent_not_found`: it is not in this workspace.
- `voice_authoring_unavailable`: the area is off or this is not the owner's connection.

## Limits

- A newer proposal for the same agent replaces one still waiting.
- No tool here places a call, changes the agent's phone number, voice or model, or applies a change.
