import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const MODES = ["integrated", "arrhenius", "activation"];

export const meta = {
  description: "Analisis laju reaksi kimia: hitung konsentrasi tersisa [A]t dan waktu paruh untuk reaksi orde 0, 1, atau 2 beserta grafik datanya, atau hitung konstanta laju pada suhu lain dengan persamaan Arrhenius, atau energi aktivasi dari dua konstanta laju pada dua suhu.",
  keywords: ["kinetika kimia", "laju reaksi", "orde reaksi", "waktu paruh", "half-life", "konstanta laju", "Arrhenius", "Arrhenius", "energi aktivasi", "Ea", "kinetics"],
  formulas: [
    { label: "Orde nol", tex: "[A]_t = [A]_0 - kt,\\qquad t_{1/2} = \\frac{[A]_0}{2k}" },
    { label: "Orde satu", tex: "[A]_t = [A]_0 e^{-kt},\\qquad t_{1/2} = \\frac{\\ln 2}{k}" },
    { label: "Orde dua", tex: "\\frac{1}{[A]_t} = \\frac{1}{[A]_0} + kt,\\qquad t_{1/2} = \\frac{1}{k[A]_0}" },
    { label: "Arrhenius", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" }
  ],
  inputs: [
    { id: "mode", label: "Jenis perhitungan", type: "select", default: "integrated", options: [["integrated", "Konsentrasi [A] terhadap waktu"], ["arrhenius", "Hitung k2 dari energi aktivasi"], ["activation", "Hitung energi aktivasi dari k1 dan k2"]] },
    { id: "order", label: "orde reaksi", type: "select", default: "1", options: [["0", "Orde 0"], ["1", "Orde 1"], ["2", "Orde 2"]], when: { mode: ["integrated"] } },
    { id: "k", label: "Konstanta laju k", type: "number", default: "0.1", when: { mode: ["integrated"] }, help: "Satuannya sesuai dengan orde dan satuan waktu t." },
    { id: "A0", label: "Konsentrasi awal [A]0", type: "number", default: "1", when: { mode: ["integrated"] } },
    { id: "t", label: "Waktu t", type: "number", default: "10", when: { mode: ["integrated"] } },
    { id: "k1", label: "Konstanta laju pertama k1", type: "number", default: "1", when: { mode: ["arrhenius", "activation"] } },
    { id: "T1", label: "Suhu pertama T1", unit: "K", type: "number", default: "300", when: { mode: ["arrhenius", "activation"] } },
    { id: "T2", label: "Suhu kedua T2", unit: "K", type: "number", default: "310", when: { mode: ["arrhenius", "activation"] } },
    { id: "Ea", label: "Energi aktivasi Ea", unit: "kJ/mol", type: "number", default: "50", when: { mode: ["arrhenius"] } },
    { id: "k2", label: "Konstanta laju kedua k2", type: "number", default: "2", when: { mode: ["activation"] } }
  ],
  example: { values: { mode: "integrated", order: "1", k: "0.1", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" }, expect: ["0.3679", "6.931"], note: "Contoh: reaksi orde pertama dengan k = 0.1 dan konsentrasi awal 1, setelah 10 satuan waktu." },
  invalid: { values: { mode: "integrated", order: "1", k: "0", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" } },
  related: ["solutions", "ph-calculator", "periodic-table", "molar-mass", "stoichiometry", "empirical-formula", "equation-balancer"]
};

function conc(order, A0, k, t) {
  if (order === 0) return Math.max(0, A0 - k * t);
  if (order === 1) return A0 * Math.exp(-k * t);
  return 1 / (1 / A0 + k * t);
}

function halfLife(order, A0, k) {
  if (order === 0) return A0 / (2 * k);
  if (order === 1) return Math.LN2 / k;
  return 1 / (k * A0);
}

function integrated(input) {
  const order = Number(choice(input, "order", "Orde", ["0", "1", "2"], "1"));
  const k = num(input, "k", "Konstanta laju k", { positive: true });
  const A0 = num(input, "A0", "Konsentrasi awal [A]0", { positive: true });
  const t = num(input, "t", "Waktu t", { nonNegative: true });
  const At = conc(order, A0, k, t);
  const half = halfLife(order, A0, k);
  const results = [
    { label: "Konsentrasi tersisa [A]t", value: fmt(At, 4) },
    { label: "Waktu paruh t½", value: fmt(half, 4) }
  ];
  const steps = [];
  if (order === 0) {
    const raw = A0 - k * t;
    steps.push({ text: "Hukum laju terintegrasi untuk orde nol:", tex: `[A]_t = [A]_0 - kt = ${ntex(A0)} - ${ntex(k)} \\times ${ntex(t)} = ${ntex(raw, 6)}` });
    if (raw <= 0) {
      const tFull = A0 / k;
      results.push({ label: "Waktu habis total t = [A]0/k", value: fmt(tFull, 4) });
      steps.push({ text: "Pereaksi habis seluruhnya sebelum waktu t, sehingga konsentrasi sisanya nol:", tex: `t_{full} = \\frac{[A]_0}{k} = ${ntex(tFull, 6)}` });
    }
    steps.push({ text: "Waktu paruh untuk orde nol:", tex: `t_{1/2} = \\frac{[A]_0}{2k} = ${ntex(half, 6)}` });
  } else if (order === 1) {
    steps.push({ text: "Hukum laju terintegrasi untuk orde pertama:", tex: `[A]_t = [A]_0 e^{-kt} = ${ntex(A0)} e^{-${ntex(k)} \\times ${ntex(t)}} = ${ntex(At, 6)}` });
    steps.push({ text: "Waktu paruh untuk orde pertama:", tex: `t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693147}{${ntex(k)}} = ${ntex(half, 6)}` });
  } else {
    steps.push({ text: "Hukum laju terintegrasi untuk orde kedua:", tex: `\\frac{1}{[A]_t} = \\frac{1}{${ntex(A0)}} + ${ntex(k)} \\times ${ntex(t)},\\qquad [A]_t = ${ntex(At, 6)}` });
    steps.push({ text: "Waktu paruh untuk orde kedua:", tex: `t_{1/2} = \\frac{1}{k[A]_0} = ${ntex(half, 6)}` });
  }
  const tMax = Math.max(t, 3 * half);
  const N = 60;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (tMax * i) / N;
    points.push([x, conc(order, A0, k, x)]);
  }
  const blocks = [{ type: "plot", title: `Perubahan [A] terhadap waktu (orde ${order})`, xLabel: "t", yLabel: "[A]", series: [{ name: "[A]", points, line: true }], vlines: [{ x: t }], includeZero: true }];
  return {
    results, steps, blocks,
    copy: `[A]t = ${fmt(At, 4)}، t½ = ${fmt(half, 4)}`
  };
}

function arrhenius(input) {
  const k1 = num(input, "k1", "Konstanta laju pertama k1", { positive: true });
  const T1 = num(input, "T1", "Suhu pertama T1", { positive: true });
  const T2 = num(input, "T2", "Suhu kedua T2", { positive: true });
  const Ea = num(input, "Ea", "Energi aktivasi Ea", { nonNegative: true });
  const lnRatio = (-Ea * 1000 / R) * (1 / T2 - 1 / T1);
  const k2 = k1 * Math.exp(lnRatio);
  return {
    results: [{ label: "Konstanta laju kedua k2", value: fmt(k2, 4) }],
    steps: [
      { text: "Persamaan Arrhenius antara dua suhu:", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" },
      { text: "Dengan substitusi, Ea dikonversi ke J/mol:", tex: `\\ln\\frac{k_2}{k_1} = -\\frac{${ntex(Ea * 1000)}}{8.314}\\left(\\frac{1}{${ntex(T2)}} - \\frac{1}{${ntex(T1)}}\\right) = ${ntex(lnRatio, 6)}` },
      { text: "Konstanta laju pada T2:", tex: `k_2 = k_1 e^{${ntex(lnRatio, 6)}} = ${ntex(k1)} \\times ${ntex(Math.exp(lnRatio), 6)} = ${ntex(k2, 6)}` }
    ],
    copy: `k2 = ${fmt(k2, 4)}`
  };
}

function activation(input) {
  const k1 = num(input, "k1", "Konstanta laju pertama k1", { positive: true });
  const T1 = num(input, "T1", "Suhu pertama T1", { positive: true });
  const k2 = num(input, "k2", "Konstanta laju kedua k2", { positive: true });
  const T2 = num(input, "T2", "Suhu kedua T2", { positive: true });
  if (T1 === T2) fail("T2 harus berbeda dari T1 untuk menghitung energi aktivasi.", "T2");
  const Ea = (R * Math.log(k2 / k1)) / (1 / T1 - 1 / T2) / 1000;
  return {
    results: [{ label: "Energi aktivasi Ea", value: `${fmt(Ea, 4)} kJ/mol` }],
    steps: [
      { text: "Dari persamaan Arrhenius kita hitung Ea:", tex: "E_a = \\frac{R \\ln(k_2/k_1)}{1/T_1 - 1/T_2}" },
      { text: "Dengan substitusi:", tex: `E_a = \\frac{8.314 \\times \\ln(${ntex(k2)}/${ntex(k1)})}{1/${ntex(T1)} - 1/${ntex(T2)}} = ${ntex(Ea, 6)}\\ \\text{kJ/mol}` }
    ],
    copy: `Ea = ${fmt(Ea, 4)} kJ/mol`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", MODES, "integrated");
  if (mode === "integrated") return integrated(input);
  if (mode === "arrhenius") return arrhenius(input);
  return activation(input);
}
