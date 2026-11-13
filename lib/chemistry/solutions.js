import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["molarity", "dilution", "percent", "molality", "ppm"];
const DIL = ["C1", "V1", "C2", "V2"];
const DIL_LABEL = { C1: "التركيز الابتدائي C1", V1: "الحجم الابتدائي V1", C2: "التركيز النهائي C2", V2: "الحجم النهائي V2" };
const EMPTY = { mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const sub = (k) => `${k[0]}_${k[1]}`;

export const meta = {
  description: "احسب تركيز المحلول بعدة طرق: التركيز المولي من الكتلة والكتلة المولية والحجم، أو التخفيف C1V1 = C2V2 بإيجاد المجهول من ثلاث قيم، أو النسبة المئوية الكتلية، أو المولالية، أو ppm.",
  keywords: ["تركيز", "تركيز مولي", "مولارية", "molarity", "تخفيف", "dilution", "C1V1 = C2V2", "نسبة مئوية كتلية", "مولالية", "molality", "ppm", "جزء في المليون", "محلول"],
  formulas: [
    { label: "التركيز المولي", tex: "C = \\frac{n}{V} = \\frac{m}{MV}" },
    { label: "التخفيف", tex: "C_1V_1 = C_2V_2" },
    { label: "النسبة الكتلية", tex: "\\% = \\frac{m_{solute}}{m_{solution}} \\times 100" },
    { label: "المولالية", tex: "b = \\frac{n}{m_{solvent}}" },
    { label: "جزء في المليون", tex: "\\text{ppm} = \\frac{\\text{mg}}{\\text{L}}" }
  ],
  inputs: [
    { id: "mode", label: "طريقة الحساب", type: "select", default: "molarity", options: [["molarity", "التركيز المولي M"], ["dilution", "التخفيف C1V1 = C2V2"], ["percent", "النسبة المئوية الكتلية"], ["molality", "المولالية mol/kg"], ["ppm", "ppm (ملغ/لتر)"]] },
    { id: "mass", label: "كتلة المذاب", unit: "g", type: "number", default: "58.44", when: { mode: ["molarity", "percent", "molality"] } },
    { id: "molarMass", label: "الكتلة المولية للمذاب M", unit: "g/mol", type: "number", default: "58.44", when: { mode: ["molarity", "molality"] } },
    { id: "volume", label: "حجم المحلول", unit: "L", type: "number", default: "1", when: { mode: ["molarity", "ppm"] } },
    { id: "solutionMass", label: "كتلة المحلول الكلية", unit: "g", type: "number", when: { mode: ["percent"] }, help: "كتلة المذاب + كتلة المذيب." },
    { id: "solventKg", label: "كتلة المذيب", unit: "kg", type: "number", when: { mode: ["molality"] } },
    { id: "massMg", label: "كتلة المذاب", unit: "mg", type: "number", when: { mode: ["ppm"] } },
    { id: "C1", label: "التركيز الابتدائي C1", unit: "M", type: "number", when: { mode: ["dilution"] }, help: "أدخل ثلاث قيم من C1 وV1 وC2 وV2 واترك الرابعة فارغة." },
    { id: "V1", label: "الحجم الابتدائي V1", type: "number", when: { mode: ["dilution"] }, help: "أي وحدة حجم، بشرط استخدامها نفسها في V1 وV2." },
    { id: "C2", label: "التركيز النهائي C2", unit: "M", type: "number", when: { mode: ["dilution"] } },
    { id: "V2", label: "الحجم النهائي V2", type: "number", when: { mode: ["dilution"] } }
  ],
  example: { values: { ...EMPTY, mode: "molarity", mass: "58.44", molarMass: "58.44", volume: "1" }, expect: ["1 M"], note: "مثال: 58.44 g من NaCl (M = 58.44 g/mol) في 1 L." },
  invalid: { values: { ...EMPTY, mode: "dilution", C1: "1", V1: "1" } },
  related: ["ph-calculator", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function molarity(input) {
  const m = num(input, "mass", "كتلة المذاب", { nonNegative: true });
  const M = num(input, "molarMass", "الكتلة المولية", { positive: true });
  const V = num(input, "volume", "حجم المحلول", { positive: true });
  const n = m / M;
  const c = n / V;
  return {
    results: [
      { label: "عدد المولات n", value: `${fmt(n, 5)} mol` },
      { label: "التركيز المولي", value: `${fmt(c, 5)} M` }
    ],
    steps: [
      { text: "عدد المولات من الكتلة والكتلة المولية:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "التركيز المولي = المولات / الحجم باللتر:", tex: `C = \\frac{n}{V} = \\frac{${ntex(n, 6)}}{${ntex(V)}} = ${ntex(c, 6)}\\ \\text{M}` }
    ],
    copy: `التركيز المولي = ${fmt(c, 5)} M`
  };
}

function dilution(input) {
  const blanks = DIL.filter((k) => isBlank(input[k]));
  const filled = DIL.length - blanks.length;
  if (filled !== 3) fail(`أدخل ثلاث قيم بالضبط واترك الرابعة فارغة (أدخلت ${filled}).`, filled < 3 ? blanks[0] : DIL.find((k) => !isBlank(input[k])));
  const unknown = blanks[0];
  const v = {};
  for (const k of DIL) if (k !== unknown) v[k] = num(input, k, DIL_LABEL[k], { positive: true });
  const [[a, b], d] = { C1: [["C2", "V2"], "V1"], V1: [["C2", "V2"], "C1"], C2: [["C1", "V1"], "V2"], V2: [["C1", "V1"], "C2"] }[unknown];
  const x = (v[a] * v[b]) / v[d];
  const unit = unknown[0] === "C" ? " M" : "";
  return {
    results: [{ label: `${DIL_LABEL[unknown]} المحسوب`, value: `${fmt(x, 5)}${unit}` }],
    steps: [
      { text: "قانون التخفيف، عدد مولات المذاب لا يتغير:", tex: "C_1V_1 = C_2V_2" },
      { text: `نحسب ${unknown} المجهول:`, tex: `${sub(unknown)} = \\frac{${sub(a)}\\,${sub(b)}}{${sub(d)}} = \\frac{${ntex(v[a])} \\times ${ntex(v[b])}}{${ntex(v[d])}} = ${ntex(x, 6)}` }
    ],
    copy: `${unknown} = ${fmt(x, 5)}${unit}`
  };
}

function percent(input) {
  const m = num(input, "mass", "كتلة المذاب", { nonNegative: true });
  const S = num(input, "solutionMass", "كتلة المحلول", { positive: true });
  if (m > S) fail("كتلة المذاب لا يمكن أن تتجاوز كتلة المحلول.", "mass");
  const p = (100 * m) / S;
  return {
    results: [{ label: "النسبة المئوية الكتلية", value: `${fmt(p, 5)} %` }],
    steps: [{ text: "النسبة الكتلية:", tex: `\\% = \\frac{m_{solute}}{m_{solution}} \\times 100 = \\frac{${ntex(m)}}{${ntex(S)}} \\times 100 = ${ntex(p, 6)}\\ \\%` }],
    copy: `النسبة الكتلية = ${fmt(p, 5)} %`
  };
}

function molality(input) {
  const m = num(input, "mass", "كتلة المذاب", { nonNegative: true });
  const M = num(input, "molarMass", "الكتلة المولية", { positive: true });
  const kg = num(input, "solventKg", "كتلة المذيب", { positive: true });
  const n = m / M;
  const b = n / kg;
  return {
    results: [
      { label: "عدد المولات n", value: `${fmt(n, 5)} mol` },
      { label: "المولالية", value: `${fmt(b, 5)} mol/kg` }
    ],
    steps: [
      { text: "عدد المولات:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "المولالية = المولات / كتلة المذيب بالكيلوغرام:", tex: `b = \\frac{n}{m_{solvent}} = \\frac{${ntex(n, 6)}}{${ntex(kg)}} = ${ntex(b, 6)}\\ \\text{mol/kg}` }
    ],
    copy: `المولالية = ${fmt(b, 5)} mol/kg`
  };
}

function ppm(input) {
  const mg = num(input, "massMg", "كتلة المذاب بالملغ", { nonNegative: true });
  const V = num(input, "volume", "حجم المحلول", { positive: true });
  const p = mg / V;
  return {
    results: [{ label: "التركيز بالـ ppm", value: `${fmt(p, 5)} ppm (mg/L)` }],
    steps: [{ text: "ppm = ملغ المذاب / لتر المحلول:", tex: `\\text{ppm} = \\frac{${ntex(mg)}\\ \\text{mg}}{${ntex(V)}\\ \\text{L}} = ${ntex(p, 6)}` }],
    copy: `التركيز = ${fmt(p, 5)} ppm (mg/L)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "طريقة الحساب", MODES, "molarity");
  if (mode === "molarity") return molarity(input);
  if (mode === "dilution") return dilution(input);
  if (mode === "percent") return percent(input);
  if (mode === "molality") return molality(input);
  return ppm(input);
}
