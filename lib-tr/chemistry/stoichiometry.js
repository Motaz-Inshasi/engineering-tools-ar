import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { balance, equationText, equationTex, molarMass, cleanFormula, formulaHtmlText, formulaTex, FormulaError } from "./formula.js";

export const meta = {
  description: "Kimyasal tepkime hesapları: denklemi otomatik denkleştirir, reaktanların miktarlarını mola çevirir, sınırlayıcı maddeyi ve fazla maddeyi belirler, teorik ürünü ve yüzde verimi hesaplar.",
  keywords: ["Kimyasal hesaplamalar", "stokiyometri", "stoichiometry", "sınırlayıcı madde", "limiting reagent", "teorik verim", "verim yüzdesi", "percent yield", "fazla madde"],
  formulas: [
    { label: "Sınırlayıcı madde: en küçük oran", tex: "\\min_j \\frac{n_j}{a_j}" },
    { label: "Teorik ürün ve verim yüzdesi", tex: "n_P = \\frac{b_P}{a_L}\\, n_L,\\qquad \\%\\,\\text{yield} = \\frac{m_{\\text{actual}}}{m_{\\text{theoretical}}}\\times 100" }
  ],
  inputs: [
    { id: "equation", label: "Denklem (otomatik denkleştirilir)", type: "text", default: "N2 + H2 -> NH3", wide: true },
    { id: "amounts", label: "Bilinen reaktan miktarları", type: "textarea", default: "N2 = 28 g\nH2 = 10 g", wide: true, help: "Her madde için bir satır: formül = değer ve ardından g veya mol, örn. Fe = 10 g veya O2 = 0.5 mol. En az bir reaktan girin." },
    { id: "product", label: "İstenen ürün", type: "text", default: "", help: "Boş bırakırsanız denklemdeki ilk ürün kullanılır." },
    { id: "actual", label: "Gerçek verim (isteğe bağlı)", unit: "g", type: "number", default: "" }
  ],
  example: { values: { equation: "Fe + O2 -> Fe2O3", amounts: "Fe = 11.17 g\nO2 = 6 g", product: "Fe2O3", actual: "12" }, expect: ["Sınırlayıcı madde: Fe", "m = 15.97 g", "75.14%"], note: "Örnek: 11.17 g demirin 6 g oksijenle yanması ve gerçekte 12 g elde edilmesi." },
  invalid: { values: { equation: "H2 + O2 -> H2O", amounts: "H2O = 5 g", product: "", actual: "" } },
  related: ["equation-balancer", "molar-mass", "solutions", "empirical-formula"]
};

const key = (s) => cleanFormula(s).replace(/[·•*.]/g, "·");

export function solve(input) {
  const raw = str(input, "equation", "Denklem");
  let b;
  try { b = balance(raw); } catch (e) { if (e instanceof FormulaError) fail(e.message, "equation"); throw e; }
  const nL = b.reactants.length;
  const masses = b.parsed.map(molarMass);
  const idx = new Map(b.species.map((s, i) => [key(s), i]));
  const lines = str(input, "amounts", "Reaktan miktarları").split(/\r?\n|[;؛]/).map((l) => l.trim()).filter(Boolean);
  const given = new Map();
  lines.forEach((line, li) => {
    const m = line.match(/^(.+?)\s*[=:]\s*(.+?)\s*(g|mol|غ|غرام|مول)?\s*$/i);
    if (!m) fail(`${li + 1}. satır anlaşılmadı. Örneğin şöyle yazın: Fe = 10 g`, "amounts");
    const i = idx.get(key(m[1]));
    if (i === undefined) fail(`${li + 1}. satırdaki «${m[1]}» maddesi denklemde yok.`, "amounts");
    if (i >= nL) fail(`«${m[1]}» bir üründür, reaktan değil. Yalnızca reaktanların miktarlarını girin.`, "amounts");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`${li + 1}. satırdaki miktar pozitif bir sayı olmalıdır.`, "amounts");
    const unit = (m[3] || "g").toLowerCase();
    const mol = unit === "mol" || unit === "mol" ? v : v / masses[i];
    given.set(i, mol);
  });
  if (!given.size) fail("En az bir reaktanın miktarını girin.", "amounts");
  let target = nL;
  if (!isBlank(input.product)) {
    const t = idx.get(key(input.product));
    if (t === undefined || t < nL) fail("İstenen ürün denklemin ürünlerinden biri olmalıdır.", "product");
    target = t;
  }
  const ratios = [...given].map(([i, n]) => [i, n / b.coef[i]]);
  const [Li, ext] = ratios.reduce((a, r) => (r[1] < a[1] ? r : a));
  const nT = ext * b.coef[target], mT = nT * masses[target];
  const name = (i) => formulaHtmlText(b.species[i]);
  const steps = [
    { text: "Önce denklemi denkleştiriyoruz:", tex: equationTex(b) },
    { text: "Miktarları mola çevirip katsayıya bölüyoruz:", tex: `\\begin{aligned}${ratios.map(([i, r]) => `\\mathrm{${formulaTex(b.species[i])}}:&\\ n = ${ntex(given.get(i), 5)}\\ \\text{mol},\\quad \\tfrac{n}{${b.coef[i]}} = ${ntex(r, 5)}`).join("\\\\")}\\end{aligned}` },
    given.size > 1 ? `En küçük oran ${name(Li)}'e ait, bu nedenle sınırlayıcı madde odur; diğerleri fazladır.` : `Yalnızca bir reaktan (${name(Li)}) girildi; onu sınırlayıcı madde kabul eder, diğerlerinin bol olduğunu varsayarız.`,
    { text: `${name(target)} için teorik ürün:`, tex: `n = \\frac{${b.coef[target]}}{${b.coef[Li]}} \\times ${ntex(given.get(Li), 5)} = ${ntex(nT, 5)}\\ \\text{mol},\\quad m = nM = ${ntex(nT, 5)} \\times ${ntex(masses[target], 6)} = ${ntex(mT, 5)}\\ \\text{g}` }
  ];
  const rows = b.species.map((sp, i) => {
    const used = ext * b.coef[i];
    const left = i < nL && given.has(i) ? given.get(i) - used : null;
    return [name(i), String(b.coef[i]), fmt(masses[i], 6), i < nL ? (given.has(i) ? fmt(given.get(i), 5) : "—") : "—", `${fmt(used, 5)} mol = ${fmt(used * masses[i], 5)} g`, left === null ? "—" : `${fmt(Math.max(left, 0), 4)} mol = ${fmt(Math.max(left, 0) * masses[i], 4)} g`];
  });
  const results = [
    { label: "Denkleştirilmiş denklem", value: equationText(b) },
    { label: "sınırlayıcı madde", value: name(Li), text: `Sınırlayıcı madde: ${name(Li)}` },
    { label: `${name(target)} için teorik ürün`, value: `${fmt(mT, 4)} g (${fmt(nT, 4)} mol)`, text: `m = ${fmt(mT, 4)} g` }
  ];
  let copy = `${equationText(b)} | sınırlayıcı madde: ${name(Li)} | ${name(target)}: m = ${fmt(mT, 4)} g`;
  if (!isBlank(input.actual)) {
    const a = num(input, "actual", "Gerçek verim", { positive: true });
    const pct = (100 * a) / mT;
    steps.push({ text: "Yüzde verim:", tex: `\\frac{${ntex(a)}}{${ntex(mT, 5)}} \\times 100 = ${ntex(pct, 4)}\\%` });
    results.push({ label: "verim yüzdesi", value: `${fmt(pct, 4)}%` });
    copy += ` | ${fmt(pct, 4)}%`;
    if (pct > 100) steps.push("100%'ün üzerindeki bir oran genellikle ürünün kuru veya saf olmadığını ya da ölçüm hatası olduğunu gösterir.");
  }
  return { results, steps, copy, blocks: [{ type: "table", caption: "Niceliksel tablo (sınırlayıcı madde bitince tepkimeye giren veya oluşan)", head: ["Madde", "Katsayı", "M (g/mol)", "Verilen (mol)", "Reaktan/ürün", "Kalan"], rows }] };
}
