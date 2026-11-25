# iBluSend Plugins

Official, shared plugin packaging for iBluSend on OpenAI and Claude. One package connects both
providers to the same workspace-bound MCP resource and supplies eleven provider-neutral workflows:

- inbox triage;
- safe draft and send;
- contact, device, and compliance operations; and
- one workflow for each optional area: reports, templates, campaigns, calendar, invoices, contact
  edits, iMessage extras, and calendar booking.

Every OAuth grant discovers thirteen messaging tools: ten read tools and three action tools that
need Read and act. On the Connect screen the person can also tick optional areas (reports,
templates, campaigns, calendar, invoices, and the owner-only workflows, BluBot, and voice agents).
Each area is its own OAuth scope; a call without it returns `insufficient_scope`. Nothing in a read
or draft area sends, launches, books, or charges: drafts and booking links wait for the person to
press the button in the app. Three areas act under Read and act: contact edits, iMessage extras, and
calendar booking. They reach only contacts the person approves under Manage actions, and a booking,
move, or cancel waits for a preview and a confirm code.

The public package intentionally exposes the curated public-v1 contract. It is not a bulk campaign
engine, does not bypass iBluSend compliance controls, and does not ship credentials.

## Repository status

Version `1.4.0` adds the workflow builder, bot builder, voice agents and past texts skills, and asks
for Past texts from your Mac on the Connect screen. Version 1.3.0 added the contact edits, iMessage
extras, and calendar booking skills. It has **not** been submitted to or published in Anthropic's or OpenAI's provider
directory. The Grok Build copy (`plugins/iblusend-grok`) is listed through a pull request to
`xai-org/plugin-marketplace`. The iBluSend package carries the OpenAI app mapping proven in
the private ChatGPT developer-mode beta; white-label output omits `.app.json` unless that brand has
its own registered OpenAI app.

## Layout

```text
plugins/iblusend/                     Generated installable plugin
  .codex-plugin/plugin.json           OpenAI / Codex manifest
  .app.json                           Registered iBluSend OpenAI app mapping
  .claude-plugin/plugin.json          Claude manifest
  .mcp.json                           Shared remote MCP connection
  skills/                             Provider-neutral workflows
plugins/iblusend-grok/                Generated Grok Build copy: same skills and server
  .grok-plugin/plugin.json            Grok manifest
  .mcp.json                           Scopes as a list, no client id (Grok registers its own)
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

See the public [AI Assistants setup guide](https://iblusend.com/help/ai-assistants),
[local beta](docs/local-beta.md), [white-label packaging](docs/white-label.md), and the provider
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
