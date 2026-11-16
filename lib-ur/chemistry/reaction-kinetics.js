import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const MODES = ["integrated", "arrhenius", "activation"];

export const meta = {
  description: "کیمیائی تعامل کی رفتار کا تجزیہ: صفر، پہلے یا دوسرے درجے کے تعامل کے لیے باقی ارتکاز [A]t اور ہاف لائف، گراف کے ساتھ، یا آرہینیئس مساوات سے کسی اور درجہ حرارت پر ریٹ کونسٹنٹ، یا دو ریٹ کونسٹنٹس سے ایکٹیویشن انرجی۔",
  keywords: ["کیمیائی حرکیات", "تعامل کی رفتار", "تعامل کا درجہ", "ہاف لائف", "half-life", "ریٹ کونسٹنٹ", "آرہینیئس", "Arrhenius", "ایکٹیویشن انرجی", "Ea", "kinetics"],
  formulas: [
    { label: "صفر درجہ", tex: "[A]_t = [A]_0 - kt,\\qquad t_{1/2} = \\frac{[A]_0}{2k}" },
    { label: "پہلا درجہ", tex: "[A]_t = [A]_0 e^{-kt},\\qquad t_{1/2} = \\frac{\\ln 2}{k}" },
    { label: "دوسرا درجہ", tex: "\\frac{1}{[A]_t} = \\frac{1}{[A]_0} + kt,\\qquad t_{1/2} = \\frac{1}{k[A]_0}" },
    { label: "آرہینیئس", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "integrated", options: [["integrated", "وقت کے ساتھ ارتکاز [A]"], ["arrhenius", "ایکٹیویشن انرجی سے k2 حساب کریں"], ["activation", "k1 اور k2 سے ایکٹیویشن انرجی حساب کریں"]] },
    { id: "order", label: "تعامل کا درجہ", type: "select", default: "1", options: [["0", "درجہ 0"], ["1", "درجہ 1"], ["2", "درجہ 2"]], when: { mode: ["integrated"] } },
    { id: "k", label: "ریٹ کونسٹنٹ k", type: "number", default: "0.1", when: { mode: ["integrated"] }, help: "اس کی اکائی درجے اور وقت کی اکائی t سے مطابقت رکھتی ہے۔" },
    { id: "A0", label: "ابتدائی ارتکاز [A]0", type: "number", default: "1", when: { mode: ["integrated"] } },
    { id: "t", label: "وقت t", type: "number", default: "10", when: { mode: ["integrated"] } },
    { id: "k1", label: "پہلا ریٹ کونسٹنٹ k1", type: "number", default: "1", when: { mode: ["arrhenius", "activation"] } },
    { id: "T1", label: "پہلا درجہ حرارت T1", unit: "K", type: "number", default: "300", when: { mode: ["arrhenius", "activation"] } },
    { id: "T2", label: "دوسرا درجہ حرارت T2", unit: "K", type: "number", default: "310", when: { mode: ["arrhenius", "activation"] } },
    { id: "Ea", label: "ایکٹیویشن انرجی Ea", unit: "kJ/mol", type: "number", default: "50", when: { mode: ["arrhenius"] } },
    { id: "k2", label: "دوسرا ریٹ کونسٹنٹ k2", type: "number", default: "2", when: { mode: ["activation"] } }
  ],
  example: { values: { mode: "integrated", order: "1", k: "0.1", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" }, expect: ["0.3679", "6.931"], note: "مثال: k = 0.1 کے ساتھ پہلے درجے کا تعامل، ابتدائی ارتکاز 1، 10 وقت کی اکائیوں کے بعد۔" },
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
  const order = Number(choice(input, "order", "درجہ", ["0", "1", "2"], "1"));
  const k = num(input, "k", "ریٹ کونسٹنٹ k", { positive: true });
  const A0 = num(input, "A0", "ابتدائی ارتکاز [A]0", { positive: true });
  const t = num(input, "t", "وقت t", { nonNegative: true });
  const At = conc(order, A0, k, t);
  const half = halfLife(order, A0, k);
  const results = [
    { label: "باقی ارتکاز [A]t", value: fmt(At, 4) },
    { label: "ہاف لائف t½", value: fmt(half, 4) }
  ];
  const steps = [];
  if (order === 0) {
    const raw = A0 - k * t;
    steps.push({ text: "صفر درجے کا انٹیگریٹڈ قانون:", tex: `[A]_t = [A]_0 - kt = ${ntex(A0)} - ${ntex(k)} \\times ${ntex(t)} = ${ntex(raw, 6)}` });
    if (raw <= 0) {
      const tFull = A0 / k;
      results.push({ label: "مکمل خرچ ہونے کا وقت t = [A]0/k", value: fmt(tFull, 4) });
      steps.push({ text: "متفاعل وقت t سے پہلے مکمل خرچ ہو چکا تھا، اس لیے باقی ارتکاز صفر ہے:", tex: `t_{full} = \\frac{[A]_0}{k} = ${ntex(tFull, 6)}` });
    }
    steps.push({ text: "صفر درجے کے لیے ہاف لائف:", tex: `t_{1/2} = \\frac{[A]_0}{2k} = ${ntex(half, 6)}` });
  } else if (order === 1) {
    steps.push({ text: "پہلے درجے کا انٹیگریٹڈ قانون:", tex: `[A]_t = [A]_0 e^{-kt} = ${ntex(A0)} e^{-${ntex(k)} \\times ${ntex(t)}} = ${ntex(At, 6)}` });
    steps.push({ text: "پہلے درجے کے لیے ہاف لائف:", tex: `t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693147}{${ntex(k)}} = ${ntex(half, 6)}` });
  } else {
    steps.push({ text: "دوسرے درجے کا انٹیگریٹڈ قانون:", tex: `\\frac{1}{[A]_t} = \\frac{1}{${ntex(A0)}} + ${ntex(k)} \\times ${ntex(t)},\\qquad [A]_t = ${ntex(At, 6)}` });
    steps.push({ text: "دوسرے درجے کے لیے ہاف لائف:", tex: `t_{1/2} = \\frac{1}{k[A]_0} = ${ntex(half, 6)}` });
  }
  const tMax = Math.max(t, 3 * half);
  const N = 60;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (tMax * i) / N;
    points.push([x, conc(order, A0, k, x)]);
  }
  const blocks = [{ type: "plot", title: `وقت کے ساتھ [A] کی تبدیلی (درجہ ${order})`, xLabel: "t", yLabel: "[A]", series: [{ name: "[A]", points, line: true }], vlines: [{ x: t }], includeZero: true }];
  return {
    results, steps, blocks,
    copy: `[A]t = ${fmt(At, 4)}، t½ = ${fmt(half, 4)}`
  };
}

function arrhenius(input) {
  const k1 = num(input, "k1", "پہلا ریٹ کونسٹنٹ k1", { positive: true });
  const T1 = num(input, "T1", "پہلا درجہ حرارت T1", { positive: true });
  const T2 = num(input, "T2", "دوسرا درجہ حرارت T2", { positive: true });
  const Ea = num(input, "Ea", "ایکٹیویشن انرجی Ea", { nonNegative: true });
  const lnRatio = (-Ea * 1000 / R) * (1 / T2 - 1 / T1);
  const k2 = k1 * Math.exp(lnRatio);
  return {
    results: [{ label: "دوسرا ریٹ کونسٹنٹ k2", value: fmt(k2, 4) }],
    steps: [
      { text: "دو درجہ حرارتوں کے درمیان آرہینیئس مساوات:", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" },
      { text: "Ea کو J/mol میں بدل کر قدر رکھتے ہوئے:", tex: `\\ln\\frac{k_2}{k_1} = -\\frac{${ntex(Ea * 1000)}}{8.314}\\left(\\frac{1}{${ntex(T2)}} - \\frac{1}{${ntex(T1)}}\\right) = ${ntex(lnRatio, 6)}` },
      { text: "T2 پر ریٹ کونسٹنٹ:", tex: `k_2 = k_1 e^{${ntex(lnRatio, 6)}} = ${ntex(k1)} \\times ${ntex(Math.exp(lnRatio), 6)} = ${ntex(k2, 6)}` }
    ],
    copy: `k2 = ${fmt(k2, 4)}`
  };
}

function activation(input) {
  const k1 = num(input, "k1", "پہلا ریٹ کونسٹنٹ k1", { positive: true });
  const T1 = num(input, "T1", "پہلا درجہ حرارت T1", { positive: true });
  const k2 = num(input, "k2", "دوسرا ریٹ کونسٹنٹ k2", { positive: true });
  const T2 = num(input, "T2", "دوسرا درجہ حرارت T2", { positive: true });
  if (T1 === T2) fail("ایکٹیویشن انرجی حساب کرنے کے لیے T2، T1 سے مختلف ہونا چاہیے۔", "T2");
  const Ea = (R * Math.log(k2 / k1)) / (1 / T1 - 1 / T2) / 1000;
  return {
    results: [{ label: "ایکٹیویشن انرجی Ea", value: `${fmt(Ea, 4)} kJ/mol` }],
    steps: [
      { text: "آرہینیئس مساوات سے ہم Ea حساب کرتے ہیں:", tex: "E_a = \\frac{R \\ln(k_2/k_1)}{1/T_1 - 1/T_2}" },
      { text: "قدر رکھتے ہوئے:", tex: `E_a = \\frac{8.314 \\times \\ln(${ntex(k2)}/${ntex(k1)})}{1/${ntex(T1)} - 1/${ntex(T2)}} = ${ntex(Ea, 6)}\\ \\text{kJ/mol}` }
    ],
    copy: `Ea = ${fmt(Ea, 4)} kJ/mol`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", MODES, "integrated");
  if (mode === "integrated") return integrated(input);
  if (mode === "arrhenius") return arrhenius(input);
  return activation(input);
}
