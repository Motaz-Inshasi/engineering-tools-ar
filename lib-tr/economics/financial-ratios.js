import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const n6 = (x) => ntex(x, 6);

const RATIOS = [
  {
    label: "Cari oran", need: ["CA", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA}{CL}", sub: (v) => `\\frac{${n6(v.CA)}}{${n6(v.CL)}}`, f: (v) => v.CA / v.CL,
    interp: (x) => (x >= 2 ? "Likidite iyi; dönen varlıklar kısa vadeli borçları en az iki kat karşılıyor" : x >= 1 ? "Likidite kabul edilebilir, ancak marjı sınırlı" : "Dönen varlıklar kısa vadeli borçları karşılamaya yetmiyor")
  },
  {
    label: "Asit-test oranı (hızlı oran)", need: ["CA", "inv", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA-\\text{Inv}}{CL}", sub: (v) => `\\frac{${n6(v.CA)}-${n6(v.inv)}}{${n6(v.CL)}}`, f: (v) => (v.CA - v.inv) / v.CL,
    interp: (x) => (x >= 1 ? "Kısa vadeli borçları stok satmadan karşılıyor" : "Kısa vadeli borçların ödenmesi stok satışına bağlı")
  },
  {
    label: "Borç / varlık oranı", need: ["TL", "TA"], den: "TA", pct: true,
    sym: "\\frac{TL}{TA}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.TA)}}`, f: (v) => v.TL / v.TA,
    interp: (x) => (x < 0.5 ? "Düşük borç bağımlılığı" : x <= 1 ? "Orta düzeyde borç bağımlılığı" : "Borçlar varlıkları aşıyor")
  },
  {
    label: "Borç / özkaynak oranı", need: ["TL", "equity"], den: "equity", pct: false,
    sym: "\\frac{TL}{E}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.equity)}}`, f: (v) => v.TL / v.equity,
    interp: (x, v) => (v.equity < 0 ? "Özkaynak negatif; bu mali durum dikkat gerektirir" : x < 1 ? "Finansman, borçlardan çok özkaynakla sağlanıyor" : "Borçlar özkaynaktan fazla veya ona eşit")
  },
  {
    label: "Varlık karlılığı (ROA)", need: ["ni", "TA"], den: "TA", pct: true,
    sym: "\\frac{NI}{TA}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.TA)}}`, f: (v) => v.ni / v.TA,
    interp: (x) => (x < 0 ? "Varlıklara göre zarar" : x < 0.05 ? "Varlıklara göre düşük getiri" : "Varlıklara göre iyi getiri")
  },
  {
    label: "Özkaynak karlılığı (ROE)", need: ["ni", "equity"], den: "equity", pct: true,
    sym: "\\frac{NI}{E}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.equity)}}`, f: (v) => v.ni / v.equity,
    interp: (x, v) => (v.equity < 0 ? "Özkaynak negatif; oran gerçek bir karlılığı göstermiyor" : x < 0 ? "Özkaynağa göre zarar" : x < 0.1 ? "Özkaynağa göre düşük getiri" : "Özkaynağa göre iyi getiri")
  },
  {
    label: "Brüt kâr marjı", need: ["rev", "cogs"], den: "rev", pct: true,
    sym: "\\frac{Rev-COGS}{Rev}", sub: (v) => `\\frac{${n6(v.rev)}-${n6(v.cogs)}}{${n6(v.rev)}}`, f: (v) => (v.rev - v.cogs) / v.rev,
    interp: (x) => (x < 0 ? "Satılan malın maliyeti gelirden büyük" : "Her satış lirasından satılan malın maliyeti düşüldükten sonra kalan pay")
  },
  {
    label: "Net kâr marjı", need: ["ni", "rev"], den: "rev", pct: true,
    sym: "\\frac{NI}{Rev}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.rev)}}`, f: (v) => v.ni / v.rev,
    interp: (x) => (x < 0 ? "Satışlardan net zarar" : "Her satış lirasının net kâra dönüşen payı")
  },
  {
    label: "Varlık devir hızı", need: ["rev", "TA"], den: "TA", pct: false,
    sym: "\\frac{Rev}{TA}", sub: (v) => `\\frac{${n6(v.rev)}}{${n6(v.TA)}}`, f: (v) => v.rev / v.TA,
    interp: (x) => (x < 1 ? "Varlıklar değerinden daha az gelir üretiyor" : "Varlıklar değerinden fazla gelir üretiyor")
  }
];

const FIELDS = [
  ["CA", "Dönen varlıklar", { nonNegative: true }],
  ["CL", "Kısa vadeli borçlar", { nonNegative: true }],
  ["inv", "Stok", { nonNegative: true }],
  ["TA", "Toplam varlıklar", { nonNegative: true }],
  ["TL", "Toplam borçlar", { nonNegative: true }],
  ["equity", "Özkaynak", {}],
  ["rev", "Gelirler", { nonNegative: true }],
  ["cogs", "Satılan malın maliyeti", { nonNegative: true }],
  ["ni", "Net gelir", {}]
];

export const meta = {
  description: "Temel mali oranları (likidite, borçluluk, karlılık ve varlık verimliliği) yalnızca mevcut verilerden hesaplayın; her oranın formülünü ve kısa açıklamasını gösteren bir tablo ekleyin.",
  keywords: ["Mali oranlar", "financial ratios", "Cari oran", "Likidite", "ROA", "ROE", "Kâr marjı", "Borçluluk"],
  formulas: [
    { label: "Cari oran", tex: "\\frac{\\text{Dönen varlıklar}}{\\text{Kısa vadeli borçlar}}" },
    { label: "Özkaynak karlılığı (ROE)", tex: "ROE = \\frac{NI}{E}" },
    { label: "Varlık karlılığı (ROA)", tex: "ROA = \\frac{NI}{TA}" }
  ],
  inputs: [
    { id: "CA", label: "Dönen varlıklar", type: "number" },
    { id: "CL", label: "Kısa vadeli borçlar", type: "number" },
    { id: "inv", label: "Stok", type: "number" },
    { id: "TA", label: "Toplam varlıklar", type: "number" },
    { id: "TL", label: "Toplam borçlar", type: "number" },
    { id: "equity", label: "Özkaynak", type: "number" },
    { id: "rev", label: "Gelirler", type: "number" },
    { id: "cogs", label: "Satılan malın maliyeti", type: "number" },
    { id: "ni", label: "Net gelir", type: "number", help: "Tüm alanlar isteğe bağlıdır; yalnızca verisi bulunan oranlar hesaplanır." }
  ],
  example: {
    values: { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" },
    expect: ["Cari oran = 2", "Borç / varlık oranı = %60"],
    note: "Örnek: dönen varlıkları 500.000, kısa vadeli borçları 250.000 olan bir şirket ve belirtilen varlık ve gelir verileri."
  },
  invalid: { values: { CA: "", CL: "", inv: "", TA: "", TL: "", equity: "", rev: "", cogs: "", ni: "" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity"]
};

export function solve(input) {
  const v = {};
  for (const [id, label, opts] of FIELDS) v[id] = num(input, id, label, { ...opts, optional: true });
  const computed = [];
  const skipped = [];
  for (const d of RATIOS) {
    if (d.need.some((k) => v[k] === null)) {
      skipped.push(`${d.label} (veri eksik)`);
      continue;
    }
    if (v[d.den] === 0) {
      skipped.push(`${d.label} (payda sıfır)`);
      continue;
    }
    computed.push({ d, x: d.f(v) });
  }
  if (computed.length === 0) fail("En az bir mali oranı hesaplamak için yeterli veri girin; örneğin dönen varlıklar ve kısa vadeli borçlar.", "CA");
  const disp = (d, x) => (d.pct ? `${fmt(x * 100, 4)}%` : fmt(x, 4));
  const results = computed.map(({ d, x }) => ({ label: d.label, value: disp(d, x), text: `${d.label} = ${disp(d, x)}` }));
  const steps = computed.map(({ d, x }) => ({ text: `${d.label}:`, tex: `${d.sym} = ${d.sub(v)} = ${d.pct ? `${ntex(x * 100, 6)}\\%` : ntex(x, 6)}` }));
  const rows = computed.map(({ d, x }) => [d.label, disp(d, x), { tex: d.sym }, d.interp(x, v)]);
  const blocks = [{ type: "table", caption: "Hesaplanan oranlar", head: ["Oran", "Değer", "Formül", "Açıklama"], rows }];
  if (skipped.length > 0) blocks.push({ type: "note", text: `Hesaplanamadı: ${skipped.join("، ")}.`, tone: "warn" });
  return {
    results,
    steps,
    copy: results.map((r) => `${r.label} = ${r.value}`).join("، "),
    blocks
  };
}
