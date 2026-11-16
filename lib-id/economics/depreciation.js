import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Hitung penyusutan aset per tahun dengan metode garis lurus, saldo menurun, atau jumlah angka tahun, dengan tabel yang menampilkan penyusutan, akumulasi, dan nilai buku tanpa turun di bawah nilai sisa.",
  keywords: ["penyusutan", "penyusutan", "depreciation", "garis lurus", "saldo menurun", "jumlah angka tahun", "nilai buku", "nilai sisa"],
  formulas: [
    { label: "garis lurus", tex: "D = \\frac{C-S}{n}" },
    { label: "jumlah angka tahun", tex: "D_y = \\frac{n-y+1}{n(n+1)/2}\\,(C-S)" },
    { label: "saldo menurun", tex: "D_y = \\max\\left(B_{y-1}\\frac{k}{n},\\ \\frac{B_{y-1}-S}{n-y+1}\\right)" }
  ],
  inputs: [
    { id: "cost", label: "Harga perolehan aset C", type: "number", default: "10000" },
    { id: "salvage", label: "Nilai sisa S", type: "number", default: "1000" },
    { id: "life", label: "Umur ekonomis n", unit: "tahun", type: "number", default: "5", help: "Bilangan bulat dari 1 sampai 100." },
    { id: "method", label: "Metode penyusutan", type: "select", default: "sl", options: [["sl", "garis lurus"], ["db", "saldo menurun"], ["syd", "jumlah angka tahun"]] },
    { id: "factor", label: "Faktor saldo menurun k", type: "select", default: "2", options: [["2", "Ganda (2)"], ["1.5", "1.5"]], when: { method: ["db"] } }
  ],
  example: { values: { cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2" }, expect: ["1,800.00"], note: "Contoh: aset seharga 10.000, nilai sisa 1.000, dan umur 5 tahun dengan garis lurus." },
  invalid: { values: { cost: "1000", salvage: "2000", life: "5", method: "sl", factor: "2" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const cost = num(input, "cost", "Harga perolehan aset", { positive: true });
  const salvage = num(input, "salvage", "nilai sisa", { nonNegative: true });
  const n = num(input, "life", "Umur ekonomis", { integer: true, min: 1, max: 100 });
  const method = choice(input, "method", "Metode penyusutan", ["sl", "db", "syd"], "sl");
  const factor = Number(choice(input, "factor", "Faktor saldo menurun", ["2", "1.5"], "2"));
  if (salvage > cost) fail("Nilai sisa tidak boleh melebihi harga perolehan aset.", "salvage");
  const base = cost - salvage;
  const sumYears = (n * (n + 1)) / 2;
  let bv = cost;
  let acc = 0;
  let switchYear = null;
  const schedule = [];
  for (let y = 1; y <= n; y++) {
    let d;
    let kind = "";
    if (method === "sl") d = base / n;
    else if (method === "syd") d = (base * (n - y + 1)) / sumYears;
    else {
      const dbAmt = (bv * factor) / n;
      const slAmt = (bv - salvage) / (n - y + 1);
      const useSl = slAmt > dbAmt;
      if (useSl && switchYear === null) switchYear = y;
      d = Math.min(Math.max(dbAmt, slAmt), bv - salvage);
      kind = useSl ? "garis lurus" : "saldo menurun";
    }
    bv = Math.max(bv - d, salvage);
    acc += d;
    schedule.push({ y, d, acc, bv, kind });
  }
  const withKind = method === "db";
  const rows = schedule.map((s) => (withKind ? [fmt(s.y), money(s.d), money(s.acc), money(s.bv), s.kind] : [fmt(s.y), money(s.d), money(s.acc), money(s.bv)]));
  const head = ["Tahun", "penyusutan", "Akumulasi", "nilai buku"];
  if (withKind) head.push("Metode");
  const first = schedule[0].d;
  const last = schedule[n - 1].bv;
  const results = [
    { label: "Penyusutan tahun pertama", value: money(first) },
    { label: "Total penyusutan", value: money(base) },
    { label: "Nilai buku di akhir umur ekonomis", value: money(last) }
  ];
  if (method === "sl") results.unshift({ label: "Penyusutan tahunan tetap garis lurus", value: money(base / n) });
  const steps = [];
  if (method === "sl") {
    steps.push({ text: "Penyusutan garis lurus:", tex: `D = \\frac{C-S}{n} = \\frac{${ntex(cost)} - ${ntex(salvage)}}{${n}} = ${ntex(base / n, 8)}` });
  } else if (method === "syd") {
    steps.push({ text: "Jumlah angka tahun:", tex: `\\sum = \\frac{n(n+1)}{2} = \\frac{${n}(${n}+1)}{2} = ${ntex(sumYears)}` });
    steps.push({ text: "Penyusutan tahun pertama:", tex: `D_1 = \\frac{n}{\\sum}(C-S) = \\frac{${n}}{${ntex(sumYears)}} \\times ${ntex(base)} = ${ntex(first, 8)}` });
  } else {
    steps.push({ text: "Laju saldo menurun:", tex: `\\text{rate} = \\frac{k}{n} = \\frac{${factor}}{${n}} = ${ntex(factor / n, 6)}` });
    steps.push({ text: "Penyusutan tahun pertama:", tex: `D_1 = C \\times \\text{rate} = ${ntex(cost)} \\times ${ntex(factor / n, 6)} = ${ntex(first, 8)}` });
    steps.push("Setiap tahun kita mengambil yang lebih besar antara penyusutan saldo menurun dan garis lurus atas nilai yang tersisa, dan tidak melebihi nilai sisa.");
  }
  const copy = method === "sl"
    ? `Penyusutan tahunan tetap garis lurus: ${money(base / n)}, nilai buku di akhir umur ekonomis: ${money(last)}`
    : `Penyusutan tahun pertama: ${money(first)}, nilai buku di akhir umur ekonomis: ${money(last)}`;
  const blocks = [{ type: "table", caption: "Tabel penyusutan tahunan", head, rows }];
  if (method === "db") {
    blocks.push(switchYear === null
      ? { type: "note", text: "Perhitungan tidak perlu beralih ke garis lurus, dan nilai buku tidak turun di bawah nilai sisa." }
      : { type: "note", text: `Perhitungan beralih ke garis lurus mulai tahun ${switchYear}, karena penyusutan garis lurus atas nilai yang tersisa lebih besar, sehingga nilai buku mencapai nilai sisa di akhir umur ekonomis tanpa turun di bawahnya.` });
  }
  return { results, steps, copy, blocks };
}
