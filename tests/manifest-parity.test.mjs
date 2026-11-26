import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = path.join(ROOT, "plugins", "iblusend");

async function loadJson(relative) {
  return JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
}

test("OpenAI and Claude manifests share identity, skills, and MCP resource", async () => {
  const codex = await loadJson("plugins/iblusend/.codex-plugin/plugin.json");
  const claude = await loadJson("plugins/iblusend/.claude-plugin/plugin.json");
  const mcp = await loadJson("plugins/iblusend/.mcp.json");
  const app = await loadJson("plugins/iblusend/.app.json");

  for (const key of ["name", "version", "description", "author", "homepage", "repository", "license", "keywords"]) {
    assert.deepEqual(codex[key], claude[key], key);
  }
  assert.equal(codex.skills, "./skills/");
  assert.equal(claude.skills, "./skills/");
  assert.equal(codex.mcpServers, "./.codex-mcp.json");
  assert.deepEqual(JSON.parse(await readFile(path.join(ROOT, "plugins", "iblusend", ".codex-mcp.json"), "utf8")).mcpServers, {
    iblusend: {
      type: "http",
      url: "https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public",
    },
  });
  assert.equal(claude.mcpServers, "./.mcp.json");
  assert.equal(codex.apps, "./.app.json");
  assert.equal(claude.apps, undefined);
  assert.deepEqual(app, {
    apps: {
      iblusend: {
        id: "asdk_app_6a8a543370988191833212380a71b2b9",
      },
    },
  });
  assert.deepEqual(mcp, {
    mcpServers: {
      iblusend: {
        type: "http",
        url: "https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public",
        oauth: {
          clientId: "https://claude.ai/oauth/claude-code-client-metadata",
          scopes: "workspace:read messages:read contacts:read automation:read messages:send contacts:write automation:write workflows:read workflows:drafts:write reports:read templates:read templates:drafts:write campaigns:read campaigns:drafts:write calendar:read bots:read bots:drafts:write voice:read voice:drafts:write invoices:read invoices:drafts:write contact_edits:write signals:write bookings:write history:read bot_live:write",
          authServerMetadataUrl: "https://iblusend.com/.well-known/oauth-authorization-server",
        },
      },
    },
  });
});

test("both marketplace catalogs resolve the same package", async () => {
  const codex = await loadJson(".agents/plugins/marketplace.json");
  const claude = await loadJson(".claude-plugin/marketplace.json");
  assert.equal(codex.plugins.length, 1);
  assert.equal(claude.plugins.length, 1);
  assert.equal(codex.plugins[0].name, "iblusend");
  assert.equal(claude.plugins[0].name, "iblusend");
  assert.equal(codex.plugins[0].source.path, "./plugins/iblusend");
  assert.equal(claude.plugins[0].source, "./plugins/iblusend");
  assert.equal(codex.plugins[0].policy.installation, "AVAILABLE");
  assert.equal(codex.plugins[0].policy.authentication, "ON_INSTALL");
});

test("package has fifteen shared skills and an issued OpenAI app mapping", async () => {
  const skillNames = [
    "bot-builder",
    "calendar",
    "calendar-booking",
    "campaigns",
    "contact-device-compliance",
    "contact-edits",
    "imessage-extras",
    "inbox-triage",
    "invoices",
    "past-texts",
    "reports",
    "safe-draft-and-send",
    "templates",
    "voice-agents",
    "workflow-builder",
  ];
  const skillDirectories = (await readdir(path.join(PLUGIN, "skills"))).sort();
  assert.deepEqual(skillDirectories, skillNames);
  for (const skillName of skillNames) {
    const contents = await readFile(path.join(PLUGIN, "skills", skillName, "SKILL.md"), "utf8");
    assert.match(contents, new RegExp(`^---\\nname: ${skillName}\\n`));
  }
  const app = JSON.parse(await readFile(path.join(PLUGIN, ".app.json"), "utf8"));
  assert.equal(app.apps.iblusend.id, "asdk_app_6a8a543370988191833212380a71b2b9");
  assert.deepEqual(Object.keys(app.apps.iblusend), ["id"]);
});

test("checked-in provider copy preserves group reads and the thirteen-tool scope challenge", async () => {
  const inboxSkill = await readFile(
    path.join(PLUGIN, "skills", "inbox-triage", "SKILL.md"),
    "utf8",
  );
  assert.match(inboxSkill, /read one phone or one existing group at a time/);

  const contactSkill = await readFile(
    path.join(PLUGIN, "skills", "contact-device-compliance", "SKILL.md"),
    "utf8",
  );
  assert.doesNotMatch(contactSkill, /`(?:create_contact|update_contact)`/);

  const readme = await readFile(path.join(PLUGIN, "README.md"), "utf8");
  assert.match(readme, /Every OAuth grant discovers the same\nthirteen messaging tools\./);
  assert.match(readme, /the three action tools return\nan `insufficient_scope` challenge before validation or dispatch/);
  assert.doesNotMatch(readme, /Read-only grants discover only read\ntools/);

  const checklist = await readFile(path.join(PLUGIN, "SUBMISSION_CHECKLIST.md"), "utf8");
  assert.match(checklist, /OAuth discovery exposes the thirteen messaging tools for both access levels/);
  assert.match(checklist, /Read-only action calls return `insufficient_scope` before validation or dispatch/);
  assert.doesNotMatch(checklist, /Read-only access discovers eight tools/);

  const openAiSubmission = await readFile(path.join(ROOT, "docs", "submission", "openai.md"), "utf8");
  assert.match(openAiSubmission, /OAuth discovery exposes exactly thirteen messaging tools for both access levels/);
  assert.match(openAiSubmission, /return `insufficient_scope` before validation\s+or dispatch/);
  assert.doesNotMatch(openAiSubmission, /expose exactly eight and eleven tools respectively/);

  const localBeta = await readFile(path.join(ROOT, "docs", "local-beta.md"), "utf8");
  assert.match(localBeta, /OAuth Read only and Read and act both discover the same thirteen messaging tools/);
  assert.match(localBeta, /API-key Read only: exactly ten tools/);
  assert.match(localBeta, /API-key Read and act: exactly fifteen tools/);

  const claudeSubmission = await readFile(
    path.join(ROOT, "docs", "submission", "claude-connector.md"),
    "utf8",
  );
  assert.doesNotMatch(claudeSubmission, /contact writes/i);

  const claudeMarketplace = await loadJson(".claude-plugin/marketplace.json");
  assert.doesNotMatch(claudeMarketplace.plugins[0].description, /manage contacts/i);
});

test("Grok Build copy loads in Grok: scopes are a list, no Claude client id, same skills and server", async () => {
  const claude = await loadJson("plugins/iblusend/.claude-plugin/plugin.json");
  const claudeMcp = await loadJson("plugins/iblusend/.mcp.json");
  const grok = await loadJson("plugins/iblusend-grok/.grok-plugin/plugin.json");
  const grokMcp = await loadJson("plugins/iblusend-grok/.mcp.json");

  for (const key of ["name", "version", "description", "homepage", "repository", "license"]) {
    assert.deepEqual(grok[key], claude[key], `Grok manifest ${key} matches Claude`);
  }
  for (const keyword of grok.keywords) {
    assert.ok(keyword === "iblusend" || keyword.startsWith("iblusend "), `brand-scoped keyword: ${keyword}`);
  }

  const claudeServer = claudeMcp.mcpServers.iblusend;
  const grokServer = grokMcp.mcpServers.iblusend;
  assert.equal(grokServer.type, "http");
  assert.equal(grokServer.url, claudeServer.url);
  // Grok 1.0.88 drops the whole server ("invalid type: string, expected a sequence") when
  // oauth.scopes is one string, which is the form Claude Code takes.
  assert.ok(Array.isArray(grokServer.oauth.scopes), "Grok oauth.scopes must be a list");
  assert.deepEqual(grokServer.oauth.scopes, claudeServer.oauth.scopes.split(" "));
  // Claude Code's client metadata only redirects to Claude; Grok registers its own client.
  assert.deepEqual(Object.keys(grokServer.oauth), ["scopes"]);

  const skills = async (root) => (await readdir(path.join(ROOT, root, "skills"))).sort();
  assert.deepEqual(await skills("plugins/iblusend-grok"), await skills("plugins/iblusend"));
  for (const name of await skills("plugins/iblusend")) {
    assert.equal(
      await readFile(path.join(ROOT, "plugins/iblusend-grok/skills", name, "SKILL.md"), "utf8"),
      await readFile(path.join(ROOT, "plugins/iblusend/skills", name, "SKILL.md"), "utf8"),
      `skill ${name} is identical`,
    );
  }
});
