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
- Write annotations match actual effects, especially `send_message`, opt-out, contact writes, and
  bot-state changes.
- HTTPS Origin handling, timeouts, result sizes, error shapes, privacy policy, docs, support, and a
  reviewer account are ready.
- The reviewer account is restricted to a synthetic workspace with owned data.

## Submission packet

Prepare the server name, resource URL, tagline, descriptions, use cases, transport, auth method,
read/write summary, category, tool list, annotations, documentation, support, privacy policy, test
account instructions, tested Claude surfaces, and final logo.

This v1 does not use MCP Apps or `ui/open-link`, so it should not claim interactive UI or request
an allowed-link list. If either capability is added later, reassess screenshots and URI ownership
before updating the submission.

Do not submit the generated iMessage Sender example. Do not broaden the public tool set in response
to a form field without updating the approved contract and its tests.
