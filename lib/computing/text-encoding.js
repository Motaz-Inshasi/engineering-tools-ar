import { choice, fail, isBlank } from "../core/validate.js";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MAX_CHARS = 2000;
const MAX_ROWS = 200;

export const meta = {
  description: "حوّل النص إلى نقاط ترميز Unicode وبايتات UTF-8 بالست عشري والثنائي وBase64 وترميز URL، أو فك شيفرة Base64 والست عشري إلى نص، مع جدول تفصيلي لكل حرف.",
  keywords: ["ترميز", "UTF-8", "Unicode", "Base64", "ست عشري", "hex", "URL encoding", "percent encoding", "نقطة ترميز", "ASCII", "encoding"],
  formulas: [
    { label: "نقطة الترميز وبايتات UTF-8", tex: "U+0628 \\rightarrow \\text{D8 A8}" },
    { label: "Base64: كل 3 بايتات (24 بت) تصبح 4 رموز من 6 بتات", tex: "n = b_1 2^{16} + b_2 2^{8} + b_3,\\quad c_i = \\left\\lfloor \\frac{n}{2^{6(3-i)}} \\right\\rfloor \\bmod 64" }
  ],
  inputs: [
    { id: "mode", label: "العملية", type: "select", default: "encode", options: [["encode", "ترميز النص"], ["b64decode", "فك Base64 إلى نص"], ["hexdecode", "فك الست عشري إلى نص"]] },
    { id: "text", label: "النص أو الشيفرة", type: "textarea", default: "Hello", help: "في وضع الترميز أدخل النص. في أوضاع الفك أدخل الشيفرة فقط." }
  ],
  example: { values: { mode: "encode", text: "Hello" }, expect: ["SGVsbG8=", "48 65 6C 6C 6F"], note: "مثال: ترميز الكلمة Hello إلى Base64 وست عشري." },
  invalid: { values: { mode: "b64decode", text: "SGVsbG8" } },
  related: ["number-bases", "binary-twos-complement"]
};

const hex = (x, w) => x.toString(16).toUpperCase().padStart(w, "0");

export function utf8Bytes(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) fail("النص يحتوي على رمز Unicode غير صالح (بديل منفرد).", "text");
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
    fail("شيفرة Base64 غير صالحة: طولها يجب أن يكون مضاعفاً للعدد 4، ولا تحتوي إلا على أحرف الأبجدية و'=' في آخرها.", "text");
  }
  const out = [];
  for (let i = 0; i < code.length; i += 4) {
    const chunk = code.slice(i, i + 4);
    const pad = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0;
    if (pad > 0 && i + 4 !== code.length) fail("حشو '=' يجب أن يكون في نهاية الشيفرة فقط.", "text");
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
    fail("الشيفرة الست عشرية غير صالحة: أدخل أزواجاً من الأرقام 0-9 والحروف A-F.", "text");
  }
  const out = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  return out;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    fail("البيانات المفكوكة ليست نص UTF-8 صالحاً.", "text");
  }
}

function showChar(ch) {
  if (ch === " ") return "(مسافة)";
  if (ch === "\n") return "(سطر جديد)";
  if (ch === "\t") return "(tab)";
  return ch;
}

function charBlocks(text) {
  const chars = Array.from(text);
  const rows = chars.slice(0, MAX_ROWS).map((ch) => {
    const bytes = utf8Bytes(ch);
    return [showChar(ch), `U+${hex(ch.codePointAt(0), 4)}`, bytes.map((b) => hex(b, 2)).join(" "), String(bytes.length)];
  });
  const blocks = [{ type: "table", caption: "ترميز كل حرف", head: ["الحرف", "نقطة الترميز", "بايتات UTF-8", "عدد البايتات"], rows, ltr: true }];
  if (chars.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `يُعرض أول ${MAX_ROWS} حرف فقط في الجدول.` });
  return blocks;
}

function encodeMode(text) {
  const chars = Array.from(text);
  if (chars.length > MAX_CHARS) fail(`النص أطول من ${MAX_CHARS} حرف.`, "text");
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
      { label: "نقاط الترميز (Unicode)", value: codePoints },
      { label: "بايتات UTF-8 (ست عشري)", value: hexStr },
      { label: "Base64", value: b64 },
      { label: "ترميز URL (النسبة المئوية)", value: url },
      { label: "ثنائي (بايتات UTF-8)", value: binary },
      { label: "عدد الأحرف والبايتات", value: `الأحرف: ${chars.length}، البايتات: ${bytes.length}` }
    ],
    steps: [
      "كل حرف يُحوَّل أولاً إلى نقطة ترميز Unicode، ثم تُكتب بايتات UTF-8 الخاصة به.",
      { text: "بايتات النص بالست عشري:", tex: `\\text{${hexStr}}` },
      { text: "أول 3 بايتات تُكتب كـ 24 بتاً، ثم تُقرأ كل 6 بتات رمزاً من أبجدية Base64:", tex: `\\text{${groups.join(" ")}} \\rightarrow \\text{${letters}}` },
      "إذا كانت المجموعة الأخيرة بايتاً أو بايتين، تُملأ البتات بأصفار ويُكتب '=' بدل الرموز الزائدة.",
      "ترميز URL يُبقي الأحرف غير المحجوزة كما هي ويحوّل بقية البايتات إلى %XX."
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
      { label: "النص المفكوك", value: text },
      { label: "بايتات الشيفرة (ست عشري)", value: hexStr },
      { label: "عدد البايتات / الأحرف", value: `${bytes.length} بايت / ${Array.from(text).length} حرف` }
    ],
    steps: [
      mode === "b64decode"
        ? "كل 4 رموز من Base64 تُفك إلى 3 بايتات، والحشو '=' يعني بايتاً أو بايتين أقل."
        : "كل زوج من الأرقام الست عشرية يُحوَّل إلى بايت واحد من 0 إلى 255.",
      "البايتات تُفسَّر كنص UTF-8 صارم، وإذا كانت غير صالحة يُرفض الإدخال بدل إظهار نص مشوّه."
    ],
    copy: `النص: ${text}`,
    blocks: charBlocks(text)
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "العملية", ["encode", "b64decode", "hexdecode"], "encode");
  if (isBlank(input.text)) fail("أدخل النص أو الشيفرة.", "text");
  const raw = String(input.text);
  if (mode === "encode") return encodeMode(raw);
  const code = raw.replace(/\s+/g, "");
  if (mode === "b64decode") return decodeMode(base64Decode(code), mode);
  return decodeMode(hexToBytes(code), mode);
}
