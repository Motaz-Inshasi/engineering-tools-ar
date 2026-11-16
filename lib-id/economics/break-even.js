import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Hitung titik impas dalam unit dan pendapatan, margin kontribusi beserta persentasenya, jumlah unit yang diperlukan untuk mencapai laba target, dengan grafik pendapatan dan total biaya hingga dua kali titik impas.",
  keywords: ["titik impas", "break-even", "margin kontribusi", "biaya tetap", "biaya variabel", "laba target"],
  formulas: [
    { label: "titik impas dalam unit", tex: "Q^* = \\frac{F}{p-v}" },
    { label: "unit untuk mencapai laba target", tex: "Q_T = \\frac{F+\\pi}{p-v}" }
  ],
  inputs: [
    { id: "F", label: "Biaya tetap F", unit: "", type: "number", default: "10000" },
    { id: "p", label: "Harga jual per unit p", type: "number", default: "50" },
    { id: "v", label: "Biaya variabel per unit v", type: "number", default: "30" },
    { id: "target", label: "Laba target π (opsional)", type: "number", help: "Kosongkan jika tidak diperlukan." }
  ],
  example: { values: { F: "10000", p: "50", v: "30", target: "" }, expect: ["500 unit", "25,000.00"], note: "Contoh: biaya tetap 10.000, harga 50, dan biaya variabel 30 per unit." },
  invalid: { values: { F: "10000", p: "30", v: "30", target: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const F = num(input, "F", "biaya tetap", { nonNegative: true });
  const p = num(input, "p", "Harga jual per unit", { positive: true });
  const v = num(input, "v", "Biaya variabel per unit", { nonNegative: true });
  const target = num(input, "target", "laba target", { optional: true });
  if (!(p > v)) fail("Harga jual harus lebih besar dari biaya variabel per unit, jika tidak penjualan tidak akan menutupi sebagian biaya tetap.", "p");
  const cm = p - v;
  const units = F / cm;
  const revenue = units * p;
  const cost = F + v * units;
  const ratio = cm / p;
  const integerUnits = Math.ceil(units - 1e-9);
  let targetUnits = null;
  if (target !== null) {
    if (F + target < 0) fail("Kerugian target melebihi biaya tetap, sehingga tidak dapat dihitung dengan jumlah unit positif.", "target");
    targetUnits = (F + target) / cm;
  }
  const xMax = units > 0 ? 2 * units : 1;
  const sample = (fn) => Array.from({ length: 21 }, (_, k) => {
    const x = (xMax * k) / 20;
    return [x, fn(x)];
  });
  const plot = {
    type: "plot",
    title: "Pendapatan dan total biaya menurut jumlah unit",
    xLabel: "Jumlah unit",
    yLabel: "Jumlah",
    includeZero: true,
    series: [
      { name: "Total pendapatan", points: sample((x) => p * x), line: true },
      { name: "Total biaya", points: sample((x) => F + v * x), line: true }
    ]
  };
  if (units > 0) plot.vlines = [{ x: units }];
  const results = [
    { label: "titik impas dalam unit", value: `${fmt(units, 6)} unit`, text: `${fmt(units, 6)} unit` },
    { label: "Jumlah unit bulat terkecil", value: `${fmt(integerUnits)} unit` },
    { label: "Pendapatan titik impas", value: money(revenue) },
    { label: "Margin kontribusi per unit", value: money(cm) },
    { label: "Persentase margin kontribusi", value: `${fmt(ratio * 100, 4)}%` }
  ];
  const steps = [
    { text: "Margin kontribusi per unit:", tex: `p - v = ${ntex(p)} - ${ntex(v)} = ${ntex(cm)}` },
    { text: "Titik impas dalam unit:", tex: `Q^* = \\frac{F}{p-v} = \\frac{${ntex(F)}}{${ntex(cm)}} = ${ntex(units, 6)}` },
    { text: "Pendapatan titik impas:", tex: `R^* = pQ^* = ${ntex(p)} \\times ${ntex(units, 6)} = ${ntex(revenue, 8)}` }
  ];
  let copy = `Titik impas: ${fmt(units, 6)} unit, pendapatan pada titik tersebut: ${money(revenue)}`;
  if (targetUnits !== null) {
    results.push({ label: "Unit untuk mencapai laba target", value: `${fmt(targetUnits, 6)} unit` });
    steps.push({ text: "Unit untuk mencapai laba target:", tex: `Q_T = \\frac{F+\\pi}{p-v} = \\frac{${ntex(F)} + ${ntex(target)}}{${ntex(cm)}} = ${ntex(targetUnits, 6)}` });
    copy += `, unit untuk mencapai laba target: ${fmt(targetUnits, 6)} unit`;
  }
  return { results, steps, copy, blocks: [plot] };
}
