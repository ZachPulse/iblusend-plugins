// Optional sign-in areas: reports, templates, campaigns, calendar, invoices, contact edits,
// iMessage extras and calendar booking, in the server's canonical order.
//
// The person ticks each area on the Connect screen. A read area is its own OAuth scope, plus a
// draft scope for areas that save drafts (granted only with Read and act). Nothing in a read
// area sends, launches, books or charges.
//
// Three areas only act (`actScope`, no read scope): contact edits, iMessage extras and calendar
// booking. Each is one right that comes only with Read and act. Anything in them that reaches a
// contact works only for contacts the person approved under Manage actions.
//
// The server serves every area tool to every OAuth grant and answers `insufficient_scope` when the
// area is missing.

import { renderStopControlSection } from "./safe-send-body.mjs";

export const PLUGIN_AREAS = Object.freeze([
  Object.freeze({
    skill: "reports",
    label: "Reports",
    readScope: "reports:read",
    draftScope: null,
    readTools: Object.freeze(["get_report"]),
    draftTools: Object.freeze([]),
    actScope: null,
    actTools: Object.freeze([]),
  }),
  Object.freeze({
    skill: "templates",
    label: "Templates",
    readScope: "templates:read",
    draftScope: "templates:drafts:write",
    readTools: Object.freeze(["list_templates", "get_template"]),
    draftTools: Object.freeze(["create_template", "update_template"]),
    actScope: null,
    actTools: Object.freeze([]),
  }),
  Object.freeze({
    skill: "campaigns",
    label: "Campaigns",
    readScope: "campaigns:read",
    draftScope: "campaigns:drafts:write",
    readTools: Object.freeze(["list_campaigns", "get_campaign", "list_campaign_audiences"]),
    draftTools: Object.freeze(["create_campaign_draft", "update_campaign_draft"]),
    actScope: null,
    actTools: Object.freeze([]),
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
    actScope: null,
    actTools: Object.freeze([]),
  }),
  Object.freeze({
    skill: "invoices",
    label: "Invoices",
    readScope: "invoices:read",
    draftScope: "invoices:drafts:write",
    readTools: Object.freeze(["list_invoices", "get_invoice"]),
    draftTools: Object.freeze(["create_invoice_draft", "update_invoice_draft"]),
    actScope: null,
    actTools: Object.freeze([]),
  }),
  Object.freeze({
    skill: "contact-edits",
    label: "Contact edits",
    readScope: null,
    draftScope: null,
    readTools: Object.freeze([]),
    draftTools: Object.freeze([]),
    actScope: "contact_edits:write",
    actTools: Object.freeze(["create_contact", "update_contact"]),
  }),
  Object.freeze({
    skill: "imessage-extras",
    label: "iMessage extras",
    readScope: null,
    draftScope: null,
    readTools: Object.freeze([]),
    draftTools: Object.freeze([]),
    actScope: "signals:write",
    actTools: Object.freeze([
      "send_reaction",
      "remove_reaction",
      "send_typing_indicator",
      "mark_read",
      "send_voice_memo",
    ]),
  }),
  Object.freeze({
    skill: "calendar-booking",
    label: "Calendar booking",
    readScope: null,
    draftScope: null,
    readTools: Object.freeze([]),
    draftTools: Object.freeze([]),
    actScope: "bookings:write",
    actTools: Object.freeze(["book_appointment", "change_appointment"]),
  }),
]);

export const AREA_SKILL_NAMES = Object.freeze(PLUGIN_AREAS.map((area) => area.skill));

export function areaTools(area) {
  return [...area.readTools, ...area.draftTools, ...area.actTools];
}

/** Every OAuth scope an area can grant, in canonical order. */
export function areaScopes(area) {
  return [area.readScope, area.draftScope, area.actScope].filter(Boolean);
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
  if (area.actScope) return renderActAreaAccessSection(area);
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

function renderActAreaAccessSection(area) {
  return `## Access

- These tools work only when the person chose Read and act and ticked ${area.label} on the
  Connect screen.
- Every tool here needs ${code(area.actScope)}. It comes only with Read and act; a Read only
  connection never has it.
- If a tool answers ${code("insufficient_scope")}, stop. Ask the person to reconnect, choose Read
  and act, and tick ${area.label} on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave ${code("workspace_id")} out.

`;
}

/**
 * Brand-neutral rule for the act areas whose tools reach a contact. The validator checks that each
 * act area skill carries it unchanged.
 */
export function renderApprovedContactsSection() {
  return `## Approved contacts

- The person approves contacts for this connection in the app: Developer, then AI Agent API,
  then Connected AI assistants, then Manage actions on this assistant. An approval lasts up to
  seven days.
- An approval is for one contact's phone number. A group is never approved.
- When a tool says the contact is not approved, nothing happened. Tell the person which contact
  to approve and where. Do not try another contact, another tool or another number.
- Never approve a contact yourself, and never ask the person to read you a code from the app.

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

Use this to read the calendar or to get a booking ready. You book, move and cancel nothing with
these tools. The person opens the link you give them and presses Schedule or Save in the app; only
then does the guest hear about it.

If the person also ticked Calendar booking and wants it done in the chat, use the
${code("calendar-booking")} skill instead of a link.

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

Never say an appointment was booked, moved or cancelled because you shared a link. Never message
the guest about it unless the person separately asks, and then use the safe draft-and-send workflow.
`;
}


function invoicesSkill(brand) {
  const area = PLUGIN_AREAS[4];
  return `${skillFrontmatter(
    area.skill,
    `Read ${brand.package.displayName} invoices and what customers owe, and save an invoice draft after the person approves it. Only the person can send it, in the app; nothing is charged.`,
  )}
# Invoices

Use this to answer "who owes me money?" or to prepare an invoice. You cannot send an invoice,
give it a number, void it or take a payment, and you never see a pay link. The person opens the
draft and presses Send in the app.

${renderAreaAccessSection(area)}## Tools

- ${code("list_invoices")} lists invoices with each customer's total, paid, balance, due date and
  status. ${code("totals")} matches the Invoices page cards: drafted, still due, overdue, received.
  Filter by ${code("status")}, ${code("contact_id")} or ${code("search")}.
- ${code("get_invoice")} reads one invoice: lines, notes, terms and what is left. A draft carries
  ${code("send_check")}, the things that would still stop the Send button.
- ${code("create_invoice_draft")} saves a new draft in US dollars, one payment due on ${code("due_date")}.
- ${code("update_invoice_draft")} changes a draft. Send only the fields to change; ${code("items")}
  replaces every line.

## Draft workflow

1. Resolve the customer with ${code("list_contacts")}. If two contacts could match, ask.
2. Write each line as a name, a quantity and a price in cents (${code("unit_cents")}). Add
   ${code("tax_rate")} as a percent and ${code("discount_cents")} only if the person asked.
3. Show the customer, every line, the due date and the total the app will work out, and ask before
   saving. If the person says stop or changes the request, save nothing and show a new version.
4. Call ${code("create_invoice_draft")} or ${code("update_invoice_draft")} once.
5. Read ${code("send_check")}. If it lists something missing (a customer, a due date, a price), say so.
6. Give the person ${code("app_url")} (or ${code("app_path")} when ${code("app_url")} is empty) and say
   plainly: this is a draft, nothing was sent and no one was charged; they check it and press Send.

## Limits

- ${code("created: false")} means the same draft was saved minutes ago. Say so; do not make a copy.
- ${code("invoice_not_draft")} means it was already sent. It cannot change here.
- ${code("invoice_read_only")} means it has a split payment schedule; the person edits it in the app.
- ${code("invoice_changed")} means someone changed it in the app meanwhile. Read it again first.
- ${code("invoice_owner_only")} means this login is an agency's client: it can read invoices, not draft them.
- Amounts are in cents. Say them as dollars. Never say an invoice was sent, paid or charged.
`;
}

function contactEditsSkill(brand) {
  const area = PLUGIN_AREAS[5];
  return `${skillFrontmatter(
    area.skill,
    `Add one ${brand.package.displayName} contact or edit one contact's details after the person approves the change. Tags and custom fields only on approved contacts, because they can start workflows.`,
  )}
# Contact edits

Use this to add a contact or change one contact's name, email, company, notes, tags or custom
fields. Each call changes one contact. There is no delete and no bulk import here.

${renderAreaAccessSection(area)}${renderApprovedContactsSection()}## Tools

- ${code("create_contact")} adds a contact by ${code("phone_number")} in E.164 form: a plus sign,
  the country code, then the number. If a contact with that number already exists, it updates that one instead and
  answers ${code("created: false")}.
- ${code("update_contact")} changes one contact by ${code("contact_id")} from ${code("list_contacts")}.
  Send only the fields to change. ${code("custom_fields")} merges with the fields already there.
  ${code("tags")} replaces the whole tag list, so read the current tags first and send the full
  list you want.

## Tags and custom fields start workflows

- A tag or a custom field can start one of the workspace's workflows, and a workflow can text the
  contact. So on this connection tags and custom fields work only on approved contacts.
- Before you add, change or remove a tag or custom field, say which ones, on which contact, and ask.
- ${code("contact_not_approved_for_tags")} means the contact is not approved and nothing was saved.
  Offer to save the other fields without ${code("tags")} and ${code("custom_fields")}, and tell the
  person where to approve the contact.
- A brand-new contact cannot be approved before it exists. Add it without tags first; once the
  person approves it, add the tags.
- Adding any contact can still start a workflow that runs for every new contact. Say so if the
  person asks what adding a contact will do.

## Opt-out is not a contact edit

- ${code("update_contact")} never changes whether a contact gets texts on this connection. Leave
  ${code("opted_out")} out; the server answers ${code("use_opt_out")} if you send it. Use
  ${code("opt_out")} and the contact, device and compliance workflow instead.

${renderStopControlSection(["create_contact", "update_contact"])}## Workflow

1. Look before you write. Search ${code("list_contacts")} by phone or name. If the contact exists,
   offer to update it instead of adding a second one. If two contacts could match, ask.
2. Use E.164 phone numbers. If the country is unclear, ask; do not guess.
3. Show the exact contact and every field you will set. For an edit, show the value before and
   after. Ask before saving.
4. Call ${code("create_contact")} or ${code("update_contact")} once.
5. Read the contact back with ${code("list_contacts")} and report what changed.

## Limits

- One contact per change. Never loop over a list to add or edit many contacts.
- Never invent a name, email or company. Save only what the person gave you or what the workspace
  already shows.
- ${code("oauth_contact_mutation_disabled")} means Contact edits is not ticked on this connection.
  Treat it like ${code("insufficient_scope")}.
`;
}

function imessageExtrasSkill(brand) {
  const area = PLUGIN_AREAS[6];
  return `${skillFrontmatter(
    area.skill,
    `Send ${brand.package.displayName} iMessage tapbacks, typing bubbles, read receipts and voice memos to one approved contact, never a group.`,
  )}
# iMessage extras

Use this for the small iMessage touches around a conversation: a tapback on a message, the typing
bubble, a read receipt, or a voice memo. Each one reaches one contact and the contact sees it.

${renderAreaAccessSection(area)}${renderApprovedContactsSection()}## Who it reaches

- Every extra goes only to a contact approved under Manage actions, and never to a group.
- ${code("oauth_recipient_not_allowed")} means this contact is not approved.
  ${code("oauth_send_disabled")} means no contact is approved on this connection yet.
  ${code("oauth_group_send_not_allowed")} means the target is a group; that cannot work here.
- ${code("mark_read")} without ${code("native")} only clears the unread badge in the app. The contact
  sees nothing, so it needs no approval.

## Tools

- ${code("send_reaction")} puts a tapback on one message. Use ${code("message_id")} from
  ${code("get_conversation")}, or ${code("phone")} with ${code("external_id")}. Any single emoji works;
  words do not. A text message (SMS, green bubble) cannot take a tapback. Sending the same tapback
  again answers ${code("already_delivered")}.
- ${code("remove_reaction")} takes back a tapback you sent. ${code("removal_queued: true")} means it
  comes off after the Mac confirms. Never say the contact did not see it.
- ${code("send_typing_indicator")} shows the typing bubble from a line (${code("phone")},
  ${code("device_id")} from ${code("list_devices")}, ${code("is_typing")}). It lasts
  ${code("duration_ms")}, 3 to 60 seconds. Call again at ${code("keepalive_interval_ms")} to hold it,
  and send ${code("is_typing: false")} to clear it. iMessage only.
- ${code("mark_read")} clears the unread badge for one contact. With ${code("native: true")} and a
  ${code("device_id")} it also queues a read receipt from the Mac; ${code("native_read_queued")} says so.
- ${code("send_voice_memo")} sends a voice bubble to one contact (${code("to")}, ${code("audio_url")}).
  The audio must be a public https link to an mp3, m4a, wav or aac file up to 25 MB.
  ${code("memo_format")} says whether it went as a voice bubble or as an attachment. Track it with
  ${code("check_message_status")} and its ${code("message_id")}.

## Before you act

- A voice memo is a message. Before ${code("send_voice_memo")}, check ${code("get_opt_out_status")},
  then show the workspace, the exact recipient, the audio link and the line, and wait for a yes,
  as for a text. Call it once. If the result is unclear, check status; never send it again.
- A tapback or a read receipt is seen by the contact. If the person named the message and the
  emoji, that request is the go-ahead. If you chose the message or the emoji, show it and ask first.
- Show the typing bubble only just before a message the person already approved. It is never a
  stand-in for a reply.

${renderStopControlSection([
    "send_reaction",
    "remove_reaction",
    "send_typing_indicator",
    "mark_read",
    "send_voice_memo",
  ])}## Limits

- One contact per call. Never loop over contacts or conversations.
- ${code("delivered: false")} on a tapback means the platform has no acknowledgement yet; it does not
  prove the tapback is waiting. Read the status before you say anything about it.
- A voice memo needs a Mac with Apple silicon on the sending line.
`;
}

function calendarBookingSkill(brand) {
  const area = PLUGIN_AREAS[7];
  return `${skillFrontmatter(
    area.skill,
    `Book, move or cancel one ${brand.package.displayName} appointment in the chat: a preview first, then the person's yes, then the change. Approved contacts only.`,
  )}
# Calendar booking

Use this to book, move or cancel an appointment without leaving the chat. Every change takes two
calls with the person's yes in between. The change is real: the guest gets the confirmation,
reminders or notice the workspace's settings say, and Zoom, Google and HighLevel copies follow.

${renderAreaAccessSection(area)}- Finding appointments and open times needs Calendar ticked too (${code("list_appointments")},
  ${code("get_appointment")}, ${code("get_availability")}). Use the ${code("calendar")} skill for those.

${renderApprovedContactsSection()}## Who it reaches

- A booking, move or cancel texts the contact, so it works only with an approved contact.
  ${code("contact_not_approved_for_booking")} means the contact is not approved and nothing changed.
  Offer ${code("draft_booking")} or ${code("draft_appointment_change")} instead: a link the person
  finishes in the app.
- ${code("appointment_needs_app")} means the appointment came from Google or HighLevel, or has no
  contact. Use ${code("draft_appointment_change")} for a link.

## Book

1. Resolve the contact with ${code("list_contacts")}. If two contacts could match, ask.
2. Offer real open times from ${code("get_availability")}.
3. Call ${code("book_appointment")} with ${code("contact_id")}, ${code("starts_at")} (with a time zone)
   and ${code("duration_minutes")} (15, 30, 45, 60, 90 or 120), plus ${code("title")},
   ${code("appointment_type")}, ${code("location")} (phone, video, or an address) and
   ${code("notes")} only if the person gave them. Leave ${code("confirm_code")} out. This call books
   nothing.
4. Show the ${code("preview")} and every line of ${code("what_happens")}. If ${code("slot_check")} says
   the time is not offered or may clash, say so. Ask for a yes, then stop and wait.
5. Only after the person says yes, in a later turn, call ${code("book_appointment")} again with
   exactly the same fields plus ${code("confirm_code")}.
6. Report ${code("booked")}, the appointment and ${code("next_step")} as returned.

## Move or cancel

1. Read it with ${code("get_appointment")}. Stop if ${code("can_change")} is false.
2. Call ${code("change_appointment")} with ${code("appointment_id")} and ${code("action")}: move (with
   ${code("new_starts_at")}) or cancel. Leave ${code("confirm_code")} out. This call changes nothing.
   A move keeps the same length.
3. Show the ${code("preview")} and every line of ${code("what_happens")}, and wait for a yes.
4. Only after the yes, in a later turn, call again with the same fields plus ${code("confirm_code")}.
5. Report ${code("changed")} and the appointment as returned.

${renderStopControlSection(["book_appointment", "change_appointment"])}## Answers

- ${code("confirm_code_mismatch")}: the fields are not the ones in the preview. Run the first call
  again, show the new preview and ask again.
- ${code("confirm_code_expired")}: a code lasts ten minutes. Run the first call again and ask again.
- ${code("slot_taken")}: the time clashes. Offer other open times. Never try to force it.
- ${code("already_booked: true")}: this exact booking was already made. Say so; do not book again.
- ${code("appointment_changed")}: someone changed it since the preview. Read it again and start over.
- ${code("appointment_recurring")}: it repeats. A series is changed in the app; offer the link.
- ${code("appointment_not_changeable")}: it is over, or not scheduled or confirmed.
- ${code("booking_refused")}: the calendar said no. Report the reason as returned.
- ${code("booking_uncertain")}: it may or may not have happened. Check ${code("list_appointments")} or
  ${code("get_appointment")} first. Never repeat the call blindly.

## Limits

- Never send ${code("confirm_code")} in the same turn as the preview, and never reuse a code for
  changed fields.
- A move checks clashes with ${brand.package.displayName} bookings only, not Google or HighLevel
  busy times. If ${code("slot_check")} warns about that, say so.
- The booking already messages the guest. Do not text them about it too unless the person asks,
  and then use the safe draft-and-send workflow.
`;
}

const AREA_SKILL_RENDERERS = Object.freeze({
  reports: reportsSkill,
  templates: templatesSkill,
  campaigns: campaignsSkill,
  calendar: calendarSkill,
  invoices: invoicesSkill,
  "contact-edits": contactEditsSkill,
  "imessage-extras": imessageExtrasSkill,
  "calendar-booking": calendarBookingSkill,
});

export function renderAreaSkill(brand, skillName) {
  const render = AREA_SKILL_RENDERERS[skillName];
  if (!render) throw new Error(`Unknown area skill: ${skillName}`);
  return render(brand);
}
