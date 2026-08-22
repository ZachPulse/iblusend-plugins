#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { renderSafeSendSkill } from "./safe-send-body.mjs";

const GENERATOR_VERSION = 2;
const SCREENSHOTS = [
  ["screenshot-inbox-triage.png", "INBOX TRIAGE", "READ ONLY"],
  ["screenshot-safe-send.png", "SAFE DRAFT AND SEND", "APPROVAL REQUIRED"],
  ["screenshot-compliance.png", "CONTACT AND COMPLIANCE", "ONE CHANGE AT A TIME"],
];

function parseArgs(argv) {
  const options = { check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    if (arg === "--brand" || arg === "--output") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.brand) throw new Error("--brand is required");
  if (!options.output) throw new Error("--output is required");
  return options;
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function resolveJsonPointer(root, pointer) {
  if (!pointer.startsWith("#/")) throw new Error(`Only local schema references are supported: ${pointer}`);
  return pointer
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, key) => value?.[key], root);
}

function instanceType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

export function validateAgainstSchema(value, schema, rootSchema = schema, location = "$") {
  const errors = [];
  if (schema.$ref) {
    const resolved = resolveJsonPointer(rootSchema, schema.$ref);
    if (!resolved) return [`${location}: unresolved schema reference ${schema.$ref}`];
    return validateAgainstSchema(value, resolved, rootSchema, location);
  }
  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push(`${location}: must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((entry) => entry === value)) {
    errors.push(`${location}: must be one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(", ")}`);
  }
  if (schema.type) {
    const actual = instanceType(value);
    const typeMatches = schema.type === "number"
      ? actual === "number" || actual === "integer"
      : schema.type === actual;
    if (!typeMatches) {
      errors.push(`${location}: expected ${schema.type}, received ${actual}`);
      return errors;
    }
  }
  if (schema.type === "object") {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(`${location}.${required}: is required`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (key === "$schema") continue;
        if (!Object.hasOwn(schema.properties ?? {}, key)) {
          errors.push(`${location}.${key}: additional property is not allowed`);
        }
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validateAgainstSchema(value[key], childSchema, rootSchema, `${location}.${key}`));
      }
    }
  }
  if (schema.type === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${location}: must contain at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${location}: must contain at most ${schema.maxItems} items`);
    }
    if (schema.uniqueItems) {
      const serialized = value.map((entry) => JSON.stringify(entry));
      if (new Set(serialized).size !== serialized.length) errors.push(`${location}: items must be unique`);
    }
    if (schema.items) {
      value.forEach((entry, index) => {
        errors.push(...validateAgainstSchema(entry, schema.items, rootSchema, `${location}[${index}]`));
      });
    }
  }
  if (schema.type === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${location}: must contain at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${location}: must contain at most ${schema.maxLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${location}: does not match ${schema.pattern}`);
    }
    if (schema.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push(`${location}: must be an email address`);
    }
  }
  return errors;
}

export async function loadAndValidateBrand(brandPath) {
  const absoluteBrandPath = path.resolve(brandPath);
  const brand = JSON.parse(await readFile(absoluteBrandPath, "utf8"));
  const schemaPath = path.resolve(path.dirname(absoluteBrandPath), brand.$schema ?? "brand.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const errors = validateAgainstSchema(brand, schema);
  if (errors.length) {
    throw new Error(`Brand validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
  return { brand, schemaPath };
}

function hexToRgba(hex, alpha = 255) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    alpha,
  ];
}

function mix(left, right, amount) {
  return left.map((value, index) => Math.round(value * (1 - amount) + right[index] * amount));
}

const FONT = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
};

class Raster {
  constructor(width, height, color) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
    this.fillRect(0, 0, width, height, color);
  }

  fillRect(x, y, width, height, color) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + width));
    const y1 = Math.min(this.height, Math.ceil(y + height));
    for (let row = y0; row < y1; row += 1) {
      for (let column = x0; column < x1; column += 1) {
        const offset = (row * this.width + column) * 4;
        this.data.set(color, offset);
      }
    }
  }

  gradient(x, y, width, height, from, to, vertical = false) {
    const span = Math.max(1, vertical ? height - 1 : width - 1);
    for (let offset = 0; offset < (vertical ? height : width); offset += 1) {
      const color = mix(from, to, offset / span);
      if (vertical) this.fillRect(x, y + offset, width, 1, color);
      else this.fillRect(x + offset, y, 1, height, color);
    }
  }

  drawText(text, x, y, scale, color) {
    let cursor = x;
    for (const rawCharacter of text.toUpperCase()) {
      const character = FONT[rawCharacter] ? rawCharacter : " ";
      const glyph = FONT[character];
      glyph.forEach((row, rowIndex) => {
        for (let column = 0; column < row.length; column += 1) {
          if (row[column] === "1") {
            this.fillRect(cursor + column * scale, y + rowIndex * scale, scale, scale, color);
          }
        }
      });
      cursor += 6 * scale;
    }
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

const DEFLATE_LENGTHS = [
  [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0],
  [11, 1], [13, 1], [15, 1], [17, 1],
  [19, 2], [23, 2], [27, 2], [31, 2],
  [35, 3], [43, 3], [51, 3], [59, 3],
  [67, 4], [83, 4], [99, 4], [115, 4],
  [131, 5], [163, 5], [195, 5], [227, 5], [258, 0],
];

const DEFLATE_DISTANCES = [
  [1, 0], [2, 0], [3, 0], [4, 0],
  [5, 1], [7, 1], [9, 2], [13, 2],
  [17, 3], [25, 3], [33, 4], [49, 4],
  [65, 5], [97, 5], [129, 6], [193, 6],
  [257, 7], [385, 7], [513, 8], [769, 8],
  [1025, 9], [1537, 9], [2049, 10], [3073, 10],
  [4097, 11], [6145, 11], [8193, 12], [12289, 12],
  [16385, 13], [24577, 13],
];

function reverseBits(value, width) {
  let reversed = 0;
  for (let bit = 0; bit < width; bit += 1) {
    reversed = (reversed << 1) | ((value >>> bit) & 1);
  }
  return reversed;
}

class DeflateBitWriter {
  constructor() {
    this.bytes = [];
    this.pending = 0;
    this.pendingBits = 0;
  }

  writeBits(value, width) {
    this.pending |= value << this.pendingBits;
    this.pendingBits += width;
    while (this.pendingBits >= 8) {
      this.bytes.push(this.pending & 0xff);
      this.pending >>>= 8;
      this.pendingBits -= 8;
    }
  }

  finish() {
    if (this.pendingBits > 0) this.bytes.push(this.pending & 0xff);
    return Buffer.from(this.bytes);
  }
}

function writeFixedSymbol(writer, symbol) {
  if (symbol <= 143) {
    writer.writeBits(reverseBits(0x30 + symbol, 8), 8);
  } else if (symbol <= 255) {
    writer.writeBits(reverseBits(0x190 + symbol - 144, 9), 9);
  } else if (symbol <= 279) {
    writer.writeBits(reverseBits(symbol - 256, 7), 7);
  } else {
    writer.writeBits(reverseBits(0xc0 + symbol - 280, 8), 8);
  }
}

function findDeflateRange(ranges, value) {
  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    if (value >= ranges[index][0]) return index;
  }
  throw new Error(`Unsupported DEFLATE value: ${value}`);
}

function writeLengthDistance(writer, length, distance) {
  const lengthIndex = findDeflateRange(DEFLATE_LENGTHS, length);
  const [lengthBase, lengthExtraBits] = DEFLATE_LENGTHS[lengthIndex];
  writeFixedSymbol(writer, 257 + lengthIndex);
  if (lengthExtraBits) writer.writeBits(length - lengthBase, lengthExtraBits);

  const distanceIndex = findDeflateRange(DEFLATE_DISTANCES, distance);
  const [distanceBase, distanceExtraBits] = DEFLATE_DISTANCES[distanceIndex];
  writer.writeBits(reverseBits(distanceIndex, 5), 5);
  if (distanceExtraBits) writer.writeBits(distance - distanceBase, distanceExtraBits);
}

function deflateHash(input, position) {
  return ((input[position] * 251 + input[position + 1]) * 251 + input[position + 2]) & 0xffff;
}

function fixedDeflate(input) {
  const writer = new DeflateBitWriter();
  const latest = new Int32Array(65536);
  latest.fill(-1);

  // One final block using the RFC 1951 fixed Huffman tables. Implementing this small,
  // deterministic encoder avoids zlib-version-dependent PNG bytes and checksums.
  writer.writeBits(1, 1);
  writer.writeBits(1, 2);

  let position = 0;
  while (position < input.length) {
    let consumed = 1;
    if (position + 2 < input.length) {
      const hash = deflateHash(input, position);
      const candidate = latest[hash];
      const distance = position - candidate;
      let matchLength = 0;
      if (candidate >= 0 && distance <= 32768) {
        const maximum = Math.min(258, input.length - position);
        while (
          matchLength < maximum
          && input[candidate + matchLength] === input[position + matchLength]
        ) {
          matchLength += 1;
        }
      }
      if (matchLength >= 3) {
        writeLengthDistance(writer, matchLength, distance);
        consumed = matchLength;
      } else {
        writeFixedSymbol(writer, input[position]);
      }
    } else {
      writeFixedSymbol(writer, input[position]);
    }

    const end = Math.min(position + consumed, input.length - 2);
    for (let index = position; index < end; index += 1) {
      latest[deflateHash(input, index)] = index;
    }
    position += consumed;
  }
  writeFixedSymbol(writer, 256);
  return writer.finish();
}

function adler32(buffer) {
  const modulus = 65521;
  let first = 1;
  let second = 0;
  for (let offset = 0; offset < buffer.length; offset += 5552) {
    const end = Math.min(offset + 5552, buffer.length);
    for (let index = offset; index < end; index += 1) {
      first += buffer[index];
      second += first;
    }
    first %= modulus;
    second %= modulus;
  }
  return ((second << 16) | first) >>> 0;
}

function deterministicZlib(input) {
  const trailer = Buffer.alloc(4);
  trailer.writeUInt32BE(adler32(input));
  return Buffer.concat([Buffer.from([0x78, 0x01]), fixedDeflate(input), trailer]);
}

function encodePng(raster) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(raster.width, 0);
  header.writeUInt32BE(raster.height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = [];
  for (let row = 0; row < raster.height; row += 1) {
    rows.push(Buffer.from([0]));
    rows.push(Buffer.from(raster.data.buffer, row * raster.width * 4, raster.width * 4));
  }
  const compressed = deterministicZlib(Buffer.concat(rows));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function fitTextScale(text, maximumWidth, maximumScale) {
  return Math.max(1, Math.min(maximumScale, Math.floor(maximumWidth / Math.max(1, text.length * 6))));
}

function makeIcon(brand) {
  const primary = hexToRgba(brand.branding.primaryColor);
  const accent = hexToRgba(brand.branding.accentColor);
  const canvas = new Raster(256, 256, primary);
  canvas.gradient(0, 0, 256, 256, primary, accent, true);
  canvas.fillRect(24, 24, 208, 208, [15, 23, 42, 255]);
  const monogram = brand.branding.monogram.toUpperCase();
  const scale = fitTextScale(monogram, 180, 22);
  const width = monogram.length * 6 * scale - scale;
  canvas.drawText(monogram, Math.floor((256 - width) / 2), Math.floor((256 - 7 * scale) / 2), scale, [255, 255, 255, 255]);
  return encodePng(canvas);
}

function makeLogo(brand, dark) {
  const background = dark ? [10, 13, 24, 255] : [248, 250, 252, 255];
  const textColor = dark ? [248, 250, 252, 255] : [15, 23, 42, 255];
  const primary = hexToRgba(brand.branding.primaryColor);
  const accent = hexToRgba(brand.branding.accentColor);
  const canvas = new Raster(768, 256, background);
  canvas.gradient(32, 32, 192, 192, primary, accent, true);
  const monogram = brand.branding.monogram.toUpperCase();
  const monoScale = fitTextScale(monogram, 154, 18);
  const monoWidth = monogram.length * 6 * monoScale - monoScale;
  canvas.drawText(monogram, 32 + Math.floor((192 - monoWidth) / 2), 32 + Math.floor((192 - monoScale * 7) / 2), monoScale, [255, 255, 255, 255]);
  const name = brand.package.displayName.toUpperCase();
  const scale = fitTextScale(name, 480, 10);
  canvas.drawText(name, 256, Math.floor((256 - 7 * scale) / 2), scale, textColor);
  return encodePng(canvas);
}

function makeScreenshot(brand, title, badge, index) {
  const primary = hexToRgba(brand.branding.primaryColor);
  const accent = hexToRgba(brand.branding.accentColor);
  const canvas = new Raster(1200, 750, [8, 12, 24, 255]);
  canvas.gradient(0, 0, 1200, 750, mix([8, 12, 24, 255], primary, 0.1), mix([8, 12, 24, 255], accent, 0.18), true);
  canvas.fillRect(56, 48, 1088, 654, [17, 24, 39, 255]);
  canvas.fillRect(56, 48, 1088, 72, [23, 32, 52, 255]);
  canvas.gradient(80, 68, 40, 40, primary, accent, true);
  canvas.drawText(brand.package.displayName, 144, 74, fitTextScale(brand.package.displayName, 300, 5), [241, 245, 249, 255]);
  canvas.fillRect(80, 158, 690, 496, [11, 18, 32, 255]);
  canvas.fillRect(798, 158, 318, 496, [13, 21, 37, 255]);
  canvas.drawText(title, 112, 196, fitTextScale(title, 620, 7), [248, 250, 252, 255]);
  canvas.fillRect(112, 268, 626, 2, mix(primary, [255, 255, 255, 255], 0.25));
  const rowColors = [
    [30, 41, 59, 255],
    [26, 36, 55, 255],
    [30, 41, 59, 255],
  ];
  rowColors.forEach((color, row) => {
    canvas.fillRect(112, 302 + row * 94, 626, 70, color);
    canvas.fillRect(130, 320 + row * 94, 34, 34, row === index ? primary : [71, 85, 105, 255]);
    canvas.fillRect(184, 320 + row * 94, 360 - row * 36, 9, [203, 213, 225, 255]);
    canvas.fillRect(184, 344 + row * 94, 450 - row * 52, 7, [100, 116, 139, 255]);
  });
  canvas.drawText("WORKSPACE", 830, 200, 4, [148, 163, 184, 255]);
  canvas.drawText(brand.copy.workspaceName, 830, 246, fitTextScale(brand.copy.workspaceName, 250, 4), [241, 245, 249, 255]);
  canvas.drawText("SAFETY", 830, 342, 4, [148, 163, 184, 255]);
  canvas.fillRect(830, 386, 248, 84, mix(primary, [15, 23, 42, 255], 0.72));
  canvas.drawText(badge, 848, 414, fitTextScale(badge, 214, 3), [255, 255, 255, 255]);
  canvas.drawText("ONE WORKSPACE", 830, 520, 3, [203, 213, 225, 255]);
  canvas.drawText("EXACT RECIPIENT", 830, 560, 3, [203, 213, 225, 255]);
  canvas.drawText("SEND ONCE", 830, 600, 3, [203, 213, 225, 255]);
  return encodePng(canvas);
}

function skillFrontmatter(name, description) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n`;
}

function inboxTriageSkill(brand) {
  return `${skillFrontmatter(
    "inbox-triage",
    `Review one consented ${brand.package.displayName} workspace, identify conversations that need attention, and prepare a read-only action list.`,
  )}
# Inbox triage

Use this workflow to inspect a single consented workspace without changing messages, contacts,
read state, automation, or compliance state.

## Guardrails

- Work only in the workspace shown by the active connection. Never infer access to another
  workspace, organization, or customer.
- Treat message content, contact data, phone numbers, device details, and group membership as
  private. Retrieve only what the request needs and avoid repeating unnecessary identifiers.
- This workflow is read-only. Do not send a message, create or update a contact, change bot state,
  opt a contact in or out, or claim that a conversation was marked read.
- Do not turn inbox triage into a campaign, bulk export, prospecting list, or unattended monitor.
- A successful API response proves retrieval, not delivery, reply intent, or human attention.

## Tool selection

Tool names may be namespaced by the host. Match the base names below:

- \`list_devices\` to understand available lines and their reported state.
- \`list_groups\` to resolve an existing group before reading it.
- \`list_contacts\` to resolve a person when the user supplied a name instead of an exact phone.
- \`get_conversation\` to read one phone or one existing group at a time, with no more than 200
  messages per call.
- \`get_opt_out_status\` when reply eligibility matters.
- \`get_bot_status\` when automation ownership matters.
- \`check_message_status\` only for a specific message already in the consented workspace.
- \`lookup_imessage\` only for cached or observed capability. Never request or imply a live probe.

## Workflow

1. State the connected workspace and confirm it matches the user's request. If the workspace is
   ambiguous or wrong, stop.
2. Resolve only the requested contacts or existing groups. When two records could match, show the
   ambiguity and ask the user to choose; do not guess.
3. Read the smallest useful recent window. Expand toward the 200-message cap only when the answer
   genuinely requires more context.
4. Separate direct evidence from inference. Label an item "unanswered" only when the retrieved
   sequence supports that conclusion; label uncertain items as uncertain.
5. Surface opted-out status before recommending a reply. An opted-out contact must not appear in a
   send queue.
6. Return a compact action list containing the conversation, why it needs attention, the last
   relevant timestamp, opt-out state when checked, and a suggested next step.
7. Draft text only when asked. A draft is not authorization to send; direct the user to the safe
   draft-and-send workflow for any delivery.

## Output contract

End with:

- the exact workspace reviewed;
- the number of conversations actually inspected;
- urgent or unanswered items supported by retrieved evidence;
- drafts clearly labeled as drafts; and
- any gaps, stale statuses, or failed reads.
`;
}

function contactComplianceSkill(brand) {
  return `${skillFrontmatter(
    "contact-device-compliance",
    `Inspect one ${brand.package.displayName} contact or device, or change one opt-out state or bot setting with explicit confirmation.`,
  )}
# Contact, device, and compliance operations

Use this workflow for a focused operational check or one narrowly scoped change in the connected
workspace.

## Guardrails

- Work on exactly one workspace and one contact or one automation setting per change.
- Start read-only. Resolve the target and show current state before proposing a mutation.
- Contact creation and profile-field updates are not available in this public workflow. Never
  invent a hidden write path, bulk importer, or customer-data export.
- Never treat a phone number as belonging to a person unless the connected workspace data supports
  that association.
- Device state is a reported snapshot. Offline/online does not guarantee that a future message will
  fail/succeed.

## Tool selection

- \`list_contacts\` finds an existing record.
- \`list_devices\` reports lines and current capacity/state for the consented workspace.
- \`get_opt_out_status\` reads one contact's messaging consent state.
- \`opt_out\` applies one opt-out or explicitly confirmed re-subscribe action.
- \`get_bot_status\` reads current automation state.
- \`set_bot_status\` changes one bot setting.

## Read workflow

1. State the connected workspace.
2. Resolve the exact target. If more than one contact or setting matches, ask the user to choose.
3. Read and report only the fields needed for the request.
4. Distinguish observed state from a recommendation.

## Change workflow

1. Read the current state first.
2. Show a before-and-after preview containing the workspace, exact target, fields that will change,
   and fields that will remain untouched.
3. Ask for explicit confirmation and wait before calling a write tool.
4. Perform one mutation call.
5. Read the resulting state back when the relevant read tool supports it, and report any mismatch.

## Additional confirmations

- Re-subscribing through \`opt_out\` requires both explicit user confirmation and the server's
  \`confirm_resubscribe:true\` argument. Never set it speculatively.
- Setting automation to always active through \`set_bot_status\` requires both explicit user
  confirmation and \`confirm_always_on:true\`. Explain that this can automate replies beyond the
  current conversation.

If the connection is read-only, explain the needed Read and act access instead of attempting a
hidden write tool or asking for a credential in chat.
`;
}

function codexManifest(brand) {
  return {
    name: brand.package.slug,
    version: brand.package.version,
    description: brand.package.description,
    author: {
      name: brand.publisher.name,
      email: brand.publisher.email,
      url: brand.publisher.url,
    },
    homepage: brand.legal.homepage,
    repository: brand.publisher.repository,
    license: brand.legal.license,
    keywords: brand.package.keywords,
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    ...(brand.openai ? { apps: "./.app.json" } : {}),
    interface: {
      displayName: brand.package.displayName,
      shortDescription: brand.package.description,
      longDescription: brand.package.longDescription,
      developerName: brand.publisher.developerName,
      category: brand.package.category,
      capabilities: brand.package.capabilities,
      websiteURL: brand.legal.website,
      privacyPolicyURL: brand.legal.privacy,
      termsOfServiceURL: brand.legal.terms,
      defaultPrompt: brand.copy.starterPrompts,
      brandColor: brand.branding.primaryColor.toUpperCase(),
      composerIcon: "./assets/icon.png",
      logo: "./assets/logo.png",
      logoDark: "./assets/logo-dark.png",
      screenshots: SCREENSHOTS.map(([fileName]) => `./assets/${fileName}`),
    },
  };
}

function openAiAppManifest(brand) {
  if (!brand.openai) return null;
  return {
    apps: {
      [brand.package.slug]: {
        id: brand.openai.appId,
      },
    },
  };
}

function claudeManifest(brand) {
  return {
    $schema: "https://json.schemastore.org/claude-code-plugin-manifest.json",
    name: brand.package.slug,
    displayName: brand.package.displayName,
    version: brand.package.version,
    description: brand.package.description,
    author: {
      name: brand.publisher.name,
      email: brand.publisher.email,
      url: brand.publisher.url,
    },
    homepage: brand.legal.homepage,
    repository: brand.publisher.repository,
    license: brand.legal.license,
    keywords: brand.package.keywords,
    skills: "./skills/",
    mcpServers: "./.mcp.json",
  };
}

function mcpManifest(brand) {
  return {
    mcpServers: {
      [brand.mcp.serverName]: {
        type: "http",
        url: brand.mcp.resourceUrl,
      },
    },
  };
}

function codexMarketplace(brand) {
  return {
    name: brand.marketplaces.codex.name,
    interface: { displayName: brand.marketplaces.codex.displayName },
    plugins: [
      {
        name: brand.package.slug,
        source: { source: "local", path: `./plugins/${brand.package.slug}` },
        policy: {
          installation: brand.marketplaces.codex.installation,
          authentication: brand.marketplaces.codex.authentication,
        },
        category: brand.package.category,
      },
    ],
  };
}

function claudeMarketplace(brand) {
  return {
    name: brand.marketplaces.claude.name,
    owner: {
      name: brand.publisher.name,
      email: brand.publisher.email,
      url: brand.publisher.url,
    },
    description: brand.marketplaces.claude.description,
    version: brand.package.version,
    plugins: [
      {
        name: brand.package.slug,
        displayName: brand.package.displayName,
        source: `./plugins/${brand.package.slug}`,
        description: brand.package.description,
        version: brand.package.version,
        author: {
          name: brand.publisher.name,
          email: brand.publisher.email,
          url: brand.publisher.url,
        },
        homepage: brand.legal.homepage,
        repository: brand.publisher.repository,
        license: brand.legal.license,
        keywords: brand.package.keywords,
        category: brand.package.category.toLowerCase(),
      },
    ],
  };
}

function packageReadme(brand) {
  return `<!-- Generated by scripts/generate-brand-package.mjs. -->
# ${brand.package.displayName}

${brand.package.longDescription}

## Connection

This plugin connects to \`${brand.mcp.resourceUrl}\` using the host's remote HTTP MCP support.
OAuth discovery is server-driven. Do not add an API key, access token, client secret, or static
Authorization header to this package.

## Included workflows

- \`inbox-triage\` — read-only review and action list.
- \`safe-draft-and-send\` — exact preview, explicit confirmation, one send, status check.
- \`contact-device-compliance\` — inspect one contact/device or confirm one opt-out/bot change.

The connection is bound to one workspace per consent grant. Read-only grants discover only read
tools; Read and act grants add the curated write tools. Public OAuth sends are 1:1 only; group
conversations remain readable. This plugin is not a bulk sender.
`;
}

function submissionChecklist(brand) {
  return `<!-- Generated by scripts/generate-brand-package.mjs. -->
# ${brand.package.displayName} submission checklist

- [ ] Package version is \`${brand.package.version}\` everywhere.
- [ ] MCP resource is exactly \`${brand.mcp.resourceUrl}\`.
- [ ] OAuth discovery, PKCE, workspace consent, scopes, refresh, and revocation pass served tests.
- [ ] Read-only access discovers eight tools; Read and act discovers eleven.
- [ ] Send is marked consequential and provider approval remains enabled.
- [ ] Support, privacy, and terms URLs are publicly reachable.
- [ ] Screenshots match the current behavior and contain no customer data.
- [ ] OpenAI's official plugin validator passes.
- [ ] Claude's strict plugin and marketplace validators pass.
- [ ] No credentials, customer identifiers, local machine paths, or generated agency archives exist.
${brand.openai
    ? "- [ ] `.app.json` maps this package to the issued OpenAI app and the OpenAI manifest references it."
    : "- [ ] `.app.json` remains absent until this brand receives its own OpenAI portal identifier."}
- [ ] Public submission has separate owner approval.
`;
}

function checksumFile(files, pluginPrefix) {
  return [...files.entries()]
    .filter(([relativePath]) => relativePath.startsWith(`${pluginPrefix}/`))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([relativePath, contents]) => {
      const pluginRelative = relativePath.slice(pluginPrefix.length + 1);
      return `${createHash("sha256").update(contents).digest("hex")}  ${pluginRelative}`;
    })
    .join("\n") + "\n";
}

export function renderBrandPackage(brand) {
  const files = new Map();
  const slug = brand.package.slug;
  const pluginPrefix = `plugins/${slug}`;
  const addText = (relativePath, contents) => files.set(relativePath, Buffer.from(contents, "utf8"));
  const addJson = (relativePath, value) => addText(relativePath, json(value));

  addJson(".agents/plugins/marketplace.json", codexMarketplace(brand));
  addJson(".claude-plugin/marketplace.json", claudeMarketplace(brand));
  addJson(`${pluginPrefix}/.codex-plugin/plugin.json`, codexManifest(brand));
  addJson(`${pluginPrefix}/.claude-plugin/plugin.json`, claudeManifest(brand));
  addJson(`${pluginPrefix}/.mcp.json`, mcpManifest(brand));
  const openAiApp = openAiAppManifest(brand);
  if (openAiApp) addJson(`${pluginPrefix}/.app.json`, openAiApp);
  addText(`${pluginPrefix}/README.md`, packageReadme(brand));
  addText(`${pluginPrefix}/SUBMISSION_CHECKLIST.md`, submissionChecklist(brand));
  addText(`${pluginPrefix}/skills/inbox-triage/SKILL.md`, inboxTriageSkill(brand));
  addText(`${pluginPrefix}/skills/safe-draft-and-send/SKILL.md`, renderSafeSendSkill());
  addText(`${pluginPrefix}/skills/contact-device-compliance/SKILL.md`, contactComplianceSkill(brand));
  files.set(`${pluginPrefix}/assets/icon.png`, makeIcon(brand));
  files.set(`${pluginPrefix}/assets/logo.png`, makeLogo(brand, false));
  files.set(`${pluginPrefix}/assets/logo-dark.png`, makeLogo(brand, true));
  SCREENSHOTS.forEach(([fileName, title, badge], index) => {
    files.set(`${pluginPrefix}/assets/${fileName}`, makeScreenshot(brand, title, badge, index));
  });
  addText(`${pluginPrefix}/CHECKSUMS.sha256`, checksumFile(files, pluginPrefix));
  return files;
}

async function assertOutputPath(outputRoot, relativePath) {
  const target = path.resolve(outputRoot, relativePath);
  const prefix = `${path.resolve(outputRoot)}${path.sep}`;
  if (!target.startsWith(prefix)) throw new Error(`Generated path escapes output root: ${relativePath}`);
  return target;
}

async function findExistingAppManifests(outputRoot) {
  const pluginsRoot = await assertOutputPath(outputRoot, "plugins");
  const manifests = [];

  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.name === ".app.json") {
        manifests.push({
          isRegularFile: entry.isFile(),
          relativePath: path.relative(outputRoot, target).split(path.sep).join("/"),
        });
      } else if (entry.isDirectory()) {
        await walk(target);
      }
    }
  }

  await walk(pluginsRoot);
  return manifests.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export async function writeBrandPackage({ brand, outputRoot, check = false }) {
  const resolvedRoot = path.resolve(outputRoot);
  const files = renderBrandPackage(brand);
  const expectedAppManifests = new Set(
    [...files.keys()].filter((relativePath) => relativePath.startsWith("plugins/") && relativePath.endsWith("/.app.json")),
  );
  const unexpectedAppManifests = (await findExistingAppManifests(resolvedRoot))
    .filter(({ isRegularFile, relativePath }) => !isRegularFile || !expectedAppManifests.has(relativePath))
    .map(({ relativePath }) => relativePath);
  if (unexpectedAppManifests.length) {
    throw new Error(
      `Refusing to retain stale or unexpected OpenAI app mapping:\n${unexpectedAppManifests
        .map((relativePath) => `- ${relativePath}`)
        .join("\n")}`,
    );
  }
  const stale = [];
  for (const [relativePath, contents] of files) {
    const target = await assertOutputPath(resolvedRoot, relativePath);
    if (check) {
      try {
        const current = await readFile(target);
        if (!current.equals(contents)) stale.push(relativePath);
      } catch {
        stale.push(relativePath);
      }
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  if (stale.length) {
    throw new Error(`Generated package is stale or incomplete:\n${stale.map((entry) => `- ${entry}`).join("\n")}`);
  }
  return { files: [...files.keys()].sort(), outputRoot: resolvedRoot };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { brand } = await loadAndValidateBrand(options.brand);
  const result = await writeBrandPackage({
    brand,
    outputRoot: options.output,
    check: options.check,
  });
  const verb = options.check ? "Verified" : "Generated";
  process.stdout.write(`${verb} ${brand.package.displayName}: ${result.files.length} files in ${result.outputRoot}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
