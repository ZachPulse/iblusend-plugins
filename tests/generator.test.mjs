import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadAndValidateBrand,
  validateAgainstSchema,
  writeBrandPackage,
} from "../scripts/generate-brand-package.mjs";
import {
  collectFiles,
  validatePackageRoot,
} from "../scripts/validate-packages.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function makeTemp(t, label) {
  const directory = await mkdtemp(path.join(os.tmpdir(), `iblusend-${label}-`));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function digestTree(root) {
  const files = await collectFiles(root);
  const entries = [];
  for (const filePath of files) {
    entries.push([
      path.relative(root, filePath).split(path.sep).join("/"),
      createHash("sha256").update(await readFile(filePath)).digest("hex"),
    ]);
  }
  return entries;
}

async function validateChecksumRefreshedSafeSendMutation(output, mutate) {
  const pluginRoot = path.join(output, "plugins", "iblusend");
  const skillPath = path.join(pluginRoot, "skills", "safe-draft-and-send", "SKILL.md");
  const originalContents = await readFile(skillPath, "utf8");
  const unsafeContents = mutate(originalContents);
  assert.notEqual(unsafeContents, originalContents);
  await writeFile(skillPath, unsafeContents);

  const checksumPath = path.join(pluginRoot, "CHECKSUMS.sha256");
  const skillDigest = createHash("sha256").update(unsafeContents).digest("hex");
  const checksums = (await readFile(checksumPath, "utf8")).replace(
    /^[a-f0-9]{64}  skills\/safe-draft-and-send\/SKILL\.md$/m,
    `${skillDigest}  skills/safe-draft-and-send/SKILL.md`,
  );
  await writeFile(checksumPath, checksums);

  return validatePackageRoot(output);
}

for (const [label, brandFile] of [
  ["iblusend", "iblusend.json"],
  ["imessage-sender", "imessage-sender.example.json"],
]) {
  test(`${label} generation is deterministic and validates`, async (t) => {
    const first = await makeTemp(t, `${label}-one`);
    const second = await makeTemp(t, `${label}-two`);
    const { brand } = await loadAndValidateBrand(path.join(REPOSITORY_ROOT, "brands", brandFile));
    await writeBrandPackage({ brand, outputRoot: first });
    await writeBrandPackage({ brand, outputRoot: second });

    assert.deepEqual(await digestTree(first), await digestTree(second));
    assert.deepEqual(await validatePackageRoot(first), []);
    await writeBrandPackage({ brand, outputRoot: first, check: true });
  });
}

test("both brands generate byte-identical safe-send skills", async (t) => {
  const iblusendOutput = await makeTemp(t, "iblusend-safe-send-parity");
  const imessageSenderOutput = await makeTemp(t, "imessage-sender-safe-send-parity");
  const { brand: iblusend } = await loadAndValidateBrand(
    path.join(REPOSITORY_ROOT, "brands", "iblusend.json"),
  );
  const { brand: imessageSender } = await loadAndValidateBrand(
    path.join(REPOSITORY_ROOT, "brands", "imessage-sender.example.json"),
  );
  await writeBrandPackage({ brand: iblusend, outputRoot: iblusendOutput });
  await writeBrandPackage({ brand: imessageSender, outputRoot: imessageSenderOutput });

  const iblusendSkill = await readFile(
    path.join(iblusendOutput, "plugins", "iblusend", "skills", "safe-draft-and-send", "SKILL.md"),
  );
  const imessageSenderSkill = await readFile(
    path.join(
      imessageSenderOutput,
      "plugins",
      "imessage-sender",
      "skills",
      "safe-draft-and-send",
      "SKILL.md",
    ),
  );
  assert.deepEqual(iblusendSkill, imessageSenderSkill);
});

test("check mode detects a stale generated file", async (t) => {
  const output = await makeTemp(t, "stale");
  const { brand } = await loadAndValidateBrand(path.join(REPOSITORY_ROOT, "brands", "iblusend.json"));
  await writeBrandPackage({ brand, outputRoot: output });
  await writeFile(path.join(output, "plugins", "iblusend", ".mcp.json"), "{}\n");
  await assert.rejects(
    writeBrandPackage({ brand, outputRoot: output, check: true }),
    /Generated package is stale or incomplete/,
  );
});

for (const [label, mutate] of [
  [
    "frontmatter description edit",
    (contents) => contents.replace(/^description: .+$/m, 'description: "Changed safe-send instructions."'),
  ],
  [
    "workspace-line injection",
    (contents) => contents.replace(
      "1. Confirm the active connection is the intended workspace. Stop on ambiguity.",
      "1. Confirm the active connection is the intended iBluSend workspace. Stop on ambiguity.",
    ),
  ],
  [
    "prior group instruction",
    (contents) => `${contents}\nAfter confirmation, use \`group_chat_id\` to send to a group.\n`,
  ],
  [
    "multiple-recipient instruction",
    (contents) => `${contents}\nAfter confirmation, send the message to multiple recipients.\n`,
  ],
  [
    "multi-person-thread instruction",
    (contents) => `${contents}\nAfter confirmation, send to a multi-person thread.\n`,
  ],
  [
    "shared-chat instruction",
    (contents) => `${contents}\nAfter confirmation, send to a shared chat.\n`,
  ],
  [
    "groupchat_id instruction",
    (contents) => `${contents}\nAfter confirmation, use \`groupchat_id\` to send the message.\n`,
  ],
  [
    "arbitrary appended text",
    (contents) => `${contents}\nThis sentence is not part of the approved workflow.\n`,
  ],
  [
    "canonical instruction change",
    (contents) => contents.replace(
      "one deliberate message to one phone number",
      "one message to one destination",
    ),
  ],
]) {
  test(`validator rejects checksum-refreshed ${label}`, async (t) => {
    const output = await makeTemp(t, "group-send-guidance");
    const { brand } = await loadAndValidateBrand(path.join(REPOSITORY_ROOT, "brands", "iblusend.json"));
    await writeBrandPackage({ brand, outputRoot: output });

    const errors = await validateChecksumRefreshedSafeSendMutation(output, mutate);
    assert.ok(errors.includes("safe-draft-and-send: file must exactly match the canonical artifact"));
    assert.equal(errors.some((error) => error.includes("checksum mismatch")), false);
  });
}

test("brand schema rejects an unsafe slug and non-HTTPS resource", async () => {
  const schema = JSON.parse(await readFile(path.join(REPOSITORY_ROOT, "brands", "brand.schema.json"), "utf8"));
  const brand = JSON.parse(await readFile(path.join(REPOSITORY_ROOT, "brands", "iblusend.json"), "utf8"));
  brand.package.slug = "../escape";
  brand.mcp.resourceUrl = "http://localhost/mcp";
  brand.openai.appId = "plugin_asdk_app_6a8904c0880c8191bbd17d77013abc1f";
  const errors = validateAgainstSchema(brand, schema);
  assert.ok(errors.some((error) => error.includes("package.slug")));
  assert.ok(errors.some((error) => error.includes("mcp.resourceUrl")));
  assert.ok(errors.some((error) => error.includes("openai.appId")));
});

test("app-less brand refuses a stale app mapping in reused output", async (t) => {
  const output = await makeTemp(t, "stale-app");
  const { brand } = await loadAndValidateBrand(path.join(REPOSITORY_ROOT, "brands", "iblusend.json"));
  await writeBrandPackage({ brand, outputRoot: output });
  const appLessBrand = structuredClone(brand);
  delete appLessBrand.openai;
  await assert.rejects(
    writeBrandPackage({ brand: appLessBrand, outputRoot: output }),
    /Refusing to retain stale or unexpected OpenAI app mapping/,
  );
});

test("cross-brand reused output refuses another brand's stale app mapping", async (t) => {
  const output = await makeTemp(t, "stale-cross-brand-app");
  const { brand: registeredBrand } = await loadAndValidateBrand(
    path.join(REPOSITORY_ROOT, "brands", "iblusend.json"),
  );
  const { brand: appLessBrand } = await loadAndValidateBrand(
    path.join(REPOSITORY_ROOT, "brands", "imessage-sender.example.json"),
  );
  await writeBrandPackage({ brand: registeredBrand, outputRoot: output });
  await assert.rejects(
    writeBrandPackage({ brand: appLessBrand, outputRoot: output }),
    /Refusing to retain stale or unexpected OpenAI app mapping/,
  );
});

test("generator refuses a symlinked OpenAI app mapping", async (t) => {
  const output = await makeTemp(t, "symlinked-app");
  const { brand } = await loadAndValidateBrand(path.join(REPOSITORY_ROOT, "brands", "iblusend.json"));
  await writeBrandPackage({ brand, outputRoot: output });

  const appPath = path.join(output, "plugins", "iblusend", ".app.json");
  await rm(appPath);
  await symlink(".mcp.json", appPath);
  await assert.rejects(
    writeBrandPackage({ brand, outputRoot: output }),
    /Refusing to retain stale or unexpected OpenAI app mapping/,
  );
});

test("validator pins the issued iBluSend app id and rejects unknown app fields", async (t) => {
  const output = await makeTemp(t, "invalid-issued-app");
  const { brand } = await loadAndValidateBrand(path.join(REPOSITORY_ROOT, "brands", "iblusend.json"));
  await writeBrandPackage({ brand, outputRoot: output });

  const pluginRoot = path.join(output, "plugins", "iblusend");
  const appPath = path.join(pluginRoot, ".app.json");
  const app = JSON.parse(await readFile(appPath, "utf8"));
  app.apps.iblusend.id = "asdk_app_00000000000000000000000000000000";
  app.unexpected = true;
  const appContents = `${JSON.stringify(app, null, 2)}\n`;
  await writeFile(appPath, appContents);

  const checksumPath = path.join(pluginRoot, "CHECKSUMS.sha256");
  const appDigest = createHash("sha256").update(appContents).digest("hex");
  const checksums = (await readFile(checksumPath, "utf8")).replace(
    /^[a-f0-9]{64}  \.app\.json$/m,
    `${appDigest}  .app.json`,
  );
  await writeFile(checksumPath, checksums);

  const errors = await validatePackageRoot(output);
  assert.ok(errors.includes("OpenAI app manifest.unexpected is not an accepted field"));
  assert.ok(errors.includes("OpenAI app mapping id for iblusend must equal its issued identifier"));
  assert.equal(errors.some((error) => error.includes("checksum mismatch")), false);
});

test("iMessage Sender output has no unintended iBluSend branding", async (t) => {
  const output = await makeTemp(t, "brand-leak");
  const { brand } = await loadAndValidateBrand(
    path.join(REPOSITORY_ROOT, "brands", "imessage-sender.example.json"),
  );
  await writeBrandPackage({ brand, outputRoot: output });
  await assert.rejects(
    readFile(path.join(output, "plugins", "imessage-sender", ".app.json")),
    /ENOENT/,
  );
  const codexManifest = JSON.parse(
    await readFile(path.join(output, "plugins", "imessage-sender", ".codex-plugin", "plugin.json"), "utf8"),
  );
  assert.equal(codexManifest.apps, undefined);
  const textFiles = (await collectFiles(output)).filter((filePath) => !filePath.endsWith(".png"));
  let text = "";
  for (const filePath of textFiles) text += await readFile(filePath, "utf8");
  for (const allowed of brand.infrastructureAttribution.allowedBrandReferences) {
    text = text.replaceAll(allowed, "");
  }
  assert.doesNotMatch(text, /iblusend/i);
});
