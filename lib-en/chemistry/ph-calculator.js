import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KW = 1e-14;
const TYPES = ["strong-acid", "strong-base", "weak-acid", "weak-base", "buffer", "from-ph"];

export const meta = {
  description: "Calculates the pH, pOH, and the concentrations of H+ and OH- ions for strong and weak acids and bases and for buffer solutions, using the Henderson–Hasselbalch equation, with the degree of ionization and the classification of the solution as acidic, basic or neutral at 25 °C.",
  keywords: ["pH", "pOH", "acid", "base", "strong acid", "weak acid", "Ka", "Kb", "pKa", "buffer solution", "Henderson–Hasselbalch", "Henderson", "ionization", "Kw"],
  formulas: [
    { label: "Water at 25 °C", tex: "K_w = [H^+][OH^-] = 10^{-14},\\qquad pH + pOH = 14" },
    { label: "weak acid", tex: "x^2 + K_a x - K_a C = 0,\\qquad [H^+] = x" },
    { label: "buffer solution", tex: "pH = pK_a + \\log\\frac{[A^-]}{[HA]}" }
  ],
  inputs: [
    { id: "type", label: "Solution type", type: "select", default: "strong-acid", options: [["strong-acid", "strong acid"], ["strong-base", "strong base"], ["weak-acid", "weak acid"], ["weak-base", "weak base"], ["buffer", "Buffer solution (Henderson–Hasselbalch)"], ["from-ph", "From pH to [H+] and [OH-]"]] },
    { id: "C", label: "Analytical concentration C", unit: "M", type: "number", default: "0.01", when: { type: ["strong-acid", "strong-base", "weak-acid", "weak-base"] } },
    { id: "hydroxides", label: "Number of OH- groups in the base", type: "select", default: "1", options: [["1", "1 (such as NaOH)"], ["2", "2 (such as Ca(OH)2)"]], when: { type: ["strong-base"] } },
    { id: "constKind", label: "Type of constant entered", type: "select", default: "K", options: [["K", "K (Ka or Kb)"], ["pK", "pK (pKa or pKb)"]], when: { type: ["weak-acid", "weak-base"] } },
    { id: "constVal", label: "Constant value", type: "number", default: "1.8e-5", when: { type: ["weak-acid", "weak-base"] }, help: "Example: acetic acid Ka = 1.8e-5 or pKa = 4.74." },
    { id: "pKa", label: "pKa of the buffer", type: "number", default: "4.76", when: { type: ["buffer"] } },
    { id: "A", label: "Concentration of the conjugate ion [A-]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "HA", label: "Concentration of the acid [HA]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "pH", label: "pH value", type: "number", default: "7", when: { type: ["from-ph"] } }
  ],
  example: { values: { type: "strong-acid", C: "0.01", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" }, expect: ["pH = 2"], note: "Example: HCl acid with a concentration of 0.01 M." },
  invalid: { values: { type: "weak-acid", C: "0", hydroxides: "1", constKind: "K", constVal: "1.8e-5", pKa: "", A: "", HA: "", pH: "" } },
  related: ["solutions", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function finish(H, steps, extra = []) {
  const OH = KW / H;
  const pH = -Math.log10(H);
  const pOH = -Math.log10(OH);
  const nature = Math.abs(pH - 7) < 1e-9 ? "neutral" : pH < 7 ? "acidic" : "basic";
  const all = [...steps, { text: "pH and pOH:", tex: `pH = -\\log[H^+] = ${ntex(pH, 6)},\\qquad pOH = 14 - pH = ${ntex(pOH, 6)}` }];
  return {
    results: [
      { label: "pH", value: fmt(pH, 5) },
      { label: "pOH", value: fmt(pOH, 5) },
      { label: "Hydrogen ion concentration [H+]", value: `${fmt(H, 4)} M` },
      { label: "Hydroxide ion concentration [OH-]", value: `${fmt(OH, 4)} M` },
      { label: "Nature of the solution", value: nature },
      ...extra
    ],
    steps: all,
    copy: `pH = ${fmt(pH, 5)} (${nature})، pOH = ${fmt(pOH, 5)}، [H+] = ${fmt(H, 4)} M`
  };
}

function strongAcid(input) {
  const C = num(input, "C", "Acid concentration", { positive: true });
  const exact = C < 1e-6;
  const H = exact ? (C + Math.sqrt(C * C + 4 * KW)) / 2 : C;
  const steps = [{ text: "Strong monoprotic acid, [H+] = C:", tex: `[H^+] = C = ${ntex(C)}\\ M` }];
  if (exact) steps.push({ text: "The concentration is very low, so we take into account the H+ ions from water:", tex: `[H^+] = \\frac{C + \\sqrt{C^2 + 4K_w}}{2} = ${ntex(H, 6)}\\ M` });
  return finish(H, steps);
}

function strongBase(input) {
  const C = num(input, "C", "Base concentration", { positive: true });
  const n = Number(choice(input, "hydroxides", "Number of OH- groups", ["1", "2"], "1"));
  const c2 = n * C;
  const exact = c2 < 1e-6;
  const OH = exact ? (c2 + Math.sqrt(c2 * c2 + 4 * KW)) / 2 : c2;
  const steps = [{ text: `Strong base, number of OH- groups = ${n}, so [OH-] = n·C:`, tex: `[OH^-] = ${n} \\times ${ntex(C)} = ${ntex(c2, 6)}\\ M` }];
  if (exact) steps.push({ text: "The concentration is very low, so we take into account the OH- ions from water:", tex: `[OH^-] = \\frac{n C + \\sqrt{(nC)^2 + 4K_w}}{2} = ${ntex(OH, 6)}\\ M` });
  return finish(KW / OH, steps);
}

function constant(input, label) {
  const kind = choice(input, "constKind", "Constant type", ["K", "pK"], "K");
  const v = num(input, "constVal", label, kind === "K" ? { positive: true } : {});
  return kind === "K" ? v : Math.pow(10, -v);
}

function weak(input, isAcid) {
  const C = num(input, "C", isAcid ? "Acid concentration" : "Base concentration", { positive: true });
  const K = constant(input, isAcid ? "Value of Ka or pKa" : "Value of Kb or pKb");
  const sym = isAcid ? "a" : "b";
  const x = (2 * K * C) / (K + Math.sqrt(K * K + 4 * K * C));
  const alpha = (100 * x) / C;
  const steps = [
    { text: "Quadratic equilibrium equation, where x = [H+] for an acid or [OH-] for a base:", tex: `x^2 + K_${sym} x - K_${sym} C = 0,\\qquad K_${sym} = ${ntex(K, 6)},\\quad C = ${ntex(C)}` },
    { text: "Positive root:", tex: `x = \\frac{2K_${sym}C}{K_${sym} + \\sqrt{K_${sym}^2 + 4K_${sym}C}} = ${ntex(x, 6)}\\ M` }
  ];
  const extra = [{ label: "Degree of ionization α", value: `${fmt(alpha, 4)} %` }];
  return finish(isAcid ? x : KW / x, steps, extra);
}

function buffer(input) {
  const pKa = num(input, "pKa", "pKa");
  const A = num(input, "A", "Concentration of [A-]", { positive: true });
  const HA = num(input, "HA", "Concentration of [HA]", { positive: true });
  const pH = pKa + Math.log10(A / HA);
  const steps = [{ text: "Henderson–Hasselbalch equation:", tex: `pH = pK_a + \\log\\frac{[A^-]}{[HA]} = ${ntex(pKa)} + \\log\\frac{${ntex(A)}}{${ntex(HA)}} = ${ntex(pH, 6)}` }];
  return finish(Math.pow(10, -pH), steps);
}

function fromPh(input) {
  const pH = num(input, "pH", "pH value", { min: 0, max: 14 });
  const H = Math.pow(10, -pH);
  const steps = [{ text: "[H+] = 10^(-pH):", tex: `[H^+] = 10^{-${ntex(pH)}} = ${ntex(H, 6)}\\ M` }];
  return finish(H, steps);
}

export function solve(input) {
  const type = choice(input, "type", "Solution type", TYPES, "strong-acid");
  if (type === "strong-acid") return strongAcid(input);
  if (type === "strong-base") return strongBase(input);
  if (type === "weak-acid") return weak(input, true);
  if (type === "weak-base") return weak(input, false);
  if (type === "buffer") return buffer(input);
  return fromPh(input);
}
