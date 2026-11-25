# Claude plugin directory submission packet

This packet covers the public iBluSend `1.4.0` plugin for Claude Code and Cowork. The plugin bundles
the same remote iBluSend connector with eleven guarded skills. It is separate from the Claude
Connectors Directory entry. Preparing it does not authorize a submission or publication.

Official references:

- [Create plugins](https://code.claude.com/docs/en/plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Submit your plugin](https://claude.com/docs/plugins/submit)

## Source and portal values

| Field | Value |
|---|---|
| Name | iBluSend |
| Version | `1.4.0` |
| Category | Productivity |
| Public repository | `https://github.com/ZachPulse/iblusend-plugins` |
| Plugin path | `plugins/iblusend` |
| Marketplace manifest | `.claude-plugin/marketplace.json` |
| Documentation | `https://iblusend.com/help/ai-assistants` |
| Privacy policy | `https://iblusend.com/privacy` |
| Terms | `https://iblusend.com/ai-usage-terms` |
| Support | `https://iblusend.com/support` |
| Connector | `https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public` |

Description:

> Review one iBluSend workspace, prepare safe replies, inspect contact and device state, and make
> one confirmed messaging or compliance change through the iBluSend remote connector.

Use the public GitHub repository in the form. At final submission time, record the exact reviewed
commit and verify that the repository's default branch contains it. Closed-source or private
white-label bundles are not part of this listing.

## Package contents

- `inbox-triage`: read-only review and an action list.
- `safe-draft-and-send`: exact preview, fresh confirmation, one send, then status lookup.
- `contact-device-compliance`: read one contact or device and confirm one opt-out or bot change.
- `reports`: read the Reports page numbers (Reports area).
- `templates`: read templates and save one the person approves (Templates area).
- `campaigns`: read campaigns and save a draft the person launches in the app (Campaigns area).
- `calendar`: read appointments and open times, and prepare booking links (Calendar area).
- `invoices`: read invoices and save a draft the person sends in the app (Invoices area).
- `contact-edits`: add or edit one contact; tags only on approved contacts (Contact edits area).
- `imessage-extras`: tapbacks, typing bubbles, read receipts and voice memos to approved contacts
  (iMessage extras area).
- `calendar-booking`: book, move or cancel after a preview and the person's yes (Calendar booking
  area).
- `.mcp.json`: the production iBluSend remote connector using OAuth. It contains no static bearer
  header, API key, client secret, install hook, local executable, or monitor.

The package includes the hash-pinned iBluSend icon and light/dark lockups. Claude's current plugin
manifest schema does not define an icon field, so the manifest must stay free of unsupported logo
properties. Use the submission surface for listing artwork when offered.

## Validation

```bash
npm test
claude plugin validate plugins/iblusend --strict
claude plugin validate . --strict
claude --plugin-dir plugins/iblusend
```

In the clean test session:

1. Run `/reload-plugins`.
2. Inspect `/plugin` and `/mcp`.
3. Invoke all eleven skills with the final file tree.
4. Confirm the remote connector is deduplicated when the directory connector and plugin point to
   the same URL.
5. Complete the shared five positive and three negative cases in
   [reviewer-test-matrix.md](reviewer-test-matrix.md).
6. Confirm a fresh install works in both Claude Code and Cowork.

## Portal access and release notes

The Claude.ai submission form requires a Team or Enterprise organization with directory management
access. The Console form accepts a Developer, Admin, or Owner of a Console organization. Use either
the Claude.ai plugin submission page or `https://platform.claude.com/plugins/submit` after the final
merge and separate submission approval.

Release notes:

> Initial public release of iBluSend 1.4.0 for Claude Code and Cowork. The plugin combines the
> production iBluSend OAuth connector with inbox triage, safe one-to-one draft and send, and
> contact/device compliance skills, plus a skill for each area the person ticks on the Connect
> screen: reports, templates, campaigns, calendar, invoices, contact edits, iMessage extras and
> calendar booking. Read and draft areas save drafts or return links; nothing launches or charges
> until the person presses the button in the app. Contact edits, iMessage extras and calendar
> booking reach only contacts the person approves, and a booking waits for a preview and a confirm
> code. Every write requires Read and act consent plus a fresh preview and confirmation.

Only iBluSend is submitted in version 1.4.0. Generated agency bundles and the iMessage Sender
reference stay private unless their publisher later owns and approves a separate submission.
Provider submission, reviewer-requested behavior changes, publication, and the Claude customer flag
remain separate owner approvals.
