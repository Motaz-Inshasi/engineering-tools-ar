import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Bases du MOSFET à canal N en enrichissement : zones de fonctionnement (blocage, linéaire, saturation), courant de drain, transconductance gm et résistance de sortie, avec les courbes caractéristiques.",
  keywords: ["MOSFET", "MOSFET", "Transistor à effet de champ", "Courant de drain", "Tension de seuil", "gm", "Saturation", "Zone linéaire"],
  formulas: [
    { label: "Zone linéaire (triode) lorsque VDS < VGS − Vth", tex: "I_D = k\\left[(V_{GS} - V_{th})V_{DS} - \\tfrac{1}{2}V_{DS}^2\\right]" },
    { label: "Saturation lorsque VDS ≥ VGS − Vth", tex: "I_D = \\tfrac{1}{2}k(V_{GS} - V_{th})^2(1 + \\lambda V_{DS}),\\quad g_m = k(V_{GS} - V_{th})" }
  ],
  inputs: [
    { id: "Vgs", label: "VGS", unit: "V", type: "number", default: "3" },
    { id: "Vds", label: "VDS", unit: "V", type: "number", default: "5" },
    { id: "Vth", label: "Tension de seuil Vth", unit: "V", type: "number", default: "1" },
    { id: "k", label: "Coefficient de conduction k = μnCox·W/L", unit: "A/V²", type: "number", default: "2m" },
    { id: "lambda", label: "Coefficient de modulation de la longueur de canal λ", unit: "1/V", type: "number", default: "0" }
  ],
  example: { values: { Vgs: "3", Vds: "5", Vth: "1", k: "2m", lambda: "0" }, expect: ["ID = 4 mA", "Saturation"], note: "Exemple : VGS = 3 V, Vth = 1 V et k = 2 mA/V²." },
  invalid: { values: { Vgs: "3", Vds: "-5", Vth: "1", k: "2m", lambda: "0" } },
  related: ["bjt-bias", "op-amp", "voltage-regulator"]
};

export function drain(Vgs, Vds, Vth, k, lambda = 0) {
  const ov = Vgs - Vth;
  if (ov <= 0) return { region: "cutoff", Id: 0 };
  if (Vds < ov) return { region: "triode", Id: k * (ov * Vds - 0.5 * Vds * Vds) };
  return { region: "sat", Id: 0.5 * k * ov * ov * (1 + lambda * Vds) };
}

const NAMES = { cutoff: "Blocage", triode: "Linéaire (triode)", sat: "Saturation" };

export function solve(input) {
  const Vgs = num(input, "Vgs", "VGS");
  const Vds = num(input, "Vds", "VDS", { nonNegative: true });
  const Vth = num(input, "Vth", "Tension de seuil", { positive: true });
  const k = num(input, "k", "k", { positive: true });
  const lambda = num(input, "lambda", "λ", { nonNegative: true, default: 0 });
  const ov = Vgs - Vth;
  const r = drain(Vgs, Vds, Vth, k, lambda);
  const steps = [{ text: "Tension de surdrive (Overdrive) :", tex: `V_{OV} = V_{GS} - V_{th} = ${ntex(Vgs)} - ${ntex(Vth)} = ${ntex(ov, 5)}\\ V` }];
  let gm = 0, ro = Infinity, Ron = Infinity;
  if (r.region === "cutoff") steps.push("VGS inférieure à la tension de seuil : aucun canal ne se forme, le transistor est bloqué et ID = 0.");
  else if (r.region === "triode") {
    Ron = 1 / (k * ov);
    steps.push(`VDS = ${fmt(Vds)} V est inférieure à VOV : le canal n'est pas pincé, zone linéaire.`);
    steps.push({ tex: `I_D = ${ntex(k)}\\left[${ntex(ov, 5)} \\times ${ntex(Vds)} - \\tfrac{1}{2}(${ntex(Vds)})^2\\right] = ${ntex(r.Id, 5)}\\ A` });
    steps.push({ text: "Pour une VDS faible, le transistor se comporte comme une résistance :", tex: `R_{on} \\approx \\frac{1}{k V_{OV}} = ${ntex(Ron, 5)}\\ \\Omega` });
  } else {
    gm = k * ov * (1 + lambda * Vds);
    ro = lambda > 0 ? 1 / (lambda * 0.5 * k * ov * ov) : Infinity;
    steps.push(`VDS = ${fmt(Vds)} V ≥ VOV : le canal est pincé côté drain, zone de saturation (zone d'amplification).`);
    steps.push({ tex: `I_D = \\tfrac{1}{2}(${ntex(k)})(${ntex(ov, 5)})^2(1 + ${ntex(lambda)} \\times ${ntex(Vds)}) = ${ntex(r.Id, 5)}\\ A` });
    steps.push({ text: "Paramètres en petit signal :", tex: `g_m = k V_{OV} = ${ntex(gm, 5)}\\ S${lambda > 0 ? `,\\quad r_o \\approx \\frac{1}{\\lambda I_D} = ${ntex(ro, 5)}\\ \\Omega` : ",\\quad r_o = \\infty\\ (\\lambda = 0)"}` });
  }
  const vmax = Math.max(Vds * 1.5, ov * 2, 2);
  const curves = [ov * 0.5, ov, ov * 1.5].filter((x) => x > 0).map((o) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) { const v = (vmax * i) / 120; pts.push([v, drain(Vth + o, v, Vth, k, lambda).Id]); }
    return { name: `VGS = ${fmt(Vth + o, 3)} V`, points: pts };
  });
  const blocks = curves.length ? [{ type: "plot", title: "Courbes ID en fonction de VDS", xLabel: "VDS (V)", yLabel: "ID (A)", includeZero: true, series: [...curves, { name: "Point de fonctionnement", points: [[Vds, r.Id]], marker: "o" }] }] : [];
  return {
    results: [
      { label: "Zone de fonctionnement", value: NAMES[r.region], text: NAMES[r.region] },
      { label: "Courant de drain ID", value: eng(r.Id, "A", 4), text: `ID = ${eng(r.Id, "A", 4)}` },
      { label: "Transconductance gm", value: eng(gm, "S", 4) },
      ...(r.region === "triode" ? [{ label: "Résistance à l'état passant Ron", value: eng(Ron, "Ω", 4) }] : []),
      { label: "Puissance dissipée", value: eng(r.Id * Vds, "W", 4) }
    ],
    blocks, steps, copy: `${NAMES[r.region]}: ID = ${eng(r.Id, "A", 4)}, gm = ${eng(gm, "S", 4)}`
  };
}
