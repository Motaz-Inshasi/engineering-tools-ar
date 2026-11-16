import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const HEMO_VOLUME_FACTOR = 1e4;

function sci(x, sig = 4) {
  if (x === 0) return "0";
  const [m, e] = x.toExponential(sig - 1).split("e");
  return `${m.includes(".") ? m.replace(/\.?0+$/, "") : m} × 10^${Number(e)}`;
}

function dilText(x) {
  return Number.isInteger(x) && x < 1e15 ? String(x) : fmt(x, 4);
}

export const meta = {
  description: "محاسبه غلظت‌های رقیق‌سازی سریالی و حجم رقیق‌کننده در هر مرحله، یا تعداد واحدهای تشکیل‌دهنده کلنی CFU/mL از کلنی‌های شمارش‌شده، یا تعداد سلول/mL با لام شمارش (هموسیتومتر).",
  keywords: ["رقیق‌سازی سریالی", "serial dilution", "CFU", "واحدهای تشکیل‌دهنده کلنی", "شمارش سلول", "hemocytometer", "تریپان آبی", "غلظت"],
  formulas: [
    { label: "رقیق‌سازی در مرحله k", tex: "D_k = f^{k},\\qquad C_k = \\frac{C_0}{f^{k}}" },
    { label: "واحدهای تشکیل‌دهنده کلنی", tex: "\\text{CFU/mL} = \\frac{\\text{کلنی‌ها}}{V \\times d}" },
    { label: "لام شمارش", tex: "\\text{سلول/mL} = \\frac{\\text{تعداد سلول‌های شمارش‌شده}}{\\text{تعداد مربع‌های شمارش‌شده}} \\times D \\times 10^4" }
  ],
  inputs: [
    {
      id: "mode", label: "روش محاسبه", type: "select", default: "series",
      options: [["series", "رقیق‌سازی سریالی"], ["cfu", "شمارش کلنی (CFU/mL)"], ["hemocytometer", "شمارش سلول با لام شمارش"]]
    },
    { id: "c0", label: "غلظت اولیه C0", type: "number", default: "1000", when: { mode: ["series"] }, help: "با هر واحدی که بخواهید، مانند CFU/mL یا سلول/mL." },
    { id: "factor", label: "ضریب رقیق‌سازی در هر مرحله f", type: "number", default: "10", when: { mode: ["series"] }, help: "مثلاً 10 یا 2." },
    { id: "nsteps", label: "تعداد مراحل رقیق‌سازی", type: "number", default: "6", when: { mode: ["series"] }, help: "عدد صحیح از 1 تا 15." },
    { id: "vt", label: "حجم انتقال از یک لوله به لوله دیگر", unit: "mL", type: "number", default: "1", when: { mode: ["series"] } },
    { id: "colonies", label: "تعداد کلنی‌های شمارش‌شده", type: "number", default: "150", when: { mode: ["cfu"] } },
    { id: "vplate", label: "حجم محلول کشت‌داده‌شده", unit: "mL", type: "number", default: "0.1", when: { mode: ["cfu"] } },
    { id: "dcfu", label: "ضریب رقیق‌سازی ظرف شمارش‌شده", type: "number", default: "1e-6", when: { mode: ["cfu"] }, help: "1e-6 یا 1000000 را وارد کنید؛ مقدار بزرگ‌تر از 1 به صورت معکوس رقیق‌سازی در نظر گرفته می‌شود." },
    { id: "cells", label: "تعداد سلول‌های شمارش‌شده در لام", type: "number", default: "200", when: { mode: ["hemocytometer"] } },
    { id: "squares", label: "تعداد مربع‌های بزرگ شمارش‌شده", type: "number", default: "4", when: { mode: ["hemocytometer"] } },
    { id: "dhemo", label: "ضریب رقیق‌سازی", type: "number", default: "2", when: { mode: ["hemocytometer"] }, help: "مثلاً 2 وقتی سلول‌ها با تریپان آبی به نسبت 1:1 مخلوط می‌شوند." }
  ],
  example: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "150", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" }, expect: ["1.5 × 10^9 CFU/mL"], note: "مثال: 150 کلنی از 0.1 mL رقیق‌سازی 10^-6." },
  invalid: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "-5", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" } },
  related: ["solutions", "population-growth", "lab-units"]
};

function seriesMode(input) {
  const c0 = num(input, "c0", "غلظت اولیه C0", { positive: true });
  const f = num(input, "factor", "ضریب رقیق‌سازی", { positive: true });
  if (f <= 1) fail("ضریب رقیق‌سازی باید بزرگ‌تر از 1 باشد.", "factor");
  const n = num(input, "nsteps", "تعداد مراحل", { integer: true, min: 1, max: 15 });
  const vt = num(input, "vt", "حجم انتقال", { positive: true });
  const perTube = vt * (f - 1);
  const cn = c0 / Math.pow(f, n);
  const rows = [["اصلی", "1:1", fmt(c0, 6), "—"]];
  for (let k = 1; k <= n; k++) rows.push([String(k), `1:${dilText(Math.pow(f, k))}`, fmt(c0 / Math.pow(f, k), 4), fmt(perTube, 4)]);
  return {
    results: [
      { label: "غلظت نهایی", value: fmt(cn, 4) },
      { label: "رقیق‌سازی کل", value: `1:${dilText(Math.pow(f, n))}` },
      { label: "کل رقیق‌کننده افزوده‌شده (mL)", value: fmt(n * perTube, 4) }
    ],
    steps: [
      { text: "رقیق‌سازی در آخرین لوله:", tex: `D_n = f^n = ${ntex(f)}^{${n}} = ${ntex(Math.pow(f, n))}` },
      { text: "غلظت نهایی:", tex: `C_n = \\frac{C_0}{f^n} = \\frac{${ntex(c0)}}{${ntex(Math.pow(f, n))}} = ${ntex(cn, 6)}` },
      { text: "حجم رقیق‌کننده افزوده‌شده به هر لوله:", tex: `V_d = V_t (f-1) = ${ntex(vt)} \\times ${ntex(f - 1)} = ${ntex(perTube)}\\ \\text{mL}` }
    ],
    copy: `غلظت پس از ${n} مرحله = ${fmt(cn, 4)} (رقیق‌سازی 1:${dilText(Math.pow(f, n))})`,
    blocks: [{ type: "table", caption: "جدول لوله‌ها", head: ["لوله", "رقیق‌سازی", "غلظت", "رقیق‌کننده افزوده‌شده (mL)"], rows, ltr: true }]
  };
}

function cfuMode(input) {
  const colonies = num(input, "colonies", "تعداد کلنی‌ها", { integer: true, nonNegative: true });
  const V = num(input, "vplate", "حجم محلول کشت‌داده‌شده", { positive: true });
  const d0 = num(input, "dcfu", "ضریب رقیق‌سازی", { positive: true });
  const d = d0 > 1 ? 1 / d0 : d0;
  const cfu = colonies / (V * d);
  const inRange = colonies >= 30 && colonies <= 300;
  const blocks = [];
  if (!inRange) blocks.push({ type: "note", tone: "warn", text: "تعداد کلنی‌ها خارج از بازه پذیرفتنی 30 تا 300 است، پس نتیجه تخمینی و دقت کمتری دارد." });
  return {
    results: [
      { label: "تعداد واحدهای تشکیل‌دهنده کلنی", value: `${sci(cfu)} CFU/mL` },
      { label: "ضریب رقیق‌سازی به کار رفته", value: dilText(d) },
      { label: "بازه شمارش", value: inRange ? "در بازه 30 تا 300" : "خارج از بازه 30 تا 300" }
    ],
    steps: [
      d0 > 1 ? { text: "مقدار ورودی بزرگ‌تر از 1 است، پس به صورت معکوس رقیق‌سازی در نظر گرفته می‌شود:", tex: `d = \\frac{1}{${ntex(d0)}} = ${ntex(d)}` } : { text: "ضریب رقیق‌سازی به کار رفته:", tex: `d = ${ntex(d)}` },
      { text: "واحدهای تشکیل‌دهنده کلنی در هر mL:", tex: `\\frac{${colonies}}{${ntex(V)} \\times ${ntex(d)}} = ${ntex(cfu, 6)}\\ \\text{CFU/mL}` }
    ],
    copy: `${sci(cfu)} CFU/mL`,
    blocks
  };
}

function hemoMode(input) {
  const cells = num(input, "cells", "تعداد سلول‌های شمارش‌شده", { integer: true, nonNegative: true });
  const squares = num(input, "squares", "تعداد مربع‌ها", { integer: true, positive: true });
  const D = num(input, "dhemo", "ضریب رقیق‌سازی", { positive: true });
  if (D < 1) fail("ضریب رقیق‌سازی باید 1 یا بزرگ‌تر باشد.", "dhemo");
  const avg = cells / squares;
  const cpm = avg * D * HEMO_VOLUME_FACTOR;
  return {
    results: [
      { label: "تعداد سلول در هر mL", value: `${sci(cpm)} سلول/mL` },
      { label: "میانگین سلول‌ها در هر مربع", value: fmt(avg, 4) }
    ],
    steps: [
      { text: "میانگین سلول‌ها در هر مربع بزرگ:", tex: `\\frac{${cells}}{${squares}} = ${ntex(avg, 6)}` },
      { text: "تبدیل به سلول در هر mL با ضریب رقیق‌سازی و حجم لام (10^4 mL):", tex: `${ntex(avg, 6)} \\times ${ntex(D)} \\times 10^4 = ${ntex(cpm, 6)}\\ \\text{cells/mL}` }
    ],
    copy: `${sci(cpm)} سلول/mL`,
    blocks: [{ type: "note", text: "حجم یک مربع بزرگ در لام 1 mm × 1 mm × 0.1 mm = 0.1 µL = 10^-4 mL است، بنابراین میانگین در 10^4 ضرب می‌شود تا تعداد سلول در هر mL به دست آید." }]
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "روش محاسبه", ["series", "cfu", "hemocytometer"], "series");
  if (mode === "cfu") return cfuMode(input);
  if (mode === "hemocytometer") return hemoMode(input);
  return seriesMode(input);
}
