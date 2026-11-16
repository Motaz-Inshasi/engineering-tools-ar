import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Analisis bias transistor BJT tipe NPN dengan pembagi tegangan atau bias tetap: arus basis, kolektor, dan emitor, tegangan VCE, titik kerja, dan daerah operasi (aktif, saturasi, cutoff).",
  keywords: ["transistor", "BJT", "bias", "bias", "titik kerja", "Q-point", "pembagi tegangan", "saturasi", "beta"],
  formulas: [
    { label: "Bias pembagi tegangan (ekivalen Thevenin untuk basis)", tex: "V_{BB} = V_{CC}\\frac{R_2}{R_1 + R_2},\\quad R_{BB} = R_1 \\parallel R_2,\\quad I_B = \\frac{V_{BB} - V_{BE}}{R_{BB} + (\\beta + 1)R_E}" },
    { label: "titik kerja", tex: "I_C = \\beta I_B,\\quad V_{CE} = V_{CC} - I_C R_C - I_E R_E" }
  ],
  inputs: [
    { id: "cfg", label: "Metode bias", type: "select", default: "divider", options: [["divider", "pembagi tegangan"], ["fixed", "Bias tetap (RB)"]] },
    { id: "Vcc", label: "VCC", unit: "V", type: "number", default: "12" },
    { id: "R1", label: "R1 (dari VCC ke basis)", unit: "Ω", type: "number", default: "47k", when: { cfg: ["divider"] } },
    { id: "R2", label: "R2 (dari basis ke ground)", unit: "Ω", type: "number", default: "10k", when: { cfg: ["divider"] } },
    { id: "RB", label: "RB", unit: "Ω", type: "number", default: "470k", when: { cfg: ["fixed"] } },
    { id: "RC", label: "RC", unit: "Ω", type: "number", default: "2.2k" },
    { id: "RE", label: "RE", unit: "Ω", type: "number", default: "470" },
    { id: "beta", label: "Penguatan arus β", type: "number", default: "100" },
    { id: "Vbe", label: "VBE", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "100", Vbe: "0.7" }, expect: ["IC = 2.522 mA", "VCE = 5.254 V"], note: "Contoh: pembagi 47k/10k dari 12 V, RC = 2.2k, RE = 470 Ω, dan β = 100." },
  invalid: { values: { cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "0", Vbe: "0.7" } },
  related: ["mosfet", "op-amp", "thevenin-norton", "voltage-current-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "Metode bias", ["divider", "fixed"], "divider");
  const Vcc = num(input, "Vcc", "VCC", { positive: true });
  const RC = num(input, "RC", "RC", { nonNegative: true });
  const RE = num(input, "RE", "RE", { nonNegative: true });
  const beta = num(input, "beta", "β", { positive: true });
  const Vbe = num(input, "Vbe", "VBE", { nonNegative: true, default: 0.7 });
  const VCEsat = 0.2;
  let VBB, RBB;
  const steps = [];
  if (cfg === "divider") {
    const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
    VBB = (Vcc * R2) / (R1 + R2);
    RBB = (R1 * R2) / (R1 + R2);
    steps.push({ text: "Pembagi kita ganti dengan ekivalen Thevenin di basis:", tex: `V_{BB} = ${ntex(Vcc)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(VBB, 5)}\\ V,\\quad R_{BB} = ${ntex(RBB, 5)}\\ \\Omega` });
  } else {
    VBB = Vcc;
    RBB = num(input, "RB", "RB", { positive: true });
    steps.push(`Pada bias tetap, basis terhubung langsung ke VCC melalui RB.`);
  }
  let IB = (VBB - Vbe) / (RBB + (beta + 1) * RE);
  steps.push({ text: "Persamaan loop basis-emitor (KVL):", tex: `I_B = \\frac{${ntex(VBB, 5)} - ${ntex(Vbe)}}{${ntex(RBB, 5)} + (${ntex(beta)} + 1)(${ntex(RE)})} = ${ntex(IB, 5)}\\ A` });
  let region, IC, IE, VCE, VE, VC, VB;
  if (IB <= 0) {
    region = "cutoff";
    IB = 0; IC = 0; IE = 0; VE = 0; VC = Vcc; VCE = Vcc; VB = VBB;
    steps.push("Tegangan basis tidak cukup untuk menghantarkan sambungan basis-emitor, sehingga transistor berada di daerah cutoff.");
  } else {
    IC = beta * IB; IE = IC + IB;
    VCE = Vcc - IC * RC - IE * RE;
    region = "aktif";
    if (VCE < VCEsat) {
      region = "saturasi";
      IC = (Vcc - VCEsat - IB * RE) / (RC + RE);
      if (IC < 0) IC = 0;
      IE = IC + IB;
      VCE = VCEsat;
      steps.push(`Perhitungan di daerah aktif menghasilkan VCE negatif atau kurang dari ${VCEsat} V, sehingga transistor berada di saturasi: kita tetapkan VCE = ${VCEsat} V dan menghitung IC dari loop kolektor, karena hubungan IC = βIB tidak lagi berlaku.`);
    } else steps.push({ text: "Di daerah aktif:", tex: `I_C = \\beta I_B = ${ntex(IC, 5)}\\ A,\\quad V_{CE} = ${ntex(Vcc)} - I_C(${ntex(RC)}) - I_E(${ntex(RE)}) = ${ntex(VCE, 5)}\\ V` });
    VE = IE * RE; VC = VE + VCE; VB = VE + Vbe;
  }
  const IcSat = (Vcc - VCEsat) / (RC + RE || 1e-30);
  steps.push(`Garis beban DC memotong sumbu di $I_{C,sat} \\approx ${ntex(IcSat, 4)}$ A dan $V_{CE,cutoff} = ${ntex(Vcc)}$ V, dan titik kerja berada padanya.`);
  return {
    results: [
      { label: "Daerah operasi", value: region },
      { label: "IB", value: eng(IB, "A", 4) },
      { label: "IC", value: eng(IC, "A", 4), text: `IC = ${eng(IC, "A", 4)}` },
      { label: "IE", value: eng(IE, "A", 4) },
      { label: "VCE", value: eng(VCE, "V", 4), text: `VCE = ${eng(VCE, "V", 4)}` },
      { label: "Tegangan terminal VB / VC / VE", value: `${fmt(VB, 4)} / ${fmt(VC, 4)} / ${fmt(VE, 4)} V` },
      { label: "Daya transistor", value: eng(VCE * IC, "W", 4) }
    ],
    blocks: [{ type: "plot", title: "Garis beban dan titik kerja", xLabel: "VCE (V)", yLabel: "IC (A)", includeZero: true, series: [{ name: "Garis beban", points: [[0, IcSat + VCEsat / (RC + RE || 1e-30)], [Vcc, 0]] }, { name: "Q", points: [[VCE, IC]], marker: "o" }] }],
    steps, copy: `${region}: IC = ${eng(IC, "A", 4)}, VCE = ${eng(VCE, "V", 4)}, IB = ${eng(IB, "A", 4)}`
  };
}
