import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { BY_SYMBOL, molarMass } from "./formula.js";

export const meta = {
  description: "Menentukan rumus empiris (perbandingan paling sederhana) dari persen massa atau massa unsur, lalu rumus molekul jika massa molar diketahui, dengan tabel pembagian oleh jumlah mol terkecil.",
  keywords: ["Rumus empiris", "Rumus molekul", "empirical formula", "molecular formula", "analisis unsur", "persentase", "perbandingan paling sederhana"],
  formulas: [
    { label: "Mol setiap unsur, lalu perbandingan paling sederhana", tex: "n_i = \\frac{m_i}{A_i},\\qquad r_i = \\frac{n_i}{\\min_j n_j}" },
    { label: "Rumus molekul", tex: "k = \\frac{M_{\\text{molecular}}}{M_{\\text{empirical}}}" }
  ],
  inputs: [
    { id: "data", label: "Unsur dan persentase atau massanya", type: "textarea", default: "C 40.0\nH 6.71\nO 53.29", wide: true, help: "Satu baris untuk setiap unsur: lambang diikuti persen atau massa dalam gram, misalnya C 40 atau Na: 2.3" },
    { id: "M", label: "Massa molar senyawa (opsional)", unit: "g/mol", type: "number", default: "180" }
  ],
  example: { values: { data: "C 40.0\nH 6.71\nO 53.29", M: "180.16" }, expect: ["CH2O", "C6H12O6"], note: "Contoh: senyawa dengan C 40%, H 6.71%, dan O 53.29%, serta massa molar 180.16 g/mol." },
  invalid: { values: { data: "C 40\nXx 60", M: "" } },
  related: ["molar-mass", "stoichiometry", "equation-balancer", "periodic-table"]
};

const ORDER = (els) => {
  const hasC = els.includes("C");
  return [...els].sort((a, b) => {
    if (hasC) {
      const r = (x) => (x === "C" ? 0 : x === "H" ? 1 : 2);
      if (r(a) !== r(b)) return r(a) - r(b);
    }
    return a.localeCompare(b);
  });
};

const write = (counts) => ORDER(Object.keys(counts)).map((el) => `${el}${counts[el] === 1 ? "" : counts[el]}`).join("");

export function solve(input) {
  const lines = str(input, "data", "Unsur").split(/\r?\n|[;؛,،]/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Za-z]{1,2})\s*[:=]?\s*(\S+?)\s*%?$/);
    if (!m) fail(`Baris ${i + 1} tidak dapat dipahami. Tulis seperti: C 40`, "data");
    const sym = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (!BY_SYMBOL[sym]) fail(`«${m[1]}» bukan lambang unsur yang dikenal.`, "data");
    if (items.some((x) => x.sym === sym)) fail(`Unsur ${sym} diulang.`, "data");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`Nilai ${sym} harus berupa angka positif.`, "data");
    items.push({ sym, v });
  });
  if (items.length < 2) fail("Masukkan minimal dua unsur.", "data");
  for (const it of items) it.n = it.v / BY_SYMBOL[it.sym].mass;
  const min = Math.min(...items.map((x) => x.n));
  for (const it of items) it.r = it.n / min;
  let mult = 0, best = null;
  for (let k = 1; k <= 12; k++) {
    const err = Math.max(...items.map((x) => Math.abs(x.r * k - Math.round(x.r * k)) / Math.max(1, Math.round(x.r * k))));
    if (err < 0.04) { mult = k; break; }
    if (!best || err < best.err) best = { k, err };
  }
  const warn = !mult;
  if (!mult) mult = best.k;
  const counts = Object.fromEntries(items.map((x) => [x.sym, Math.round(x.r * mult)]));
  const emp = write(counts), Me = molarMass(counts);
  const total = items.reduce((a, x) => a + x.v, 0);
  const steps = [
    Math.abs(total - 100) < 1.5 ? "Jumlahnya mendekati 100, sehingga nilai diperlakukan sebagai persen dan kita anggap sampel bermassa 100 g." : `Kita perlakukan nilai sebagai massa dalam gram (jumlahnya ${fmt(total, 5)} g).`,
    { text: "Kita ubah setiap massa menjadi mol dengan membaginya dengan massa atom:", tex: `\\begin{aligned}${items.map((x) => `\\text{${x.sym}}:&\\ \\frac{${ntex(x.v)}}{${ntex(BY_SYMBOL[x.sym].mass)}} = ${ntex(x.n, 5)}`).join("\\\\")}\\end{aligned}` },
    `Kita bagi dengan jumlah mol terkecil (${fmt(min, 5)}): ${items.map((x) => `${x.sym} = ${fmt(x.r, 4)}`).join("، ")}.`,
    mult > 1 ? `Perbandingan bukan bilangan bulat, sehingga kita kalikan dengan ${mult}: ${items.map((x) => `${x.sym} = ${fmt(x.r * mult, 4)}`).join("، ")}, lalu dibulatkan.` : "Perbandingan mendekati bilangan bulat, sehingga kita bulatkan.",
    { text: "Rumus empiris (menurut urutan Hill) dan massanya:", tex: `\\mathrm{${emp.replace(/(\d+)/g, "_{$1}")}},\\quad M_e = ${ntex(Me, 6)}\\ \\text{g/mol}` }
  ];
  const results = [{ label: "Rumus empiris", value: emp }, { label: "Massa rumus empiris", value: `${fmt(Me, 6)} g/mol` }];
  let copy = `Rumus empiris: ${emp}`;
  const blocks = [{ type: "table", caption: "Perhitungan perbandingan paling sederhana", head: ["Unsur", "Nilai", "Mol", "÷ terkecil", `× ${mult}`, "Angka"], rows: items.map((x) => [x.sym, fmt(x.v, 5), fmt(x.n, 5), fmt(x.r, 4), fmt(x.r * mult, 4), String(counts[x.sym])]) }];
  if (warn) blocks.push({ type: "note", tone: "warn", text: "Perbandingan tidak mendekati bilangan bulat dengan jelas; periksa ketelitian data. Kita pilih pembulatan yang paling mungkin." });
  if (!isBlank(input.M)) {
    const M = num(input, "M", "massa molar", { positive: true });
    const kk = M / Me, k = Math.round(kk);
    if (k < 1 || Math.abs(kk - k) > 0.1) fail(`Massa molar ${fmt(M)} bukan kelipatan bulat dari massa rumus empiris (${fmt(Me, 5)}). Perbandingan: ${fmt(kk, 4)}.`, "M");
    const mol = Object.fromEntries(Object.entries(counts).map(([el, n]) => [el, n * k]));
    const mf = write(mol);
    steps.push({ text: "Rumus molekul:", tex: `k = \\frac{${ntex(M)}}{${ntex(Me, 6)}} = ${ntex(kk, 4)} \\approx ${k} \\Rightarrow \\mathrm{${mf.replace(/(\d+)/g, "_{$1}")}}` });
    results.push({ label: "Rumus molekul", value: mf });
    copy += ` | Rumus molekul: ${mf}`;
  }
  return { results, steps, copy, blocks };
}
