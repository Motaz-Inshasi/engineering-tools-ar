import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "İki fiyat ve iki miktardan, orta nokta veya basit oran yöntemiyle talebin fiyat esnekliğini hesaplayın, esnekliği sınıflandırın ve fiyat değişiminin toplam gelire etkisini gösterin.",
  keywords: ["Fiyat esnekliği", "price elasticity", "Talep esnekliği", "Toplam gelir", "Esnek", "Esnek değil", "elasticity"],
  formulas: [
    { label: "Esneklik katsayısı", tex: "E = \\frac{\\%\\Delta Q}{\\%\\Delta P}" },
    { label: "Orta nokta", tex: "\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2},\\qquad \\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2}" }
  ],
  inputs: [
    { id: "P1", label: "Birinci fiyat P1", type: "number", default: "10" },
    { id: "Q1", label: "Birinci miktar Q1", type: "number", default: "100" },
    { id: "P2", label: "İkinci fiyat P2", type: "number", default: "12" },
    { id: "Q2", label: "İkinci miktar Q2", type: "number", default: "80" },
    { id: "method", label: "Hesaplama yöntemi", type: "select", default: "mid", options: [["mid", "Orta nokta (yay)"], ["simple", "Basit oran"]], help: "Orta nokta yöntemi, değişimin yönü ne olursa olsun aynı sonucu verir." }
  ],
  example: { values: { P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid" }, expect: ["-1.222", "Esnek"], note: "Örnek: fiyat 10'dan 12'ye yükseltildiğinde miktar 100'den 80'e düşmüştür." },
  invalid: { values: { P1: "10", Q1: "100", P2: "10", Q2: "80", method: "mid" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "financial-ratios"]
};

export function solve(input) {
  const P1 = num(input, "P1", "Birinci fiyat", { positive: true });
  const Q1 = num(input, "Q1", "Birinci miktar", { nonNegative: true });
  const P2 = num(input, "P2", "İkinci fiyat", { positive: true });
  const Q2 = num(input, "Q2", "İkinci miktar", { nonNegative: true });
  const method = choice(input, "method", "Hesaplama yöntemi", ["mid", "simple"], "mid");
  if (P1 === P2) fail("Fiyat değişmedi; paydada sıfır olacağı için esneklik hesaplanamaz.", "P2");
  if (method === "simple" && Q1 === 0) fail("Birinci miktar sıfır; basit oran birinci miktar üzerinden hesaplanır.", "Q1");
  if (method === "mid" && Q1 + Q2 === 0) fail("İki miktar da sıfır; miktar değişiminin orta nokta oranı hesaplanamaz.", "Q2");
  const mid = method === "mid";
  const dP = P2 - P1;
  const dQ = Q2 - Q1;
  const baseP = mid ? (P1 + P2) / 2 : P1;
  const baseQ = mid ? (Q1 + Q2) / 2 : Q1;
  const pctP = dP / baseP;
  const pctQ = dQ / baseQ;
  const E = pctQ / pctP;
  const a = Math.abs(E);
  let cls;
  if (a < 1e-12) cls = "Tamamen esnek değil";
  else if (Math.abs(a - 1) < 1e-9) cls = "Birim esnek";
  else if (a > 1) cls = "Esnek";
  else cls = "Esnek değil";
  const R1 = P1 * Q1;
  const R2 = P2 * Q2;
  const dR = R2 - R1;
  const effect = Math.abs(dR) < 1e-9
    ? "Toplam gelir değişmez"
    : dR > 0 ? `Toplam gelir ${money(dR)} arttı` : `Toplam gelir ${money(-dR)} azaldı`;
  let note;
  if (a < 1e-12) note = "Miktar fiyatla değişmiyor; bu nedenle gelir, fiyat değişim oranının kendisi kadar değişir.";
  else if (Math.abs(a - 1) < 1e-9) note = "Esneklik bire eşit; bu nedenle fiyat değiştiğinde toplam gelir yaklaşık olarak sabit kalır.";
  else if (a > 1) note = "Talep esnek: miktar değişim oranı fiyat değişim oranından büyük; bu nedenle fiyat düşürüldüğünde gelir artar, yükseltildiğinde azalır.";
  else note = "Talep esnek değil: miktar değişim oranı fiyat değişim oranından küçük; bu nedenle fiyat yükseltildiğinde gelir artar, düşürüldüğünde azalır.";
  const steps = [
    {
      text: mid ? "Orta nokta yöntemiyle miktar değişim oranı:" : "Miktar değişim oranı:",
      tex: mid
        ? `\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2} = \\frac{${ntex(dQ)}}{${ntex(baseQ)}} = ${ntex(pctQ, 6)}`
        : `\\%\\Delta Q = \\frac{Q_2-Q_1}{Q_1} = \\frac{${ntex(dQ)}}{${ntex(Q1)}} = ${ntex(pctQ, 6)}`
    },
    {
      text: mid ? "Orta nokta yöntemiyle fiyat değişim oranı:" : "Fiyat değişim oranı:",
      tex: mid
        ? `\\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2} = \\frac{${ntex(dP)}}{${ntex(baseP)}} = ${ntex(pctP, 6)}`
        : `\\%\\Delta P = \\frac{P_2-P_1}{P_1} = \\frac{${ntex(dP)}}{${ntex(P1)}} = ${ntex(pctP, 6)}`
    },
    { text: "Esneklik katsayısı:", tex: `E = \\frac{\\%\\Delta Q}{\\%\\Delta P} = \\frac{${ntex(pctQ, 6)}}{${ntex(pctP, 6)}} = ${ntex(E, 6)}` },
    { text: "Değişim öncesi ve sonrası toplam gelir:", tex: `R_1 = P_1Q_1 = ${ntex(R1)},\\qquad R_2 = P_2Q_2 = ${ntex(R2)}` }
  ];
  return {
    results: [
      { label: "Miktar değişim oranı", value: `${fmt(pctQ * 100, 4)}%` },
      { label: "Fiyat değişim oranı", value: `${fmt(pctP * 100, 4)}%` },
      { label: "Esneklik katsayısı E", value: fmt(E, 4), text: `E = ${fmt(E, 4)}` },
      { label: "Esneklik sınıflandırması", value: cls },
      { label: "Değişim öncesi toplam gelir", value: money(R1) },
      { label: "Değişim sonrası toplam gelir", value: money(R2) },
      { label: "Değişimin gelire etkisi", value: effect }
    ],
    steps,
    copy: `E = ${fmt(E, 4)} (${cls}), gelir ${money(R1)}'dan ${money(R2)}'e, ${effect}`,
    blocks: [
      { type: "table", caption: "Değişim öncesi ve sonrası karşılaştırma", head: ["Kalem", "Öncesi", "Sonrası"], rows: [["Fiyat", fmt(P1, 6), fmt(P2, 6)], ["Miktar", fmt(Q1, 6), fmt(Q2, 6)], ["Toplam gelir", money(R1), money(R2)]] },
      { type: "note", text: note }
    ]
  };
}
