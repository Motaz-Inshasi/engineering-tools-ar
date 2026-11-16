import { choice, fail, isBlank } from "../core/validate.js";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MAX_CHARS = 2000;
const MAX_ROWS = 200;

export const meta = {
  description: "Convert text to Unicode code points and UTF-8 bytes in hexadecimal and binary, Base64 and URL encoding, or decode Base64 and hexadecimal back to text, with a detailed table for each character.",
  keywords: ["encoding", "UTF-8", "Unicode", "Base64", "hexadecimal", "hex", "URL encoding", "percent encoding", "code point", "ASCII", "encoding"],
  formulas: [
    { label: "Code point and UTF-8 bytes", tex: "U+0628 \\rightarrow \\text{D8 A8}" },
    { label: "Base64: every 3 bytes (24 bits) become 4 symbols of 6 bits each", tex: "n = b_1 2^{16} + b_2 2^{8} + b_3,\\quad c_i = \\left\\lfloor \\frac{n}{2^{6(3-i)}} \\right\\rfloor \\bmod 64" }
  ],
  inputs: [
    { id: "mode", label: "Operation", type: "select", default: "encode", options: [["encode", "Encode text"], ["b64decode", "Decode Base64 to text"], ["hexdecode", "Decode hexadecimal to text"]] },
    { id: "text", label: "Text or code", type: "textarea", default: "Hello", help: "In encoding mode, enter the text. In decoding modes, enter the code only." }
  ],
  example: { values: { mode: "encode", text: "Hello" }, expect: ["SGVsbG8=", "48 65 6C 6C 6F"], note: "Example: encoding the word Hello to Base64 and hexadecimal." },
  invalid: { values: { mode: "b64decode", text: "SGVsbG8" } },
  related: ["number-bases", "binary-twos-complement"]
};

const hex = (x, w) => x.toString(16).toUpperCase().padStart(w, "0");

export function utf8Bytes(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) fail("The text contains an invalid Unicode character (a lone surrogate).", "text");
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}

export function base64Encode(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const rem = Math.min(3, bytes.length - i);
    const n = (bytes[i] << 16) | ((rem > 1 ? bytes[i + 1] : 0) << 8) | (rem > 2 ? bytes[i + 2] : 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (rem > 1 ? B64[(n >> 6) & 63] : "=") + (rem > 2 ? B64[n & 63] : "=");
  }
  return out;
}

export function base64Decode(code) {
  if (code === "" || code.length % 4 !== 0 || !/^[A-Za-z0-9+\/]*={0,2}$/.test(code)) {
    fail("Invalid Base64 code: its length must be a multiple of 4, and it may contain only alphabet characters and '=' at the end.", "text");
  }
  const out = [];
  for (let i = 0; i < code.length; i += 4) {
    const chunk = code.slice(i, i + 4);
    const pad = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0;
    if (pad > 0 && i + 4 !== code.length) fail("The '=' padding must appear only at the end of the code.", "text");
    let n = 0;
    for (let j = 0; j < 4; j++) n = (n << 6) | (j < 4 - pad ? B64.indexOf(chunk[j]) : 0);
    out.push((n >> 16) & 255);
    if (pad < 2) out.push((n >> 8) & 255);
    if (pad < 1) out.push(n & 255);
  }
  return out;
}

export function hexToBytes(code) {
  const t = code.replace(/0x/gi, "").replace(/,/g, "");
  if (t === "" || !/^[0-9A-Fa-f]+$/.test(t) || t.length % 2 !== 0) {
    fail("Invalid hexadecimal code: enter pairs of digits 0-9 and letters A-F.", "text");
  }
  const out = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  return out;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    fail("The decoded data is not valid UTF-8 text.", "text");
  }
}

function showChar(ch) {
  if (ch === " ") return "(space)";
  if (ch === "\n") return "(new line)";
  if (ch === "\t") return "(tab)";
  return ch;
}

function charBlocks(text) {
  const chars = Array.from(text);
  const rows = chars.slice(0, MAX_ROWS).map((ch) => {
    const bytes = utf8Bytes(ch);
    return [showChar(ch), `U+${hex(ch.codePointAt(0), 4)}`, bytes.map((b) => hex(b, 2)).join(" "), String(bytes.length)];
  });
  const blocks = [{ type: "table", caption: "Encoding of each character", head: ["Character", "Code point", "UTF-8 bytes", "Number of bytes"], rows, ltr: true }];
  if (chars.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Only the first ${MAX_ROWS} characters are shown in the table.` });
  return blocks;
}

function encodeMode(text) {
  const chars = Array.from(text);
  if (chars.length > MAX_CHARS) fail(`The text is longer than ${MAX_CHARS} characters.`, "text");
  const bytes = utf8Bytes(text);
  const codePoints = chars.map((ch) => `U+${hex(ch.codePointAt(0), 4)}`).join(" ");
  const hexStr = bytes.map((b) => hex(b, 2)).join(" ");
  const b64 = base64Encode(bytes);
  const url = encodeURIComponent(text);
  const binary = bytes.map((b) => b.toString(2).padStart(8, "0")).join(" ");
  const bits = bytes.slice(0, 3).map((b) => b.toString(2).padStart(8, "0")).join("").padEnd(24, "0");
  const groups = bits.match(/.{6}/g);
  const letters = groups.map((g) => B64[parseInt(g, 2)]).join(" ");
  return {
    results: [
      { label: "Code points (Unicode)", value: codePoints },
      { label: "UTF-8 bytes (hexadecimal)", value: hexStr },
      { label: "Base64", value: b64 },
      { label: "URL encoding (percent encoding)", value: url },
      { label: "Binary (UTF-8 bytes)", value: binary },
      { label: "Number of characters and bytes", value: `Characters: ${chars.length}, bytes: ${bytes.length}` }
    ],
    steps: [
      "Each character is first converted to a Unicode code point, then its UTF-8 bytes are written.",
      { text: "Text bytes in hexadecimal:", tex: `\\text{${hexStr}}` },
      { text: "The first 3 bytes are written as 24 bits, then every 6 bits are read as one symbol of the Base64 alphabet:", tex: `\\text{${groups.join(" ")}} \\rightarrow \\text{${letters}}` },
      "If the last group is one or two bytes, the bits are padded with zeros and '=' is written in place of the extra symbols.",
      "URL encoding keeps the unreserved characters as they are and converts the other bytes to %XX."
    ],
    copy: `Base64: ${b64} | HEX: ${hexStr}`,
    blocks: charBlocks(text)
  };
}

function decodeMode(bytes, mode) {
  const text = decodeUtf8(bytes);
  const hexStr = bytes.map((b) => hex(b, 2)).join(" ");
  return {
    results: [
      { label: "Decoded text", value: text },
      { label: "Code bytes (hexadecimal)", value: hexStr },
      { label: "Number of bytes / characters", value: `${bytes.length} bytes / ${Array.from(text).length} characters` }
    ],
    steps: [
      mode === "b64decode"
        ? "Every 4 Base64 symbols decode to 3 bytes, and the '=' padding means one or two bytes fewer."
        : "Every pair of hexadecimal digits is converted to one byte from 0 to 255.",
      "The bytes are interpreted as strict UTF-8 text; if they are invalid, the input is rejected instead of showing corrupted text."
    ],
    copy: `Text: ${text}`,
    blocks: charBlocks(text)
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Operation", ["encode", "b64decode", "hexdecode"], "encode");
  if (isBlank(input.text)) fail("Enter the text or the code.", "text");
  const raw = String(input.text);
  if (mode === "encode") return encodeMode(raw);
  const code = raw.replace(/\s+/g, "");
  if (mode === "b64decode") return decodeMode(base64Decode(code), mode);
  return decodeMode(hexToBytes(code), mode);
}
