import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadAndValidateBrand,
  validateAgainstSchema,
  writeBrandPackage,
} from "../scripts/generate-brand-package.mjs";
import { collectFiles, validatePackageRoot } from "../scripts/validate-packages.mjs";

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

test("brand schema rejects an unsafe slug and non-HTTPS resource", async () => {
  const schema = JSON.parse(await readFile(path.join(REPOSITORY_ROOT, "brands", "brand.schema.json"), "utf8"));
  const brand = JSON.parse(await readFile(path.join(REPOSITORY_ROOT, "brands", "iblusend.json"), "utf8"));
  brand.package.slug = "../escape";
  brand.mcp.resourceUrl = "http://localhost/mcp";
  const errors = validateAgainstSchema(brand, schema);
  assert.ok(errors.some((error) => error.includes("package.slug")));
  assert.ok(errors.some((error) => error.includes("mcp.resourceUrl")));
});

test("iMessage Sender output has no unintended iBluSend branding", async (t) => {
  const output = await makeTemp(t, "brand-leak");
  const { brand } = await loadAndValidateBrand(
    path.join(REPOSITORY_ROOT, "brands", "imessage-sender.example.json"),
  );
  await writeBrandPackage({ brand, outputRoot: output });
  const textFiles = (await collectFiles(output)).filter((filePath) => !filePath.endsWith(".png"));
  let text = "";
  for (const filePath of textFiles) text += await readFile(filePath, "utf8");
  for (const allowed of brand.infrastructureAttribution.allowedBrandReferences) {
    text = text.replaceAll(allowed, "");
  }
  assert.doesNotMatch(text, /iblusend/i);
});
