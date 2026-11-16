import { fail, str } from "../core/validate.js";
import { balance, equationText, equationTex, formulaHtmlText, FormulaError } from "./formula.js";

export const meta = {
  description: "Herhangi bir kimyasal denklemi, her elementin atom sayısını koruyan en küçük tam katsayıları bularak otomatik denkleştirin; iki taraftaki atomların kontrol tablosu ve cebirsel çözüm yöntemiyle.",
  keywords: ["denklem denkleştirme", "kimyasal denklemi denkleştirme", "balance equation", "katsayılar", "kütlenin korunumu", "kimyasal tepkime"],
  formulas: [{ label: "Her element için atomların korunumu", tex: "\\sum_{\\text{reactants}} a_j\\, n_{ij} = \\sum_{\\text{products}} b_k\\, n_{ik}" }],
  inputs: [
    { id: "equation", label: "Denklem", type: "text", default: "C3H8 + O2 -> CO2 + H2O", wide: true, help: "Maddeleri + ile ayırın, iki tarafı ok -> veya = ile birleştirin, örn. Fe + O2 -> Fe2O3. Girilen katsayılar yok sayılır." }
  ],
  example: { values: { equation: "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2" }, expect: ["2 KMnO4 + 16 HCl → 2 KCl + 2 MnCl2 + 8 H2O + 5 Cl2"], note: "Örnek: potasyum permanganatın hidroklorik asitle tepkimesi." },
  invalid: { values: { equation: "Na + Cl2 -> KCl" } },
  related: ["stoichiometry", "molar-mass", "empirical-formula", "linear-system"]
};

export function solve(input) {
  const raw = str(input, "equation", "Denklem");
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
    results: [{ label: "Denkleştirilmiş denklem", value: text, tex: equationTex(b) }],
    steps: [
      `Her madde için bilinmeyen bir katsayı koyalım: ${b.species.map((sp, i) => `${letters[i]} önünde ${formulaHtmlText(sp)}`).join("، ")}.`,
      { text: "Her element için atom korunumu denklemini yazalım:", tex: `\\begin{aligned}${eqs.join("\\\\")}\\end{aligned}` },
      { text: "Doğrusal sistemi çözer ve en küçük pozitif tam sayıları seçeriz:", tex: assign },
      { text: "Denkleştirilmiş denklem:", tex: equationTex(b) }
    ],
    blocks: [{ type: "table", caption: "Doğrulama: iki taraftaki atom sayıları", head: ["Element", "Girenler", "Ürünler", ""], rows }],
    copy: text
  };
}
