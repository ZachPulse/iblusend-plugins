# Claude Connectors Directory submission

Gate C only. Submit the hosted MCP resource as an iBluSend remote connector after Gate B production
OAuth validation and separate owner approval.

Official references:

- [Build custom connectors](https://claude.com/docs/connectors/building)
- [Connector authentication](https://claude.com/docs/connectors/building/authentication)
- [Submitting to the Connectors Directory](https://claude.com/docs/connectors/building/submission)

## Readiness

- Streamable HTTP endpoint and OAuth 2.0 discovery are live.
- DCR works for Claude hosted callbacks and Claude Code loopback callbacks; CIMD remains available.
- Token refresh/expiry, revocation, exact redirect URI, exact resource, and one-workspace consent are
  proven with synthetic accounts.
- Every tool has a human-readable title and accurate `readOnlyHint` or `destructiveHint`.
- Write annotations match actual effects, especially `send_message`, opt-out, and bot-state
  changes. Contact creation and profile-field updates remain held back from public OAuth.
- HTTPS Origin handling, timeouts, result sizes, error shapes, privacy policy, docs, support, and a
  reviewer account are ready.
- The reviewer account is restricted to a synthetic workspace with owned data.

## Submission packet

Prepare the server name, resource URL, tagline, descriptions, use cases, transport, auth method,
read/write summary, category, tool list, annotations, documentation, support, privacy policy, test
account instructions, tested Claude surfaces, and final logo.

Use the canonical app icon for Anthropic's server-logo field because the connector card prints the
`iBluSend` name beside it. Prefer the public SVG at
`https://iblusend.com/brand/iblusend-brand-kit/app-icons/iblusend-app.svg`; if the form requires a
PNG upload, use `brands/assets/iblusend/composer-icon.png` from this repository. Its expected
SHA-256 is `4f549fafdf51128f5f02f0df840abee603428c42d79e4602f1dd987c445ed9b4`.
Verify the actual directory card on both light and dark Claude surfaces before approving Gate C,
and confirm that Anthropic's favicon check resolves the branded iBluSend site icon.

This v1 does not use MCP Apps or `ui/open-link`, so it should not claim interactive UI or request
an allowed-link list. If either capability is added later, reassess screenshots and URI ownership
before updating the submission.

Do not submit the generated iMessage Sender example. Do not broaden the public tool set in response
to a form field without updating the approved contract and its tests.
