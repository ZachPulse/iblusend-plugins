// Optional sign-in areas: reports, templates, campaigns and calendar.
//
// The person ticks each area on the Connect screen. Each area is its own OAuth scope, plus a
// draft scope for areas that save drafts (granted only with Read and act). The server serves
// every area tool to every OAuth grant and answers `insufficient_scope` when the area is missing.
// Nothing in an area sends, launches or books.

export const PLUGIN_AREAS = Object.freeze([
  Object.freeze({
    skill: "reports",
    label: "Reports",
    readScope: "reports:read",
    draftScope: null,
    readTools: Object.freeze(["get_report"]),
    draftTools: Object.freeze([]),
  }),
  Object.freeze({
    skill: "templates",
    label: "Templates",
    readScope: "templates:read",
    draftScope: "templates:drafts:write",
    readTools: Object.freeze(["list_templates", "get_template"]),
    draftTools: Object.freeze(["create_template", "update_template"]),
  }),
  Object.freeze({
    skill: "campaigns",
    label: "Campaigns",
    readScope: "campaigns:read",
    draftScope: "campaigns:drafts:write",
    readTools: Object.freeze(["list_campaigns", "get_campaign", "list_campaign_audiences"]),
    draftTools: Object.freeze(["create_campaign_draft", "update_campaign_draft"]),
  }),
  Object.freeze({
    skill: "calendar",
    label: "Calendar",
    readScope: "calendar:read",
    draftScope: null,
    readTools: Object.freeze([
      "list_appointments",
      "get_appointment",
      "get_availability",
      "list_meeting_types",
      "draft_booking",
      "draft_appointment_change",
    ]),
    draftTools: Object.freeze([]),
  }),
]);

export const AREA_SKILL_NAMES = Object.freeze(PLUGIN_AREAS.map((area) => area.skill));

export function areaTools(area) {
  return [...area.readTools, ...area.draftTools];
}

function code(value) {
  return `\`${value}\``;
}

function skillFrontmatter(name, description) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n`;
}

/**
 * Brand-neutral access rules shared by every area skill. The validator checks that each area
 * skill carries this section unchanged, so the reconnect guidance cannot drift.
 */
export function renderAreaAccessSection(area) {
  const draftLine = area.draftScope
    ? `- Reading needs ${code(area.readScope)}. Saving a draft also needs ${code(area.draftScope)},
  which the person grants only by choosing Read and act.
`
    : `- Every tool here needs only ${code(area.readScope)}.
`;
  const reconnectTail = area.draftScope
    ? `, and to choose Read and act if they want drafts saved`
    : "";
  return `## Access

- These tools work only when the person ticked ${area.label} on the Connect screen.
${draftLine}- If a tool answers ${code("insufficient_scope")}, stop. Ask the person to reconnect and tick
  ${area.label} on the Connect screen${reconnectTail}.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave ${code("workspace_id")} out.

`;
}

function reportsSkill(brand) {
  const area = PLUGIN_AREAS[0];
  return `${skillFrontmatter(
    area.skill,
    `Read the ${brand.package.displayName} Reports page numbers for one workspace: texts, replies, delivery, calls, deals and usage over a chosen period.`,
  )}
# Reports

Use this to answer questions like "how did my texts do this week?". It only reads.

${renderAreaAccessSection(area)}## Tool

- ${code("get_report")} returns the numbers for the last ${code("days")} days (1 to 365, default 7)
  and the same number of days before, for comparison. Pass ${code("timezone")} (for example
  America/Denver) when day boundaries matter; the default is UTC.

## Workflow

1. Ask for the period only if the request does not imply one.
2. Call ${code("get_report")} once.
3. Report the numbers as returned. Name the period and the comparison period.
4. Reply rate is contacts who replied divided by contacts texted. Do not recompute it another way.
5. Separate what the numbers show from your reading of them. Do not invent causes.
6. Nothing here changes data. Suggest a next step only when asked.
`;
}

function templatesSkill(brand) {
  const area = PLUGIN_AREAS[1];
  return `${skillFrontmatter(
    area.skill,
    `Find and read ${brand.package.displayName} message templates, and save a new or edited template after the person approves it. A template sends nothing.`,
  )}
# Templates

Use this to find, read, write or edit saved message templates. A template sends nothing on its own:
a person picks it later in a campaign or a conversation.

${renderAreaAccessSection(area)}## Tools

- ${code("list_templates")} finds templates by ${code("search")}, ${code("category")} or ${code("channel")}.
  ${code("include_system: true")} adds the read-only starter templates.
- ${code("get_template")} reads one template in full by ${code("template_id")}.
- ${code("create_template")} saves a new template (${code("name")} and ${code("content")} required).
- ${code("update_template")} changes only the fields you send.

## Workflow

1. Look before you write. Check whether a similar template exists and offer to edit it instead.
2. Write variables like {{contact.first_name}}. They are read from the words.
3. Show the exact name, words, category and channel you will save, and ask before saving. If the
   person says stop or changes the request, save nothing and show a new version.
4. Call ${code("create_template")} or ${code("update_template")} once.
5. ${code("created: false")} means the same name and words already exist. Say so; do not make a copy.

## Limits

- Starter templates are read-only. To change one, save a copy with ${code("create_template")}.
- ${code("template_in_live_campaign")} means a running or paused campaign sends these words. They
  cannot change here; the person changes them in the app.
- Saving a template never sends a message. Never say that it did.
`;
}

function campaignsSkill(brand) {
  const area = PLUGIN_AREAS[2];
  return `${skillFrontmatter(
    area.skill,
    `Read ${brand.package.displayName} campaigns and their results, and save a campaign draft after the person approves it. Only the person can launch it, in the app.`,
  )}
# Campaigns

Use this to review campaign results or to prepare a campaign draft. You cannot launch, pause or
resume a campaign. A campaign launches only when the person presses Launch in the app.

${renderAreaAccessSection(area)}## Tools

- ${code("list_campaigns")} lists campaigns and results, filtered by ${code("status")} or ${code("search")}.
- ${code("get_campaign")} reads one campaign: message, audience, schedule and results.
- ${code("list_campaign_audiences")} lists the contact groups and smart lists a campaign can go to.
- ${code("create_campaign_draft")} saves a new draft. It sends nothing.
- ${code("update_campaign_draft")} changes a draft. It sends nothing.

## Draft workflow

1. Resolve the audience with ${code("list_campaign_audiences")}, or ${code("list_contacts")} for tags or
   single contacts. If two audiences could match, ask; do not guess.
2. Use either your own words (${code("content")}) or a saved template (${code("template_id")}), not both.
3. Show the exact name, words or template, audience and schedule, and ask before saving. If the
   person says stop or changes the request, save nothing and show a new version.
4. Call ${code("create_campaign_draft")} or ${code("update_campaign_draft")} once.
5. Give the person ${code("app_url")} and say plainly: this is a draft, nothing was sent, and they
   check it and press Launch in the app. If ${code("app_url")} is empty, tell them to open the draft
   from Campaigns in the app.

## Limits

- ${code("created: false")} means the same name and message already exist as a draft. Say so.
- ${code("campaign_not_draft")} means it was already launched. It cannot change here.
- Never say a campaign was sent, scheduled to send, or launched because you saved a draft.
- Results are as returned. Rates are whole percents of messages sent.
`;
}

function calendarSkill(brand) {
  const area = PLUGIN_AREAS[3];
  return `${skillFrontmatter(
    area.skill,
    `Read ${brand.package.displayName} appointments, meeting types and open times, and prepare a booking, move or cancel link that the person confirms in the app.`,
  )}
# Calendar

Use this to read the calendar or to get a booking ready. You book, move and cancel nothing. The
person opens the link you give them and presses Schedule or Save in the app; only then does the
guest hear about it.

${renderAreaAccessSection(area)}## Tools

- ${code("list_appointments")} lists appointments, soonest first. The default range is the next 14 days.
- ${code("get_appointment")} reads one. ${code("can_change")} says whether it can be moved or cancelled.
- ${code("list_meeting_types")} lists the booking page's meeting types.
- ${code("get_availability")} lists open start times, for up to 14 days.
- ${code("draft_booking")} returns a link to a filled-in booking window. It books nothing.
- ${code("draft_appointment_change")} returns a link to a move or cancel. It changes nothing.

## Booking workflow

1. Resolve the contact with ${code("list_contacts")}. If two contacts could match, ask.
2. Check open times with ${code("get_availability")} and offer real times only.
3. Call ${code("draft_booking")} with the contact, start time (with a time zone) and length.
4. If ${code("slot_check")} says the time is not offered, say so before sharing the link.
5. Give the person ${code("app_url")} (or ${code("app_path")} when ${code("app_url")} is empty) and say:
   nothing is booked yet; open the link, check it and press Schedule.

## Move or cancel workflow

1. Read the appointment with ${code("get_appointment")}. Stop if ${code("can_change")} is false.
2. Call ${code("draft_appointment_change")} with ${code("action")} move (and ${code("new_starts_at")}) or cancel.
3. Share the link and ${code("next_step")}. Say nothing has changed until they press Save.

Never say an appointment was booked, moved or cancelled. Never message the guest about it unless
the person separately asks, and then use the safe draft-and-send workflow.
`;
}

const AREA_SKILL_RENDERERS = Object.freeze({
  reports: reportsSkill,
  templates: templatesSkill,
  campaigns: campaignsSkill,
  calendar: calendarSkill,
});

export function renderAreaSkill(brand, skillName) {
  const render = AREA_SKILL_RENDERERS[skillName];
  if (!render) throw new Error(`Unknown area skill: ${skillName}`);
  return render(brand);
}
