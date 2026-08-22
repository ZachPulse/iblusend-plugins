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

In ChatGPT developer mode, register the MCP resource from scratch and copy the technical identifier
whose value begins with `plugin_asdk_app`. Only then:

1. add `plugins/iblusend/.app.json` with that exact identifier;
2. add `"apps": "./.app.json"` to the OpenAI manifest;
3. rerun the official validator and all repository tests; and
4. test a fresh local install and workspace-published private copy.

Never commit a made-up or copied identifier. The package intentionally omits `.app.json` during
Gate A.

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
