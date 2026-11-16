import { fail, str, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { tCdf, tInv, pFormat, pText } from "./dist.js";

export const meta = {
  description: "Find the least-squares line of best fit for data (x, y), with the correlation coefficient r, the coefficient of determination R², a test of the slope's significance and prediction, plus exponential, power and logarithmic models, and a plot.",
  keywords: ["Linear regression", "Least squares", "Correlation coefficient", "Pearson", "R²", "linear regression", "least squares", "correlation", "Line of best fit", "trendline", "Exponential regression"],
  formulas: [
    { label: "Slope and intercept", tex: "b = \\frac{S_{xy}}{S_{xx}},\\quad a = \\bar y - b\\bar x,\\qquad S_{xy} = \\sum (x_i-\\bar x)(y_i-\\bar y)" },
    { label: "Correlation coefficient", tex: "r = \\frac{S_{xy}}{\\sqrt{S_{xx} S_{yy}}},\\qquad t = \\frac{b}{SE_b},\\ \\ df = n - 2" }
  ],
  inputs: [
    { id: "data", label: "Data pairs (x y)", type: "textarea", default: "1 2.1\n2 3.9\n3 6.2\n4 7.8\n5 10.1\n6 12.2", wide: true, help: "One line per point: x then y, separated by a space or a comma." },
    { id: "model", label: "Model", type: "select", default: "linear", options: [["linear", "Linear y = a + bx"], ["exponential", "Exponential y = a·e^(bx)"], ["power", "Power y = a·x^b"], ["logarithmic", "Logarithmic y = a + b·ln x"]] },
    { id: "x0", label: "Prediction at x (optional)", type: "number", default: "" }
  ],
  example: { values: { data: "1 2\n2 4\n3 5\n4 4\n5 5", model: "linear", x0: "6" }, expect: ["y = 2.2 + 0.6x", "r = 0.7746"], note: "Example from statistics textbooks: five points, and we predict y at x = 6." },
  invalid: { values: { data: "1 2\n1 3\n1 4", model: "linear", x0: "" } },
  related: ["descriptive-stats", "hypothesis-tests", "probability-distributions", "function-plotter"]
};

const sig = (v) => fmt(v, 4);

export function solve(input) {
  const model = choice(input, "model", "Model", ["linear", "exponential", "power", "logarithmic"], "linear");
  const lines = str(input, "data", "Data").split(/\r?\n|;|؛/).map((l) => l.trim()).filter(Boolean);
  const X = [], Y = [];
  lines.forEach((l, i) => {
    const p = l.split(/[\s,،\t]+/).filter(Boolean);
    if (p.length !== 2) fail(`Line ${i + 1} must contain two values: x and y.`, "data");
    const x = parseNumber(p[0]), y = parseNumber(p[1]);
    if (!isFinite(x) || !isFinite(y)) fail(`Line ${i + 1} contains a non-numeric value.`, "data");
    X.push(x); Y.push(y);
  });
  const n = X.length;
  if (n < 3) fail("Enter at least three points.", "data");
  if ((model === "power" || model === "logarithmic") && X.some((x) => x <= 0)) fail("This model needs positive x values (to take the logarithm).", "data");
  if ((model === "exponential" || model === "power") && Y.some((y) => y <= 0)) fail("This model needs positive y values (to take the logarithm).", "data");
  const u = X.map((x) => (model === "power" || model === "logarithmic" ? Math.log(x) : x));
  const v = Y.map((y) => (model === "exponential" || model === "power" ? Math.log(y) : y));
  const mu = u.reduce((a, b) => a + b, 0) / n, mv = v.reduce((a, b) => a + b, 0) / n;
  let Sxx = 0, Syy = 0, Sxy = 0;
  for (let i = 0; i < n; i++) { Sxx += (u[i] - mu) ** 2; Syy += (v[i] - mv) ** 2; Sxy += (u[i] - mu) * (v[i] - mv); }
  if (Sxx === 0) fail("All x values are equal, so no regression line can be found.", "data");
  if (Syy === 0) fail("All y values are equal, so the relationship is a horizontal line and the correlation coefficient is meaningless.", "data");
  const b = Sxy / Sxx, a0 = mv - b * mu;
  const r = Sxy / Math.sqrt(Sxx * Syy);
  const sse = Math.max(0, Syy - b * Sxy);
  const se = n > 2 ? Math.sqrt(sse / (n - 2)) : NaN;
  const seb = se / Math.sqrt(Sxx);
  const tstat = seb > 0 ? b / seb : Infinity;
  const p = seb > 0 ? 2 * (1 - tCdf(Math.abs(tstat), n - 2)) : 0;
  const tc = tInv(0.975, n - 2);
  const a = model === "exponential" || model === "power" ? Math.exp(a0) : a0;
  const f = (x) => {
    if (model === "linear") return a + b * x;
    if (model === "exponential") return a * Math.exp(b * x);
    if (model === "power") return a * Math.pow(x, b);
    return a + b * Math.log(x);
  };
  const sgn = (k) => (k < 0 ? "-" : "+");
  const eqText = {
    linear: `y = ${sig(a)} ${sgn(b)} ${sig(Math.abs(b))}x`,
    exponential: `y = ${sig(a)}·e^(${sig(b)}x)`,
    power: `y = ${sig(a)}·x^${sig(b)}`,
    logarithmic: `y = ${sig(a)} ${sgn(b)} ${sig(Math.abs(b))}·ln x`
  }[model];
  const eqTex = {
    linear: `\\hat y = ${ntex(a, 4)} ${sgn(b)} ${ntex(Math.abs(b), 4)}\\,x`,
    exponential: `\\hat y = ${ntex(a, 4)}\\,e^{${ntex(b, 4)}x}`,
    power: `\\hat y = ${ntex(a, 4)}\\,x^{${ntex(b, 4)}}`,
    logarithmic: `\\hat y = ${ntex(a, 4)} ${sgn(b)} ${ntex(Math.abs(b), 4)}\\ln x`
  }[model];
  const steps = [];
  if (model !== "linear") steps.push({ exponential: "Transform the model to linear form by taking ln y, so that ln y = ln a + bx.", power: "Take the logarithm of both sides: ln y = ln a + b·ln x, then perform a linear regression on (ln x, ln y).", logarithmic: "Replace x with ln x, then perform an ordinary linear regression." }[model]);
  steps.push(
    { text: "Means and sums of squares:", tex: `\\bar u = ${ntex(mu, 6)},\\ \\bar v = ${ntex(mv, 6)},\\ S_{xx} = ${ntex(Sxx, 6)},\\ S_{yy} = ${ntex(Syy, 6)},\\ S_{xy} = ${ntex(Sxy, 6)}` },
    { text: "Slope and intercept:", tex: `b = \\frac{${ntex(Sxy, 6)}}{${ntex(Sxx, 6)}} = ${ntex(b, 6)},\\quad ${model === "exponential" || model === "power" ? `\\ln a = ${ntex(a0, 6)} \\Rightarrow a = ${ntex(a, 6)}` : `a = ${ntex(mv, 6)} - (${ntex(b, 6)})(${ntex(mu, 6)}) = ${ntex(a, 6)}`}` },
    { text: "Regression equation:", tex: eqTex },
    { text: "Correlation coefficient and coefficient of determination:", tex: `r = \\frac{${ntex(Sxy, 6)}}{\\sqrt{${ntex(Sxx, 6)} \\times ${ntex(Syy, 6)}}} = ${ntex(r, 5)},\\quad R^2 = ${ntex(r * r, 5)}` },
    { text: "Test of the slope's significance (H₀: b = 0):", tex: `SE_b = ${ntex(seb, 5)},\\quad t = ${isFinite(tstat) ? ntex(tstat, 5) : "\\infty"},\\quad df = ${n - 2},\\quad p = ${pFormat(p)}` }
  );
  const absr = Math.abs(r);
  const strength = absr >= 0.9 ? "very strong" : absr >= 0.7 ? "strong" : absr >= 0.5 ? "moderate" : absr >= 0.3 ? "weak" : "very weak or none";
  const results = [
    { label: "Regression equation", value: eqText, tex: eqTex },
    { label: "Slope b", value: `${fmt(b, 6)} ± ${fmt(tc * seb, 4)} (95%)` },
    { label: model === "exponential" || model === "power" ? "Coefficient a" : "Intercept a", value: fmt(a, 6) },
    { label: "Correlation coefficient r", value: fmt(r, 4), text: `r = ${fmt(r, 4)}` },
    { label: "Coefficient of determination R²", value: fmt(r * r, 4) },
    { label: "Strength and direction of the relationship", value: `${strength}، ${r > 0 ? "positive" : r < 0 ? "negative" : "no direction"}` },
    { label: "Standard error of the estimate", value: fmt(se, 4) },
    { label: "p-value of the slope", value: `${pFormat(p)} ${p < 0.05 ? "(statistically significant at 0.05)" : "(not significant at 0.05)"}` }
  ];
  let copy = `${eqText}, r = ${fmt(r, 4)}, R² = ${fmt(r * r, 4)}, ${pText(p)}`;
  if (!isBlank(input.x0)) {
    const x0 = num(input, "x0", "Prediction value x");
    if ((model === "power" || model === "logarithmic") && x0 <= 0) fail("Prediction in this model needs a positive x.", "x0");
    const y0 = f(x0);
    results.push({ label: `Prediction at x = ${fmt(x0)}`, value: fmt(y0, 6) });
    steps.push({ text: "Prediction:", tex: `\\hat y(${ntex(x0)}) = ${ntex(y0, 6)}` });
    copy += `, ŷ(${fmt(x0)}) = ${fmt(y0, 6)}`;
    const xmin = Math.min(...X), xmax = Math.max(...X);
    if (x0 < xmin || x0 > xmax) steps.push("Warning: the x value is outside the data range (extrapolation), so the prediction is less reliable.");
  }
  const xmin = Math.min(...X), xmax = Math.max(...X), pad = (xmax - xmin) * 0.05;
  const lo = model === "power" || model === "logarithmic" ? Math.max(xmin - pad, xmin / 2) : xmin - pad;
  const line = Array.from({ length: 201 }, (_, i) => { const x = lo + ((xmax + pad - lo) * i) / 200; return [x, f(x)]; });
  const rows = X.map((x, i) => [fmt(x, 6), fmt(Y[i], 6), fmt(f(x), 6), fmt(Y[i] - f(x), 4)]);
  return {
    results, steps, copy,
    blocks: [
      { type: "plot", title: "Data and regression line", xLabel: "x", yLabel: "y", series: [{ name: "Data", points: X.map((x, i) => [x, Y[i]]), marker: "o" }, { name: eqText, points: line }] },
      { type: "table", caption: "Predicted values and residuals", head: ["x", "y", "ŷ", "Residual y − ŷ"], rows: rows.slice(0, 200) }
    ]
  };
}
