import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const MODES = ["integrated", "arrhenius", "activation"];

export const meta = {
  description: "Kimyasal tepkime hızını analiz edin: 0., 1. veya 2. dereceden tepkime için kalan derişim [A]t ve yarılanma ömrünü grafikle birlikte hesaplayın; Arrhenius denklemiyle başka bir sıcaklıkta hız sabitini ya da iki sıcaklıktaki iki hız sabitinden aktivasyon enerjisini bulun.",
  keywords: ["kimyasal kinetik", "tepkime hızı", "tepkime derecesi", "yarılanma ömrü", "half-life", "hız sabiti", "Arrhenius", "Arrhenius", "aktivasyon enerjisi", "Ea", "kinetics"],
  formulas: [
    { label: "Sıfır dereceden", tex: "[A]_t = [A]_0 - kt,\\qquad t_{1/2} = \\frac{[A]_0}{2k}" },
    { label: "Birinci dereceden", tex: "[A]_t = [A]_0 e^{-kt},\\qquad t_{1/2} = \\frac{\\ln 2}{k}" },
    { label: "İkinci dereceden", tex: "\\frac{1}{[A]_t} = \\frac{1}{[A]_0} + kt,\\qquad t_{1/2} = \\frac{1}{k[A]_0}" },
    { label: "Arrhenius", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama türü", type: "select", default: "integrated", options: [["integrated", "Zamana bağlı [A] derişimi"], ["arrhenius", "Aktivasyon enerjisinden k2 hesabı"], ["activation", "k1 ve k2'den aktivasyon enerjisi hesabı"]] },
    { id: "order", label: "tepkime derecesi", type: "select", default: "1", options: [["0", "0. derece"], ["1", "1. derece"], ["2", "2. derece"]], when: { mode: ["integrated"] } },
    { id: "k", label: "Hız sabiti k", type: "number", default: "0.1", when: { mode: ["integrated"] }, help: "Birimi derece ve t zaman birimine uygun olmalıdır." },
    { id: "A0", label: "Başlangıç derişimi [A]0", type: "number", default: "1", when: { mode: ["integrated"] } },
    { id: "t", label: "Zaman t", type: "number", default: "10", when: { mode: ["integrated"] } },
    { id: "k1", label: "Birinci hız sabiti k1", type: "number", default: "1", when: { mode: ["arrhenius", "activation"] } },
    { id: "T1", label: "Birinci sıcaklık T1", unit: "K", type: "number", default: "300", when: { mode: ["arrhenius", "activation"] } },
    { id: "T2", label: "İkinci sıcaklık T2", unit: "K", type: "number", default: "310", when: { mode: ["arrhenius", "activation"] } },
    { id: "Ea", label: "Aktivasyon enerjisi Ea", unit: "kJ/mol", type: "number", default: "50", when: { mode: ["arrhenius"] } },
    { id: "k2", label: "İkinci hız sabiti k2", type: "number", default: "2", when: { mode: ["activation"] } }
  ],
  example: { values: { mode: "integrated", order: "1", k: "0.1", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" }, expect: ["0.3679", "6.931"], note: "Örnek: hız sabiti k = 0.1 ve başlangıç derişimi 1 olan birinci dereceden tepkime; 10 zaman biriminden sonra." },
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
  const order = Number(choice(input, "order", "Derece", ["0", "1", "2"], "1"));
  const k = num(input, "k", "Hız sabiti k", { positive: true });
  const A0 = num(input, "A0", "Başlangıç derişimi [A]0", { positive: true });
  const t = num(input, "t", "Zaman t", { nonNegative: true });
  const At = conc(order, A0, k, t);
  const half = halfLife(order, A0, k);
  const results = [
    { label: "Kalan derişim [A]t", value: fmt(At, 4) },
    { label: "Yarılanma ömrü t½", value: fmt(half, 4) }
  ];
  const steps = [];
  if (order === 0) {
    const raw = A0 - k * t;
    steps.push({ text: "Sıfır dereceden integral denklemi:", tex: `[A]_t = [A]_0 - kt = ${ntex(A0)} - ${ntex(k)} \\times ${ntex(t)} = ${ntex(raw, 6)}` });
    if (raw <= 0) {
      const tFull = A0 / k;
      results.push({ label: "Tamamen tükenme süresi t = [A]0/k", value: fmt(tFull, 4) });
      steps.push({ text: "Madde t zamanından önce tamamen tüketildi, bu nedenle kalan derişim sıfır:", tex: `t_{full} = \\frac{[A]_0}{k} = ${ntex(tFull, 6)}` });
    }
    steps.push({ text: "Sıfır dereceden yarılanma ömrü:", tex: `t_{1/2} = \\frac{[A]_0}{2k} = ${ntex(half, 6)}` });
  } else if (order === 1) {
    steps.push({ text: "Birinci dereceden integral denklemi:", tex: `[A]_t = [A]_0 e^{-kt} = ${ntex(A0)} e^{-${ntex(k)} \\times ${ntex(t)}} = ${ntex(At, 6)}` });
    steps.push({ text: "Birinci dereceden yarılanma ömrü:", tex: `t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693147}{${ntex(k)}} = ${ntex(half, 6)}` });
  } else {
    steps.push({ text: "İkinci dereceden integral denklemi:", tex: `\\frac{1}{[A]_t} = \\frac{1}{${ntex(A0)}} + ${ntex(k)} \\times ${ntex(t)},\\qquad [A]_t = ${ntex(At, 6)}` });
    steps.push({ text: "İkinci dereceden yarılanma ömrü:", tex: `t_{1/2} = \\frac{1}{k[A]_0} = ${ntex(half, 6)}` });
  }
  const tMax = Math.max(t, 3 * half);
  const N = 60;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (tMax * i) / N;
    points.push([x, conc(order, A0, k, x)]);
  }
  const blocks = [{ type: "plot", title: `Zamanla [A] değişimi (derece ${order})`, xLabel: "t", yLabel: "[A]", series: [{ name: "[A]", points, line: true }], vlines: [{ x: t }], includeZero: true }];
  return {
    results, steps, blocks,
    copy: `[A]t = ${fmt(At, 4)}، t½ = ${fmt(half, 4)}`
  };
}

function arrhenius(input) {
  const k1 = num(input, "k1", "Birinci hız sabiti k1", { positive: true });
  const T1 = num(input, "T1", "Birinci sıcaklık T1", { positive: true });
  const T2 = num(input, "T2", "İkinci sıcaklık T2", { positive: true });
  const Ea = num(input, "Ea", "Aktivasyon enerjisi Ea", { nonNegative: true });
  const lnRatio = (-Ea * 1000 / R) * (1 / T2 - 1 / T1);
  const k2 = k1 * Math.exp(lnRatio);
  return {
    results: [{ label: "İkinci hız sabiti k2", value: fmt(k2, 4) }],
    steps: [
      { text: "İki sıcaklık arasında Arrhenius denklemi:", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" },
      { text: "Ea'yı J/mol'e çevirerek yerine koyarsak:", tex: `\\ln\\frac{k_2}{k_1} = -\\frac{${ntex(Ea * 1000)}}{8.314}\\left(\\frac{1}{${ntex(T2)}} - \\frac{1}{${ntex(T1)}}\\right) = ${ntex(lnRatio, 6)}` },
      { text: "T2'deki hız sabiti:", tex: `k_2 = k_1 e^{${ntex(lnRatio, 6)}} = ${ntex(k1)} \\times ${ntex(Math.exp(lnRatio), 6)} = ${ntex(k2, 6)}` }
    ],
    copy: `k2 = ${fmt(k2, 4)}`
  };
}

function activation(input) {
  const k1 = num(input, "k1", "Birinci hız sabiti k1", { positive: true });
  const T1 = num(input, "T1", "Birinci sıcaklık T1", { positive: true });
  const k2 = num(input, "k2", "İkinci hız sabiti k2", { positive: true });
  const T2 = num(input, "T2", "İkinci sıcaklık T2", { positive: true });
  if (T1 === T2) fail("Aktivasyon enerjisini hesaplamak için T2, T1'den farklı olmalıdır.", "T2");
  const Ea = (R * Math.log(k2 / k1)) / (1 / T1 - 1 / T2) / 1000;
  return {
    results: [{ label: "Aktivasyon enerjisi Ea", value: `${fmt(Ea, 4)} kJ/mol` }],
    steps: [
      { text: "Arrhenius denkleminden Ea'yı hesaplarız:", tex: "E_a = \\frac{R \\ln(k_2/k_1)}{1/T_1 - 1/T_2}" },
      { text: "Yerine koyarak:", tex: `E_a = \\frac{8.314 \\times \\ln(${ntex(k2)}/${ntex(k1)})}{1/${ntex(T1)} - 1/${ntex(T2)}} = ${ntex(Ea, 6)}\\ \\text{kJ/mol}` }
    ],
    copy: `Ea = ${fmt(Ea, 4)} kJ/mol`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama türü", MODES, "integrated");
  if (mode === "integrated") return integrated(input);
  if (mode === "arrhenius") return arrhenius(input);
  return activation(input);
}
