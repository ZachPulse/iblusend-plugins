---
name: workflow-builder
description: "Build and edit iBluSend workflow drafts for the workspace owner: blocks, triggers and steps, checked before saving. The owner publishes in the app."
---

# Workflow builder

Use this to build a new automation or change an existing one, as a draft. The owner reviews and
publishes it in the workflow builder.

## Access

- Only the workspace owner can tick Workflows on the Connect screen, and only while it is on
  for that workspace. A team member's connection never has these tools.
- Reading needs `workflows:read`. Saving also needs `workflows:drafts:write`, which the
  person grants only by choosing Read and act.
- The tools appear only on a connection that ticked Workflows. If they are missing, or a
  tool answers `insufficient_scope` or an `_unavailable` code, stop. Ask the owner
  to reconnect and tick Workflows on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tools

- `list_workflow_blocks` lists every trigger and step you can use.
- `get_workflow_block_schema` gives one block's fields (`type` and `category`).
- `list_workflow_resources` lists the workspace's real pipelines, stages, salespeople,
  forms and other items a block can point at (`kind`).
- `list_workflows` and `get_workflow` read workflows. `get_workflow` gives the
  `revision` you need before any change.
- `validate_workflow_draft` checks a whole draft or a list of edits and saves nothing.
- `create_workflow_draft` saves a new draft (`snapshot`).
- `update_workflow_draft` changes a draft with `expected_revision` and either a full
  `snapshot` or `edits`.

## Workflow

1. Read the blocks you need with `list_workflow_blocks` and `get_workflow_block_schema`.
   Never invent a block type or a field.
2. Point blocks only at real items from `list_workflow_resources`. If two could match, ask.
3. To change a workflow, read it with `get_workflow` first and send its revision as
   `expected_revision`. Never guess a revision.
4. Check the draft with `validate_workflow_draft`. Fix every error it lists.
5. Show the trigger and each step in plain words and ask before saving.
6. Save once. `put_node` and `put_edge` replace whole items;
   `remove_node` also removes its links.

## Drafts only

- Saving here changes a draft. It never runs, publishes, switches on or applies anything, and it
  never messages anyone.
- After a save, give the person `editor_url` and say plainly that it is a draft and that
  they publish it in the workflow builder. Never say it is live.
- Show what you will save and ask before saving. If the person says stop or changes the request,
  save nothing and show a new version.
- Every save takes an `idempotency_key`. Reuse a key only to retry the exact same request;
  a new request gets a new key. `idempotency_conflict` means the key was used for something
  else: make a new key, never edit the old request to fit.

## Answers

- `workflow_revision_conflict`: someone changed it since you read it. Read it again, show
  the person what changed, and start over.
- `workflow_not_found`: it is not in this workspace. Do not search other workspaces.
- `workflow_authoring_unavailable`: the area is off or this is not the owner's connection.
- `body_too_large`: the draft is too big. Split it into a smaller workflow.

## Limits

- No tool here publishes, turns on, pauses or runs a workflow, or puts contacts into one.
- A step that sends texts sends them only after the owner publishes and turns the workflow on.
