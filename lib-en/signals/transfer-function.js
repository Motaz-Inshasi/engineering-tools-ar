import { readTF, tfTex, tfFactorTex, evalTF, polesZeros } from "./common.js";
import { C, cabs, ctex, cfmt } from "../core/complex.js";
import { fmt, niceTex, tex as ntex } from "../core/format.js";
import { degree } from "../core/polynomial.js";

export const meta = {
  description: "Analyze the transfer function H(s): poles, zeros, DC gain, system type, stability, damping ratio and natural frequency of each complex pole pair, with a pole-zero plot.",
  keywords: ["Transfer function", "transfer function", "poles", "zeros", "poles", "zeros", "stability", "pole-zero plot", "damping ratio"],
  formulas: [
    { label: "Factored form", tex: "H(s) = K\\frac{(s - z_1)(s - z_2)\\cdots}{(s - p_1)(s - p_2)\\cdots}" },
    { label: "Stability and complex pole pair", tex: "\\operatorname{Re}(p_i) < 0\\;\\forall i,\\qquad p = -\\zeta\\omega_n \\pm j\\omega_n\\sqrt{1-\\zeta^2}" }
  ],
  inputs: [
    { id: "G", label: "Transfer function H(s)", type: "expr", default: "10(s + 2)/(s^3 + 4s^2 + 13s)", help: "Write it as a fraction in s, such as (s+1)/(s^2+2s+5). The numerator and denominator can be written in factored form." }
  ],
  example: { values: { G: "(s + 3)/(s^2 + 4s + 13)" }, expect: ["p = -2 ± 3j", "z = -3"], note: "Example: $H(s) = \\frac{s+3}{s^2+4s+13}$ has complex poles $-2 \\pm 3j$." },
  invalid: { values: { G: "s + 1" } },
  related: ["bode-plot", "step-response", "routh-hurwitz", "laplace"]
};

function pairText(list, sym) {
  const out = [];
  const used = new Set();
  list.forEach((p, i) => {
    if (used.has(i)) return;
    used.add(i);
    const m = p.mult > 1 ? ` (×${p.mult})` : "";
    if (p.root.im !== 0) {
      const j = list.findIndex((q, k) => !used.has(k) && Math.abs(q.root.re - p.root.re) < 1e-9 && Math.abs(q.root.im + p.root.im) < 1e-9);
      if (j >= 0) used.add(j);
      out.push(`${sym} = ${fmt(p.root.re, 8)} ± ${fmt(Math.abs(p.root.im), 8)}j${m}`);
    } else out.push(`${sym} = ${fmt(p.root.re, 8)}${m}`);
  });
  return out;
}

export function stability(poles) {
  const tol = 1e-9;
  if (poles.some((p) => p.root.re > tol)) return { kind: "unstable", text: "Unstable (pole in the right half-plane)" };
  const axis = poles.filter((p) => Math.abs(p.root.re) <= tol);
  if (axis.some((p) => p.mult > 1)) return { kind: "unstable", text: "Unstable (repeated pole on the imaginary axis)" };
  if (axis.length) return { kind: "marginal", text: "Marginally stable (simple poles on the imaginary axis)" };
  return { kind: "stable", text: "Stable (all poles in the left half-plane)" };
}

export function solve(input) {
  const tf = readTF(input, "G", "Transfer function");
  const { zeros, poles } = polesZeros(tf);
  const { lead, nTex, dTex } = tfFactorTex(tf);
  const st = stability(poles);
  const origin = poles.filter((p) => cabs(p.root) < 1e-9).reduce((s, p) => s + p.mult, 0);
  const dc = origin ? Infinity : evalTF(tf, C(0)).re;
  const rel = degree(tf.den) - degree(tf.num);
  const zText = pairText(zeros, "z"), pText = pairText(poles, "p");
  const steps = [
    { text: "Transfer function:", tex: `H(s) = ${tfTex(tf)}` },
    { text: "We factor the numerator and denominator by finding their roots:", tex: `H(s) = ${niceTex(lead, 8)}\\,\\frac{${nTex}}{${dTex}}` },
    `The zeros are the roots of the numerator: ${zText.length ? zText.map((z) => `$${z.replace("±", "\\pm")}$`).join("، ") : "No finite zeros"}.`,
    `The poles are the roots of the denominator: ${pText.map((p) => `$${p.replace("±", "\\pm")}$`).join("، ")}.`,
    `Stability: ${st.text}.`,
    origin ? `The origin has ${origin} pole(s), so the system is of type ${origin} and the DC gain is infinite.` : { text: "DC gain (at s = 0):", tex: `H(0) = ${ntex(dc, 8)}` }
  ];
  const rows = [];
  for (const p of poles) {
    if (p.root.im < 0) continue;
    const wn = cabs(p.root);
    const zeta = wn > 0 ? -p.root.re / wn : NaN;
    rows.push([{ tex: p.root.im ? `${ctex(p.root, 6)}, ${ctex({ re: p.root.re, im: -p.root.im }, 6)}` : ctex(p.root, 6) }, String(p.mult), fmt(wn, 6), p.root.im ? fmt(zeta, 6) : "—", p.root.re < 0 && wn > 0 ? fmt(-1 / p.root.re, 6) : "—"]);
  }
  const pts = (list) => list.flatMap((p) => Array(p.mult).fill([p.root.re, p.root.im]));
  const allPts = [...pts(poles), ...pts(zeros)];
  const m = Math.max(1, ...allPts.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) * 1.3;
  return {
    results: [
      { label: "Zeros", value: zText.join("، ") || "None" },
      { label: "Poles", value: pText.join("، ") },
      { label: "Stability", value: st.text },
      { label: "DC gain H(0)", value: dc, sig: 8 },
      { label: "Relative degree (poles − zeros)", value: rel }
    ],
    blocks: [
      { type: "table", caption: "Pole properties", head: ["Pole", "Multiplicity", "ωn", "ζ", "Time constant τ"], rows },
      { type: "plot", title: "Pole (×) and zero (○) plot", xLabel: "Re(s) = σ", yLabel: "Im(s) = jω", equalAspect: true, xMin: -m, xMax: m, yMin: -m, yMax: m, series: [{ name: "Poles", points: pts(poles), marker: "x" }, { name: "Zeros", points: pts(zeros), marker: "o", color: "var(--plot-1)" }] }
    ],
    steps,
    copy: `${pText.join("; ")}\n${zText.join("; ") || "no zeros"}\n${st.text}`
  };
}
