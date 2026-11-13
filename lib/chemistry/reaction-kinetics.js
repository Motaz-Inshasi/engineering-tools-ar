import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const MODES = ["integrated", "arrhenius", "activation"];

export const meta = {
  description: "حلّل سرعة التفاعل الكيميائي: احسب التركيز المتبقي [A]t وزمن نصف العمر لتفاعل من الرتبة 0 أو 1 أو 2 مع رسم البيانات، أو احسب ثابت السرعة عند درجة حرارة أخرى بمعادلة أرهينيوس، أو طاقة التنشيط من ثابتي سرعة عند درجتين.",
  keywords: ["حركية كيميائية", "سرعة التفاعل", "رتبة التفاعل", "نصف العمر", "half-life", "ثابت السرعة", "أرهينيوس", "Arrhenius", "طاقة التنشيط", "Ea", "kinetics"],
  formulas: [
    { label: "الرتبة الصفرية", tex: "[A]_t = [A]_0 - kt,\\qquad t_{1/2} = \\frac{[A]_0}{2k}" },
    { label: "الرتبة الأولى", tex: "[A]_t = [A]_0 e^{-kt},\\qquad t_{1/2} = \\frac{\\ln 2}{k}" },
    { label: "الرتبة الثانية", tex: "\\frac{1}{[A]_t} = \\frac{1}{[A]_0} + kt,\\qquad t_{1/2} = \\frac{1}{k[A]_0}" },
    { label: "أرهينيوس", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "integrated", options: [["integrated", "تركيز [A] مع الزمن"], ["arrhenius", "حساب k2 من طاقة التنشيط"], ["activation", "حساب طاقة التنشيط من k1 وk2"]] },
    { id: "order", label: "رتبة التفاعل", type: "select", default: "1", options: [["0", "الرتبة 0"], ["1", "الرتبة 1"], ["2", "الرتبة 2"]], when: { mode: ["integrated"] } },
    { id: "k", label: "ثابت السرعة k", type: "number", default: "0.1", when: { mode: ["integrated"] }, help: "وحدته تتوافق مع الرتبة ووحدة الزمن t." },
    { id: "A0", label: "التركيز الابتدائي [A]0", type: "number", default: "1", when: { mode: ["integrated"] } },
    { id: "t", label: "الزمن t", type: "number", default: "10", when: { mode: ["integrated"] } },
    { id: "k1", label: "ثابت السرعة الأول k1", type: "number", default: "1", when: { mode: ["arrhenius", "activation"] } },
    { id: "T1", label: "درجة الحرارة الأولى T1", unit: "K", type: "number", default: "300", when: { mode: ["arrhenius", "activation"] } },
    { id: "T2", label: "درجة الحرارة الثانية T2", unit: "K", type: "number", default: "310", when: { mode: ["arrhenius", "activation"] } },
    { id: "Ea", label: "طاقة التنشيط Ea", unit: "kJ/mol", type: "number", default: "50", when: { mode: ["arrhenius"] } },
    { id: "k2", label: "ثابت السرعة الثاني k2", type: "number", default: "2", when: { mode: ["activation"] } }
  ],
  example: { values: { mode: "integrated", order: "1", k: "0.1", A0: "1", t: "10", k1: "", T1: "", T2: "", Ea: "", k2: "" }, expect: ["0.3679", "6.931"], note: "مثال: تفاعل من الرتبة الأولى بثابت k = 0.1 وتركيز ابتدائي 1 بعد 10 وحدات زمن." },
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
  const order = Number(choice(input, "order", "الرتبة", ["0", "1", "2"], "1"));
  const k = num(input, "k", "ثابت السرعة k", { positive: true });
  const A0 = num(input, "A0", "التركيز الابتدائي [A]0", { positive: true });
  const t = num(input, "t", "الزمن t", { nonNegative: true });
  const At = conc(order, A0, k, t);
  const half = halfLife(order, A0, k);
  const results = [
    { label: "التركيز المتبقي [A]t", value: fmt(At, 4) },
    { label: "زمن نصف العمر t½", value: fmt(half, 4) }
  ];
  const steps = [];
  if (order === 0) {
    const raw = A0 - k * t;
    steps.push({ text: "قانون التكامل للرتبة الصفرية:", tex: `[A]_t = [A]_0 - kt = ${ntex(A0)} - ${ntex(k)} \\times ${ntex(t)} = ${ntex(raw, 6)}` });
    if (raw <= 0) {
      const tFull = A0 / k;
      results.push({ label: "زمن الاستهلاك الكامل t = [A]0/k", value: fmt(tFull, 4) });
      steps.push({ text: "المتفاعل استُهلك بالكامل قبل الزمن t، فالتركيز المتبقي صفر:", tex: `t_{full} = \\frac{[A]_0}{k} = ${ntex(tFull, 6)}` });
    }
    steps.push({ text: "زمن نصف العمر للرتبة الصفرية:", tex: `t_{1/2} = \\frac{[A]_0}{2k} = ${ntex(half, 6)}` });
  } else if (order === 1) {
    steps.push({ text: "قانون التكامل للرتبة الأولى:", tex: `[A]_t = [A]_0 e^{-kt} = ${ntex(A0)} e^{-${ntex(k)} \\times ${ntex(t)}} = ${ntex(At, 6)}` });
    steps.push({ text: "زمن نصف العمر للرتبة الأولى:", tex: `t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693147}{${ntex(k)}} = ${ntex(half, 6)}` });
  } else {
    steps.push({ text: "قانون التكامل للرتبة الثانية:", tex: `\\frac{1}{[A]_t} = \\frac{1}{${ntex(A0)}} + ${ntex(k)} \\times ${ntex(t)},\\qquad [A]_t = ${ntex(At, 6)}` });
    steps.push({ text: "زمن نصف العمر للرتبة الثانية:", tex: `t_{1/2} = \\frac{1}{k[A]_0} = ${ntex(half, 6)}` });
  }
  const tMax = Math.max(t, 3 * half);
  const N = 60;
  const points = [];
  for (let i = 0; i <= N; i++) {
    const x = (tMax * i) / N;
    points.push([x, conc(order, A0, k, x)]);
  }
  const blocks = [{ type: "plot", title: `تغير [A] مع الزمن (الرتبة ${order})`, xLabel: "t", yLabel: "[A]", series: [{ name: "[A]", points, line: true }], vlines: [{ x: t }], includeZero: true }];
  return {
    results, steps, blocks,
    copy: `[A]t = ${fmt(At, 4)}، t½ = ${fmt(half, 4)}`
  };
}

function arrhenius(input) {
  const k1 = num(input, "k1", "ثابت السرعة الأول k1", { positive: true });
  const T1 = num(input, "T1", "درجة الحرارة الأولى T1", { positive: true });
  const T2 = num(input, "T2", "درجة الحرارة الثانية T2", { positive: true });
  const Ea = num(input, "Ea", "طاقة التنشيط Ea", { nonNegative: true });
  const lnRatio = (-Ea * 1000 / R) * (1 / T2 - 1 / T1);
  const k2 = k1 * Math.exp(lnRatio);
  return {
    results: [{ label: "ثابت السرعة الثاني k2", value: fmt(k2, 4) }],
    steps: [
      { text: "معادلة أرهينيوس بين درجتين:", tex: "\\ln\\frac{k_2}{k_1} = -\\frac{E_a}{R}\\left(\\frac{1}{T_2} - \\frac{1}{T_1}\\right)" },
      { text: "بالتعويض مع تحويل Ea إلى J/mol:", tex: `\\ln\\frac{k_2}{k_1} = -\\frac{${ntex(Ea * 1000)}}{8.314}\\left(\\frac{1}{${ntex(T2)}} - \\frac{1}{${ntex(T1)}}\\right) = ${ntex(lnRatio, 6)}` },
      { text: "ثابت السرعة عند T2:", tex: `k_2 = k_1 e^{${ntex(lnRatio, 6)}} = ${ntex(k1)} \\times ${ntex(Math.exp(lnRatio), 6)} = ${ntex(k2, 6)}` }
    ],
    copy: `k2 = ${fmt(k2, 4)}`
  };
}

function activation(input) {
  const k1 = num(input, "k1", "ثابت السرعة الأول k1", { positive: true });
  const T1 = num(input, "T1", "درجة الحرارة الأولى T1", { positive: true });
  const k2 = num(input, "k2", "ثابت السرعة الثاني k2", { positive: true });
  const T2 = num(input, "T2", "درجة الحرارة الثانية T2", { positive: true });
  if (T1 === T2) fail("يجب أن تختلف T2 عن T1 لحساب طاقة التنشيط.", "T2");
  const Ea = (R * Math.log(k2 / k1)) / (1 / T1 - 1 / T2) / 1000;
  return {
    results: [{ label: "طاقة التنشيط Ea", value: `${fmt(Ea, 4)} kJ/mol` }],
    steps: [
      { text: "من معادلة أرهينيوس نحسب Ea:", tex: "E_a = \\frac{R \\ln(k_2/k_1)}{1/T_1 - 1/T_2}" },
      { text: "بالتعويض:", tex: `E_a = \\frac{8.314 \\times \\ln(${ntex(k2)}/${ntex(k1)})}{1/${ntex(T1)} - 1/${ntex(T2)}} = ${ntex(Ea, 6)}\\ \\text{kJ/mol}` }
    ],
    copy: `Ea = ${fmt(Ea, 4)} kJ/mol`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", MODES, "integrated");
  if (mode === "integrated") return integrated(input);
  if (mode === "arrhenius") return arrhenius(input);
  return activation(input);
}
