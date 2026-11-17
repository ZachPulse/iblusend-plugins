---
name: calendar
description: "Read iBluSend appointments, meeting types and open times, and prepare a booking, move or cancel link that the person confirms in the app."
---

# Calendar

Use this to read the calendar or to get a booking ready. You book, move and cancel nothing. The
person opens the link you give them and presses Schedule or Save in the app; only then does the
guest hear about it.

## Access

- These tools work only when the person ticked Calendar on the Connect screen.
- Every tool here needs only `calendar:read`.
- If a tool answers `insufficient_scope`, stop. Ask the person to reconnect and tick
  Calendar on the Connect screen.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tools

- `list_appointments` lists appointments, soonest first. The default range is the next 14 days.
- `get_appointment` reads one. `can_change` says whether it can be moved or cancelled.
- `list_meeting_types` lists the booking page's meeting types.
- `get_availability` lists open start times, for up to 14 days.
- `draft_booking` returns a link to a filled-in booking window. It books nothing.
- `draft_appointment_change` returns a link to a move or cancel. It changes nothing.

## Booking workflow

1. Resolve the contact with `list_contacts`. If two contacts could match, ask.
2. Check open times with `get_availability` and offer real times only.
3. Call `draft_booking` with the contact, start time (with a time zone) and length.
4. If `slot_check` says the time is not offered, say so before sharing the link.
5. Give the person `app_url` (or `app_path` when `app_url` is empty) and say:
   nothing is booked yet; open the link, check it and press Schedule.

## Move or cancel workflow

1. Read the appointment with `get_appointment`. Stop if `can_change` is false.
2. Call `draft_appointment_change` with `action` move (and `new_starts_at`) or cancel.
3. Share the link and `next_step`. Say nothing has changed until they press Save.

Never say an appointment was booked, moved or cancelled. Never message the guest about it unless
the person separately asks, and then use the safe draft-and-send workflow.
