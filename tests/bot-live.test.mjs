// 1.5.0: the "Switch bots on and off" right (bot_live:write) and the bot-builder text that goes
// with it. Every check here fails on 1.4.0, which neither asked for the right nor taught the tools.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadAndValidateBrand, writeBrandPackage } from "../scripts/generate-brand-package.mjs";
import { validatePackageRoot } from "../scripts/validate-packages.mjs";
import { BUILDER_AREAS, builderTools, renderBotLiveSection } from "../scripts/builder-skills.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(ROOT, relative), "utf8");
const BOT_TOOLS = [
  "turn_bot_on",
  "turn_bot_off",
  "list_bot_knowledge",
  "add_bot_knowledge",
  "remove_bot_knowledge",
];
const REFUSALS = [
  "bot_already_on",
  "bot_revision_conflict",
  "bot_reach_changed",
  "confirm_code_expired",
  "confirm_code_mismatch",
  "already_off: true",
  "byok_required",
];

test("every requested scope list ends with bot_live:write", async () => {
  const brand = JSON.parse(await read("brands/iblusend.json"));
  const claudeMcp = JSON.parse(await read("plugins/iblusend/.mcp.json"));
  const grokMcp = JSON.parse(await read("plugins/iblusend-grok/.mcp.json"));
  for (const scopes of [
    brand.mcp.oauth.scopes.split(" "),
    claudeMcp.mcpServers.iblusend.oauth.scopes.split(" "),
    grokMcp.mcpServers.iblusend.oauth.scopes,
  ]) {
    assert.equal(scopes.at(-1), "bot_live:write");
    assert.equal(scopes.at(-2), "history:read");
    assert.equal(scopes.filter((scope) => scope === "bot_live:write").length, 1);
  }
  assert.equal(JSON.parse(await read("package.json")).version, "1.5.0");
});

test("the bot area lists the switch and knowledge tools under their own scopes", () => {
  const bots = BUILDER_AREAS.find((area) => area.skill === "bot-builder");
  assert.equal(bots.liveScope, "bot_live:write");
  assert.equal(bots.liveLabel, "Switch bots on and off");
  assert.deepEqual([...bots.liveTools], ["turn_bot_on", "turn_bot_off"]);
  assert.ok(bots.readTools.includes("list_bot_knowledge"));
  assert.ok(bots.draftTools.includes("add_bot_knowledge"));
  assert.ok(bots.draftTools.includes("remove_bot_knowledge"));
  for (const tool of BOT_TOOLS) assert.ok(builderTools(bots).includes(tool), tool);
  for (const area of BUILDER_AREAS.filter((item) => item !== bots)) assert.equal(area.liveScope, undefined);
});

for (const slug of ["iblusend", "iblusend-grok"]) {
  test(`${slug} bot-builder teaches the preview, the yes, the code and every refusal`, async () => {
    const skill = await read(`plugins/${slug}/skills/bot-builder/SKILL.md`);
    for (const tool of BOT_TOOLS) assert.ok(skill.includes(`\`${tool}\``), tool);
    for (const code of REFUSALS) assert.ok(skill.includes(`\`${code}\``), code);
    assert.ok(skill.includes('"Switch bots on and off"'));
    assert.ok(skill.includes("`bot_live:write`"));
    assert.match(skill, /Only the workspace owner can tick BluBot/);
    assert.match(skill, /Never switch a bot on by yourself/);
    assert.match(skill, /Only the person's yes to a switch-on preview, in a later turn, counts/);
    assert.match(skill, /`confirm_code` that lasts 10 minutes/);
    assert.match(skill, /Never reuse a\s+code/);
    assert.match(skill, /30,000 characters a document/);
    assert.doesNotMatch(skill, /No tool here switches a bot on/);
    // The draft-only rule stays word for word for workflows and voice agents.
    for (const other of ["workflow-builder", "voice-agents"]) {
      const contents = await read(`plugins/${slug}/skills/${other}/SKILL.md`);
      assert.match(contents, /It never runs, publishes, switches on or applies anything/);
      assert.doesNotMatch(contents, /turn_bot_on|bot_live:write/);
    }
  });
}

test("the validator rejects a bot-builder that drops the yes-to-a-preview rule", async (t) => {
  const output = await mkdtemp(path.join(os.tmpdir(), "iblusend-bot-live-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const { brand } = await loadAndValidateBrand(path.join(ROOT, "brands", "iblusend.json"));
  await writeBrandPackage({ brand, outputRoot: output });
  assert.deepEqual(await validatePackageRoot(output), []);

  const pluginRoot = path.join(output, "plugins", "iblusend");
  const relative = "skills/bot-builder/SKILL.md";
  const original = await readFile(path.join(pluginRoot, relative), "utf8");
  assert.ok(original.includes(renderBotLiveSection(BUILDER_AREAS[1])));
  const weakened = original.replace(
    "Only the person's yes to a switch-on preview, in a later turn, counts.",
    "Switch it on when it looks ready.",
  );
  assert.notEqual(weakened, original);
  await writeFile(path.join(pluginRoot, relative), weakened);
  const digest = (text) => createHash("sha256").update(text).digest("hex");
  const checksumPath = path.join(pluginRoot, "CHECKSUMS.sha256");
  await writeFile(
    checksumPath,
    (await readFile(checksumPath, "utf8")).replace(`${digest(original)}  ${relative}`, `${digest(weakened)}  ${relative}`),
  );
  const errors = await validatePackageRoot(output);
  assert.ok(errors.includes("bot-builder: switch-on rules must exactly match the canonical artifact"), errors.join("\n"));
  assert.equal(errors.some((error) => error.includes("checksum")), false);
});
