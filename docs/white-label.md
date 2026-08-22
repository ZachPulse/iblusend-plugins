# White-label package generator

The generator produces a complete private Codex and Claude marketplace tree from one validated
brand document. Generated agency bundles are private; only iBluSend is planned for the first public
submissions.

## Brand contract

Start from `brands/imessage-sender.example.json` and validate fields against
`brands/brand.schema.json`. The document controls:

- package slug, display name, version, descriptions, category, capabilities, and keywords;
- publisher name, email, website, and repository;
- support, privacy, terms, and homepage URLs;
- remote MCP server name and exact HTTPS resource;
- brand colors, monogram, generated light/dark logos, composer icon, and three screenshots;
- starter prompts and workspace/channel wording; and
- both marketplace identities and install policy.

An optional `openai.appId` may be supplied only after that exact brand receives its own ChatGPT
developer-mode registration. Store the canonical `asdk_app_...` runtime identifier, not the
`plugin_asdk_app_...` wrapper shown in the ChatGPT URL. Omit the field for unregistered brands.

All values must be final and authorized. Do not put a customer name, private repository URL,
credential, tenant identifier, phone number, or private legal document into the public repository.

## Generate and validate

Choose an output directory outside any public repository for a real agency bundle:

```bash
node scripts/generate-brand-package.mjs \
  --brand brands/imessage-sender.example.json \
  --output dist/imessage-sender
node scripts/validate-packages.mjs --root dist/imessage-sender
```

The output includes both marketplace catalogs, both provider manifests, one `.mcp.json`, all three
skills, six PNG assets, a submission checklist, and SHA-256 checksums. Generation has no timestamp
and is deterministic for the same source document and generator version.

Run the same command twice to separate clean directories and compare their trees before releasing
a generator change. The automated generator test performs this check for the two reference brands.

## Infrastructure attribution

A white-label MCP URL may still use shared iBluSend infrastructure. Any intentional occurrence
must be the exact string listed in `infrastructureAttribution.allowedBrandReferences`. The test
suite removes only those exact values before enforcing that no other `iblusend` string appears in
the generated white-label bundle.

Prefer a verified branded resource URL when one genuinely serves the MCP contract. Never invent a
branded URL merely to make a manifest look finished.

## Distribution boundary

- Store generated customer bundles in approved private storage.
- Share the complete bundle, not an isolated manifest whose relative paths will break.
- Agencies are responsible for their publisher identity, marks, legal URLs, and future public
  submissions.
- Do not commit `dist/`, customer brand documents, reviewer credentials, or archives.
- Bump the package version for every distributed update and regenerate checksums.
- Keep `.app.json` absent unless that brand has its own real OpenAI portal connection identifier.
- Generate unregistered brands into a fresh output directory. The generator fails closed rather
  than retaining a stale `.app.json` from a previously registered build of the same slug.

The iMessage Sender document is a reference implementation and private test target. It is not an
authorization to publish another public marketplace listing.
