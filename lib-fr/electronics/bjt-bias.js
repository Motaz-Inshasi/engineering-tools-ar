import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Analysez la polarisation d'un transistor BJT NPN par diviseur de tension ou polarisation fixe : courants de base, de collecteur et d'émetteur, tension VCE, point de fonctionnement et zone de fonctionnement (active, saturation, blocage).",
  keywords: ["Transistor", "BJT", "Polarisation", "bias", "Point de fonctionnement", "Q-point", "Diviseur de tension", "Saturation", "beta"],
  formulas: [
    { label: "Polarisation par diviseur de tension (équivalent de Thévenin de la base)", tex: "V_{BB} = V_{CC}\\frac{R_2}{R_1 + R_2},\\quad R_{BB} = R_1 \\parallel R_2,\\quad I_B = \\frac{V_{BB} - V_{BE}}{R_{BB} + (\\beta + 1)R_E}" },
    { label: "Point de fonctionnement", tex: "I_C = \\beta I_B,\\quad V_{CE} = V_{CC} - I_C R_C - I_E R_E" }
  ],
  inputs: [
    { id: "cfg", label: "Mode de polarisation", type: "select", default: "divider", options: [["divider", "Diviseur de tension"], ["fixed", "Polarisation fixe (RB)"]] },
    { id: "Vcc", label: "VCC", unit: "V", type: "number", default: "12" },
    { id: "R1", label: "R1 (de VCC à la base)", unit: "Ω", type: "number", default: "47k", when: { cfg: ["divider"] } },
    { id: "R2", label: "R2 (de la base à la masse)", unit: "Ω", type: "number", default: "10k", when: { cfg: ["divider"] } },
    { id: "RB", label: "RB", unit: "Ω", type: "number", default: "470k", when: { cfg: ["fixed"] } },
    { id: "RC", label: "RC", unit: "Ω", type: "number", default: "2.2k" },
    { id: "RE", label: "RE", unit: "Ω", type: "number", default: "470" },
    { id: "beta", label: "Gain en courant β", type: "number", default: "100" },
    { id: "Vbe", label: "VBE", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "100", Vbe: "0.7" }, expect: ["IC = 2.522 mA", "VCE = 5.254 V"], note: "Exemple : diviseur 47k/10k sous 12 V, RC = 2.2k, RE = 470 Ω et β = 100." },
  invalid: { values: { cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "0", Vbe: "0.7" } },
  related: ["mosfet", "op-amp", "thevenin-norton", "voltage-current-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "Mode de polarisation", ["divider", "fixed"], "divider");
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
    steps.push({ text: "On remplace le diviseur par son équivalent de Thévenin à la base :", tex: `V_{BB} = ${ntex(Vcc)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(VBB, 5)}\\ V,\\quad R_{BB} = ${ntex(RBB, 5)}\\ \\Omega` });
  } else {
    VBB = Vcc;
    RBB = num(input, "RB", "RB", { positive: true });
    steps.push(`En polarisation fixe, la base est reliée directement à VCC à travers RB.`);
  }
  let IB = (VBB - Vbe) / (RBB + (beta + 1) * RE);
  steps.push({ text: "Équation de la maille base-émetteur (KVL) :", tex: `I_B = \\frac{${ntex(VBB, 5)} - ${ntex(Vbe)}}{${ntex(RBB, 5)} + (${ntex(beta)} + 1)(${ntex(RE)})} = ${ntex(IB, 5)}\\ A` });
  let region, IC, IE, VCE, VE, VC, VB;
  if (IB <= 0) {
    region = "Blocage";
    IB = 0; IC = 0; IE = 0; VE = 0; VC = Vcc; VCE = Vcc; VB = VBB;
    steps.push("La tension de base ne suffit pas à polariser la jonction base-émetteur : le transistor est dans la zone de blocage.");
  } else {
    IC = beta * IB; IE = IC + IB;
    VCE = Vcc - IC * RC - IE * RE;
    region = "Active";
    if (VCE < VCEsat) {
      region = "Saturation";
      IC = (Vcc - VCEsat - IB * RE) / (RC + RE);
      if (IC < 0) IC = 0;
      IE = IC + IB;
      VCE = VCEsat;
      steps.push(`Le calcul en zone active donne VCE négative ou inférieure à ${VCEsat} V : le transistor est en saturation. On fixe VCE = ${VCEsat} V et on calcule IC à partir de la maille du collecteur ; la relation IC = βIB n'est plus valable.`);
    } else steps.push({ text: "En zone active :", tex: `I_C = \\beta I_B = ${ntex(IC, 5)}\\ A,\\quad V_{CE} = ${ntex(Vcc)} - I_C(${ntex(RC)}) - I_E(${ntex(RE)}) = ${ntex(VCE, 5)}\\ V` });
    VE = IE * RE; VC = VE + VCE; VB = VE + Vbe;
  }
  const IcSat = (Vcc - VCEsat) / (RC + RE || 1e-30);
  steps.push(`La droite de charge continue coupe les axes en $I_{C,sat} \\approx ${ntex(IcSat, 4)}$ A et $V_{CE,cutoff} = ${ntex(Vcc)}$ V, et le point de fonctionnement s'y trouve.`);
  return {
    results: [
      { label: "Zone de fonctionnement", value: region },
      { label: "IB", value: eng(IB, "A", 4) },
      { label: "IC", value: eng(IC, "A", 4), text: `IC = ${eng(IC, "A", 4)}` },
      { label: "IE", value: eng(IE, "A", 4) },
      { label: "VCE", value: eng(VCE, "V", 4), text: `VCE = ${eng(VCE, "V", 4)}` },
      { label: "Tensions des bornes VB / VC / VE", value: `${fmt(VB, 4)} / ${fmt(VC, 4)} / ${fmt(VE, 4)} V` },
      { label: "Puissance du transistor", value: eng(VCE * IC, "W", 4) }
    ],
    blocks: [{ type: "plot", title: "Droite de charge et point de fonctionnement", xLabel: "VCE (V)", yLabel: "IC (A)", includeZero: true, series: [{ name: "Droite de charge", points: [[0, IcSat + VCEsat / (RC + RE || 1e-30)], [Vcc, 0]] }, { name: "Q", points: [[VCE, IC]], marker: "o" }] }],
    steps, copy: `${region}: IC = ${eng(IC, "A", 4)}, VCE = ${eng(VCE, "V", 4)}, IB = ${eng(IB, "A", 4)}`
  };
}
