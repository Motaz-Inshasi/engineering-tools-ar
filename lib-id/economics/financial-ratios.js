import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const n6 = (x) => ntex(x, 6);

const RATIOS = [
  {
    label: "Rasio lancar", need: ["CA", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA}{CL}", sub: (v) => `\\frac{${n6(v.CA)}}{${n6(v.CL)}}`, f: (v) => v.CA / v.CL,
    interp: (x) => (x >= 2 ? "Likuiditas baik, karena aset lancar menutupi kewajiban jangka pendek setidaknya dua kali" : x >= 1 ? "Likuiditas memadai, tetapi marginnya terbatas" : "Aset lancar tidak cukup untuk menutupi kewajiban jangka pendek")
  },
  {
    label: "Rasio likuiditas cepat", need: ["CA", "inv", "CL"], den: "CL", pct: false,
    sym: "\\frac{CA-\\text{Inv}}{CL}", sub: (v) => `\\frac{${n6(v.CA)}-${n6(v.inv)}}{${n6(v.CL)}}`, f: (v) => (v.CA - v.inv) / v.CL,
    interp: (x) => (x >= 1 ? "Menutupi kewajiban jangka pendek tanpa bergantung pada penjualan persediaan" : "Bergantung pada penjualan persediaan untuk melunasi kewajiban jangka pendek")
  },
  {
    label: "Rasio utang terhadap aset", need: ["TL", "TA"], den: "TA", pct: true,
    sym: "\\frac{TL}{TA}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.TA)}}`, f: (v) => v.TL / v.TA,
    interp: (x) => (x < 0.5 ? "Ketergantungan utang rendah" : x <= 1 ? "Ketergantungan utang sedang" : "Kewajiban melebihi aset")
  },
  {
    label: "Rasio utang terhadap ekuitas", need: ["TL", "equity"], den: "equity", pct: false,
    sym: "\\frac{TL}{E}", sub: (v) => `\\frac{${n6(v.TL)}}{${n6(v.equity)}}`, f: (v) => v.TL / v.equity,
    interp: (x, v) => (v.equity < 0 ? "Ekuitas negatif, kondisi keuangan yang memerlukan kehati-hatian" : x < 1 ? "Pembiayaan dari ekuitas lebih besar daripada utang" : "Utang melebihi atau sama dengan ekuitas")
  },
  {
    label: "Imbal hasil atas aset (ROA)", need: ["ni", "TA"], den: "TA", pct: true,
    sym: "\\frac{NI}{TA}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.TA)}}`, f: (v) => v.ni / v.TA,
    interp: (x) => (x < 0 ? "Kerugian terhadap aset" : x < 0.05 ? "Imbal hasil atas aset rendah" : "Imbal hasil atas aset baik")
  },
  {
    label: "Imbal hasil atas ekuitas (ROE)", need: ["ni", "equity"], den: "equity", pct: true,
    sym: "\\frac{NI}{E}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.equity)}}`, f: (v) => v.ni / v.equity,
    interp: (x, v) => (v.equity < 0 ? "Ekuitas negatif, sehingga rasio tidak menunjukkan profitabilitas yang sebenarnya" : x < 0 ? "Kerugian terhadap ekuitas" : x < 0.1 ? "Imbal hasil atas ekuitas rendah" : "Imbal hasil atas ekuitas baik")
  },
  {
    label: "Margin laba kotor", need: ["rev", "cogs"], den: "rev", pct: true,
    sym: "\\frac{Rev-COGS}{Rev}", sub: (v) => `\\frac{${n6(v.rev)}-${n6(v.cogs)}}{${n6(v.rev)}}`, f: (v) => (v.rev - v.cogs) / v.rev,
    interp: (x) => (x < 0 ? "Harga pokok penjualan lebih besar dari pendapatan" : "Bagian dari setiap satuan penjualan yang tersisa setelah harga pokok penjualan")
  },
  {
    label: "Margin laba bersih", need: ["ni", "rev"], den: "rev", pct: true,
    sym: "\\frac{NI}{Rev}", sub: (v) => `\\frac{${n6(v.ni)}}{${n6(v.rev)}}`, f: (v) => v.ni / v.rev,
    interp: (x) => (x < 0 ? "Kerugian bersih dari penjualan" : "Bagian dari setiap satuan penjualan yang menjadi laba bersih")
  },
  {
    label: "Perputaran aset", need: ["rev", "TA"], den: "TA", pct: false,
    sym: "\\frac{Rev}{TA}", sub: (v) => `\\frac{${n6(v.rev)}}{${n6(v.TA)}}`, f: (v) => v.rev / v.TA,
    interp: (x) => (x < 1 ? "Aset menghasilkan pendapatan lebih kecil dari nilainya" : "Aset menghasilkan pendapatan yang melebihi nilainya")
  }
];

const FIELDS = [
  ["CA", "Aset lancar", { nonNegative: true }],
  ["CL", "Kewajiban lancar", { nonNegative: true }],
  ["inv", "Persediaan", { nonNegative: true }],
  ["TA", "Total aset", { nonNegative: true }],
  ["TL", "Total kewajiban", { nonNegative: true }],
  ["equity", "Ekuitas", {}],
  ["rev", "Pendapatan", { nonNegative: true }],
  ["cogs", "Harga pokok penjualan", { nonNegative: true }],
  ["ni", "Laba bersih", {}]
];

export const meta = {
  description: "Hitung rasio keuangan dasar (likuiditas, utang, profitabilitas, dan efisiensi aset) hanya dari data yang tersedia, dengan tabel yang menampilkan setiap rasio, rumusnya, dan penjelasan singkatnya.",
  keywords: ["rasio keuangan", "financial ratios", "Rasio lancar", "likuiditas", "ROA", "ROE", "margin laba", "utang"],
  formulas: [
    { label: "Rasio lancar", tex: "\\frac{\\text{Aset lancar}}{\\text{Kewajiban lancar}}" },
    { label: "Imbal hasil atas ekuitas (ROE)", tex: "ROE = \\frac{NI}{E}" },
    { label: "Imbal hasil atas aset (ROA)", tex: "ROA = \\frac{NI}{TA}" }
  ],
  inputs: [
    { id: "CA", label: "Aset lancar", type: "number" },
    { id: "CL", label: "Kewajiban lancar", type: "number" },
    { id: "inv", label: "Persediaan", type: "number" },
    { id: "TA", label: "Total aset", type: "number" },
    { id: "TL", label: "Total kewajiban", type: "number" },
    { id: "equity", label: "Ekuitas", type: "number" },
    { id: "rev", label: "Pendapatan", type: "number" },
    { id: "cogs", label: "Harga pokok penjualan", type: "number" },
    { id: "ni", label: "Laba bersih", type: "number", help: "Semua kolom bersifat opsional, dan setiap rasio dihitung jika datanya tersedia." }
  ],
  example: {
    values: { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" },
    expect: ["Rasio lancar = 2", "Rasio utang terhadap aset = 60%"],
    note: "Contoh: perusahaan dengan aset lancar 500.000 dan kewajiban lancar 250.000 serta data aset dan pendapatan yang disebutkan."
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
      skipped.push(`${d.label} (data tidak lengkap)`);
      continue;
    }
    if (v[d.den] === 0) {
      skipped.push(`${d.label} (penyebut nol)`);
      continue;
    }
    computed.push({ d, x: d.f(v) });
  }
  if (computed.length === 0) fail("Masukkan data yang cukup untuk menghitung setidaknya satu rasio keuangan, seperti aset lancar dan kewajiban lancar.", "CA");
  const disp = (d, x) => (d.pct ? `${fmt(x * 100, 4)}%` : fmt(x, 4));
  const results = computed.map(({ d, x }) => ({ label: d.label, value: disp(d, x), text: `${d.label} = ${disp(d, x)}` }));
  const steps = computed.map(({ d, x }) => ({ text: `${d.label}:`, tex: `${d.sym} = ${d.sub(v)} = ${d.pct ? `${ntex(x * 100, 6)}\\%` : ntex(x, 6)}` }));
  const rows = computed.map(({ d, x }) => [d.label, disp(d, x), { tex: d.sym }, d.interp(x, v)]);
  const blocks = [{ type: "table", caption: "Rasio yang dihitung", head: ["Rasio", "Nilai", "Rumus", "Penjelasan"], rows }];
  if (skipped.length > 0) blocks.push({ type: "note", text: `Tidak dihitung: ${skipped.join("، ")}.`, tone: "warn" });
  return {
    results,
    steps,
    copy: results.map((r) => `${r.label} = ${r.value}`).join("، "),
    blocks
  };
}
