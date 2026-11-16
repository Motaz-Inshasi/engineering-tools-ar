import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["molarity", "dilution", "percent", "molality", "ppm"];
const DIL = ["C1", "V1", "C2", "V2"];
const DIL_LABEL = { C1: "غلظت اولیه C1", V1: "حجم اولیه V1", C2: "غلظت نهایی C2", V2: "حجم نهایی V2" };
const EMPTY = { mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const sub = (k) => `${k[0]}_${k[1]}`;

export const meta = {
  description: "محاسبه غلظت محلول به چند روش: غلظت مولی از جرم، جرم مولی و حجم، یا رقیق‌سازی C1V1 = C2V2 با یافتن مجهول از سه مقدار، یا درصد جرمی، مولالیته، یا ppm.",
  keywords: ["غلظت", "غلظت مولی", "مولاریته", "molarity", "رقیق‌سازی", "dilution", "C1V1 = C2V2", "درصد جرمی", "مولالیته", "molality", "ppm", "جزء در میلیون", "محلول"],
  formulas: [
    { label: "غلظت مولی", tex: "C = \\frac{n}{V} = \\frac{m}{MV}" },
    { label: "رقیق‌سازی", tex: "C_1V_1 = C_2V_2" },
    { label: "درصد جرمی", tex: "\\% = \\frac{m_{solute}}{m_{solution}} \\times 100" },
    { label: "مولالیته", tex: "b = \\frac{n}{m_{solvent}}" },
    { label: "جزء در میلیون", tex: "\\text{ppm} = \\frac{\\text{mg}}{\\text{L}}" }
  ],
  inputs: [
    { id: "mode", label: "روش محاسبه", type: "select", default: "molarity", options: [["molarity", "غلظت مولی M"], ["dilution", "رقیق‌سازی C1V1 = C2V2"], ["percent", "درصد جرمی"], ["molality", "مولالیته mol/kg"], ["ppm", "ppm (mg/L)"]] },
    { id: "mass", label: "جرم حل‌شونده", unit: "g", type: "number", default: "58.44", when: { mode: ["molarity", "percent", "molality"] } },
    { id: "molarMass", label: "جرم مولی حل‌شونده M", unit: "g/mol", type: "number", default: "58.44", when: { mode: ["molarity", "molality"] } },
    { id: "volume", label: "حجم محلول", unit: "L", type: "number", default: "1", when: { mode: ["molarity", "ppm"] } },
    { id: "solutionMass", label: "جرم کل محلول", unit: "g", type: "number", when: { mode: ["percent"] }, help: "جرم حل‌شونده + جرم حلال." },
    { id: "solventKg", label: "جرم حلال", unit: "kg", type: "number", when: { mode: ["molality"] } },
    { id: "massMg", label: "جرم حل‌شونده", unit: "mg", type: "number", when: { mode: ["ppm"] } },
    { id: "C1", label: "غلظت اولیه C1", unit: "M", type: "number", when: { mode: ["dilution"] }, help: "سه مقدار از C1 و V1 و C2 و V2 را وارد کنید و مقدار چهارم را خالی بگذارید." },
    { id: "V1", label: "حجم اولیه V1", type: "number", when: { mode: ["dilution"] }, help: "هر واحد حجمی، به شرط آنکه برای V1 و V2 یک واحد یکسان به کار رود." },
    { id: "C2", label: "غلظت نهایی C2", unit: "M", type: "number", when: { mode: ["dilution"] } },
    { id: "V2", label: "حجم نهایی V2", type: "number", when: { mode: ["dilution"] } }
  ],
  example: { values: { ...EMPTY, mode: "molarity", mass: "58.44", molarMass: "58.44", volume: "1" }, expect: ["1 M"], note: "مثال: 58.44 g از NaCl (M = 58.44 g/mol) در 1 L." },
  invalid: { values: { ...EMPTY, mode: "dilution", C1: "1", V1: "1" } },
  related: ["ph-calculator", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function molarity(input) {
  const m = num(input, "mass", "جرم حل‌شونده", { nonNegative: true });
  const M = num(input, "molarMass", "جرم مولی", { positive: true });
  const V = num(input, "volume", "حجم محلول", { positive: true });
  const n = m / M;
  const c = n / V;
  return {
    results: [
      { label: "تعداد مول n", value: `${fmt(n, 5)} mol` },
      { label: "غلظت مولی", value: `${fmt(c, 5)} M` }
    ],
    steps: [
      { text: "تعداد مول از جرم و جرم مولی:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "غلظت مولی = مول‌ها / حجم بر حسب لیتر:", tex: `C = \\frac{n}{V} = \\frac{${ntex(n, 6)}}{${ntex(V)}} = ${ntex(c, 6)}\\ \\text{M}` }
    ],
    copy: `غلظت مولی = ${fmt(c, 5)} M`
  };
}

function dilution(input) {
  const blanks = DIL.filter((k) => isBlank(input[k]));
  const filled = DIL.length - blanks.length;
  if (filled !== 3) fail(`دقیقاً سه مقدار وارد کنید و مقدار چهارم را خالی بگذارید (شما ${filled} مقدار وارد کرده‌اید).`, filled < 3 ? blanks[0] : DIL.find((k) => !isBlank(input[k])));
  const unknown = blanks[0];
  const v = {};
  for (const k of DIL) if (k !== unknown) v[k] = num(input, k, DIL_LABEL[k], { positive: true });
  const [[a, b], d] = { C1: [["C2", "V2"], "V1"], V1: [["C2", "V2"], "C1"], C2: [["C1", "V1"], "V2"], V2: [["C1", "V1"], "C2"] }[unknown];
  const x = (v[a] * v[b]) / v[d];
  const unit = unknown[0] === "C" ? " M" : "";
  return {
    results: [{ label: `${DIL_LABEL[unknown]} محاسبه‌شده`, value: `${fmt(x, 5)}${unit}` }],
    steps: [
      { text: "قانون رقیق‌سازی: تعداد مول‌های حل‌شونده تغییر نمی‌کند:", tex: "C_1V_1 = C_2V_2" },
      { text: `مجهول ${unknown} را محاسبه می‌کنیم:`, tex: `${sub(unknown)} = \\frac{${sub(a)}\\,${sub(b)}}{${sub(d)}} = \\frac{${ntex(v[a])} \\times ${ntex(v[b])}}{${ntex(v[d])}} = ${ntex(x, 6)}` }
    ],
    copy: `${unknown} = ${fmt(x, 5)}${unit}`
  };
}

function percent(input) {
  const m = num(input, "mass", "جرم حل‌شونده", { nonNegative: true });
  const S = num(input, "solutionMass", "جرم محلول", { positive: true });
  if (m > S) fail("جرم حل‌شونده نمی‌تواند از جرم محلول بیشتر باشد.", "mass");
  const p = (100 * m) / S;
  return {
    results: [{ label: "درصد جرمی", value: `${fmt(p, 5)} %` }],
    steps: [{ text: "درصد جرمی:", tex: `\\% = \\frac{m_{solute}}{m_{solution}} \\times 100 = \\frac{${ntex(m)}}{${ntex(S)}} \\times 100 = ${ntex(p, 6)}\\ \\%` }],
    copy: `درصد جرمی = ${fmt(p, 5)} %`
  };
}

function molality(input) {
  const m = num(input, "mass", "جرم حل‌شونده", { nonNegative: true });
  const M = num(input, "molarMass", "جرم مولی", { positive: true });
  const kg = num(input, "solventKg", "جرم حلال", { positive: true });
  const n = m / M;
  const b = n / kg;
  return {
    results: [
      { label: "تعداد مول n", value: `${fmt(n, 5)} mol` },
      { label: "مولالیته", value: `${fmt(b, 5)} mol/kg` }
    ],
    steps: [
      { text: "تعداد مول:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "مولالیته = مول‌ها / جرم حلال بر حسب کیلوگرم:", tex: `b = \\frac{n}{m_{solvent}} = \\frac{${ntex(n, 6)}}{${ntex(kg)}} = ${ntex(b, 6)}\\ \\text{mol/kg}` }
    ],
    copy: `مولالیته = ${fmt(b, 5)} mol/kg`
  };
}

function ppm(input) {
  const mg = num(input, "massMg", "جرم حل‌شونده بر حسب mg", { nonNegative: true });
  const V = num(input, "volume", "حجم محلول", { positive: true });
  const p = mg / V;
  return {
    results: [{ label: "غلظت بر حسب ppm", value: `${fmt(p, 5)} ppm (mg/L)` }],
    steps: [{ text: "ppm = mg حل‌شونده / L محلول:", tex: `\\text{ppm} = \\frac{${ntex(mg)}\\ \\text{mg}}{${ntex(V)}\\ \\text{L}} = ${ntex(p, 6)}` }],
    copy: `غلظت = ${fmt(p, 5)} ppm (mg/L)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "روش محاسبه", MODES, "molarity");
  if (mode === "molarity") return molarity(input);
  if (mode === "dilution") return dilution(input);
  if (mode === "percent") return percent(input);
  if (mode === "molality") return molality(input);
  return ppm(input);
}
