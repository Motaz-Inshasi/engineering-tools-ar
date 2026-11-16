import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { mean, quantile, tInv } from "./dist.js";

export const meta = {
  description: "Enter a data set and get all its descriptive measures: mean, median, mode, variance, standard deviation, quartiles, outliers, skewness and the confidence interval for the mean, along with a histogram.",
  keywords: ["Descriptive statistics", "Arithmetic mean", "Mean", "Median", "Mode", "Standard deviation", "Variance", "Quartiles", "IQR", "Outliers", "descriptive statistics", "mean", "median", "standard deviation", "Histogram"],
  formulas: [
    { label: "Mean and sample standard deviation", tex: "\\bar x = \\frac{1}{n}\\sum x_i,\\qquad s = \\sqrt{\\frac{\\sum (x_i - \\bar x)^2}{n-1}}" },
    { label: "Confidence interval for the mean", tex: "\\bar x \\pm t_{\\alpha/2,\\,n-1}\\,\\frac{s}{\\sqrt n}" }
  ],
  inputs: [
    { id: "data", label: "Data", type: "textarea", default: "12 15 11 18 15 20 14 15 16 13 22 9", wide: true, help: "Separate the values with spaces, commas or new lines." },
    { id: "conf", label: "Confidence level", unit: "%", type: "number", default: "95" }
  ],
  example: { values: { data: "2 4 4 4 5 5 7 9", conf: "95" }, expect: ["x̄ = 5", "s = 2.138", "Median = 4.5"], note: "Example: eight well-known values from statistics textbooks." },
  invalid: { values: { data: "5", conf: "95" } },
  related: ["probability-distributions", "hypothesis-tests", "linear-regression", "significant-figures"]
};

export function solve(input) {
  const x = numList(input, "data", "Data", { min: 2, max: 100000 });
  const conf = num(input, "conf", "Confidence level", { min: 50, below: 100 });
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
    { label: "Number of values n", value: String(n) },
    { label: "Arithmetic mean", value: f(m), text: `x̄ = ${f(m)}` },
    { label: "Median", value: f(med), text: `Median = ${f(med)}` },
    { label: "Mode", value: modes.length ? modes.map(f).join("، ") : "None (each value occurs once)" },
    { label: "Sample standard deviation s", value: f(sd), text: `s = ${fmt(sd, 4)}` },
    { label: "Sample variance s²", value: f(vs) },
    { label: "Population standard deviation σ", value: f(sdp) },
    { label: "Smallest / largest value", value: `${f(s[0])} / ${f(s[n - 1])}` },
    { label: "Range", value: f(s[n - 1] - s[0]) },
    { label: "First quartile Q1 / third quartile Q3", value: `${f(q1)} / ${f(q3)}` },
    { label: "Interquartile range IQR", value: f(iqr) },
    { label: "Sum", value: f(sum) },
    { label: "Standard error of the mean", value: f(se) },
    { label: `${fmt(conf)}% confidence interval for the mean`, value: `[${f(m - tc * se)} ، ${f(m + tc * se)}]` },
    { label: "Coefficient of variation CV", value: m !== 0 ? `${fmt((100 * sd) / Math.abs(m), 4)}%` : "Undefined (mean is zero)" },
    { label: "Skewness", value: isFinite(skew) ? fmt(skew, 4) : "Undefined" },
    { label: "Excess kurtosis", value: isFinite(kurt) ? fmt(kurt, 4) : "Undefined" },
    { label: "Outliers (1.5×IQR rule)", value: out.length ? out.map(f).join("، ") : "None" }
  ];
  const steps = [
    { text: "Arithmetic mean:", tex: `\\bar x = \\frac{${ntex(sum, 8)}}{${n}} = ${ntex(m, 6)}` },
    `Sort the data in ascending order: ${s.length <= 40 ? s.map(f).join("، ") : s.slice(0, 40).map(f).join("، ") + " …"}.`,
    n % 2 ? `The number of values is odd, so the median is value number ${(n + 1) / 2}: ${f(med)}.` : `The number of values is even, so the median is the average of values ${n / 2} and ${n / 2 + 1}: ${f(med)}.`,
    { text: "Sum of squared deviations and sample standard deviation:", tex: `\\sum (x_i - \\bar x)^2 = ${ntex(ss, 6)},\\quad s = \\sqrt{\\frac{${ntex(ss, 6)}}{${n - 1}}} = ${ntex(sd, 6)}` },
    "Quartiles are computed by linear interpolation (the Excel method and R's default).",
    { text: `Confidence interval (${fmt(conf)}%) using the t distribution with ${n - 1} degrees of freedom:`, tex: `${ntex(m, 6)} \\pm ${ntex(tc, 5)} \\times \\frac{${ntex(sd, 5)}}{\\sqrt{${n}}} = ${ntex(m, 6)} \\pm ${ntex(tc * se, 5)}` }
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
    blocks.push({ type: "plot", title: `Histogram (${k} classes)`, xLabel: "Value", yLabel: "Frequency", includeZero: true, series: [{ name: "Frequency", points: pts }], vlines: [{ x: m }] });
    blocks.push({ type: "table", caption: "Frequency distribution table", head: ["Class", "Frequency", "Relative frequency"], rows: counts.map((c, i) => [`${fmt(s[0] + i * w, 4)} – ${fmt(s[0] + (i + 1) * w, 4)}`, String(c), `${fmt((100 * c) / n, 3)}%`]) });
  } else blocks.push({ type: "note", text: "All values are equal, so the spread is zero." });
  return { results, steps, blocks, copy: `n = ${n}, x̄ = ${f(m)}, median = ${f(med)}, s = ${fmt(sd, 4)}, σ = ${fmt(sdp, 4)}, Q1 = ${f(q1)}, Q3 = ${f(q3)}` };
}
