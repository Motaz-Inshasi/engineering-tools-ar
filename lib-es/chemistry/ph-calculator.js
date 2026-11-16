import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KW = 1e-14;
const TYPES = ["strong-acid", "strong-base", "weak-acid", "weak-base", "buffer", "from-ph"];

export const meta = {
  description: "Calcula pH, pOH y las concentraciones de H+ y OH- de ácidos y bases fuertes y débiles y de disoluciones amortiguadoras (Henderson-Hasselbalch), con el grado de disociación y la naturaleza de la disolución a 25 °C.",
  keywords: ["pH", "pOH", "Ácido", "Base", "Ácido fuerte", "Ácido débil", "Ka", "Kb", "pKa", "Disolución amortiguadora", "Henderson-Hasselbalch", "Henderson", "Disociación", "Kw"],
  formulas: [
    { label: "Agua a 25 °C", tex: "K_w = [H^+][OH^-] = 10^{-14},\\qquad pH + pOH = 14" },
    { label: "Ácido débil", tex: "x^2 + K_a x - K_a C = 0,\\qquad [H^+] = x" },
    { label: "Disolución amortiguadora", tex: "pH = pK_a + \\log\\frac{[A^-]}{[HA]}" }
  ],
  inputs: [
    { id: "type", label: "Tipo de disolución", type: "select", default: "strong-acid", options: [["strong-acid", "Ácido fuerte"], ["strong-base", "Base fuerte"], ["weak-acid", "Ácido débil"], ["weak-base", "Base débil"], ["buffer", "Disolución amortiguadora (Henderson-Hasselbalch)"], ["from-ph", "De pH a [H+] y [OH-]"]] },
    { id: "C", label: "Concentración analítica C", unit: "M", type: "number", default: "0.01", when: { type: ["strong-acid", "strong-base", "weak-acid", "weak-base"] } },
    { id: "hydroxides", label: "Número de grupos OH- de la base", type: "select", default: "1", options: [["1", "1 (como NaOH)"], ["2", "2 (como Ca(OH)2)"]], when: { type: ["strong-base"] } },
    { id: "constKind", label: "Tipo de constante introducida", type: "select", default: "K", options: [["K", "K (Ka o Kb)"], ["pK", "pK (pKa o pKb)"]], when: { type: ["weak-acid", "weak-base"] } },
    { id: "constVal", label: "Valor de la constante", type: "number", default: "1.8e-5", when: { type: ["weak-acid", "weak-base"] }, help: "Ejemplo: ácido acético Ka = 1.8e-5 o pKa = 4.74." },
    { id: "pKa", label: "pKa de la disolución amortiguadora", type: "number", default: "4.76", when: { type: ["buffer"] } },
    { id: "A", label: "Concentración del ion conjugado [A-]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "HA", label: "Concentración del ácido [HA]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "pH", label: "Valor de pH", type: "number", default: "7", when: { type: ["from-ph"] } }
  ],
  example: { values: { type: "strong-acid", C: "0.01", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" }, expect: ["pH = 2"], note: "Ejemplo: ácido HCl de concentración 0.01 M." },
  invalid: { values: { type: "weak-acid", C: "0", hydroxides: "1", constKind: "K", constVal: "1.8e-5", pKa: "", A: "", HA: "", pH: "" } },
  related: ["solutions", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function finish(H, steps, extra = []) {
  const OH = KW / H;
  const pH = -Math.log10(H);
  const pOH = -Math.log10(OH);
  const nature = Math.abs(pH - 7) < 1e-9 ? "Neutra" : pH < 7 ? "Ácida" : "Básica";
  const all = [...steps, { text: "pH y pOH:", tex: `pH = -\\log[H^+] = ${ntex(pH, 6)},\\qquad pOH = 14 - pH = ${ntex(pOH, 6)}` }];
  return {
    results: [
      { label: "pH", value: fmt(pH, 5) },
      { label: "pOH", value: fmt(pOH, 5) },
      { label: "Concentración de iones hidrógeno [H+]", value: `${fmt(H, 4)} M` },
      { label: "Concentración de iones hidróxido [OH-]", value: `${fmt(OH, 4)} M` },
      { label: "Naturaleza de la disolución", value: nature },
      ...extra
    ],
    steps: all,
    copy: `pH = ${fmt(pH, 5)} (${nature})، pOH = ${fmt(pOH, 5)}، [H+] = ${fmt(H, 4)} M`
  };
}

function strongAcid(input) {
  const C = num(input, "C", "Concentración del ácido", { positive: true });
  const exact = C < 1e-6;
  const H = exact ? (C + Math.sqrt(C * C + 4 * KW)) / 2 : C;
  const steps = [{ text: "Ácido fuerte monoprótico, [H+] = C:", tex: `[H^+] = C = ${ntex(C)}\\ M` }];
  if (exact) steps.push({ text: "La concentración es muy baja, así que tenemos en cuenta los iones H+ del agua:", tex: `[H^+] = \\frac{C + \\sqrt{C^2 + 4K_w}}{2} = ${ntex(H, 6)}\\ M` });
  return finish(H, steps);
}

function strongBase(input) {
  const C = num(input, "C", "Concentración de la base", { positive: true });
  const n = Number(choice(input, "hydroxides", "Número de grupos OH-", ["1", "2"], "1"));
  const c2 = n * C;
  const exact = c2 < 1e-6;
  const OH = exact ? (c2 + Math.sqrt(c2 * c2 + 4 * KW)) / 2 : c2;
  const steps = [{ text: `Base fuerte, número de grupos OH- = ${n}, así que [OH-] = n·C:`, tex: `[OH^-] = ${n} \\times ${ntex(C)} = ${ntex(c2, 6)}\\ M` }];
  if (exact) steps.push({ text: "La concentración es muy baja, así que tenemos en cuenta los iones OH- del agua:", tex: `[OH^-] = \\frac{n C + \\sqrt{(nC)^2 + 4K_w}}{2} = ${ntex(OH, 6)}\\ M` });
  return finish(KW / OH, steps);
}

function constant(input, label) {
  const kind = choice(input, "constKind", "Tipo de constante", ["K", "pK"], "K");
  const v = num(input, "constVal", label, kind === "K" ? { positive: true } : {});
  return kind === "K" ? v : Math.pow(10, -v);
}

function weak(input, isAcid) {
  const C = num(input, "C", isAcid ? "Concentración del ácido" : "Concentración de la base", { positive: true });
  const K = constant(input, isAcid ? "Valor de Ka o pKa" : "Valor de Kb o pKb");
  const sym = isAcid ? "a" : "b";
  const x = (2 * K * C) / (K + Math.sqrt(K * K + 4 * K * C));
  const alpha = (100 * x) / C;
  const steps = [
    { text: "Ecuación de equilibrio cuadrática, donde x = [H+] para el ácido o [OH-] para la base:", tex: `x^2 + K_${sym} x - K_${sym} C = 0,\\qquad K_${sym} = ${ntex(K, 6)},\\quad C = ${ntex(C)}` },
    { text: "Solución positiva:", tex: `x = \\frac{2K_${sym}C}{K_${sym} + \\sqrt{K_${sym}^2 + 4K_${sym}C}} = ${ntex(x, 6)}\\ M` }
  ];
  const extra = [{ label: "Grado de disociación α", value: `${fmt(alpha, 4)} %` }];
  return finish(isAcid ? x : KW / x, steps, extra);
}

function buffer(input) {
  const pKa = num(input, "pKa", "pKa");
  const A = num(input, "A", "Concentración de [A-]", { positive: true });
  const HA = num(input, "HA", "Concentración de [HA]", { positive: true });
  const pH = pKa + Math.log10(A / HA);
  const steps = [{ text: "Ecuación de Henderson-Hasselbalch:", tex: `pH = pK_a + \\log\\frac{[A^-]}{[HA]} = ${ntex(pKa)} + \\log\\frac{${ntex(A)}}{${ntex(HA)}} = ${ntex(pH, 6)}` }];
  return finish(Math.pow(10, -pH), steps);
}

function fromPh(input) {
  const pH = num(input, "pH", "Valor de pH", { min: 0, max: 14 });
  const H = Math.pow(10, -pH);
  const steps = [{ text: "[H+] = 10^(-pH):", tex: `[H^+] = 10^{-${ntex(pH)}} = ${ntex(H, 6)}\\ M` }];
  return finish(H, steps);
}

export function solve(input) {
  const type = choice(input, "type", "Tipo de disolución", TYPES, "strong-acid");
  if (type === "strong-acid") return strongAcid(input);
  if (type === "strong-base") return strongBase(input);
  if (type === "weak-acid") return weak(input, true);
  if (type === "weak-base") return weak(input, false);
  if (type === "buffer") return buffer(input);
  return fromPh(input);
}
