import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.deepEqual(codex.mcpServers, {
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
          scopes: "workspace:read messages:read contacts:read automation:read messages:send contacts:write automation:write",
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

test("package has three shared skills and an issued OpenAI app mapping", async () => {
  const skillNames = ["contact-device-compliance", "inbox-triage", "safe-draft-and-send"];
  for (const skillName of skillNames) {
    const contents = await readFile(path.join(PLUGIN, "skills", skillName, "SKILL.md"), "utf8");
    assert.match(contents, new RegExp(`^---\\nname: ${skillName}\\n`));
  }
  const app = JSON.parse(await readFile(path.join(PLUGIN, ".app.json"), "utf8"));
  assert.equal(app.apps.iblusend.id, "asdk_app_6a8a543370988191833212380a71b2b9");
  assert.deepEqual(Object.keys(app.apps.iblusend), ["id"]);
});

test("checked-in provider copy preserves group reads and the 8/11 contract", async () => {
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

  const checklist = await readFile(path.join(PLUGIN, "SUBMISSION_CHECKLIST.md"), "utf8");
  assert.match(checklist, /Read-only access discovers eight tools; Read and act discovers eleven/);
  assert.doesNotMatch(checklist, /thirteen/i);

  const openAiSubmission = await readFile(path.join(ROOT, "docs", "submission", "openai.md"), "utf8");
  assert.match(openAiSubmission, /exactly eight and eleven tools respectively/);
  assert.doesNotMatch(openAiSubmission, /thirteen/i);

  const localBeta = await readFile(path.join(ROOT, "docs", "local-beta.md"), "utf8");
  assert.match(localBeta, /OAuth Read and act: exactly eleven tools/);
  assert.match(localBeta, /API-key Read and act: exactly thirteen tools/);

  const claudeSubmission = await readFile(
    path.join(ROOT, "docs", "submission", "claude-connector.md"),
    "utf8",
  );
  assert.doesNotMatch(claudeSubmission, /contact writes/i);

  const claudeMarketplace = await loadJson(".claude-plugin/marketplace.json");
  assert.doesNotMatch(claudeMarketplace.plugins[0].description, /manage contacts/i);
});
