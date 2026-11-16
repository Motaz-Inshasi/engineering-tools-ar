import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const CVD = { A: 3.9083e-3, B: -5.775e-7, C: -4.183e-12 };

export const meta = {
  description: "پلاٹینم RTD درجہ حرارت سینسر (جیسے PT100 اور PT1000) کے لیے IEC 60751 معیار کے مطابق Callendar–Van Dusen مساوات: درجہ حرارت سے مزاحمت اور مزاحمت سے درجہ حرارت، −200 سے 850 °C تک۔",
  keywords: ["RTD", "PT100", "PT1000", "پلاٹینم درجہ حرارت سینسر", "Callendar Van Dusen", "IEC 60751", "مزاحمتی تھرمامیٹر"],
  formulas: [
    { label: "صفر سے اوپر (0 سے 850 °C)", tex: "R(T) = R_0\\left(1 + AT + BT^2\\right)" },
    { label: "صفر سے نیچے (−200 سے 0 °C)", tex: "R(T) = R_0\\left[1 + AT + BT^2 + C(T - 100)T^3\\right]" }
  ],
  inputs: [
    { id: "type", label: "قسم", type: "select", default: "100", options: [["100", "PT100"], ["500", "PT500"], ["1000", "PT1000"]] },
    { id: "dir", label: "حساب کریں", type: "select", default: "r2t", options: [["r2t", "مزاحمت سے درجہ حرارت"], ["t2r", "درجہ حرارت سے مزاحمت"]] },
    { id: "R", label: "ناپی گئی مزاحمت", unit: "Ω", type: "number", default: "138.5055", when: { dir: ["r2t"] } },
    { id: "T", label: "درجہ حرارت", unit: "°C", type: "number", default: "100", when: { dir: ["t2r"] } }
  ],
  example: { values: { type: "100", dir: "r2t", R: "138.5055" }, expect: ["T = 100 °C"], note: "مثال: PT100 جس کی مزاحمت 138.5055 Ω ہے (معیاری جدول کی قدر 100 °C پر)۔" },
  invalid: { values: { type: "100", dir: "t2r", T: "1000" } },
  related: ["thermistor", "wheatstone-bridge", "adc", "sensor-divider"]
};

export function rOfT(R0, T) {
  const { A, B, C } = CVD;
  return T >= 0 ? R0 * (1 + A * T + B * T * T) : R0 * (1 + A * T + B * T * T + C * (T - 100) * T * T * T);
}

export function tOfR(R0, R) {
  const { A, B } = CVD;
  if (R >= R0) return (-A + Math.sqrt(A * A - 4 * B * (1 - R / R0))) / (2 * B);
  let T = (R / R0 - 1) / A;
  for (let i = 0; i < 50; i++) {
    const f = rOfT(R0, T) - R;
    const h = 1e-6;
    const d = (rOfT(R0, T + h) - rOfT(R0, T - h)) / (2 * h);
    const dT = f / d;
    T -= dT;
    if (Math.abs(dT) < 1e-12) break;
  }
  return T;
}

export function solve(input) {
  const R0 = Number(choice(input, "type", "قسم", ["100", "500", "1000"], "100"));
  const dir = choice(input, "dir", "حساب کریں", ["r2t", "t2r"], "r2t");
  const { A, B, C } = CVD;
  const steps = [`IEC 60751 عددی عامل: $A = ${ntex(A)}$، $B = ${ntex(B)}$، $C = ${ntex(C)}$ (C صرف صفر سے نیچے استعمال ہوتا ہے)، اور $R_0 = ${R0}\\ \\Omega$۔`];
  if (dir === "t2r") {
    const T = num(input, "T", "درجہ حرارت", { min: -200, max: 850 });
    const R = rOfT(R0, T);
    steps.push({ text: T >= 0 ? "صفر سے اوپر ہم مربعی مساوات استعمال کرتے ہیں:" : "صفر سے نیچے ہم چوتھا رکن شامل کرتے ہیں:", tex: `R = ${R0}\\left[1 + ${ntex(A)}(${ntex(T)}) + (${ntex(B)})(${ntex(T)})^2${T < 0 ? ` + (${ntex(C)})(${ntex(T)} - 100)(${ntex(T)})^3` : ""}\\right] = ${ntex(R, 7)}\\ \\Omega` });
    steps.push(`اس درجہ حرارت پر حساسیت تقریباً ${fmt((rOfT(R0, T + 0.5) - rOfT(R0, T - 0.5)), 4)} Ω فی ڈگری ہے۔`);
    return { results: [{ label: "مزاحمت", value: `${fmt(R, 7)} Ω`, text: `R = ${fmt(R, 7)} Ω` }, { label: "تناسب R/R0", value: R / R0, sig: 7 }], steps, copy: `R(${fmt(T)} °C) = ${fmt(R, 7)} Ω` };
  }
  const R = num(input, "R", "مزاحمت", { positive: true });
  const Rlo = rOfT(R0, -200), Rhi = rOfT(R0, 850);
  if (R < Rlo || R > Rhi) fail(`مزاحمت معیاری حد سے باہر ہے (${fmt(Rlo, 5)} سے ${fmt(Rhi, 5)} Ω، PT${R0} کے لیے)۔`, "R");
  const T = tOfR(R0, R);
  if (R >= R0) steps.push({ text: "مزاحمت ≥ R0 ہے، اس لیے درجہ حرارت ≥ 0 ہے؛ ہم مربعی مساوات حل کرتے ہیں:", tex: `T = \\frac{-A + \\sqrt{A^2 - 4B(1 - R/R_0)}}{2B} = ${ntex(T, 7)}^\\circ C` });
  else steps.push({ text: "مزاحمت < R0 ہے، اس لیے درجہ حرارت صفر سے نیچے ہے؛ مساوات چوتھے درجے کی ہے، اس لیے ہم اسے نیوٹن کے طریقے سے حل کرتے ہیں:", tex: `T = ${ntex(T, 7)}^\\circ C` });
  steps.push({ text: "تصدیق کے لیے ہم حاصل شدہ درجہ حرارت رکھتے ہیں:", tex: `R(${ntex(T, 6)}) = ${ntex(rOfT(R0, T), 8)}\\ \\Omega` });
  const Tr = Math.abs(T) < 5e-4 ? 0 : T;
  return { results: [{ label: "درجہ حرارت", value: `${fmt(Tr, 5)} °C`, text: `T = ${fmt(Tr, 4)} °C` }, { label: "کیلون", value: `${fmt(Tr + 273.15, 6)} K` }], steps, copy: `T = ${fmt(Tr, 5)} °C` };
}
