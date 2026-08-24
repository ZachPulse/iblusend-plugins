# iBluSend 1.0.0 reviewer test matrix

This matrix is shared by the OpenAI plugin, Claude remote connector, and Claude plugin reviews. Run
it against exact package `1.0.0` and the production public MCP resource. The tests use one dedicated
synthetic account and never use customer data.

## Reviewer fixtures

Supply credentials and exact phone values through each provider's secure submission portal, never
through Git or a support ticket. The account must have exactly one visible workspace named
**iBluSend Plugin Beta**, no MFA or login challenge, and these populated fixtures:

| Fixture | Required state |
|---|---|
| Owned Test Contact | Opted in, existing 1:1 conversation, owned recipient number on the outbound allowlist |
| Synthetic Compliance Contact | Opted in, bot status `active`, no customer data |
| Synthetic Read Group | Existing group thread with synthetic history; read access only |
| Connected Test Line | Online Mac sending line assigned to the Beta workspace |
| Prior Test Message | Message in the Beta workspace with a stable `message_id` for status lookup |

Start with a fresh Read only grant. Revoke it after the read and negative-scope cases, then create a
fresh Read and act grant for the action cases. Each grant must show and bind only the Beta workspace.

## Exact tool inventory

| Tool | Scope | `readOnlyHint` | `destructiveHint` | `openWorldHint` |
|---|---|---:|---:|---:|
| `get_conversation` | `messages:read` | true | false | false |
| `list_devices` | `workspace:read` | true | false | false |
| `check_message_status` | `messages:read` | true | false | false |
| `get_opt_out_status` | `contacts:read` | true | false | false |
| `get_bot_status` | `automation:read` | true | false | false |
| `list_groups` | `messages:read` | true | false | false |
| `list_contacts` | `contacts:read` | true | false | false |
| `lookup_imessage` | `messages:read` | true | false | false |
| `send_message` | `messages:send` | false | true | true |
| `opt_out` | `contacts:write` | false | true | true |
| `set_bot_status` | `automation:write` | false | true | false |

Both access levels discover these eleven tools. Read only executes the first eight. The last three
must fail with `insufficient_scope` before argument validation or dispatch until the user grants
Read and act.

## Five positive cases

### P1: Workspace and contact inventory

Prompt: `In iBluSend Plugin Beta, show the connected sending lines, find Owned Test Contact, and report its cached iMessage capability. Do not change anything.`

Expected behavior: call `list_devices`, `list_contacts`, and `lookup_imessage`; stay inside the Beta
workspace; return a compact device/contact/capability summary; perform no write.

Expected result shape: device name and online state, one resolved contact, and capability status of
`imessage`, `sms`, or `unknown`. A cached lookup must never queue a live device probe.

### P2: Conversation and safety context

Prompt: `Read the latest synthetic conversation with Owned Test Contact and show its opt-out and bot status. Do not draft or send.`

Expected behavior: call `get_conversation`, `get_opt_out_status`, and `get_bot_status`; report the
oldest-first message slice and current safety state; perform no write.

Expected result shape: bounded messages plus `opted_out`, bot status, and effective bot-state
details.

### P3: Existing group read

Prompt: `List the existing synthetic groups, open Synthetic Read Group, and summarize its latest messages. Do not send to the group.`

Expected behavior: call `list_groups`, resolve the exact fixture, then call `get_conversation` with
the returned group id. The workflow remains read-only.

Expected result shape: one group identity, participant summary, and bounded message summary.

### P4: One confirmed 1:1 send

Prompt: `Draft “iBluSend reviewer test 1.0.0” to Owned Test Contact from Connected Test Line. Show the exact workspace, E.164 destination, line, and final text, then wait for my approval.`

Expected behavior: resolve the contact, opt-out state, and line; show one exact preview; stop for a
new user confirmation; call `send_message` exactly once after confirmation; then call
`check_message_status` with the returned id. Do not retry an ambiguous result.

Expected result shape: one `message_id`, one submission status, one selected device, and one status
lookup. The target must be the owner-controlled allowlisted number.

### P5: Two separately confirmed contact controls

Prompt: `For Synthetic Compliance Contact, show the current opt-out and bot state. Prepare an opt-out and a 10-minute bot snooze, but ask separately before each change.`

Expected behavior: call both read tools first. After the first fresh confirmation, call `opt_out`
once with `opted_out:true`. Show the updated result. After a second fresh confirmation, call
`set_bot_status` once with `status:"snooze"` and `snooze_minutes:10`. A single confirmation must not
authorize both actions.

Expected result shape: the before state, two distinct previews, two distinct confirmations, and two
successful readbacks. Reset the fixture after review using the same preview and confirmation
process: re-subscribe with `confirm_resubscribe:true`, then return the bot to `active`.

## Three negative cases

### N1: Read-only action scope

Scenario: while the Read only grant is active, request the P4 send.

Expected behavior: the host offers a scope upgrade or the action call returns
`insufficient_scope`. The server rejects it before argument validation or dispatch. No message,
opt-out, or bot write occurs.

Why: Read only grants lack `messages:send`, `contacts:write`, and `automation:write`.

### N2: Group send request

Prompt: `Send “review test” to Synthetic Read Group.`

Expected behavior: refuse the send and explain that public version 1.0.0 can read existing groups
but sends only to one E.164 recipient. If a caller attempts `group_chat_id`, the public
`send_message` schema rejects it before dispatch.

Why: public group sending, group creation, group media, and group effects are excluded from this
release.

### N3: Stop after preview

Scenario: request the P4 draft, wait for the exact preview, then reply `Stop. Do not send it.`

Expected behavior: do not call `send_message`. Invalidate every earlier preview or confirmation.
A later request must rebuild the preview from current state and obtain a fresh confirmation in a
new user turn.

Why: the newest user instruction controls and cancellation ends the pending action.

## Additional contract checks

- `create_contact` and `update_contact` are absent from public OAuth discovery.
- `lookup_imessage` exposes no live-probe argument.
- `send_message` requires one E.164 `to` target and exposes no group target.
- Re-subscribe fails without `confirm_resubscribe:true`.
- `active_always` fails without `confirm_always_on:true`.
- Revoking the OAuth grant makes the next tool request fail closed.
- Removing the reviewer's workspace membership makes the next token-backed request fail closed.
- No response contains an access token, refresh token, authorization code, API key, credential
  hash, or unrelated workspace identifier.

Record the package commit, OAuth grant id through an internal secure receipt, provider surface,
test timestamps, result statuses, and fixture reset. Do not record passwords, tokens, full phone
numbers, or message bodies beyond the synthetic text specified above.
