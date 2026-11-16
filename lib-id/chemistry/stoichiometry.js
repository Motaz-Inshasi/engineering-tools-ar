import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { balance, equationText, equationTex, molarMass, cleanFormula, formulaHtmlText, formulaTex, FormulaError } from "./formula.js";

export const meta = {
  description: "Perhitungan reaksi kimia: persamaan diseimbangkan secara otomatis, lalu jumlah pereaksi diubah menjadi mol, ditentukan pereaksi pembatas dan pereaksi berlebih, serta dihitung hasil teoretis dan persen hasil.",
  keywords: ["Perhitungan kimia", "stoikiometri", "stoichiometry", "pereaksi pembatas", "limiting reagent", "hasil teoretis", "persen hasil", "percent yield", "pereaksi berlebih"],
  formulas: [
    { label: "Pereaksi pembatas: rasio terkecil", tex: "\\min_j \\frac{n_j}{a_j}" },
    { label: "Hasil teoretis dan persen hasil", tex: "n_P = \\frac{b_P}{a_L}\\, n_L,\\qquad \\%\\,\\text{yield} = \\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times 100" }
  ],
  inputs: [
    { id: "equation", label: "Persamaan (diseimbangkan otomatis)", type: "text", default: "N2 + H2 -> NH3", wide: true },
    { id: "amounts", label: "Jumlah pereaksi yang diketahui", type: "textarea", default: "N2 = 28 g\nH2 = 10 g", wide: true, help: "Satu baris untuk setiap zat: rumus = nilai diikuti g atau mol, misalnya Fe = 10 g atau O2 = 0.5 mol. Masukkan minimal satu pereaksi." },
    { id: "product", label: "Produk yang diinginkan", type: "text", default: "", help: "Biarkan kosong untuk menggunakan produk pertama dalam persamaan." },
    { id: "actual", label: "Hasil aktual (opsional)", unit: "g", type: "number", default: "" }
  ],
  example: { values: { equation: "Fe + O2 -> Fe2O3", amounts: "Fe = 11.17 g\nO2 = 6 g", product: "Fe2O3", actual: "12" }, expect: ["Pereaksi pembatas: Fe", "m = 15.97 g", "75.14%"], note: "Contoh: pembakaran 11.17 g besi dengan 6 g oksigen, dan kita benar-benar memperoleh 12 g." },
  invalid: { values: { equation: "H2 + O2 -> H2O", amounts: "H2O = 5 g", product: "", actual: "" } },
  related: ["equation-balancer", "molar-mass", "solutions", "empirical-formula"]
};

const key = (s) => cleanFormula(s).replace(/[·•*.]/g, "·");

export function solve(input) {
  const raw = str(input, "equation", "Persamaan");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const masses = b.parsed.map(molarMass);
  const idx = new Map(b.species.map((s, i) => [key(s), i]));
  const lines = str(input, "amounts", "Jumlah pereaksi").split(/\r?\n|[;؛]/).map((l) => l.trim()).filter(Boolean);
  const given = new Map();
  lines.forEach((line, li) => {
    const m = line.match(/^(.+?)\s*[=:]\s*(.+?)\s*(g|mol|غ|غرام|مول)?\s*$/i);
    if (!m) fail(`Baris ${li + 1} tidak dapat dipahami. Tulis seperti: Fe = 10 g`, "amounts");
    const i = idx.get(key(m[1]));
    if (i === undefined) fail(`Zat «${m[1]}» pada baris ${li + 1} tidak ada dalam persamaan.`, "amounts");
    if (i >= nL) fail(`«${m[1]}» adalah produk, bukan pereaksi. Masukkan jumlah pereaksi saja.`, "amounts");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`Jumlah pada baris ${li + 1} harus berupa angka positif.`, "amounts");
    const unit = (m[3] || "g").toLowerCase();
    const mol = unit === "mol" || unit === "mol" ? v : v / masses[i];
    given.set(i, mol);
  });
  if (!given.size) fail("Masukkan jumlah minimal satu pereaksi.", "amounts");
  let target = nL;
  if (!isBlank(input.product)) {
    const t = idx.get(key(input.product));
    if (t === undefined || t < nL) fail("Produk yang diinginkan harus salah satu produk dalam persamaan.", "product");
    target = t;
  }
  const ratios = [...given].map(([i, n]) => [i, n / b.coef[i]]);
  const [Li, ext] = ratios.reduce((a, r) => (r[1] < a[1] ? r : a));
  const nT = ext * b.coef[target], mT = nT * masses[target];
  const name = (i) => formulaHtmlText(b.species[i]);
  const steps = [
    { text: "Kita seimbangkan persamaan terlebih dahulu:", tex: equationTex(b) },
    { text: "Kita ubah jumlah menjadi mol, lalu bagi dengan koefisien:", tex: `\\begin{aligned}${ratios.map(([i, r]) => `\\mathrm{${formulaTex(b.species[i])}}:&\\ n = ${ntex(given.get(i), 5)}\\ \\text{mol},\\quad \\tfrac{n}{${b.coef[i]}} = ${ntex(r, 5)}`).join("\\\\")}\\end{aligned}` },
    given.size > 1 ? `Rasio terkecil menjadi milik ${name(Li)}, sehingga ia adalah pereaksi pembatas, dan sisanya berlebih.` : `Hanya satu pereaksi yang dimasukkan (${name(Li)}), sehingga kita anggap ia pereaksi pembatas dan zat lain tersedia dalam jumlah banyak.`,
    { text: `Hasil teoretis dari ${name(target)}:`, tex: `n = \\frac{${b.coef[target]}}{${b.coef[Li]}} \\times ${ntex(given.get(Li), 5)} = ${ntex(nT, 5)}\\ \\text{mol},\\quad m = nM = ${ntex(nT, 5)} \\times ${ntex(masses[target], 6)} = ${ntex(mT, 5)}\\ \\text{g}` }
  ];
  const rows = b.species.map((sp, i) => {
    const used = ext * b.coef[i];
    const left = i < nL && given.has(i) ? given.get(i) - used : null;
    return [name(i), String(b.coef[i]), fmt(masses[i], 6), i < nL ? (given.has(i) ? fmt(given.get(i), 5) : "—") : "—", `${fmt(used, 5)} mol = ${fmt(used * masses[i], 5)} g`, left === null ? "—" : `${fmt(Math.max(left, 0), 4)} mol = ${fmt(Math.max(left, 0) * masses[i], 4)} g`];
  });
  const results = [
    { label: "Persamaan seimbang", value: equationText(b) },
    { label: "pereaksi pembatas", value: name(Li), text: `Pereaksi pembatas: ${name(Li)}` },
    { label: `Hasil teoretis dari ${name(target)}`, value: `${fmt(mT, 4)} g (${fmt(nT, 4)} mol)`, text: `m = ${fmt(mT, 4)} g` }
  ];
  let copy = `${equationText(b)} | Pereaksi pembatas: ${name(Li)} | ${name(target)}: m = ${fmt(mT, 4)} g`;
  if (!isBlank(input.actual)) {
    const a = num(input, "actual", "Hasil aktual", { positive: true });
    const pct = (100 * a) / mT;
    steps.push({ text: "Persen hasil:", tex: `\\frac{${ntex(a)}}{${ntex(mT, 5)}} \\times 100 = ${ntex(pct, 4)}\\%` });
    results.push({ label: "persen hasil", value: `${fmt(pct, 4)}%` });
    copy += ` | ${fmt(pct, 4)}%`;
    if (pct > 100) steps.push("Persen di atas 100% biasanya berarti produk belum kering atau belum murni, atau terdapat kesalahan pengukuran.");
  }
  return { results, steps, copy, blocks: [{ type: "table", caption: "Tabel kuantitatif (apa yang bereaksi atau dihasilkan saat pereaksi pembatas habis)", head: ["Zat", "Koefisien", "M (g/mol)", "Diberikan (mol)", "Pereaksi/produk", "Sisa"], rows }] };
}
