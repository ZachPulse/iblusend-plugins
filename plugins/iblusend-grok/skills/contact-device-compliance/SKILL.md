---
name: contact-device-compliance
description: "Inspect one iBluSend contact or device, or change one opt-out state or bot setting with explicit confirmation."
---

# Contact, device, and compliance operations

Use this workflow for a focused operational check or one narrowly scoped change in the connected
workspace.

## Guardrails

- Work on exactly one workspace and one contact or one automation setting per change.
- Start read-only. Resolve the target and show current state before proposing a mutation.
- Contact creation and profile-field updates are not available in this public workflow. Never
  invent a hidden write path, bulk importer, or customer-data export.
- Never treat a phone number as belonging to a person unless the connected workspace data supports
  that association.
- Device state is a reported snapshot. Offline/online does not guarantee that a future message will
  fail/succeed.

## Stop and cancellation control

- The newest user instruction is authoritative. If, before a write tool starts, the user says
  stop, cancel, hold, pause, do not send, changes the request, or otherwise withdraws approval,
  cancel the pending action immediately.
- Cancellation invalidates every earlier preview and confirmation.
- Do not call `opt_out` or `set_bot_status` for the cancelled action, even if an earlier message approved it.
- If the provider or host rejects or closes its confirmation, treat that as cancellation too.
- Silence, elapsed time, or approval for a different payload never restores authorization.
- To resume or act on a changed request, rebuild the exact preview from current state and obtain
  fresh explicit confirmation in a later user turn.
- After a pre-call cancellation, acknowledge that no write ran and stop this workflow unless the
  newest instruction explicitly replaces it with read-only work.
- If a write tool may already have started, do not claim that it was cancelled. Check status or
  current state, report the facts, and never retry the write automatically.

## Tool selection

- `list_contacts` finds an existing record.
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

If the connection is read-only, explain the needed Read and act access instead of attempting a
hidden write tool or asking for a credential in chat.
