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
  description: "سیریل ڈائلیوشن کی ہر مرحلے کی غلظت اور ڈائلیوئنٹ کا حجم، گنی گئی کالونیوں سے CFU/mL، یا ہیموسائٹومیٹر سے سیلز/mL حساب کریں۔",
  keywords: ["سیریل ڈائلیوشن", "serial dilution", "CFU", "کالونی فارمنگ یونٹس", "خلیوں کی گنتی", "hemocytometer", "ٹرائپین بلیو", "غلظت"],
  formulas: [
    { label: "مرحلہ k پر ڈائلیوشن", tex: "D_k = f^{k},\\qquad C_k = \\frac{C_0}{f^{k}}" },
    { label: "کالونی فارمنگ یونٹس", tex: "\\text{CFU/mL} = \\frac{\\text{کالونیاں}}{V \\times d}" },
    { label: "کاؤنٹنگ چیمبر", tex: "\\text{سیلز/mL} = \\frac{\\text{خلیوں کی تعداد}}{\\text{مربعوں کی تعداد}} \\times D \\times 10^4" }
  ],
  inputs: [
    {
      id: "mode", label: "حساب کا طریقہ", type: "select", default: "series",
      options: [["series", "سیریل ڈائلیوشن"], ["cfu", "کالونی کی گنتی (CFU/mL)"], ["hemocytometer", "کاؤنٹنگ چیمبر سے خلیوں کی گنتی"]]
    },
    { id: "c0", label: "ابتدائی غلظت C0", type: "number", default: "1000", when: { mode: ["series"] }, help: "جو اکائی چاہیں، جیسے CFU/mL یا سیلز/mL۔" },
    { id: "factor", label: "ہر مرحلے کا ڈائلیوشن فیکٹر f", type: "number", default: "10", when: { mode: ["series"] }, help: "مثلاً 10 یا 2۔" },
    { id: "nsteps", label: "ڈائلیوشن مراحل کی تعداد", type: "number", default: "6", when: { mode: ["series"] }, help: "1 سے 15 تک ایک مکمل عدد۔" },
    { id: "vt", label: "ایک ٹیوب سے دوسری میں منتقلی کا حجم", unit: "mL", type: "number", default: "1", when: { mode: ["series"] } },
    { id: "colonies", label: "گنی گئی کالونیوں کی تعداد", type: "number", default: "150", when: { mode: ["cfu"] } },
    { id: "vplate", label: "پلیٹ کیے گئے محلول کا حجم", unit: "mL", type: "number", default: "0.1", when: { mode: ["cfu"] } },
    { id: "dcfu", label: "گنی گئی پلیٹ کا ڈائلیوشن فیکٹر", type: "number", default: "1e-6", when: { mode: ["cfu"] }, help: "1e-6 یا 1000000 درج کریں؛ 1 سے بڑی قدر کو ڈائلیوشن کے معکوس کے طور پر لیا جاتا ہے۔" },
    { id: "cells", label: "چیمبر میں گنے گئے خلیوں کی تعداد", type: "number", default: "200", when: { mode: ["hemocytometer"] } },
    { id: "squares", label: "گنے گئے بڑے مربعوں کی تعداد", type: "number", default: "4", when: { mode: ["hemocytometer"] } },
    { id: "dhemo", label: "ڈائلیوشن فیکٹر", type: "number", default: "2", when: { mode: ["hemocytometer"] }, help: "مثلاً 2 جب خلیے ٹرائپین بلیو کے ساتھ 1:1 کے تناسب سے ملائے جائیں۔" }
  ],
  example: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "150", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" }, expect: ["1.5 × 10^9 CFU/mL"], note: "مثال: 10^-6 ڈائلیوشن کے 0.1 mL سے 150 کالونیاں۔" },
  invalid: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "-5", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" } },
  related: ["solutions", "population-growth", "lab-units"]
};

function seriesMode(input) {
  const c0 = num(input, "c0", "ابتدائی غلظت C0", { positive: true });
  const f = num(input, "factor", "ڈائلیوشن فیکٹر", { positive: true });
  if (f <= 1) fail("ڈائلیوشن فیکٹر 1 سے بڑا ہونا چاہیے۔", "factor");
  const n = num(input, "nsteps", "مراحل کی تعداد", { integer: true, min: 1, max: 15 });
  const vt = num(input, "vt", "منتقلی کا حجم", { positive: true });
  const perTube = vt * (f - 1);
  const cn = c0 / Math.pow(f, n);
  const rows = [["اصل", "1:1", fmt(c0, 6), "—"]];
  for (let k = 1; k <= n; k++) rows.push([String(k), `1:${dilText(Math.pow(f, k))}`, fmt(c0 / Math.pow(f, k), 4), fmt(perTube, 4)]);
  return {
    results: [
      { label: "حتمی غلظت", value: fmt(cn, 4) },
      { label: "کل ڈائلیوشن", value: `1:${dilText(Math.pow(f, n))}` },
      { label: "شامل کیا گیا کل ڈائلیوئنٹ (mL)", value: fmt(n * perTube, 4) }
    ],
    steps: [
      { text: "آخری ٹیوب پر ڈائلیوشن:", tex: `D_n = f^n = ${ntex(f)}^{${n}} = ${ntex(Math.pow(f, n))}` },
      { text: "حتمی غلظت:", tex: `C_n = \\frac{C_0}{f^n} = \\frac{${ntex(c0)}}{${ntex(Math.pow(f, n))}} = ${ntex(cn, 6)}` },
      { text: "ہر ٹیوب میں شامل ڈائلیوئنٹ کا حجم:", tex: `V_d = V_t (f-1) = ${ntex(vt)} \\times ${ntex(f - 1)} = ${ntex(perTube)}\\ \\text{mL}` }
    ],
    copy: `${n} مراحل کے بعد غلظت = ${fmt(cn, 4)} (ڈائلیوشن 1:${dilText(Math.pow(f, n))})`,
    blocks: [{ type: "table", caption: "ٹیوبوں کا جدول", head: ["ٹیوب", "ڈائلیوشن", "غلظت", "شامل کیا گیا ڈائلیوئنٹ (mL)"], rows, ltr: true }]
  };
}

function cfuMode(input) {
  const colonies = num(input, "colonies", "کالونیوں کی تعداد", { integer: true, nonNegative: true });
  const V = num(input, "vplate", "پلیٹ کیے گئے محلول کا حجم", { positive: true });
  const d0 = num(input, "dcfu", "ڈائلیوشن فیکٹر", { positive: true });
  const d = d0 > 1 ? 1 / d0 : d0;
  const cfu = colonies / (V * d);
  const inRange = colonies >= 30 && colonies <= 300;
  const blocks = [];
  if (!inRange) blocks.push({ type: "note", tone: "warn", text: "کالونیوں کی تعداد قابلِ قبول حد 30 سے 300 سے باہر ہے، اس لیے نتیجہ تخمینی اور کم درست ہے۔" });
  return {
    results: [
      { label: "کالونی فارمنگ یونٹس کی تعداد", value: `${sci(cfu)} CFU/mL` },
      { label: "استعمال شدہ ڈائلیوشن فیکٹر", value: dilText(d) },
      { label: "گنتی کی حد", value: inRange ? "30 سے 300 کی حد کے اندر" : "30 سے 300 کی حد سے باہر" }
    ],
    steps: [
      d0 > 1 ? { text: "ان پٹ قدر 1 سے بڑی ہے، اس لیے اسے ڈائلیوشن کے معکوس کے طور پر لیا جاتا ہے:", tex: `d = \\frac{1}{${ntex(d0)}} = ${ntex(d)}` } : { text: "استعمال شدہ ڈائلیوشن فیکٹر:", tex: `d = ${ntex(d)}` },
      { text: "فی mL کالونی فارمنگ یونٹس:", tex: `\\frac{${colonies}}{${ntex(V)} \\times ${ntex(d)}} = ${ntex(cfu, 6)}\\ \\text{CFU/mL}` }
    ],
    copy: `${sci(cfu)} CFU/mL`,
    blocks
  };
}

function hemoMode(input) {
  const cells = num(input, "cells", "گنے گئے خلیے", { integer: true, nonNegative: true });
  const squares = num(input, "squares", "مربعوں کی تعداد", { integer: true, positive: true });
  const D = num(input, "dhemo", "ڈائلیوشن فیکٹر", { positive: true });
  if (D < 1) fail("ڈائلیوشن فیکٹر 1 یا اس سے زیادہ ہونا چاہیے۔", "dhemo");
  const avg = cells / squares;
  const cpm = avg * D * HEMO_VOLUME_FACTOR;
  return {
    results: [
      { label: "فی mL خلیوں کی تعداد", value: `${sci(cpm)} سیلز/mL` },
      { label: "ایک مربع میں خلیوں کا اوسط", value: fmt(avg, 4) }
    ],
    steps: [
      { text: "ایک بڑے مربع میں خلیوں کا اوسط:", tex: `\\frac{${cells}}{${squares}} = ${ntex(avg, 6)}` },
      { text: "ڈائلیوشن اور چیمبر کے حجم (10^4 mL) سے فی mL خلیوں میں تبدیلی:", tex: `${ntex(avg, 6)} \\times ${ntex(D)} \\times 10^4 = ${ntex(cpm, 6)}\\ \\text{cells/mL}` }
    ],
    copy: `${sci(cpm)} سیلز/mL`,
    blocks: [{ type: "note", text: "چیمبر کے ایک بڑے مربع کا حجم 1 mm × 1 mm × 0.1 mm = 0.1 µL = 10^-4 mL ہے، اس لیے اوسط کو 10^4 سے ضرب دیا جاتا ہے تاکہ فی mL خلیے حاصل ہوں۔" }]
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کا طریقہ", ["series", "cfu", "hemocytometer"], "series");
  if (mode === "cfu") return cfuMode(input);
  if (mode === "hemocytometer") return hemoMode(input);
  return seriesMode(input);
}
