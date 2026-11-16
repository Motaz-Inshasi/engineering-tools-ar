import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LO = -0.99;
const HI = 10;
const GRID = 4000;
const NO_PAYBACK = "Vade içinde yatırım geri kazanılmıyor";

const npvAt = (cf, r) => {
  let s = 0;
  let d = 1;
  for (let t = 0; t < cf.length; t++) {
    if (t > 0) d *= 1 + r;
    s += cf[t] / d;
  }
  return s;
};

function bisect(cf, a, b) {
  let fa = npvAt(cf, a);
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2;
    const fm = npvAt(cf, m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

function findIrr(cf) {
  let prevR = LO;
  let prevV = npvAt(cf, LO);
  let root = null;
  let changes = 0;
  for (let k = 1; k <= GRID; k++) {
    const r = LO + ((HI - LO) * k) / GRID;
    const v = npvAt(cf, r);
    if (Number.isFinite(prevV) && Number.isFinite(v) && prevV * v < 0) {
      changes++;
      if (root === null) root = bisect(cf, prevR, r);
    }
    if (Number.isFinite(v) && v === 0 && root === null) root = r;
    prevR = r;
    prevV = v;
  }
  return { root, changes };
}

function payback(vals) {
  let cum = 0;
  for (let t = 0; t < vals.length; t++) {
    const prev = cum;
    cum += vals[t];
    if (cum >= 0 && (t === 0 || prev < 0)) return t === 0 ? 0 : t - 1 + -prev / vals[t];
  }
  return null;
}

export const meta = {
  description: "Bir nakit akışı serisi için net bugünkü değer, iç verim oranı, kârlılık indeksi ile normal ve iskontolu geri ödeme süresini hesaplayın; yıllık bugünkü değerler ve birikimli değerler tablosu ekleyin.",
  keywords: ["Net bugünkü değer", "NPV", "İç verim oranı", "IRR", "Geri ödeme süresi", "payback", "Kârlılık indeksi", "Fizibilite çalışması"],
  formulas: [
    { label: "Net bugünkü değer", tex: "NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^t}" },
    { label: "İç verim oranı", tex: "NPV(IRR) = 0" },
    { label: "Kârlılık indeksi", tex: "PI = \\frac{\\sum_{t=1}^{n} CF_t/(1+r)^t}{|CF_0|}" }
  ],
  inputs: [
    { id: "r", label: "İskonto oranı", unit: "%", type: "number", default: "10" },
    { id: "cf", label: "Nakit akışları CF0, CF1, ...", type: "textarea", rows: 3, default: "-1000 300 400 500", placeholder: "-1000 300 400 500", help: "Başlangıç akışı CF0 ile başlayın (genellikle negatiftir), ardından yıllık akışları girin. Değerleri boşlukla veya virgülle ayırın." }
  ],
  example: { values: { r: "10", cf: "-1000 300 400 500" }, expect: ["NPV = -21.04", "IRR = 8.896%"], note: "Örnek: 1000 yatırım, sonraki üç yıl için 300, 400 ve 500 getiri sağlar ve iskonto oranı %10." },
  invalid: { values: { r: "10", cf: "-1000" } },
  related: ["compound-interest", "loan-amortization", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const rPct = num(input, "r", "İskonto oranı", { min: -99, max: 1000 });
  const cf = numList(input, "cf", "Nakit akışları", { min: 2, max: 200 });
  if (cf[0] === 0) fail("Başlangıç akışı CF0 sıfır olamaz.", "cf");
  const rate = rPct / 100;
  const npv = npvAt(cf, rate);
  if (!Number.isFinite(npv)) fail("Bu oranla net bugünkü değer hesaplanamıyor; daha yüksek bir oran deneyin.", "r");
  const df = cf.map((_, t) => 1 / Math.pow(1 + rate, t));
  const pv = cf.map((c, t) => c * df[t]);
  const pvFuture = pv.slice(1).reduce((s, x) => s + x, 0);
  const PI = pvFuture / Math.abs(cf[0]);
  const cum = [];
  const cumPv = [];
  let a = 0;
  let b = 0;
  cf.forEach((c, t) => {
    a += c;
    b += pv[t];
    cum.push(a);
    cumPv.push(b);
  });
  const pb = payback(cf);
  const dpb = payback(pv);
  const { root, changes } = findIrr(cf);
  const irrText = root === null ? "Tanımsız" : `${fmt(root * 100, 4)}%`;
  const pbText = pb === null ? NO_PAYBACK : `${fmt(pb, 4)} yıl`;
  const dpbText = dpb === null ? NO_PAYBACK : `${fmt(dpb, 4)} yıl`;
  const terms = cf.map((c, t) => (t === 0 ? ntex(c) : `\\frac{${ntex(c)}}{(1+${ntex(rate, 6)})^{${t}}}`)).join(" + ");
  const steps = [
    { text: "Net bugünkü değer = akışların bugünkü değerleri toplamı:", tex: `NPV = ${terms} = ${ntex(npv, 8)}` },
    "İç verim oranı, NPV = 0 yapan orandır; −%99 ile %1000 arasında NPV'nin işaret değiştirdiği ilk noktayı ararız ve ardından aralığı ikiye bölerek daraltırız.",
    "Geri ödeme süresi: birikimli bakiyenin negatif olduğu son yıl, ardından bir sonraki yılın kesirli kısmı eklenir.",
    `Kârlılık indeksi = ${ntex(pvFuture, 8)} ÷ ${ntex(Math.abs(cf[0]), 8)} = ${fmt(PI, 4)}`
  ];
  const blocks = [
    { type: "table", caption: "Bugünkü ve birikimli değerler tablosu", head: ["Yıl", "Nakit akışı", "İskonto katsayısı", "Bugünkü değer", "Birikimli", "İskontolu birikimli"], rows: cf.map((c, t) => [fmt(t), money(c), fmt(df[t], 6), money(pv[t]), money(cum[t]), money(cumPv[t])]) }
  ];
  if (changes === 0) blocks.push({ type: "note", text: "−%99 ile %1000 aralığında NPV'nin işaret değiştirmediği görülüyor; bu nedenle iç verim oranı tanımlanamaz.", tone: "warn" });
  if (changes > 1) blocks.push({ type: "note", text: "Bu akışlar için birden fazla iç verim oranı bulundu; en küçüğü gösteriliyor." });
  return {
    results: [
      { label: "Net bugünkü değer NPV", value: money(npv), text: `NPV = ${money(npv)}` },
      { label: "İç verim oranı IRR", value: irrText, text: `IRR = ${irrText}` },
      { label: "Geri ödeme süresi", value: pbText },
      { label: "İskontolu geri ödeme süresi", value: dpbText },
      { label: "Kârlılık indeksi PI", value: fmt(PI, 4) }
    ],
    steps,
    copy: `NPV = ${money(npv)}, IRR = ${irrText}, kârlılık indeksi PI = ${fmt(PI, 4)}`,
    blocks
  };
}
