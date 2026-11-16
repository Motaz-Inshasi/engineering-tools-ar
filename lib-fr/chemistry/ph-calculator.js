import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KW = 1e-14;
const TYPES = ["strong-acid", "strong-base", "weak-acid", "weak-base", "buffer", "from-ph"];

export const meta = {
  description: "Calcule le pH, le pOH et les concentrations des ions H+ et OH- pour un acide ou une base, forts ou faibles, ainsi que pour une solution tampon par l'équation de Henderson–Hasselbalch, avec le taux d'ionisation et la classification de la solution en acide, basique ou neutre à 25 °C.",
  keywords: ["pH", "pOH", "acide", "base", "acide fort", "acide faible", "Ka", "Kb", "pKa", "solution tampon", "Henderson–Hasselbalch", "Henderson", "ionisation", "Kw"],
  formulas: [
    { label: "Eau à 25 °C", tex: "K_w = [H^+][OH^-] = 10^{-14},\\qquad pH + pOH = 14" },
    { label: "acide faible", tex: "x^2 + K_a x - K_a C = 0,\\qquad [H^+] = x" },
    { label: "solution tampon", tex: "pH = pK_a + \\log\\frac{[A^-]}{[HA]}" }
  ],
  inputs: [
    { id: "type", label: "Type de solution", type: "select", default: "strong-acid", options: [["strong-acid", "acide fort"], ["strong-base", "Base forte"], ["weak-acid", "acide faible"], ["weak-base", "Base faible"], ["buffer", "Solution tampon (Henderson–Hasselbalch)"], ["from-ph", "De pH vers [H+] et [OH-]"]] },
    { id: "C", label: "Concentration analytique C", unit: "M", type: "number", default: "0.01", when: { type: ["strong-acid", "strong-base", "weak-acid", "weak-base"] } },
    { id: "hydroxides", label: "Nombre de groupes OH- de la base", type: "select", default: "1", options: [["1", "1 (comme NaOH)"], ["2", "2 (comme Ca(OH)2)"]], when: { type: ["strong-base"] } },
    { id: "constKind", label: "Type de constante saisie", type: "select", default: "K", options: [["K", "K (Ka ou Kb)"], ["pK", "pK (pKa ou pKb)"]], when: { type: ["weak-acid", "weak-base"] } },
    { id: "constVal", label: "Valeur de la constante", type: "number", default: "1.8e-5", when: { type: ["weak-acid", "weak-base"] }, help: "Exemple : acide acétique Ka = 1.8e-5 ou pKa = 4.74." },
    { id: "pKa", label: "pKa de la solution tampon", type: "number", default: "4.76", when: { type: ["buffer"] } },
    { id: "A", label: "Concentration de l'ion conjugué [A-]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "HA", label: "Concentration de l'acide [HA]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "pH", label: "Valeur de pH", type: "number", default: "7", when: { type: ["from-ph"] } }
  ],
  example: { values: { type: "strong-acid", C: "0.01", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" }, expect: ["pH = 2"], note: "Exemple : acide HCl de concentration 0.01 M." },
  invalid: { values: { type: "weak-acid", C: "0", hydroxides: "1", constKind: "K", constVal: "1.8e-5", pKa: "", A: "", HA: "", pH: "" } },
  related: ["solutions", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function finish(H, steps, extra = []) {
  const OH = KW / H;
  const pH = -Math.log10(H);
  const pOH = -Math.log10(OH);
  const nature = Math.abs(pH - 7) < 1e-9 ? "neutre" : pH < 7 ? "acide" : "basique";
  const all = [...steps, { text: "Le pH et le pOH :", tex: `pH = -\\log[H^+] = ${ntex(pH, 6)},\\qquad pOH = 14 - pH = ${ntex(pOH, 6)}` }];
  return {
    results: [
      { label: "pH", value: fmt(pH, 5) },
      { label: "pOH", value: fmt(pOH, 5) },
      { label: "Concentration des ions hydrogène [H+]", value: `${fmt(H, 4)} M` },
      { label: "Concentration des ions hydroxyde [OH-]", value: `${fmt(OH, 4)} M` },
      { label: "Nature de la solution", value: nature },
      ...extra
    ],
    steps: all,
    copy: `pH = ${fmt(pH, 5)} (${nature})، pOH = ${fmt(pOH, 5)}، [H+] = ${fmt(H, 4)} M`
  };
}

function strongAcid(input) {
  const C = num(input, "C", "Concentration de l'acide", { positive: true });
  const exact = C < 1e-6;
  const H = exact ? (C + Math.sqrt(C * C + 4 * KW)) / 2 : C;
  const steps = [{ text: "Acide fort monoprotique, [H+] = C :", tex: `[H^+] = C = ${ntex(C)}\\ M` }];
  if (exact) steps.push({ text: "La concentration est très faible : on tient compte des ions H+ de l'eau :", tex: `[H^+] = \\frac{C + \\sqrt{C^2 + 4K_w}}{2} = ${ntex(H, 6)}\\ M` });
  return finish(H, steps);
}

function strongBase(input) {
  const C = num(input, "C", "Concentration de la base", { positive: true });
  const n = Number(choice(input, "hydroxides", "Nombre de groupes OH-", ["1", "2"], "1"));
  const c2 = n * C;
  const exact = c2 < 1e-6;
  const OH = exact ? (c2 + Math.sqrt(c2 * c2 + 4 * KW)) / 2 : c2;
  const steps = [{ text: `Base forte, nombre de groupes OH- = ${n}, donc [OH-] = n·C :`, tex: `[OH^-] = ${n} \\times ${ntex(C)} = ${ntex(c2, 6)}\\ M` }];
  if (exact) steps.push({ text: "La concentration est très faible : on tient compte des ions OH- de l'eau :", tex: `[OH^-] = \\frac{n C + \\sqrt{(nC)^2 + 4K_w}}{2} = ${ntex(OH, 6)}\\ M` });
  return finish(KW / OH, steps);
}

function constant(input, label) {
  const kind = choice(input, "constKind", "Type de constante", ["K", "pK"], "K");
  const v = num(input, "constVal", label, kind === "K" ? { positive: true } : {});
  return kind === "K" ? v : Math.pow(10, -v);
}

function weak(input, isAcid) {
  const C = num(input, "C", isAcid ? "Concentration de l'acide" : "Concentration de la base", { positive: true });
  const K = constant(input, isAcid ? "Valeur de Ka ou pKa" : "Valeur de Kb ou pKb");
  const sym = isAcid ? "a" : "b";
  const x = (2 * K * C) / (K + Math.sqrt(K * K + 4 * K * C));
  const alpha = (100 * x) / C;
  const steps = [
    { text: "Équation d'équilibre du second degré, où x = [H+] pour l'acide ou [OH-] pour la base :", tex: `x^2 + K_${sym} x - K_${sym} C = 0,\\qquad K_${sym} = ${ntex(K, 6)},\\quad C = ${ntex(C)}` },
    { text: "Racine positive :", tex: `x = \\frac{2K_${sym}C}{K_${sym} + \\sqrt{K_${sym}^2 + 4K_${sym}C}} = ${ntex(x, 6)}\\ M` }
  ];
  const extra = [{ label: "Taux d'ionisation α", value: `${fmt(alpha, 4)} %` }];
  return finish(isAcid ? x : KW / x, steps, extra);
}

function buffer(input) {
  const pKa = num(input, "pKa", "pKa");
  const A = num(input, "A", "Concentration de [A-]", { positive: true });
  const HA = num(input, "HA", "Concentration de [HA]", { positive: true });
  const pH = pKa + Math.log10(A / HA);
  const steps = [{ text: "Équation de Henderson–Hasselbalch :", tex: `pH = pK_a + \\log\\frac{[A^-]}{[HA]} = ${ntex(pKa)} + \\log\\frac{${ntex(A)}}{${ntex(HA)}} = ${ntex(pH, 6)}` }];
  return finish(Math.pow(10, -pH), steps);
}

function fromPh(input) {
  const pH = num(input, "pH", "Valeur de pH", { min: 0, max: 14 });
  const H = Math.pow(10, -pH);
  const steps = [{ text: "[H+] = 10^(-pH):", tex: `[H^+] = 10^{-${ntex(pH)}} = ${ntex(H, 6)}\\ M` }];
  return finish(H, steps);
}

export function solve(input) {
  const type = choice(input, "type", "Type de solution", TYPES, "strong-acid");
  if (type === "strong-acid") return strongAcid(input);
  if (type === "strong-base") return strongBase(input);
  if (type === "weak-acid") return weak(input, true);
  if (type === "weak-base") return weak(input, false);
  if (type === "buffer") return buffer(input);
  return fromPh(input);
}
