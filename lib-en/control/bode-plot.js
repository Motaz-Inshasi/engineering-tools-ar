import { readTF, tfTex, polesZeros, logspace } from "../signals/common.js";
import { C, cabs, csub, carg } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Draw the Bode plot (magnitude in decibels and phase) of any transfer function, with the break frequencies, the gain crossover frequency, the phase crossover frequency, and the gain and phase margins.",
  keywords: ["Bode", "Bode plot", "bode", "bode plot", "phase margin", "gain margin", "phase margin", "gain margin", "frequency response", "decibel"],
  formulas: [
    { label: "Magnitude and phase", tex: "|G(j\\omega)|_{dB} = 20\\log_{10}|G(j\\omega)|,\\qquad \\angle G(j\\omega) = \\angle K + \\sum\\angle(j\\omega - z_i) - \\sum\\angle(j\\omega - p_i)" },
    { label: "Margins", tex: "PM = 180^\\circ + \\angle G(j\\omega_{gc}),\\qquad GM = -|G(j\\omega_{pc})|_{dB}" }
  ],
  inputs: [
    { id: "G", label: "Transfer function G(s)", type: "expr", default: "100/(s(s + 2)(s + 10))" },
    { id: "wmin", label: "Lowest frequency (optional)", unit: "rad/s", type: "number" },
    { id: "wmax", label: "Highest frequency (optional)", unit: "rad/s", type: "number" }
  ],
  example: { values: { G: "100/(s(s + 2)(s + 10))", wmin: "", wmax: "" }, expect: ["PM = 19.91", "GM = 7.604 dB"], note: "Example: $G(s) = \\frac{100}{s(s+2)(s+10)}$, a type 1 system." },
  invalid: { values: { G: "1/s", wmin: "10", wmax: "1" } },
  related: ["transfer-function", "steady-state-error", "passive-filter", "routh-hurwitz"]
};

export function freqResponse(tf, zeros, poles, w) {
  const lead = tf.num[tf.num.length - 1] / tf.den[tf.den.length - 1];
  const jw = C(0, w);
  let mag = Math.abs(lead), ph = lead < 0 ? Math.PI : 0;
  for (const z of zeros) for (let k = 0; k < z.mult; k++) { const d = csub(jw, z.root); mag *= cabs(d); ph += carg(d); }
  for (const p of poles) for (let k = 0; k < p.mult; k++) { const d = csub(jw, p.root); mag /= cabs(d); ph -= carg(d); }
  return { mag, db: 20 * Math.log10(mag), deg: (ph * 180) / Math.PI };
}

function crossing(ws, vals, target) {
  for (let i = 1; i < ws.length; i++) {
    const a = vals[i - 1] - target, b = vals[i] - target;
    if (a === 0) return ws[i - 1];
    if (a * b < 0) {
      const la = Math.log10(ws[i - 1]), lb = Math.log10(ws[i]);
      return Math.pow(10, la + (lb - la) * (a / (a - b)));
    }
  }
  return null;
}

function refine(f, w0, target) {
  let lo = w0 / 1.05, hi = w0 * 1.05;
  const g = (w) => f(w) - target;
  if (g(lo) * g(hi) > 0) return w0;
  for (let i = 0; i < 80; i++) {
    const m = Math.sqrt(lo * hi);
    if (g(lo) * g(m) <= 0) hi = m; else lo = m;
  }
  return Math.sqrt(lo * hi);
}

export function solve(input) {
  const tf = readTF(input, "G", "Transfer function");
  const { zeros, poles } = polesZeros(tf);
  const corners = [...zeros, ...poles].map((r) => cabs(r.root)).filter((x) => x > 1e-9);
  let wmin = num(input, "wmin", "Lowest frequency", { optional: true, positive: true });
  let wmax = num(input, "wmax", "Highest frequency", { optional: true, positive: true });
  if (wmin === null) wmin = corners.length ? Math.pow(10, Math.floor(Math.log10(Math.min(...corners))) - 2) : 0.01;
  if (wmax === null) wmax = corners.length ? Math.pow(10, Math.ceil(Math.log10(Math.max(...corners))) + 2) : 100;
  if (wmin >= wmax) fail("The lowest frequency must be smaller than the highest frequency.", "wmax");
  if (wmax / wmin > 1e12) fail("The frequency range is too wide (more than 12 decades).", "wmax");
  const ws = logspace(wmin, wmax, 600);
  const fr = ws.map((w) => freqResponse(tf, zeros, poles, w));
  const db = fr.map((r) => r.db), ph = fr.map((r) => r.deg);
  const fdb = (w) => freqResponse(tf, zeros, poles, w).db, fph = (w) => freqResponse(tf, zeros, poles, w).deg;
  let wgc = crossing(ws, db, 0);
  if (wgc) wgc = refine(fdb, wgc, 0);
  const target = ph.some((p) => p <= -180) ? -180 : ph.some((p) => p >= 180) ? 180 : -180;
  let wpc = crossing(ws, ph, target);
  if (wpc) wpc = refine(fph, wpc, target);
  const pm = wgc ? 180 + fph(wgc) : null;
  const gm = wpc ? -fdb(wpc) : null;
  const steps = [
    { text: "We substitute $s = j\\omega$ into the transfer function:", tex: `G(j\\omega) = \\left.${tfTex(tf)}\\right|_{s = j\\omega}` },
    corners.length ? `Break frequencies (magnitudes of poles and zeros): ${[...new Set(corners.map((c) => fmt(c, 5)))].join("، ")} rad/s. Each pole decreases the slope by 20 dB/decade, and each zero increases it by 20 dB/decade.` : "There are no nonzero break frequencies.",
    poles.some((p) => cabs(p.root) < 1e-9) ? "A pole at the origin starts the curve with a slope of −20 dB/decade and a phase of −90°." : "There is no pole at the origin, so the curve starts flat at the static gain.",
    "We computed the magnitude and phase at 600 logarithmically spaced frequencies, and the phase is obtained by summing the angles of the factors, so it stays continuous without jumps."
  ];
  if (wgc) steps.push({ text: "At the gain crossover frequency the magnitude is 0 dB:", tex: `\\omega_{gc} = ${ntex(wgc, 5)}\\ \\text{rad/s},\\quad PM = 180^\\circ + (${ntex(fph(wgc), 5)}^\\circ) = ${ntex(pm, 5)}^\\circ` });
  else steps.push("The magnitude does not cross 0 dB in this range, so the phase margin is undefined here.");
  if (wpc) steps.push({ text: `At the phase crossover frequency the phase is ${target}°:`, tex: `\\omega_{pc} = ${ntex(wpc, 5)}\\ \\text{rad/s},\\quad GM = ${ntex(gm, 5)}\\ \\text{dB}` });
  else steps.push("The phase does not reach −180° in this range, so the gain margin is infinite.");
  steps.push("The margins indicate closed-loop stability only if the open loop is stable and has no zeros in the right half-plane.");
  const verdict = pm === null ? "—" : pm > 0 && (gm === null || gm > 0) ? "Closed loop is stable (both margins positive)" : "Closed loop is unstable (negative margin)";
  return {
    results: [
      { label: "Gain crossover frequency ωgc", value: wgc ?? "Not found", unit: wgc ? "rad/s" : "", sig: 5 },
      { label: "Phase margin PM", value: pm ?? "Undefined", unit: pm !== null ? "°" : "", sig: 4, text: pm !== null ? `PM = ${fmt(pm, 4)}°` : undefined },
      { label: "Phase crossover frequency ωpc", value: wpc ?? "Not found", unit: wpc ? "rad/s" : "", sig: 5 },
      { label: "Gain margin GM", value: gm ?? "Infinite", unit: gm !== null ? "dB" : "", sig: 4 },
      { label: "Verdict", value: verdict }
    ],
    blocks: [
      { type: "plot", title: "Magnitude (dB)", logX: true, xLabel: "ω (rad/s)", yLabel: "|G| (dB)", series: [{ name: "|G(jω)|", points: ws.map((w, i) => [w, db[i]]) }], hlines: [{ y: 0 }], vlines: wgc ? [{ x: wgc }] : [] },
      { type: "plot", title: "Phase (degrees)", logX: true, xLabel: "ω (rad/s)", yLabel: "∠G (°)", series: [{ name: "∠G(jω)", points: ws.map((w, i) => [w, ph[i]]), color: "var(--plot-3)" }], hlines: [{ y: -180 }], vlines: wpc ? [{ x: wpc }] : [] }
    ],
    steps,
    copy: `PM = ${pm !== null ? fmt(pm, 4) + "°" : "n/a"} at ${wgc ? fmt(wgc, 5) : "-"} rad/s; GM = ${gm !== null ? fmt(gm, 4) + " dB" : "inf"} at ${wpc ? fmt(wpc, 5) : "-"} rad/s`
  };
}
