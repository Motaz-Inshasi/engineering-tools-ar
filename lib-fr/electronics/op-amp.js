import { choice, numList, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["inv", "Inverseur"], ["noninv", "Non inverseur"], ["sum", "Sommateur inverseur"], ["diff", "Différentiel (soustracteur)"], ["integ", "Intégrateur"], ["deriv", "Dérivateur"]];

export const meta = {
  description: "Calculez le gain d'un amplificateur opérationnel idéal dans les montages courants : inverseur, non inverseur, sommateur, soustracteur, intégrateur et dérivateur, avec la tension de sortie et un avertissement de saturation lorsque la tension d'alimentation est dépassée.",
  keywords: ["Amplificateur opérationnel", "op-amp", "Ampli-op", "Amplificateur inverseur", "Amplificateur non inverseur", "Sommateur", "Intégrateur", "Dérivateur", "Gain"],
  formulas: [
    { label: "Inverseur et non inverseur", tex: "A_{inv} = -\\frac{R_f}{R_{in}},\\qquad A_{non} = 1 + \\frac{R_f}{R_{in}}" },
    { label: "Sommateur, intégrateur et dérivateur (pour un signal sinusoïdal)", tex: "V_o = -R_f\\sum\\frac{V_i}{R_i},\\qquad |A_{int}| = \\frac{1}{\\omega RC},\\qquad |A_{diff}| = \\omega RC" }
  ],
  inputs: [
    { id: "cfg", label: "Montage", type: "select", default: "inv", options: CFG },
    { id: "Rf", label: "Résistance de contre-réaction Rf", unit: "Ω", type: "number", default: "100k", when: { cfg: ["inv", "noninv", "sum", "diff"] } },
    { id: "Rin", label: "Résistance d'entrée Rin", unit: "Ω", type: "number", default: "10k", when: { cfg: ["inv", "noninv", "diff"] } },
    { id: "Vin", label: "Tension d'entrée Vin", unit: "V", type: "number", default: "0.5", when: { cfg: ["inv", "noninv", "integ", "deriv"] }, help: "Pour l'intégrateur et le dérivateur : amplitude du signal sinusoïdal." },
    { id: "V2", label: "Deuxième tension d'entrée V2 (on lui soustrait V1 = Vin)", unit: "V", type: "number", default: "1", when: { cfg: ["diff"] } },
    { id: "V1d", label: "Tension d'entrée V1", unit: "V", type: "number", default: "0.5", when: { cfg: ["diff"] } },
    { id: "Rs", label: "Résistances d'entrée du sommateur", unit: "Ω", type: "text", default: "10k, 20k, 50k", when: { cfg: ["sum"] } },
    { id: "Vs", label: "Tensions d'entrée du sommateur", unit: "V", type: "text", default: "1, 0.5, -2", when: { cfg: ["sum"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k", when: { cfg: ["integ", "deriv"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "10n", when: { cfg: ["integ", "deriv"] } },
    { id: "f", label: "Fréquence du signal", unit: "Hz", type: "number", default: "1k", when: { cfg: ["integ", "deriv"] } },
    { id: "Vsat", label: "Tension d'alimentation ±Vcc", unit: "V", type: "number", default: "15" }
  ],
  example: { values: { cfg: "inv", Rf: "100k", Rin: "10k", Vin: "0.5", Vsat: "15" }, expect: ["A = -10", "Vout = -5 V"], note: "Exemple : amplificateur inverseur de gain −10 avec une entrée de 0.5 V." },
  invalid: { values: { cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" } },
  related: ["bjt-bias", "passive-filter", "adc", "sensor-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "Montage", CFG.map((c) => c[0]), "inv");
  const Vsat = num(input, "Vsat", "Tension d'alimentation", { positive: true });
  const steps = ["On suppose un amplificateur idéal : gain infini, aucun courant ne circule dans les entrées et leurs tensions sont égales (court-circuit virtuel)."];
  let A = null, Vout, gainText;
  if (cfg === "inv" || cfg === "noninv") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true }), Vin = num(input, "Vin", "Vin");
    A = cfg === "inv" ? -Rf / Rin : 1 + Rf / Rin;
    Vout = A * Vin;
    steps.push({ text: cfg === "inv" ? "L'entrée inverseuse est à une masse virtuelle, donc tout le courant d'entrée traverse Rf :" : "La tension de l'entrée inverseuse est égale à Vin, et Rf et Rin forment un diviseur sur la sortie :", tex: cfg === "inv" ? `A = -\\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` : `A = 1 + \\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` });
    steps.push({ tex: `V_{out} = A V_{in} = ${ntex(A, 6)} \\times ${ntex(Vin)} = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else if (cfg === "sum") {
    const Rf = num(input, "Rf", "Rf", { positive: true });
    const Rs = numList(input, "Rs", "Résistances d'entrée", { positive: true, max: 10 });
    const Vs = numList(input, "Vs", "Tensions d'entrée", { max: 10 });
    if (Rs.length !== Vs.length) fail(`Le nombre de résistances (${Rs.length}) doit être égal au nombre de tensions (${Vs.length}).`, "Vs");
    Vout = -Rf * Rs.reduce((s, r, i) => s + Vs[i] / r, 0);
    steps.push({ text: "Les courants d'entrée se somment à la masse virtuelle et traversent Rf :", tex: `V_{out} = -${ntex(Rf)}\\left(${Rs.map((r, i) => `\\frac{${ntex(Vs[i])}}{${ntex(r)}}`).join(" + ")}\\right) = ${ntex(Vout, 6)}\\ V` });
    gainText = Rs.map((r, i) => `A${i + 1} = ${fmt(-Rf / r, 5)}`).join(", ");
  } else if (cfg === "diff") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true });
    const V1 = num(input, "V1d", "V1"), V2 = num(input, "V2", "V2");
    A = Rf / Rin;
    Vout = A * (V2 - V1);
    steps.push({ text: "Avec des résistances identiques (Rf/Rin sur les deux entrées), seul l'écart est amplifié :", tex: `V_{out} = \\frac{R_f}{R_{in}}(V_2 - V_1) = ${ntex(A, 6)}(${ntex(V2)} - ${ntex(V1)}) = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else {
    const R = num(input, "R", "R", { positive: true }), C = num(input, "C", "C", { positive: true }), f = num(input, "f", "Fréquence", { positive: true }), Vin = num(input, "Vin", "Vin");
    const w = 2 * Math.PI * f, wc = 1 / (R * C);
    A = cfg === "integ" ? 1 / (w * R * C) : w * R * C;
    Vout = A * Vin;
    steps.push(cfg === "integ"
      ? { text: "Intégrateur : $v_o = -\\frac{1}{RC}\\int v_i\\,dt$, et pour un signal sinusoïdal le gain devient :", tex: `|A| = \\frac{1}{\\omega RC} = \\frac{1}{${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)}} = ${ntex(A, 5)},\\ \\text{phase } +90^\\circ` }
      : { text: "Dérivateur : $v_o = -RC\\frac{dv_i}{dt}$, et pour un signal sinusoïdal le gain devient :", tex: `|A| = \\omega RC = ${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)} = ${ntex(A, 5)},\\ \\text{phase } -90^\\circ` });
    steps.push(`À la fréquence ${eng(wc / (2 * Math.PI), "Hz", 4)}, le gain vaut 1. ${cfg === "integ" ? "En pratique, une résistance est ajoutée en parallèle avec le condensateur pour éviter la saturation due à la tension continue." : "En pratique, une résistance est ajoutée en série avec le condensateur pour réduire le bruit à haute fréquence."}`);
    gainText = `|A| = ${fmt(A, 5)}`;
  }
  const sat = Math.abs(Vout) > Vsat;
  if (sat) steps.push(`Attention : la sortie calculée ${fmt(Vout, 4)} V dépasse la tension d'alimentation ±${fmt(Vsat)} V ; la sortie réelle se saturera vers ${fmt(Math.sign(Vout) * Vsat, 3)} V.`);
  const results = [];
  if (A !== null) results.push({ label: "Gain", value: A, sig: 6, text: gainText }, { label: "Gain en décibels", value: `${fmt(20 * Math.log10(Math.abs(A)), 4)} dB` });
  else results.push({ label: "Gain par entrée", value: gainText });
  results.push({ label: cfg === "integ" || cfg === "deriv" ? "Amplitude de sortie" : "Tension de sortie", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "État", value: sat ? "Saturation (sortie écrêtée)" : "Dans la plage linéaire" });
  return { results, steps, copy: `${gainText}, Vout = ${eng(Vout, "V", 4)}${sat ? " (saturated)" : ""}` };
}
