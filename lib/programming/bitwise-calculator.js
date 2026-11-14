import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const BIN_OPS = ["and", "or", "xor"];
const SHIFT_OPS = ["shl", "shr", "sar"];
const NAMES = { and: "AND", or: "OR", xor: "XOR", not: "NOT", shl: "SHL", shr: "SHR", sar: "SAR" };
const TEX_BIN = { and: "\\mathrm{AND}", or: "\\mathrm{OR}", xor: "\\mathrm{XOR}" };
const TEXTS = {
  and: "AND يعطي 1 فقط إذا كان البت في A والبت في B كلاهما 1، وفي كل الحالات الأخرى يعطي 0.",
  or: "OR يعطي 1 إذا كان أحد البتين 1 أو كلاهما، ولا يعطي 0 إلا إذا كان البتان 0.",
  xor: "XOR يعطي 1 إذا كان البتان مختلفين، ويعطي 0 إذا تساويا.",
  not: "NOT يقلب كل بت: الصفر يصبح 1 والواحد يصبح 0.",
  shl: "SHL تزيح البتات نحو اليسار، فتضيع البتات الخارجة من أعلى، ويُملأ الطرف الأيمن بأصفار.",
  shr: "SHR (منطقية) تزيح البتات نحو اليمين، ويُملأ الطرف الأيسر بأصفار دائماً.",
  sar: "SAR (حسابية) تزيح البتات نحو اليمين مع الحفاظ على بت الإشارة، فيُملأ الطرف الأيسر بنسخ منه."
};

export const meta = {
  description: "احسب عمليات AND وOR وXOR وNOT والإزاحات SHL وSHR وSAR على أعداد بعرض 8 أو 16 أو 32 بت، مع النتيجة بالثنائي والسداسي عشري والعشري بإشارة وبدونها، وخطوات توضح قاعدة كل عملية.",
  keywords: ["عمليات البتات", "bitwise", "AND", "OR", "XOR", "NOT", "إزاحة", "shift", "متمم 2", "two's complement", "SAR", "SHR"],
  formulas: [
    { label: "العمليات المنطقية", tex: "A \\land B,\\quad A \\lor B,\\quad A \\oplus B,\\quad \\lnot A" },
    { label: "الإزاحة لليسار بعدد s", tex: "A \\ll s = (A \\cdot 2^{s}) \\bmod 2^{w}" }
  ],
  inputs: [
    { id: "a", label: "القيمة A", type: "text", default: "12", help: "عشرياً مثل -5، أو سداسياً عشرياً بالبادئة 0x مثل 0x0A، أو ثنائياً بالبادئة 0b مثل 0b1010." },
    { id: "op", label: "العملية", type: "select", default: "and", options: [["and", "AND (و)"], ["or", "OR (أو)"], ["xor", "XOR (أو الحصرية)"], ["not", "NOT (النفي)"], ["shl", "SHL (إزاحة لليسار)"], ["shr", "SHR (إزاحة لليمين منطقية)"], ["sar", "SAR (إزاحة لليمين حسابية)"]] },
    { id: "b", label: "القيمة B", type: "text", default: "10", when: { op: ["and", "or", "xor"] } },
    { id: "shift", label: "عدد مواضع الإزاحة", type: "number", default: "3", help: "بين 0 وعرض البتات مطروحاً منه 1.", when: { op: ["shl", "shr", "sar"] } },
    { id: "width", label: "عرض البتات", type: "select", default: "8", options: [["8", "8 بت"], ["16", "16 بت"], ["32", "32 بت"]] }
  ],
  example: { values: { a: "12", op: "and", b: "10", shift: "3", width: "8" }, expect: ["0000 1000 (0x08 = 8)"], note: "مثال: 12 AND 10 بعرض 8 بت." },
  invalid: { values: { a: "300", op: "and", b: "1", shift: "0", width: "8" } },
  related: ["number-bases", "binary-twos-complement", "logic-gates", "truth-table", "chmod-calculator", "unix-timestamp"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

function parseOperand(raw, label, field, w) {
  const s = normalizeDigits(String(raw)).replace(/[\s_]/g, "");
  const m = s.match(/^([+-]?)(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)$/);
  if (!m) fail(`${label} ليست عدداً صحيحاً صالحاً. اكتبها عشرياً (مثل -5) أو بالبادئة 0x (مثل 0x0A) أو بالبادئة 0b (مثل 0b1010).`, field);
  let v = BigInt(m[2].toLowerCase());
  if (m[1] === "-") v = -v;
  const full = 1n << BigInt(w);
  const half = full >> 1n;
  if (v >= 0n && v < full) return { v, raw: v };
  if (v < 0n && v >= -half) return { v, raw: v + full };
  fail(`${label} خارج نطاق ${w} بت، والمسموح من ${-half} إلى ${full - 1n}.`, field);
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
  const op = choice(input, "op", "العملية", ["and", "or", "xor", "not", "shl", "shr", "sar"], "and");
  const w = Number(choice(input, "width", "عرض البتات", ["8", "16", "32"], "8"));
  if (isBlank(input.a)) fail("أدخل القيمة A.", "a");
  const va = parseOperand(input.a, "القيمة A", "a", w);
  const isBin = BIN_OPS.includes(op);
  const isShift = SHIFT_OPS.includes(op);
  let vb = null;
  if (isBin) {
    if (isBlank(input.b)) fail("أدخل القيمة B.", "b");
    vb = parseOperand(input.b, "القيمة B", "b", w);
  }
  let sh = null;
  if (isShift) sh = num(input, "shift", "عدد مواضع الإزاحة", { integer: true, min: 0, max: w - 1 });
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
  rows.push(rowOf("النتيجة", rr));
  const named = [["A", ra]];
  if (vb) named.push(["B", rb]);
  named.push([NAMES[op], rr]);
  const steps = [TEXTS[op]];
  steps.push({ text: "تحويل A إلى نمط بتات بطول العرض المختار:", tex: `A = ${va.v} \\Rightarrow \\text{${grouped(ra, w)}}_{2}` });
  if (vb) steps.push({ text: "تحويل B إلى نمط بتات بطول العرض المختار:", tex: `B = ${vb.v} \\Rightarrow \\text{${grouped(rb, w)}}_{2}` });
  if (isShift) steps.push({ text: "عدد مواضع الإزاحة:", tex: `s = ${sh}` });
  steps.push({ text: "تطبيق العملية بتاً ببت:", tex: `${expr(op, sh)} = \\text{${bin}}_{2}` });
  steps.push({ text: "القيمة العشرية بدون إشارة:", tex: `\\text{${bin}}_{2} = \\text{${hx}} = ${un}` });
  steps.push(
    (rr >> BigInt(w - 1)) === 1n
      ? `أعلى بت في النتيجة = 1، لذا تُفسَّر بإشارة متمم 2 بالقيمة ${sg}.`
      : `أعلى بت في النتيجة = 0، لذا القيمة بإشارة متمم 2 هي ${sg} نفسها.`
  );
  const blocks = [
    { type: "table", caption: "جدول البتات", head: ["المتغير", "ثنائي", "سداسي عشري", "بدون إشارة", "بإشارة (متمم 2)"], rows, ltr: true },
    { type: "html", html: `<pre class="code" dir="ltr"><code>${escapeHtml(bitAlignment(named, w))}</code></pre>` }
  ];
  if (op === "shl" && (ra << BigInt(sh)) > (1n << BigInt(w)) - 1n) {
    blocks.push({ type: "note", text: "تم فقدان بعض البتات من أعلى الرقم لأن الإزاحة تجاوزت حدود العرض المختار.", tone: "warn" });
  }
  const lhs = isBin ? `${va.v} ${NAMES[op]} ${vb.v}` : op === "not" ? `NOT ${va.v}` : `${va.v} ${NAMES[op]} ${sh}`;
  return {
    results: [
      { label: "النتيجة ثنائياً", value: bin },
      { label: "النتيجة سداسياً", value: hx },
      { label: "النتيجة بدون إشارة", value: un },
      { label: "النتيجة بإشارة (متمم 2)", value: sg }
    ],
    steps,
    blocks,
    copy: `${lhs} = ${bin} (${hx} = ${un})`
  };
}
