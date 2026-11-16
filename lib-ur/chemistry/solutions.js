import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["molarity", "dilution", "percent", "molality", "ppm"];
const DIL = ["C1", "V1", "C2", "V2"];
const DIL_LABEL = { C1: "ابتدائی ارتکاز C1", V1: "ابتدائی حجم V1", C2: "حتمی ارتکاز C2", V2: "حتمی حجم V2" };
const EMPTY = { mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const sub = (k) => `${k[0]}_${k[1]}`;

export const meta = {
  description: "محلول کا ارتکاز کئی طریقوں سے حساب کریں: کمیت، مولر کمیت اور حجم سے مولر ارتکاز، یا تین قدروں سے مجہول معلوم کر کے ڈائلیوشن C1V1 = C2V2، یا کمیتی فیصد، مولیلٹی، یا ppm۔",
  keywords: ["ارتکاز", "مولر ارتکاز", "مولیرٹی", "molarity", "ڈائلیوشن", "dilution", "C1V1 = C2V2", "کمیتی فیصد", "مولیلٹی", "molality", "ppm", "فی ملین حصے (ppm)", "محلول"],
  formulas: [
    { label: "مولر ارتکاز", tex: "C = \\frac{n}{V} = \\frac{m}{MV}" },
    { label: "ڈائلیوشن", tex: "C_1V_1 = C_2V_2" },
    { label: "کمیتی فیصد", tex: "\\% = \\frac{m_{solute}}{m_{solution}} \\times 100" },
    { label: "مولیلٹی", tex: "b = \\frac{n}{m_{solvent}}" },
    { label: "فی ملین حصے (ppm)", tex: "\\text{ppm} = \\frac{\\text{mg}}{\\text{L}}" }
  ],
  inputs: [
    { id: "mode", label: "حساب کا طریقہ", type: "select", default: "molarity", options: [["molarity", "مولر ارتکاز M"], ["dilution", "ڈائلیوشن C1V1 = C2V2"], ["percent", "کمیتی فیصد"], ["molality", "مولیلٹی mol/kg"], ["ppm", "ppm (mg/L)"]] },
    { id: "mass", label: "حل شدہ مادے کی کمیت", unit: "g", type: "number", default: "58.44", when: { mode: ["molarity", "percent", "molality"] } },
    { id: "molarMass", label: "حل شدہ مادے کی مولر کمیت M", unit: "g/mol", type: "number", default: "58.44", when: { mode: ["molarity", "molality"] } },
    { id: "volume", label: "محلول کا حجم", unit: "L", type: "number", default: "1", when: { mode: ["molarity", "ppm"] } },
    { id: "solutionMass", label: "محلول کی کل کمیت", unit: "g", type: "number", when: { mode: ["percent"] }, help: "حل شدہ مادے کی کمیت + محلل کی کمیت۔" },
    { id: "solventKg", label: "محلل کی کمیت", unit: "kg", type: "number", when: { mode: ["molality"] } },
    { id: "massMg", label: "حل شدہ مادے کی کمیت", unit: "mg", type: "number", when: { mode: ["ppm"] } },
    { id: "C1", label: "ابتدائی ارتکاز C1", unit: "M", type: "number", when: { mode: ["dilution"] }, help: "C1، V1، C2 اور V2 میں سے تین قدریں درج کریں اور چوتھی خالی چھوڑ دیں۔" },
    { id: "V1", label: "ابتدائی حجم V1", type: "number", when: { mode: ["dilution"] }, help: "کوئی بھی حجم کی اکائی، بشرطیکہ V1 اور V2 میں وہی اکائی استعمال ہو۔" },
    { id: "C2", label: "حتمی ارتکاز C2", unit: "M", type: "number", when: { mode: ["dilution"] } },
    { id: "V2", label: "حتمی حجم V2", type: "number", when: { mode: ["dilution"] } }
  ],
  example: { values: { ...EMPTY, mode: "molarity", mass: "58.44", molarMass: "58.44", volume: "1" }, expect: ["1 M"], note: "مثال: 1 L میں 58.44 g NaCl (M = 58.44 g/mol)۔" },
  invalid: { values: { ...EMPTY, mode: "dilution", C1: "1", V1: "1" } },
  related: ["ph-calculator", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function molarity(input) {
  const m = num(input, "mass", "حل شدہ مادے کی کمیت", { nonNegative: true });
  const M = num(input, "molarMass", "مولر کمیت", { positive: true });
  const V = num(input, "volume", "محلول کا حجم", { positive: true });
  const n = m / M;
  const c = n / V;
  return {
    results: [
      { label: "مولز کی تعداد n", value: `${fmt(n, 5)} mol` },
      { label: "مولر ارتکاز", value: `${fmt(c, 5)} M` }
    ],
    steps: [
      { text: "کمیت اور مولر کمیت سے مولز کی تعداد:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "مولر ارتکاز = مولز ÷ حجم (لیٹر میں):", tex: `C = \\frac{n}{V} = \\frac{${ntex(n, 6)}}{${ntex(V)}} = ${ntex(c, 6)}\\ \\text{M}` }
    ],
    copy: `مولر ارتکاز = ${fmt(c, 5)} M`
  };
}

function dilution(input) {
  const blanks = DIL.filter((k) => isBlank(input[k]));
  const filled = DIL.length - blanks.length;
  if (filled !== 3) fail(`بالکل تین قدریں درج کریں اور چوتھی خالی چھوڑیں (آپ نے ${filled} درج کیں)۔`, filled < 3 ? blanks[0] : DIL.find((k) => !isBlank(input[k])));
  const unknown = blanks[0];
  const v = {};
  for (const k of DIL) if (k !== unknown) v[k] = num(input, k, DIL_LABEL[k], { positive: true });
  const [[a, b], d] = { C1: [["C2", "V2"], "V1"], V1: [["C2", "V2"], "C1"], C2: [["C1", "V1"], "V2"], V2: [["C1", "V1"], "C2"] }[unknown];
  const x = (v[a] * v[b]) / v[d];
  const unit = unknown[0] === "C" ? " M" : "";
  return {
    results: [{ label: `حساب شدہ ${DIL_LABEL[unknown]}`, value: `${fmt(x, 5)}${unit}` }],
    steps: [
      { text: "ڈائلیوشن کا قانون: حل شدہ مادے کے مولز تبدیل نہیں ہوتے:", tex: "C_1V_1 = C_2V_2" },
      { text: `ہم مجہول ${unknown} حساب کرتے ہیں:`, tex: `${sub(unknown)} = \\frac{${sub(a)}\\,${sub(b)}}{${sub(d)}} = \\frac{${ntex(v[a])} \\times ${ntex(v[b])}}{${ntex(v[d])}} = ${ntex(x, 6)}` }
    ],
    copy: `${unknown} = ${fmt(x, 5)}${unit}`
  };
}

function percent(input) {
  const m = num(input, "mass", "حل شدہ مادے کی کمیت", { nonNegative: true });
  const S = num(input, "solutionMass", "محلول کی کمیت", { positive: true });
  if (m > S) fail("حل شدہ مادے کی کمیت محلول کی کمیت سے زیادہ نہیں ہو سکتی۔", "mass");
  const p = (100 * m) / S;
  return {
    results: [{ label: "کمیتی فیصد", value: `${fmt(p, 5)} %` }],
    steps: [{ text: "کمیتی فیصد:", tex: `\\% = \\frac{m_{solute}}{m_{solution}} \\times 100 = \\frac{${ntex(m)}}{${ntex(S)}} \\times 100 = ${ntex(p, 6)}\\ \\%` }],
    copy: `کمیتی فیصد = ${fmt(p, 5)} %`
  };
}

function molality(input) {
  const m = num(input, "mass", "حل شدہ مادے کی کمیت", { nonNegative: true });
  const M = num(input, "molarMass", "مولر کمیت", { positive: true });
  const kg = num(input, "solventKg", "محلل کی کمیت", { positive: true });
  const n = m / M;
  const b = n / kg;
  return {
    results: [
      { label: "مولز کی تعداد n", value: `${fmt(n, 5)} mol` },
      { label: "مولیلٹی", value: `${fmt(b, 5)} mol/kg` }
    ],
    steps: [
      { text: "مولز کی تعداد:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "مولیلٹی = مولز ÷ محلل کی کمیت (کلوگرام میں):", tex: `b = \\frac{n}{m_{solvent}} = \\frac{${ntex(n, 6)}}{${ntex(kg)}} = ${ntex(b, 6)}\\ \\text{mol/kg}` }
    ],
    copy: `مولیلٹی = ${fmt(b, 5)} mol/kg`
  };
}

function ppm(input) {
  const mg = num(input, "massMg", "حل شدہ مادے کی کمیت mg میں", { nonNegative: true });
  const V = num(input, "volume", "محلول کا حجم", { positive: true });
  const p = mg / V;
  return {
    results: [{ label: "ppm میں ارتکاز", value: `${fmt(p, 5)} ppm (mg/L)` }],
    steps: [{ text: "ppm = حل شدہ مادے کے mg ÷ محلول کے لیٹر:", tex: `\\text{ppm} = \\frac{${ntex(mg)}\\ \\text{mg}}{${ntex(V)}\\ \\text{L}} = ${ntex(p, 6)}` }],
    copy: `ارتکاز = ${fmt(p, 5)} ppm (mg/L)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کا طریقہ", MODES, "molarity");
  if (mode === "molarity") return molarity(input);
  if (mode === "dilution") return dilution(input);
  if (mode === "percent") return percent(input);
  if (mode === "molality") return molality(input);
  return ppm(input);
}
