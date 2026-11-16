import { choice, fail, isBlank } from "../core/validate.js";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MAX_CHARS = 2000;
const MAX_ROWS = 200;

export const meta = {
  description: "Metni Unicode kod noktalarına ve UTF-8 baytlarına; onaltılık, ikilik, Base64 ve URL kodlamasına çevirin ya da Base64 ve onaltılık kodu metne çevirin; her karakter için ayrıntılı tabloyla birlikte.",
  keywords: ["kodlama", "UTF-8", "Unicode", "Base64", "onaltılık", "hex", "URL encoding", "percent encoding", "kod noktası", "ASCII", "encoding"],
  formulas: [
    { label: "Kod noktası ve UTF-8 baytları", tex: "U+0628 \\rightarrow \\text{D8 A8}" },
    { label: "Base64: her 3 bayt (24 bit), 6 bitlik 4 simgeye dönüşür", tex: "n = b_1 2^{16} + b_2 2^{8} + b_3,\\quad c_i = \\left\\lfloor \\frac{n}{2^{6(3-i)}} \\right\\rfloor \\bmod 64" }
  ],
  inputs: [
    { id: "mode", label: "İşlem", type: "select", default: "encode", options: [["encode", "Metni kodla"], ["b64decode", "Base64'ü metne çöz"], ["hexdecode", "Onaltılığı metne çöz"]] },
    { id: "text", label: "Metin veya kod", type: "textarea", default: "Hello", help: "Kodlama modunda metni girin. Çözme modlarında yalnızca kodu girin." }
  ],
  example: { values: { mode: "encode", text: "Hello" }, expect: ["SGVsbG8=", "48 65 6C 6C 6F"], note: "Örnek: Hello kelimesini Base64 ve onaltılığa kodlama." },
  invalid: { values: { mode: "b64decode", text: "SGVsbG8" } },
  related: ["number-bases", "binary-twos-complement"]
};

const hex = (x, w) => x.toString(16).toUpperCase().padStart(w, "0");

export function utf8Bytes(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) fail("Metin geçersiz bir Unicode karakteri içeriyor (tek başına yüzey/surrogate).", "text");
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
    fail("Geçersiz Base64 kodu: uzunluğu 4'ün katı olmalı ve yalnızca alfabe harfleri ile sonda '=' içermelidir.", "text");
  }
  const out = [];
  for (let i = 0; i < code.length; i += 4) {
    const chunk = code.slice(i, i + 4);
    const pad = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0;
    if (pad > 0 && i + 4 !== code.length) fail("'=' dolgusu yalnızca kodun sonunda olmalıdır.", "text");
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
    fail("Geçersiz onaltılık kod: 0-9 rakamları ve A-F harflerinden oluşan çiftler girin.", "text");
  }
  const out = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  return out;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    fail("Çözülen veri geçerli bir UTF-8 metin değil.", "text");
  }
}

function showChar(ch) {
  if (ch === " ") return "(boşluk)";
  if (ch === "\n") return "(yeni satır)";
  if (ch === "\t") return "(tab)";
  return ch;
}

function charBlocks(text) {
  const chars = Array.from(text);
  const rows = chars.slice(0, MAX_ROWS).map((ch) => {
    const bytes = utf8Bytes(ch);
    return [showChar(ch), `U+${hex(ch.codePointAt(0), 4)}`, bytes.map((b) => hex(b, 2)).join(" "), String(bytes.length)];
  });
  const blocks = [{ type: "table", caption: "Her karakterin kodlanması", head: ["Karakter", "Kod noktası", "UTF-8 baytları", "Bayt sayısı"], rows, ltr: true }];
  if (chars.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Tabloda yalnızca ilk ${MAX_ROWS} karakter gösterilir.` });
  return blocks;
}

function encodeMode(text) {
  const chars = Array.from(text);
  if (chars.length > MAX_CHARS) fail(`Metin ${MAX_CHARS} karakterden uzun.`, "text");
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
      { label: "Kod noktaları (Unicode)", value: codePoints },
      { label: "UTF-8 baytları (onaltılık)", value: hexStr },
      { label: "Base64", value: b64 },
      { label: "URL kodlaması (yüzde)", value: url },
      { label: "İkilik (UTF-8 baytları)", value: binary },
      { label: "Karakter ve bayt sayısı", value: `Karakterler: ${chars.length}, baytlar: ${bytes.length}` }
    ],
    steps: [
      "Her karakter önce Unicode kod noktasına çevrilir, sonra kendi UTF-8 baytları yazılır.",
      { text: "Metnin baytları onaltılık olarak:", tex: `\\text{${hexStr}}` },
      { text: "İlk 3 bayt 24 bit olarak yazılır, sonra her 6 bit Base64 alfabesinden bir simge olarak okunur:", tex: `\\text{${groups.join(" ")}} \\rightarrow \\text{${letters}}` },
      "Son grup bir veya iki bayt ise bitler sıfırla doldurulur ve fazla simgeler yerine '=' yazılır.",
      "URL kodlaması ayrılmamış karakterleri olduğu gibi bırakır, diğer baytları %XX biçimine çevirir."
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
      { label: "Çözülen metin", value: text },
      { label: "Kod baytları (onaltılık)", value: hexStr },
      { label: "Bayt / karakter sayısı", value: `${bytes.length} bayt / ${Array.from(text).length} karakter` }
    ],
    steps: [
      mode === "b64decode"
        ? "Base64'ün her 4 simgesi 3 bayta çözülür; '=' dolgusu bir veya iki bayt daha az olduğu anlamına gelir."
        : "Onaltılık her rakam çifti 0 ile 255 arasında tek bir bayta dönüşür.",
      "Baytlar katı UTF-8 metni olarak yorumlanır; geçersizse bozuk metin göstermek yerine giriş reddedilir."
    ],
    copy: `Metin: ${text}`,
    blocks: charBlocks(text)
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "İşlem", ["encode", "b64decode", "hexdecode"], "encode");
  if (isBlank(input.text)) fail("Metni veya kodu girin.", "text");
  const raw = String(input.text);
  if (mode === "encode") return encodeMode(raw);
  const code = raw.replace(/\s+/g, "");
  if (mode === "b64decode") return decodeMode(base64Decode(code), mode);
  return decodeMode(hexToBytes(code), mode);
}
