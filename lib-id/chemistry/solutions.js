import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["molarity", "dilution", "percent", "molality", "ppm"];
const DIL = ["C1", "V1", "C2", "V2"];
const DIL_LABEL = { C1: "Konsentrasi awal C1", V1: "Volume awal V1", C2: "Konsentrasi akhir C2", V2: "Volume akhir V2" };
const EMPTY = { mass: "", molarMass: "", volume: "", solutionMass: "", solventKg: "", massMg: "", C1: "", V1: "", C2: "", V2: "" };
const sub = (k) => `${k[0]}_${k[1]}`;

export const meta = {
  description: "Hitung konsentrasi larutan dengan beberapa cara: konsentrasi molar dari massa, massa molar, dan volume; pengenceran C1V1 = C2V2 dengan mencari besaran yang tidak diketahui dari tiga nilai; persen massa; molalitas; atau ppm.",
  keywords: ["Konsentrasi", "konsentrasi molar", "molaritas", "molarity", "pengenceran", "dilution", "C1V1 = C2V2", "persen massa", "molalitas", "molality", "ppm", "bagian per juta", "larutan"],
  formulas: [
    { label: "Konsentrasi molar", tex: "C = \\frac{n}{V} = \\frac{m}{MV}" },
    { label: "Pengenceran", tex: "C_1V_1 = C_2V_2" },
    { label: "Persen massa", tex: "\\% = \\frac{m_{solute}}{m_{solution}} \\times 100" },
    { label: "Molalitas", tex: "b = \\frac{n}{m_{solvent}}" },
    { label: "bagian per juta", tex: "\\text{ppm} = \\frac{\\text{mg}}{\\text{L}}" }
  ],
  inputs: [
    { id: "mode", label: "Metode perhitungan", type: "select", default: "molarity", options: [["molarity", "Konsentrasi molar M"], ["dilution", "Pengenceran C1V1 = C2V2"], ["percent", "Persen massa"], ["molality", "Molalitas mol/kg"], ["ppm", "ppm (mg/L)"]] },
    { id: "mass", label: "Massa zat terlarut", unit: "g", type: "number", default: "58.44", when: { mode: ["molarity", "percent", "molality"] } },
    { id: "molarMass", label: "Massa molar zat terlarut M", unit: "g/mol", type: "number", default: "58.44", when: { mode: ["molarity", "molality"] } },
    { id: "volume", label: "Volume larutan", unit: "L", type: "number", default: "1", when: { mode: ["molarity", "ppm"] } },
    { id: "solutionMass", label: "Massa larutan total", unit: "g", type: "number", when: { mode: ["percent"] }, help: "Massa zat terlarut + massa pelarut." },
    { id: "solventKg", label: "Massa pelarut", unit: "kg", type: "number", when: { mode: ["molality"] } },
    { id: "massMg", label: "Massa zat terlarut", unit: "mg", type: "number", when: { mode: ["ppm"] } },
    { id: "C1", label: "Konsentrasi awal C1", unit: "M", type: "number", when: { mode: ["dilution"] }, help: "Masukkan tiga nilai dari C1, V1, C2, dan V2, lalu biarkan yang keempat kosong." },
    { id: "V1", label: "Volume awal V1", type: "number", when: { mode: ["dilution"] }, help: "Satuan volume apa pun, dengan syarat satuan yang sama digunakan untuk V1 dan V2." },
    { id: "C2", label: "Konsentrasi akhir C2", unit: "M", type: "number", when: { mode: ["dilution"] } },
    { id: "V2", label: "Volume akhir V2", type: "number", when: { mode: ["dilution"] } }
  ],
  example: { values: { ...EMPTY, mode: "molarity", mass: "58.44", molarMass: "58.44", volume: "1" }, expect: ["1 M"], note: "Contoh: 58.44 g NaCl (M = 58.44 g/mol) dalam 1 L." },
  invalid: { values: { ...EMPTY, mode: "dilution", C1: "1", V1: "1" } },
  related: ["ph-calculator", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function molarity(input) {
  const m = num(input, "mass", "Massa zat terlarut", { nonNegative: true });
  const M = num(input, "molarMass", "massa molar", { positive: true });
  const V = num(input, "volume", "Volume larutan", { positive: true });
  const n = m / M;
  const c = n / V;
  return {
    results: [
      { label: "Jumlah mol n", value: `${fmt(n, 5)} mol` },
      { label: "Konsentrasi molar", value: `${fmt(c, 5)} M` }
    ],
    steps: [
      { text: "Jumlah mol dari massa dan massa molar:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Konsentrasi molar = mol / volume dalam liter:", tex: `C = \\frac{n}{V} = \\frac{${ntex(n, 6)}}{${ntex(V)}} = ${ntex(c, 6)}\\ \\text{M}` }
    ],
    copy: `Konsentrasi molar = ${fmt(c, 5)} M`
  };
}

function dilution(input) {
  const blanks = DIL.filter((k) => isBlank(input[k]));
  const filled = DIL.length - blanks.length;
  if (filled !== 3) fail(`Masukkan tepat tiga nilai dan biarkan yang keempat kosong (Anda memasukkan ${filled}).`, filled < 3 ? blanks[0] : DIL.find((k) => !isBlank(input[k])));
  const unknown = blanks[0];
  const v = {};
  for (const k of DIL) if (k !== unknown) v[k] = num(input, k, DIL_LABEL[k], { positive: true });
  const [[a, b], d] = { C1: [["C2", "V2"], "V1"], V1: [["C2", "V2"], "C1"], C2: [["C1", "V1"], "V2"], V2: [["C1", "V1"], "C2"] }[unknown];
  const x = (v[a] * v[b]) / v[d];
  const unit = unknown[0] === "C" ? " M" : "";
  return {
    results: [{ label: `${DIL_LABEL[unknown]} yang dihitung`, value: `${fmt(x, 5)}${unit}` }],
    steps: [
      { text: "Hukum pengenceran: jumlah mol zat terlarut tidak berubah:", tex: "C_1V_1 = C_2V_2" },
      { text: `Kita hitung ${unknown} yang tidak diketahui:`, tex: `${sub(unknown)} = \\frac{${sub(a)}\\,${sub(b)}}{${sub(d)}} = \\frac{${ntex(v[a])} \\times ${ntex(v[b])}}{${ntex(v[d])}} = ${ntex(x, 6)}` }
    ],
    copy: `${unknown} = ${fmt(x, 5)}${unit}`
  };
}

function percent(input) {
  const m = num(input, "mass", "Massa zat terlarut", { nonNegative: true });
  const S = num(input, "solutionMass", "Massa larutan", { positive: true });
  if (m > S) fail("Massa zat terlarut tidak boleh melebihi massa larutan.", "mass");
  const p = (100 * m) / S;
  return {
    results: [{ label: "Persen massa", value: `${fmt(p, 5)} %` }],
    steps: [{ text: "Persen massa:", tex: `\\% = \\frac{m_{solute}}{m_{solution}} \\times 100 = \\frac{${ntex(m)}}{${ntex(S)}} \\times 100 = ${ntex(p, 6)}\\ \\%` }],
    copy: `Persen massa = ${fmt(p, 5)} %`
  };
}

function molality(input) {
  const m = num(input, "mass", "Massa zat terlarut", { nonNegative: true });
  const M = num(input, "molarMass", "massa molar", { positive: true });
  const kg = num(input, "solventKg", "Massa pelarut", { positive: true });
  const n = m / M;
  const b = n / kg;
  return {
    results: [
      { label: "Jumlah mol n", value: `${fmt(n, 5)} mol` },
      { label: "Molalitas", value: `${fmt(b, 5)} mol/kg` }
    ],
    steps: [
      { text: "Jumlah mol:", tex: `n = \\frac{m}{M} = \\frac{${ntex(m)}}{${ntex(M)}} = ${ntex(n, 6)}\\ \\text{mol}` },
      { text: "Molalitas = mol / massa pelarut dalam kilogram:", tex: `b = \\frac{n}{m_{solvent}} = \\frac{${ntex(n, 6)}}{${ntex(kg)}} = ${ntex(b, 6)}\\ \\text{mol/kg}` }
    ],
    copy: `Molalitas = ${fmt(b, 5)} mol/kg`
  };
}

function ppm(input) {
  const mg = num(input, "massMg", "Massa zat terlarut dalam mg", { nonNegative: true });
  const V = num(input, "volume", "Volume larutan", { positive: true });
  const p = mg / V;
  return {
    results: [{ label: "Konsentrasi dalam ppm", value: `${fmt(p, 5)} ppm (mg/L)` }],
    steps: [{ text: "ppm = mg zat terlarut / L larutan:", tex: `\\text{ppm} = \\frac{${ntex(mg)}\\ \\text{mg}}{${ntex(V)}\\ \\text{L}} = ${ntex(p, 6)}` }],
    copy: `Konsentrasi = ${fmt(p, 5)} ppm (mg/L)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Metode perhitungan", MODES, "molarity");
  if (mode === "molarity") return molarity(input);
  if (mode === "dilution") return dilution(input);
  if (mode === "percent") return percent(input);
  if (mode === "molality") return molality(input);
  return ppm(input);
}
