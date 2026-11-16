import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KARATS = ["24", "22", "21", "18"];
const RATE = 0.025;
const SILVER_NISAB_G = 595;
const GOLD_NISAB_G = 85;

export const meta = {
  description: "Hitung zakat atas harta kena zakat setelah dikurangi utang jatuh tempo, meliputi uang tunai, emas dengan berbagai kadar, perak, barang dagangan, piutang yang diharapkan tertagih, dan investasi, serta tampilkan apakah sudah mencapai nisab emas atau perak.",
  keywords: ["zakat", "nisab zakat", "zakat emas", "zakat perak", "zakat harta", "perhitungan zakat", "zakat"],
  formulas: [
    { label: "Nilai emas setelah dikonversi ke kadar 24", tex: "V_{Au} = G \\times \\frac{k}{24} \\times P_{Au}" },
    { label: "Harta kena zakat bersih", tex: "N = A - D" },
    { label: "Nisab", tex: "N_{sb} = 595\\ \\text{g} \\times P_{Ag},\\qquad N_{gd} = 85\\ \\text{g} \\times P_{Au}" },
    { label: "Zakat", tex: "Z = 2.5\\% \\times N \\quad \\text{if } N \\ge \\text{Nisab}" }
  ],
  inputs: [
    { id: "cash", label: "Uang tunai dan saldo bank", type: "number", default: "0" },
    { id: "goldG", label: "Emas yang dimiliki", unit: "gram", type: "number", default: "0" },
    { id: "karat", label: "Kadar emas", type: "select", default: "24", options: [["24", "Kadar 24"], ["22", "Kadar 22"], ["21", "Kadar 21"], ["18", "Kadar 18"]] },
    { id: "silverG", label: "Perak yang dimiliki", unit: "gram", type: "number", default: "0" },
    { id: "trade", label: "Nilai barang dagangan dan persediaan", type: "number", default: "0" },
    { id: "receivables", label: "Piutang yang diharapkan tertagih", type: "number", default: "0" },
    { id: "invest", label: "Investasi dan saham (nilai pasar)", type: "number", default: "0" },
    { id: "debts", label: "Utang jatuh tempo sekarang", type: "number", default: "0", help: "Utang jangka pendek yang jatuh tempo dalam setahun, dan dikurangkan dari aset." },
    { id: "goldPrice", label: "Harga gram emas kadar 24", type: "number", help: "Diperlukan jika Anda memiliki emas atau nisab berbasis emas." },
    { id: "silverPrice", label: "Harga gram perak", type: "number", help: "Diperlukan jika Anda memiliki perak atau nisab berbasis perak." },
    { id: "basis", label: "Dasar nisab", type: "select", default: "silver", options: [["silver", "Perak (595 gram)"], ["gold", "Emas (85 gram)"]], help: "Banyak ulama dan lembaga menggunakan nisab perak karena lebih bermanfaat bagi orang miskin, sementara yang lain memilih nisab emas." }
  ],
  example: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "1", basis: "silver" }, expect: ["250.00", "595.00"], note: "Contoh: uang tunai 10000 dengan harga perak 1 per gram, maka nisab 595 dan zakat 250." },
  invalid: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "", basis: "silver" } },
  related: ["budget-planner", "savings-goal", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const cash = num(input, "cash", "Uang tunai dan saldo", { nonNegative: true, default: 0 });
  const goldG = num(input, "goldG", "Berat emas", { nonNegative: true, default: 0 });
  const karat = Number(choice(input, "karat", "Kadar emas", KARATS, "24"));
  const silverG = num(input, "silverG", "Berat perak", { nonNegative: true, default: 0 });
  const trade = num(input, "trade", "Barang dagangan", { nonNegative: true, default: 0 });
  const receivables = num(input, "receivables", "Piutang yang diharapkan", { nonNegative: true, default: 0 });
  const invest = num(input, "invest", "Investasi", { nonNegative: true, default: 0 });
  const debts = num(input, "debts", "Utang jatuh tempo", { nonNegative: true, default: 0 });
  const basis = choice(input, "basis", "Dasar nisab", ["silver", "gold"], "silver");
  const goldPrice = num(input, "goldPrice", "Harga gram emas", { nonNegative: true, optional: true });
  const silverPrice = num(input, "silverPrice", "Harga gram perak", { nonNegative: true, optional: true });

  const gross = cash + goldG + silverG + trade + receivables + invest;
  if (!(gross > 0)) fail("Masukkan nilai lebih besar dari nol untuk salah satu harta zakat.", "cash");
  if ((goldG > 0 || basis === "gold") && !(goldPrice > 0)) fail("Masukkan harga gram emas kadar 24 untuk menghitung nilai emas atau nisab.", "goldPrice");
  if ((silverG > 0 || basis === "silver") && !(silverPrice > 0)) fail("Masukkan harga gram perak untuk menghitung nilai perak atau nisab.", "silverPrice");

  const goldValue = goldG > 0 ? goldG * (karat / 24) * goldPrice : 0;
  const silverValue = silverG > 0 ? silverG * silverPrice : 0;
  const assets = cash + goldValue + silverValue + trade + receivables + invest;
  const net = assets - debts;
  const gold = basis === "gold";
  const nisab = gold ? GOLD_NISAB_G * goldPrice : SILVER_NISAB_G * silverPrice;
  const basisLabel = gold ? "emas" : "perak";
  const eligible = net > 0 && net >= nisab;
  const zakat = eligible ? net * RATE : 0;
  const status = eligible ? "Harta telah mencapai nisab, dan zakat wajib dengan syarat telah berlalu satu tahun (haul)." : "Harta di bawah nisab, sehingga tidak ada zakat wajib.";

  const rows = [
    ["Uang tunai dan saldo bank", money(cash)],
    [`Emas (${fmt(goldG)} g kadar ${karat})`, money(goldValue)],
    [`Perak (${fmt(silverG)} g)`, money(silverValue)],
    ["Barang dagangan dan persediaan", money(trade)],
    ["Piutang yang diharapkan tertagih", money(receivables)],
    ["Investasi dan saham", money(invest)],
    ["Total aset", money(assets)],
    ["Dikurangi utang jatuh tempo", money(-debts)],
    ["Harta kena zakat bersih", money(net)],
    [`Nisab (${basisLabel})`, money(nisab)]
  ];

  const steps = [];
  if (goldG > 0) steps.push({ text: "Konversi emas ke kadar 24 lalu hitung nilainya:", tex: `V_{Au} = ${ntex(goldG)} \\times \\frac{${karat}}{24} \\times ${ntex(goldPrice)} = ${ntex(goldValue, 8)}` });
  if (silverG > 0) steps.push({ text: "Nilai perak:", tex: `V_{Ag} = ${ntex(silverG)} \\times ${ntex(silverPrice)} = ${ntex(silverValue, 8)}` });
  steps.push({ text: "Jumlah harta zakat lalu dikurangi utang jatuh tempo:", tex: `N = A - D = ${ntex(assets, 8)} - ${ntex(debts, 8)} = ${ntex(net, 8)}` });
  steps.push({ text: "Perhitungan nisab sesuai dasar yang dipilih:", tex: gold ? `N_{gd} = 85 \\times ${ntex(goldPrice)} = ${ntex(nisab, 8)}` : `N_{sb} = 595 \\times ${ntex(silverPrice)} = ${ntex(nisab, 8)}` });
  steps.push(eligible
    ? { text: "Harta mencapai nisab, sehingga zakat dihitung dengan 2.5%:", tex: `Z = 0.025 \\times ${ntex(net, 8)} = ${ntex(zakat, 8)}` }
    : "Harta zakat di bawah nisab, sehingga tidak ada zakat wajib.");

  return {
    results: [
      { label: "Harta kena zakat bersih", value: money(net) },
      { label: `Nilai nisab (${basisLabel})`, value: money(nisab) },
      { label: "Status", value: eligible ? "Mencapai nisab" : "Di bawah nisab" },
      { label: "Zakat yang wajib (2.5%)", value: money(zakat) }
    ],
    steps,
    copy: `${status}. Zakat wajib: ${money(zakat)}, harta zakat bersih: ${money(net)}, nisab: ${money(nisab)} (${basisLabel})`,
    blocks: [
      { type: "table", caption: "Komponen harta zakat", head: ["Item", "Nilai"], rows },
      { type: "note", text: "Haul: harta yang mencapai nisab harus telah dimiliki pemiliknya selama satu tahun hijriah penuh (haul qamariah)." },
      { type: "note", text: "Perhitungan ini bersifat perkiraan untuk edukasi; rujuk lembaga fatwa terpercaya untuk kasus khusus.", tone: "warn" }
    ]
  };
}
