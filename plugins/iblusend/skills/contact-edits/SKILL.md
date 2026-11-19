---
name: contact-edits
description: "Add one iBluSend contact or edit one contact's details after the person approves the change. Tags and custom fields only on approved contacts, because they can start workflows."
---

# Contact edits

Use this to add a contact or change one contact's name, email, company, notes, tags or custom
fields. Each call changes one contact. There is no delete and no bulk import here.

## Access

- These tools work only when the person chose Read and act and ticked Contact edits on the
  Connect screen.
- Every tool here needs `contact_edits:write`. It comes only with Read and act; a Read only
  connection never has it.
- If a tool answers `insufficient_scope`, stop. Ask the person to reconnect, choose Read
  and act, and tick Contact edits on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Approved contacts

- The person approves contacts for this connection in the app: Developer, then AI Agent API,
  then Connected AI assistants, then Manage actions on this assistant. An approval lasts up to
  seven days.
- An approval is for one contact's phone number. A group is never approved.
- When a tool says the contact is not approved, nothing happened. Tell the person which contact
  to approve and where. Do not try another contact, another tool or another number.
- Never approve a contact yourself, and never ask the person to read you a code from the app.

## Tools

- `create_contact` adds a contact by `phone_number` in E.164 form: a plus sign,
  the country code, then the number. If a contact with that number already exists, it updates that one instead and
  answers `created: false`.
- `update_contact` changes one contact by `contact_id` from `list_contacts`.
  Send only the fields to change. `custom_fields` merges with the fields already there.
  `tags` replaces the whole tag list, so read the current tags first and send the full
  list you want.

## Tags and custom fields start workflows

- A tag or a custom field can start one of the workspace's workflows, and a workflow can text the
  contact. So on this connection tags and custom fields work only on approved contacts.
- Before you add, change or remove a tag or custom field, say which ones, on which contact, and ask.
- `contact_not_approved_for_tags` means the contact is not approved and nothing was saved.
  Offer to save the other fields without `tags` and `custom_fields`, and tell the
  person where to approve the contact.
- A brand-new contact cannot be approved before it exists. Add it without tags first; once the
  person approves it, add the tags.
- Adding any contact can still start a workflow that runs for every new contact. Say so if the
  person asks what adding a contact will do.

## Opt-out is not a contact edit

- `update_contact` never changes whether a contact gets texts on this connection. Leave
  `opted_out` out; the server answers `use_opt_out` if you send it. Use
  `opt_out` and the contact, device and compliance workflow instead.

## Stop and cancellation control

- The newest user instruction is authoritative. If, before a write tool starts, the user says
  stop, cancel, hold, pause, do not send, changes the request, or otherwise withdraws approval,
  cancel the pending action immediately.
- Cancellation invalidates every earlier preview and confirmation.
- Do not call `create_contact` or `update_contact` for the cancelled action, even if an earlier message approved it.
- If the provider or host rejects or closes its confirmation, treat that as cancellation too.
- Silence, elapsed time, or approval for a different payload never restores authorization.
- To resume or act on a changed request, rebuild the exact preview from current state and obtain
  fresh explicit confirmation in a later user turn.
- After a pre-call cancellation, acknowledge that no write ran and stop this workflow unless the
  newest instruction explicitly replaces it with read-only work.
- If a write tool may already have started, do not claim that it was cancelled. Check status or
  current state, report the facts, and never retry the write automatically.

## Workflow

1. Look before you write. Search `list_contacts` by phone or name. If the contact exists,
   offer to update it instead of adding a second one. If two contacts could match, ask.
2. Use E.164 phone numbers. If the country is unclear, ask; do not guess.
3. Show the exact contact and every field you will set. For an edit, show the value before and
   after. Ask before saving.
4. Call `create_contact` or `update_contact` once.
5. Read the contact back with `list_contacts` and report what changed.

## Limits

- One contact per change. Never loop over a list to add or edit many contacts.
- Never invent a name, email or company. Save only what the person gave you or what the workspace
  already shows.
- `oauth_contact_mutation_disabled` means Contact edits is not ticked on this connection.
  Treat it like `insufficient_scope`.
