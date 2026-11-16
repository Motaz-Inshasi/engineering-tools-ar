import { fail, choice, str } from "../core/validate.js";

const MAX_DIGITS = 50;
const SYM = { add: "+", sub: "−", mul: "×", div: "÷" };
const KIND = { terminating: "منتہی", repeating: "دوری", truncated: "50 ہندسوں کے اندر دہرایا نہیں جاتا" };
const ABS = (x) => (x < 0n ? -x : x);
const wrap = (x) => (x < 0n ? `(${x})` : `${x}`);

export const meta = {
  description: "دو کسروں کو جمع، تفریق، ضرب یا تقسیم کریں، ان کا موازنہ کریں، یا ایک کسر کو سادہ کریں۔ کسر، مخلوط عدد، صحیح عدد اور اعشاری عدد قبول کرتا ہے، اور نتیجہ سادہ کسر، مخلوط عدد اور اعشاری صورت میں حل کے مراحل کے ساتھ دکھاتا ہے۔",
  keywords: ["کسور", "fractions", "مخلوط عدد", "کسر کو سادہ کرنا", "مشترک مخرج", "دوری اعشاری کسر", "کسور کو جمع کرنا", "کسور کو ضرب دینا"],
  formulas: [
    { label: "کسور کو جمع اور تفریق کرنا", tex: "\\frac{a}{b} \\pm \\frac{c}{d} = \\frac{ad \\pm bc}{bd}" },
    { label: "کسور کو ضرب اور تقسیم کرنا", tex: "\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{ac}{bd},\\qquad \\frac{a}{b} \\div \\frac{c}{d} = \\frac{ad}{bc}" }
  ],
  inputs: [
    { id: "a", label: "پہلی کسر a", type: "text", default: "3/4", help: "قابلِ قبول مثالیں: 3/4، -2 1/3 (مخلوط عدد)، 5 (صحیح عدد)، 0.75 (اعشاری)۔" },
    { id: "op", label: "عمل", type: "select", default: "add", options: [["add", "+ جمع"], ["sub", "− تفریق"], ["mul", "× ضرب"], ["div", "÷ تقسیم"], ["cmp", "موازنہ"], ["simplify", "صرف پہلی کسر کو سادہ کریں"]] },
    { id: "b", label: "دوسری کسر b", type: "text", default: "1/6", when: { op: ["add", "sub", "mul", "div", "cmp"] } }
  ],
  example: { values: { a: "3/4", op: "add", b: "1/6" }, expect: ["11/12", "0.91(6)"], note: "مثال: 3/4 + 1/6 = 11/12 = 0.91(6)۔" },
  invalid: { values: { a: "3/0", op: "add", b: "1/6" } },
  related: ["gcd-lcm", "percentage", "ratio-proportion", "significant-figures"]
};

function gcd(a, b) {
  let x = ABS(a);
  let y = ABS(b);
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}

function reduce(n, d) {
  const s = d < 0n ? -1n : 1n;
  const g = gcd(n, d);
  return { n: (s * n) / g, d: (s * d) / g };
}

function tf(n, d) {
  const sg = n < 0n ? "-" : "";
  const a = ABS(n);
  return d === 1n ? `${sg}${a}` : `${sg}\\frac{${a}}{${d}}`;
}

function fs(f) {
  return f.d === 1n ? `${f.n}` : `${f.n}/${f.d}`;
}

function mixed(f) {
  if (f.d === 1n) return `${f.n}`;
  const sg = f.n < 0n ? "-" : "";
  const a = ABS(f.n);
  const w = a / f.d;
  const r = a % f.d;
  if (w === 0n) return `${sg}${r}/${f.d}`;
  return `${sg}${w} ${r}/${f.d}`;
}

function decimal(n, d) {
  const sg = n < 0n ? "-" : "";
  const a = ABS(n);
  const q = a / d;
  let r = a % d;
  const head = `${sg}${q}`;
  if (r === 0n) return { text: head, tex: head, kind: "terminating" };
  const digits = [];
  const seen = new Map();
  let start = -1;
  while (r !== 0n) {
    if (seen.has(r)) {
      start = seen.get(r);
      break;
    }
    if (digits.length === MAX_DIGITS) break;
    seen.set(r, digits.length);
    r *= 10n;
    digits.push(String(r / d));
    r %= d;
  }
  if (start < 0 && r === 0n) {
    const body = digits.join("");
    return { text: `${head}.${body}`, tex: `${head}.${body}`, kind: "terminating" };
  }
  if (start < 0) {
    const body = digits.join("");
    return { text: `${head}.${body}…`, tex: `${head}.${body}\\ldots`, kind: "truncated" };
  }
  const pre = digits.slice(0, start).join("");
  const rep = digits.slice(start).join("");
  return { text: `${head}.${pre}(${rep})`, tex: `${head}.${pre}\\overline{${rep}}`, kind: "repeating" };
}

function finish(raw, n0, d0, lhs, mid) {
  const f = reduce(n0, d0);
  const parts = [lhs];
  if (mid) parts.push(mid);
  if (f.n !== n0 || f.d !== d0) parts.push(tf(f.n, f.d));
  return { n: f.n, d: f.d, raw, conv: parts.length > 1 ? parts.join(" = ") : null };
}

function parseFrac(input, key, label) {
  const raw = str(input, key, label).replace(/\s+/g, " ");
  let body = raw;
  let sign = 1n;
  if (body.startsWith("-") || body.startsWith("+")) {
    sign = body.startsWith("-") ? -1n : 1n;
    body = body.slice(1).trim();
  }
  const sg = sign < 0n ? "-" : "";
  let m = body.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const w = BigInt(m[1]);
    const p = BigInt(m[2]);
    const q = BigInt(m[3]);
    if (q === 0n) fail(`${label} میں مخرج صفر نہیں ہو سکتا۔`, key);
    if (p >= q) fail(`${label} میں مخلوط عدد کی صورت مخرج سے چھوٹی ہونی چاہیے۔`, key);
    return finish(raw, sign * (w * q + p), q, `${sg}${w}\\frac{${p}}{${q}}`, `${sg}\\frac{${w * q + p}}{${q}}`);
  }
  m = body.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const p = BigInt(m[1]);
    const q = BigInt(m[2]);
    if (q === 0n) fail(`${label} میں مخرج صفر نہیں ہو سکتا۔`, key);
    return finish(raw, sign * p, q, `${sg}\\frac{${p}}{${q}}`, null);
  }
  m = body.match(/^(\d+)$/);
  if (m) {
    const v = BigInt(m[1]);
    return finish(raw, sign * v, 1n, `${sg}${v}`, null);
  }
  m = body.match(/^(\d*)\.(\d*)$/);
  if (m && m[1] + m[2] !== "") {
    const a = BigInt(m[1] + m[2]);
    const q = 10n ** BigInt(m[2].length);
    return finish(raw, sign * a, q, `${sg}${m[1] || "0"}.${m[2]}`, `${sg}\\frac{${a}}{${q}}`);
  }
  fail(`میں ${label} نہیں سمجھ سکا۔ 3/4، -2 1/3، 5 یا 0.75 جیسی شکل استعمال کریں۔`, key);
}

function lcmStep(a, b, L) {
  return {
    text: `مخارج ${a} اور ${b} کا کم از کم مشترک مضاعف:`,
    tex: `\\operatorname{lcm}(${a},${b}) = \\frac{${a}\\cdot ${b}}{\\gcd(${a},${b})} = \\frac{${a * b}}{${gcd(a, b)}} = ${L}`
  };
}

function reduceStep(n, d) {
  const g = gcd(n, d);
  if (g === 1n) return null;
  return {
    text: `ہم صورت اور مخرج کو بڑے مشترک جزو ${g} سے تقسیم کرتے ہیں:`,
    tex: `\\frac{${n}}{${d}} = \\frac{${n / g}}{${d / g}}`
  };
}

function output(R, steps, prefix) {
  const dec = decimal(R.n, R.d);
  if (R.d !== 1n) steps.push({ text: "ہم حاصل کسر کو طویل تقسیم سے اعشاری میں بدلتے ہیں:", tex: `${tf(R.n, R.d)} = ${dec.tex}` });
  const out = {
    results: [
      { label: "سادہ کسر", value: fs(R) },
      { label: "مخلوط عدد", value: mixed(R) },
      { label: "اعشاری کسر", value: dec.text },
      { label: "اعشاری کسر کی قسم", value: KIND[dec.kind] }
    ],
    steps,
    copy: `${prefix} = ${fs(R)}${R.d !== 1n ? ` = ${dec.text}` : ""}`
  };
  if (dec.kind === "truncated") out.blocks = [{ type: "note", text: "یہ کسر 50 ہندسوں کے اندر دہرائی نہیں جاتی، اس لیے صرف پہلے 50 ہندسے دکھائے گئے ہیں۔" }];
  return out;
}

function compareOut(A, B, steps) {
  const L = lcm(A.d, B.d);
  const na = A.n * (L / A.d);
  const nb = B.n * (L / B.d);
  const rel = na > nb ? ">" : na < nb ? "<" : "=";
  steps.push(lcmStep(A.d, B.d, L));
  steps.push({ text: "ہم دونوں کسروں کو مشترک مخرج میں بدلتے ہیں:", tex: `${tf(A.n, A.d)} = \\frac{${na}}{${L}},\\quad ${tf(B.n, B.d)} = \\frac{${nb}}{${L}}` });
  steps.push({ text: "ہم صورتوں کا موازنہ کرتے ہیں:", tex: `${na} ${rel} ${nb}` });
  const da = decimal(A.n, A.d);
  const db = decimal(B.n, B.d);
  return {
    results: [
      { label: "موازنے کا نتیجہ", value: `${fs(A)} ${rel} ${fs(B)}` },
      { label: "پہلی کسر اعشاری صورت میں", value: da.text },
      { label: "دوسری کسر اعشاری صورت میں", value: db.text }
    ],
    steps,
    copy: `${fs(A)} ${rel} ${fs(B)} (${da.text} ${rel} ${db.text})`
  };
}

export function solve(input) {
  const op = choice(input, "op", "عمل", ["add", "sub", "mul", "div", "cmp", "simplify"], "add");
  const A = parseFrac(input, "a", "پہلی کسر");
  const steps = [];
  if (A.conv) steps.push({ text: "ہم پہلی کسر کو کسر میں بدل کر سادہ کرتے ہیں:", tex: A.conv });
  if (op === "simplify") {
    steps.push({ text: "صورت اور مخرج کا بڑا مشترک جزو:", tex: `\\gcd(${ABS(A.n)},${A.d}) = ${gcd(A.n, A.d)}` });
    return output(A, steps, A.raw);
  }
  const B = parseFrac(input, "b", "دوسری کسر");
  if (B.conv) steps.push({ text: "ہم دوسری کسر کو کسر میں بدل کر سادہ کرتے ہیں:", tex: B.conv });
  if (op === "cmp") return compareOut(A, B, steps);
  if (op === "div" && B.n === 0n) fail("صفر سے تقسیم ممکن نہیں: دوسری کسر صفر کے برابر ہے۔", "b");

  let un;
  let ud;
  if (op === "mul") {
    un = A.n * B.n;
    ud = A.d * B.d;
    steps.push({ text: "ہم صورتوں کو آپس میں اور مخارج کو آپس میں ضرب دیتے ہیں:", tex: `${tf(A.n, A.d)} \\times ${tf(B.n, B.d)} = \\frac{${un}}{${ud}}` });
  } else if (op === "div") {
    const rn = B.n < 0n ? -B.d : B.d;
    const rd = ABS(B.n);
    un = A.n * rn;
    ud = A.d * rd;
    steps.push({ text: "ہم دوسری کسر کو الٹ کر پھر ضرب دیتے ہیں:", tex: `${tf(A.n, A.d)} \\div ${tf(B.n, B.d)} = ${tf(A.n, A.d)} \\times ${tf(rn, rd)} = \\frac{${un}}{${ud}}` });
  } else {
    const L = lcm(A.d, B.d);
    const na = A.n * (L / A.d);
    const nb = B.n * (L / B.d);
    un = op === "add" ? na + nb : na - nb;
    ud = L;
    steps.push(lcmStep(A.d, B.d, L));
    steps.push({ text: "ہم ہر کسر کو مشترک مخرج میں بدلتے ہیں:", tex: `${tf(A.n, A.d)} = \\frac{${na}}{${L}},\\quad ${tf(B.n, B.d)} = \\frac{${nb}}{${L}}` });
    steps.push({ text: op === "add" ? "ہم صورتوں کو جمع کرتے ہیں اور وہی مخرج رکھتے ہیں:" : "ہم صورتوں کو منہا کرتے ہیں اور وہی مخرج رکھتے ہیں:", tex: `\\frac{${na} ${op === "add" ? "+" : "-"} ${wrap(nb)}}{${L}} = \\frac{${un}}{${L}}` });
  }
  const R = reduce(un, ud);
  const rs = reduceStep(un, ud);
  if (rs) steps.push(rs);
  return output(R, steps, `${A.raw} ${SYM[op]} ${B.raw}`);
}
