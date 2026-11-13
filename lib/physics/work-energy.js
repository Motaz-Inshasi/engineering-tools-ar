import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
const MODES = [
  ["ke", "الطاقة الحركية KE = ½mv²"],
  ["pe", "الطاقة الكامنة PE = mgh"],
  ["work", "الشغل W = F d cosθ"],
  ["power", "القدرة P = W/t أو P = Fv"],
  ["fall", "السرعة بعد السقوط مع فقد للطاقة"]
];

export const meta = {
  description: "حساب الطاقة الحركية والكامنة والشغل والقدرة وسرعة السقوط مع نسبة فقد للطاقة، باختيار الوضع المناسب، مع الخطوات والوحدات SI.",
  keywords: ["شغل", "طاقة", "طاقة حركية", "طاقة كامنة", "قدرة", "work", "energy", "power", "سقوط"],
  formulas: [
    { label: "الطاقة الحركية", tex: "KE = \\tfrac{1}{2}mv^2" },
    { label: "الطاقة الكامنة", tex: "PE = mgh" },
    { label: "الشغل والقدرة", tex: "W = Fd\\cos\\theta,\\qquad P = \\frac{W}{t} = Fv" },
    { label: "السرعة بعد السقوط", tex: "v = \\sqrt{\\left(v_0^2 + 2gh\\right)\\left(1 - \\frac{L}{100}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "الوضع", type: "select", default: "ke", options: MODES },
    { id: "m", label: "الكتلة m", unit: "kg", type: "number", default: "2", when: { mode: ["ke", "pe"] } },
    { id: "v", label: "السرعة v", unit: "m/s", type: "number", when: { mode: ["ke", "power"] }, help: "في وضع القدرة: اختيارية، وتُستعمل مع F لحساب P = Fv." },
    { id: "h", label: "الارتفاع h", unit: "m", type: "number", default: "10", when: { mode: ["pe", "fall"] } },
    { id: "g", label: "تسارع الجاذبية g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pe", "fall"] } },
    { id: "F", label: "القوة F", unit: "N", type: "number", when: { mode: ["work", "power"] }, help: "في وضع القدرة: اختيارية، وتُستعمل مع v لحساب P = Fv." },
    { id: "d", label: "الإزاحة d", unit: "m", type: "number", when: { mode: ["work"] } },
    { id: "theta", label: "الزاوية بين F و d θ", unit: "°", type: "number", default: "0", when: { mode: ["work"] } },
    { id: "W", label: "الشغل W", unit: "J", type: "number", when: { mode: ["power"] } },
    { id: "t", label: "الزمن t", unit: "s", type: "number", when: { mode: ["power"] } },
    { id: "v0", label: "السرعة الابتدائية v0", unit: "m/s", type: "number", when: { mode: ["fall"] } },
    { id: "loss", label: "نسبة الفقد في الطاقة", unit: "%", type: "number", default: "0", when: { mode: ["fall"] }, help: "من 0 إلى 100، تُخفَّض بها الطاقة الكلية بعد السقوط." }
  ],
  example: { values: { mode: "ke", m: "2", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" }, expect: ["KE = 100 J"], note: "مثال: كتلة 2 kg تتحرك بسرعة 10 m/s." },
  invalid: { values: { mode: "ke", m: "0", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" } },
  related: ["kinematics", "collisions", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const mode = choice(input, "mode", "الوضع", MODES.map((m) => m[0]), "ke");
  const steps = [];
  const results = [];
  let copy;
  let values;
  switch (mode) {
    case "ke": {
      const m = num(input, "m", "الكتلة", { positive: true });
      const v = num(input, "v", "السرعة", { nonNegative: true });
      const KE = 0.5 * m * v * v;
      steps.push({ text: "الطاقة الحركية:", tex: `KE = \\frac{1}{2}mv^2 = \\frac{1}{2} \\times ${T(m)} \\times (${T(v)})^2 = ${T(KE)}\\ J` });
      results.push({ label: "الطاقة الحركية KE", value: `${fmt(KE, 6)} J` });
      copy = `KE = ${fmt(KE, 6)} J`;
      values = { KE };
      break;
    }
    case "pe": {
      const m = num(input, "m", "الكتلة", { positive: true });
      const h = num(input, "h", "الارتفاع");
      const g = num(input, "g", "تسارع الجاذبية", { positive: true });
      const PE = m * g * h;
      steps.push({ text: "الطاقة الكامنة الثقالية:", tex: `PE = mgh = ${T(m)} \\times ${T(g)} \\times (${T(h)}) = ${T(PE)}\\ J` });
      results.push({ label: "الطاقة الكامنة PE", value: `${fmt(PE, 6)} J` });
      copy = `PE = ${fmt(PE, 6)} J`;
      values = { PE };
      break;
    }
    case "work": {
      const F = num(input, "F", "القوة F");
      const d = num(input, "d", "الإزاحة d");
      const theta = num(input, "theta", "الزاوية θ", { min: -360, max: 360 });
      const c = snap(Math.cos((theta * Math.PI) / 180));
      const W = F * d * c;
      steps.push({ text: "الشغل بالقوة الثابتة:", tex: `W = Fd\\cos\\theta = ${T(F)} \\times ${T(d)} \\times \\cos(${T(theta)}^\\circ) = ${T(W)}\\ J` });
      results.push({ label: "الشغل W", value: `${fmt(W, 6)} J` });
      copy = `W = ${fmt(W, 6)} J`;
      values = { W };
      break;
    }
    case "power": {
      const W = num(input, "W", "الشغل W");
      const t = num(input, "t", "الزمن t", { positive: true });
      const hasF = !isBlank(input.F);
      const hasV = !isBlank(input.v);
      if (hasF !== hasV) fail("لحساب P = Fv أدخل القوة F والسرعة v معاً، أو اتركهما فارغين.", hasF ? "v" : "F");
      const P = W / t;
      steps.push({ text: "القدرة المتوسطة:", tex: `P = \\frac{W}{t} = \\frac{${T(W)}}{${T(t)}} = ${T(P)}\\ W` });
      results.push({ label: "القدرة P = W/t", value: `${fmt(P, 6)} W` });
      copy = `P = ${fmt(P, 6)} W`;
      values = { P };
      if (hasF) {
        const F = num(input, "F", "القوة F");
        const v = num(input, "v", "السرعة v");
        const Pf = F * v;
        steps.push({ text: "القدرة اللحظية بدلالة القوة والسرعة:", tex: `P = Fv = ${T(F)} \\times ${T(v)} = ${T(Pf)}\\ W` });
        results.push({ label: "القدرة P = Fv", value: `${fmt(Pf, 6)} W` });
        copy += `، P = Fv = ${fmt(Pf, 6)} W`;
        values.Pf = Pf;
      }
      break;
    }
    case "fall": {
      const v0 = num(input, "v0", "السرعة الابتدائية", { nonNegative: true });
      const h = num(input, "h", "الارتفاع h", { nonNegative: true });
      const g = num(input, "g", "تسارع الجاذبية", { positive: true });
      const loss = num(input, "loss", "نسبة الفقد", { default: 0, min: 0, max: 100 });
      const energy = v0 * v0 + 2 * g * h;
      const vIdeal = Math.sqrt(energy);
      const v = Math.sqrt(energy * (1 - loss / 100));
      steps.push({ text: "بدون فقد، من حفظ الطاقة:", tex: `v_{ideal} = \\sqrt{v_0^2 + 2gh} = ${T(vIdeal)}\\ m/s` });
      steps.push({ text: "مع نسبة الفقد L تُخفَّض الطاقة الكلية بالنسبة (1 - L/100):", tex: `v = \\sqrt{(v_0^2 + 2gh)\\left(1 - \\frac{${T(loss)}}{100}\\right)} = ${T(v)}\\ m/s` });
      results.push({ label: "السرعة بعد السقوط v", value: `${fmt(v, 6)} m/s` });
      results.push({ label: "السرعة بدون فقد", value: `${fmt(vIdeal, 6)} m/s` });
      copy = `v = ${fmt(v, 6)} m/s، بدون فقد = ${fmt(vIdeal, 6)} m/s`;
      values = { v, vIdeal };
      break;
    }
  }
  return { results, steps, copy, values };
}
