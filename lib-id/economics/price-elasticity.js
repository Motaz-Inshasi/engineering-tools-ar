import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Hitung koefisien elastisitas harga permintaan dari dua harga dan dua kuantitas dengan titik tengah atau persentase sederhana, klasifikasikan elastisitasnya, dan tunjukkan pengaruh perubahan harga terhadap total pendapatan.",
  keywords: ["elastisitas harga", "price elasticity", "elastisitas permintaan", "Total pendapatan", "elastis", "tidak elastis", "elasticity"],
  formulas: [
    { label: "Koefisien elastisitas", tex: "E = \\frac{\\%\\Delta Q}{\\%\\Delta P}" },
    { label: "Titik tengah", tex: "\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2},\\qquad \\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2}" }
  ],
  inputs: [
    { id: "P1", label: "Harga pertama P1", type: "number", default: "10" },
    { id: "Q1", label: "Kuantitas pertama Q1", type: "number", default: "100" },
    { id: "P2", label: "Harga kedua P2", type: "number", default: "12" },
    { id: "Q2", label: "Kuantitas kedua Q2", type: "number", default: "80" },
    { id: "method", label: "Metode perhitungan", type: "select", default: "mid", options: [["mid", "Titik tengah (busur)"], ["simple", "Persentase sederhana"]], help: "Titik tengah memberikan hasil yang sama terlepas dari arah perubahannya." }
  ],
  example: { values: { P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid" }, expect: ["-1.222", "elastis"], note: "Contoh: harga dinaikkan dari 10 menjadi 12 sehingga kuantitas turun dari 100 menjadi 80." },
  invalid: { values: { P1: "10", Q1: "100", P2: "10", Q2: "80", method: "mid" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "financial-ratios"]
};

export function solve(input) {
  const P1 = num(input, "P1", "Harga pertama", { positive: true });
  const Q1 = num(input, "Q1", "Kuantitas pertama", { nonNegative: true });
  const P2 = num(input, "P2", "Harga kedua", { positive: true });
  const Q2 = num(input, "Q2", "Kuantitas kedua", { nonNegative: true });
  const method = choice(input, "method", "Metode perhitungan", ["mid", "simple"], "mid");
  if (P1 === P2) fail("Harga tidak berubah, sehingga elastisitas tidak dapat dihitung karena pembagian dengan nol.", "P2");
  if (method === "simple" && Q1 === 0) fail("Kuantitas pertama nol, dan persentase sederhana dihitung dari kuantitas pertama.", "Q1");
  if (method === "mid" && Q1 + Q2 === 0) fail("Kedua kuantitas nol, sehingga persentase perubahan kuantitas titik tengah tidak dapat dihitung.", "Q2");
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
  if (a < 1e-12) cls = "Sama sekali tidak elastis";
  else if (Math.abs(a - 1) < 1e-9) cls = "Elastisitas uniter";
  else if (a > 1) cls = "elastis";
  else cls = "tidak elastis";
  const R1 = P1 * Q1;
  const R2 = P2 * Q2;
  const dR = R2 - R1;
  const effect = Math.abs(dR) < 1e-9
    ? "Total pendapatan tidak berubah"
    : dR > 0 ? `Total pendapatan naik sebesar ${money(dR)}` : `Total pendapatan turun sebesar ${money(-dR)}`;
  let note;
  if (a < 1e-12) note = "Kuantitas tidak berubah terhadap harga, sehingga pendapatan berubah sebesar persentase perubahan harga itu sendiri.";
  else if (Math.abs(a - 1) < 1e-9) note = "Elastisitas sama dengan satu, sehingga total pendapatan kurang lebih tetap ketika harga berubah.";
  else if (a > 1) note = "Permintaan elastis: persentase perubahan kuantitas lebih besar daripada persentase perubahan harga, sehingga pendapatan naik saat harga diturunkan dan turun saat harga dinaikkan.";
  else note = "Permintaan tidak elastis: persentase perubahan kuantitas lebih kecil daripada persentase perubahan harga, sehingga pendapatan naik saat harga dinaikkan dan turun saat harga diturunkan.";
  const steps = [
    {
      text: mid ? "Persentase perubahan kuantitas dengan titik tengah:" : "Persentase perubahan kuantitas:",
      tex: mid
        ? `\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2} = \\frac{${ntex(dQ)}}{${ntex(baseQ)}} = ${ntex(pctQ, 6)}`
        : `\\%\\Delta Q = \\frac{Q_2-Q_1}{Q_1} = \\frac{${ntex(dQ)}}{${ntex(Q1)}} = ${ntex(pctQ, 6)}`
    },
    {
      text: mid ? "Persentase perubahan harga dengan titik tengah:" : "Persentase perubahan harga:",
      tex: mid
        ? `\\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2} = \\frac{${ntex(dP)}}{${ntex(baseP)}} = ${ntex(pctP, 6)}`
        : `\\%\\Delta P = \\frac{P_2-P_1}{P_1} = \\frac{${ntex(dP)}}{${ntex(P1)}} = ${ntex(pctP, 6)}`
    },
    { text: "Koefisien elastisitas:", tex: `E = \\frac{\\%\\Delta Q}{\\%\\Delta P} = \\frac{${ntex(pctQ, 6)}}{${ntex(pctP, 6)}} = ${ntex(E, 6)}` },
    { text: "Total pendapatan sebelum dan sesudah perubahan:", tex: `R_1 = P_1Q_1 = ${ntex(R1)},\\qquad R_2 = P_2Q_2 = ${ntex(R2)}` }
  ];
  return {
    results: [
      { label: "Persentase perubahan kuantitas", value: `${fmt(pctQ * 100, 4)}%` },
      { label: "Persentase perubahan harga", value: `${fmt(pctP * 100, 4)}%` },
      { label: "Koefisien elastisitas E", value: fmt(E, 4), text: `E = ${fmt(E, 4)}` },
      { label: "Klasifikasi elastisitas", value: cls },
      { label: "Total pendapatan sebelum perubahan", value: money(R1) },
      { label: "Total pendapatan setelah perubahan", value: money(R2) },
      { label: "Pengaruh perubahan terhadap pendapatan", value: effect }
    ],
    steps,
    copy: `E = ${fmt(E, 4)} (${cls}), pendapatan dari ${money(R1)} menjadi ${money(R2)}, ${effect}`,
    blocks: [
      { type: "table", caption: "Perbandingan sebelum dan sesudah perubahan", head: ["Item", "Sebelum", "Sesudah"], rows: [["Harga", fmt(P1, 6), fmt(P2, 6)], ["Kuantitas", fmt(Q1, 6), fmt(Q2, 6)], ["Total pendapatan", money(R1), money(R2)]] },
      { type: "note", text: note }
    ]
  };
}
