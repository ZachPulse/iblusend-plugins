# Claude Connectors Directory submission packet

This packet is for the iBluSend `1.0.0` remote MCP connector. It covers the connector shared by
Claude.ai, Claude Desktop, Claude mobile, Claude Code, and Cowork. It does not authorize creating a
directory draft, submitting it, publishing it, or enabling iBluSend's Claude customer flag.

Official references:

- [Build custom connectors](https://claude.com/docs/connectors/building)
- [Connector authentication](https://claude.com/docs/connectors/building/authentication)
- [Pre-submission checklist](https://claude.com/docs/connectors/building/review-criteria)
- [Submitting to the Connectors Directory](https://claude.com/docs/connectors/building/submission)

## Portal access

Remote connector submissions are created in a Claude.ai Team or Enterprise organization's
Directory settings. An Organization Owner or Primary Owner can submit. Enterprise organizations
may delegate the Directory or Libraries permission through a custom role. An individual Claude
plan does not expose this organization submission portal.

If the directory control is disabled, first confirm the active Claude organization and role. That
state does not indicate a missing iBluSend connector.

## Connection and listing values

| Field | Value |
|---|---|
| Connector type | Remote MCP server |
| Server name | iBluSend |
| URL | `https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public` |
| URL model | The same fixed URL for every user |
| Transport | Streamable HTTP |
| Authentication | OAuth 2.0/2.1 with CIMD, DCR fallback, and PKCE S256 |
| Tagline | Review and send iMessage safely from one workspace |
| Category | Productivity |
| Documentation | `https://iblusend.com/help/ai-assistants` |
| Privacy policy | `https://iblusend.com/privacy` |
| Support | `https://iblusend.com/support` |
| Icon URL | `https://iblusend.com/brand/iblusend-brand-kit/app-icons/iblusend-app.svg` |
| PNG fallback | `brands/assets/iblusend/composer-icon.png` |
| Suggested slug | `iblusend` |
| Read/write | Eight read tools and three separately scoped action tools |
| Allowed link URIs | None |
| MCP App UI | None |

The tagline is below Anthropic's 55-character limit. The name is below its 100-character limit.
Use **iBluSend** exactly; the permanent slug should not include a version or provider name.

Description:

> Connect one iBluSend workspace to review conversations, contacts, connected Mac sending lines,
> existing group threads, delivery status, opt-out state, and bot status. Read only is the default.
> Read and act adds one-to-one sending, one-contact opt-out changes, and one-contact bot controls.
> The connector shows the exact target and change before each action. It excludes bulk sends,
> group sends, contact creation, and contact profile edits.

Primary use cases:

1. Triage an iBluSend inbox and identify conversations that need a reply.
2. Draft one response, show its exact workspace, recipient, sending line, and content, then wait for
   confirmation before one send.
3. Inspect a contact's consent, device availability, and bot status, then make one confirmed state
   change when requested.

Connection prerequisites: an active paid or sponsored iBluSend account, one eligible workspace,
and at least one connected Mac sending line for send tests. The reviewer account is a dedicated
synthetic account with one workspace and owner-controlled test recipients.

## Company, data, and compliance answers

- Use the verified legal business name and company details already present in the Anthropic
  organization. Do not invent a different publisher name for this form.
- The connector calls iBluSend's first-party API on the `iblusend.com` domain. It does not query
  Claude memory, chat history, conversation summaries, or unrelated user files.
- Tool responses contain only the selected workspace data needed for the requested operation.
  OAuth tokens, authorization codes, API keys, and credential hashes are excluded.
- A user's configured iBluSend CRM may receive normal product sync events under that user's
  settings. The connector itself does not add a new third-party data sale or model-training path.
- No health data or financial-transfer capability is requested.
- Public documentation, privacy terms, support, and connected-assistant disclosures are live at
  the URLs above.
- The connector has no `ui/open-link` capability and no MCP App UI, so no allowed-link list or
  carousel screenshots are submitted.

The canonical PNG fallback must retain SHA-256
`4f549fafdf51128f5f02f0df840abee603428c42d79e4602f1dd987c445ed9b4`.

## Tools and reviewer access

Use [reviewer-test-matrix.md](reviewer-test-matrix.md) for the exact eleven tools, annotations,
fixtures, five positive cases, three negative cases, and reset procedure. Exercise every tool in
MCP Inspector and again as a Claude custom connector before submission.

Supply reviewer credentials only through Anthropic's secure portal. The account must work without
MFA, email confirmation, SMS confirmation, or private-network access. Include every login and OAuth
step for a reviewer unfamiliar with iBluSend.

## Release notes and final gate

Release notes:

> Initial directory submission of iBluSend 1.0.0. The remote connector binds each OAuth grant to
> one iBluSend workspace and exposes eight read tools plus three separately scoped action tools.
> Private Claude pilots verified OAuth, workspace isolation, scope enforcement, stop control,
> revocation, and one confirmed test delivery to an owner-controlled recipient.

Before submission, confirm the exact Git commit, server health, OAuth discovery, Origin handling,
tool titles and annotations, public documentation, reviewer credentials, and all shared test cases.
Provider submission, reviewer-requested behavior changes, publication, and the Claude customer flag
remain separate owner approvals.
