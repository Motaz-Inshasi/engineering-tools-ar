import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PRESETS = { "50-30-20": [50, 30, 20], "70-20-10": [70, 20, 10] };

const verdict = (kind, target, actual) => {
  if (actual === null) return "Belum ada pengeluaran aktual yang dimasukkan";
  const diff = Math.round((actual - target) * 100) / 100;
  if (diff === 0) return "Sesuai dengan anggaran";
  if (kind === "save") return diff > 0 ? `Melebihi target sebesar ${money(diff)}` : `Di bawah target sebesar ${money(-diff)}`;
  return diff < 0 ? `Dalam anggaran (hemat ${money(-diff)})` : `Melebihi anggaran sebesar ${money(diff)}`;
};

export const meta = {
  description: "Bagi pendapatan bulanan bersih Anda untuk kebutuhan, keinginan, dan tabungan menurut aturan 50/30/20 atau 70/20/10 atau persentase yang Anda pilih, dan bandingkan pengeluaran aktual dengan anggaran untuk mengetahui kelebihan atau penghematan.",
  keywords: ["anggaran", "pembagian pendapatan", "50 30 20", "70 20 10", "anggaran bulanan", "budget", "tabungan"],
  formulas: [
    { label: "Jumlah setiap kategori", tex: "B_i = I \\times \\frac{p_i}{100}" },
    { label: "Syarat persentase kustom", tex: "p_1 + p_2 + p_3 = 100" },
    { label: "Selisih antara aktual dan rencana", tex: "\\Delta_i = A_i - B_i" }
  ],
  inputs: [
    { id: "income", label: "Pendapatan bersih bulanan", type: "number", default: "10000", help: "Pendapatan setelah potongan dan pajak." },
    { id: "method", label: "Metode pembagian", type: "select", default: "50-30-20", options: [["50-30-20", "50 / 30 / 20 (kebutuhan / keinginan / tabungan)"], ["70-20-10", "70 / 20 / 10"], ["custom", "Persentase kustom"]] },
    { id: "needsPct", label: "Persentase kebutuhan", unit: "%", type: "number", default: "50", when: { method: ["custom"] } },
    { id: "wantsPct", label: "Persentase keinginan", unit: "%", type: "number", default: "30", when: { method: ["custom"] } },
    { id: "savePct", label: "Persentase tabungan", unit: "%", type: "number", default: "20", when: { method: ["custom"] }, help: "Jumlah ketiga persentase harus 100%." },
    { id: "needsActual", label: "Pengeluaran aktual untuk kebutuhan", type: "number", help: "Opsional: biarkan kosong jika tidak ingin membandingkan." },
    { id: "wantsActual", label: "Pengeluaran aktual untuk keinginan", type: "number", help: "Opsional." },
    { id: "savingsActual", label: "Jumlah yang benar-benar ditabung", type: "number", help: "Opsional." }
  ],
  example: { values: { income: "10000", method: "50-30-20", needsPct: "50", wantsPct: "30", savePct: "20", needsActual: "6000", wantsActual: "", savingsActual: "1500" }, expect: ["5,000.00", "3,000.00"], note: "Contoh: pendapatan 10000 dengan aturan 50/30/20, dengan pengeluaran kebutuhan aktual 6000 yang melebihi anggaran." },
  invalid: { values: { income: "10000", method: "custom", needsPct: "50", wantsPct: "30", savePct: "30", needsActual: "", wantsActual: "", savingsActual: "" } },
  related: ["savings-goal", "zakat", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const income = num(input, "income", "Pendapatan bersih", { positive: true });
  const method = choice(input, "method", "Metode pembagian", ["50-30-20", "70-20-10", "custom"], "50-30-20");
  let pcts;
  if (method === "custom") {
    const needs = num(input, "needsPct", "Persentase kebutuhan", { min: 0, max: 100 });
    const wants = num(input, "wantsPct", "Persentase keinginan", { min: 0, max: 100 });
    const save = num(input, "savePct", "Persentase tabungan", { min: 0, max: 100 });
    if (Math.abs(needs + wants + save - 100) > 1e-9) fail(`Total persentase ${fmt(needs + wants + save)}% harus sama dengan 100%.`, "savePct");
    pcts = [needs, wants, save];
  } else {
    pcts = PRESETS[method];
  }
  const actual = (key, label) => num(input, key, label, { nonNegative: true, optional: true });
  const actuals = [actual("needsActual", "Pengeluaran aktual untuk kebutuhan"), actual("wantsActual", "Pengeluaran aktual untuk keinginan"), actual("savingsActual", "Jumlah yang benar-benar ditabung")];

  const [pNeeds, pWants, pSave] = pcts;
  const needs = (income * pNeeds) / 100;
  const wants = (income * pWants) / 100;
  const save = (income * pSave) / 100;
  const targets = [needs, wants, save];
  const names = ["Kebutuhan", "Keinginan", "Tabungan"];
  const kinds = ["spend", "spend", "save"];

  const rows = names.map((name, k) => [
    name,
    `${fmt(pcts[k])}%`,
    money(targets[k]),
    actuals[k] === null ? "—" : money(actuals[k]),
    verdict(kinds[k], targets[k], actuals[k])
  ]);

  const steps = [
    { text: "Jumlah kebutuhan dari pendapatan:", tex: `B_{\\text{needs}} = ${ntex(income)} \\times \\frac{${fmt(pNeeds)}}{100} = ${ntex(needs, 8)}` },
    { text: "Jumlah keinginan dari pendapatan:", tex: `B_{\\text{wants}} = ${ntex(income)} \\times \\frac{${fmt(pWants)}}{100} = ${ntex(wants, 8)}` },
    { text: "Jumlah tabungan dari pendapatan:", tex: `B_{\\text{save}} = ${ntex(income)} \\times \\frac{${fmt(pSave)}}{100} = ${ntex(save, 8)}` }
  ];

  return {
    results: [
      { label: "Jumlah kebutuhan", value: money(needs) },
      { label: "Jumlah keinginan", value: money(wants) },
      { label: "Jumlah tabungan", value: money(save) }
    ],
    steps,
    copy: `Kebutuhan: ${money(needs)}, keinginan: ${money(wants)}, tabungan: ${money(save)} (dari pendapatan ${money(income)})`,
    blocks: [
      { type: "table", caption: "Anggaran rencana vs pengeluaran aktual", head: ["Kategori", "Persentase", "Rencana", "Aktual", "Kesimpulan"], rows }
    ]
  };
}
