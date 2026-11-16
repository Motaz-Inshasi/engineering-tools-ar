import { choice, fail } from "../core/validate.js";

const TWO32 = 0x100000000;
const MAX_CHARS = 200000;

const frac32 = (x) => Math.floor((x - Math.floor(x)) * TWO32) >>> 0;

function firstPrimes(count) {
  const out = [];
  for (let x = 2; out.length < count; x++) {
    if (out.every((p) => x % p !== 0)) out.push(x);
  }
  return out;
}

const PRIMES = firstPrimes(64);
const SHA256_K = PRIMES.map((p) => frac32(Math.cbrt(p)));
const SHA256_H = PRIMES.slice(0, 8).map((p) => frac32(Math.sqrt(p)));
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * TWO32) >>> 0);
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;

function padMessage(bytes, bigEndian) {
  const total = Math.ceil((bytes.length + 9) / 64) * 64;
  const out = new Uint8Array(total);
  out.set(bytes);
  out[bytes.length] = 0x80;
  const bitLen = bytes.length * 8;
  const hi = Math.floor(bitLen / TWO32);
  const lo = bitLen % TWO32;
  const view = new DataView(out.buffer);
  if (bigEndian) {
    view.setUint32(total - 8, hi);
    view.setUint32(total - 4, lo);
  } else {
    view.setUint32(total - 8, lo, true);
    view.setUint32(total - 4, hi, true);
  }
  return out;
}

function hexWords(words, littleEndian) {
  const order = littleEndian ? [0, 8, 16, 24] : [24, 16, 8, 0];
  return words.map((w) => order.map((s) => ((w >>> s) & 0xff).toString(16).padStart(2, "0")).join("")).join("");
}

function md5(bytes) {
  const m = padMessage(bytes, false);
  const view = new DataView(m.buffer);
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let off = 0; off < m.length; off += 64) {
    const X = [];
    for (let i = 0; i < 16; i++) X.push(view.getUint32(off + i * 4, true));
    let A = h[0], B = h[1], C = h[2], D = h[3];
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + MD5_K[i] + X[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, MD5_S[i])) >>> 0;
    }
    h[0] = (h[0] + A) >>> 0;
    h[1] = (h[1] + B) >>> 0;
    h[2] = (h[2] + C) >>> 0;
    h[3] = (h[3] + D) >>> 0;
  }
  return hexWords(h, true);
}

function sha1(bytes) {
  const m = padMessage(bytes, true);
  const view = new DataView(m.buffer);
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const w = new Array(80);
  for (let off = 0; off < m.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
    for (let i = 0; i < 80; i++) {
      let f, k;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = t;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
  }
  return hexWords(h, false);
}

function sha256(bytes) {
  const m = padMessage(bytes, true);
  const view = new DataView(m.buffer);
  const h = SHA256_H.slice();
  const w = new Array(64);
  for (let off = 0; off < m.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    const add = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i] + add[i]) >>> 0;
  }
  return hexWords(h, false);
}

const ALGOS = [
  { id: "md5", label: "MD5", bits: 128, fn: md5 },
  { id: "sha1", label: "SHA-1", bits: 160, fn: sha1 },
  { id: "sha256", label: "SHA-256", bits: 256, fn: sha256 }
];

export const meta = {
  description: "UTF-8 متن کا MD5، SHA-1 اور SHA-256 ہیش نکالیں، بائٹس کی لمبائی، پیڈنگ کے بعد 512 بٹ بلاکس کی تعداد، مراحل اور سکیورٹی انتباہات کے ساتھ۔",
  keywords: ["ہیش", "MD5", "SHA-1", "SHA-256", "hash", "خلاصہ", "ہیشنگ", "digest", "checksum", "sha"],
  formulas: [
    { label: "پیغام کی پیڈنگ", tex: "\\ell + 1 + k \\equiv 448 \\pmod{512}" },
    { label: "پیڈنگ کے بعد بلاکس کی تعداد", tex: "N = \\left\\lceil \\frac{B + 9}{64} \\right\\rceil" }
  ],
  inputs: [
    { id: "text", label: "متن", type: "textarea", rows: 5, wide: true, default: "abc", help: "متن کا ہیش UTF-8 بائٹس کے طور پر حساب کیا جاتا ہے، جس میں خالی جگہیں اور نئی سطریں بھی شامل ہیں۔" },
    { id: "algo", label: "الگورتھم", type: "select", default: "all", options: [["all", "سب"], ["md5", "MD5"], ["sha1", "SHA-1"], ["sha256", "SHA-256"]] }
  ],
  example: { values: { text: "abc", algo: "all" }, expect: ["900150983cd24fb0d6963f7d28e17f72"], note: "مثال: متن abc کا ہیش۔" },
  invalid: { values: { text: "x".repeat(200001), algo: "all" } },
  related: ["color-converter", "text-encoding", "bitwise-calculator", "binary-twos-complement"]
};

export function solve(input) {
  const text = input.text === undefined || input.text === null ? "" : String(input.text);
  if (text.length > MAX_CHARS) fail("متن 200000 حروف سے زیادہ ہے۔", "text");
  const algo = choice(input, "algo", "الگورتھم", ["all", "md5", "sha1", "sha256"], "all");
  const bytes = new TextEncoder().encode(text);
  const n = bytes.length;
  const bitLen = n * 8;
  const blocks = Math.ceil((n + 9) / 64);
  const k = (((448 - (bitLen + 1)) % 512) + 512) % 512;
  const chosen = ALGOS.filter((a) => algo === "all" || a.id === algo);
  const digests = chosen.map((a) => ({ ...a, hex: a.fn(bytes) }));
  const results = [
    { label: "UTF-8 انکوڈنگ کے بعد متن کی لمبائی", value: `${n} بائٹ`, text: `${n} بائٹ` },
    { label: "پیڈنگ کے بعد بلاکس (512 بٹ) کی تعداد", value: `${blocks} بلاک` }
  ];
  for (const d of digests) {
    results.push({ label: `${d.label} (${d.bits} بٹ)`, value: d.hex, text: `${d.label}: ${d.hex}` });
  }
  const steps = [
    { text: "متن کو UTF-8 بائٹس میں تبدیل کیا جاتا ہے، اور اردو یا عربی کا حرف عموماً دو بائٹس لیتا ہے", tex: `B = ${n}\\ \\text{bytes},\\quad \\ell = 8B = ${bitLen}\\ \\text{bits}` },
    { text: "پیغام کی پیڈنگ: ہم بٹ 1 شامل کرتے ہیں، پھر صفر شامل کرتے ہیں یہاں تک کہ لمبائی 448 mod 512 ہو جائے، پھر اصل پیغام کی لمبائی 64 بٹ کی تعداد کے طور پر شامل کرتے ہیں", tex: `k = ${k}\\ \\text{bits},\\quad ${bitLen} + 1 + ${k} = ${bitLen + 1 + k} \\equiv 448 \\pmod{512}` },
    { text: "پیڈنگ کے بعد بلاکس کی تعداد N = ⌈(B + 9) / 64⌉", tex: `N = \\left\\lceil \\frac{${n} + 9}{64} \\right\\rceil = ${blocks}` },
    { text: "پیغام کو 512 بٹ کے بلاکس میں تقسیم کیا جاتا ہے، اور ہر بلاک کو کمپریشن فنکشن سے گزارا جاتا ہے: MD5 اور SHA-256 کے لیے 64 راؤنڈ، اور SHA-1 کے لیے 80 راؤنڈ" },
    { text: "ہیش کا سائز: MD5 = 128 بٹ، SHA-1 = 160 بٹ، SHA-256 = 256 بٹ، اور یہ ہیکساڈیسیمل نظام میں دکھایا جاتا ہے", tex: "128 / 4 = 32,\\quad 160 / 4 = 40,\\quad 256 / 4 = 64" }
  ];
  const blockList = [
    {
      type: "table",
      caption: "ہیکساڈیسیمل نظام میں خلاصے",
      head: ["الگورتھم", "خلاصے کی لمبائی", "خلاصہ (hex)"],
      rows: digests.map((d) => [d.label, `${d.bits} بٹ`, d.hex]),
      ltr: true
    },
    { type: "note", tone: "warn", text: "انتباہ: MD5 اور SHA-1 سکیورٹی کے اعتبار سے کمزور ہیں کیونکہ ان کے لیے ٹکراؤ ممکن ہے، اس لیے انہیں دستخط، سرٹیفکیٹ یا کسی بھی سکیورٹی تصدیق کے لیے استعمال نہ کریں۔" },
    { type: "note", text: "پاس ورڈ کو MD5 یا SHA-256 جیسے تیز ہیش سے محفوظ نہیں کیا جاتا، بلکہ bcrypt یا argon2 جیسے مخصوص الگورتھم کے ساتھ بے ترتیب salt کے ذریعے محفوظ کیا جاتا ہے۔" },
    { type: "note", text: "ہیش ایک طرفہ فنکشن ہے: اس سے اصل متن واپس حاصل نہیں کیا جا سکتا، اور یہ خفیہ کاری نہیں ہے اور نہ ہی کلید کے ذریعے ڈیٹا کی حفاظت کرتا ہے۔" }
  ];
  return {
    results,
    blocks: blockList,
    steps,
    copy: digests.map((d) => `${d.label}: ${d.hex}`).join(" | ")
  };
}
