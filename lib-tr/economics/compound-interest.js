import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const FREQ = [["1", "Yıllık (1)"], ["2", "Yarı yıllık (2)"], ["4", "Üç aylık (4)"], ["12", "Aylık (12)"], ["365", "Günlük (365)"], ["continuous", "Sürekli"]];

export const meta = {
  description: "Basit, bileşik veya sürekli faizle bir tutarın gelecekteki değerini hesaplayın; isteğe bağlı periyodik katkılar, toplam faiz, yıllık gerçek faiz oranı, yıllık bakiye tablosu ve grafik ekleyin.",
  keywords: ["Bileşik faiz", "Basit faiz", "compound interest", "Gelecek değer", "FV", "Yatırım", "Sürekli faiz"],
  formulas: [
    { label: "Basit faiz", tex: "FV = P(1 + rt)" },
    { label: "Periyodik katkılı bileşik faiz", tex: "FV = P\\left(1+\\frac{r}{n}\\right)^{nt} + PMT\\cdot\\frac{\\left(1+\\frac{r}{n}\\right)^{nt}-1}{r/n}" },
    { label: "Sürekli faiz", tex: "FV = Pe^{rt}" }
  ],
  inputs: [
    { id: "P", label: "Başlangıç anaparası P", type: "number", default: "1000" },
    { id: "r", label: "Yıllık faiz oranı", unit: "%", type: "number", default: "5" },
    { id: "t", label: "Süre", unit: "yıl", type: "number", default: "10", help: "Ondalıklı olabilir, en fazla 100 yıl." },
    { id: "mode", label: "Faiz türü", type: "select", default: "compound", options: [["simple", "Basit"], ["compound", "Bileşik"]] },
    { id: "freq", label: "Yılda tahakkuk sayısı", type: "select", default: "12", options: FREQ, when: { mode: ["compound"] } },
    { id: "pmt", label: "Periyodik katkı PMT", type: "number", default: "0", when: { mode: ["compound"] }, help: "Her tahakkuk döneminin sonunda eklenir. Sürekli faizle kullanılamaz; kesirli süre girildiğinde dönem sayısı tam sayı olmalıdır." }
  ],
  example: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0" }, expect: ["1,647.01"], note: "Örnek: %5 faizle 10 yıl, aylık tahakkukla 1000." },
  invalid: { values: { P: "1000", r: "5", t: "10", mode: "compound", freq: "continuous", pmt: "100" } },
  related: ["loan-amortization", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Başlangıç anaparası", { nonNegative: true });
  const r = num(input, "r", "Faiz oranı", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Süre", { positive: true, max: 100 });
  const mode = choice(input, "mode", "Faiz türü", ["simple", "compound"], "compound");
  const freq = choice(input, "freq", "Tahakkuk sayısı", ["1", "2", "4", "12", "365", "continuous"], "12");
  const pmt = num(input, "pmt", "Periyodik katkı", { nonNegative: true, default: 0 });
  const rate = r / 100;
  const simple = mode === "simple";
  const continuous = !simple && freq === "continuous";
  const n = simple || continuous ? 1 : Number(freq);
  const contributing = !simple && !continuous && pmt > 0;
  if (continuous && pmt > 0) fail("Periyodik katkı sürekli faizle desteklenmez. Katkıyı sıfır yapın veya belirli bir tahakkuk sayısı seçin.", "pmt");
  const N = n * t;
  if (contributing && !isInt(N)) fail(`Dönem sayısı n × t = ${fmt(N)} olmalıdır; periyodik katkı varken tam sayı olmalıdır.`, "t");
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
    steps.push({ text: "Basit faiz yalnızca başlangıç anaparası üzerinden hesaplanır:", tex: `FV = P(1 + rt) = ${ntex(P)} \\times (1 + ${ntex(rate, 6)} \\times ${ntex(t)}) = ${ntex(FV, 8)}` });
  } else if (continuous) {
    steps.push({ text: "Sürekli tahakkuk:", tex: `FV = Pe^{rt} = ${ntex(P)} \\times e^{${ntex(rate, 6)} \\times ${ntex(t)}} = ${ntex(FV, 8)}` });
  } else {
    const contribTex = !contributing ? "" : i === 0 ? ` + ${ntex(pmt)} \\times ${ntex(N)}` : ` + ${ntex(pmt)} \\times \\frac{(1+${ntex(i, 6)})^{${ntex(N)}}-1}{${ntex(i, 6)}}`;
    steps.push({ text: "Dönem başına faiz oranı ve dönem sayısı:", tex: `i = \\frac{r}{n} = \\frac{${ntex(rate, 6)}}{${n}} = ${ntex(i, 6)},\\qquad N = nt = ${n} \\times ${ntex(t)} = ${ntex(N)}` });
    steps.push({ text: "Gelecek değer:", tex: `FV = P(1+i)^N${contributing ? " + PMT\\frac{(1+i)^N-1}{i}" : ""} = ${ntex(P)} \\times (1+${ntex(i, 6)})^{${ntex(N)}}${contribTex} = ${ntex(FV, 8)}` });
  }
  steps.push({ text: "Toplam faiz = gelecek değer − toplam yatırılan tutar:", tex: `${ntex(FV, 8)} - ${ntex(totalContrib, 8)} = ${ntex(interest, 8)}` });
  return {
    results: [
      { label: "Gelecek değer FV", value: money(FV), text: `FV = ${money(FV)}` },
      { label: "Toplam yatırılan tutar", value: money(totalContrib) },
      { label: "Toplam faiz", value: money(interest) },
      { label: "Yıllık gerçek faiz oranı", value: `${fmt(ear * 100, 5)}%` }
    ],
    steps,
    copy: `Gelecek değer: ${money(FV)}, toplam faiz: ${money(interest)}, yıllık gerçek faiz oranı: %${fmt(ear * 100, 5)}`,
    blocks: [
      { type: "table", caption: "Her yıl sonundaki bakiye", head: ["Yıl", "Bakiye", "Şimdiye kadarki toplam faiz"], rows },
      { type: "plot", title: "Bakiyenin zaman içindeki büyümesi", xLabel: "Yıllar", yLabel: "Bakiye", includeZero: true, series: [{ name: "Bakiye", points, line: true }] }
    ]
  };
}
