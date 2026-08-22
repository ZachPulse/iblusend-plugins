# Local beta runbook

This runbook is for Gate A sandbox validation. It does not authorize a production deployment, a
production workspace, customer data, a real message, or a public listing.

## Preconditions

- Use a workspace-bound `iblu_test_` key created for synthetic data only.
- Use owned test contacts and no customer phone numbers.
- Keep the key in the operating system credential store or an ephemeral environment variable.
  Never paste it into JSON, source, screenshots, shell history, or chat.
- Confirm the MCP resource under test is:
  `https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public`.

## 1. Static package validation

From the repository root:

```bash
npm test
validation_env="$(mktemp -d)"
python3 -m pip install --quiet --target "$validation_env" -r requirements-validation.txt
PYTHONPATH="$validation_env" python3 \
  "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" plugins/iblusend
rm -r "$validation_env"
claude plugin validate plugins/iblusend --strict
claude plugin validate . --strict
```

Expected: every command exits zero, the generated package is current, and iBluSend's `.app.json`
contains only the issued canonical OpenAI app identifier.

## 2. Direct sandbox MCP contract

Load the beta key into `IBLUSEND_PLUGIN_BETA_KEY` without placing its value in the command line.
Then issue an MCP request with the key referenced only by the environment:

```bash
curl --fail-with-body --silent --show-error \
  --request POST \
  --header "Authorization: Bearer ${IBLUSEND_PLUGIN_BETA_KEY:?missing beta key}" \
  --header "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":"tools","method":"tools/list","params":{}}' \
  https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public
```

Record counts and tool names, not response payloads containing workspace or contact data.

- Read-only key: exactly eight tools.
- Read-and-act key: exactly thirteen tools.
- A held-back tool call returns an MCP method/tool error before dispatch.
- A hidden send argument, live iMessage probe, group creation, or group-media attempt is rejected.
- The advanced non-public resource remains eighteen tools in the platform regression suite.

Do not call `send_message` in Gate A, even with synthetic data. A schema rejection is sufficient to
test unsafe public arguments.

## 3. Codex and ChatGPT desktop package loading

Add the repository marketplace as a local source:

```bash
codex plugin marketplace add "$PWD"
codex plugin list
```

Restart the ChatGPT desktop app, open the Plugins Directory, select **iBluSend Official**, and
install **iBluSend**. Start a new task so plugin skills and MCP configuration reload.

Verify:

- all three skills appear under the iBluSend namespace;
- the package card uses the local assets and legal links;
- the MCP connection asks for authentication rather than exposing a credential; and
- a draft-only prompt stops before `send_message`.

ChatGPT developer-mode end-to-end OAuth uses the registered iBluSend MCP connection referenced by
`.app.json`. Confirm a fresh install opens the iBluSend consent flow, binds exactly one workspace,
and exposes only eight tools after choosing Read only.

## 4. Claude plugin loading

Load the package directly without installing it globally:

```bash
claude --plugin-dir plugins/iblusend
```

In Claude Code, run `/reload-plugins`, inspect `/plugin`, and inspect `/mcp`. Confirm all three
skills are namespaced to iBluSend and the remote server is listed.

Before production OAuth exists, a separately named local MCP entry can exercise the sandbox key.
The JSON below stores only an environment-variable reference:

```bash
claude mcp add-json iblusend-beta \
  '{"type":"http","url":"https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public","headers":{"Authorization":"Bearer ${IBLUSEND_PLUGIN_BETA_KEY}"}}' \
  --scope local
```

Use `/mcp` to confirm the beta connection, then run read-only synthetic prompts. Remove the local
override after testing:

```bash
claude mcp remove iblusend-beta --scope local
```

## 5. Skill scenarios

Run each against synthetic fixtures:

1. Inbox triage: it names the connected workspace, reads narrowly, labels inference, and performs
   no mutation.
2. Safe draft: it checks opt-out state, displays the exact destination and final message, and stops
   for explicit confirmation without sending.
3. Compliance: it previews one before/after change and stops for confirmation. A read-only
   connection explains the missing scope instead of attempting a write.

Capture redacted screenshots of package/skill discovery only. Never capture a bearer value,
authorization callback query, workspace identifier, phone number, contact name, or message body.

## Exit criteria

- Static validators pass.
- Tool counts and held-back argument failures match the public-v1 contract.
- Both hosts load the same three skills and same MCP resource.
- No write or real-world send occurs.
- The registered iBluSend app binding and read-only production OAuth proof are recorded; write/send
  E2E remains blocked until a server-side owned-recipient allowlist exists.
