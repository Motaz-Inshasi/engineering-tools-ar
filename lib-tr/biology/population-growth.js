import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const LN2 = Math.LN2;
const SAMPLES = 200;
const LABELS = { exp: "Üstel büyüme", logistic: "Lojistik büyüme", geom: "Ayrık geometrik büyüme" };

export const meta = {
  description: "Belirli bir süre sonunda popülasyon büyüklüğünü üstel, lojistik veya ayrık geometrik model ile; iki katlanma süresi veya taşıma kapasitesinin yarısına ulaşma süresiyle birlikte hesaplayın ve büyüme grafiğini çizin.",
  keywords: ["popülasyon büyümesi", "üstel büyüme", "Lojistik büyüme", "taşıma kapasitesi", "iki katlanma süresi", "population growth", "exponential", "logistic", "geometric"],
  formulas: [
    { label: "Üstel model", tex: "N = N_0 e^{rt}" },
    { label: "Lojistik model", tex: "N = \\frac{K}{1 + \\frac{K - N_0}{N_0} e^{-rt}}" },
    { label: "Ayrık geometrik model", tex: "N = N_0 (1 + r)^t" }
  ],
  inputs: [
    { id: "model", label: "Model", type: "select", default: "exp", options: [["exp", "Üstel: N = N0 e^{rt}"], ["logistic", "Lojistik: N = K / (1 + ((K − N0)/N0) e^{−rt})"], ["geom", "Ayrık geometrik: N = N0 (1 + r)^t"]] },
    { id: "N0", label: "Başlangıç popülasyon büyüklüğü N0", unit: "birey", type: "number", default: "100" },
    { id: "r", label: "Büyüme oranı r", unit: "1/zaman birimi", type: "number", default: "0.1", help: "Üstel modelde negatif olabilir (azalma). Ayrık geometrikte -1'den büyük olmalıdır." },
    { id: "t", label: "Zaman t", unit: "zaman birimi", type: "number", default: "10", help: "Geometrik modelde t, nesil sayısı olan bir tam sayı olmalıdır." },
    { id: "K", label: "Taşıma kapasitesi K", unit: "birey", type: "number", default: "1000", when: { model: ["logistic"] } }
  ],
  example: { values: { model: "exp", N0: "100", r: "0.1", t: "10", K: "1000" }, expect: ["271.8", "6.931"], note: "Örnek: üstel modelde N0 = 100, r = 0.1 ve t = 10." },
  invalid: { values: { model: "geom", N0: "100", r: "-1", t: "5", K: "1000" } },
  related: ["serial-dilution", "hardy-weinberg"]
};

export function solve(input) {
  const model = choice(input, "model", "Model", ["exp", "logistic", "geom"], "exp");
  const N0 = num(input, "N0", "Başlangıç popülasyon büyüklüğü N0", { positive: true });
  const r = num(input, "r", "Büyüme oranı r", {});
  const t = num(input, "t", "Zaman t", { nonNegative: true });
  const K = model === "logistic" ? num(input, "K", "Taşıma kapasitesi K", { positive: true }) : null;
  if (model === "geom") {
    if (!(1 + r > 0)) fail("Ayrık geometrik modelde r, -1'den büyük olmalıdır.", "r");
    if (!Number.isInteger(t)) fail("Ayrık geometrik modelde zaman, nesil sayısı olan bir tam sayı olmalıdır.", "t");
  }
  const at = (x) => {
    if (model === "exp") return N0 * Math.exp(r * x);
    if (model === "logistic") return K / (1 + ((K - N0) / N0) * Math.exp(-r * x));
    return N0 * Math.pow(1 + r, x);
  };
  const Nt = at(t);
  if (!Number.isFinite(Nt)) fail("N(t) değeri hesaplama sınırlarını aşıyor; t veya r değerini azaltın.", "t");
  const label = LABELS[model];
  const results = [{ label: "t zamanındaki popülasyon büyüklüğü", value: fmt(Nt, 4) }];
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
    results.push({ label: "iki katlanma süresi", value: fmt(doubling, 4) });
    copyExtra = `، iki katlanma süresi = ${fmt(doubling, 4)}`;
  }
  if (halfLife !== null) {
    results.push({ label: "Yarılanma ömrü", value: fmt(halfLife, 4) });
    copyExtra = `، yarılanma ömrü = ${fmt(halfLife, 4)}`;
  }
  if (model === "logistic") {
    const A = (K - N0) / N0;
    const tHalf = A > 0 && r !== 0 ? Math.log(A) / r : NaN;
    const ok = Number.isFinite(tHalf) && tHalf >= 0;
    results.push({ label: "K/2'ye ulaşma süresi", value: ok ? fmt(tHalf, 4) : "Uygulanamaz" });
    if (ok) copyExtra = `، K/2'ye ulaşma süresi = ${fmt(tHalf, 4)}`;
  }
  if (model === "exp") {
    steps.push({ text: "Üstel formülde yerine koyarız:", tex: `N = N_0 e^{rt} = ${ntex(N0)} \\times e^{${ntex(r)} \\times ${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "İki katlanma süresi:", tex: `T_d = \\frac{\\ln 2}{r} = \\frac{${ntex(LN2, 6)}}{${ntex(r)}} = ${ntex(doubling, 6)}` });
  } else if (model === "logistic") {
    steps.push({ text: "Lojistik formülde yerine koyarız:", tex: `N = \\frac{K}{1 + \\frac{K-N_0}{N_0} e^{-rt}} = \\frac{${ntex(K)}}{1 + ${ntex((K - N0) / N0, 6)} e^{${ntex(-r * t, 6)}}} = ${ntex(Nt, 6)}` });
  } else {
    steps.push({ text: "Geometrik formülde yerine koyarız:", tex: `N = N_0 (1+r)^t = ${ntex(N0)} \\times (${ntex(1 + r)})^{${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "Geometrik model için iki katlanma süresi:", tex: `T_d = \\frac{\\ln 2}{\\ln(1+r)} = ${ntex(doubling, 6)}` });
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
