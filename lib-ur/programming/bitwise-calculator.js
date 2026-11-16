import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const BIN_OPS = ["and", "or", "xor"];
const SHIFT_OPS = ["shl", "shr", "sar"];
const NAMES = { and: "AND", or: "OR", xor: "XOR", not: "NOT", shl: "SHL", shr: "SHR", sar: "SAR" };
const TEX_BIN = { and: "\\mathrm{AND}", or: "\\mathrm{OR}", xor: "\\mathrm{XOR}" };
const TEXTS = {
  and: "AND صرف اس وقت 1 دیتا ہے جب A اور B دونوں کا بٹ 1 ہو، باقی تمام صورتوں میں 0 دیتا ہے۔",
  or: "OR اس وقت 1 دیتا ہے جب دونوں میں سے کوئی ایک بٹ یا دونوں 1 ہوں، اور صرف اس وقت 0 دیتا ہے جب دونوں بٹس 0 ہوں۔",
  xor: "XOR اس وقت 1 دیتا ہے جب دونوں بٹس مختلف ہوں، اور برابر ہونے پر 0 دیتا ہے۔",
  not: "NOT ہر بٹ کو الٹ دیتا ہے: صفر 1 بن جاتا ہے اور ایک 0 بن جاتا ہے۔",
  shl: "SHL بٹس کو بائیں طرف کھسکاتا ہے، اوپر سے باہر نکلنے والے بٹس ضائع ہو جاتے ہیں، اور دائیں سرے کو صفروں سے بھرا جاتا ہے۔",
  shr: "SHR (منطقی) بٹس کو دائیں طرف کھسکاتا ہے، اور بائیں سرے کو ہمیشہ صفروں سے بھرا جاتا ہے۔",
  sar: "SAR (حسابی) بٹس کو دائیں طرف کھسکاتا ہے مگر علامت کے بٹ کو محفوظ رکھتا ہے، اس لیے بائیں سرے کو اسی بٹ کی نقل سے بھرا جاتا ہے۔"
};

export const meta = {
  description: "8، 16 یا 32 بٹ کے اعداد پر AND، OR، XOR، NOT اور SHL، SHR، SAR کی کارروائیوں کا حساب کریں، نتیجہ بائنری، ہیکساڈیسیمل، اور دستخط شدہ و غیر دستخط شدہ اعشاری شکل میں دیکھیں، اور ہر کارروائی کے اصول کی وضاحت کرنے والے مراحل کے ساتھ۔",
  keywords: ["بٹ آپریشنز", "bitwise", "AND", "OR", "XOR", "NOT", "شفٹ", "shift", "ٹو کمپلیمنٹ", "two's complement", "SAR", "SHR"],
  formulas: [
    { label: "منطقی کارروائیاں", tex: "A \\land B,\\quad A \\lor B,\\quad A \\oplus B,\\quad \\lnot A" },
    { label: "بائیں شفٹ بعدد s", tex: "A \\ll s = (A \\cdot 2^{s}) \\bmod 2^{w}" }
  ],
  inputs: [
    { id: "a", label: "قدر A", type: "text", default: "12", help: "اعشاری شکل میں جیسے -5، یا 0x سابقے کے ساتھ ہیکساڈیسیمل جیسے 0x0A، یا 0b سابقے کے ساتھ بائنری جیسے 0b1010۔" },
    { id: "op", label: "کارروائی", type: "select", default: "and", options: [["and", "AND (اور)"], ["or", "OR (یا)"], ["xor", "XOR (خصوصی یا)"], ["not", "NOT (نفی)"], ["shl", "SHL (بائیں شفٹ)"], ["shr", "SHR (دائیں شفٹ منطقی)"], ["sar", "SAR (دائیں شفٹ حسابی)"]] },
    { id: "b", label: "قدر B", type: "text", default: "10", when: { op: ["and", "or", "xor"] } },
    { id: "shift", label: "شفٹ کے مواضع کی تعداد", type: "number", default: "3", help: "0 اور بٹس کی چوڑائی منہا 1 کے درمیان۔", when: { op: ["shl", "shr", "sar"] } },
    { id: "width", label: "بٹس کی چوڑائی", type: "select", default: "8", options: [["8", "8 بٹ"], ["16", "16 بٹ"], ["32", "32 بٹ"]] }
  ],
  example: { values: { a: "12", op: "and", b: "10", shift: "3", width: "8" }, expect: ["0000 1000 (0x08 = 8)"], note: "مثال: 8 بٹ چوڑائی پر 12 AND 10۔" },
  invalid: { values: { a: "300", op: "and", b: "1", shift: "0", width: "8" } },
  related: ["number-bases", "binary-twos-complement", "logic-gates", "truth-table", "chmod-calculator", "unix-timestamp"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

function parseOperand(raw, label, field, w) {
  const s = normalizeDigits(String(raw)).replace(/[\s_]/g, "");
  const m = s.match(/^([+-]?)(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)$/);
  if (!m) fail(`${label} درست پورا عدد نہیں ہے۔ اعشاری لکھیں (مثلاً -5) یا 0x سابقے کے ساتھ (مثلاً 0x0A) یا 0b سابقے کے ساتھ (مثلاً 0b1010)۔`, field);
  let v = BigInt(m[2].toLowerCase());
  if (m[1] === "-") v = -v;
  const full = 1n << BigInt(w);
  const half = full >> 1n;
  if (v >= 0n && v < full) return { v, raw: v };
  if (v < 0n && v >= -half) return { v, raw: v + full };
  fail(`${label} ${w} بٹ کی حد سے باہر ہے، اور اجازت ${-half} سے ${full - 1n} تک ہے۔`, field);
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
  const op = choice(input, "op", "کارروائی", ["and", "or", "xor", "not", "shl", "shr", "sar"], "and");
  const w = Number(choice(input, "width", "بٹس کی چوڑائی", ["8", "16", "32"], "8"));
  if (isBlank(input.a)) fail("قدر A درج کریں۔", "a");
  const va = parseOperand(input.a, "قدر A", "a", w);
  const isBin = BIN_OPS.includes(op);
  const isShift = SHIFT_OPS.includes(op);
  let vb = null;
  if (isBin) {
    if (isBlank(input.b)) fail("قدر B درج کریں۔", "b");
    vb = parseOperand(input.b, "قدر B", "b", w);
  }
  let sh = null;
  if (isShift) sh = num(input, "shift", "شفٹ کے مواضع کی تعداد", { integer: true, min: 0, max: w - 1 });
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
  rows.push(rowOf("نتیجہ", rr));
  const named = [["A", ra]];
  if (vb) named.push(["B", rb]);
  named.push([NAMES[op], rr]);
  const steps = [TEXTS[op]];
  steps.push({ text: "A کو منتخب چوڑائی کے برابر بٹ پیٹرن میں تبدیل کریں:", tex: `A = ${va.v} \\Rightarrow \\text{${grouped(ra, w)}}_{2}` });
  if (vb) steps.push({ text: "B کو منتخب چوڑائی کے برابر بٹ پیٹرن میں تبدیل کریں:", tex: `B = ${vb.v} \\Rightarrow \\text{${grouped(rb, w)}}_{2}` });
  if (isShift) steps.push({ text: "شفٹ کے مواضع کی تعداد:", tex: `s = ${sh}` });
  steps.push({ text: "کارروائی کو بٹ بہ بٹ لاگو کریں:", tex: `${expr(op, sh)} = \\text{${bin}}_{2}` });
  steps.push({ text: "بغیر دستخط کی اعشاری قدر:", tex: `\\text{${bin}}_{2} = \\text{${hx}} = ${un}` });
  steps.push(
    (rr >> BigInt(w - 1)) === 1n
      ? `نتیجے کا سب سے اوپر والا بٹ 1 ہے، اس لیے اسے ٹو کمپلیمنٹ کے دستخط کے ساتھ قدر ${sg} کے طور پر پڑھا جاتا ہے۔`
      : `نتیجے کا سب سے اوپر والا بٹ 0 ہے، اس لیے ٹو کمپلیمنٹ کے دستخط کے ساتھ قدر خود ${sg} ہی رہتی ہے۔`
  );
  const blocks = [
    { type: "table", caption: "بٹس کا جدول", head: ["متغیر", "بائنری", "ہیکساڈیسیمل", "بغیر دستخط", "دستخط شدہ (ٹو کمپلیمنٹ)"], rows, ltr: true },
    { type: "html", html: `<pre class="code" dir="ltr"><code>${escapeHtml(bitAlignment(named, w))}</code></pre>` }
  ];
  if (op === "shl" && (ra << BigInt(sh)) > (1n << BigInt(w)) - 1n) {
    blocks.push({ type: "note", text: "شفٹ منتخب چوڑائی کی حدود سے آگے گئی، اس لیے عدد کے اوپر سے کچھ بٹس ضائع ہو گئے۔", tone: "warn" });
  }
  const lhs = isBin ? `${va.v} ${NAMES[op]} ${vb.v}` : op === "not" ? `NOT ${va.v}` : `${va.v} ${NAMES[op]} ${sh}`;
  return {
    results: [
      { label: "نتیجہ بائنری میں", value: bin },
      { label: "نتیجہ ہیکساڈیسیمل میں", value: hx },
      { label: "نتیجہ بغیر دستخط", value: un },
      { label: "نتیجہ دستخط شدہ (ٹو کمپلیمنٹ)", value: sg }
    ],
    steps,
    blocks,
    copy: `${lhs} = ${bin} (${hx} = ${un})`
  };
}
