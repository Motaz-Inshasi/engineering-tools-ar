import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const LN2 = Math.LN2;
const SAMPLES = 200;
const LABELS = { exp: "اسّی نمو", logistic: "لاجسٹک نمو", geom: "ہندسی منفصل نمو" };

export const meta = {
  description: "آبادی کا حجم کسی مدت کے بعد اسّی، لاجسٹک یا ہندسی منفصل ماڈل کے مطابق حساب کریں، ساتھ دگنا ہونے کا وقت یا گنجائش کے نصف تک پہنچنے کا وقت، اور نمو کا گراف۔",
  keywords: ["آبادی کی نمو", "اسّی نمو", "لاجسٹک نمو", "کیریئنگ کیپیسٹی", "دگنا ہونے کا وقت", "population growth", "exponential", "logistic", "geometric"],
  formulas: [
    { label: "اسّی ماڈل", tex: "N = N_0 e^{rt}" },
    { label: "لاجسٹک ماڈل", tex: "N = \\frac{K}{1 + \\frac{K - N_0}{N_0} e^{-rt}}" },
    { label: "ہندسی منفصل ماڈل", tex: "N = N_0 (1 + r)^t" }
  ],
  inputs: [
    { id: "model", label: "ماڈل", type: "select", default: "exp", options: [["exp", "اسّی: N = N0 e^{rt}"], ["logistic", "لاجسٹک: N = K / (1 + ((K − N0)/N0) e^{−rt})"], ["geom", "ہندسی منفصل: N = N0 (1 + r)^t"]] },
    { id: "N0", label: "ابتدائی آبادی کا حجم N0", unit: "فرد", type: "number", default: "100" },
    { id: "r", label: "نمو کی شرح r", unit: "1/وقت کی اکائی", type: "number", default: "0.1", help: "اسّی ماڈل میں یہ منفی ہو سکتی ہے (کمی)۔ ہندسی منفصل ماڈل میں یہ −1 سے بڑی ہونی چاہیے۔" },
    { id: "t", label: "وقت t", unit: "وقت کی اکائی", type: "number", default: "10", help: "ہندسی ماڈل میں یہ نسلوں کی مکمل تعداد ہونی چاہیے۔" },
    { id: "K", label: "کیریئنگ کیپیسٹی K", unit: "فرد", type: "number", default: "1000", when: { model: ["logistic"] } }
  ],
  example: { values: { model: "exp", N0: "100", r: "0.1", t: "10", K: "1000" }, expect: ["271.8", "6.931"], note: "مثال: اسّی ماڈل میں N0 = 100، r = 0.1 اور t = 10۔" },
  invalid: { values: { model: "geom", N0: "100", r: "-1", t: "5", K: "1000" } },
  related: ["serial-dilution", "hardy-weinberg"]
};

export function solve(input) {
  const model = choice(input, "model", "ماڈل", ["exp", "logistic", "geom"], "exp");
  const N0 = num(input, "N0", "ابتدائی آبادی کا حجم N0", { positive: true });
  const r = num(input, "r", "نمو کی شرح r", {});
  const t = num(input, "t", "وقت t", { nonNegative: true });
  const K = model === "logistic" ? num(input, "K", "کیریئنگ کیپیسٹی K", { positive: true }) : null;
  if (model === "geom") {
    if (!(1 + r > 0)) fail("ہندسی ماڈل میں r کا −1 سے بڑا ہونا ضروری ہے۔", "r");
    if (!Number.isInteger(t)) fail("ہندسی ماڈل میں وقت نسلوں کی مکمل تعداد ہونا ضروری ہے۔", "t");
  }
  const at = (x) => {
    if (model === "exp") return N0 * Math.exp(r * x);
    if (model === "logistic") return K / (1 + ((K - N0) / N0) * Math.exp(-r * x));
    return N0 * Math.pow(1 + r, x);
  };
  const Nt = at(t);
  if (!Number.isFinite(Nt)) fail("N(t) کی قدر حساب کی حدود سے تجاوز کر گئی، t یا r کم کریں۔", "t");
  const label = LABELS[model];
  const results = [{ label: "وقت t پر آبادی کا حجم", value: fmt(Nt, 4) }];
  const steps = [];
  let doubling = null;
  let halfLife = null;
  let copyExtra = "";
  if (model === "exp") {
    if (r > 0) doubling = LN2 / r;
    if (r < 0) halfLife = LN2 / -r;
  }
  if (model === "geom" && r > 0) doubling = LN2 / Math.log(1 + r);
  if (doubling !== null) {
    results.push({ label: "دگنا ہونے کا وقت", value: fmt(doubling, 4) });
    copyExtra = `، دگنا ہونے کا وقت = ${fmt(doubling, 4)}`;
  }
  if (halfLife !== null) {
    results.push({ label: "نصف عمر", value: fmt(halfLife, 4) });
    copyExtra = `، نصف عمر = ${fmt(halfLife, 4)}`;
  }
  if (model === "logistic") {
    const A = (K - N0) / N0;
    const tHalf = A > 0 && r !== 0 ? Math.log(A) / r : NaN;
    const ok = Number.isFinite(tHalf) && tHalf >= 0;
    results.push({ label: "K/2 تک پہنچنے کا وقت", value: ok ? fmt(tHalf, 4) : "لاگو نہیں" });
    if (ok) copyExtra = `، K/2 تک پہنچنے کا وقت = ${fmt(tHalf, 4)}`;
  }
  if (model === "exp") {
    steps.push({ text: "اسّی فارمولے میں قدر رکھتے ہیں:", tex: `N = N_0 e^{rt} = ${ntex(N0)} \\times e^{${ntex(r)} \\times ${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "دگنا ہونے کا وقت:", tex: `T_d = \\frac{\\ln 2}{r} = \\frac{${ntex(LN2, 6)}}{${ntex(r)}} = ${ntex(doubling, 6)}` });
  } else if (model === "logistic") {
    steps.push({ text: "لاجسٹک فارمولے میں قدر رکھتے ہیں:", tex: `N = \\frac{K}{1 + \\frac{K-N_0}{N_0} e^{-rt}} = \\frac{${ntex(K)}}{1 + ${ntex((K - N0) / N0, 6)} e^{${ntex(-r * t, 6)}}} = ${ntex(Nt, 6)}` });
  } else {
    steps.push({ text: "ہندسی فارمولے میں قدر رکھتے ہیں:", tex: `N = N_0 (1+r)^t = ${ntex(N0)} \\times (${ntex(1 + r)})^{${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "ہندسی ماڈل کے لیے دگنا ہونے کا وقت:", tex: `T_d = \\frac{\\ln 2}{\\ln(1+r)} = ${ntex(doubling, 6)}` });
  }
  const xs = [];
  if (model === "geom") {
    const s = Math.max(1, Math.ceil(t / SAMPLES));
    for (let k = 0; k <= t; k += s) xs.push(k);
    if (xs[xs.length - 1] !== t) xs.push(t);
  } else {
    for (let i = 0; i <= SAMPLES; i++) xs.push((t * i) / SAMPLES);
  }
  const blocks = [];
  if (t > 0) {
    const plot = { type: "plot", title: `N(t) — ${label}`, xLabel: "t", yLabel: "N", includeZero: true, series: [{ name: "N(t)", points: xs.map((x) => [x, at(x)]) }] };
    if (K !== null) plot.hlines = [{ y: K }, { y: K / 2 }];
    blocks.push(plot);
  }
  return {
    results,
    steps,
    copy: `${label}: N(${fmt(t, 6)}) = ${fmt(Nt, 4)}${copyExtra}`,
    blocks
  };
}
