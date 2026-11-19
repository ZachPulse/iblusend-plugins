---
name: calendar-booking
description: "Book, move or cancel one iBluSend appointment in the chat: a preview first, then the person's yes, then the change. Approved contacts only."
---

# Calendar booking

Use this to book, move or cancel an appointment without leaving the chat. Every change takes two
calls with the person's yes in between. The change is real: the guest gets the confirmation,
reminders or notice the workspace's settings say, and Zoom, Google and HighLevel copies follow.

## Access

- These tools work only when the person chose Read and act and ticked Calendar booking on the
  Connect screen.
- Every tool here needs `bookings:write`. It comes only with Read and act; a Read only
  connection never has it.
- If a tool answers `insufficient_scope`, stop. Ask the person to reconnect, choose Read
  and act, and tick Calendar booking on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

- Finding appointments and open times needs Calendar ticked too (`list_appointments`,
  `get_appointment`, `get_availability`). Use the `calendar` skill for those.

## Approved contacts

- The person approves contacts for this connection in the app: Developer, then AI Agent API,
  then Connected AI assistants, then Manage actions on this assistant. An approval lasts up to
  seven days.
- An approval is for one contact's phone number. A group is never approved.
- When a tool says the contact is not approved, nothing happened. Tell the person which contact
  to approve and where. Do not try another contact, another tool or another number.
- Never approve a contact yourself, and never ask the person to read you a code from the app.

## Who it reaches

- A booking, move or cancel texts the contact, so it works only with an approved contact.
  `contact_not_approved_for_booking` means the contact is not approved and nothing changed.
  Offer `draft_booking` or `draft_appointment_change` instead: a link the person
  finishes in the app.
- `appointment_needs_app` means the appointment came from Google or HighLevel, or has no
  contact. Use `draft_appointment_change` for a link.

## Book

1. Resolve the contact with `list_contacts`. If two contacts could match, ask.
2. Offer real open times from `get_availability`.
3. Call `book_appointment` with `contact_id`, `starts_at` (with a time zone)
   and `duration_minutes` (15, 30, 45, 60, 90 or 120), plus `title`,
   `appointment_type`, `location` (phone, video, or an address) and
   `notes` only if the person gave them. Leave `confirm_code` out. This call books
   nothing.
4. Show the `preview` and every line of `what_happens`. If `slot_check` says
   the time is not offered or may clash, say so. Ask for a yes, then stop and wait.
5. Only after the person says yes, in a later turn, call `book_appointment` again with
   exactly the same fields plus `confirm_code`.
6. Report `booked`, the appointment and `next_step` as returned.

## Move or cancel

1. Read it with `get_appointment`. Stop if `can_change` is false.
2. Call `change_appointment` with `appointment_id` and `action`: move (with
   `new_starts_at`) or cancel. Leave `confirm_code` out. This call changes nothing.
   A move keeps the same length.
3. Show the `preview` and every line of `what_happens`, and wait for a yes.
4. Only after the yes, in a later turn, call again with the same fields plus `confirm_code`.
5. Report `changed` and the appointment as returned.

## Stop and cancellation control

- The newest user instruction is authoritative. If, before a write tool starts, the user says
  stop, cancel, hold, pause, do not send, changes the request, or otherwise withdraws approval,
  cancel the pending action immediately.
- Cancellation invalidates every earlier preview and confirmation.
- Do not call `book_appointment` or `change_appointment` for the cancelled action, even if an earlier message approved it.
- If the provider or host rejects or closes its confirmation, treat that as cancellation too.
- Silence, elapsed time, or approval for a different payload never restores authorization.
- To resume or act on a changed request, rebuild the exact preview from current state and obtain
  fresh explicit confirmation in a later user turn.
- After a pre-call cancellation, acknowledge that no write ran and stop this workflow unless the
  newest instruction explicitly replaces it with read-only work.
- If a write tool may already have started, do not claim that it was cancelled. Check status or
  current state, report the facts, and never retry the write automatically.

## Answers

- `confirm_code_mismatch`: the fields are not the ones in the preview. Run the first call
  again, show the new preview and ask again.
- `confirm_code_expired`: a code lasts ten minutes. Run the first call again and ask again.
- `slot_taken`: the time clashes. Offer other open times. Never try to force it.
- `already_booked: true`: this exact booking was already made. Say so; do not book again.
- `appointment_changed`: someone changed it since the preview. Read it again and start over.
- `appointment_recurring`: it repeats. A series is changed in the app; offer the link.
- `appointment_not_changeable`: it is over, or not scheduled or confirmed.
- `booking_refused`: the calendar said no. Report the reason as returned.
- `booking_uncertain`: it may or may not have happened. Check `list_appointments` or
  `get_appointment` first. Never repeat the call blindly.

## Limits

- Never send `confirm_code` in the same turn as the preview, and never reuse a code for
  changed fields.
- A move checks clashes with iBluSend bookings only, not Google or HighLevel
  busy times. If `slot_check` warns about that, say so.
- The booking already messages the guest. Do not text them about it too unless the person asks,
  and then use the safe draft-and-send workflow.
