import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const BIN_OPS = ["and", "or", "xor"];
const SHIFT_OPS = ["shl", "shr", "sar"];
const NAMES = { and: "AND", or: "OR", xor: "XOR", not: "NOT", shl: "SHL", shr: "SHR", sar: "SAR" };
const TEX_BIN = { and: "\\mathrm{AND}", or: "\\mathrm{OR}", xor: "\\mathrm{XOR}" };
const TEXTS = {
  and: "AND فقط وقتی ۱ می‌دهد که بیت A و بیت B هر دو ۱ باشند، و در سایر حالت‌ها ۰ می‌دهد.",
  or: "OR وقتی ۱ می‌دهد که یکی از دو بیت یا هر دو ۱ باشند، و فقط وقتی ۰ می‌دهد که هر دو بیت ۰ باشند.",
  xor: "XOR وقتی ۱ می‌دهد که دو بیت با هم متفاوت باشند، و وقتی ۰ می‌دهد که برابر باشند.",
  not: "NOT هر بیت را معکوس می‌کند: ۰ به ۱ و ۱ به ۰ تبدیل می‌شود.",
  shl: "SHL بیت‌ها را به سمت چپ جابه‌جا می‌کند؛ بیت‌های خارج‌شده از سمت بالا از بین می‌روند و سمت راست با ۰ پر می‌شود.",
  shr: "SHR (منطقی) بیت‌ها را به سمت راست جابه‌جا می‌کند و سمت چپ همیشه با ۰ پر می‌شود.",
  sar: "SAR (حسابی) بیت‌ها را به سمت راست جابه‌جا می‌کند و بیت علامت را حفظ می‌کند، پس سمت چپ با کپی از آن پر می‌شود."
};

export const meta = {
  description: "عملیات AND وOR وXOR وNOT و جابه‌جایی‌های SHL وSHR وSAR را روی اعداد با عرض 8 یا 16 یا 32 بیت محاسبه کنید، با نتیجه به صورت دودویی و شانزده‌دهی و دهدهی با علامت و بدون علامت، و گام‌هایی که قاعده هر عملیات را توضیح می‌دهد.",
  keywords: ["عملیات بیت‌ها", "bitwise", "AND", "OR", "XOR", "NOT", "جابه‌جایی", "shift", "مکمل 2", "two's complement", "SAR", "SHR"],
  formulas: [
    { label: "عملیات منطقی", tex: "A \\land B,\\quad A \\lor B,\\quad A \\oplus B,\\quad \\lnot A" },
    { label: "جابه‌جایی به چپ به تعداد s", tex: "A \\ll s = (A \\cdot 2^{s}) \\bmod 2^{w}" }
  ],
  inputs: [
    { id: "a", label: "مقدار A", type: "text", default: "12", help: "به صورت دهدهی مانند -5، یا شانزده‌دهی با پیشوند 0x مانند 0x0A، یا دودویی با پیشوند 0b مانند 0b1010." },
    { id: "op", label: "عملیات", type: "select", default: "and", options: [["and", "AND (و)"], ["or", "OR (یا)"], ["xor", "XOR (یا انحصاری)"], ["not", "NOT (نقیض)"], ["shl", "SHL (جابه‌جایی به چپ)"], ["shr", "SHR (جابه‌جایی به راست منطقی)"], ["sar", "SAR (جابه‌جایی به راست حسابی)"]] },
    { id: "b", label: "مقدار B", type: "text", default: "10", when: { op: ["and", "or", "xor"] } },
    { id: "shift", label: "تعداد گام‌های جابه‌جایی", type: "number", default: "3", help: "بین 0 و عرض بیت‌ها منهای 1.", when: { op: ["shl", "shr", "sar"] } },
    { id: "width", label: "عرض بیت‌ها", type: "select", default: "8", options: [["8", "8 بیت"], ["16", "16 بیت"], ["32", "32 بیت"]] }
  ],
  example: { values: { a: "12", op: "and", b: "10", shift: "3", width: "8" }, expect: ["0000 1000 (0x08 = 8)"], note: "مثال: 12 AND 10 با عرض 8 بیت." },
  invalid: { values: { a: "300", op: "and", b: "1", shift: "0", width: "8" } },
  related: ["number-bases", "binary-twos-complement", "logic-gates", "truth-table", "chmod-calculator", "unix-timestamp"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

function parseOperand(raw, label, field, w) {
  const s = normalizeDigits(String(raw)).replace(/[\s_]/g, "");
  const m = s.match(/^([+-]?)(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)$/);
  if (!m) fail(`${label} یک عدد صحیح معتبر نیست. آن را دهدهی (مانند -5) یا با پیشوند 0x (مانند 0x0A) یا با پیشوند 0b (مانند 0b1010) بنویسید.`, field);
  let v = BigInt(m[2].toLowerCase());
  if (m[1] === "-") v = -v;
  const full = 1n << BigInt(w);
  const half = full >> 1n;
  if (v >= 0n && v < full) return { v, raw: v };
  if (v < 0n && v >= -half) return { v, raw: v + full };
  fail(`${label} خارج از محدوده ${w} بیتی است و محدوده مجاز از ${-half} تا ${full - 1n} است.`, field);
}

function bitsOf(raw, w) {
  return raw.toString(2).padStart(w, "0");
}

function grouped(raw, w) {
  return bitsOf(raw, w).match(/.{4}/g).join(" ");
}

function hexOf(raw, w) {
  return "0x" + raw.toString(16).toUpperCase().padStart(w / 4, "0");
}

function signedOf(raw, w) {
  const full = 1n << BigInt(w);
  return raw >= full >> 1n ? raw - full : raw;
}

function compute(op, ra, rb, sh, w) {
  const mask = (1n << BigInt(w)) - 1n;
  switch (op) {
    case "and": return ra & rb;
    case "or": return ra | rb;
    case "xor": return ra ^ rb;
    case "not": return ~ra & mask;
    case "shl": return (ra << BigInt(sh)) & mask;
    case "shr": return ra >> BigInt(sh);
    default: return BigInt.asUintN(w, signedOf(ra, w) >> BigInt(sh));
  }
}

function expr(op, sh) {
  if (op === "not") return "\\mathrm{NOT}\\ A";
  if (op === "shl") return `A \\ll ${sh}`;
  if (op === "shr") return `A \\gg ${sh}`;
  if (op === "sar") return `A \\gg_{\\mathrm{arith}} ${sh}`;
  return `A\\ ${TEX_BIN[op]}\\ B`;
}

function bitAlignment(named, w) {
  const cell = (c) => String(c).padStart(2);
  const head = Array.from({ length: w }, (_, i) => cell(w - 1 - i)).join(" ");
  const lines = [`${"bit".padEnd(5)}${head}`];
  for (const [name, raw] of named) {
    lines.push(`${name.padEnd(5)}${bitsOf(raw, w).split("").map(cell).join(" ")}`);
  }
  return lines.join("\n");
}

export function solve(input) {
  const op = choice(input, "op", "عملیات", ["and", "or", "xor", "not", "shl", "shr", "sar"], "and");
  const w = Number(choice(input, "width", "عرض بیت‌ها", ["8", "16", "32"], "8"));
  if (isBlank(input.a)) fail("مقدار A را وارد کنید.", "a");
  const va = parseOperand(input.a, "مقدار A", "a", w);
  const isBin = BIN_OPS.includes(op);
  const isShift = SHIFT_OPS.includes(op);
  let vb = null;
  if (isBin) {
    if (isBlank(input.b)) fail("مقدار B را وارد کنید.", "b");
    vb = parseOperand(input.b, "مقدار B", "b", w);
  }
  let sh = null;
  if (isShift) sh = num(input, "shift", "تعداد گام‌های جابه‌جایی", { integer: true, min: 0, max: w - 1 });
  const ra = va.raw;
  const rb = vb ? vb.raw : null;
  const rr = compute(op, ra, rb, sh, w);
  const bin = grouped(rr, w);
  const hx = hexOf(rr, w);
  const un = rr.toString();
  const sg = signedOf(rr, w).toString();
  const rowOf = (name, raw) => [name, grouped(raw, w), hexOf(raw, w), raw.toString(), signedOf(raw, w).toString()];
  const rows = [rowOf("A", ra)];
  if (vb) rows.push(rowOf("B", rb));
  rows.push(rowOf("نتیجه", rr));
  const named = [["A", ra]];
  if (vb) named.push(["B", rb]);
  named.push([NAMES[op], rr]);
  const steps = [TEXTS[op]];
  steps.push({ text: "تبدیل A به الگوی بیتی با طول عرض انتخاب‌شده:", tex: `A = ${va.v} \\Rightarrow \\text{${grouped(ra, w)}}_{2}` });
  if (vb) steps.push({ text: "تبدیل B به الگوی بیتی با طول عرض انتخاب‌شده:", tex: `B = ${vb.v} \\Rightarrow \\text{${grouped(rb, w)}}_{2}` });
  if (isShift) steps.push({ text: "تعداد گام‌های جابه‌جایی:", tex: `s = ${sh}` });
  steps.push({ text: "اعمال عملیات بیت به بیت:", tex: `${expr(op, sh)} = \\text{${bin}}_{2}` });
  steps.push({ text: "مقدار دهدهی بدون علامت:", tex: `\\text{${bin}}_{2} = \\text{${hx}} = ${un}` });
  steps.push(
    (rr >> BigInt(w - 1)) === 1n
      ? `بیت بالاترین رقم نتیجه برابر ۱ است، پس با علامت مکمل 2 به مقدار ${sg} تفسیر می‌شود.`
      : `بیت بالاترین رقم نتیجه برابر ۰ است، پس مقدار با علامت مکمل 2 همان ${sg} است.`
  );
  const blocks = [
    { type: "table", caption: "جدول بیت‌ها", head: ["متغیر", "دودویی", "شانزده‌دهی", "بدون علامت", "با علامت (مکمل 2)"], rows, ltr: true },
    { type: "html", html: `<pre class="code" dir="ltr"><code>${escapeHtml(bitAlignment(named, w))}</code></pre>` }
  ];
  if (op === "shl" && (ra << BigInt(sh)) > (1n << BigInt(w)) - 1n) {
    blocks.push({ type: "note", text: "برخی بیت‌ها از سمت بالای عدد از بین رفتند، زیرا جابه‌جایی از حدود عرض انتخاب‌شده فراتر رفت.", tone: "warn" });
  }
  const lhs = isBin ? `${va.v} ${NAMES[op]} ${vb.v}` : op === "not" ? `NOT ${va.v}` : `${va.v} ${NAMES[op]} ${sh}`;
  return {
    results: [
      { label: "نتیجه به صورت دودویی", value: bin },
      { label: "نتیجه به صورت شانزده‌دهی", value: hx },
      { label: "نتیجه بدون علامت", value: un },
      { label: "نتیجه با علامت (مکمل 2)", value: sg }
    ],
    steps,
    blocks,
    copy: `${lhs} = ${bin} (${hx} = ${un})`
  };
}
