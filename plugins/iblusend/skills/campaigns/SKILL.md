---
name: campaigns
description: "Read iBluSend campaigns and their results, and save a campaign draft after the person approves it. Only the person can launch it, in the app."
---

# Campaigns

Use this to review campaign results or to prepare a campaign draft. You cannot launch, pause or
resume a campaign. A campaign launches only when the person presses Launch in the app.

## Access

- These tools work only when the person ticked Campaigns on the Connect screen.
- Reading needs `campaigns:read`. Saving a draft also needs `campaigns:drafts:write`,
  which the person grants only by choosing Read and act.
- If a tool answers `insufficient_scope`, stop. Ask the person to reconnect and tick
  Campaigns on the Connect screen, and to choose Read and act if they want drafts saved.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tools

- `list_campaigns` lists campaigns and results, filtered by `status` or `search`.
- `get_campaign` reads one campaign: message, audience, schedule and results.
- `list_campaign_audiences` lists the contact groups and smart lists a campaign can go to.
- `create_campaign_draft` saves a new draft. It sends nothing.
- `update_campaign_draft` changes a draft. It sends nothing.

## Draft workflow

1. Resolve the audience with `list_campaign_audiences`, or `list_contacts` for tags or
   single contacts. If two audiences could match, ask; do not guess.
2. Use either your own words (`content`) or a saved template (`template_id`), not both.
3. Show the exact name, words or template, audience and schedule, and ask before saving. If the
   person says stop or changes the request, save nothing and show a new version.
4. Call `create_campaign_draft` or `update_campaign_draft` once.
5. Give the person `app_url` and say plainly: this is a draft, nothing was sent, and they
   check it and press Launch in the app. If `app_url` is empty, tell them to open the draft
   from Campaigns in the app.

## Limits

- `created: false` means the same name and message already exist as a draft. Say so.
- `campaign_not_draft` means it was already launched. It cannot change here.
- Never say a campaign was sent, scheduled to send, or launched because you saved a draft.
- Results are as returned. Rates are whole percents of messages sent.
