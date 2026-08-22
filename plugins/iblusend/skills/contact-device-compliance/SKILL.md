---
name: contact-device-compliance
description: "Inspect or change one iBluSend contact, device, opt-out state, or bot setting with explicit confirmation."
---

# Contact, device, and compliance operations

Use this workflow for a focused operational check or one narrowly scoped change in the connected
workspace.

## Guardrails

- Work on exactly one workspace and one contact or one automation setting per change.
- Start read-only. Resolve the target and show current state before proposing a mutation.
- Never create a bulk contact importer, export customer data, change several contacts in a loop, or
  use contact writes to evade opt-out and pacing controls.
- Never treat a phone number as belonging to a person unless the connected workspace data supports
  that association.
- Device state is a reported snapshot. Offline/online does not guarantee that a future message will
  fail/succeed.

## Tool selection

- `list_contacts` finds an existing record.
- `create_contact` creates or upserts one record per call.
- `update_contact` changes one existing record per call.
- `list_devices` reports lines and current capacity/state for the consented workspace.
- `get_opt_out_status` reads one contact's messaging consent state.
- `opt_out` applies one opt-out or explicitly confirmed re-subscribe action.
- `get_bot_status` reads current automation state.
- `set_bot_status` changes one bot setting.

## Read workflow

1. State the connected workspace.
2. Resolve the exact target. If more than one contact or setting matches, ask the user to choose.
3. Read and report only the fields needed for the request.
4. Distinguish observed state from a recommendation.

## Change workflow

1. Read the current state first.
2. Show a before-and-after preview containing the workspace, exact target, fields that will change,
   and fields that will remain untouched.
3. Ask for explicit confirmation and wait before calling a write tool.
4. Perform one mutation call.
5. Read the resulting state back when the relevant read tool supports it, and report any mismatch.

## Additional confirmations

- Re-subscribing through `opt_out` requires both explicit user confirmation and the server's
  `confirm_resubscribe:true` argument. Never set it speculatively.
- Setting automation to always active through `set_bot_status` requires both explicit user
  confirmation and `confirm_always_on:true`. Explain that this can automate replies beyond the
  current conversation.
- Creating and updating contacts must remain one-record operations, even when the user supplies a
  list. Ask them to select one record for this public workflow.

If the connection is read-only, explain the needed Read and act access instead of attempting a
hidden write tool or asking for a credential in chat.
