import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["of", "what", "change", "add", "sub", "reverse", "points"];
const N = (x) => fmt(x, 10);
const P = (x) => `${fmt(x, 10)}%`;

export const meta = {
  description: "سات طریقوں سے فیصد کا حساب لگائیں: کسی عدد کا فیصد، ایک عدد دوسرے کا کتنے فیصد ہے، دو قیمتوں کے درمیان فیصد تبدیلی، کسی قدر میں فیصد کے حساب سے اضافہ یا کمی، تبدیلی سے پہلے کی اصل قدر، یا دو فیصدوں کا فرق فیصدی پوائنٹس میں۔",
  keywords: ["فیصد", "percentage", "فیصد تبدیلی", "فیصد کے حساب سے اضافہ", "فیصد کے حساب سے کمی", "فیصدی پوائنٹس", "percentage points", "اصل قدر"],
  formulas: [
    { label: "کسی عدد کا فیصد", tex: "P = \\frac{X}{100}\\, Y" },
    { label: "فیصد تبدیلی", tex: "\\Delta\\% = \\frac{B - A}{A}\\times 100" },
    { label: "تبدیلی سے پہلے کی اصل قدر", tex: "Y = \\frac{F}{1 \\pm \\frac{X}{100}}" },
    { label: "فیصدی پوائنٹس", tex: "\\Delta p = p_2 - p_1,\\qquad \\text{نسبی تبدیلی} = \\frac{\\Delta p}{p_1}\\times 100" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "of", options: [["of", "X% از Y"], ["what", "جز X، کل Y کا کتنے فیصد ہے"], ["change", "A سے B تک فیصد تبدیلی"], ["add", "Y میں X% اضافہ"], ["sub", "Y میں X% کمی"], ["reverse", "تبدیلی سے پہلے کی اصل قدر"], ["points", "دو فیصدوں کا فرق (فیصدی پوائنٹس)"]] },
    { id: "pct", label: "فیصد X", unit: "%", type: "number", default: "20", when: { mode: ["of", "add", "sub", "reverse"] } },
    { id: "base", label: "قدر Y", type: "number", default: "150", when: { mode: ["of", "add", "sub"] } },
    { id: "part", label: "جز X", type: "number", default: "30", when: { mode: ["what"] } },
    { id: "whole", label: "کل Y", type: "number", default: "150", when: { mode: ["what"] } },
    { id: "dir", label: "تبدیلی کی قسم", type: "select", default: "inc", options: [["inc", "اضافہ"], ["dec", "کمی"]], when: { mode: ["reverse"] } },
    { id: "final", label: "حتمی قدر F", type: "number", default: "230", when: { mode: ["reverse"] } },
    { id: "from", label: "اصل قدر A", type: "number", default: "80", when: { mode: ["change"] } },
    { id: "to", label: "نئی قدر B", type: "number", default: "100", when: { mode: ["change"] } },
    { id: "p1", label: "پہلا فیصد p1", unit: "%", type: "number", default: "12", when: { mode: ["points"] } },
    { id: "p2", label: "دوسرا فیصد p2", unit: "%", type: "number", default: "15", when: { mode: ["points"] } }
  ],
  example: {
    values: { mode: "of", pct: "20", base: "150", part: "30", whole: "150", dir: "inc", final: "230", from: "80", to: "100", p1: "12", p2: "15" },
    expect: ["= 30"],
    note: "مثال: 150 کا 20% = 30۔"
  },
  invalid: { values: { mode: "change", from: "0", to: "5" } },
  related: ["fractions", "ratio-proportion", "significant-figures"]
};

function ofMode(input) {
  const x = num(input, "pct", "فیصد X", { nonNegative: true });
  const y = num(input, "base", "قدر Y");
  const r = (x * y) / 100;
  return {
    results: [
      { label: "نتیجہ", value: N(r) },
      { label: "فیصد بطور اعشاری عدد", value: N(x / 100) }
    ],
    steps: [
      { text: "ہم فیصد کو 100 سے تقسیم کر کے اعشاری عدد میں بدلتے ہیں:", tex: `\\frac{${ntex(x)}}{100} = ${ntex(x / 100, 8)}` },
      { text: "ہم اعشاری عدد کو قدر سے ضرب دیتے ہیں:", tex: `${ntex(x / 100, 8)} \\times ${ntex(y)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(x)}% از ${N(y)} = ${N(r)}`
  };
}

function whatMode(input) {
  const part = num(input, "part", "جز X");
  const whole = num(input, "whole", "کل Y", { nonZero: true });
  const p = (part * 100) / whole;
  return {
    results: [{ label: "فیصد", value: P(p) }],
    steps: [
      { text: "ہم جز کو کل سے تقسیم کر کے 100 سے ضرب دیتے ہیں:", tex: `\\frac{${ntex(part)}}{${ntex(whole)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(part)} ہے ${N(whole)} کا ${N(p)}%`
  };
}

function changeMode(input) {
  const a = num(input, "from", "اصل قدر A", { nonZero: true });
  const b = num(input, "to", "نئی قدر B");
  const diff = b - a;
  const p = (diff * 100) / a;
  const dir = diff > 0 ? "اضافہ" : diff < 0 ? "کمی" : "کوئی تبدیلی نہیں";
  return {
    results: [
      { label: "فیصد تبدیلی", value: `${p > 0 ? "+" : ""}${P(p)}` },
      { label: "تبدیلی کی مقدار", value: N(diff) },
      { label: "تبدیلی کی قسم", value: dir }
    ],
    steps: [
      { text: "ہم دونوں قدروں کا فرق حساب کرتے ہیں:", tex: `\\Delta = B - A = ${ntex(b)} - ${ntex(a)} = ${ntex(diff)}` },
      { text: "ہم فرق کو اصل قدر سے تقسیم کر کے 100 سے ضرب دیتے ہیں:", tex: `\\frac{${ntex(diff)}}{${ntex(a)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(a)} سے ${N(b)} تک: ${dir} ${N(Math.abs(p))}%`
  };
}

function shiftMode(input, sign) {
  const x = num(input, "pct", "فیصد X", { nonNegative: true });
  if (sign < 0 && x > 100) fail("کمی کا فیصد 100% سے زیادہ نہیں ہو سکتا۔", "pct");
  const y = num(input, "base", "قدر Y");
  const inc = (y * x) / 100;
  const r = y + sign * inc;
  const word = sign > 0 ? "اضافہ" : "کمی";
  const op = sign > 0 ? "+" : "-";
  return {
    results: [
      { label: sign > 0 ? "اضافے کے بعد قدر" : "کمی کے بعد قدر", value: N(r) },
      { label: "تبدیلی کی مقدار", value: N(inc) }
    ],
    steps: [
      { text: "ہم فیصد سے تبدیلی کی مقدار حساب کرتے ہیں:", tex: `\\frac{${ntex(x)}}{100} \\times ${ntex(y)} = ${ntex(inc, 8)}` },
      { text: `ہم اصل قدر پر ${word} لاگو کرتے ہیں:`, tex: `${ntex(y)} ${op} ${ntex(inc, 8)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} بعد از ${word} ${N(x)}% = ${N(r)}`
  };
}

function reverseMode(input) {
  const f = num(input, "final", "حتمی قدر F");
  const x = num(input, "pct", "فیصد X", { nonNegative: true });
  const dir = choice(input, "dir", "تبدیلی کی قسم", ["inc", "dec"], "inc");
  if (dir === "dec" && x >= 100) fail("کمی کا فیصد 100% سے کم ہونا چاہیے۔", "pct");
  const inc = dir === "inc";
  const f0 = inc ? 100 + x : 100 - x;
  const orig = (f * 100) / f0;
  const word = inc ? "اضافہ" : "کمی";
  return {
    results: [
      { label: "اصل قدر", value: N(orig) },
      { label: "تبدیلی کا عامل", value: `× ${N(f0 / 100)}` }
    ],
    steps: [
      { text: "حتمی قدر = اصل × تبدیلی کا عامل، جہاں تبدیلی کا عامل = 1 ± X/100:", tex: `1 ${inc ? "+" : "-"} \\frac{${ntex(x)}}{100} = \\frac{${ntex(f0)}}{100}` },
      { text: "ہم حتمی قدر کو تبدیلی کے عامل سے تقسیم کرتے ہیں:", tex: `Y = \\frac{${ntex(f)}}{${ntex(f0 / 100, 8)}} = \\frac{${ntex(f)} \\times 100}{${ntex(f0)}} = ${ntex(orig, 8)}` }
    ],
    copy: `اصل قدر = ${N(orig)} (حتمی ${N(f)}، ${word} ${N(x)}% کے بعد)`
  };
}

function pointsMode(input) {
  const p1 = num(input, "p1", "پہلا فیصد p1", { nonZero: true });
  const p2 = num(input, "p2", "دوسرا فیصد p2");
  const diff = p2 - p1;
  const rel = (diff * 100) / p1;
  const word = diff > 0 ? "اضافہ" : diff < 0 ? "کمی" : "کوئی تبدیلی نہیں";
  return {
    results: [
      { label: "فیصدی پوائنٹس میں فرق", value: `${N(diff)} فیصدی پوائنٹس` },
      { label: "نسبی تبدیلی", value: `${rel > 0 ? "+" : ""}${P(rel)}` },
      { label: "تبدیلی کی قسم", value: word }
    ],
    steps: [
      { text: "فیصدی پوائنٹس میں فرق دونوں فیصدوں کی براہِ راست تفریق ہے:", tex: `\\Delta p = p_2 - p_1 = ${ntex(p2)} - ${ntex(p1)} = ${ntex(diff)}\\ \\text{pp}` },
      { text: "نسبی تبدیلی فرق کا موازنہ پہلے فیصد سے کرتی ہے:", tex: `\\frac{\\Delta p}{p_1} \\times 100 = \\frac{${ntex(diff)}}{${ntex(p1)}} \\times 100 = ${ntex(rel, 8)}\\%` }
    ],
    copy: `${N(p1)}% سے ${N(p2)}% تک: ${N(diff)} فیصدی پوائنٹس کا فرق، اور ${N(rel)}% کی نسبی تبدیلی`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", MODES, "of");
  if (mode === "of") return ofMode(input);
  if (mode === "what") return whatMode(input);
  if (mode === "change") return changeMode(input);
  if (mode === "add") return shiftMode(input, 1);
  if (mode === "sub") return shiftMode(input, -1);
  if (mode === "reverse") return reverseMode(input);
  return pointsMode(input);
}
