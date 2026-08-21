import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { collectFiles } from "../scripts/validate-packages.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PATTERN_DEFINITION_FILES = new Set([
  "scripts/validate-packages.mjs",
  "tests/no-secrets.test.mjs",
]);

test("repository contains no likely secret, customer identifier, or private machine path", async () => {
  const findings = [];
  for (const absolute of await collectFiles(ROOT)) {
    const relative = path.relative(ROOT, absolute).split(path.sep).join("/");
    if (relative.endsWith(".png") || PATTERN_DEFINITION_FILES.has(relative)) continue;
    const contents = await readFile(absolute, "utf8");
    const patterns = [
      ["private key", new RegExp(`-----BEGIN [A-Z ]*${"PRIVATE"} KEY-----`)],
      ["live API key", new RegExp(`\\b(?:iblu|iblu_test|sk|ghp|pat)_[A-Za-z0-9_-]{12,}\\b`)],
      ["inline bearer", new RegExp(`\\bBearer\\s+[A-Za-z0-9._~-]{12,}\\b`, "i")],
      ["macOS home path", new RegExp(`/Users/[A-Za-z0-9._-]+/`)],
      ["Windows home path", new RegExp(`[A-Z]:\\\\Users\\\\`, "i")],
      // Hex checksums can contain eleven decimal-looking digits by chance. Requiring a
      // non-hex boundary keeps the detector useful for prose/config without that false positive.
      ["phone number", new RegExp(`(?:^|[^0-9A-Fa-f])\\+?1[ .-]?\\(?[2-9][0-9]{2}\\)?[ .-]?[0-9]{3}[ .-]?[0-9]{4}(?:[^0-9A-Fa-f]|$)`) ],
    ];
    for (const [label, pattern] of patterns) {
      if (pattern.test(contents)) findings.push(`${relative}: ${label}`);
    }
  }
  assert.deepEqual(findings, []);
});

test("repository contains no .app.json before a real portal ID exists", async () => {
  const appManifests = (await collectFiles(ROOT))
    .map((absolute) => path.relative(ROOT, absolute).split(path.sep).join("/"))
    .filter((relative) => relative.endsWith("/.app.json") || relative === ".app.json");
  assert.deepEqual(appManifests, []);
});
