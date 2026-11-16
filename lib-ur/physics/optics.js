import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "عدسے اور آئینے کی مساوات سے عکس کی جگہ، تکبیر، قسم، سمت اور عدسے کی طاقت، یا سنیل کے قانون سے روشنی کا زاویۂ انعطاف، حدی زاویے اور اندرونی کلی انعکاس کے ساتھ حساب کریں۔",
  keywords: ["عدسہ", "آئینہ", "فوکل لمبائی", "عدسے کی مساوات", "تکبیر", "عدسے کی طاقت", "ڈائیاپٹر", "سنیل کا قانون", "انعطاف", "اندرونی کلی انعکاس", "lens", "mirror", "snell"],
  formulas: [
    { label: "عدسے اور آئینے کی مساوات", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i},\\qquad m = -\\frac{d_i}{d_o},\\qquad P = \\frac{1}{f}" },
    { label: "سنیل کا قانون", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2,\\qquad \\theta_c = \\sin^{-1}\\frac{n_2}{n_1}" }
  ],
  inputs: [
    { id: "mode", label: "سوال کی قسم", type: "select", default: "lens", options: [["lens", "عدسے اور آئینے"], ["snell", "روشنی کا انعطاف (سنیل)"]] },
    { id: "ot", label: "عنصر کی قسم", type: "select", default: "lens", options: [["lens", "عدسہ"], ["mirror", "آئینہ"]], when: { mode: ["lens"] }, help: "مثبت f: مجمع عدسہ یا مقعر آئینہ۔ منفی f: مفرق عدسہ یا محدب آئینہ۔" },
    { id: "f", label: "فوکل لمبائی f", unit: "m", type: "number", default: "0.1", when: { mode: ["lens"] }, help: "مفرق عدسے یا محدب آئینے کے لیے منفی f درج کریں۔" },
    { id: "do", label: "شے کا فاصلہ do", unit: "m", type: "number", default: "0.3", when: { mode: ["lens"] } },
    { id: "n1", label: "انعطافی اشاریہ n1", type: "number", default: "1", when: { mode: ["snell"] }, help: "ہوا ≈ 1، پانی ≈ 1.33، شیشہ ≈ 1.5۔" },
    { id: "th1", label: "زاویۂ وقوع θ1", unit: "°", type: "number", default: "30", when: { mode: ["snell"] }, help: "سطح کے عمود سے ناپا جاتا ہے۔" },
    { id: "n2", label: "انعطافی اشاریہ n2", type: "number", default: "1.5", when: { mode: ["snell"] } }
  ],
  example: {
    values: { mode: "snell", ot: "lens", f: "0.1", do: "0.3", n1: "1", th1: "30", n2: "1.5" },
    expect: ["θ2 = 19.47°"],
    note: "مثال: 30° زاویۂ وقوع پر ہوا سے شیشے کی طرف سفر کرنے والی روشنی۔"
  },
  invalid: { values: { mode: "lens", ot: "lens", f: "0", do: "0.3", n1: "1", th1: "30", n2: "1.5" } },
  related: ["waves-doppler", "harmonic-motion", "unit-converter", "formulas-constants"]
};

function lens(input) {
  const ot = choice(input, "ot", "عنصر کی قسم", ["lens", "mirror"], "lens");
  const f = num(input, "f", "فوکل لمبائی f", { nonZero: true });
  const d = num(input, "do", "شے کا فاصلہ do", { positive: true });
  const el = ot === "lens" ? "عدسہ" : "آئینہ";
  const power = 1 / f;
  const steps = [{ text: "عدسے اور آئینے کی مساوات:", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}" }];
  const results = [];
  const blocks = [];
  let copy;
  if (Math.abs(d - f) <= 1e-12 * Math.abs(f)) {
    steps.push({ text: "جب شے کا فاصلہ فوکل لمبائی کے برابر ہو تو عکس لامحدودیت پر ہوتا ہے:", tex: "\\frac{1}{d_i} = \\frac{1}{f} - \\frac{1}{d_o} = 0" });
    results.push({ label: `${el} سے عکس کا فاصلہ di`, value: "لامحدودیت پر" });
    blocks.push({ type: "note", tone: "warn", text: "شے بالکل فوکس پر ہے، اس لیے نکلنے والی شعاعیں متوازی ہیں اور آپس میں نہیں ملتیں، لہٰذا محدود جگہ والا کوئی عکس نہیں ہے۔" });
    copy = `لامحدودیت پر عکس (شے فوکس پر)`;
  } else {
    const di = f * d / (d - f);
    const m = -di / d;
    const type = di > 0 ? "حقیقی" : "مجازی";
    const dir = m > 0 ? "سیدھا" : "الٹا";
    const size = Math.abs(m) > 1 ? "بڑا" : Math.abs(m) < 1 ? "چھوٹا" : "اسی جسامت کا";
    steps.push(
      { text: "عکس کا فاصلہ:", tex: `d_i = \\frac{f\\,d_o}{d_o - f} = \\frac{${ntex(f)} \\times ${ntex(d)}}{${ntex(d)} - ${ntex(f)}} = ${ntex(di, 6)}\\ m` },
      { text: "تکبیر:", tex: `m = -\\frac{d_i}{d_o} = ${ntex(m, 6)}` }
    );
    results.push(
      { label: `${el} سے عکس کا فاصلہ di`, value: `${fmt(di, 4)} m` },
      { label: "عکس کی قسم", value: type },
      { label: "عکس کی سمت", value: dir },
      { label: "عکس کی جسامت", value: size },
      { label: "تکبیر m", value: fmt(m, 4) }
    );
    copy = `di = ${fmt(di, 4)} m, m = ${fmt(m, 4)} (${type}، ${dir}، ${size})`;
  }
  steps.push({ text: "ڈائیاپٹر میں عدسے کی طاقت:", tex: `P = \\frac{1}{f} = ${ntex(power, 6)}\\ D` });
  results.push({ label: "طاقت P = 1/f", value: `${fmt(power, 4)} D` });
  return { results, steps, blocks, copy: `${copy}, P = ${fmt(power, 4)} D` };
}

function snell(input) {
  const n1 = num(input, "n1", "انعطافی اشاریہ n1", { positive: true });
  const th1 = num(input, "th1", "زاویۂ وقوع θ1", { nonNegative: true, below: 90 });
  const n2 = num(input, "n2", "انعطافی اشاریہ n2", { positive: true });
  const s = n1 * Math.sin(th1 * DEG) / n2;
  const steps = [{ text: "سنیل کا قانون:", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2" }];
  const results = [];
  const blocks = [];
  const crit = n1 > n2 ? Math.asin(n2 / n1) / DEG : null;
  results.push({ label: "حدی زاویہ θc", value: crit === null ? "کوئی نہیں (n1 ≤ n2)" : `${fmt(crit, 4)}°` });
  let copy;
  if (s > 1) {
    steps.push({ text: "sin θ2 ایک سے زیادہ ہے، یعنی کوئی زاویۂ انعطاف موجود نہیں:", tex: `\\sin\\theta_2 = \\frac{${ntex(n1)}\\sin ${ntex(th1)}^\\circ}{${ntex(n2)}} = ${ntex(s, 6)} > 1` });
    results.push({ label: "زاویۂ انعطاف θ2", value: "کوئی نہیں (اندرونی کلی انعکاس)" });
    blocks.push({ type: "note", tone: "warn", text: "اندرونی کلی انعکاس: روشنی دوسرے ماحول میں نہیں جاتی بلکہ گھنے ماحول کے اندر مکمل طور پر منعکس ہو جاتی ہے۔" });
    copy = `θ1 = ${fmt(th1, 4)}° پر اندرونی کلی انعکاس`;
  } else {
    const th2 = Math.asin(s) / DEG;
    steps.push({ text: "زاویۂ انعطاف:", tex: `\\sin\\theta_2 = ${ntex(s, 6)},\\quad \\theta_2 = ${ntex(th2, 6)}^\\circ` });
    results.push({ label: "زاویۂ انعطاف θ2", value: `${fmt(th2, 4)}°` });
    copy = `θ2 = ${fmt(th2, 4)}°`;
  }
  if (crit !== null) {
    steps.push({ text: "حدی زاویہ (کیونکہ n1 > n2):", tex: `\\theta_c = \\sin^{-1}\\frac{${ntex(n2)}}{${ntex(n1)}} = ${ntex(crit, 6)}^\\circ` });
    copy += `, θc = ${fmt(crit, 4)}°`;
  }
  return { results, steps, blocks, copy };
}

export function solve(input) {
  const mode = choice(input, "mode", "سوال کی قسم", ["lens", "snell"], "lens");
  return mode === "snell" ? snell(input) : lens(input);
}
