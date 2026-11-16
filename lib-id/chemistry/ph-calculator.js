import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const KW = 1e-14;
const TYPES = ["strong-acid", "strong-base", "weak-acid", "weak-base", "buffer", "from-ph"];

export const meta = {
  description: "Hitung pH, pOH, serta konsentrasi ion H+ dan OH- untuk asam dan basa kuat maupun lemah serta larutan penyangga dengan persamaan Henderson–Hasselbalch, dengan derajat ionisasi dan klasifikasi larutan menjadi asam, basa, atau netral pada 25 °C.",
  keywords: ["pH", "pOH", "asam", "basa", "asam kuat", "asam lemah", "Ka", "Kb", "pKa", "larutan penyangga", "Henderson–Hasselbalch", "Henderson", "ionisasi", "Kw"],
  formulas: [
    { label: "Air pada 25 °C", tex: "K_w = [H^+][OH^-] = 10^{-14},\\qquad pH + pOH = 14" },
    { label: "asam lemah", tex: "x^2 + K_a x - K_a C = 0,\\qquad [H^+] = x" },
    { label: "larutan penyangga", tex: "pH = pK_a + \\log\\frac{[A^-]}{[HA]}" }
  ],
  inputs: [
    { id: "type", label: "Jenis larutan", type: "select", default: "strong-acid", options: [["strong-acid", "asam kuat"], ["strong-base", "basa kuat"], ["weak-acid", "asam lemah"], ["weak-base", "basa lemah"], ["buffer", "Larutan penyangga (Henderson–Hasselbalch)"], ["from-ph", "Dari pH ke [H+] dan [OH-]"]] },
    { id: "C", label: "Konsentrasi analitik C", unit: "M", type: "number", default: "0.01", when: { type: ["strong-acid", "strong-base", "weak-acid", "weak-base"] } },
    { id: "hydroxides", label: "Jumlah gugus OH- dalam basa", type: "select", default: "1", options: [["1", "1 (misalnya NaOH)"], ["2", "2 (misalnya Ca(OH)2)"]], when: { type: ["strong-base"] } },
    { id: "constKind", label: "Jenis konstanta yang dimasukkan", type: "select", default: "K", options: [["K", "K (Ka atau Kb)"], ["pK", "pK (pKa atau pKb)"]], when: { type: ["weak-acid", "weak-base"] } },
    { id: "constVal", label: "Nilai konstanta", type: "number", default: "1.8e-5", when: { type: ["weak-acid", "weak-base"] }, help: "Contoh: asam asetat Ka = 1.8e-5 atau pKa = 4.74." },
    { id: "pKa", label: "pKa larutan penyangga", type: "number", default: "4.76", when: { type: ["buffer"] } },
    { id: "A", label: "Konsentrasi ion konjugasi [A-]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "HA", label: "Konsentrasi asam [HA]", unit: "M", type: "number", default: "0.1", when: { type: ["buffer"] } },
    { id: "pH", label: "Nilai pH", type: "number", default: "7", when: { type: ["from-ph"] } }
  ],
  example: { values: { type: "strong-acid", C: "0.01", hydroxides: "1", constKind: "K", constVal: "", pKa: "", A: "", HA: "", pH: "" }, expect: ["pH = 2"], note: "Contoh: asam HCl dengan konsentrasi 0.01 M." },
  invalid: { values: { type: "weak-acid", C: "0", hydroxides: "1", constKind: "K", constVal: "1.8e-5", pKa: "", A: "", HA: "", pH: "" } },
  related: ["solutions", "reaction-kinetics", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function finish(H, steps, extra = []) {
  const OH = KW / H;
  const pH = -Math.log10(H);
  const pOH = -Math.log10(OH);
  const nature = Math.abs(pH - 7) < 1e-9 ? "netral" : pH < 7 ? "asam" : "basa";
  const all = [...steps, { text: "pH dan pOH:", tex: `pH = -\\log[H^+] = ${ntex(pH, 6)},\\qquad pOH = 14 - pH = ${ntex(pOH, 6)}` }];
  return {
    results: [
      { label: "Nilai pH", value: fmt(pH, 5) },
      { label: "pOH", value: fmt(pOH, 5) },
      { label: "Konsentrasi ion hidrogen [H+]", value: `${fmt(H, 4)} M` },
      { label: "Konsentrasi ion hidroksida [OH-]", value: `${fmt(OH, 4)} M` },
      { label: "Sifat larutan", value: nature },
      ...extra
    ],
    steps: all,
    copy: `pH = ${fmt(pH, 5)} (${nature})، pOH = ${fmt(pOH, 5)}، [H+] = ${fmt(H, 4)} M`
  };
}

function strongAcid(input) {
  const C = num(input, "C", "Konsentrasi asam", { positive: true });
  const exact = C < 1e-6;
  const H = exact ? (C + Math.sqrt(C * C + 4 * KW)) / 2 : C;
  const steps = [{ text: "Asam kuat monoprotik, [H+] = C:", tex: `[H^+] = C = ${ntex(C)}\\ M` }];
  if (exact) steps.push({ text: "Konsentrasinya sangat rendah, sehingga kita perhitungkan ion H+ dari air:", tex: `[H^+] = \\frac{C + \\sqrt{C^2 + 4K_w}}{2} = ${ntex(H, 6)}\\ M` });
  return finish(H, steps);
}

function strongBase(input) {
  const C = num(input, "C", "Konsentrasi basa", { positive: true });
  const n = Number(choice(input, "hydroxides", "Jumlah gugus OH-", ["1", "2"], "1"));
  const c2 = n * C;
  const exact = c2 < 1e-6;
  const OH = exact ? (c2 + Math.sqrt(c2 * c2 + 4 * KW)) / 2 : c2;
  const steps = [{ text: `Basa kuat, jumlah gugus OH- = ${n}, sehingga [OH-] = n·C:`, tex: `[OH^-] = ${n} \\times ${ntex(C)} = ${ntex(c2, 6)}\\ M` }];
  if (exact) steps.push({ text: "Konsentrasinya sangat rendah, sehingga kita perhitungkan ion OH- dari air:", tex: `[OH^-] = \\frac{n C + \\sqrt{(nC)^2 + 4K_w}}{2} = ${ntex(OH, 6)}\\ M` });
  return finish(KW / OH, steps);
}

function constant(input, label) {
  const kind = choice(input, "constKind", "Jenis konstanta", ["K", "pK"], "K");
  const v = num(input, "constVal", label, kind === "K" ? { positive: true } : {});
  return kind === "K" ? v : Math.pow(10, -v);
}

function weak(input, isAcid) {
  const C = num(input, "C", isAcid ? "Konsentrasi asam" : "Konsentrasi basa", { positive: true });
  const K = constant(input, isAcid ? "Nilai Ka atau pKa" : "Nilai Kb atau pKb");
  const sym = isAcid ? "a" : "b";
  const x = (2 * K * C) / (K + Math.sqrt(K * K + 4 * K * C));
  const alpha = (100 * x) / C;
  const steps = [
    { text: "Persamaan kesetimbangan kuadrat, dengan x = [H+] untuk asam atau [OH-] untuk basa:", tex: `x^2 + K_${sym} x - K_${sym} C = 0,\\qquad K_${sym} = ${ntex(K, 6)},\\quad C = ${ntex(C)}` },
    { text: "Akar positif:", tex: `x = \\frac{2K_${sym}C}{K_${sym} + \\sqrt{K_${sym}^2 + 4K_${sym}C}} = ${ntex(x, 6)}\\ M` }
  ];
  const extra = [{ label: "Derajat ionisasi α", value: `${fmt(alpha, 4)} %` }];
  return finish(isAcid ? x : KW / x, steps, extra);
}

function buffer(input) {
  const pKa = num(input, "pKa", "pKa");
  const A = num(input, "A", "Konsentrasi [A-]", { positive: true });
  const HA = num(input, "HA", "Konsentrasi [HA]", { positive: true });
  const pH = pKa + Math.log10(A / HA);
  const steps = [{ text: "Persamaan Henderson–Hasselbalch:", tex: `pH = pK_a + \\log\\frac{[A^-]}{[HA]} = ${ntex(pKa)} + \\log\\frac{${ntex(A)}}{${ntex(HA)}} = ${ntex(pH, 6)}` }];
  return finish(Math.pow(10, -pH), steps);
}

function fromPh(input) {
  const pH = num(input, "pH", "Nilai pH", { min: 0, max: 14 });
  const H = Math.pow(10, -pH);
  const steps = [{ text: "[H+] = 10^(-pH):", tex: `[H^+] = 10^{-${ntex(pH)}} = ${ntex(H, 6)}\\ M` }];
  return finish(H, steps);
}

export function solve(input) {
  const type = choice(input, "type", "Jenis larutan", TYPES, "strong-acid");
  if (type === "strong-acid") return strongAcid(input);
  if (type === "strong-base") return strongBase(input);
  if (type === "weak-acid") return weak(input, true);
  if (type === "weak-base") return weak(input, false);
  if (type === "buffer") return buffer(input);
  return fromPh(input);
}
