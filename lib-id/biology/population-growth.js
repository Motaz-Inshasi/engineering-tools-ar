import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const LN2 = Math.LN2;
const SAMPLES = 200;
const LABELS = { exp: "Pertumbuhan eksponensial", logistic: "Pertumbuhan logistik", geom: "Pertumbuhan geometrik diskret" };

export const meta = {
  description: "Hitung ukuran populasi setelah waktu tertentu menurut model eksponensial, logistik, atau geometrik diskret, dengan waktu penggandaan atau waktu mencapai setengah daya dukung, serta grafik pertumbuhan.",
  keywords: ["Pertumbuhan populasi", "Pertumbuhan eksponensial", "Pertumbuhan logistik", "Daya dukung", "Waktu penggandaan", "population growth", "exponential", "logistic", "geometric"],
  formulas: [
    { label: "Model eksponensial", tex: "N = N_0 e^{rt}" },
    { label: "Model logistik", tex: "N = \\frac{K}{1 + \\frac{K - N_0}{N_0} e^{-rt}}" },
    { label: "Model geometrik diskret", tex: "N = N_0 (1 + r)^t" }
  ],
  inputs: [
    { id: "model", label: "Model", type: "select", default: "exp", options: [["exp", "Eksponensial: N = N0 e^{rt}"], ["logistic", "Logistik: N = K / (1 + ((K − N0)/N0) e^{−rt})"], ["geom", "Geometrik diskret: N = N0 (1 + r)^t"]] },
    { id: "N0", label: "Ukuran populasi awal N0", unit: "individu", type: "number", default: "100" },
    { id: "r", label: "Laju pertumbuhan r", unit: "1/satuan waktu", type: "number", default: "0.1", help: "Pada model eksponensial nilainya boleh negatif (penurunan). Pada model geometrik diskret nilainya harus lebih besar dari -1." },
    { id: "t", label: "Waktu t", unit: "satuan waktu", type: "number", default: "10", help: "Pada model geometrik nilainya harus berupa bilangan bulat generasi." },
    { id: "K", label: "Daya dukung K", unit: "individu", type: "number", default: "1000", when: { model: ["logistic"] } }
  ],
  example: { values: { model: "exp", N0: "100", r: "0.1", t: "10", K: "1000" }, expect: ["271.8", "6.931"], note: "Contoh: N0 = 100, r = 0.1, dan t = 10 pada model eksponensial." },
  invalid: { values: { model: "geom", N0: "100", r: "-1", t: "5", K: "1000" } },
  related: ["serial-dilution", "hardy-weinberg"]
};

export function solve(input) {
  const model = choice(input, "model", "Model", ["exp", "logistic", "geom"], "exp");
  const N0 = num(input, "N0", "Ukuran populasi awal N0", { positive: true });
  const r = num(input, "r", "Laju pertumbuhan r", {});
  const t = num(input, "t", "Waktu t", { nonNegative: true });
  const K = model === "logistic" ? num(input, "K", "Daya dukung K", { positive: true }) : null;
  if (model === "geom") {
    if (!(1 + r > 0)) fail("Pada model geometrik r harus lebih besar dari -1.", "r");
    if (!Number.isInteger(t)) fail("Pada model geometrik waktu harus berupa bilangan bulat generasi.", "t");
  }
  const at = (x) => {
    if (model === "exp") return N0 * Math.exp(r * x);
    if (model === "logistic") return K / (1 + ((K - N0) / N0) * Math.exp(-r * x));
    return N0 * Math.pow(1 + r, x);
  };
  const Nt = at(t);
  if (!Number.isFinite(Nt)) fail("Nilai N(t) melampaui batas perhitungan; kurangi t atau r.", "t");
  const label = LABELS[model];
  const results = [{ label: "Ukuran populasi pada waktu t", value: fmt(Nt, 4) }];
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
    results.push({ label: "Waktu penggandaan", value: fmt(doubling, 4) });
    copyExtra = `, waktu penggandaan = ${fmt(doubling, 4)}`;
  }
  if (halfLife !== null) {
    results.push({ label: "Waktu paruh", value: fmt(halfLife, 4) });
    copyExtra = `, waktu paruh = ${fmt(halfLife, 4)}`;
  }
  if (model === "logistic") {
    const A = (K - N0) / N0;
    const tHalf = A > 0 && r !== 0 ? Math.log(A) / r : NaN;
    const ok = Number.isFinite(tHalf) && tHalf >= 0;
    results.push({ label: "Waktu mencapai K/2", value: ok ? fmt(tHalf, 4) : "Tidak berlaku" });
    if (ok) copyExtra = `, waktu mencapai K/2 = ${fmt(tHalf, 4)}`;
  }
  if (model === "exp") {
    steps.push({ text: "Kita substitusikan ke rumus eksponensial:", tex: `N = N_0 e^{rt} = ${ntex(N0)} \\times e^{${ntex(r)} \\times ${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "Waktu penggandaan:", tex: `T_d = \\frac{\\ln 2}{r} = \\frac{${ntex(LN2, 6)}}{${ntex(r)}} = ${ntex(doubling, 6)}` });
  } else if (model === "logistic") {
    steps.push({ text: "Kita substitusikan ke rumus logistik:", tex: `N = \\frac{K}{1 + \\frac{K-N_0}{N_0} e^{-rt}} = \\frac{${ntex(K)}}{1 + ${ntex((K - N0) / N0, 6)} e^{${ntex(-r * t, 6)}}} = ${ntex(Nt, 6)}` });
  } else {
    steps.push({ text: "Kita substitusikan ke rumus geometrik:", tex: `N = N_0 (1+r)^t = ${ntex(N0)} \\times (${ntex(1 + r)})^{${ntex(t)}} = ${ntex(Nt, 6)}` });
    if (doubling !== null) steps.push({ text: "Waktu penggandaan untuk model geometrik:", tex: `T_d = \\frac{\\ln 2}{\\ln(1+r)} = ${ntex(doubling, 6)}` });
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
