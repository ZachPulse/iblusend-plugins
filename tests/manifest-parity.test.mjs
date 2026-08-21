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

  for (const key of ["name", "version", "description", "author", "homepage", "repository", "license", "keywords"]) {
    assert.deepEqual(codex[key], claude[key], key);
  }
  assert.equal(codex.skills, "./skills/");
  assert.equal(claude.skills, "./skills/");
  assert.equal(codex.mcpServers, "./.mcp.json");
  assert.equal(claude.mcpServers, "./.mcp.json");
  assert.deepEqual(mcp, {
    mcpServers: {
      iblusend: {
        type: "http",
        url: "https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public",
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

test("package has three shared skills and no OpenAI compatibility placeholder", async () => {
  const skillNames = ["contact-device-compliance", "inbox-triage", "safe-draft-and-send"];
  for (const skillName of skillNames) {
    const contents = await readFile(path.join(PLUGIN, "skills", skillName, "SKILL.md"), "utf8");
    assert.match(contents, new RegExp(`^---\\nname: ${skillName}\\n`));
  }
  await assert.rejects(readFile(path.join(PLUGIN, ".app.json")), /ENOENT/);
});
