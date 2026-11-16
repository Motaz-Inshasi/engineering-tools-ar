import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import * as D from "./dist.js";

export const meta = {
  description: "Compute probabilities and critical values for common distributions: normal, t, chi-square, binomial, Poisson, exponential and uniform, with a plot and shading of the required region instead of statistical tables.",
  keywords: ["Normal distribution", "z table", "t distribution", "Chi-square", "Binomial", "Poisson", "Exponential distribution", "normal distribution", "binomial", "poisson", "Critical value", "Probability", "quantile"],
  formulas: [
    { label: "Standard normal distribution", tex: "z = \\frac{x - \\mu}{\\sigma},\\qquad P(X \\le x) = \\Phi(z)" },
    { label: "Binomial and Poisson", tex: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k},\\qquad P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}" }
  ],
  inputs: [
    { id: "dist", label: "Distribution", type: "select", default: "normal", options: [["normal", "Normal"], ["t", "t (Student)"], ["chi2", "Chi-square χ²"], ["binomial", "Binomial"], ["poisson", "Poisson"], ["exponential", "Exponential"], ["uniform", "Uniform"]] },
    { id: "mu", label: "Mean μ", type: "number", default: "0", when: { dist: ["normal"] } },
    { id: "sigma", label: "Standard deviation σ", type: "number", default: "1", when: { dist: ["normal"] } },
    { id: "df", label: "Degrees of freedom", type: "number", default: "10", when: { dist: ["t", "chi2"] } },
    { id: "n", label: "Number of trials n", type: "number", default: "10", when: { dist: ["binomial"] } },
    { id: "p", label: "Probability of success p", type: "number", default: "0.5", when: { dist: ["binomial"] } },
    { id: "lambda", label: "Rate λ", type: "number", default: "3", when: { dist: ["poisson", "exponential"] } },
    { id: "a", label: "Lower bound a", type: "number", default: "0", when: { dist: ["uniform"] } },
    { id: "b", label: "Upper bound b", type: "number", default: "10", when: { dist: ["uniform"] } },
    { id: "query", label: "Required", type: "select", default: "le", options: [["le", "P(X ≤ x)"], ["ge", "P(X ≥ x)"], ["eq", "P(X = x) for a discrete distribution"], ["between", "P(x₁ ≤ X ≤ x₂)"], ["inv", "The value x at which P(X ≤ x) = p"]] },
    { id: "x", label: "Value x (or x₁)", type: "number", default: "1.96", when: { query: ["le", "ge", "eq", "between"] } },
    { id: "x2", label: "Value x₂", type: "number", default: "2", when: { query: ["between"] } },
    { id: "prob", label: "Probability p", type: "number", default: "0.975", when: { query: ["inv"] } }
  ],
  example: { values: { dist: "normal", mu: "100", sigma: "15", query: "between", x: "85", x2: "115" }, expect: ["P = 0.6827"], note: "Example: the percentage of people whose IQ falls between 85 and 115 when μ = 100 and σ = 15." },
  invalid: { values: { dist: "normal", mu: "0", sigma: "-1", query: "le", x: "1" } },
  related: ["descriptive-stats", "hypothesis-tests", "linear-regression", "punnett-square"]
};

function model(input, dist) {
  switch (dist) {
    case "normal": {
      const mu = num(input, "mu", "Mean"), s = num(input, "sigma", "Standard deviation", { positive: true });
      return { disc: false, cdf: (x) => D.normCdf((x - mu) / s), pdf: (x) => D.normPdf((x - mu) / s) / s, inv: (p) => mu + s * D.normInv(p), mean: mu, varc: s * s, range: [mu - 4 * s, mu + 4 * s], tex: `N(${ntex(mu)},\\ ${ntex(s)}^2)`, z: (x) => (x - mu) / s };
    }
    case "t": {
      const k = num(input, "df", "Degrees of freedom", { positive: true, max: 1e6 });
      return { disc: false, cdf: (x) => D.tCdf(x, k), pdf: (x) => D.tPdf(x, k), inv: (p) => D.tInv(p, k), mean: k > 1 ? 0 : NaN, varc: k > 2 ? k / (k - 2) : NaN, range: [-Math.max(4, D.tInv(0.995, k)), Math.max(4, D.tInv(0.995, k))], tex: `t_{${fmt(k)}}` };
    }
    case "chi2": {
      const k = num(input, "df", "Degrees of freedom", { positive: true, max: 1e5 });
      return { disc: false, cdf: (x) => D.chi2Cdf(x, k), pdf: (x) => D.chi2Pdf(x, k), inv: (p) => D.chi2Inv(p, k), mean: k, varc: 2 * k, range: [0, D.chi2Inv(0.999, k)], tex: `\\chi^2_{${fmt(k)}}`, lower: 0 };
    }
    case "binomial": {
      const n = num(input, "n", "Number of trials", { integer: true, min: 1, max: 100000 }), p = num(input, "p", "Probability of success", { min: 0, max: 1 });
      return { disc: true, cdf: (k) => D.binomCdf(Math.floor(k), n, p), pmf: (k) => D.binomPmf(k, n, p), mean: n * p, varc: n * p * (1 - p), lo: 0, hi: n, tex: `B(${n},\\ ${ntex(p)})` };
    }
    case "poisson": {
      const l = num(input, "lambda", "Rate λ", { positive: true, max: 1e6 });
      return { disc: true, cdf: (k) => D.poissonCdf(Math.floor(k), l), pmf: (k) => D.poissonPmf(k, l), mean: l, varc: l, lo: 0, hi: Math.ceil(l + 6 * Math.sqrt(l) + 5), tex: `\\text{Poisson}(${ntex(l)})` };
    }
    case "exponential": {
      const l = num(input, "lambda", "Rate λ", { positive: true });
      return { disc: false, cdf: (x) => (x <= 0 ? 0 : 1 - Math.exp(-l * x)), pdf: (x) => (x < 0 ? 0 : l * Math.exp(-l * x)), inv: (p) => -Math.log(1 - p) / l, mean: 1 / l, varc: 1 / (l * l), range: [0, 7 / l], tex: `\\text{Exp}(${ntex(l)})`, lower: 0 };
    }
    default: {
      const a = num(input, "a", "Lower bound"), b = num(input, "b", "Upper bound");
      if (!(b > a)) fail("The upper bound b must be greater than a.", "b");
      return { disc: false, cdf: (x) => Math.min(1, Math.max(0, (x - a) / (b - a))), pdf: (x) => (x >= a && x <= b ? 1 / (b - a) : 0), inv: (p) => a + p * (b - a), mean: (a + b) / 2, varc: (b - a) ** 2 / 12, range: [a - 0.2 * (b - a), b + 0.2 * (b - a)], tex: `U(${ntex(a)},\\ ${ntex(b)})` };
    }
  }
}

export function solve(input) {
  const dist = choice(input, "dist", "Distribution", ["normal", "t", "chi2", "binomial", "poisson", "exponential", "uniform"], "normal");
  const q = choice(input, "query", "Required", ["le", "ge", "eq", "between", "inv"], "le");
  const M = model(input, dist);
  const steps = [{ text: "Chosen distribution:", tex: `X \\sim ${M.tex}` }];
  let P, label, ans, shade = null, xs = [];
  if (q === "inv") {
    const p = num(input, "prob", "Probability", { min: 0, max: 1 });
    if (p <= 0 || p >= 1) fail("The probability must be between 0 and 1, exclusive.", "prob");
    if (M.disc) {
      let k = M.lo;
      while (k < (M.hi + 1e7) && M.cdf(k) < p - 1e-12) k++;
      ans = k;
      steps.push(`In a discrete distribution we look for the smallest k satisfying P(X ≤ k) ≥ ${fmt(p)}: k = ${k}, where P(X ≤ ${k}) = ${fmt(M.cdf(k), 6)}.`);
    } else {
      ans = M.inv(p);
      steps.push({ text: "Invert the cumulative distribution function:", tex: `x = F^{-1}(${ntex(p)}) = ${ntex(ans, 6)}` });
      if (M.z) steps.push({ text: "That is:", tex: `z = ${ntex(D.normInv(p), 6)},\\quad x = \\mu + z\\sigma = ${ntex(ans, 6)}` });
    }
    P = p; label = `x = ${fmt(ans, 6)}`; xs = [ans]; shade = [-Infinity, ans];
  } else {
    const x = num(input, "x", "Value x");
    if (M.disc && q === "eq" && !Number.isInteger(x)) fail("In a discrete distribution, x must be an integer.", "x");
    if (q === "eq" && !M.disc) fail("P(X = x) is always zero in a continuous distribution. Choose P(X ≤ x) or an interval.", "query");
    if (q === "le") {
      P = M.cdf(x); label = `P(X ≤ ${fmt(x)})`; shade = [-Infinity, x];
    } else if (q === "ge") {
      P = M.disc ? 1 - M.cdf(Math.ceil(x) - 1) : 1 - M.cdf(x); label = `P(X ≥ ${fmt(x)})`; shade = [x, Infinity];
      steps.push(M.disc ? `P(X ≥ ${fmt(x)}) = 1 − P(X ≤ ${Math.ceil(x) - 1}).` : `P(X ≥ x) = 1 − P(X ≤ x) because the distribution is continuous.`);
    } else if (q === "eq") {
      P = M.pmf(x); label = `P(X = ${x})`; shade = [x, x];
    } else {
      const x2 = num(input, "x2", "Value x₂");
      if (!(x2 >= x)) fail("x₂ must be greater than or equal to x₁.", "x2");
      P = M.disc ? M.cdf(Math.floor(x2)) - M.cdf(Math.ceil(x) - 1) : M.cdf(x2) - M.cdf(x);
      label = `P(${fmt(x)} ≤ X ≤ ${fmt(x2)})`; shade = [x, x2]; xs = [x, x2];
      steps.push(M.disc ? `Subtract: P(X ≤ ${Math.floor(x2)}) − P(X ≤ ${Math.ceil(x) - 1}).` : "Subtract: F(x₂) − F(x₁).");
    }
    if (!xs.length) xs = [x];
    if (M.z) steps.push({ text: "Convert to the standard score z:", tex: xs.map((v) => `z = \\frac{${ntex(v)} - \\mu}{\\sigma} = ${ntex(M.z(v), 5)}`).join(",\\quad ") });
    if (dist === "binomial" && q === "eq") steps.push({ text: "From the binomial formula:", tex: `P(X = ${x}) = ${ntex(P, 6)}` });
    steps.push({ text: "The required probability:", tex: `${label.replace(/≤/g, "\\le ").replace(/≥/g, "\\ge ")} = ${ntex(P, 6)}` });
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
      blocks.push({ type: "plot", title: "Probability mass function", xLabel: "k", yLabel: "P(X = k)", includeZero: true, series: [{ name: "P(X = k)", points: all, marker: "o", line: true }, { name: "Required region", points: sel, marker: "x" }] });
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
    blocks.push({ type: "plot", title: "Probability density function", xLabel: "x", yLabel: "f(x)", includeZero: true, series: [{ name: "f(x)", points: pts }, ...(sel.length ? [{ name: "Required region", points: sel }] : [])], vlines: xs.filter((v) => v > a && v < b).map((x) => ({ x })) });
  }
  const results = [
    q === "inv" ? { label: `Critical value at P(X ≤ x) = ${fmt(P)}`, value: fmt(ans, 6), text: `x = ${fmt(ans, 6)}` } : { label, value: fmt(P, 6), text: `P = ${fmt(P, 4)}` },
    { label: "Mean E[X]", value: isFinite(M.mean) ? fmt(M.mean, 6) : "Undefined" },
    { label: "Variance Var(X)", value: isFinite(M.varc) ? fmt(M.varc, 6) : "Undefined" }
  ];
  if (q !== "inv") results.splice(1, 0, { label: "As a percentile", value: `${fmt(100 * P, 5)}%` });
  return { results, steps, blocks, copy: q === "inv" ? `x = ${fmt(ans, 6)}` : `${label}: P = ${fmt(P, 4)}` };
}
