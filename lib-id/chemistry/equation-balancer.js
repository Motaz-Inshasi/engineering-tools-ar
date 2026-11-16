import { fail, str } from "../core/validate.js";
import { balance, equationText, equationTex, formulaHtmlText, FormulaError } from "./formula.js";

export const meta = {
  description: "Menyeimbangkan persamaan kimia apa pun secara otomatis dengan mencari koefisien bilangan bulat terkecil yang menjaga jumlah atom setiap unsur, dengan tabel pemeriksaan atom di kedua sisi dan metode penyelesaian aljabar.",
  keywords: ["Penyetaraan persamaan", "penyetaraan persamaan kimia", "balance equation", "koefisien", "kekekalan massa", "reaksi kimia"],
  formulas: [{ label: "Kekekalan atom untuk setiap unsur", tex: "\\sum_{\\text{reactants}} a_j\\, n_{ij} = \\sum_{\\text{products}} b_k\\, n_{ik}" }],
  inputs: [
    { id: "equation", label: "Persamaan", type: "text", default: "C3H8 + O2 -> CO2 + H2O", wide: true, help: "Pisahkan zat dengan +, dan kedua sisi dengan panah -> atau =, misalnya Fe + O2 -> Fe2O3. Koefisien yang sudah ada diabaikan." }
  ],
  example: { values: { equation: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" }, expect: ["2 KMnO4 + 16 HCl → 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2"], note: "Contoh: reaksi kalium permanganat dengan asam klorida." },
  invalid: { values: { equation: "Na + Cl2 -> KCl" } },
  related: ["stoichiometry", "molar-mass", "empirical-formula", "linear-system"]
};

export function solve(input) {
  const raw = str(input, "equation", "Persamaan");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const letters = b.species.map((_, i) => String.fromCharCode(97 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : ""));
  const eqs = b.elements.map((el) => {
    const side = (from, to) => b.species.slice(from, to).map((_, k) => {
      const j = from + k, n = b.parsed[j][el] || 0;
      return n ? `${n === 1 ? "" : n}${letters[j]}` : null;
    }).filter(Boolean).join(" + ");
    return `\\text{${el}}:\\ ${side(0, nL)} = ${side(nL, b.species.length)}`;
  });
  const assign = b.species.map((sp, i) => `${letters[i]} = ${b.coef[i]}`).join(",\\ ");
  const rows = b.elements.map((el) => {
    const l = b.species.slice(0, nL).reduce((a, _, j) => a + (b.parsed[j][el] || 0) * b.coef[j], 0);
    const r = b.species.slice(nL).reduce((a, _, k) => a + (b.parsed[nL + k][el] || 0) * b.coef[nL + k], 0);
    return [el, String(l), String(r), l === r ? "✓" : "✗"];
  });
  const text = equationText(b);
  return {
    results: [{ label: "Persamaan seimbang", value: text, tex: equationTex(b) }],
    steps: [
      `Kita beri koefisien yang belum diketahui di depan setiap zat: ${b.species.map((sp, i) => `${letters[i]} di depan ${formulaHtmlText(sp)}`).join("، ")}.`,
      { text: "Kita tulis persamaan kekekalan atom untuk setiap unsur:", tex: `\\begin{aligned}${eqs.join("\\\\")}\\end{aligned}` },
      { text: "Kita selesaikan sistem linear dan memilih bilangan bulat positif terkecil:", tex: assign },
      { text: "Persamaan seimbang:", tex: equationTex(b) }
    ],
    blocks: [{ type: "table", caption: "Pemeriksaan: jumlah atom di kedua sisi", head: ["Unsur", "Pereaksi", "Produk", ""], rows }],
    copy: text
  };
}
