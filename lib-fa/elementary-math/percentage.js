import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["of", "what", "change", "add", "sub", "reverse", "points"];
const N = (x) => fmt(x, 10);
const P = (x) => `${fmt(x, 10)}%`;

export const meta = {
  description: "درصد را در هفت حالت محاسبه کنید: درصدی از یک عدد، یا اینکه یک عدد چند درصد عدد دیگر است، یا درصد تغییر بین دو مقدار، یا افزایش یا کاهش یک مقدار با درصد، یا یافتن مقدار اصلی پیش از تغییر، یا اختلاف دو درصد بر حسب نقاط درصدی.",
  keywords: ["درصد", "percentage", "درصد تغییر", "افزایش با درصد", "کاهش با درصد", "نقاط درصدی", "percentage points", "مقدار اصلی"],
  formulas: [
    { label: "درصدی از یک عدد", tex: "P = \\frac{X}{100}\\, Y" },
    { label: "درصد تغییر", tex: "\\Delta\\% = \\frac{B - A}{A}\\times 100" },
    { label: "مقدار اصلی پیش از تغییر", tex: "Y = \\frac{F}{1 \\pm \\frac{X}{100}}" },
    { label: "نقاط درصدی", tex: "\\Delta p = p_2 - p_1,\\qquad \\text{تغییر نسبی} = \\frac{\\Delta p}{p_1}\\times 100" }
  ],
  inputs: [
    { id: "mode", label: "نوع محاسبه", type: "select", default: "of", options: [["of", "X% از Y"], ["what", "عدد X چند درصد از Y است"], ["change", "درصد تغییر از A به B"], ["add", "افزایش Y به میزان X%"], ["sub", "کاهش Y به میزان X%"], ["reverse", "مقدار اصلی پیش از تغییر"], ["points", "اختلاف دو درصد (نقاط درصدی)"]] },
    { id: "pct", label: "درصد X", unit: "%", type: "number", default: "20", when: { mode: ["of", "add", "sub", "reverse"] } },
    { id: "base", label: "مقدار Y", type: "number", default: "150", when: { mode: ["of", "add", "sub"] } },
    { id: "part", label: "جزء X", type: "number", default: "30", when: { mode: ["what"] } },
    { id: "whole", label: "کل Y", type: "number", default: "150", when: { mode: ["what"] } },
    { id: "dir", label: "نوع تغییر", type: "select", default: "inc", options: [["inc", "افزایش"], ["dec", "کاهش"]], when: { mode: ["reverse"] } },
    { id: "final", label: "مقدار نهایی F", type: "number", default: "230", when: { mode: ["reverse"] } },
    { id: "from", label: "مقدار اصلی A", type: "number", default: "80", when: { mode: ["change"] } },
    { id: "to", label: "مقدار جدید B", type: "number", default: "100", when: { mode: ["change"] } },
    { id: "p1", label: "درصد اول p1", unit: "%", type: "number", default: "12", when: { mode: ["points"] } },
    { id: "p2", label: "درصد دوم p2", unit: "%", type: "number", default: "15", when: { mode: ["points"] } }
  ],
  example: {
    values: { mode: "of", pct: "20", base: "150", part: "30", whole: "150", dir: "inc", final: "230", from: "80", to: "100", p1: "12", p2: "15" },
    expect: ["= 30"],
    note: "مثال: 20% از 150 = 30."
  },
  invalid: { values: { mode: "change", from: "0", to: "5" } },
  related: ["fractions", "ratio-proportion", "significant-figures"]
};

function ofMode(input) {
  const x = num(input, "pct", "درصد X", { nonNegative: true });
  const y = num(input, "base", "مقدار Y");
  const r = (x * y) / 100;
  return {
    results: [
      { label: "نتیجه", value: N(r) },
      { label: "درصد به‌صورت عدد اعشاری", value: N(x / 100) }
    ],
    steps: [
      { text: "درصد را با تقسیم بر 100 به عدد اعشاری تبدیل می‌کنیم:", tex: `\\frac{${ntex(x)}}{100} = ${ntex(x / 100, 8)}` },
      { text: "عدد اعشاری را در مقدار ضرب می‌کنیم:", tex: `${ntex(x / 100, 8)} \\times ${ntex(y)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(x)}% از ${N(y)} = ${N(r)}`
  };
}

function whatMode(input) {
  const part = num(input, "part", "جزء X");
  const whole = num(input, "whole", "کل Y", { nonZero: true });
  const p = (part * 100) / whole;
  return {
    results: [{ label: "درصد", value: P(p) }],
    steps: [
      { text: "جزء را بر کل تقسیم می‌کنیم و در 100 ضرب می‌کنیم:", tex: `\\frac{${ntex(part)}}{${ntex(whole)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(part)} برابر ${N(p)}% از ${N(whole)} است`
  };
}

function changeMode(input) {
  const a = num(input, "from", "مقدار اصلی A", { nonZero: true });
  const b = num(input, "to", "مقدار جدید B");
  const diff = b - a;
  const p = (diff * 100) / a;
  const dir = diff > 0 ? "افزایش" : diff < 0 ? "کاهش" : "بدون تغییر";
  return {
    results: [
      { label: "درصد تغییر", value: `${p > 0 ? "+" : ""}${P(p)}` },
      { label: "میزان تغییر", value: N(diff) },
      { label: "نوع تغییر", value: dir }
    ],
    steps: [
      { text: "اختلاف دو مقدار را محاسبه می‌کنیم:", tex: `\\Delta = B - A = ${ntex(b)} - ${ntex(a)} = ${ntex(diff)}` },
      { text: "اختلاف را بر مقدار اصلی تقسیم می‌کنیم و در 100 ضرب می‌کنیم:", tex: `\\frac{${ntex(diff)}}{${ntex(a)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `از ${N(a)} به ${N(b)}: ${dir} ${N(Math.abs(p))}%`
  };
}

function shiftMode(input, sign) {
  const x = num(input, "pct", "درصد X", { nonNegative: true });
  if (sign < 0 && x > 100) fail("درصد کاهش نمی‌تواند از 100% بیشتر باشد.", "pct");
  const y = num(input, "base", "مقدار Y");
  const inc = (y * x) / 100;
  const r = y + sign * inc;
  const word = sign > 0 ? "افزایش" : "کاهش";
  const op = sign > 0 ? "+" : "-";
  return {
    results: [
      { label: sign > 0 ? "مقدار پس از افزایش" : "مقدار پس از کاهش", value: N(r) },
      { label: "میزان تغییر", value: N(inc) }
    ],
    steps: [
      { text: "میزان تغییر را از درصد محاسبه می‌کنیم:", tex: `\\frac{${ntex(x)}}{100} \\times ${ntex(y)} = ${ntex(inc, 8)}` },
      { text: `${word} را بر مقدار اصلی اعمال می‌کنیم:`, tex: `${ntex(y)} ${op} ${ntex(inc, 8)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} پس از ${word} ${N(x)}% = ${N(r)}`
  };
}

function reverseMode(input) {
  const f = num(input, "final", "مقدار نهایی F");
  const x = num(input, "pct", "درصد X", { nonNegative: true });
  const dir = choice(input, "dir", "نوع تغییر", ["inc", "dec"], "inc");
  if (dir === "dec" && x >= 100) fail("درصد کاهش باید کمتر از 100% باشد.", "pct");
  const inc = dir === "inc";
  const f0 = inc ? 100 + x : 100 - x;
  const orig = (f * 100) / f0;
  const word = inc ? "افزایش" : "کاهش";
  return {
    results: [
      { label: "مقدار اصلی", value: N(orig) },
      { label: "ضریب تغییر", value: `× ${N(f0 / 100)}` }
    ],
    steps: [
      { text: "مقدار نهایی = مقدار اصلی × ضریب تغییر، و ضریب تغییر = 1 ± X/100:", tex: `1 ${inc ? "+" : "-"} \\frac{${ntex(x)}}{100} = \\frac{${ntex(f0)}}{100}` },
      { text: "مقدار نهایی را بر ضریب تغییر تقسیم می‌کنیم:", tex: `Y = \\frac{${ntex(f)}}{${ntex(f0 / 100, 8)}} = \\frac{${ntex(f)} \\times 100}{${ntex(f0)}} = ${ntex(orig, 8)}` }
    ],
    copy: `مقدار اصلی = ${N(orig)} (مقدار نهایی ${N(f)} پس از ${word} ${N(x)}%)`
  };
}

function pointsMode(input) {
  const p1 = num(input, "p1", "درصد اول p1", { nonZero: true });
  const p2 = num(input, "p2", "درصد دوم p2");
  const diff = p2 - p1;
  const rel = (diff * 100) / p1;
  const word = diff > 0 ? "افزایش" : diff < 0 ? "کاهش" : "بدون تغییر";
  return {
    results: [
      { label: "اختلاف بر حسب نقاط درصدی", value: `${N(diff)} نقطهٔ درصدی` },
      { label: "تغییر نسبی", value: `${rel > 0 ? "+" : ""}${P(rel)}` },
      { label: "نوع تغییر", value: word }
    ],
    steps: [
      { text: "اختلاف بر حسب نقاط درصدی برابر تفریق مستقیم دو درصد است:", tex: `\\Delta p = p_2 - p_1 = ${ntex(p2)} - ${ntex(p1)} = ${ntex(diff)}\\ \\text{pp}` },
      { text: "تغییر نسبی، اختلاف را با درصد اول مقایسه می‌کند:", tex: `\\frac{\\Delta p}{p_1} \\times 100 = \\frac{${ntex(diff)}}{${ntex(p1)}} \\times 100 = ${ntex(rel, 8)}\\%` }
    ],
    copy: `از ${N(p1)}% به ${N(p2)}%: اختلاف ${N(diff)} نقطهٔ درصدی، و تغییر نسبی ${N(rel)}%`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع محاسبه", MODES, "of");
  if (mode === "of") return ofMode(input);
  if (mode === "what") return whatMode(input);
  if (mode === "change") return changeMode(input);
  if (mode === "add") return shiftMode(input, 1);
  if (mode === "sub") return shiftMode(input, -1);
  if (mode === "reverse") return reverseMode(input);
  return pointsMode(input);
}
