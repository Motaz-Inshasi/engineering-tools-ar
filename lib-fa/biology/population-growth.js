import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const LN2 = Math.LN2;
const SAMPLES = 200;
const LABELS = { exp: "رشد نمایی", logistic: "رشد لجستیک", geom: "رشد هندسی گسسته" };

export const meta = {
  description: "محاسبه اندازه جمعیت پس از زمان معین با مدل نمایی، لجستیک یا هندسی گسسته، همراه با زمان دوبرابرشدن یا زمان رسیدن به نصف ظرفیت حامل، و نمودار رشد.",
  keywords: ["رشد جمعیت", "رشد نمایی", "رشد لجستیک", "ظرفیت حامل", "زمان دوبرابرشدن", "population growth", "exponential", "logistic", "geometric"],
  formulas: [
    { label: "مدل نمایی", tex: "N = N_0 e^{rt}" },
    { label: "مدل لجستیک", tex: "N = \\frac{K}{1 + \\frac{K - N_0}{N_0} e^{-rt}}" },
    { label: "مدل هندسی گسسته", tex: "N = N_0 (1 + r)^t" }
  ],
  inputs: [
    { id: "model", label: "مدل", type: "select", default: "exp", options: [["exp", "نمایی: N = N0 e^{rt}"], ["logistic", "لجستیک: N = K / (1 + ((K − N0)/N0) e^{−rt})"], ["geom", "هندسی گسسته: N = N0 (1 + r)^t"]] },
    { id: "N0", label: "اندازه اولیه جمعیت N0", unit: "فرد", type: "number", default: "100" },
    { id: "r", label: "نرخ رشد r", unit: "1/واحد زمان", type: "number", default: "0.1", help: "در مدل نمایی می‌تواند منفی باشد (کاهش). در مدل هندسی گسسته باید بزرگ‌تر از -1 باشد." },
    { id: "t", label: "زمان t", unit: "واحد زمان", type: "number", default: "10", help: "در مدل هندسی باید عددی صحیح از نسل‌ها باشد." },
    { id: "K", label: "ظرفیت حامل K", unit: "فرد", type: "number", default: "1000", when: { model: ["logistic"] } }
  ],
  example: { values: { model: "exp", N0: "100", r: "0.1", t: "10", K: "1000" }, expect: ["271.8", "6.931"], note: "مثال: N0 = 100 و r = 0.1 و t = 10 در مدل نمایی." },
  invalid: { values: { model: "geom", N0: "100", r: "-1", t: "5", K: "1000" } },
  related: ["serial-dilution", "hardy-weinberg"]
};

export function solve(input) {
  const model = choice(input, "model", "مدل", ["exp", "logistic", "geom"], "exp");
  const N0 = num(input, "N0", "اندازه اولیه جمعیت N0", { positive: true });
  const r = num(input, "r", "نرخ رشد r", {});
  const t = num(input, "t", "زمان t", { nonNegative: true });
  const K = model === "logistic" ? num(input, "K", "ظرفیت حامل K", { positive: true }) : null;
  if (model === "geom") {
    if (!(1 + r > 0)) fail("در مدل هندسی r باید بزرگ‌تر از -1 باشد.", "r");
    if (!Number.isInteger(t)) fail("در مدل هندسی زمان باید عددی صحیح از نسل‌ها باشد.", "t");
  }
  const at = (x) => {
    if (model === "exp") return N0 * Math.exp(r * x);
    if (model === "logistic") return K / (1 + ((K - N0) / N0) * Math.exp(-r * x));
    return N0 * Math.pow(1 + r, x);
  };
  const Nt = at(t);
  if (!Number.isFinite(Nt)) fail("مقدار N(t) از حدود محاسبه فراتر رفته است؛ t یا r را کاهش دهید.", "t");
  const label = LABELS[model];
  const results = [{ label: "اندازه جمعیت در زمان t", value: fmt(Nt, 4) }];
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
    results.push({ label: "زمان دوبرابرشدن", value: fmt(doubling, 4) });
    copyExtra = `، زمان دوبرابرشدن = ${fmt(doubling, 4)}`;
  }
  if (halfLife !== null) {
    results.push({ label: "زمان نیم‌عمر", value: fmt(halfLife, 4) });
    copyExtra = `، زمان نیم‌عمر = ${fmt(halfLife, 4)}`;
  }
  if (model === "logistic") {
    const A = (K - N0) / N0;
    const tHalf = A > 0 && r !== 0 ? Math.log(A) / r : NaN;
    const ok = Number.isFinite(tHalf) && tHalf >= 0;
    results.push({ label: "زمان رسیدن به K/2", value: ok ? fmt(tHalf, 4) : "کاربرد ندارد" });
    if (ok) copyExtra = `، زمان رسیدن به K/2 = ${fmt(tHalf, 4)}`;
  }
  if (model === "exp") {
    steps.push({ text: "در فرمول نمایی جایگذاری می‌کنیم:", tex: `N = N_0 e^{rt} = ${ntex(N0)} \\times e^{${ntex(r)} \\times ${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "زمان دوبرابرشدن:", tex: `T_d = \\frac{\\ln 2}{r} = \\frac{${ntex(LN2, 6)}}{${ntex(r)}} = ${ntex(doubling, 6)}` });
  } else if (model === "logistic") {
    steps.push({ text: "در فرمول لجستیک جایگذاری می‌کنیم:", tex: `N = \\frac{K}{1 + \\frac{K-N_0}{N_0} e^{-rt}} = \\frac{${ntex(K)}}{1 + ${ntex((K - N0) / N0, 6)} e^{${ntex(-r * t, 6)}}} = ${ntex(Nt, 6)}` });
  } else {
    steps.push({ text: "در فرمول هندسی جایگذاری می‌کنیم:", tex: `N = N_0 (1+r)^t = ${ntex(N0)} \\times (${ntex(1 + r)})^{${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "زمان دوبرابرشدن در مدل هندسی:", tex: `T_d = \\frac{\\ln 2}{\\ln(1+r)} = ${ntex(doubling, 6)}` });
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
