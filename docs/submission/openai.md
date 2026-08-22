# OpenAI universal directory submission

Gate C only. The OpenAI public plugin directory is shared by ChatGPT and Codex; submit one iBluSend
package after Gate B production OAuth validation and separate owner approval.

Official references:

- [Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Authenticate users](https://developers.openai.com/plugins/build/auth)
- [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Submit plugins](https://developers.openai.com/plugins/deploy/submission)

## Readiness

- The submitter's OpenAI organization role has Apps Management write access.
- The public MCP endpoint is served over HTTPS and passes OpenAI's MCP scan.
- OAuth metadata, PKCE S256, CIMD/DCR behavior, exact resource/issuer handling, refresh rotation,
  revocation, and one-workspace consent are live and tested.
- Read-only and Read and act scopes expose exactly eight and thirteen tools respectively.
- Every tool has accurate read-only/destructive/open-world annotations; send remains consequential.
- Support, privacy, terms, documentation, test cases, country availability, and policy attestations
  are final.
- Screenshots contain synthetic data and match the submitted behavior.

## Real portal connection identifier

The iBluSend MCP resource is registered in ChatGPT developer mode and its issued technical
identifier has been verified through a live read-only OAuth connection. The package now:

1. maps the portal connection to the canonical `asdk_app_...` runtime identifier in
   `plugins/iblusend/.app.json`;
2. points the OpenAI manifest's `apps` field at `./.app.json`;
3. keeps the mapping minimal and app-ID-only, matching OpenAI's generated developer package; and
4. leaves white-label packages app-ID-free unless that brand receives its own registration.

Never reuse this registration in a white-label bundle or replace it with a made-up identifier.

## Submission evidence

Attach or record:

- served discovery and 401 challenge receipts;
- OAuth allow/deny, scope, refresh, revoke, and membership-revocation cases;
- tool inventory and annotations;
- synthetic examples for all thirteen tools, including refused unsafe send variants;
- exact send preview and provider confirmation behavior;
- legal/support URLs and publisher identity; and
- rollback owner and procedure.

Submitting, publishing, widening tools/scopes, or responding to a reviewer with behavioral changes
requires Gate C authorization. A passing package build is not submission approval.
