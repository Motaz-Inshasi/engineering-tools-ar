import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["molarity", "dilution", "percent", "molality", "ppm"];
const DIL = ["C1", "V1", "C2", "V2"];
const DIL_LABEL = { C1: "Başlangıç derişimi C1", V1: "Başlangıç hacmi V1", C2: "Son derişim C2", V2: "Son hacim V2" };
const EMPTY = { mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const sub = (k) => `${k[0]}_${k[1]}`;

export const meta = {
  description: "Çözelti derişimini birkaç yolla hesaplayın: kütle, molar kütle ve hacimden molar derişim; ya da C1V1 = C2V2 seyreltmesiyle üç değerden bilinmeyeni bulma; kütlece yüzde, molalite veya ppm.",
  keywords: ["derişim", "molar derişim", "molarite", "molarity", "seyreltme", "dilution", "C1V1 = C2V2", "kütlece yüzde", "molalite", "molality", "ppm", "milyonda bir (ppm)", "çözelti"],
  formulas: [
    { label: "Molar derişim", tex: "C = \\frac{n}{V} = \\frac{m}{MV}" },
    { label: "Seyreltme", tex: "C_1V_1 = C_2V_2" },
    { label: "Kütlece yüzde", tex: "\\% = \\frac{m_{solute}}{m_{solution}} \\times 100" },
    { label: "Molalite", tex: "b = \\frac{n}{m_{solvent}}" },
    { label: "milyonda bir (ppm)", tex: "\\text{ppm} = \\frac{\\text{mg}}{\\text{L}}" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama yöntemi", type: "select", default: "molarity", options: [["molarity", "Molar derişim M"], ["dilution", "Seyreltme C1V1 = C2V2"], ["percent", "Kütlece yüzde"], ["molality", "Molalite mol/kg"], ["ppm", "ppm (mg/L)"]] },
    { id: "mass", label: "Çözünen kütlesi", unit: "g", type: "number", default: "58.44", when: { mode: ["molarity", "percent", "molality"] } },
    { id: "molarMass", label: "Çözünenin molar kütlesi M", unit: "g/mol", type: "number", default: "58.44", when: { mode: ["molarity", "molality"] } },
    { id: "volume", label: "Çözelti hacmi", unit: "L", type: "number", default: "1", when: { mode: ["molarity", "ppm"] } },
    { id: "solutionMass", label: "Toplam çözelti kütlesi", unit: "g", type: "number", when: { mode: ["percent"] }, help: "Çözünen kütlesi + çözücü kütlesi." },
    { id: "solventKg", label: "Çözücü kütlesi", unit: "kg", type: "number", when: { mode: ["molality"] } },
    { id: "massMg", label: "Çözünen kütlesi", unit: "mg", type: "number", when: { mode: ["ppm"] } },
    { id: "C1", label: "Başlangıç derişimi C1", unit: "M", type: "number", when: { mode: ["dilution"] }, help: "C1, V1, C2 ve V2 değerlerinden üçünü girin, dördüncüsünü boş bırakın." },
    { id: "V1", label: "Başlangıç hacmi V1", type: "number", when: { mode: ["dilution"] }, help: "Herhangi bir hacim birimi; V1 ve V2'de aynı birimi kullanmak koşuluyla." },
    { id: "C2", label: "Son derişim C2", unit: "M", type: "number", when: { mode: ["dilution"] } },
    { id: "V2", label: "Son hacim V2", type: "number", when: { mode: ["dilution"] } }
  ],
  example: { values: { ...EMPTY, mode: "molarity", mass: "58.44", molarMass: "58.44", volume: "1" }, expect: ["1 M"], note: "Örnek: 1 L'de 58.44 g NaCl (M = 58.44 g/mol)." },
  invalid: { values: { ...EMPTY, mode: "dilution", C1: "1", V1: "1" } },
  related: ["ph-calculator", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function molarity(input) {
  const m = num(input, "mass", "Çözünen kütlesi", { nonNegative: true });
  const M = num(input, "molarMass", "Molar kütle", { positive: true });
  const V = num(input, "volume", "Çözelti hacmi", { positive: true });
  const n = m / M;
  const c = n / V;
  return {
    results: [
      { label: "Mol sayısı n", value: `${fmt(n, 5)} mol` },
      { label: "Molar derişim", value: `${fmt(c, 5)} M` }
    ],
    steps: [
      { text: "Kütle ve molar kütleden mol sayısı:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Molar derişim = mol / hacim (litre cinsinden):", tex: `C = \\frac{n}{V} = \\frac{${ntex(n, 6)}}{${ntex(V)}} = ${ntex(c, 6)}\\ \\text{M}` }
    ],
    copy: `Molar derişim = ${fmt(c, 5)} M`
  };
}

function dilution(input) {
  const blanks = DIL.filter((k) => isBlank(input[k]));
  const filled = DIL.length - blanks.length;
  if (filled !== 3) fail(`Tam olarak üç değer girin ve dördüncüyü boş bırakın (girdiniz: ${filled}).`, filled < 3 ? blanks[0] : DIL.find((k) => !isBlank(input[k])));
  const unknown = blanks[0];
  const v = {};
  for (const k of DIL) if (k !== unknown) v[k] = num(input, k, DIL_LABEL[k], { positive: true });
  const [[a, b], d] = { C1: [["C2", "V2"], "V1"], V1: [["C2", "V2"], "C1"], C2: [["C1", "V1"], "V2"], V2: [["C1", "V1"], "C2"] }[unknown];
  const x = (v[a] * v[b]) / v[d];
  const unit = unknown[0] === "C" ? " M" : "";
  return {
    results: [{ label: `Hesaplanan ${DIL_LABEL[unknown]}`, value: `${fmt(x, 5)}${unit}` }],
    steps: [
      { text: "Seyreltme kanunu; çözünen mol sayısı değişmez:", tex: "C_1V_1 = C_2V_2" },
      { text: `Bilinmeyen ${unknown} hesaplanıyor:`, tex: `${sub(unknown)} = \\frac{${sub(a)}\\,${sub(b)}}{${sub(d)}} = \\frac{${ntex(v[a])} \\times ${ntex(v[b])}}{${ntex(v[d])}} = ${ntex(x, 6)}` }
    ],
    copy: `${unknown} = ${fmt(x, 5)}${unit}`
  };
}

function percent(input) {
  const m = num(input, "mass", "Çözünen kütlesi", { nonNegative: true });
  const S = num(input, "solutionMass", "Çözelti kütlesi", { positive: true });
  if (m > S) fail("Çözünen kütlesi çözelti kütlesini aşamaz.", "mass");
  const p = (100 * m) / S;
  return {
    results: [{ label: "Kütlece yüzde", value: `${fmt(p, 5)} %` }],
    steps: [{ text: "Kütlece yüzde:", tex: `\\% = \\frac{m_{solute}}{m_{solution}} \\times 100 = \\frac{${ntex(m)}}{${ntex(S)}} \\times 100 = ${ntex(p, 6)}\\ \\%` }],
    copy: `Kütlece yüzde = ${fmt(p, 5)} %`
  };
}

function molality(input) {
  const m = num(input, "mass", "Çözünen kütlesi", { nonNegative: true });
  const M = num(input, "molarMass", "Molar kütle", { positive: true });
  const kg = num(input, "solventKg", "Çözücü kütlesi", { positive: true });
  const n = m / M;
  const b = n / kg;
  return {
    results: [
      { label: "Mol sayısı n", value: `${fmt(n, 5)} mol` },
      { label: "Molalite", value: `${fmt(b, 5)} mol/kg` }
    ],
    steps: [
      { text: "Mol sayısı:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Molalite = mol / çözücü kütlesi (kilogram cinsinden):", tex: `b = \\frac{n}{m_{solvent}} = \\frac{${ntex(n, 6)}}{${ntex(kg)}} = ${ntex(b, 6)}\\ \\text{mol/kg}` }
    ],
    copy: `Molalite = ${fmt(b, 5)} mol/kg`
  };
}

function ppm(input) {
  const mg = num(input, "massMg", "Çözünen kütlesi (mg)", { nonNegative: true });
  const V = num(input, "volume", "Çözelti hacmi", { positive: true });
  const p = mg / V;
  return {
    results: [{ label: "Derişim ppm cinsinden", value: `${fmt(p, 5)} ppm (mg/L)` }],
    steps: [{ text: "ppm = çözünen (mg) / çözelti (L):", tex: `\\text{ppm} = \\frac{${ntex(mg)}\\ \\text{mg}}{${ntex(V)}\\ \\text{L}} = ${ntex(p, 6)}` }],
    copy: `Derişim = ${fmt(p, 5)} ppm (mg/L)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama yöntemi", MODES, "molarity");
  if (mode === "molarity") return molarity(input);
  if (mode === "dilution") return dilution(input);
  if (mode === "percent") return percent(input);
  if (mode === "molality") return molality(input);
  return ppm(input);
}
