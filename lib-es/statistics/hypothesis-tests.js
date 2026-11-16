import { fail, choice, numList, matrixInput, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { normCdf, normInv, tCdf, tInv, chi2Cdf, chi2Inv, mean, variance, pText } from "./dist.js";

export const meta = {
  description: "Realiza pruebas de hipótesis comunes: z y t para una muestra, dos muestras y muestras pareadas, proporciones, y chi-cuadrado de bondad de ajuste e independencia, con estadístico, valor p, valor crítico, decisión e intervalo de confianza.",
  keywords: ["Prueba de hipótesis", "Prueba t", "Prueba z", "Valor p", "p-value", "Chi-cuadrado", "chi-square", "Hipótesis nula", "Nivel de significación", "t-test", "Dos muestras", "Muestras pareadas", "Proporción"],
  formulas: [
    { label: "Estadístico t para una muestra", tex: "t = \\frac{\\bar x - \\mu_0}{s/\\sqrt n},\\quad df = n - 1" },
    { label: "Prueba t de Welch para dos muestras", tex: "t = \\frac{\\bar x_1 - \\bar x_2}{\\sqrt{s_1^2/n_1 + s_2^2/n_2}}" },
    { label: "Chi-cuadrado", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "test", label: "Tipo de prueba", type: "select", default: "t1", options: [["z1", "z para una muestra (σ conocida)"], ["t1", "t para una muestra"], ["t2", "t para dos muestras independientes"], ["paired", "t para muestras pareadas (antes y después)"], ["prop1", "Una proporción"], ["prop2", "Comparación de dos proporciones"], ["gof", "Chi-cuadrado: bondad de ajuste"], ["indep", "Chi-cuadrado: independencia"]] },
    { id: "xbar", label: "Media x̄", type: "number", default: "52.3", when: { test: ["z1", "t1", "t2"] } },
    { id: "sd", label: "Desviación estándar muestral s", type: "number", default: "6.1", when: { test: ["t1", "t2"] } },
    { id: "sigma", label: "Desviación estándar poblacional σ", type: "number", default: "6", when: { test: ["z1"] } },
    { id: "n", label: "Tamaño de la muestra n", type: "number", default: "25", when: { test: ["z1", "t1", "t2", "prop1", "prop2"] } },
    { id: "xbar2", label: "Media de la segunda muestra", type: "number", default: "48.9", when: { test: ["t2"] } },
    { id: "sd2", label: "Desviación estándar de la segunda muestra", type: "number", default: "7.4", when: { test: ["t2"] } },
    { id: "n2", label: "Tamaño de la segunda muestra", type: "number", default: "30", when: { test: ["t2", "prop2"] } },
    { id: "pooled", label: "Suponer varianzas iguales (t agrupada)", type: "checkbox", default: "", when: { test: ["t2"] } },
    { id: "mu0", label: "Valor hipotético μ₀ (o diferencia)", type: "number", default: "50", when: { test: ["z1", "t1", "t2", "paired"] } },
    { id: "d1", label: "Primeras mediciones (antes)", type: "textarea", default: "72 68 75 80 66 71 77 69", when: { test: ["paired"] } },
    { id: "d2", label: "Segundas mediciones (después)", type: "textarea", default: "75 70 74 85 70 75 80 70", when: { test: ["paired"] } },
    { id: "x", label: "Número de éxitos x", type: "number", default: "58", when: { test: ["prop1", "prop2"] } },
    { id: "x2", label: "Número de éxitos en la segunda muestra", type: "number", default: "45", when: { test: ["prop2"] } },
    { id: "p0", label: "Proporción hipotética p₀", type: "number", default: "0.5", when: { test: ["prop1"] } },
    { id: "obs", label: "Frecuencias observadas", type: "textarea", default: "18 22 20 25 15", when: { test: ["gof"] } },
    { id: "exp", label: "Frecuencias o proporciones esperadas (opcional)", type: "textarea", default: "", when: { test: ["gof"] }, help: "Déjalo vacío para suponer igualdad. Puedes introducir proporciones como 0.25 0.5 0.25 o frecuencias." },
    { id: "table", label: "Tabla de contingencia (una fila por línea)", type: "textarea", default: "20 30\n25 25\n15 35", when: { test: ["indep"] } },
    { id: "alt", label: "Hipótesis alternativa", type: "select", default: "two", options: [["two", "≠ (bilateral)"], ["greater", "> (cola derecha)"], ["less", "< (cola izquierda)"]], when: { test: ["z1", "t1", "t2", "paired", "prop1", "prop2"] } },
    { id: "alpha", label: "Nivel de significación α", type: "number", default: "0.05" }
  ],
  example: { values: { test: "t1", xbar: "52.3", sd: "6.1", n: "25", mu0: "50", alt: "two", alpha: "0.05" }, expect: ["t = 1.885", "p = 0.07156", "No rechazamos H₀"], note: "Ejemplo: una muestra de 25 estudiantes con una media de 52.3 y una desviación de 6.1. ¿Difiere la media de 50?" },
  invalid: { values: { test: "t1", xbar: "52", sd: "6", n: "1", mu0: "50", alt: "two", alpha: "0.05" } },
  related: ["descriptive-stats", "probability-distributions", "linear-regression"]
};

const ALT = { two: "\\neq", greater: ">", less: "<" };

function pval(stat, cdf, alt) {
  if (alt === "greater") return 1 - cdf(stat);
  if (alt === "less") return cdf(stat);
  return 2 * Math.min(cdf(stat), 1 - cdf(stat));
}

function crit(inv, alpha, alt) {
  if (alt === "greater") return `${fmt(inv(1 - alpha), 5)}`;
  if (alt === "less") return `${fmt(inv(alpha), 5)}`;
  return `±${fmt(inv(1 - alpha / 2), 5)}`;
}

export function solve(input) {
  const test = choice(input, "test", "Tipo de prueba", ["z1", "t1", "t2", "paired", "prop1", "prop2", "gof", "indep"], "t1");
  const alt = choice(input, "alt", "Hipótesis alternativa", ["two", "greater", "less"], "two");
  const alpha = num(input, "alpha", "Nivel de significación", { min: 1e-6, max: 0.5 });
  const steps = [], results = [], blocks = [];
  let stat, p, symbol, critText, ci = null, h0, h1, df = null;
  const zDist = { cdf: normCdf, inv: normInv };
  const tDist = (k) => ({ cdf: (x) => tCdf(x, k), inv: (q) => tInv(q, k) });
  const confText = `${fmt(100 * (1 - alpha))}%`;
  if (test === "z1" || test === "t1") {
    const xb = num(input, "xbar", "Media");
    const n = num(input, "n", "Tamaño de la muestra", { integer: true, min: 2 });
    const s = test === "z1" ? num(input, "sigma", "σ", { positive: true }) : num(input, "sd", "Desviación estándar", { positive: true });
    const mu0 = num(input, "mu0", "Valor hipotético");
    const se = s / Math.sqrt(n);
    stat = (xb - mu0) / se;
    symbol = test === "z1" ? "z" : "t";
    const D = test === "z1" ? zDist : tDist(n - 1);
    if (test === "t1") df = n - 1;
    p = pval(stat, D.cdf, alt);
    critText = crit(D.inv, alpha, alt);
    const q = test === "z1" ? normInv(1 - alpha / 2) : tInv(1 - alpha / 2, n - 1);
    ci = [xb - q * se, xb + q * se];
    h0 = `\\mu = ${ntex(mu0)}`; h1 = `\\mu ${ALT[alt]} ${ntex(mu0)}`;
    steps.push({ text: "Error estándar y estadístico de prueba:", tex: `SE = \\frac{${ntex(s)}}{\\sqrt{${n}}} = ${ntex(se, 5)},\\quad ${symbol} = \\frac{${ntex(xb)} - ${ntex(mu0)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "t2") {
    const x1 = num(input, "xbar", "Primera media"), s1 = num(input, "sd", "Primera desviación estándar", { positive: true }), n1 = num(input, "n", "Tamaño de la primera muestra", { integer: true, min: 2 });
    const x2 = num(input, "xbar2", "Segunda media"), s2 = num(input, "sd2", "Segunda desviación estándar", { positive: true }), n2 = num(input, "n2", "Tamaño de la segunda muestra", { integer: true, min: 2 });
    const d0 = isBlank(input.mu0) ? 0 : num(input, "mu0", "Diferencia hipotética");
    const pooled = !isBlank(input.pooled) && input.pooled !== "0";
    let se;
    if (pooled) {
      const sp2 = ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2);
      se = Math.sqrt(sp2 * (1 / n1 + 1 / n2)); df = n1 + n2 - 2;
      steps.push({ text: "Varianza agrupada:", tex: `s_p^2 = \\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2} = ${ntex(sp2, 5)},\\quad SE = ${ntex(se, 5)},\\ df = ${df}` });
    } else {
      const a = (s1 * s1) / n1, b = (s2 * s2) / n2;
      se = Math.sqrt(a + b); df = (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1));
      steps.push({ text: "Prueba de Welch (no supone varianzas iguales):", tex: `SE = \\sqrt{\\frac{${ntex(s1)}^2}{${n1}} + \\frac{${ntex(s2)}^2}{${n2}}} = ${ntex(se, 5)},\\quad df \\approx ${ntex(df, 5)}` });
    }
    stat = (x1 - x2 - d0) / se; symbol = "t";
    const D = tDist(df);
    p = pval(stat, D.cdf, alt); critText = crit(D.inv, alpha, alt);
    const q = tInv(1 - alpha / 2, df);
    ci = [x1 - x2 - q * se, x1 - x2 + q * se];
    h0 = `\\mu_1 - \\mu_2 = ${ntex(d0)}`; h1 = `\\mu_1 - \\mu_2 ${ALT[alt]} ${ntex(d0)}`;
    steps.push({ text: "Estadístico de prueba:", tex: `t = \\frac{(${ntex(x1)} - ${ntex(x2)}) - ${ntex(d0)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "paired") {
    const a = numList(input, "d1", "Primeras mediciones", { min: 2 }), b = numList(input, "d2", "Segundas mediciones", { min: 2 });
    if (a.length !== b.length) fail(`El número de mediciones debe ser igual en ambas listas (${a.length} frente a ${b.length}).`, "d2");
    const d = b.map((v, i) => v - a[i]), n = d.length;
    const md = mean(d), sd = Math.sqrt(variance(d));
    if (sd === 0) fail("Todas las diferencias son iguales, así que la desviación estándar de las diferencias es cero y no se puede realizar la prueba.", "d2");
    const d0 = isBlank(input.mu0) ? 0 : num(input, "mu0", "Diferencia hipotética");
    const se = sd / Math.sqrt(n);
    stat = (md - d0) / se; symbol = "t"; df = n - 1;
    const D = tDist(df);
    p = pval(stat, D.cdf, alt); critText = crit(D.inv, alpha, alt);
    const q = tInv(1 - alpha / 2, df);
    ci = [md - q * se, md + q * se];
    h0 = `\\mu_d = ${ntex(d0)}`; h1 = `\\mu_d ${ALT[alt]} ${ntex(d0)}`;
    steps.push(`Calculamos las diferencias d = después − antes: ${d.slice(0, 30).map((v) => fmt(v)).join("، ")}.`);
    steps.push({ text: "Media de las diferencias, su desviación estándar y el estadístico de prueba:", tex: `\\bar d = ${ntex(md, 5)},\\ s_d = ${ntex(sd, 5)},\\quad t = \\frac{${ntex(md, 5)} - ${ntex(d0)}}{${ntex(sd, 5)}/\\sqrt{${n}}} = ${ntex(stat, 5)}` });
  } else if (test === "prop1") {
    const n = num(input, "n", "Tamaño de la muestra", { integer: true, min: 1 }), x = num(input, "x", "Número de éxitos", { integer: true, nonNegative: true });
    if (x > n) fail("El número de éxitos no puede superar el tamaño de la muestra.", "x");
    const p0 = num(input, "p0", "Proporción hipotética", { min: 0, max: 1 });
    if (p0 <= 0 || p0 >= 1) fail("La proporción hipotética debe estar entre 0 y 1, sin incluir los extremos.", "p0");
    const ph = x / n, se = Math.sqrt((p0 * (1 - p0)) / n);
    stat = (ph - p0) / se; symbol = "z";
    p = pval(stat, normCdf, alt); critText = crit(normInv, alpha, alt);
    const sep = Math.sqrt((ph * (1 - ph)) / n);
    ci = [ph - normInv(1 - alpha / 2) * sep, ph + normInv(1 - alpha / 2) * sep];
    h0 = `p = ${ntex(p0)}`; h1 = `p ${ALT[alt]} ${ntex(p0)}`;
    steps.push({ text: "Proporción muestral y estadístico z:", tex: `\\hat p = \\frac{${x}}{${n}} = ${ntex(ph, 5)},\\quad z = \\frac{${ntex(ph, 5)} - ${ntex(p0)}}{\\sqrt{${ntex(p0)}(1-${ntex(p0)})/${n}}} = ${ntex(stat, 5)}` });
    if (n * p0 < 10 || n * (1 - p0) < 10) blocks.push({ type: "note", tone: "warn", text: "No se cumple la condición de aproximación normal (np₀ ≥ 10 y n(1−p₀) ≥ 10), así que el resultado es aproximado." });
  } else if (test === "prop2") {
    const n1 = num(input, "n", "Tamaño de la primera muestra", { integer: true, min: 1 }), x1 = num(input, "x", "Primeros éxitos", { integer: true, nonNegative: true });
    const n2 = num(input, "n2", "Tamaño de la segunda muestra", { integer: true, min: 1 }), x2 = num(input, "x2", "Segundos éxitos", { integer: true, nonNegative: true });
    if (x1 > n1) fail("El número de éxitos no puede superar el tamaño de la muestra.", "x");
    if (x2 > n2) fail("El número de éxitos no puede superar el tamaño de la muestra.", "x2");
    const p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2);
    if (pp === 0 || pp === 1) fail("La proporción agrupada es 0 o 1, así que no se puede realizar la prueba.", "x");
    const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
    stat = (p1 - p2) / se; symbol = "z";
    p = pval(stat, normCdf, alt); critText = crit(normInv, alpha, alt);
    const seu = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
    ci = [p1 - p2 - normInv(1 - alpha / 2) * seu, p1 - p2 + normInv(1 - alpha / 2) * seu];
    h0 = "p_1 = p_2"; h1 = `p_1 ${ALT[alt]} p_2`;
    steps.push({ text: "Las dos proporciones, la proporción agrupada y el estadístico z:", tex: `\\hat p_1 = ${ntex(p1, 5)},\\ \\hat p_2 = ${ntex(p2, 5)},\\ \\hat p = ${ntex(pp, 5)},\\quad z = \\frac{${ntex(p1 - p2, 5)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "gof") {
    const O = numList(input, "obs", "Frecuencias observadas", { min: 2 });
    if (O.some((v) => v < 0)) fail("Las frecuencias no pueden ser negativas.", "obs");
    const N = O.reduce((a, b) => a + b, 0);
    if (N <= 0) fail("La suma de las frecuencias debe ser mayor que cero.", "obs");
    let E;
    if (isBlank(input.exp)) E = O.map(() => N / O.length);
    else {
      const e = numList(input, "exp", "Valores esperados", { positive: true });
      if (e.length !== O.length) fail(`El número de valores esperados (${e.length}) debe ser igual al número de clases (${O.length}).`, "exp");
      const se = e.reduce((a, b) => a + b, 0);
      E = e.map((v) => (v / se) * N);
    }
    stat = O.reduce((a, o, i) => a + (o - E[i]) ** 2 / E[i], 0); symbol = "\\chi^2"; df = O.length - 1;
    p = 1 - chi2Cdf(stat, df); critText = fmt(chi2Inv(1 - alpha, df), 5);
    h0 = "\\text{Los datos siguen la distribución esperada}"; h1 = "\\text{No la siguen}";
    steps.push({ text: "Calculamos la contribución de cada clase y las sumamos:", tex: `\\chi^2 = ${O.slice(0, 8).map((o, i) => `\\frac{(${ntex(o)} - ${ntex(E[i], 4)})^2}{${ntex(E[i], 4)}}`).join(" + ")}${O.length > 8 ? " + \\cdots" : ""} = ${ntex(stat, 5)}` });
    blocks.push({ type: "table", caption: "Observado frente a esperado", head: ["Clase", "O", "E", "(O−E)²/E"], rows: O.map((o, i) => [String(i + 1), fmt(o), fmt(E[i], 5), fmt((o - E[i]) ** 2 / E[i], 4)]) });
    if (E.some((v) => v < 5)) blocks.push({ type: "note", tone: "warn", text: "Algunas frecuencias esperadas son menores que 5, así que la aproximación chi-cuadrado puede no ser precisa." });
  } else {
    const T = matrixInput(input, "table", "Tabla de contingencia");
    if (T.length < 2 || T[0].length < 2) fail("La tabla necesita al menos dos filas y dos columnas.", "table");
    if (T.flat().some((v) => v < 0)) fail("Las frecuencias no pueden ser negativas.", "table");
    const R = T.map((r) => r.reduce((a, b) => a + b, 0)), C = T[0].map((_, j) => T.reduce((a, r) => a + r[j], 0));
    const N = R.reduce((a, b) => a + b, 0);
    if (R.some((v) => v === 0) || C.some((v) => v === 0)) fail("Hay una fila o columna cuyo total es cero.", "table");
    const E = T.map((r, i) => r.map((_, j) => (R[i] * C[j]) / N));
    stat = T.reduce((a, r, i) => a + r.reduce((b, o, j) => b + (o - E[i][j]) ** 2 / E[i][j], 0), 0);
    symbol = "\\chi^2"; df = (T.length - 1) * (T[0].length - 1);
    p = 1 - chi2Cdf(stat, df); critText = fmt(chi2Inv(1 - alpha, df), 5);
    h0 = "\\text{Las variables son independientes}"; h1 = "\\text{Existe asociación}";
    steps.push({ text: "Frecuencia esperada por celda = (total de su fila × total de su columna) ÷ total general:", tex: `E_{11} = \\frac{${R[0]} \\times ${C[0]}}{${N}} = ${ntex(E[0][0], 5)},\\ \\ldots` });
    steps.push({ text: "Estadístico de prueba y grados de libertad:", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(stat, 5)},\\quad df = (${T.length}-1)(${T[0].length}-1) = ${df}` });
    blocks.push({ type: "table", caption: "Observado (esperado)", head: ["", ...C.map((_, j) => `Columna ${j + 1}`), "Total"], rows: [...T.map((r, i) => [`Fila ${i + 1}`, ...r.map((o, j) => `${fmt(o)} (${fmt(E[i][j], 4)})`), fmt(R[i])]), ["Total", ...C.map((c) => fmt(c)), fmt(N)]] });
    const cv = Math.sqrt(stat / (N * (Math.min(T.length, T[0].length) - 1)));
    results.push({ label: "V de Cramér (fuerza de la asociación)", value: fmt(cv, 4) });
  }
  p = Math.min(1, Math.max(0, p));
  const reject = p < alpha;
  const decision = reject ? "Rechazamos H₀" : "No rechazamos H₀";
  const st = symbol === "\\chi^2" ? "χ²" : symbol;
  steps.unshift({ text: "Las hipótesis:", tex: `H_0:\\ ${h0},\\qquad H_1:\\ ${h1}` });
  steps.push({ text: `Valor p${df !== null ? ` (grados de libertad ${fmt(df, 5)})` : ""} y comparación con α:`, tex: `${pText(p).replace("<", "<")} ${reject ? "<" : "\\ge"} \\alpha = ${ntex(alpha)}` });
  steps.push(reject ? `Como el valor p es menor que α, rechazamos la hipótesis nula: hay evidencia estadística suficiente al nivel de significación ${fmt(alpha)}.` : `Como el valor p no es menor que α, no rechazamos la hipótesis nula: no hay evidencia suficiente al nivel de significación ${fmt(alpha)}.`);
  results.unshift(
    { label: "Estadístico de prueba", value: `${st} = ${fmt(stat, 4)}`, text: `${st} = ${fmt(stat, 4)}` },
    { label: "Valor p", value: pText(p) },
    ...(df !== null ? [{ label: "Grados de libertad", value: fmt(df, 5) }] : []),
    { label: `Valor crítico (α = ${fmt(alpha)})`, value: critText },
    { label: "Decisión", value: decision }
  );
  if (ci) results.push({ label: `Intervalo de confianza ${confText}`, value: `[${fmt(ci[0], 5)} ، ${fmt(ci[1], 5)}]` });
  if (alt !== "two" && ci && !["gof", "indep"].includes(test)) blocks.push({ type: "note", text: `El intervalo de confianza mostrado es bilateral (${confText}) a modo ilustrativo.` });
  return { results, steps, blocks, copy: `${st} = ${fmt(stat, 4)}, ${pText(p)}, ${decision} (α = ${fmt(alpha)})` };
}
