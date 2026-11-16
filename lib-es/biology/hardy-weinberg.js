import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHI_CRIT = 3.841;

export const meta = {
  description: "Aplique el equilibrio de Hardy-Weinberg para calcular las frecuencias de alelos y genotipos a partir de la frecuencia del carácter recesivo, o pruebe con chi-cuadrado si los números observados de individuos coinciden con el equilibrio.",
  keywords: ["Hardy-Weinberg", "Hardy-Weinberg", "Frecuencia alélica", "Portadores", "Herencia", "Chi-cuadrado", "chi-square", "Genética de poblaciones"],
  formulas: [
    { label: "Ecuación de equilibrio", tex: "p^2 + 2pq + q^2 = 1,\\qquad p + q = 1" },
    { label: "Prueba de chi-cuadrado (gl = 1)", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "mode", label: "Método de cálculo", type: "select", default: "recessive", options: [["recessive", "A partir de la frecuencia del carácter recesivo"], ["counts", "A partir de los números observados de individuos"]] },
    { id: "pheno", label: "Frecuencia del carácter recesivo (aa)", type: "number", default: "0.04", when: { mode: ["recessive"] }, help: "Los individuos afectados por el carácter recesivo son solo los de genotipo aa." },
    { id: "phenoUnit", label: "Unidad de la frecuencia", type: "select", default: "fraction", options: [["fraction", "Fracción (de 0 a 1)"], ["percent", "Porcentaje (%)"]], when: { mode: ["recessive"] } },
    { id: "nAA", label: "Número de individuos AA", type: "number", default: "36", when: { mode: ["counts"] } },
    { id: "nAa", label: "Número de individuos Aa", type: "number", default: "48", when: { mode: ["counts"] } },
    { id: "naa", label: "Número de individuos aa", type: "number", default: "16", when: { mode: ["counts"] } }
  ],
  example: { values: { mode: "counts", pheno: "0.04", phenoUnit: "fraction", nAA: "36", nAa: "48", naa: "16" }, expect: ["p = 0.6", "χ² = 0"], note: "Ejemplo: 36 individuos AA, 48 Aa y 16 aa coinciden exactamente con el equilibrio." },
  invalid: { values: { mode: "recessive", pheno: "1.5", phenoUnit: "fraction", nAA: "0", nAa: "0", naa: "0" } },
  related: ["punnett-square", "dna-tools"]
};

function fromPheno(input) {
  const unit = choice(input, "phenoUnit", "Unidad de la frecuencia", ["fraction", "percent"], "fraction");
  const raw = num(input, "pheno", "Frecuencia del carácter recesivo", { nonNegative: true });
  const max = unit === "percent" ? 100 : 1;
  if (raw > max) fail(`La frecuencia del carácter recesivo no debe superar ${max}${unit === "percent" ? "٪" : ""}.`, "pheno");
  const qq = unit === "percent" ? raw / 100 : raw;
  const q = Math.sqrt(qq);
  const p = 1 - q;
  const pp = p * p;
  const twopq = 2 * p * q;
  const carriers = twopq * 1000;
  return {
    results: [
      { label: "Frecuencia del alelo recesivo q", value: fmt(q, 4) },
      { label: "Frecuencia del alelo dominante p", value: fmt(p, 4) },
      { label: "Genotipo AA (p²)", value: `${fmt(pp, 4)} ≈ ${fmt(pp * 1000, 4)} de cada 1000` },
      { label: "Genotipo Aa (2pq)", value: `${fmt(twopq, 4)} ≈ ${fmt(carriers, 4)} de cada 1000` },
      { label: "Genotipo aa (q²)", value: `${fmt(qq, 4)} ≈ ${fmt(qq * 1000, 4)} de cada 1000` },
      { label: "Número de portadores por cada 1000 individuos", value: fmt(carriers, 4) }
    ],
    steps: [
      { text: "La frecuencia del genotipo recesivo aa es q²:", tex: `q^2 = ${ntex(qq)}` },
      { text: "Tomamos la raíz cuadrada para hallar q:", tex: `q = \\sqrt{${ntex(qq)}} = ${ntex(q, 6)}` },
      { text: "A partir de la relación p + q = 1:", tex: `p = 1 - q = ${ntex(p, 6)}` },
      { text: "Frecuencia de los portadores Aa:", tex: `2pq = 2 \\times ${ntex(p, 6)} \\times ${ntex(q, 6)} = ${ntex(twopq, 6)}` }
    ],
    copy: `q = ${fmt(q, 4)}, p = ${fmt(p, 4)}, portadores por cada 1000 = ${fmt(carriers, 4)}`,
    blocks: [
      { type: "table", caption: "Genotipos esperados", head: ["Genotipo", "Frecuencia esperada", "por cada 1000 individuos"], rows: [["AA (dominante)", fmt(pp, 4), fmt(pp * 1000, 4)], ["Aa (portador)", fmt(twopq, 4), fmt(carriers, 4)], ["aa (recesivo)", fmt(qq, 4), fmt(qq * 1000, 4)]], ltr: true },
      { type: "note", text: "El equilibrio supone: población grande, apareamiento al azar, y ausencia de mutación, migración y selección natural." }
    ]
  };
}

function fromCounts(input) {
  const AA = num(input, "nAA", "Número de individuos AA", { integer: true, nonNegative: true });
  const Aa = num(input, "nAa", "Número de individuos Aa", { integer: true, nonNegative: true });
  const aa = num(input, "naa", "Número de individuos aa", { integer: true, nonNegative: true });
  const N = AA + Aa + aa;
  if (N === 0) fail("La suma de individuos debe ser mayor que cero.", "nAA");
  const p = (2 * AA + Aa) / (2 * N);
  const q = 1 - p;
  const O = [AA, Aa, aa];
  const E = [p * p * N, 2 * p * q * N, q * q * N];
  let chi = 0;
  for (let i = 0; i < 3; i++) if (E[i] > 0) chi += ((O[i] - E[i]) ** 2) / E[i];
  if (chi < 1e-12) chi = 0;
  const significant = chi >= CHI_CRIT;
  const verdict = significant
    ? "Existe una desviación significativa del equilibrio de Hardy-Weinberg al nivel 0.05."
    : "No existe una desviación significativa del equilibrio de Hardy-Weinberg al nivel 0.05.";
  const blocks = [{
    type: "table",
    caption: "Observado frente a esperado",
    head: ["Genotipo", "Observado O", "Esperado E", "(O − E)² / E"],
    rows: [
      ["AA", String(AA), fmt(E[0], 4), fmt(E[0] > 0 ? ((AA - E[0]) ** 2) / E[0] : 0, 4)],
      ["Aa", String(Aa), fmt(E[1], 4), fmt(E[1] > 0 ? ((Aa - E[1]) ** 2) / E[1] : 0, 4)],
      ["aa", String(aa), fmt(E[2], 4), fmt(E[2] > 0 ? ((aa - E[2]) ** 2) / E[2] : 0, 4)]
    ],
    ltr: true
  }];
  if (E.some((e) => e < 5)) blocks.push({ type: "note", tone: "warn", text: "Algunas frecuencias esperadas son menores que 5, por lo que la prueba χ² podría no ser precisa." });
  return {
    results: [
      { label: "Número de individuos N", value: String(N) },
      { label: "Frecuencia del alelo A (p)", value: fmt(p, 4) },
      { label: "Frecuencia del alelo a (q)", value: fmt(q, 4) },
      { label: "Frecuencias esperadas AA / Aa / aa", value: `${fmt(E[0], 4)} / ${fmt(E[1], 4)} / ${fmt(E[2], 4)}` },
      { label: "Valor de χ²", value: fmt(chi, 4) },
      { label: "Conclusión estadística", value: significant ? "Desviación significativa" : "No hay desviación significativa" , text: verdict }
    ],
    steps: [
      { text: "Frecuencia del alelo A a partir de los alelos observados:", tex: `p = \\frac{2 \\times ${AA} + ${Aa}}{2 \\times ${N}} = ${ntex(p, 6)}` },
      { text: "Frecuencia del alelo a:", tex: `q = 1 - p = ${ntex(q, 6)}` },
      { text: "Frecuencias esperadas en el equilibrio:", tex: `E_{AA} = p^2 N,\\; E_{Aa} = 2pqN,\\; E_{aa} = q^2 N = ${fmt(E[0], 4)},\\ ${fmt(E[1], 4)},\\ ${fmt(E[2], 4)}` },
      { text: "Valor de chi-cuadrado (gl = 1):", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(chi, 6)}` },
      `Conclusión: si χ² es mayor o igual que ${CHI_CRIT} (valor crítico para 0.05 y 1 grado de libertad), se rechaza el equilibrio.`
    ],
    copy: `p = ${fmt(p, 4)}، q = ${fmt(q, 4)}، χ² = ${fmt(chi, 4)} (df = 1) — ${significant ? "Desviación significativa" : "Compatible con el equilibrio"}`,
    blocks
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Método de cálculo", ["recessive", "counts"], "recessive");
  return mode === "counts" ? fromCounts(input) : fromPheno(input);
}
