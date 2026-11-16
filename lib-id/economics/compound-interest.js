import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const FREQ = [["1", "Tahunan (1)"], ["2", "Semesteran (2)"], ["4", "Kuartalan (4)"], ["12", "Bulanan (12)"], ["365", "Harian (365)"], ["continuous", "Kontinu"]];

export const meta = {
  description: "Hitung nilai masa depan suatu jumlah dengan bunga sederhana, majemuk, atau kontinu, dengan setoran berkala opsional, total bunga, suku bunga efektif tahunan, tabel saldo tahunan, dan grafik.",
  keywords: ["bunga majemuk", "bunga sederhana", "compound interest", "nilai masa depan", "FV", "investasi", "bunga kontinu"],
  formulas: [
    { label: "Bunga sederhana", tex: "FV = P(1 + rt)" },
    { label: "Bunga majemuk dengan setoran berkala", tex: "FV = P\\left(1+\\frac{r}{n}\\right)^{nt} + PMT\\cdot\\frac{\\left(1+\\frac{r}{n}\\right)^{nt}-1}{r/n}" },
    { label: "Bunga kontinu", tex: "FV = Pe^{rt}" }
  ],
  inputs: [
    { id: "P", label: "Jumlah awal P", type: "number", default: "1000" },
    { id: "r", label: "Suku bunga tahunan", unit: "%", type: "number", default: "5" },
    { id: "t", label: "Jangka waktu", unit: "tahun", type: "number", default: "10", help: "Boleh berupa pecahan, dengan batas maksimum 100 tahun." },
    { id: "mode", label: "Jenis bunga", type: "select", default: "compound", options: [["simple", "Sederhana"], ["compound", "Majemuk"]] },
    { id: "freq", label: "Frekuensi pembayaran bunga per tahun", type: "select", default: "12", options: FREQ, when: { mode: ["compound"] } },
    { id: "pmt", label: "Setoran berkala PMT", type: "number", default: "0", when: { mode: ["compound"] }, help: "Ditambahkan di akhir setiap periode pembayaran. Tidak tersedia untuk bunga kontinu, dan dengan jangka waktu pecahan jumlah periode harus menghasilkan bilangan bulat." }
  ],
  example: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0" }, expect: ["1,647.01"], note: "Contoh: 1000 dengan suku bunga 5% selama 10 tahun dengan pembayaran bulanan." },
  invalid: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "continuous", pmt: "100" } },
  related: ["loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Jumlah awal", { nonNegative: true });
  const r = num(input, "r", "Suku bunga", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Jangka waktu", { positive: true, max: 100 });
  const mode = choice(input, "mode", "Jenis bunga", ["simple", "compound"], "compound");
  const freq = choice(input, "freq", "Frekuensi pembayaran bunga", ["1", "2", "4", "12", "365", "continuous"], "12");
  const pmt = num(input, "pmt", "Setoran berkala", { nonNegative: true, default: 0 });
  const rate = r / 100;
  const simple = mode === "simple";
  const continuous = !simple && freq === "continuous";
  const n = simple || continuous ? 1 : Number(freq);
  const contributing = !simple && !continuous && pmt > 0;
  if (continuous && pmt > 0) fail("Setoran berkala tidak didukung untuk bunga kontinu. Isi setoran dengan nol atau pilih frekuensi pembayaran tertentu.", "pmt");
  const N = n * t;
  if (contributing && !isInt(N)) fail(`Jumlah periode n × t = ${fmt(N)} harus berupa bilangan bulat jika terdapat setoran berkala.`, "t");
  const i = rate / n;
  const balance = (y) => {
    if (simple) return P * (1 + rate * y);
    if (continuous) return P * Math.exp(rate * y);
    const k = n * y;
    const g = Math.pow(1 + i, k);
    return P * g + (i === 0 ? pmt * k : (pmt * (g - 1)) / i);
  };
  const FV = balance(t);
  const contributed = contributing ? pmt * N : 0;
  const totalContrib = P + contributed;
  const interest = FV - totalContrib;
  const ear = simple ? rate : continuous ? Math.exp(rate) - 1 : Math.pow(1 + i, n) - 1;
  const whole = Math.floor(t + 1e-9);
  const ys = [];
  for (let y = 1; y <= whole; y++) ys.push(y);
  if (t - whole > 1e-9) ys.push(t);
  const rows = ys.map((y) => {
    const b = balance(y);
    const contribY = contributing ? pmt * n * y : 0;
    return [fmt(y, 6), money(b), money(b - P - contribY)];
  });
  const points = [[0, P], ...ys.map((y) => [y, balance(y)])];
  const steps = [];
  if (simple) {
    steps.push({ text: "Bunga sederhana dihitung hanya dari jumlah awal:", tex: `FV = P(1 + rt) = ${ntex(P)} \\times (1 + ${ntex(rate, 6)} \\times ${ntex(t)}) = ${ntex(FV, 8)}` });
  } else if (continuous) {
    steps.push({ text: "Bunga kontinu:", tex: `FV = Pe^{rt} = ${ntex(P)} \\times e^{${ntex(rate, 6)} \\times ${ntex(t)}} = ${ntex(FV, 8)}` });
  } else {
    const contribTex = !contributing ? "" : i === 0 ? ` + ${ntex(pmt)} \\times ${ntex(N)}` : ` + ${ntex(pmt)} \\times \\frac{(1+${ntex(i, 6)})^{${ntex(N)}}-1}{${ntex(i, 6)}}`;
    steps.push({ text: "Suku bunga per periode dan jumlah periode:", tex: `i = \\frac{r}{n} = \\frac{${ntex(rate, 6)}}{${n}} = ${ntex(i, 6)},\\qquad N = nt = ${n} \\times ${ntex(t)} = ${ntex(N)}` });
    steps.push({ text: "Nilai masa depan:", tex: `FV = P(1+i)^N${contributing ? " + PMT\\frac{(1+i)^N-1}{i}" : ""} = ${ntex(P)} \\times (1+${ntex(i, 6)})^{${ntex(N)}}${contribTex} = ${ntex(FV, 8)}` });
  }
  steps.push({ text: "Total bunga = nilai masa depan − total yang disetorkan:", tex: `${ntex(FV, 8)} - ${ntex(totalContrib, 8)} = ${ntex(interest, 8)}` });
  return {
    results: [
      { label: "Nilai masa depan FV", value: money(FV), text: `FV = ${money(FV)}` },
      { label: "Total yang disetorkan", value: money(totalContrib) },
      { label: "Total bunga", value: money(interest) },
      { label: "Suku bunga efektif tahunan", value: `${fmt(ear * 100, 5)}%` }
    ],
    steps,
    copy: `Nilai masa depan: ${money(FV)}, total bunga: ${money(interest)}, suku bunga efektif tahunan: ${fmt(ear * 100, 5)}%`,
    blocks: [
      { type: "table", caption: "Saldo di akhir setiap tahun", head: ["Tahun", "Saldo", "Total bunga sejauh ini"], rows },
      { type: "plot", title: "Pertumbuhan saldo dari waktu ke waktu", xLabel: "Tahun", yLabel: "Saldo", includeZero: true, series: [{ name: "Saldo", points, line: true }] }
    ]
  };
}
