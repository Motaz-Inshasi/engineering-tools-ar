import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { mean, quantile, tInv } from "./dist.js";

export const meta = {
  description: "Introduce un conjunto de datos y obtén todas sus medidas descriptivas: media, mediana, moda, varianza, desviación estándar, cuartiles, valores atípicos, asimetría e intervalo de confianza para la media, junto con un histograma.",
  keywords: ["Estadística descriptiva", "Media aritmética", "Media", "Mediana", "Moda", "Desviación estándar", "Varianza", "Cuartiles", "IQR", "Valores atípicos", "descriptive statistics", "mean", "median", "standard deviation", "Histograma"],
  formulas: [
    { label: "Media y desviación estándar muestral", tex: "\\bar x = \\frac{1}{n}\\sum x_i,\\qquad s = \\sqrt{\\frac{\\sum (x_i - \\bar x)^2}{n-1}}" },
    { label: "Intervalo de confianza para la media", tex: "\\bar x \\pm t_{\\alpha/2,\\,n-1}\\,\\frac{s}{\\sqrt n}" }
  ],
  inputs: [
    { id: "data", label: "Datos", type: "textarea", default: "12 15 11 18 15 20 14 15 16 13 22 9", wide: true, help: "Separa los valores con espacios, comas o saltos de línea." },
    { id: "conf", label: "Nivel de confianza", unit: "%", type: "number", default: "95" }
  ],
  example: { values: { data: "2 4 4 4 5 5 7 9", conf: "95" }, expect: ["x̄ = 5", "s = 2.138", "Mediana = 4.5"], note: "Ejemplo: ocho valores muy conocidos en los libros de estadística." },
  invalid: { values: { data: "5", conf: "95" } },
  related: ["probability-distributions", "hypothesis-tests", "linear-regression", "significant-figures"]
};

export function solve(input) {
  const x = numList(input, "data", "Datos", { min: 2, max: 100000 });
  const conf = num(input, "conf", "Nivel de confianza", { min: 50, below: 100 });
  const n = x.length, s = [...x].sort((a, b) => a - b);
  const m = mean(x), sum = x.reduce((a, b) => a + b, 0);
  const ss = x.reduce((a, v) => a + (v - m) ** 2, 0);
  const vs = ss / (n - 1), vp = ss / n, sd = Math.sqrt(vs), sdp = Math.sqrt(vp);
  const med = quantile(s, 0.5), q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1;
  const freq = new Map();
  for (const v of x) freq.set(v, (freq.get(v) || 0) + 1);
  const maxF = Math.max(...freq.values());
  const modes = maxF > 1 ? [...freq].filter(([, c]) => c === maxF).map(([v]) => v).sort((a, b) => a - b) : [];
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const out = s.filter((v) => v < lo || v > hi);
  const se = sd / Math.sqrt(n);
  const tc = tInv(1 - (1 - conf / 100) / 2, n - 1);
  const m3 = x.reduce((a, v) => a + (v - m) ** 3, 0) / n, m4 = x.reduce((a, v) => a + (v - m) ** 4, 0) / n;
  const skew = n > 2 && vp > 0 ? (Math.sqrt(n * (n - 1)) / (n - 2)) * (m3 / vp ** 1.5) : NaN;
  const kurt = n > 3 && vp > 0 ? ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * (m4 / (vp * vp) - 3) + 6) : NaN;
  const f = (v) => fmt(v, 6);
  const results = [
    { label: "Número de valores n", value: String(n) },
    { label: "Media aritmética", value: f(m), text: `x̄ = ${f(m)}` },
    { label: "Mediana", value: f(med), text: `Mediana = ${f(med)}` },
    { label: "Moda", value: modes.length ? modes.map(f).join("، ") : "Ninguna (cada valor aparece una vez)" },
    { label: "Desviación estándar muestral s", value: f(sd), text: `s = ${fmt(sd, 4)}` },
    { label: "Varianza muestral s²", value: f(vs) },
    { label: "Desviación estándar poblacional σ", value: f(sdp) },
    { label: "Menor / mayor valor", value: `${f(s[0])} / ${f(s[n - 1])}` },
    { label: "Rango", value: f(s[n - 1] - s[0]) },
    { label: "Primer cuartil Q1 / tercer cuartil Q3", value: `${f(q1)} / ${f(q3)}` },
    { label: "Rango intercuartílico IQR", value: f(iqr) },
    { label: "Suma", value: f(sum) },
    { label: "Error estándar de la media", value: f(se) },
    { label: `Intervalo de confianza del ${fmt(conf)}% para la media`, value: `[${f(m - tc * se)} ، ${f(m + tc * se)}]` },
    { label: "Coeficiente de variación CV", value: m !== 0 ? `${fmt((100 * sd) / Math.abs(m), 4)}%` : "Indefinido (la media es cero)" },
    { label: "Asimetría", value: isFinite(skew) ? fmt(skew, 4) : "Indefinido" },
    { label: "Curtosis en exceso", value: isFinite(kurt) ? fmt(kurt, 4) : "Indefinido" },
    { label: "Valores atípicos (regla 1.5×IQR)", value: out.length ? out.map(f).join("، ") : "Ninguno" }
  ];
  const steps = [
    { text: "Media aritmética:", tex: `\\bar x = \\frac{${ntex(sum, 8)}}{${n}} = ${ntex(m, 6)}` },
    `Ordenamos los datos de menor a mayor: ${s.length <= 40 ? s.map(f).join("، ") : s.slice(0, 40).map(f).join("، ") + " …"}.`,
    n % 2 ? `El número de valores es impar, así que la mediana es el valor número ${(n + 1) / 2}: ${f(med)}.` : `El número de valores es par, así que la mediana es el promedio de los valores ${n / 2} y ${n / 2 + 1}: ${f(med)}.`,
    { text: "Suma de los cuadrados de las desviaciones y desviación estándar muestral:", tex: `\\sum (x_i - \\bar x)^2 = ${ntex(ss, 6)},\\quad s = \\sqrt{\\frac{${ntex(ss, 6)}}{${n - 1}}} = ${ntex(sd, 6)}` },
    "Los cuartiles se calculan por interpolación lineal (método de Excel y valor por defecto de R).",
    { text: `Intervalo de confianza (${fmt(conf)}%) usando la distribución t con ${n - 1} grados de libertad:`, tex: `${ntex(m, 6)} \\pm ${ntex(tc, 5)} \\times \\frac{${ntex(sd, 5)}}{\\sqrt{${n}}} = ${ntex(m, 6)} \\pm ${ntex(tc * se, 5)}` }
  ];
  const blocks = [];
  if (s[n - 1] > s[0]) {
    const k = Math.min(30, Math.max(5, Math.ceil(Math.log2(n) + 1)));
    const w = (s[n - 1] - s[0]) / k;
    const counts = Array(k).fill(0);
    for (const v of s) counts[Math.min(k - 1, Math.floor((v - s[0]) / w))]++;
    const pts = [[s[0], 0]];
    counts.forEach((c, i) => { const a = s[0] + i * w; pts.push([a, c], [a + w, c]); });
    pts.push([s[n - 1], 0]);
    blocks.push({ type: "plot", title: `Histograma (${k} clases)`, xLabel: "Valor", yLabel: "Frecuencia", includeZero: true, series: [{ name: "Frecuencia", points: pts }], vlines: [{ x: m }] });
    blocks.push({ type: "table", caption: "Tabla de distribución de frecuencias", head: ["Clase", "Frecuencia", "Frecuencia relativa"], rows: counts.map((c, i) => [`${fmt(s[0] + i * w, 4)} – ${fmt(s[0] + (i + 1) * w, 4)}`, String(c), `${fmt((100 * c) / n, 3)}%`]) });
  } else blocks.push({ type: "note", text: "Todos los valores son iguales, así que la dispersión es cero." });
  return { results, steps, blocks, copy: `n = ${n}, x̄ = ${f(m)}, mediana = ${f(med)}, s = ${fmt(sd, 4)}, σ = ${fmt(sdp, 4)}, Q1 = ${f(q1)}, Q3 = ${f(q3)}` };
}
