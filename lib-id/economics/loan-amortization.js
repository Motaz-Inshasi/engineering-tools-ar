import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Hitung angsuran periodik tetap untuk pinjaman, total yang dibayar, dan total bunga, dengan tabel tahunan yang menampilkan bunga yang dibayar, pokok utang yang dilunasi, dan sisa saldo, serta grafik penurunan saldo.",
  keywords: ["pinjaman", "jadwal pelunasan", "amortization", "angsuran bulanan", "bunga pinjaman", "pelunasan utang", "kredit properti (KPR)"],
  formulas: [
    { label: "Angsuran tetap", tex: "PMT = \\frac{P\\,i}{1-(1+i)^{-N}},\\qquad i=\\frac{r}{m},\\quad N=mt" },
    { label: "Saldo setelah pembayaran ke-k", tex: "B_k = B_{k-1}(1+i) - PMT" }
  ],
  inputs: [
    { id: "P", label: "Pokok pinjaman P", type: "number", default: "100000" },
    { id: "r", label: "Suku bunga tahunan", unit: "%", type: "number", default: "6" },
    { id: "t", label: "Jangka waktu pinjaman", unit: "tahun", type: "number", default: "30", help: "Jangka waktu × jumlah angsuran per tahun harus menghasilkan bilangan bulat angsuran, dengan batas maksimum 100 tahun." },
    { id: "freq", label: "Jumlah angsuran per tahun", type: "select", default: "12", options: [["12", "Bulanan (12)"], ["4", "Kuartalan (4)"], ["2", "Semesteran (2)"], ["1", "Tahunan (1)"]] }
  ],
  example: { values: { P: "100000", r: "6", t: "30", freq: "12" }, expect: ["599.55"], note: "Contoh: KPR 100.000 dengan bunga 6% selama 30 tahun dengan angsuran bulanan." },
  invalid: { values: { P: "100000", r: "6", t: "1.01", freq: "12" } },
  related: ["compound-interest", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "Pokok pinjaman", { positive: true });
  const r = num(input, "r", "Suku bunga", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "Jangka waktu pinjaman", { positive: true, max: 100 });
  const m = Number(choice(input, "freq", "Jumlah angsuran per tahun", ["12", "4", "2", "1"], "12"));
  const Nraw = t * m;
  if (Math.abs(Nraw - Math.round(Nraw)) > 1e-9) fail(`Jumlah angsuran (${fmt(Nraw)}) harus berupa bilangan bulat, jadi ubah jangka waktu dalam tahun.`, "t");
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
    { text: "Suku bunga per angsuran:", tex: `i = \\frac{r}{m} = \\frac{${ntex(r / 100, 6)}}{${m}} = ${ntex(i, 6)}` },
    { text: "Jumlah total angsuran:", tex: `N = mt = ${m} \\times ${ntex(t)} = ${N}` },
    i === 0
      ? { text: "Tanpa bunga, pokok pinjaman dibagi dengan jumlah angsuran:", tex: `PMT = \\frac{P}{N} = \\frac{${ntex(P)}}{${N}} = ${ntex(pmt, 8)}` }
      : { text: "Angsuran tetap:", tex: `PMT = \\frac{P\\,i}{1-(1+i)^{-N}} = \\frac{${ntex(P)} \\times ${ntex(i, 6)}}{1-(1+${ntex(i, 6)})^{-${N}}} = ${ntex(pmt, 8)}` },
    { text: "Total yang dibayar dan total bunga:", tex: `${ntex(pmt, 8)} \\times ${N} = ${ntex(total, 8)},\\qquad ${ntex(total, 8)} - ${ntex(P)} = ${ntex(interest, 8)}` }
  ];
  return {
    results: [
      { label: "Angsuran periodik", value: money(pmt), text: `Angsuran ${money(pmt)}` },
      { label: "Total yang dibayar", value: money(total) },
      { label: "Total bunga", value: money(interest) },
      { label: "Jumlah angsuran", value: String(N) }
    ],
    steps,
    copy: `Angsuran: ${money(pmt)} per periode, total yang dibayar: ${money(total)}, total bunga: ${money(interest)}`,
    blocks: [
      { type: "table", caption: "Jadwal pelunasan tahunan", head: ["Tahun", "Bunga yang dibayar", "Pokok utang yang dilunasi", "Sisa saldo"], rows: [...rows, ["Total", money(interest), money(P), "0.00"]] },
      { type: "note", text: "Angsuran tetap selama jangka waktu, sehingga porsi bunga lebih besar di awal dan porsi pokok utang meningkat seiring waktu. Angka dibulatkan hingga dua desimal." },
      { type: "plot", title: "Sisa saldo dari waktu ke waktu", xLabel: "Tahun", yLabel: "Saldo", includeZero: true, series: [{ name: "Sisa saldo", points, line: true }] }
    ]
  };
}
