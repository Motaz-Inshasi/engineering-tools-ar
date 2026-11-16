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
  description: "خلاصه هش MD5 و SHA-1 و SHA-256 را برای هر متن با رمزگذاری UTF-8 تولید کنید، همراه با نمایش طول به بایت، تعداد بلوک‌های 512 بیتی پس از پرکردن، مراحل محاسبه و هشدارهای امنیتی.",
  keywords: ["هش", "MD5", "SHA-1", "SHA-256", "hash", "خلاصه", "درهم‌سازی", "digest", "checksum", "sha"],
  formulas: [
    { label: "پرکردن پیام", tex: "\\ell + 1 + k \\equiv 448 \\pmod{512}" },
    { label: "تعداد بلوک‌ها پس از پرکردن", tex: "N = \\left\\lceil \\frac{B + 9}{64} \\right\\rceil" }
  ],
  inputs: [
    { id: "text", label: "متن", type: "textarea", rows: 5, wide: true, default: "abc", help: "هش برای بایت‌های UTF-8 متن همان‌طور که هست محاسبه می‌شود، از جمله فاصله‌ها و خط‌های جدید." },
    { id: "algo", label: "الگوریتم", type: "select", default: "all", options: [["all", "همه"], ["md5", "MD5"], ["sha1", "SHA-1"], ["sha256", "SHA-256"]] }
  ],
  example: { values: { text: "abc", algo: "all" }, expect: ["900150983cd24fb0d6963f7d28e17f72"], note: "مثال: هش متن abc." },
  invalid: { values: { text: "x".repeat(200001), algo: "all" } },
  related: ["color-converter", "text-encoding", "bitwise-calculator", "binary-twos-complement"]
};

export function solve(input) {
  const text = input.text === undefined || input.text === null ? "" : String(input.text);
  if (text.length > MAX_CHARS) fail("متن بیش از 200000 نویسه است.", "text");
  const algo = choice(input, "algo", "الگوریتم", ["all", "md5", "sha1", "sha256"], "all");
  const bytes = new TextEncoder().encode(text);
  const n = bytes.length;
  const bitLen = n * 8;
  const blocks = Math.ceil((n + 9) / 64);
  const k = (((448 - (bitLen + 1)) % 512) + 512) % 512;
  const chosen = ALGOS.filter((a) => algo === "all" || a.id === algo);
  const digests = chosen.map((a) => ({ ...a, hex: a.fn(bytes) }));
  const results = [
    { label: "طول متن پس از رمزگذاری UTF-8", value: `${n} بایت`, text: `${n} بایت` },
    { label: "تعداد بلوک‌ها (512 بیت) پس از پرکردن", value: `${blocks} بلوک` }
  ];
  for (const d of digests) {
    results.push({ label: `${d.label} (${d.bits} بیت)`, value: d.hex, text: `${d.label}: ${d.hex}` });
  }
  const steps = [
    { text: "متن به بایت‌های UTF-8 تبدیل می‌شود، و هر حرف فارسی یا عربی معمولاً دو بایت می‌گیرد", tex: `B = ${n}\\ \\text{bytes},\\quad \\ell = 8B = ${bitLen}\\ \\text{bits}` },
    { text: "پرکردن پیام: یک بیت 1 اضافه می‌کنیم و سپس صفر اضافه می‌کنیم تا طول به 448 mod 512 برسد، سپس طول اصلی پیام را به صورت عددی 64 بیتی اضافه می‌کنیم", tex: `k = ${k}\\ \\text{bits},\\quad ${bitLen} + 1 + ${k} = ${bitLen + 1 + k} \\equiv 448 \\pmod{512}` },
    { text: "تعداد بلوک‌ها پس از پرکردن N = ⌈(B + 9) / 64⌉", tex: `N = \\left\\lceil \\frac{${n} + 9}{64} \\right\\rceil = ${blocks}` },
    { text: "پیام را به بلوک‌های 512 بیتی تقسیم می‌کنیم و هر بلوک را با تابع فشرده‌سازی پردازش می‌کنیم: 64 دور برای MD5 و SHA-256، و 80 دور برای SHA-1" },
    { text: "اندازه خلاصه: MD5 = 128 بیت، SHA-1 = 160 بیت، SHA-256 = 256 بیت، و به صورت شانزده‌دهی نمایش داده می‌شود", tex: "128 / 4 = 32,\\quad 160 / 4 = 40,\\quad 256 / 4 = 64" }
  ];
  const blockList = [
    {
      type: "table",
      caption: "خلاصه‌ها به صورت شانزده‌دهی",
      head: ["الگوریتم", "طول خلاصه", "خلاصه (hex)"],
      rows: digests.map((d) => [d.label, `${d.bits} بیت`, d.hex]),
      ltr: true
    },
    { type: "note", tone: "warn", text: "هشدار: MD5 و SHA-1 از نظر امنیتی شکسته شده‌اند، زیرا می‌توان برای آن‌ها تصادم پیدا کرد؛ پس از آن‌ها برای امضا، گواهی یا هر بررسی امنیتی استفاده نکنید." },
    { type: "note", text: "گذرواژه‌ها را نمی‌توان فقط با یک هش سریع مانند MD5 یا SHA-256 ذخیره کرد، بلکه باید با الگوریتم‌های مخصوص مانند bcrypt یا argon2 همراه با نمک تصادفی ذخیره شوند." },
    { type: "note", text: "هش یک تابع یک‌طرفه است: نمی‌توان آن را برگرداند تا متن اصلی به دست آید، و رمزنگاری نیست و داده‌ها را با کلید محافظت نمی‌کند." }
  ];
  return {
    results,
    blocks: blockList,
    steps,
    copy: digests.map((d) => `${d.label}: ${d.hex}`).join(" | ")
  };
}
