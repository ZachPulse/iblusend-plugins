# Claude plugin directory submission

Gate C only. This submission packages the same remote iBluSend MCP connector with three guarded
skills for Claude Code and Cowork. It is separate from the Connectors Directory submission.

Official references:

- [Create plugins](https://code.claude.com/docs/en/plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Submit your plugin](https://claude.com/docs/plugins/submit)

## Preflight

```bash
npm test
claude plugin validate plugins/iblusend --strict
claude plugin validate . --strict
claude --plugin-dir plugins/iblusend
```

In the test session, run `/reload-plugins`, inspect `/plugin` and `/mcp`, and invoke all three
skills. Confirm the remote endpoint is deduplicated when the directory connector and plugin both
point at the same URL.

## Readiness

- The public GitHub repository contains the exact reviewed source.
- Manifest version, marketplace version, checksums, README, legal links, and MCP URL agree.
- No install hook, command, monitor, local executable, client secret, or static bearer header is
  bundled.
- Skill descriptions trigger narrowly and each workflow enforces its read/write boundary.
- Safe draft and send shows the exact final payload, waits for explicit confirmation, calls once,
  and does not retry ambiguous results.
- The bundled connector is live, OAuth-tested, and submitted or suitable for the Connectors
  Directory.
- A clean-machine install from the public repository succeeds in Claude Code and Cowork.

## Brand assets

The shared package carries the same hash-pinned iBluSend app icon and light/dark lockups used by
the Codex package. Claude Code's current plugin and marketplace manifest schemas do not define an
icon or logo property, so do not add an unsupported field to make a local card appear branded.
Use the Claude submission surface for listing artwork when it offers that control, and keep the
bundled assets ready for hosts that support them.

## Submit

Use Anthropic's in-app plugin submission form with the public GitHub repository or a complete zip
whose top level contains the plugin structure. Keep the repository public and rerun
`claude plugin validate` immediately before submission.

Only iBluSend is submitted in v1. Generated agency bundles and the iMessage Sender reference remain
private unless their publisher separately approves and owns a later submission.
