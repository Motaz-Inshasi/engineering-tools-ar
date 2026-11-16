import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { BY_SYMBOL, molarMass } from "./formula.js";

export const meta = {
  description: "Determina la fórmula empírica (proporción más simple) a partir de los porcentajes en masa o de las masas de los elementos, y luego la fórmula molecular si se conoce la masa molar, con una tabla de división entre el menor número de moles.",
  keywords: ["Fórmula empírica", "Fórmula molecular", "empirical formula", "molecular formula", "análisis elemental", "porcentaje", "proporción más simple"],
  formulas: [
    { label: "Moles de cada elemento y luego la proporción más simple", tex: "n_i = \\frac{m_i}{A_i},\\qquad r_i = \\frac{n_i}{\\min_j n_j}" },
    { label: "Fórmula molecular", tex: "k = \\frac{M_{\\text{molecular}}}{M_{\\text{empirical}}}" }
  ],
  inputs: [
    { id: "data", label: "Elementos y sus porcentajes o masas", type: "textarea", default: "C 40.0\nH 6.71\nO 53.29", wide: true, help: "Una línea por elemento: el símbolo seguido del porcentaje o de la masa en gramos, como C 40 o Na: 2.3" },
    { id: "M", label: "Masa molar del compuesto (opcional)", unit: "g/mol", type: "number", default: "180" }
  ],
  example: { values: { data: "C 40.0\nH 6.71\nO 53.29", M: "180.16" }, expect: ["CH2O", "C6H12O6"], note: "Ejemplo: un compuesto con C 40 %, H 6.71 % y O 53.29 %, y masa molar 180.16 g/mol." },
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
  const lines = str(input, "data", "Elementos").split(/\r?\n|[;؛,،]/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Za-z]{1,2})\s*[:=]?\s*(\S+?)\s*%?$/);
    if (!m) fail(`La línea ${i + 1} no se entiende. Escríbela como: C 40`, "data");
    const sym = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (!BY_SYMBOL[sym]) fail(`«${m[1]}» no es un símbolo de elemento conocido.`, "data");
    if (items.some((x) => x.sym === sym)) fail(`El elemento ${sym} está repetido.`, "data");
    const v = parseNumber(m[2]);
    if (!(v > 0) || !isFinite(v)) fail(`El valor de ${sym} debe ser un número positivo.`, "data");
    items.push({ sym, v });
  });
  if (items.length < 2) fail("Introduce al menos dos elementos.", "data");
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
    Math.abs(total - 100) < 1.5 ? "La suma es cercana a 100, así que tratamos los valores como porcentajes y suponemos una muestra de 100 g de masa." : `Tratamos los valores como masas en gramos (su suma es ${fmt(total, 5)} g).`,
    { text: "Convertimos cada masa en moles dividiendo entre la masa atómica:", tex: `\\begin{aligned}${items.map((x) => `\\text{${x.sym}}:&\\ \\frac{${ntex(x.v)}}{${ntex(BY_SYMBOL[x.sym].mass)}} = ${ntex(x.n, 5)}`).join("\\\\")}\\end{aligned}` },
    `Dividimos entre el menor número de moles (${fmt(min, 5)}): ${items.map((x) => `${x.sym} = ${fmt(x.r, 4)}`).join("، ")}.`,
    mult > 1 ? `Las proporciones no son números enteros, así que las multiplicamos por ${mult}: ${items.map((x) => `${x.sym} = ${fmt(x.r * mult, 4)}`).join("، ")}, y luego redondeamos.` : "Las proporciones son cercanas a números enteros, así que las redondeamos.",
    { text: "La fórmula empírica (en orden de Hill) y su masa:", tex: `\\mathrm{${emp.replace(/(\d+)/g, "_{$1}")}},\\quad M_e = ${ntex(Me, 6)}\\ \\text{g/mol}` }
  ];
  const results = [{ label: "Fórmula empírica", value: emp }, { label: "Masa de la fórmula empírica", value: `${fmt(Me, 6)} g/mol` }];
  let copy = `Fórmula empírica: ${emp}`;
  const blocks = [{ type: "table", caption: "Cálculo de la proporción más simple", head: ["Elemento", "Valor", "Moles", "÷ menor", `× ${mult}`, "Número"], rows: items.map((x) => [x.sym, fmt(x.v, 5), fmt(x.n, 5), fmt(x.r, 4), fmt(x.r * mult, 4), String(counts[x.sym])]) }];
  if (warn) blocks.push({ type: "note", tone: "warn", text: "Las proporciones no se acercan claramente a números enteros; revisa la precisión de los datos. Elegimos el redondeo más cercano posible." });
  if (!isBlank(input.M)) {
    const M = num(input, "M", "masa molar", { positive: true });
    const kk = M / Me, k = Math.round(kk);
    if (k < 1 || Math.abs(kk - k) > 0.1) fail(`La masa molar ${fmt(M)} no es un múltiplo entero de la masa de la fórmula empírica (${fmt(Me, 5)}). Proporción: ${fmt(kk, 4)}.`, "M");
    const mol = Object.fromEntries(Object.entries(counts).map(([el, n]) => [el, n * k]));
    const mf = write(mol);
    steps.push({ text: "Fórmula molecular:", tex: `k = \\frac{${ntex(M)}}{${ntex(Me, 6)}} = ${ntex(kk, 4)} \\approx ${k} \\Rightarrow \\mathrm{${mf.replace(/(\d+)/g, "_{$1}")}}` });
    results.push({ label: "Fórmula molecular", value: mf });
    copy += ` | Fórmula molecular: ${mf}`;
  }
  return { results, steps, copy, blocks };
}
