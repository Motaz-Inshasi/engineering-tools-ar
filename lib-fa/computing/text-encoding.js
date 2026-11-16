import { choice, fail, isBlank } from "../core/validate.js";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MAX_CHARS = 2000;
const MAX_ROWS = 200;

export const meta = {
  description: "تبدیل متن به نقاط کد یونیکد و بایت‌های UTF-8 به صورت شانزدهی و دودویی و Base64 و کدگذاری URL، یا رمزگشایی Base64 و شانزدهی به متن، همراه با جدول تفصیلی برای هر حرف.",
  keywords: ["کدگذاری", "UTF-8", "Unicode", "Base64", "شانزدهی", "hex", "URL encoding", "percent encoding", "نقطه کد", "ASCII", "encoding"],
  formulas: [
    { label: "نقطه کد و بایت‌های UTF-8", tex: "U+0628 \\rightarrow \\text{D8 A8}" },
    { label: "Base64: هر 3 بایت (24 بیت) می‌شوند 4 نماد با 6 بیت", tex: "n = b_1 2^{16} + b_2 2^{8} + b_3,\\quad c_i = \\left\\lfloor \\frac{n}{2^{6(3-i)}} \\right\\rfloor \\bmod 64" }
  ],
  inputs: [
    { id: "mode", label: "عملیات", type: "select", default: "encode", options: [["encode", "کدگذاری متن"], ["b64decode", "رمزگشایی Base64 به متن"], ["hexdecode", "رمزگشایی شانزدهی به متن"]] },
    { id: "text", label: "متن یا کد", type: "textarea", default: "Hello", help: "در حالت کدگذاری متن را وارد کنید. در حالت‌های رمزگشایی فقط کد را وارد کنید." }
  ],
  example: { values: { mode: "encode", text: "Hello" }, expect: ["SGVsbG8=", "48 65 6C 6C 6F"], note: "مثال: کدگذاری کلمه Hello به Base64 و شانزدهی." },
  invalid: { values: { mode: "b64decode", text: "SGVsbG8" } },
  related: ["number-bases", "binary-twos-complement"]
};

const hex = (x, w) => x.toString(16).toUpperCase().padStart(w, "0");

export function utf8Bytes(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xd800 && cp <= 0xdfff) fail("متن شامل یک نویسه یونیکد نامعتبر است (جانشین تنها).", "text");
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
    fail("کد Base64 نامعتبر است: طولش باید مضرب 4 باشد و فقط نویسه‌های الفبا و '=' در انتها داشته باشد.", "text");
  }
  const out = [];
  for (let i = 0; i < code.length; i += 4) {
    const chunk = code.slice(i, i + 4);
    const pad = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0;
    if (pad > 0 && i + 4 !== code.length) fail("حاشیه‌گذاری '=' فقط باید در انتهای کد باشد.", "text");
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
    fail("کد شانزدهی نامعتبر است: جفت‌هایی از ارقام 0-9 و حروف A-F وارد کنید.", "text");
  }
  const out = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  return out;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    fail("داده رمزگشایی‌شده متن UTF-8 معتبر نیست.", "text");
  }
}

function showChar(ch) {
  if (ch === " ") return "(فاصله)";
  if (ch === "\n") return "(خط جدید)";
  if (ch === "\t") return "(tab)";
  return ch;
}

function charBlocks(text) {
  const chars = Array.from(text);
  const rows = chars.slice(0, MAX_ROWS).map((ch) => {
    const bytes = utf8Bytes(ch);
    return [showChar(ch), `U+${hex(ch.codePointAt(0), 4)}`, bytes.map((b) => hex(b, 2)).join(" "), String(bytes.length)];
  });
  const blocks = [{ type: "table", caption: "کدگذاری هر حرف", head: ["حرف", "نقطه کد", "بایت‌های UTF-8", "تعداد بایت‌ها"], rows, ltr: true }];
  if (chars.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `فقط ${MAX_ROWS} حرف اول در جدول نمایش داده می‌شود.` });
  return blocks;
}

function encodeMode(text) {
  const chars = Array.from(text);
  if (chars.length > MAX_CHARS) fail(`متن بیش از ${MAX_CHARS} حرف است.`, "text");
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
      { label: "نقاط کد (یونیکد)", value: codePoints },
      { label: "بایت‌های UTF-8 (شانزدهی)", value: hexStr },
      { label: "Base64", value: b64 },
      { label: "کدگذاری URL (درصدی)", value: url },
      { label: "دودویی (بایت‌های UTF-8)", value: binary },
      { label: "تعداد نویسه‌ها و بایت‌ها", value: `حروف: ${chars.length}، بایت‌ها: ${bytes.length}` }
    ],
    steps: [
      "ابتدا هر حرف به یک نقطه کد یونیکد تبدیل می‌شود، سپس بایت‌های UTF-8 آن نوشته می‌شوند.",
      { text: "بایت‌های متن به صورت شانزدهی:", tex: `\\text{${hexStr}}` },
      { text: "3 بایت اول به صورت 24 بیت نوشته می‌شوند، سپس هر 6 بیت به عنوان یک نماد از الفبای Base64 خوانده می‌شود:", tex: `\\text{${groups.join(" ")}} \\rightarrow \\text{${letters}}` },
      "اگر گروه آخر یک یا دو بایت باشد، بیت‌ها با صفر پر می‌شوند و به جای نمادهای اضافی '=' نوشته می‌شود.",
      "کدگذاری URL نویسه‌های رزرو نشده را همان‌طور نگه می‌دارد و بقیه بایت‌ها را به %XX تبدیل می‌کند."
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
      { label: "متن رمزگشایی‌شده", value: text },
      { label: "بایت‌های کد (شانزدهی)", value: hexStr },
      { label: "تعداد بایت‌ها / نویسه‌ها", value: `${bytes.length} بایت / ${Array.from(text).length} حرف` }
    ],
    steps: [
      mode === "b64decode"
        ? "هر 4 نماد Base64 به 3 بایت رمزگشایی می‌شود، و حاشیه '=' یعنی یک یا دو بایت کمتر."
        : "هر جفت رقم شانزدهی به یک بایت از 0 تا 255 تبدیل می‌شود.",
      "بایت‌ها به صورت متن سخت‌گیرانه UTF-8 تفسیر می‌شوند؛ اگر نامعتبر باشند ورودی رد می‌شود، به‌جای نمایش متن خراب."
    ],
    copy: `متن: ${text}`,
    blocks: charBlocks(text)
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "عملیات", ["encode", "b64decode", "hexdecode"], "encode");
  if (isBlank(input.text)) fail("متن یا کد را وارد کنید.", "text");
  const raw = String(input.text);
  if (mode === "encode") return encodeMode(raw);
  const code = raw.replace(/\s+/g, "");
  if (mode === "b64decode") return decodeMode(base64Decode(code), mode);
  return decodeMode(hexToBytes(code), mode);
}
