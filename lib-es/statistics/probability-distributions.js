import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import * as D from "./dist.js";

export const meta = {
  description: "Calcula probabilidades y valores críticos de distribuciones comunes: normal, t, chi-cuadrado, binomial, Poisson, exponencial y uniforme, con gráfico y sombreado de la región pedida en lugar de tablas estadísticas.",
  keywords: ["Distribución normal", "Tabla z", "Distribución t", "Chi-cuadrado", "Binomial", "Poisson", "Distribución exponencial", "normal distribution", "binomial", "poisson", "Valor crítico", "Probabilidad", "quantile"],
  formulas: [
    { label: "Distribución normal estándar", tex: "z = \\frac{x - \\mu}{\\sigma},\\qquad P(X \\le x) = \\Phi(z)" },
    { label: "Binomial y Poisson", tex: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k},\\qquad P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}" }
  ],
  inputs: [
    { id: "dist", label: "Distribución", type: "select", default: "normal", options: [["normal", "Normal"], ["t", "t (Student)"], ["chi2", "Chi-cuadrado χ²"], ["binomial", "Binomial"], ["poisson", "Poisson"], ["exponential", "Exponencial"], ["uniform", "Uniforme"]] },
    { id: "mu", label: "Media μ", type: "number", default: "0", when: { dist: ["normal"] } },
    { id: "sigma", label: "Desviación estándar σ", type: "number", default: "1", when: { dist: ["normal"] } },
    { id: "df", label: "Grados de libertad", type: "number", default: "10", when: { dist: ["t", "chi2"] } },
    { id: "n", label: "Número de ensayos n", type: "number", default: "10", when: { dist: ["binomial"] } },
    { id: "p", label: "Probabilidad de éxito p", type: "number", default: "0.5", when: { dist: ["binomial"] } },
    { id: "lambda", label: "Tasa λ", type: "number", default: "3", when: { dist: ["poisson", "exponential"] } },
    { id: "a", label: "Límite inferior a", type: "number", default: "0", when: { dist: ["uniform"] } },
    { id: "b", label: "Límite superior b", type: "number", default: "10", when: { dist: ["uniform"] } },
    { id: "query", label: "Lo que se pide", type: "select", default: "le", options: [["le", "P(X ≤ x)"], ["ge", "P(X ≥ x)"], ["eq", "P(X = x) para una distribución discreta"], ["between", "P(x₁ ≤ X ≤ x₂)"], ["inv", "Valor x en el que P(X ≤ x) = p"]] },
    { id: "x", label: "Valor x (o x₁)", type: "number", default: "1.96", when: { query: ["le", "ge", "eq", "between"] } },
    { id: "x2", label: "Valor x₂", type: "number", default: "2", when: { query: ["between"] } },
    { id: "prob", label: "Probabilidad p", type: "number", default: "0.975", when: { query: ["inv"] } }
  ],
  example: { values: { dist: "normal", mu: "100", sigma: "15", query: "between", x: "85", x2: "115" }, expect: ["P = 0.6827"], note: "Ejemplo: porcentaje de personas cuyo CI está entre 85 y 115 si μ = 100 y σ = 15." },
  invalid: { values: { dist: "normal", mu: "0", sigma: "-1", query: "le", x: "1" } },
  related: ["descriptive-stats", "hypothesis-tests", "linear-regression", "punnett-square"]
};

function model(input, dist) {
  switch (dist) {
    case "normal": {
      const mu = num(input, "mu", "Media"), s = num(input, "sigma", "Desviación estándar", { positive: true });
      return { disc: false, cdf: (x) => D.normCdf((x - mu) / s), pdf: (x) => D.normPdf((x - mu) / s) / s, inv: (p) => mu + s * D.normInv(p), mean: mu, varc: s * s, range: [mu - 4 * s, mu + 4 * s], tex: `N(${ntex(mu)},\\ ${ntex(s)}^2)`, z: (x) => (x - mu) / s };
    }
    case "t": {
      const k = num(input, "df", "Grados de libertad", { positive: true, max: 1e6 });
      return { disc: false, cdf: (x) => D.tCdf(x, k), pdf: (x) => D.tPdf(x, k), inv: (p) => D.tInv(p, k), mean: k > 1 ? 0 : NaN, varc: k > 2 ? k / (k - 2) : NaN, range: [-Math.max(4, D.tInv(0.995, k)), Math.max(4, D.tInv(0.995, k))], tex: `t_{${fmt(k)}}` };
    }
    case "chi2": {
      const k = num(input, "df", "Grados de libertad", { positive: true, max: 1e5 });
      return { disc: false, cdf: (x) => D.chi2Cdf(x, k), pdf: (x) => D.chi2Pdf(x, k), inv: (p) => D.chi2Inv(p, k), mean: k, varc: 2 * k, range: [0, D.chi2Inv(0.999, k)], tex: `\\chi^2_{${fmt(k)}}`, lower: 0 };
    }
    case "binomial": {
      const n = num(input, "n", "Número de ensayos", { integer: true, min: 1, max: 100000 }), p = num(input, "p", "Probabilidad de éxito", { min: 0, max: 1 });
      return { disc: true, cdf: (k) => D.binomCdf(Math.floor(k), n, p), pmf: (k) => D.binomPmf(k, n, p), mean: n * p, varc: n * p * (1 - p), lo: 0, hi: n, tex: `B(${n},\\ ${ntex(p)})` };
    }
    case "poisson": {
      const l = num(input, "lambda", "Tasa λ", { positive: true, max: 1e6 });
      return { disc: true, cdf: (k) => D.poissonCdf(Math.floor(k), l), pmf: (k) => D.poissonPmf(k, l), mean: l, varc: l, lo: 0, hi: Math.ceil(l + 6 * Math.sqrt(l) + 5), tex: `\\text{Poisson}(${ntex(l)})` };
    }
    case "exponential": {
      const l = num(input, "lambda", "Tasa λ", { positive: true });
      return { disc: false, cdf: (x) => (x <= 0 ? 0 : 1 - Math.exp(-l * x)), pdf: (x) => (x < 0 ? 0 : l * Math.exp(-l * x)), inv: (p) => -Math.log(1 - p) / l, mean: 1 / l, varc: 1 / (l * l), range: [0, 7 / l], tex: `\\text{Exp}(${ntex(l)})`, lower: 0 };
    }
    default: {
      const a = num(input, "a", "Límite inferior"), b = num(input, "b", "Límite superior");
      if (!(b > a)) fail("El límite superior b debe ser mayor que a.", "b");
      return { disc: false, cdf: (x) => Math.min(1, Math.max(0, (x - a) / (b - a))), pdf: (x) => (x >= a && x <= b ? 1 / (b - a) : 0), inv: (p) => a + p * (b - a), mean: (a + b) / 2, varc: (b - a) ** 2 / 12, range: [a - 0.2 * (b - a), b + 0.2 * (b - a)], tex: `U(${ntex(a)},\\ ${ntex(b)})` };
    }
  }
}

export function solve(input) {
  const dist = choice(input, "dist", "Distribución", ["normal", "t", "chi2", "binomial", "poisson", "exponential", "uniform"], "normal");
  const q = choice(input, "query", "Lo que se pide", ["le", "ge", "eq", "between", "inv"], "le");
  const M = model(input, dist);
  const steps = [{ text: "Distribución elegida:", tex: `X \\sim ${M.tex}` }];
  let P, label, ans, shade = null, xs = [];
  if (q === "inv") {
    const p = num(input, "prob", "Probabilidad", { min: 0, max: 1 });
    if (p <= 0 || p >= 1) fail("La probabilidad debe estar entre 0 y 1, sin incluir los extremos.", "prob");
    if (M.disc) {
      let k = M.lo;
      while (k < (M.hi + 1e7) && M.cdf(k) < p - 1e-12) k++;
      ans = k;
      steps.push(`En una distribución discreta buscamos el menor k que cumple P(X ≤ k) ≥ ${fmt(p)}: k = ${k}, donde P(X ≤ ${k}) = ${fmt(M.cdf(k), 6)}.`);
    } else {
      ans = M.inv(p);
      steps.push({ text: "Invertimos la función de distribución acumulada:", tex: `x = F^{-1}(${ntex(p)}) = ${ntex(ans, 6)}` });
      if (M.z) steps.push({ text: "Es decir:", tex: `z = ${ntex(D.normInv(p), 6)},\\quad x = \\mu + z\\sigma = ${ntex(ans, 6)}` });
    }
    P = p; label = `x = ${fmt(ans, 6)}`; xs = [ans]; shade = [-Infinity, ans];
  } else {
    const x = num(input, "x", "Valor x");
    if (M.disc && q === "eq" && !Number.isInteger(x)) fail("En una distribución discreta, x debe ser un entero.", "x");
    if (q === "eq" && !M.disc) fail("P(X = x) es siempre cero en una distribución continua. Elige P(X ≤ x) o un intervalo.", "query");
    if (q === "le") {
      P = M.cdf(x); label = `P(X ≤ ${fmt(x)})`; shade = [-Infinity, x];
    } else if (q === "ge") {
      P = M.disc ? 1 - M.cdf(Math.ceil(x) - 1) : 1 - M.cdf(x); label = `P(X ≥ ${fmt(x)})`; shade = [x, Infinity];
      steps.push(M.disc ? `P(X ≥ ${fmt(x)}) = 1 − P(X ≤ ${Math.ceil(x) - 1}).` : `P(X ≥ x) = 1 − P(X ≤ x) porque la distribución es continua.`);
    } else if (q === "eq") {
      P = M.pmf(x); label = `P(X = ${x})`; shade = [x, x];
    } else {
      const x2 = num(input, "x2", "Valor x₂");
      if (!(x2 >= x)) fail("x₂ debe ser mayor o igual que x₁.", "x2");
      P = M.disc ? M.cdf(Math.floor(x2)) - M.cdf(Math.ceil(x) - 1) : M.cdf(x2) - M.cdf(x);
      label = `P(${fmt(x)} ≤ X ≤ ${fmt(x2)})`; shade = [x, x2]; xs = [x, x2];
      steps.push(M.disc ? `Restamos: P(X ≤ ${Math.floor(x2)}) − P(X ≤ ${Math.ceil(x) - 1}).` : "Restamos: F(x₂) − F(x₁).");
    }
    if (!xs.length) xs = [x];
    if (M.z) steps.push({ text: "Convertimos a la puntuación típica z:", tex: xs.map((v) => `z = \\frac{${ntex(v)} - \\mu}{\\sigma} = ${ntex(M.z(v), 5)}`).join(",\\quad ") });
    if (dist === "binomial" && q === "eq") steps.push({ text: "A partir de la fórmula binomial:", tex: `P(X = ${x}) = ${ntex(P, 6)}` });
    steps.push({ text: "La probabilidad pedida:", tex: `${label.replace(/≤/g, "\\le ").replace(/≥/g, "\\ge ")} = ${ntex(P, 6)}` });
  }
  P = Math.min(1, Math.max(0, P));
  const blocks = [];
  if (M.disc) {
    const lo = Math.max(M.lo, Math.floor(M.mean - 5 * Math.sqrt(M.varc) - 2)), hi = Math.min(M.hi, Math.ceil(M.mean + 5 * Math.sqrt(M.varc) + 2));
    if (hi - lo <= 400) {
      const all = [], sel = [];
      for (let k = lo; k <= hi; k++) {
        const v = M.pmf(k);
        all.push([k, v]);
        if (shade && k >= shade[0] - 1e-9 && k <= shade[1] + 1e-9) sel.push([k, v]);
      }
      blocks.push({ type: "plot", title: "Función de masa de probabilidad", xLabel: "k", yLabel: "P(X = k)", includeZero: true, series: [{ name: "P(X = k)", points: all, marker: "o", line: true }, { name: "Región pedida", points: sel, marker: "x" }] });
    }
  } else {
    const [a, b] = M.range, N = 300, pts = [], sel = [];
    for (let i = 0; i <= N; i++) {
      const x = a + ((b - a) * i) / N, y = M.pdf(x);
      pts.push([x, y]);
    }
    if (shade) {
      const s0 = Math.max(a, shade[0]), s1 = Math.min(b, shade[1]);
      if (s1 > s0) {
        sel.push([s0, 0]);
        for (let i = 0; i <= 120; i++) { const x = s0 + ((s1 - s0) * i) / 120; sel.push([x, M.pdf(x)]); }
        sel.push([s1, 0], [s0, 0]);
      }
    }
    blocks.push({ type: "plot", title: "Función de densidad de probabilidad", xLabel: "x", yLabel: "f(x)", includeZero: true, series: [{ name: "f(x)", points: pts }, ...(sel.length ? [{ name: "Región pedida", points: sel }] : [])], vlines: xs.filter((v) => v > a && v < b).map((x) => ({ x })) });
  }
  const results = [
    q === "inv" ? { label: `Valor crítico en P(X ≤ x) = ${fmt(P)}`, value: fmt(ans, 6), text: `x = ${fmt(ans, 6)}` } : { label, value: fmt(P, 6), text: `P = ${fmt(P, 4)}` },
    { label: "Media E[X]", value: isFinite(M.mean) ? fmt(M.mean, 6) : "Indefinido" },
    { label: "Varianza Var(X)", value: isFinite(M.varc) ? fmt(M.varc, 6) : "Indefinido" }
  ];
  if (q !== "inv") results.splice(1, 0, { label: "Como percentil", value: `${fmt(100 * P, 5)}%` });
  return { results, steps, blocks, copy: q === "inv" ? `x = ${fmt(ans, 6)}` : `${label}: P = ${fmt(P, 4)}` };
}
