import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KW = 1e-14;
const TYPES = ["strong-acid", "strong-base", "weak-acid", "weak-base", "buffer", "from-ph"];

export const meta = {
  description: "25 °C'de güçlü ve zayıf asit ile baz ile tampon çözeltinin pH ve pOH değerlerini, H+ ve OH- derişimlerini Henderson–Hasselbalch denklemiyle hesaplayın; iyonlaşma yüzdesini ve çözeltinin asidik, bazik veya nötr olduğunu belirtin.",
  keywords: ["pH", "pOH", "asit", "baz", "güçlü asit", "zayıf asit", "Ka", "Kb", "pKa", "tampon çözelti", "Henderson–Hasselbalch", "Henderson", "iyonlaşma", "Kw"],
  formulas: [
    { label: "25 °C'de su", tex: "K_w = [H^+][OH^-] = 10^{-14},\\qquad pH + pOH = 14" },
    { label: "zayıf asit", tex: "x^2 + K_a x - K_a C = 0,\\qquad [H^+] = x" },
    { label: "tampon çözelti", tex: "pH = pK_a + \\log\\frac{[A^-]}{[HA]}" }
  ],
  inputs: [
    { id: "type", label: "Çözelti türü", type: "select", default: "strong-acid", options: [["strong-acid", "güçlü asit"], ["strong-base", "Güçlü baz"], ["weak-acid", "zayıf asit"], ["weak-base", "Zayıf baz"], ["buffer", "Tampon çözelti (Henderson–Hasselbalch)"], ["from-ph", "pH'dan [H+] ve [OH-]'ye"]] },
    { id: "C", label: "Analitik derişim C", unit: "M", type: "number", default: "0.01", when: { type: ["strong-acid", "strong-base", "weak-acid", "weak-base"] } },
    { id: "hydroxides", label: "Bazdaki OH- grubu sayısı", type: "select", default: "1", options: [["1", "1 (örn. NaOH)"], ["2", "2 (örn. Ca(OH)2)"]], when: { type: ["strong-base"] } },
    { id: "constKind", label: "Girilen sabit türü", type: "select", default: "K", options: [["K", "K (Ka veya Kb)"], ["pK", "pK (pKa veya pKb)"]], when: { type: ["weak-acid", "weak-base"] } },
    { id: "constVal", label: "Sabit değeri", type: "number", default: "1.8e-5", when: { type: ["weak-acid", "weak-base"] }, help: "Örnek: asetik asit Ka = 1.8e-5 veya pKa = 4.74." },
    { id: "pKa", label: "Tampon çözelti için pKa", type: "number", default: "4.76", when: { type: ["buffer"] } },
    { id: "A", label: "Konjuge baz derişimi [A-]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "HA", label: "Asit derişimi [HA]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "pH", label: "pH değeri", type: "number", default: "7", when: { type: ["from-ph"] } }
  ],
  example: { values: { type: "strong-acid", C: "0.01", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" }, expect: ["pH = 2"], note: "Örnek: derişimi 0.01 M olan HCl asidi." },
  invalid: { values: { type: "weak-acid", C: "0", hydroxides: "1", constKind: "K", constVal: "1.8e-5", pKa: "", A: "", HA: "", pH: "" } },
  related: ["solutions", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function finish(H, steps, extra = []) {
  const OH = KW / H;
  const pH = -Math.log10(H);
  const pOH = -Math.log10(OH);
  const nature = Math.abs(pH - 7) < 1e-9 ? "nötr" : pH < 7 ? "asidik" : "bazik";
  const all = [...steps, { text: "pH ve pOH:", tex: `pH = -\\log[H^+] = ${ntex(pH, 6)},\\qquad pOH = 14 - pH = ${ntex(pOH, 6)}` }];
  return {
    results: [
      { label: "pH değeri", value: fmt(pH, 5) },
      { label: "pOH", value: fmt(pOH, 5) },
      { label: "Hidrojen iyonu derişimi [H+]", value: `${fmt(H, 4)} M` },
      { label: "Hidroksit iyonu derişimi [OH-]", value: `${fmt(OH, 4)} M` },
      { label: "Çözeltinin türü", value: nature },
      ...extra
    ],
    steps: all,
    copy: `pH = ${fmt(pH, 5)} (${nature})، pOH = ${fmt(pOH, 5)}، [H+] = ${fmt(H, 4)} M`
  };
}

function strongAcid(input) {
  const C = num(input, "C", "Asit derişimi", { positive: true });
  const exact = C < 1e-6;
  const H = exact ? (C + Math.sqrt(C * C + 4 * KW)) / 2 : C;
  const steps = [{ text: "Tek protonlu güçlü asit, [H+] = C:", tex: `[H^+] = C = ${ntex(C)}\\ M` }];
  if (exact) steps.push({ text: "Derişim çok düşük, suyun H+ iyonlarını da hesaba katarız:", tex: `[H^+] = \\frac{C + \\sqrt{C^2 + 4K_w}}{2} = ${ntex(H, 6)}\\ M` });
  return finish(H, steps);
}

function strongBase(input) {
  const C = num(input, "C", "Baz derişimi", { positive: true });
  const n = Number(choice(input, "hydroxides", "OH- grubu sayısı", ["1", "2"], "1"));
  const c2 = n * C;
  const exact = c2 < 1e-6;
  const OH = exact ? (c2 + Math.sqrt(c2 * c2 + 4 * KW)) / 2 : c2;
  const steps = [{ text: `Güçlü baz, OH- grubu sayısı = ${n}, dolayısıyla [OH-] = n·C:`, tex: `[OH^-] = ${n} \\times ${ntex(C)} = ${ntex(c2, 6)}\\ M` }];
  if (exact) steps.push({ text: "Derişim çok düşük, suyun OH- iyonlarını da hesaba katarız:", tex: `[OH^-] = \\frac{n C + \\sqrt{(nC)^2 + 4K_w}}{2} = ${ntex(OH, 6)}\\ M` });
  return finish(KW / OH, steps);
}

function constant(input, label) {
  const kind = choice(input, "constKind", "Sabit türü", ["K", "pK"], "K");
  const v = num(input, "constVal", label, kind === "K" ? { positive: true } : {});
  return kind === "K" ? v : Math.pow(10, -v);
}

function weak(input, isAcid) {
  const C = num(input, "C", isAcid ? "Asit derişimi" : "Baz derişimi", { positive: true });
  const K = constant(input, isAcid ? "Ka veya pKa değeri" : "Kb veya pKb değeri");
  const sym = isAcid ? "a" : "b";
  const x = (2 * K * C) / (K + Math.sqrt(K * K + 4 * K * C));
  const alpha = (100 * x) / C;
  const steps = [
    { text: "Denge karesel denklemi; x = asit için [H+], baz için [OH-]:", tex: `x^2 + K_${sym} x - K_${sym} C = 0,\\qquad K_${sym} = ${ntex(K, 6)},\\quad C = ${ntex(C)}` },
    { text: "Pozitif kök:", tex: `x = \\frac{2K_${sym}C}{K_${sym} + \\sqrt{K_${sym}^2 + 4K_${sym}C}} = ${ntex(x, 6)}\\ M` }
  ];
  const extra = [{ label: "İyonlaşma yüzdesi α", value: `${fmt(alpha, 4)} %` }];
  return finish(isAcid ? x : KW / x, steps, extra);
}

function buffer(input) {
  const pKa = num(input, "pKa", "pKa");
  const A = num(input, "A", "[A-] derişimi", { positive: true });
  const HA = num(input, "HA", "[HA] derişimi", { positive: true });
  const pH = pKa + Math.log10(A / HA);
  const steps = [{ text: "Henderson–Hasselbalch denklemi:", tex: `pH = pK_a + \\log\\frac{[A^-]}{[HA]} = ${ntex(pKa)} + \\log\\frac{${ntex(A)}}{${ntex(HA)}} = ${ntex(pH, 6)}` }];
  return finish(Math.pow(10, -pH), steps);
}

function fromPh(input) {
  const pH = num(input, "pH", "pH değeri", { min: 0, max: 14 });
  const H = Math.pow(10, -pH);
  const steps = [{ text: "[H+] = 10^(-pH):", tex: `[H^+] = 10^{-${ntex(pH)}} = ${ntex(H, 6)}\\ M` }];
  return finish(H, steps);
}

export function solve(input) {
  const type = choice(input, "type", "Çözelti türü", TYPES, "strong-acid");
  if (type === "strong-acid") return strongAcid(input);
  if (type === "strong-base") return strongBase(input);
  if (type === "weak-acid") return weak(input, true);
  if (type === "weak-base") return weak(input, false);
  if (type === "buffer") return buffer(input);
  return fromPh(input);
}
