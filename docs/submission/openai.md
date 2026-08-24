# OpenAI universal plugin submission packet

This packet is for the initial public review of iBluSend `1.0.0`. The submission serves both
ChatGPT and Codex through the universal Plugins Directory. Preparing this file does not authorize
creating a portal draft, submitting it for review, publishing it, or enabling iBluSend's OpenAI
customer flag.

Official references:

- [Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Submit plugins](https://developers.openai.com/plugins/deploy/submission)

## Portal access

The submitting OpenAI organization must satisfy both checks before the form can be completed:

1. The submitter has **Apps Management: Write** in that organization. Organization owners have
   this permission by default.
2. The same organization and project contain the verified iBluSend business identity selected as
   the Developer Identity.

A disabled create or submit control is an account-permission or identity-verification gate. It is
not evidence that the iBluSend MCP server or plugin package is missing.

## Form values

| Field | Value |
|---|---|
| Submission type | With MCP (MCP server plus uploaded skills) |
| Plugin name | iBluSend |
| Category | Productivity |
| Short description | Safely review conversations, contacts, and sending lines, then send one confirmed iMessage or SMS. |
| Website | `https://iblusend.com/features/ai-assistants` |
| Documentation | `https://iblusend.com/help/ai-assistants` |
| Support | `https://iblusend.com/support` |
| Privacy policy | `https://iblusend.com/privacy` |
| Terms | `https://iblusend.com/ai-usage-terms` |
| Logo | `brands/assets/iblusend/composer-icon.png` |
| MCP URL type | Universal |
| Production MCP URL | `https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public` |
| Authentication | OAuth 2.1 authorization code with PKCE S256 |
| UI | None |
| Content security policy | Not applicable because the plugin has no MCP App UI |
| Initial availability | United States |

Long description:

> Connect one iBluSend workspace to review conversations, contacts, connected Mac sending lines,
> groups, delivery status, opt-out state, and bot status. Read only is the default. Read and act
> adds one-to-one sending, one-contact opt-out changes, and one-contact bot controls. Every action
> stays bound to the selected workspace and requires a fresh preview and confirmation. Bulk sends,
> group sends, contact creation, and contact profile edits are not included.

Starter prompts:

1. `Triage my iBluSend inbox and flag conversations that need a reply.`
2. `Draft a reply for one contact, then wait for my approval before sending.`
3. `Check this contact's opt-out status and show available sending devices.`

Upload the three final skill directories from `plugins/iblusend/skills/`. Submit the Universal MCP
URL directly and let the portal scan it. Do not enter the private-beta `asdk_app_...` identifier as
an existing integration reference. The `.app.json` mapping remains useful for local developer
installation, but it is not the public MCP submission target.

## MCP and identity checks

- OAuth discovery exposes exactly eleven curated tools for both access levels. Read-only grants can
  use eight read tools; the three action tools return `insufficient_scope` before validation
  or dispatch when the grant lacks write scopes.
- Every tool has a title plus accurate `readOnlyHint`, `openWorldHint`, and `destructiveHint`
  values. `send_message` is destructive, open-world, and non-idempotent at the tool contract.
- The server returns only workspace-bound product data. It does not return bearer tokens, OAuth
  codes, debug payloads, or internal credential hashes.
- The reviewer account and password are supplied only through the secure submission form. They
  must never be committed to this repository.
- The reviewer account must have one synthetic workspace, no MFA or email/SMS challenge during
  review, a populated set of owned fixtures, and a recipient policy limited to owner-controlled
  test numbers.
- The submission does not request OpenAI workspace-domain restrictions. If that feature is added,
  the authorization server must first advertise `openid`, `email`, and a UserInfo endpoint with an
  `email_verified` claim.

When the portal issues a domain-verification token, serve that token alone from
`https://api.iblusend.com/.well-known/openai-apps-challenge` or an approved parent origin. The token
is generated per submission and therefore cannot be committed in advance. Adding or replacing the
served token requires a separate platform change and deployment gate.

## Review tests and release notes

Use [reviewer-test-matrix.md](reviewer-test-matrix.md). It contains the exact eleven-tool inventory,
five positive cases, three negative cases, fixture requirements, expected result shapes, and reset
steps.

Release notes:

> Initial public submission of iBluSend 1.0.0. The plugin connects one consented iBluSend workspace
> to eight read tools and three separately scoped action tools. It includes guarded inbox triage,
> one-to-one draft and send, and contact/device compliance workflows. Private pilots verified OAuth,
> workspace isolation, scope enforcement, stop control, revocation, and one confirmed test delivery.

## Final gate

Before selecting **Submit for Review**, rerun the package validators, complete every case in the
shared test matrix against exact version `1.0.0`, verify all public URLs, confirm the secure reviewer
credentials, and record the exact Git commit. Submission, reviewer-requested behavior changes,
publication, and the OpenAI customer flag each remain separate owner approvals.
