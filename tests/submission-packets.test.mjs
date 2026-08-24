import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(relative) {
  return readFile(path.join(ROOT, relative), "utf8");
}

async function json(relative) {
  return JSON.parse(await read(relative));
}

test("release candidate version and public URLs stay aligned", async () => {
  const packageJson = await json("package.json");
  const brand = await json("brands/iblusend.json");
  const codex = await json("plugins/iblusend/.codex-plugin/plugin.json");
  const claude = await json("plugins/iblusend/.claude-plugin/plugin.json");
  const claudeMarketplace = await json(".claude-plugin/marketplace.json");
  const checklist = await read("plugins/iblusend/SUBMISSION_CHECKLIST.md");

  const versions = [
    packageJson.version,
    brand.package.version,
    codex.version,
    claude.version,
    claudeMarketplace.version,
    claudeMarketplace.plugins[0].version,
  ];
  assert.deepEqual(new Set(versions), new Set(["1.0.0"]));
  assert.match(checklist, /Package version is `1\.0\.0` everywhere/);

  assert.equal(brand.legal.homepage, "https://iblusend.com/features/ai-assistants");
  assert.equal(brand.legal.terms, "https://iblusend.com/ai-usage-terms");
  assert.equal(codex.homepage, brand.legal.homepage);
  assert.equal(claude.homepage, brand.legal.homepage);
  assert.equal(codex.interface.termsOfServiceURL, brand.legal.terms);
});

test("shared reviewer matrix pins five positive, three negative, and eleven tools", async () => {
  const matrix = await read("docs/submission/reviewer-test-matrix.md");
  const positive = [...matrix.matchAll(/^### P\d+:/gm)].map((match) => match[0]);
  const negative = [...matrix.matchAll(/^### N\d+:/gm)].map((match) => match[0]);
  assert.deepEqual(positive, [
    "### P1:",
    "### P2:",
    "### P3:",
    "### P4:",
    "### P5:",
  ]);
  assert.deepEqual(negative, ["### N1:", "### N2:", "### N3:"]);

  const inventory = matrix.slice(
    matrix.indexOf("## Exact tool inventory"),
    matrix.indexOf("## Five positive cases"),
  );
  const tools = [...inventory.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
  assert.deepEqual(tools, [
    "get_conversation",
    "list_devices",
    "check_message_status",
    "get_opt_out_status",
    "get_bot_status",
    "list_groups",
    "list_contacts",
    "lookup_imessage",
    "send_message",
    "opt_out",
    "set_bot_status",
  ]);

  assert.match(matrix, /Both access levels discover these eleven tools/);
  assert.match(matrix, /`insufficient_scope` before argument validation or dispatch/);
  assert.match(matrix, /`send_message` requires one E\.164 `to` target and exposes no group target/);
  assert.doesNotMatch(matrix, /\+1\d{10}/);
});

test("OpenAI packet carries current portal, identity, scan, and review gates", async () => {
  const packet = await read("docs/submission/openai.md");
  for (const required of [
    "Apps Management: Write",
    "verified iBluSend business identity",
    "With MCP (MCP server plus uploaded skills)",
    "MCP URL type | Universal",
    "https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public",
    "https://iblusend.com/help/ai-assistants",
    "https://iblusend.com/ai-usage-terms",
    "five positive cases, three negative cases",
    "openai-apps-challenge",
    "Initial public submission of iBluSend 1.0.0",
  ]) {
    assert.ok(packet.includes(required), required);
  }
  assert.match(packet, /Do not enter the private-beta `asdk_app_\.\.\.` identifier/);
  assert.match(packet, /Initial availability \| United States/);
});

test("Claude packets carry current organization, listing, validation, and source gates", async () => {
  const connector = await read("docs/submission/claude-connector.md");
  const plugin = await read("docs/submission/claude-plugin.md");
  const normalizedConnector = connector.replace(/\s+/g, " ");
  const normalizedPlugin = plugin.replace(/\s+/g, " ");

  for (const required of [
    "Team or Enterprise",
    "Directory or Libraries permission",
    "Streamable HTTP",
    "55-character limit",
    "100-character limit",
    "MCP Inspector",
    "without MFA, email confirmation, SMS confirmation, or private-network access",
  ]) {
    assert.ok(normalizedConnector.includes(required), required);
  }
  for (const required of [
    "https://github.com/ZachPulse/iblusend-plugins",
    "plugins/iblusend",
    "claude plugin validate plugins/iblusend --strict",
    "Claude Code and Cowork",
    "https://platform.claude.com/plugins/submit",
  ]) {
    assert.ok(normalizedPlugin.includes(required), required);
  }
});

test("review packets contain no unfinished markers or committed credentials", async () => {
  const paths = [
    "docs/submission/openai.md",
    "docs/submission/claude-connector.md",
    "docs/submission/claude-plugin.md",
    "docs/submission/reviewer-test-matrix.md",
  ];
  for (const relative of paths) {
    const contents = await read(relative);
    for (const forbidden of [
      /\[TODO:/i,
      /\bCHANGEME\b/i,
      /\bTBD\b/,
      /https:\/\/example\.com/i,
      /\bBearer\s+[A-Za-z0-9._~-]{12,}\b/i,
      /\b(?:iblu|iblu_test|sk|ghp|pat)_[A-Za-z0-9_-]{12,}\b/,
    ]) {
      assert.doesNotMatch(contents, forbidden, `${relative}: ${forbidden}`);
    }
  }
});
