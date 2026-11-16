import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Birim ve gelir cinsinden başabaş noktasını, katkı marjını ve oranını ile hedef kâra ulaşmak için gereken birim sayısını hesaplayın; başabaş noktasının iki katına kadar gelir ve toplam maliyet grafiğini çizin.",
  keywords: ["başabaş noktası", "break-even", "katkı marjı", "sabit maliyetler", "değişken maliyetler", "hedef kâr"],
  formulas: [
    { label: "Birim cinsinden başabaş noktası", tex: "Q^* = \\frac{F}{p-v}" },
    { label: "Hedef kâra ulaşmak için birim sayısı", tex: "Q_T = \\frac{F+\\pi}{p-v}" }
  ],
  inputs: [
    { id: "F", label: "Sabit maliyetler F", unit: "", type: "number", default: "10000" },
    { id: "p", label: "Birim satış fiyatı p", type: "number", default: "50" },
    { id: "v", label: "Birim değişken maliyet v", type: "number", default: "30" },
    { id: "target", label: "Hedef kâr π (isteğe bağlı)", type: "number", help: "İhtiyacınız yoksa boş bırakın." }
  ],
  example: { values: { F: "10000", p: "50", v: "30", target: "" }, expect: ["500 birim", "25,000.00"], note: "Örnek: sabit maliyetler 10.000, birim satış fiyatı 50 ve birim değişken maliyet 30." },
  invalid: { values: { F: "10000", p: "30", v: "30", target: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const F = num(input, "F", "sabit maliyetler", { nonNegative: true });
  const p = num(input, "p", "birim satış fiyatı", { positive: true });
  const v = num(input, "v", "birim değişken maliyet", { nonNegative: true });
  const target = num(input, "target", "hedef kâr", { optional: true });
  if (!(p > v)) fail("Satış fiyatı birim değişken maliyetten büyük olmalıdır; aksi halde satışlar sabit maliyetlerin hiçbir kısmını karşılamaz.", "p");
  const cm = p - v;
  const units = F / cm;
  const revenue = units * p;
  const cost = F + v * units;
  const ratio = cm / p;
  const integerUnits = Math.ceil(units - 1e-9);
  let targetUnits = null;
  if (target !== null) {
    if (F + target < 0) fail("Hedef zarar sabit maliyetleri aştığı için pozitif bir birim sayısıyla hesaplanamaz.", "target");
    targetUnits = (F + target) / cm;
  }
  const xMax = units > 0 ? 2 * units : 1;
  const sample = (fn) => Array.from({ length: 21 }, (_, k) => {
    const x = (xMax * k) / 20;
    return [x, fn(x)];
  });
  const plot = {
    type: "plot",
    title: "Birim sayısına göre gelir ve toplam maliyet",
    xLabel: "Birim sayısı",
    yLabel: "Tutar",
    includeZero: true,
    series: [
      { name: "Toplam gelir", points: sample((x) => p * x), line: true },
      { name: "Toplam maliyet", points: sample((x) => F + v * x), line: true }
    ]
  };
  if (units > 0) plot.vlines = [{ x: units }];
  const results = [
    { label: "Birim cinsinden başabaş noktası", value: `${fmt(units, 6)} birim`, text: `${fmt(units, 6)} birim` },
    { label: "En az tam birim sayısı", value: `${fmt(integerUnits)} birim` },
    { label: "Başabaş noktasındaki gelir", value: money(revenue) },
    { label: "Birim başına katkı marjı", value: money(cm) },
    { label: "Katkı marjı oranı", value: `${fmt(ratio * 100, 4)}%` }
  ];
  const steps = [
    { text: "Birim başına katkı marjı:", tex: `p - v = ${ntex(p)} - ${ntex(v)} = ${ntex(cm)}` },
    { text: "Birim cinsinden başabaş noktası:", tex: `Q^* = \\frac{F}{p-v} = \\frac{${ntex(F)}}{${ntex(cm)}} = ${ntex(units, 6)}` },
    { text: "Başabaş noktasındaki gelir:", tex: `R^* = pQ^* = ${ntex(p)} \\times ${ntex(units, 6)} = ${ntex(revenue, 8)}` }
  ];
  let copy = `Başabaş noktası: ${fmt(units, 6)} birim, bu noktadaki gelir: ${money(revenue)}`;
  if (targetUnits !== null) {
    results.push({ label: "Hedef kâra ulaşmak için birim sayısı", value: `${fmt(targetUnits, 6)} birim` });
    steps.push({ text: "Hedef kâra ulaşmak için birim sayısı:", tex: `Q_T = \\frac{F+\\pi}{p-v} = \\frac{${ntex(F)} + ${ntex(target)}}{${ntex(cm)}} = ${ntex(targetUnits, 6)}` });
    copy += `, hedef kâra ulaşmak için birim sayısı: ${fmt(targetUnits, 6)} birim`;
  }
  return { results, steps, copy, blocks: [plot] };
}
