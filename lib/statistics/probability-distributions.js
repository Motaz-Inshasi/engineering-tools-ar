import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import * as D from "./dist.js";

export const meta = {
  description: "احسب الاحتمالات والقيم الحرجة للتوزيعات الشائعة: الطبيعي و t ومربع كاي وذي الحدين وبواسون والأسي والمنتظم، مع الرسم وتظليل المنطقة المطلوبة بدلاً من الجداول الإحصائية.",
  keywords: ["التوزيع الطبيعي", "جدول z", "توزيع t", "مربع كاي", "ذو الحدين", "بواسون", "التوزيع الأسي", "normal distribution", "binomial", "poisson", "القيمة الحرجة", "احتمال", "quantile"],
  formulas: [
    { label: "التوزيع الطبيعي المعياري", tex: "z = \\frac{x - \\mu}{\\sigma},\\qquad P(X \\le x) = \\Phi(z)" },
    { label: "ذو الحدين وبواسون", tex: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k},\\qquad P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}" }
  ],
  inputs: [
    { id: "dist", label: "التوزيع", type: "select", default: "normal", options: [["normal", "طبيعي"], ["t", "t (ستودنت)"], ["chi2", "مربع كاي χ²"], ["binomial", "ذو الحدين"], ["poisson", "بواسون"], ["exponential", "أسي"], ["uniform", "منتظم"]] },
    { id: "mu", label: "الوسط μ", type: "number", default: "0", when: { dist: ["normal"] } },
    { id: "sigma", label: "الانحراف المعياري σ", type: "number", default: "1", when: { dist: ["normal"] } },
    { id: "df", label: "درجات الحرية", type: "number", default: "10", when: { dist: ["t", "chi2"] } },
    { id: "n", label: "عدد المحاولات n", type: "number", default: "10", when: { dist: ["binomial"] } },
    { id: "p", label: "احتمال النجاح p", type: "number", default: "0.5", when: { dist: ["binomial"] } },
    { id: "lambda", label: "المعدل λ", type: "number", default: "3", when: { dist: ["poisson", "exponential"] } },
    { id: "a", label: "الحد الأدنى a", type: "number", default: "0", when: { dist: ["uniform"] } },
    { id: "b", label: "الحد الأعلى b", type: "number", default: "10", when: { dist: ["uniform"] } },
    { id: "query", label: "المطلوب", type: "select", default: "le", options: [["le", "P(X ≤ x)"], ["ge", "P(X ≥ x)"], ["eq", "P(X = x) للمتقطع"], ["between", "P(x₁ ≤ X ≤ x₂)"], ["inv", "القيمة x التي يكون عندها P(X ≤ x) = p"]] },
    { id: "x", label: "القيمة x (أو x₁)", type: "number", default: "1.96", when: { query: ["le", "ge", "eq", "between"] } },
    { id: "x2", label: "القيمة x₂", type: "number", default: "2", when: { query: ["between"] } },
    { id: "prob", label: "الاحتمال p", type: "number", default: "0.975", when: { query: ["inv"] } }
  ],
  example: { values: { dist: "normal", mu: "100", sigma: "15", query: "between", x: "85", x2: "115" }, expect: ["P = 0.6827"], note: "مثال: نسبة من تقع درجة ذكائهم بين 85 و 115 إذا كان μ = 100 و σ = 15." },
  invalid: { values: { dist: "normal", mu: "0", sigma: "-1", query: "le", x: "1" } },
  related: ["descriptive-stats", "hypothesis-tests", "linear-regression", "punnett-square"]
};

function model(input, dist) {
  switch (dist) {
    case "normal": {
      const mu = num(input, "mu", "الوسط"), s = num(input, "sigma", "الانحراف المعياري", { positive: true });
      return { disc: false, cdf: (x) => D.normCdf((x - mu) / s), pdf: (x) => D.normPdf((x - mu) / s) / s, inv: (p) => mu + s * D.normInv(p), mean: mu, varc: s * s, range: [mu - 4 * s, mu + 4 * s], tex: `N(${ntex(mu)},\\ ${ntex(s)}^2)`, z: (x) => (x - mu) / s };
    }
    case "t": {
      const k = num(input, "df", "درجات الحرية", { positive: true, max: 1e6 });
      return { disc: false, cdf: (x) => D.tCdf(x, k), pdf: (x) => D.tPdf(x, k), inv: (p) => D.tInv(p, k), mean: k > 1 ? 0 : NaN, varc: k > 2 ? k / (k - 2) : NaN, range: [-Math.max(4, D.tInv(0.995, k)), Math.max(4, D.tInv(0.995, k))], tex: `t_{${fmt(k)}}` };
    }
    case "chi2": {
      const k = num(input, "df", "درجات الحرية", { positive: true, max: 1e5 });
      return { disc: false, cdf: (x) => D.chi2Cdf(x, k), pdf: (x) => D.chi2Pdf(x, k), inv: (p) => D.chi2Inv(p, k), mean: k, varc: 2 * k, range: [0, D.chi2Inv(0.999, k)], tex: `\\chi^2_{${fmt(k)}}`, lower: 0 };
    }
    case "binomial": {
      const n = num(input, "n", "عدد المحاولات", { integer: true, min: 1, max: 100000 }), p = num(input, "p", "احتمال النجاح", { min: 0, max: 1 });
      return { disc: true, cdf: (k) => D.binomCdf(Math.floor(k), n, p), pmf: (k) => D.binomPmf(k, n, p), mean: n * p, varc: n * p * (1 - p), lo: 0, hi: n, tex: `B(${n},\\ ${ntex(p)})` };
    }
    case "poisson": {
      const l = num(input, "lambda", "المعدل λ", { positive: true, max: 1e6 });
      return { disc: true, cdf: (k) => D.poissonCdf(Math.floor(k), l), pmf: (k) => D.poissonPmf(k, l), mean: l, varc: l, lo: 0, hi: Math.ceil(l + 6 * Math.sqrt(l) + 5), tex: `\\text{Poisson}(${ntex(l)})` };
    }
    case "exponential": {
      const l = num(input, "lambda", "المعدل λ", { positive: true });
      return { disc: false, cdf: (x) => (x <= 0 ? 0 : 1 - Math.exp(-l * x)), pdf: (x) => (x < 0 ? 0 : l * Math.exp(-l * x)), inv: (p) => -Math.log(1 - p) / l, mean: 1 / l, varc: 1 / (l * l), range: [0, 7 / l], tex: `\\text{Exp}(${ntex(l)})`, lower: 0 };
    }
    default: {
      const a = num(input, "a", "الحد الأدنى"), b = num(input, "b", "الحد الأعلى");
      if (!(b > a)) fail("الحد الأعلى b يجب أن يكون أكبر من a.", "b");
      return { disc: false, cdf: (x) => Math.min(1, Math.max(0, (x - a) / (b - a))), pdf: (x) => (x >= a && x <= b ? 1 / (b - a) : 0), inv: (p) => a + p * (b - a), mean: (a + b) / 2, varc: (b - a) ** 2 / 12, range: [a - 0.2 * (b - a), b + 0.2 * (b - a)], tex: `U(${ntex(a)},\\ ${ntex(b)})` };
    }
  }
}

export function solve(input) {
  const dist = choice(input, "dist", "التوزيع", ["normal", "t", "chi2", "binomial", "poisson", "exponential", "uniform"], "normal");
  const q = choice(input, "query", "المطلوب", ["le", "ge", "eq", "between", "inv"], "le");
  const M = model(input, dist);
  const steps = [{ text: "التوزيع المختار:", tex: `X \\sim ${M.tex}` }];
  let P, label, ans, shade = null, xs = [];
  if (q === "inv") {
    const p = num(input, "prob", "الاحتمال", { min: 0, max: 1 });
    if (p <= 0 || p >= 1) fail("الاحتمال يجب أن يكون بين 0 و 1 (دون الطرفين).", "prob");
    if (M.disc) {
      let k = M.lo;
      while (k < (M.hi + 1e7) && M.cdf(k) < p - 1e-12) k++;
      ans = k;
      steps.push(`في التوزيع المتقطع نبحث عن أصغر k يحقق P(X ≤ k) ≥ ${fmt(p)}: k = ${k}، حيث P(X ≤ ${k}) = ${fmt(M.cdf(k), 6)}.`);
    } else {
      ans = M.inv(p);
      steps.push({ text: "نعكس دالة التوزيع التراكمية:", tex: `x = F^{-1}(${ntex(p)}) = ${ntex(ans, 6)}` });
      if (M.z) steps.push({ text: "أي أن:", tex: `z = ${ntex(D.normInv(p), 6)},\\quad x = \\mu + z\\sigma = ${ntex(ans, 6)}` });
    }
    P = p; label = `x = ${fmt(ans, 6)}`; xs = [ans]; shade = [-Infinity, ans];
  } else {
    const x = num(input, "x", "القيمة x");
    if (M.disc && q === "eq" && !Number.isInteger(x)) fail("في التوزيع المتقطع يجب أن تكون x عدداً صحيحاً.", "x");
    if (q === "eq" && !M.disc) fail("P(X = x) تساوي صفراً دائماً في التوزيع المتصل. اختر P(X ≤ x) أو مجالاً.", "query");
    if (q === "le") {
      P = M.cdf(x); label = `P(X ≤ ${fmt(x)})`; shade = [-Infinity, x];
    } else if (q === "ge") {
      P = M.disc ? 1 - M.cdf(Math.ceil(x) - 1) : 1 - M.cdf(x); label = `P(X ≥ ${fmt(x)})`; shade = [x, Infinity];
      steps.push(M.disc ? `P(X ≥ ${fmt(x)}) = 1 − P(X ≤ ${Math.ceil(x) - 1}).` : `P(X ≥ x) = 1 − P(X ≤ x) لأن التوزيع متصل.`);
    } else if (q === "eq") {
      P = M.pmf(x); label = `P(X = ${x})`; shade = [x, x];
    } else {
      const x2 = num(input, "x2", "القيمة x₂");
      if (!(x2 >= x)) fail("x₂ يجب أن تكون أكبر من أو تساوي x₁.", "x2");
      P = M.disc ? M.cdf(Math.floor(x2)) - M.cdf(Math.ceil(x) - 1) : M.cdf(x2) - M.cdf(x);
      label = `P(${fmt(x)} ≤ X ≤ ${fmt(x2)})`; shade = [x, x2]; xs = [x, x2];
      steps.push(M.disc ? `نطرح: P(X ≤ ${Math.floor(x2)}) − P(X ≤ ${Math.ceil(x) - 1}).` : "نطرح: F(x₂) − F(x₁).");
    }
    if (!xs.length) xs = [x];
    if (M.z) steps.push({ text: "نحوّل إلى القيمة المعيارية z:", tex: xs.map((v) => `z = \\frac{${ntex(v)} - \\mu}{\\sigma} = ${ntex(M.z(v), 5)}`).join(",\\quad ") });
    if (dist === "binomial" && q === "eq") steps.push({ text: "من صيغة ذي الحدين:", tex: `P(X = ${x}) = ${ntex(P, 6)}` });
    steps.push({ text: "الاحتمال المطلوب:", tex: `${label.replace(/≤/g, "\\le ").replace(/≥/g, "\\ge ")} = ${ntex(P, 6)}` });
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
      blocks.push({ type: "plot", title: "دالة الكتلة الاحتمالية", xLabel: "k", yLabel: "P(X = k)", includeZero: true, series: [{ name: "P(X = k)", points: all, marker: "o", line: true }, { name: "المنطقة المطلوبة", points: sel, marker: "x" }] });
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
    blocks.push({ type: "plot", title: "دالة الكثافة الاحتمالية", xLabel: "x", yLabel: "f(x)", includeZero: true, series: [{ name: "f(x)", points: pts }, ...(sel.length ? [{ name: "المنطقة المطلوبة", points: sel }] : [])], vlines: xs.filter((v) => v > a && v < b).map((x) => ({ x })) });
  }
  const results = [
    q === "inv" ? { label: `القيمة الحرجة عند P(X ≤ x) = ${fmt(P)}`, value: fmt(ans, 6), text: `x = ${fmt(ans, 6)}` } : { label, value: fmt(P, 6), text: `P = ${fmt(P, 4)}` },
    { label: "الوسط E[X]", value: isFinite(M.mean) ? fmt(M.mean, 6) : "غير معرّف" },
    { label: "التباين Var(X)", value: isFinite(M.varc) ? fmt(M.varc, 6) : "غير معرّف" }
  ];
  if (q !== "inv") results.splice(1, 0, { label: "بالنسبة المئوية", value: `${fmt(100 * P, 5)}%` });
  return { results, steps, blocks, copy: q === "inv" ? `x = ${fmt(ans, 6)}` : `${label}: P = ${fmt(P, 4)}` };
}
