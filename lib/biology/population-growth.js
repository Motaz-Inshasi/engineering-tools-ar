import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const LN2 = Math.LN2;
const SAMPLES = 200;
const LABELS = { exp: "نمو أسّي", logistic: "نمو لوجستي", geom: "نمو هندسي منفصل" };

export const meta = {
  description: "احسب حجم عشيرة بعد زمن معيّن وفق النموذج الأسّي أو اللوجستي أو الهندسي المنفصل، مع زمن التضاعف أو زمن الوصول إلى نصف السعة الحاملة، ورسم بياني للنمو.",
  keywords: ["نمو العشيرة", "نمو أسي", "نمو لوجستي", "سعة حاملة", "زمن التضاعف", "population growth", "exponential", "logistic", "geometric"],
  formulas: [
    { label: "النموذج الأسّي", tex: "N = N_0 e^{rt}" },
    { label: "النموذج اللوجستي", tex: "N = \\frac{K}{1 + \\frac{K - N_0}{N_0} e^{-rt}}" },
    { label: "النموذج الهندسي المنفصل", tex: "N = N_0 (1 + r)^t" }
  ],
  inputs: [
    { id: "model", label: "النموذج", type: "select", default: "exp", options: [["exp", "أسّي: N = N0 e^{rt}"], ["logistic", "لوجستي: N = K / (1 + ((K − N0)/N0) e^{−rt})"], ["geom", "هندسي منفصل: N = N0 (1 + r)^t"]] },
    { id: "N0", label: "حجم العشيرة الابتدائي N0", unit: "فرد", type: "number", default: "100" },
    { id: "r", label: "معدل النمو r", unit: "1/وحدة زمن", type: "number", default: "0.1", help: "في النموذج الأسّي يجوز أن تكون سالبة (تناقص). في الهندسي المنفصل يجب أن تكون أكبر من -1." },
    { id: "t", label: "الزمن t", unit: "وحدة زمن", type: "number", default: "10", help: "في النموذج الهندسي يجب أن يكون عدداً صحيحاً من الأجيال." },
    { id: "K", label: "السعة الحاملة K", unit: "فرد", type: "number", default: "1000", when: { model: ["logistic"] } }
  ],
  example: { values: { model: "exp", N0: "100", r: "0.1", t: "10", K: "1000" }, expect: ["271.8", "6.931"], note: "مثال: N0 = 100 و r = 0.1 و t = 10 في النموذج الأسّي." },
  invalid: { values: { model: "geom", N0: "100", r: "-1", t: "5", K: "1000" } },
  related: ["serial-dilution", "hardy-weinberg"]
};

export function solve(input) {
  const model = choice(input, "model", "النموذج", ["exp", "logistic", "geom"], "exp");
  const N0 = num(input, "N0", "حجم العشيرة الابتدائي N0", { positive: true });
  const r = num(input, "r", "معدل النمو r", {});
  const t = num(input, "t", "الزمن t", { nonNegative: true });
  const K = model === "logistic" ? num(input, "K", "السعة الحاملة K", { positive: true }) : null;
  if (model === "geom") {
    if (!(1 + r > 0)) fail("في النموذج الهندسي يجب أن يكون r أكبر من -1.", "r");
    if (!Number.isInteger(t)) fail("في النموذج الهندسي يجب أن يكون الزمن عدداً صحيحاً من الأجيال.", "t");
  }
  const at = (x) => {
    if (model === "exp") return N0 * Math.exp(r * x);
    if (model === "logistic") return K / (1 + ((K - N0) / N0) * Math.exp(-r * x));
    return N0 * Math.pow(1 + r, x);
  };
  const Nt = at(t);
  if (!Number.isFinite(Nt)) fail("قيمة N(t) تتجاوز حدود الحساب، قلّل t أو r.", "t");
  const label = LABELS[model];
  const results = [{ label: "حجم العشيرة عند الزمن t", value: fmt(Nt, 4) }];
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
    results.push({ label: "زمن التضاعف", value: fmt(doubling, 4) });
    copyExtra = `، زمن التضاعف = ${fmt(doubling, 4)}`;
  }
  if (halfLife !== null) {
    results.push({ label: "زمن نصف العمر", value: fmt(halfLife, 4) });
    copyExtra = `، زمن نصف العمر = ${fmt(halfLife, 4)}`;
  }
  if (model === "logistic") {
    const A = (K - N0) / N0;
    const tHalf = A > 0 && r !== 0 ? Math.log(A) / r : NaN;
    const ok = Number.isFinite(tHalf) && tHalf >= 0;
    results.push({ label: "زمن الوصول إلى K/2", value: ok ? fmt(tHalf, 4) : "غير منطبق" });
    if (ok) copyExtra = `، زمن الوصول إلى K/2 = ${fmt(tHalf, 4)}`;
  }
  if (model === "exp") {
    steps.push({ text: "نعوّض في الصيغة الأسّية:", tex: `N = N_0 e^{rt} = ${ntex(N0)} \\times e^{${ntex(r)} \\times ${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "زمن التضاعف:", tex: `T_d = \\frac{\\ln 2}{r} = \\frac{${ntex(LN2, 6)}}{${ntex(r)}} = ${ntex(doubling, 6)}` });
  } else if (model === "logistic") {
    steps.push({ text: "نعوّض في الصيغة اللوجستية:", tex: `N = \\frac{K}{1 + \\frac{K-N_0}{N_0} e^{-rt}} = \\frac{${ntex(K)}}{1 + ${ntex((K - N0) / N0, 6)} e^{${ntex(-r * t, 6)}}} = ${ntex(Nt, 6)}` });
  } else {
    steps.push({ text: "نعوّض في الصيغة الهندسية:", tex: `N = N_0 (1+r)^t = ${ntex(N0)} \\times (${ntex(1 + r)})^{${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "زمن التضاعف للنموذج الهندسي:", tex: `T_d = \\frac{\\ln 2}{\\ln(1+r)} = ${ntex(doubling, 6)}` });
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
