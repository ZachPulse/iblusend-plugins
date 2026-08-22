# iBluSend Plugins

Official, shared plugin packaging for iBluSend on OpenAI and Claude. One package connects both
providers to the same workspace-bound MCP resource and supplies three provider-neutral workflows:

- inbox triage;
- safe draft and send; and
- contact, device, and compliance operations.

The public package intentionally exposes the curated public-v1 contract. It is not a bulk campaign
engine, does not bypass iBluSend compliance controls, and does not ship credentials.

## Repository status

This package remains a development/local beta and has **not** been submitted to a public
marketplace. The iBluSend package now carries the real OpenAI app mapping proven in the private
ChatGPT developer-mode beta; white-label output omits `.app.json` unless that brand has its own
registered OpenAI app.

## Layout

```text
plugins/iblusend/                     Generated installable plugin
  .codex-plugin/plugin.json           OpenAI / Codex manifest
  .app.json                           Registered iBluSend OpenAI app mapping
  .claude-plugin/plugin.json          Claude manifest
  .mcp.json                           Shared remote MCP connection
  skills/                             Provider-neutral workflows
.agents/plugins/marketplace.json      Codex repository marketplace
.claude-plugin/marketplace.json       Claude repository marketplace
brands/                               Validated brand documents
scripts/                              Generator and package validator
tests/                                Determinism, parity, and leak checks
docs/                                 Beta and submission runbooks
```

## Validate the checked-in package

Node.js 20 or newer is sufficient; there are no runtime or development dependencies.

```bash
npm test
```

When the provider CLIs and the OpenAI validator's PyYAML dependency are available, run their
validators too. Use a temporary Python target rather than installing globally when needed:

```bash
validation_env="$(mktemp -d)"
python3 -m pip install --quiet --target "$validation_env" -r requirements-validation.txt
PYTHONPATH="$validation_env" python3 \
  "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" plugins/iblusend
rm -r "$validation_env"
claude plugin validate plugins/iblusend --strict
claude plugin validate . --strict
```

## Regenerate iBluSend

```bash
npm run generate
npm run generate:check
```

Generated plugin files carry a header or are binary assets. Change `brands/iblusend.json` or the
generator, then regenerate; do not patch generated copies independently.

## Generate a private white-label bundle

```bash
node scripts/generate-brand-package.mjs \
  --brand brands/imessage-sender.example.json \
  --output dist/imessage-sender
node scripts/validate-packages.mjs --root dist/imessage-sender
```

`dist/` is ignored. Agency brand documents and archives stay private. Only iBluSend is intended
for the first public submissions.

See [local beta](docs/local-beta.md), [white-label packaging](docs/white-label.md), and the provider
submission runbooks under [`docs/submission/`](docs/submission/).

## Security

- The MCP endpoint is `https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public`.
- OAuth is discovered from the resource at runtime; no client secret or API key belongs here.
- Every authorization grant is bound to one workspace.
- Write tools require `Read and act` consent.
- Sending workflows stop on the exact workspace, one 1:1 recipient, and final content for host approval.

Report security concerns privately to [support@iblusend.com](mailto:support@iblusend.com).

## License and marks

Code and workflow text are licensed under [MIT](LICENSE). iBluSend names, logos, and other brand
assets are excluded from that grant; see [TRADEMARKS.md](TRADEMARKS.md).
