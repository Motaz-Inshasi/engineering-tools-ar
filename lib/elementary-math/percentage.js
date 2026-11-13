import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["of", "what", "change", "add", "sub", "reverse", "points"];
const N = (x) => fmt(x, 10);
const P = (x) => `${fmt(x, 10)}%`;

export const meta = {
  description: "احسب النسبة المئوية بسبعة أنماط: نسبة من عدد، أو كم في المئة عدد من آخر، أو نسبة التغير بين قيمتين، أو زيادة قيمة أو إنقاصها بنسبة، أو إيجاد الأصل قبل التغير، أو الفرق بين نسبتين بالنقاط المئوية.",
  keywords: ["نسبة مئوية", "percentage", "نسبة التغير", "زيادة بنسبة", "نقص بنسبة", "نقاط مئوية", "percentage points", "القيمة الأصلية"],
  formulas: [
    { label: "نسبة من عدد", tex: "P = \\frac{X}{100}\\, Y" },
    { label: "نسبة التغير", tex: "\\Delta\\% = \\frac{B - A}{A}\\times 100" },
    { label: "الأصل قبل التغير", tex: "Y = \\frac{F}{1 \\pm \\frac{X}{100}}" },
    { label: "نقاط مئوية", tex: "\\Delta p = p_2 - p_1,\\qquad \\text{تغير نسبي} = \\frac{\\Delta p}{p_1}\\times 100" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "of", options: [["of", "X% من Y"], ["what", "الجزء X هو كم % من Y"], ["change", "نسبة التغير من A إلى B"], ["add", "زيادة Y بنسبة X%"], ["sub", "نقص Y بنسبة X%"], ["reverse", "القيمة الأصلية قبل التغير"], ["points", "الفرق بين نسبتين (نقاط مئوية)"]] },
    { id: "pct", label: "النسبة المئوية X", unit: "%", type: "number", default: "20", when: { mode: ["of", "add", "sub", "reverse"] } },
    { id: "base", label: "القيمة Y", type: "number", default: "150", when: { mode: ["of", "add", "sub"] } },
    { id: "part", label: "الجزء X", type: "number", default: "30", when: { mode: ["what"] } },
    { id: "whole", label: "الكل Y", type: "number", default: "150", when: { mode: ["what"] } },
    { id: "dir", label: "نوع التغير", type: "select", default: "inc", options: [["inc", "زيادة"], ["dec", "نقص"]], when: { mode: ["reverse"] } },
    { id: "final", label: "القيمة النهائية F", type: "number", default: "230", when: { mode: ["reverse"] } },
    { id: "from", label: "القيمة الأصلية A", type: "number", default: "80", when: { mode: ["change"] } },
    { id: "to", label: "القيمة الجديدة B", type: "number", default: "100", when: { mode: ["change"] } },
    { id: "p1", label: "النسبة الأولى p1", unit: "%", type: "number", default: "12", when: { mode: ["points"] } },
    { id: "p2", label: "النسبة الثانية p2", unit: "%", type: "number", default: "15", when: { mode: ["points"] } }
  ],
  example: {
    values: { mode: "of", pct: "20", base: "150", part: "30", whole: "150", dir: "inc", final: "230", from: "80", to: "100", p1: "12", p2: "15" },
    expect: ["= 30"],
    note: "مثال: 20% من 150 = 30."
  },
  invalid: { values: { mode: "change", from: "0", to: "5" } },
  related: ["fractions", "ratio-proportion", "significant-figures"]
};

function ofMode(input) {
  const x = num(input, "pct", "النسبة المئوية X", { nonNegative: true });
  const y = num(input, "base", "القيمة Y");
  const r = (x * y) / 100;
  return {
    results: [
      { label: "الناتج", value: N(r) },
      { label: "النسبة كعدد عشري", value: N(x / 100) }
    ],
    steps: [
      { text: "نحوّل النسبة إلى عدد عشري بالقسمة على 100:", tex: `\\frac{${ntex(x)}}{100} = ${ntex(x / 100, 8)}` },
      { text: "نضرب العدد العشري في القيمة:", tex: `${ntex(x / 100, 8)} \\times ${ntex(y)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(x)}% من ${N(y)} = ${N(r)}`
  };
}

function whatMode(input) {
  const part = num(input, "part", "الجزء X");
  const whole = num(input, "whole", "الكل Y", { nonZero: true });
  const p = (part * 100) / whole;
  return {
    results: [{ label: "النسبة المئوية", value: P(p) }],
    steps: [
      { text: "نقسم الجزء على الكل ثم نضرب في 100:", tex: `\\frac{${ntex(part)}}{${ntex(whole)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(part)} هو ${N(p)}% من ${N(whole)}`
  };
}

function changeMode(input) {
  const a = num(input, "from", "القيمة الأصلية A", { nonZero: true });
  const b = num(input, "to", "القيمة الجديدة B");
  const diff = b - a;
  const p = (diff * 100) / a;
  const dir = diff > 0 ? "زيادة" : diff < 0 ? "نقص" : "لا تغيير";
  return {
    results: [
      { label: "نسبة التغير", value: `${p > 0 ? "+" : ""}${P(p)}` },
      { label: "مقدار التغير", value: N(diff) },
      { label: "نوع التغير", value: dir }
    ],
    steps: [
      { text: "نحسب الفرق بين القيمتين:", tex: `\\Delta = B - A = ${ntex(b)} - ${ntex(a)} = ${ntex(diff)}` },
      { text: "نقسم الفرق على القيمة الأصلية ثم نضرب في 100:", tex: `\\frac{${ntex(diff)}}{${ntex(a)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `من ${N(a)} إلى ${N(b)}: ${dir} ${N(Math.abs(p))}%`
  };
}

function shiftMode(input, sign) {
  const x = num(input, "pct", "النسبة المئوية X", { nonNegative: true });
  if (sign < 0 && x > 100) fail("النسبة في حالة النقص لا يمكن أن تتجاوز 100%.", "pct");
  const y = num(input, "base", "القيمة Y");
  const inc = (y * x) / 100;
  const r = y + sign * inc;
  const word = sign > 0 ? "زيادة" : "نقص";
  const op = sign > 0 ? "+" : "-";
  return {
    results: [
      { label: sign > 0 ? "القيمة بعد الزيادة" : "القيمة بعد النقص", value: N(r) },
      { label: "مقدار التغير", value: N(inc) }
    ],
    steps: [
      { text: "نحسب مقدار التغير من النسبة:", tex: `\\frac{${ntex(x)}}{100} \\times ${ntex(y)} = ${ntex(inc, 8)}` },
      { text: `نطبّق ${word} على القيمة الأصلية:`, tex: `${ntex(y)} ${op} ${ntex(inc, 8)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} بعد ${word} ${N(x)}% = ${N(r)}`
  };
}

function reverseMode(input) {
  const f = num(input, "final", "القيمة النهائية F");
  const x = num(input, "pct", "النسبة المئوية X", { nonNegative: true });
  const dir = choice(input, "dir", "نوع التغير", ["inc", "dec"], "inc");
  if (dir === "dec" && x >= 100) fail("النسبة في حالة النقص يجب أن تكون أقل من 100%.", "pct");
  const inc = dir === "inc";
  const f0 = inc ? 100 + x : 100 - x;
  const orig = (f * 100) / f0;
  const word = inc ? "زيادة" : "نقص";
  return {
    results: [
      { label: "القيمة الأصلية", value: N(orig) },
      { label: "معامل التغير", value: `× ${N(f0 / 100)}` }
    ],
    steps: [
      { text: "القيمة النهائية = الأصلية × معامل التغير، ومعامل التغير = 1 ± X/100:", tex: `1 ${inc ? "+" : "-"} \\frac{${ntex(x)}}{100} = \\frac{${ntex(f0)}}{100}` },
      { text: "نقسم القيمة النهائية على معامل التغير:", tex: `Y = \\frac{${ntex(f)}}{${ntex(f0 / 100, 8)}} = \\frac{${ntex(f)} \\times 100}{${ntex(f0)}} = ${ntex(orig, 8)}` }
    ],
    copy: `القيمة الأصلية = ${N(orig)} (النهائية ${N(f)} بعد ${word} ${N(x)}%)`
  };
}

function pointsMode(input) {
  const p1 = num(input, "p1", "النسبة الأولى p1", { nonZero: true });
  const p2 = num(input, "p2", "النسبة الثانية p2");
  const diff = p2 - p1;
  const rel = (diff * 100) / p1;
  const word = diff > 0 ? "زيادة" : diff < 0 ? "نقص" : "لا تغيير";
  return {
    results: [
      { label: "الفرق بالنقاط المئوية", value: `${N(diff)} نقطة مئوية` },
      { label: "التغير النسبي", value: `${rel > 0 ? "+" : ""}${P(rel)}` },
      { label: "نوع التغير", value: word }
    ],
    steps: [
      { text: "الفرق بالنقاط المئوية هو الطرح المباشر للنسبتين:", tex: `\\Delta p = p_2 - p_1 = ${ntex(p2)} - ${ntex(p1)} = ${ntex(diff)}\\ \\text{pp}` },
      { text: "التغير النسبي يقارن الفرق بالنسبة الأولى:", tex: `\\frac{\\Delta p}{p_1} \\times 100 = \\frac{${ntex(diff)}}{${ntex(p1)}} \\times 100 = ${ntex(rel, 8)}\\%` }
    ],
    copy: `من ${N(p1)}% إلى ${N(p2)}%: فرق ${N(diff)} نقطة مئوية، وتغير نسبي ${N(rel)}%`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", MODES, "of");
  if (mode === "of") return ofMode(input);
  if (mode === "what") return whatMode(input);
  if (mode === "change") return changeMode(input);
  if (mode === "add") return shiftMode(input, 1);
  if (mode === "sub") return shiftMode(input, -1);
  if (mode === "reverse") return reverseMode(input);
  return pointsMode(input);
}
