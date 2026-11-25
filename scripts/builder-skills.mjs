// Builder areas: workflows, bots, voice agents and past texts.
//
// These differ from the area tools in area-skills.mjs in two ways:
//  - only the workspace owner can tick them on the Connect screen, and only while that feature
//    is on for the workspace (past texts: while it is switched on for the platform);
//  - their tools appear in the tool list only when the area was ticked, instead of always
//    appearing and answering `insufficient_scope`.
//
// Nothing here publishes a workflow, switches a bot on or applies a voice change. Each draft
// waits for the person in the app, at the link the tool returns.

export const BUILDER_AREAS = Object.freeze([
  Object.freeze({
    skill: "workflow-builder",
    label: "Workflows",
    readScope: "workflows:read",
    draftScope: "workflows:drafts:write",
    readTools: Object.freeze([
      "list_workflow_blocks",
      "get_workflow_block_schema",
      "list_workflow_resources",
      "list_workflows",
      "get_workflow",
      "validate_workflow_draft",
    ]),
    draftTools: Object.freeze(["create_workflow_draft", "update_workflow_draft"]),
    finishLink: "editor_url",
    finishAction: "publish it in the workflow builder",
  }),
  Object.freeze({
    skill: "bot-builder",
    label: "BluBot",
    readScope: "bots:read",
    draftScope: "bots:drafts:write",
    readTools: Object.freeze(["list_bot_templates", "list_bots", "get_bot"]),
    draftTools: Object.freeze(["create_bot_draft", "update_bot_draft"]),
    finishLink: "editor_url",
    finishAction: "test it and switch it on in the bot builder",
  }),
  Object.freeze({
    skill: "voice-agents",
    label: "Voice agents",
    readScope: "voice:read",
    draftScope: "voice:drafts:write",
    readTools: Object.freeze(["list_voice_agents", "get_voice_agent"]),
    draftTools: Object.freeze(["propose_voice_agent_change"]),
    finishLink: "review_url",
    finishAction: "press Apply or Dismiss in Voice Studio",
  }),
  Object.freeze({
    skill: "past-texts",
    label: "Past texts from your Mac",
    readScope: "history:read",
    draftScope: null,
    readTools: Object.freeze(["list_history", "search_history"]),
    draftTools: Object.freeze([]),
    finishLink: null,
    finishAction: null,
  }),
]);

export const BUILDER_SKILL_NAMES = Object.freeze(BUILDER_AREAS.map((area) => area.skill));

export function builderTools(area) {
  return [...area.readTools, ...area.draftTools];
}

function code(value) {
  return `\`${value}\``;
}

function skillFrontmatter(name, description) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n`;
}

/**
 * Brand-neutral access rules shared by every builder skill. The validator checks that each
 * builder skill carries this section unchanged.
 */
export function renderBuilderAccessSection(area) {
  const scopeLine = area.draftScope
    ? `- Reading needs ${code(area.readScope)}. Saving also needs ${code(area.draftScope)}, which the
  person grants only by choosing Read and act.
`
    : `- Every tool here needs only ${code(area.readScope)}.
`;
  return `## Access

- Only the workspace owner can tick ${area.label} on the Connect screen, and only while it is on
  for that workspace. A team member's connection never has these tools.
${scopeLine}- The tools appear only on a connection that ticked ${area.label}. If they are missing, or a
  tool answers ${code("insufficient_scope")} or an ${code("_unavailable")} code, stop. Ask the owner
  to reconnect and tick ${area.label} on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave ${code("workspace_id")} out.

`;
}

/**
 * Brand-neutral draft rule shared by every builder skill that saves. The validator checks that each
 * one carries it unchanged, so no builder skill can claim to publish, switch on or apply.
 */
export function renderDraftOnlySection(area) {
  return `## Drafts only

- Saving here changes a draft. It never runs, publishes, switches on or applies anything, and it
  never messages anyone.
- After a save, give the person ${code(area.finishLink)} and say plainly that it is a draft and that
  they ${area.finishAction}. Never say it is live.
- Show what you will save and ask before saving. If the person says stop or changes the request,
  save nothing and show a new version.
- Every save takes an ${code("idempotency_key")}. Reuse a key only to retry the exact same request;
  a new request gets a new key. ${code("idempotency_conflict")} means the key was used for something
  else: make a new key, never edit the old request to fit.

`;
}

function workflowSkill(brand) {
  const area = BUILDER_AREAS[0];
  return `${skillFrontmatter(
    area.skill,
    `Build and edit ${brand.package.displayName} workflow drafts for the workspace owner: blocks, triggers and steps, checked before saving. The owner publishes in the app.`,
  )}
# Workflow builder

Use this to build a new automation or change an existing one, as a draft. The owner reviews and
publishes it in the workflow builder.

${renderBuilderAccessSection(area)}## Tools

- ${code("list_workflow_blocks")} lists every trigger and step you can use.
- ${code("get_workflow_block_schema")} gives one block's fields (${code("type")} and ${code("category")}).
- ${code("list_workflow_resources")} lists the workspace's real pipelines, stages, salespeople,
  forms and other items a block can point at (${code("kind")}).
- ${code("list_workflows")} and ${code("get_workflow")} read workflows. ${code("get_workflow")} gives the
  ${code("revision")} you need before any change.
- ${code("validate_workflow_draft")} checks a whole draft or a list of edits and saves nothing.
- ${code("create_workflow_draft")} saves a new draft (${code("snapshot")}).
- ${code("update_workflow_draft")} changes a draft with ${code("expected_revision")} and either a full
  ${code("snapshot")} or ${code("edits")}.

## Workflow

1. Read the blocks you need with ${code("list_workflow_blocks")} and ${code("get_workflow_block_schema")}.
   Never invent a block type or a field.
2. Point blocks only at real items from ${code("list_workflow_resources")}. If two could match, ask.
3. To change a workflow, read it with ${code("get_workflow")} first and send its revision as
   ${code("expected_revision")}. Never guess a revision.
4. Check the draft with ${code("validate_workflow_draft")}. Fix every error it lists.
5. Show the trigger and each step in plain words and ask before saving.
6. Save once. ${code("put_node")} and ${code("put_edge")} replace whole items;
   ${code("remove_node")} also removes its links.

${renderDraftOnlySection(area)}## Answers

- ${code("workflow_revision_conflict")}: someone changed it since you read it. Read it again, show
  the person what changed, and start over.
- ${code("workflow_not_found")}: it is not in this workspace. Do not search other workspaces.
- ${code("workflow_authoring_unavailable")}: the area is off or this is not the owner's connection.
- ${code("body_too_large")}: the draft is too big. Split it into a smaller workflow.

## Limits

- No tool here publishes, turns on, pauses or runs a workflow, or puts contacts into one.
- A step that sends texts sends them only after the owner publishes and turns the workflow on.
`;
}

function botSkill(brand) {
  const area = BUILDER_AREAS[1];
  return `${skillFrontmatter(
    area.skill,
    `Build and edit ${brand.package.displayName} BluBot chat bots for the workspace owner: start from a template, set the business facts, prompt, answers and hours. New bots start off.`,
  )}
# Bot builder

Use this to make a new AI chat bot or change one that is switched off. A new bot is always off and
answers no one until the owner switches it on in the app.

${renderBuilderAccessSection(area)}## Tools

- ${code("list_bot_templates")} lists the templates, industries and every setting a bot can have.
- ${code("list_bots")} and ${code("get_bot")} read bots. Each says if it is ${code("live")} and if AI
  tools can change it (${code("ai_can_edit")}). ${code("get_bot")} gives the ${code("revision")}.
- ${code("create_bot_draft")} makes a new bot from a template (${code("template_id")}) or from scratch
  (${code("template_id: null")}), with ${code("name")} and ${code("settings")}.
- ${code("update_bot_draft")} changes a bot that is off, with ${code("expected_revision")} and the
  ${code("settings")} to change.

## Workflow

1. Start with ${code("list_bot_templates")}. Pick the closest template and industry, or ask.
2. Collect the business facts from the person: name, what the business does, website, hours and
   time zone, the questions customers ask. Never invent prices, hours, policies or facts.
3. Show the name, the template and the settings you will save, and ask before saving.
4. To change a bot, read it with ${code("get_bot")} first and send its revision. Never guess one.
5. Use only setting names from ${code("list_bot_templates")}. Unknown fields are refused.

${renderDraftOnlySection(area)}## Live bots

- A bot is live while it is switched on, whatever its schedule. A live bot is read-only here.
- ${code("bot_is_live")} means the bot is on and answering customers. Nothing changed. Tell the
  person to turn it off in the app first, using ${code("turn_off_url")}, then try again.

## Answers

- ${code("bot_revision_conflict")}: the bot changed since you read it. Read it again and start over.
- ${code("bot_not_found")}: it is not in this workspace.
- ${code("unknown_template")}: use a ${code("template_id")} from ${code("list_bot_templates")}.
- ${code("invalid_request")}: fix the fields it names, for example a real time zone such as
  America/New_York.
- ${code("bot_authoring_unavailable")}: the area is off or this is not the owner's connection.

## Limits

- No tool here switches a bot on, picks its channels, model or keys, or sets its alerts.
- Never say a bot is answering customers after a save.
`;
}

function voiceSkill(brand) {
  const area = BUILDER_AREAS[2];
  return `${skillFrontmatter(
    area.skill,
    `Read ${brand.package.displayName} voice agents and propose a new prompt or first message for the workspace owner to apply in Voice Studio.`,
  )}
# Voice agents

Use this to review a phone voice agent and suggest a better prompt or greeting. A proposal changes
nothing until the owner applies it.

${renderBuilderAccessSection(area)}## Tools

- ${code("list_voice_agents")} lists the agents and whether AI tools can propose changes.
- ${code("get_voice_agent")} reads one agent: its prompt, first message and ${code("revision")}.
- ${code("propose_voice_agent_change")} saves a proposal: ${code("reason")} plus the full new
  ${code("system_prompt")} and/or ${code("first_message")}, with ${code("expected_revision")}.

## Workflow

1. Read the agent with ${code("get_voice_agent")}.
2. Write the whole new prompt or first message. A proposal replaces the whole text, so send all of it.
3. Write ${code("reason")} in one or two plain sentences: what changes and why.
4. Show the old and new text side by side and ask before saving.

${renderDraftOnlySection(area)}## Answers

- ${code("revision_conflict")}: the agent changed. Read it again and start over.
- ${code("no_change")}: the proposal matches what the agent already has.
- ${code("voice_agent_not_found")}: it is not in this workspace.
- ${code("voice_authoring_unavailable")}: the area is off or this is not the owner's connection.

## Limits

- A newer proposal for the same agent replaces one still waiting.
- No tool here places a call, changes the agent's phone number, voice or model, or applies a change.
`;
}

function pastTextsSkill(brand) {
  const area = BUILDER_AREAS[3];
  return `${skillFrontmatter(
    area.skill,
    `Read the past texts the ${brand.package.displayName} workspace owner copied from their Mac, for one contact or by words. Read only.`,
  )}
# Past texts

Use this to look back at older conversations the owner brought in from their Mac. It only reads.

${renderBuilderAccessSection(area)}## Tools

- ${code("list_history")} reads one contact's past texts, newest first (${code("contact_id")}; up to
  500). To read further back, send ${code("next_before")} as ${code("before")}.
- ${code("search_history")} finds words in past texts, across the workspace or for one contact
  (${code("query")}, 3 to 200 characters, plain text).

## Workflow

1. Find the contact with ${code("list_contacts")}. If two contacts could match, ask.
2. Read only what the question needs. Quote short parts; do not paste whole conversations.
3. Say when a text is from past texts (${code("source: mac_history")}), so it is not mistaken for a new
   message.
4. Pictures stay in the app. Say so if the person asks for one.

## Answers

- ${code("contact_not_found")}: the contact is not in this workspace.
- ${code("workspace_binding_required")}: the connection must cover exactly one workspace. Ask the
  owner to reconnect.

## Limits

- Past texts are private to the owner. Never send them to anyone or copy them into a message
  without the owner asking.
- Nothing here sends, changes or deletes a text.
`;
}

const BUILDER_SKILL_RENDERERS = Object.freeze({
  "workflow-builder": workflowSkill,
  "bot-builder": botSkill,
  "voice-agents": voiceSkill,
  "past-texts": pastTextsSkill,
});

export function renderBuilderSkill(brand, skillName) {
  const render = BUILDER_SKILL_RENDERERS[skillName];
  if (!render) throw new Error(`Unknown builder skill: ${skillName}`);
  return render(brand);
}
