import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Bir kredinin sabit periyodik taksitini, toplam ödemesini ve toplam faizini hesaplayın; yıllık faiz, anapara ödemesi ve kalan bakiyeyi gösteren bir tablo ile bakiyenin azalışını gösteren bir grafik ekleyin.",
  keywords: ["Kredi", "Geri ödeme tablosu", "amortization", "Aylık taksit", "Kredi faizi", "Borç ödemesi", "Konut kredisi"],
  formulas: [
    { label: "Sabit taksit", tex: "PMT = \\frac{P\\,i}{1-(1+i)^{-N}},\\qquad i=\\frac{r}{m},\\quad N=mt" },
    { label: "k. ödemeden sonraki bakiye", tex: "B_k = B_{k-1}(1+i) - PMT" }
  ],
  inputs: [
    { id: "P", label: "Kredi anaparası P", type: "number", default: "100000" },
    { id: "r", label: "Yıllık faiz oranı", unit: "%", type: "number", default: "6" },
    { id: "t", label: "Kredi vadesi", unit: "yıl", type: "number", default: "30", help: "Vade × yıllık ödeme sayısı tam sayı ödeme sayısı vermelidir; en fazla 100 yıl." },
    { id: "freq", label: "Yıl içindeki ödeme sayısı", type: "select", default: "12", options: [["12", "Aylık (12)"], ["4", "Üç aylık (4)"], ["2", "Yarı yıllık (2)"], ["1", "Yıllık (1)"]] }
  ],
  example: { values: { P: "100000", r: "6", t: "30", freq: "12" }, expect: ["599.55"], note: "Örnek: 100.000 tutarında, %6 faizli, 30 yıl vadeli konut kredisi ve aylık taksitler." },
  invalid: { values: { P: "100000", r: "6", t: "1.01", freq: "12" } },
  related: ["compound-interest", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Kredi anaparası", { positive: true });
  const r = num(input, "r", "Faiz oranı", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Kredi vadesi", { positive: true, max: 100 });
  const m = Number(choice(input, "freq", "Yıl içindeki ödeme sayısı", ["12", "4", "2", "1"], "12"));
  const Nraw = t * m;
  if (Math.abs(Nraw - Math.round(Nraw)) > 1e-9) fail(`Ödeme sayısı (${fmt(Nraw)}) tam sayı olmalıdır; vadeyi yıl olarak düzeltin.`, "t");
  const N = Math.round(Nraw);
  const i = r / 100 / m;
  const pmt = i === 0 ? P / N : (P * i) / (1 - Math.pow(1 + i, -N));
  const total = pmt * N;
  const interest = total - P;
  const rows = [];
  const points = [[0, P]];
  let bal = P;
  let yInt = 0;
  let yPri = 0;
  for (let k = 1; k <= N; k++) {
    const intr = bal * i;
    const pri = k === N ? bal : pmt - intr;
    bal -= pri;
    yInt += intr;
    yPri += pri;
    if (k % m === 0 || k === N) {
      rows.push([fmt(Math.ceil(k / m)), money(yInt), money(yPri), money(Math.max(0, bal))]);
      points.push([k / m, Math.max(0, bal)]);
      yInt = 0;
      yPri = 0;
    }
  }
  const steps = [
    { text: "Ödeme başına faiz oranı:", tex: `i = \\frac{r}{m} = \\frac{${ntex(r / 100, 6)}}{${m}} = ${ntex(i, 6)}` },
    { text: "Toplam ödeme sayısı:", tex: `N = mt = ${m} \\times ${ntex(t)} = ${N}` },
    i === 0
      ? { text: "Faizsiz durumda kredi anaparası ödeme sayısına bölünür:", tex: `PMT = \\frac{P}{N} = \\frac{${ntex(P)}}{${N}} = ${ntex(pmt, 8)}` }
      : { text: "Sabit taksit:", tex: `PMT = \\frac{P\\,i}{1-(1+i)^{-N}} = \\frac{${ntex(P)} \\times ${ntex(i, 6)}}{1-(1+${ntex(i, 6)})^{-${N}}} = ${ntex(pmt, 8)}` },
    { text: "Toplam ödeme ve toplam faiz:", tex: `${ntex(pmt, 8)} \\times ${N} = ${ntex(total, 8)},\\qquad ${ntex(total, 8)} - ${ntex(P)} = ${ntex(interest, 8)}` }
  ];
  return {
    results: [
      { label: "Periyodik taksit", value: money(pmt), text: `Taksit ${money(pmt)}` },
      { label: "Toplam ödeme", value: money(total) },
      { label: "Toplam faiz", value: money(interest) },
      { label: "Ödeme sayısı", value: String(N) }
    ],
    steps,
    copy: `Taksit: ödeme başına ${money(pmt)}, toplam ödeme: ${money(total)}, toplam faiz: ${money(interest)}`,
    blocks: [
      { type: "table", caption: "Yıllık geri ödeme tablosu", head: ["Yıl", "Ödenen faiz", "Ödenen anapara", "Kalan bakiye"], rows: [...rows, ["Toplam", money(interest), money(P), "0.00"]] },
      { type: "note", text: "Taksit tüm süre boyunca sabittir; bu nedenle başta faizin payı daha büyüktür ve zamanla anapara payı artar. Sayılar iki ondalık basamağa yuvarlanmıştır." },
      { type: "plot", title: "Kalan bakiyenin zaman içindeki değişimi", xLabel: "Yıllar", yLabel: "Bakiye", includeZero: true, series: [{ name: "Kalan bakiye", points, line: true }] }
    ]
  };
}
