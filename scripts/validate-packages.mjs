#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { renderSafeSendSkill } from "./safe-send-body.mjs";

const REQUIRED_SKILLS = [
  "contact-device-compliance",
  "inbox-triage",
  "safe-draft-and-send",
];
const HELD_BACK_TOOLS = [
  "create_contact",
  "mark_read",
  "remove_reaction",
  "send_reaction",
  "send_typing_indicator",
  "send_voice_memo",
  "update_contact",
];
const OPENAI_KEYS = new Set([
  "author",
  "description",
  "homepage",
  "keywords",
  "license",
  "mcpServers",
  "apps",
  "name",
  "repository",
  "skills",
  "version",
  "interface",
]);
const OPENAI_INTERFACE_KEYS = new Set([
  "brandColor",
  "capabilities",
  "category",
  "composerIcon",
  "defaultPrompt",
  "developerName",
  "displayName",
  "logo",
  "logoDark",
  "longDescription",
  "privacyPolicyURL",
  "screenshots",
  "shortDescription",
  "termsOfServiceURL",
  "websiteURL",
]);
const CLAUDE_KEYS = new Set([
  "$schema",
  "author",
  "description",
  "displayName",
  "homepage",
  "keywords",
  "license",
  "mcpServers",
  "name",
  "repository",
  "skills",
  "version",
]);
const ISSUED_OPENAI_APP_IDS = new Map([
  ["iblusend", "asdk_app_6a8904c0880c8191bbd17d77013abc1f"],
]);
const SAFE_SEND_SKILL_MISMATCH_ERROR =
  "safe-draft-and-send: file must exactly match the canonical artifact";

function parseArgs(argv) {
  const options = { root: "." };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--root") throw new Error(`Unknown argument: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error("--root requires a value");
    options.root = value;
    index += 1;
  }
  return options;
}

async function readJson(filePath, errors, label = filePath) {
  try {
    const value = JSON.parse(await readFile(filePath, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${label} must contain a JSON object`);
      return null;
    }
    return value;
  } catch (error) {
    errors.push(`${label} is missing or invalid JSON: ${error.message}`);
    return null;
  }
}

function requireString(object, key, errors, label) {
  if (typeof object?.[key] !== "string" || !object[key].trim()) {
    errors.push(`${label}.${key} must be a non-empty string`);
    return null;
  }
  return object[key];
}

function requireHttps(value, errors, label) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("not HTTPS");
  } catch {
    errors.push(`${label} must be an absolute HTTPS URL`);
  }
}

function rejectUnknown(object, allowed, errors, label) {
  for (const key of Object.keys(object ?? {})) {
    if (!allowed.has(key)) errors.push(`${label}.${key} is not an accepted field`);
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateSkillInventory(pluginRoot, errors) {
  const skillsRoot = path.join(pluginRoot, "skills");
  let entries;
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    errors.push("missing skills directory");
    return;
  }
  const requiredSkills = new Set(REQUIRED_SKILLS);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      errors.push(`unexpected skills entry: ${entry.name}`);
    } else if (!requiredSkills.has(entry.name)) {
      errors.push(`unexpected skill directory: ${entry.name}`);
    }
  }
}

async function validateNoSymlinks(root, errors) {
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (entry.isSymbolicLink()) {
        errors.push(`${relative}: symbolic links are not allowed`);
      } else if (entry.isDirectory()) {
        await walk(absolute);
      }
    }
  }
  await walk(root);
}

export async function collectFiles(root, { skipDevelopmentDirectories = true } = {}) {
  const result = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (
        skipDevelopmentDirectories &&
        (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist")
      ) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) result.push(absolute);
    }
  }
  await walk(path.resolve(root));
  return result.sort();
}

function normalizeProviderText(contents) {
  const decodeCodePoint = (match, digits, radix) => {
    const codePoint = Number.parseInt(digits, radix);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
    return String.fromCodePoint(codePoint);
  };
  let normalized = contents.normalize("NFKC");
  for (let pass = 0; pass < 4; pass += 1) {
    const previous = normalized;
    normalized = normalized
      .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (match, digits) => decodeCodePoint(match, digits, 16))
      .replace(/\\[uU]([0-9a-f]{8})/gi, (match, digits) => decodeCodePoint(match, digits, 16))
      .replace(/\\u([0-9a-f]{4})/gi, (match, digits) => decodeCodePoint(match, digits, 16))
      .replace(/\\x([0-9a-f]{2})/gi, (match, digits) => decodeCodePoint(match, digits, 16))
      .replace(/&#x([0-9a-f]+);/gi, (match, digits) => decodeCodePoint(match, digits, 16))
      .replace(/&#([0-9]+);/g, (match, digits) => decodeCodePoint(match, digits, 10))
      .replace(/&(?:lowbar|underbar);/gi, "_")
      .replace(/(?:%[0-9a-f]{2})+/gi, (encoded) => {
        try {
          return decodeURIComponent(encoded);
        } catch {
          return encoded;
        }
      })
      .replaceAll("\\_", "_")
      .normalize("NFKC");
    if (normalized === previous) break;
  }
  return normalized.toLowerCase();
}

function providerTextCandidates(contents) {
  const normalized = normalizeProviderText(contents);
  let rendered = normalized;
  for (let pass = 0; pass < 4; pass += 1) {
    const previous = rendered;
    rendered = rendered
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
      .replace(/<\/?[a-z][^>]*>/gi, "")
      .replace(/[`*~]/g, "")
      .replace(/\p{Default_Ignorable_Code_Point}/gu, "")
      .normalize("NFKC");
    if (rendered === previous) break;
  }
  const underscoreFormattingRemoved = rendered.replace(
    /_+/g,
    (underscores) => underscores.length % 2 === 0 ? "" : "_",
  );
  return [normalized, rendered, underscoreFormattingRemoved];
}

function validateHeldBackToolText(contents, label, errors) {
  const candidates = providerTextCandidates(contents);
  for (const heldBack of HELD_BACK_TOOLS) {
    if (candidates.some((candidate) => candidate.includes(heldBack))) {
      errors.push(`${label}: held-back tool ${heldBack} is named as callable`);
    }
  }
}

function validateProviderSyntax(contents, label, errors) {
  if (/&[a-z][a-z0-9]+;/i.test(contents)) {
    errors.push(`${label}: named HTML entities are not allowed`);
  }
  if (/!?\[[^\]]*\]\s*(?:\(|\[)/.test(contents)) {
    errors.push(`${label}: Markdown links are not allowed`);
  }
  if (/<\/?[a-z][a-z0-9-]*(?:\s|\/?>)/i.test(contents)) {
    errors.push(`${label}: HTML tags are not allowed`);
  }
}

function validatePng(buffer, errors, label, minimumWidth, minimumHeight) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    errors.push(`${label} is not a valid PNG signature`);
    return;
  }
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    errors.push(`${label} has no PNG IHDR chunk`);
    return;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width < minimumWidth || height < minimumHeight) {
    errors.push(`${label} is ${width}x${height}; expected at least ${minimumWidth}x${minimumHeight}`);
  }
}

async function validateSkill(pluginRoot, skillName, errors) {
  const skillPath = path.join(pluginRoot, "skills", skillName, "SKILL.md");
  let contents;
  try {
    contents = await readFile(skillPath, "utf8");
  } catch {
    errors.push(`missing skill: skills/${skillName}/SKILL.md`);
    return;
  }
  if (skillName === "safe-draft-and-send") {
    if (contents !== renderSafeSendSkill()) errors.push(SAFE_SEND_SKILL_MISMATCH_ERROR);
    return;
  }
  let frontmatter = "";
  if (!contents.startsWith("---\n")) {
    errors.push(`${skillName}: YAML frontmatter must come first`);
  } else {
    const frontmatterEnd = contents.indexOf("\n---\n", 4);
    if (frontmatterEnd < 0) {
      errors.push(`${skillName}: YAML frontmatter is not closed`);
    } else {
      frontmatter = contents.slice(4, frontmatterEnd);
    }
  }
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (name !== skillName) errors.push(`${skillName}: frontmatter name must equal its directory`);
  if (!description) errors.push(`${skillName}: frontmatter description is required`);
  if (/\b(bulk send|blast|bypass compliance|scrape contacts)\b/i.test(contents)) {
    errors.push(`${skillName}: contains prohibited bulk or bypass language`);
  }
}

function validateManifestParity(codex, claude, errors) {
  for (const key of ["name", "version", "description", "homepage", "repository", "license"]) {
    if (codex[key] !== claude[key]) errors.push(`provider manifest mismatch: ${key}`);
  }
  if (JSON.stringify(codex.author) !== JSON.stringify(claude.author)) {
    errors.push("provider manifest mismatch: author");
  }
  if (JSON.stringify(codex.keywords) !== JSON.stringify(claude.keywords)) {
    errors.push("provider manifest mismatch: keywords");
  }
  if (codex.skills !== "./skills/" || claude.skills !== "./skills/") {
    errors.push("both provider manifests must use ./skills/");
  }
  if (codex.mcpServers !== "./.mcp.json" || claude.mcpServers !== "./.mcp.json") {
    errors.push("both provider manifests must use ./.mcp.json");
  }
}

async function validateChecksums(pluginRoot, errors) {
  const checksumPath = path.join(pluginRoot, "CHECKSUMS.sha256");
  let contents;
  try {
    contents = await readFile(checksumPath, "utf8");
  } catch {
    errors.push("missing CHECKSUMS.sha256");
    return;
  }
  const expected = new Map();
  for (const [index, line] of contents.trimEnd().split("\n").entries()) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) {
      errors.push(`CHECKSUMS.sha256 line ${index + 1} is invalid`);
      continue;
    }
    if (match[2].includes("..") || path.isAbsolute(match[2])) {
      errors.push(`CHECKSUMS.sha256 path escapes package: ${match[2]}`);
      continue;
    }
    expected.set(match[2], match[1]);
  }
  const files = await collectFiles(pluginRoot, { skipDevelopmentDirectories: false });
  for (const absolute of files) {
    const relative = path.relative(pluginRoot, absolute).split(path.sep).join("/");
    if (relative === "CHECKSUMS.sha256") continue;
    if (!expected.has(relative)) {
      errors.push(`CHECKSUMS.sha256 does not cover ${relative}`);
      continue;
    }
    const actual = createHash("sha256").update(await readFile(absolute)).digest("hex");
    if (actual !== expected.get(relative)) errors.push(`checksum mismatch: ${relative}`);
    expected.delete(relative);
  }
  for (const missing of expected.keys()) errors.push(`CHECKSUMS.sha256 names missing file: ${missing}`);
}

async function validatePluginText(pluginRoot, errors) {
  const files = await collectFiles(pluginRoot, { skipDevelopmentDirectories: false });
  for (const absolute of files) {
    if (absolute.endsWith(".png")) continue;
    const relative = path.relative(pluginRoot, absolute).split(path.sep).join("/");
    const contents = await readFile(absolute, "utf8");
    const topLevelSkill = relative.match(/^skills\/([^/]+)\/SKILL\.md$/)?.[1];
    const label = topLevelSkill ?? relative;
    validateProviderSyntax(contents, label, errors);
    validateHeldBackToolText(contents, label, errors);
    const markerPatterns = [
      /\[TODO:/i,
      /\bCHANGEME\b/i,
      /\bTBD\b/,
      /https:\/\/example\.com/i,
      /\/Users\/[A-Za-z0-9._-]+\//,
      /[A-Z]:\\Users\\/i,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /\b(?:iblu|iblu_test|sk|ghp|pat)_[A-Za-z0-9_-]{12,}\b/,
      /\bBearer\s+[A-Za-z0-9._~-]{12,}\b/i,
    ];
    for (const pattern of markerPatterns) {
      if (pattern.test(contents)) errors.push(`${relative}: matches forbidden placeholder/secret pattern ${pattern}`);
    }
  }
}

export async function validatePackageRoot(root) {
  const errors = [];
  const absoluteRoot = path.resolve(root);
  const codexMarketplacePath = path.join(absoluteRoot, ".agents", "plugins", "marketplace.json");
  const claudeMarketplacePath = path.join(absoluteRoot, ".claude-plugin", "marketplace.json");
  const codexMarketplace = await readJson(codexMarketplacePath, errors, ".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(claudeMarketplacePath, errors, ".claude-plugin/marketplace.json");
  if (codexMarketplace) {
    validateProviderSyntax(
      JSON.stringify(codexMarketplace),
      ".agents/plugins/marketplace.json",
      errors,
    );
    validateHeldBackToolText(
      JSON.stringify(codexMarketplace),
      ".agents/plugins/marketplace.json",
      errors,
    );
  }
  if (claudeMarketplace) {
    validateProviderSyntax(
      JSON.stringify(claudeMarketplace),
      ".claude-plugin/marketplace.json",
      errors,
    );
    validateHeldBackToolText(
      JSON.stringify(claudeMarketplace),
      ".claude-plugin/marketplace.json",
      errors,
    );
  }
  const codexEntry = codexMarketplace?.plugins?.[0];
  const claudeEntry = claudeMarketplace?.plugins?.[0];
  const slug = codexEntry?.name;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? "")) errors.push("Codex marketplace must contain one kebab-case plugin");
  if (codexMarketplace?.plugins?.length !== 1) errors.push("Codex marketplace must contain exactly one plugin");
  if (claudeMarketplace?.plugins?.length !== 1) errors.push("Claude marketplace must contain exactly one plugin");
  if (claudeEntry?.name !== slug) errors.push("marketplace plugin names do not match");
  if (codexEntry?.source?.source !== "local" || codexEntry?.source?.path !== `./plugins/${slug}`) {
    errors.push("Codex marketplace source must be the local plugin path");
  }
  if (!codexEntry?.policy || !["AVAILABLE", "NOT_AVAILABLE", "INSTALLED_BY_DEFAULT"].includes(codexEntry.policy.installation)) {
    errors.push("Codex marketplace installation policy is missing or invalid");
  }
  if (!codexEntry?.policy || !["ON_INSTALL", "ON_USE"].includes(codexEntry.policy.authentication)) {
    errors.push("Codex marketplace authentication policy is missing or invalid");
  }
  if (!codexEntry?.category) errors.push("Codex marketplace category is required");
  if (claudeEntry?.source !== `./plugins/${slug}`) errors.push("Claude marketplace source must be the local plugin path");

  if (!slug) return errors;
  const pluginRoot = path.join(absoluteRoot, "plugins", slug);
  await validateNoSymlinks(pluginRoot, errors);
  const codex = await readJson(path.join(pluginRoot, ".codex-plugin", "plugin.json"), errors, "OpenAI plugin manifest");
  const claude = await readJson(path.join(pluginRoot, ".claude-plugin", "plugin.json"), errors, "Claude plugin manifest");
  const mcp = await readJson(path.join(pluginRoot, ".mcp.json"), errors, "MCP manifest");
  if (!codex || !claude || !mcp) return errors;

  rejectUnknown(codex, OPENAI_KEYS, errors, "OpenAI plugin manifest");
  rejectUnknown(codex.interface, OPENAI_INTERFACE_KEYS, errors, "OpenAI plugin manifest.interface");
  rejectUnknown(claude, CLAUDE_KEYS, errors, "Claude plugin manifest");
  validateManifestParity(codex, claude, errors);
  if (codex.name !== slug || claude.name !== slug) errors.push("plugin directory and manifest names must match");
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z.-]+)?$/.test(codex.version ?? "")) {
    errors.push("plugin version must be semantic versioning");
  }
  for (const [label, object, keys] of [
    ["OpenAI plugin manifest", codex, ["name", "version", "description", "homepage", "repository", "license"]],
    ["Claude plugin manifest", claude, ["name", "version", "description", "displayName", "homepage", "repository", "license"]],
  ]) {
    keys.forEach((key) => requireString(object, key, errors, label));
  }
  [codex.homepage, codex.repository, codex.interface?.websiteURL, codex.interface?.privacyPolicyURL, codex.interface?.termsOfServiceURL]
    .forEach((value, index) => requireHttps(value, errors, `OpenAI URL ${index + 1}`));
  if (!Array.isArray(codex.interface?.defaultPrompt) || codex.interface.defaultPrompt.length < 1 || codex.interface.defaultPrompt.length > 3) {
    errors.push("OpenAI defaultPrompt must contain one to three entries");
  } else if (codex.interface.defaultPrompt.some((entry) => typeof entry !== "string" || entry.length > 128)) {
    errors.push("OpenAI defaultPrompt entries must be strings no longer than 128 characters");
  }
  if (!Array.isArray(codex.interface?.capabilities) || !codex.interface.capabilities.length) {
    errors.push("OpenAI capabilities must be a non-empty array");
  }
  if (!/^#[0-9A-F]{6}$/.test(codex.interface?.brandColor ?? "")) errors.push("OpenAI brandColor must be uppercase #RRGGBB");
  if (!Array.isArray(codex.interface?.screenshots) || codex.interface.screenshots.length !== 3) {
    errors.push("OpenAI manifest must contain exactly three screenshots");
  }

  const servers = mcp.mcpServers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers) || Object.keys(servers).length !== 1) {
    errors.push("MCP manifest must contain exactly one server");
  } else {
    const [server] = Object.values(servers);
    if (server?.type !== "http") errors.push("MCP server type must be http");
    requireHttps(server?.url, errors, "MCP resource URL");
    if (server?.url !== "https://api.iblusend.com/functions/v1/agent-api/v1/mcp/public") {
      errors.push("MCP resource URL is not the approved public endpoint");
    }
    if (server?.headers || server?.env || server?.oauth?.clientSecret) {
      errors.push("MCP manifest must not embed headers, environment secrets, or an OAuth client secret");
    }
  }

  const appJson = path.join(pluginRoot, ".app.json");
  if (await fileExists(appJson)) {
    const app = await readJson(appJson, errors, "OpenAI app manifest");
    rejectUnknown(app, new Set(["apps"]), errors, "OpenAI app manifest");
    if (codex.apps !== "./.app.json") {
      errors.push("OpenAI plugin manifest must reference ./.app.json when an app mapping exists");
    }
    const appEntries = app?.apps;
    if (!appEntries || typeof appEntries !== "object" || Array.isArray(appEntries)) {
      errors.push("OpenAI app manifest.apps must be an object");
    } else if (Object.keys(appEntries).length !== 1 || !Object.hasOwn(appEntries, slug)) {
      errors.push("OpenAI app manifest must contain exactly the package slug mapping");
    } else {
      const mapping = appEntries[slug];
      if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
        errors.push("OpenAI app mapping must be an object");
      } else {
        if (!/^asdk_app_[0-9a-f]{32}$/.test(mapping.id ?? "")) {
          errors.push("OpenAI app mapping id must be a canonical asdk_app identifier");
        }
        const issuedAppId = ISSUED_OPENAI_APP_IDS.get(slug);
        if (issuedAppId && mapping.id !== issuedAppId) {
          errors.push(`OpenAI app mapping id for ${slug} must equal its issued identifier`);
        }
        for (const key of Object.keys(mapping)) {
          if (key !== "id") {
            errors.push(`OpenAI app mapping.${key} is not an accepted field`);
          }
        }
      }
    }
  } else if (codex.apps !== undefined) {
    errors.push("OpenAI plugin manifest must not reference .app.json when no app mapping exists");
  }
  await validateSkillInventory(pluginRoot, errors);
  for (const skillName of REQUIRED_SKILLS) await validateSkill(pluginRoot, skillName, errors);

  const assetRequirements = [
    ["assets/icon.png", 128, 128],
    ["assets/logo.png", 256, 128],
    ["assets/logo-dark.png", 256, 128],
    ["assets/screenshot-inbox-triage.png", 1000, 600],
    ["assets/screenshot-safe-send.png", 1000, 600],
    ["assets/screenshot-compliance.png", 1000, 600],
  ];
  for (const [relative, minimumWidth, minimumHeight] of assetRequirements) {
    try {
      validatePng(await readFile(path.join(pluginRoot, relative)), errors, relative, minimumWidth, minimumHeight);
    } catch {
      errors.push(`missing asset: ${relative}`);
    }
  }

  if (codexEntry?.name !== codex.name || claudeEntry?.name !== claude.name) errors.push("catalog and manifest names differ");
  if (claudeEntry?.version !== claude.version) errors.push("Claude catalog and manifest versions differ");
  await validateChecksums(pluginRoot, errors);
  await validatePluginText(pluginRoot, errors);
  return errors;
}

async function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const errors = await validatePackageRoot(root);
  if (errors.length) {
    process.stderr.write(`Package validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Package validation passed: ${path.resolve(root)}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
