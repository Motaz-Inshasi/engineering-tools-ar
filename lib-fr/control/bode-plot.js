import { readTF, tfTex, polesZeros, logspace } from "../signals/common.js";
import { C, cabs, csub, carg } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Tracez le diagramme de Bode (amplitude en décibels et phase) de toute fonction de transfert, avec les pulsations de cassure, la pulsation de coupure en gain, la pulsation de coupure en phase, et les marges de gain et de phase.",
  keywords: ["Bode", "Diagramme de Bode", "bode", "bode plot", "Marge de phase", "Marge de gain", "phase margin", "gain margin", "Réponse fréquentielle", "Décibel"],
  formulas: [
    { label: "Amplitude et phase", tex: "|G(j\\omega)|_{dB} = 20\\log_{10}|G(j\\omega)|,\\qquad \\angle G(j\\omega) = \\angle K + \\sum\\angle(j\\omega - z_i) - \\sum\\angle(j\\omega - p_i)" },
    { label: "Marges", tex: "PM = 180^\\circ + \\angle G(j\\omega_{gc}),\\qquad GM = -|G(j\\omega_{pc})|_{dB}" }
  ],
  inputs: [
    { id: "G", label: "Fonction de transfert G(s)", type: "expr", default: "100/(s(s + 2)(s + 10))" },
    { id: "wmin", label: "Pulsation minimale (facultatif)", unit: "rad/s", type: "number" },
    { id: "wmax", label: "Pulsation maximale (facultatif)", unit: "rad/s", type: "number" }
  ],
  example: { values: { G: "100/(s(s + 2)(s + 10))", wmin: "", wmax: "" }, expect: ["PM = 19.91", "GM = 7.604 dB"], note: "Exemple : $G(s) = \\frac{100}{s(s+2)(s+10)}$, système de type 1." },
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
  const tf = readTF(input, "G", "Fonction de transfert");
  const { zeros, poles } = polesZeros(tf);
  const corners = [...zeros, ...poles].map((r) => cabs(r.root)).filter((x) => x > 1e-9);
  let wmin = num(input, "wmin", "Pulsation minimale", { optional: true, positive: true });
  let wmax = num(input, "wmax", "Pulsation maximale", { optional: true, positive: true });
  if (wmin === null) wmin = corners.length ? Math.pow(10, Math.floor(Math.log10(Math.min(...corners))) - 2) : 0.01;
  if (wmax === null) wmax = corners.length ? Math.pow(10, Math.ceil(Math.log10(Math.max(...corners))) + 2) : 100;
  if (wmin >= wmax) fail("La pulsation minimale doit être inférieure à la pulsation maximale.", "wmax");
  if (wmax / wmin > 1e12) fail("La plage de fréquences est trop large (plus de 12 décades).", "wmax");
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
    { text: "On remplace $s = j\\omega$ dans la fonction de transfert :", tex: `G(j\\omega) = \\left.${tfTex(tf)}\\right|_{s = j\\omega}` },
    corners.length ? `Pulsations de cassure (modules des pôles et des zéros) : ${[...new Set(corners.map((c) => fmt(c, 5)))].join("، ")} rad/s. Chaque pôle diminue la pente de 20 dB/décade, et chaque zéro l'augmente de 20 dB/décade.` : "Il n'existe aucune pulsation de cassure non nulle.",
    poles.some((p) => cabs(p.root) < 1e-9) ? "La présence d'un pôle à l'origine fait démarrer la courbe avec une pente de −20 dB/décade et une phase de −90°." : "Il n'y a pas de pôle à l'origine : la courbe démarre horizontalement au gain statique.",
    "Nous avons calculé l'amplitude et la phase en 600 pulsations réparties logarithmiquement ; la phase, obtenue par addition des angles des facteurs, reste continue sans sauts."
  ];
  if (wgc) steps.push({ text: "À la pulsation de coupure en gain, l'amplitude vaut 0 dB :", tex: `\\omega_{gc} = ${ntex(wgc, 5)}\\ \\text{rad/s},\\quad PM = 180^\\circ + (${ntex(fph(wgc), 5)}^\\circ) = ${ntex(pm, 5)}^\\circ` });
  else steps.push("L'amplitude ne traverse pas 0 dB dans cette plage : la marge de phase n'est pas définie ici.");
  if (wpc) steps.push({ text: `À la pulsation de coupure en phase, la phase vaut ${target}° :`, tex: `\\omega_{pc} = ${ntex(wpc, 5)}\\ \\text{rad/s},\\quad GM = ${ntex(gm, 5)}\\ \\text{dB}` });
  else steps.push("La phase n'atteint pas −180° dans cette plage : la marge de gain est infinie.");
  steps.push("Les marges n'indiquent la stabilité de la boucle fermée que si la boucle ouverte est stable et sans zéros dans le demi-plan droit.");
  const verdict = pm === null ? "—" : pm > 0 && (gm === null || gm > 0) ? "Boucle fermée stable (deux marges positives)" : "Boucle fermée instable (marge négative)";
  return {
    results: [
      { label: "Pulsation de coupure en gain ωgc", value: wgc ?? "Inexistante", unit: wgc ? "rad/s" : "", sig: 5 },
      { label: "Marge de phase PM", value: pm ?? "Non définie", unit: pm !== null ? "°" : "", sig: 4, text: pm !== null ? `PM = ${fmt(pm, 4)}°` : undefined },
      { label: "Pulsation de coupure en phase ωpc", value: wpc ?? "Inexistante", unit: wpc ? "rad/s" : "", sig: 5 },
      { label: "Marge de gain GM", value: gm ?? "Infinie", unit: gm !== null ? "dB" : "", sig: 4 },
      { label: "Verdict", value: verdict }
    ],
    blocks: [
      { type: "plot", title: "Amplitude (dB)", logX: true, xLabel: "ω (rad/s)", yLabel: "|G| (dB)", series: [{ name: "|G(jω)|", points: ws.map((w, i) => [w, db[i]]) }], hlines: [{ y: 0 }], vlines: wgc ? [{ x: wgc }] : [] },
      { type: "plot", title: "Phase (degrés)", logX: true, xLabel: "ω (rad/s)", yLabel: "∠G (°)", series: [{ name: "∠G(jω)", points: ws.map((w, i) => [w, ph[i]]), color: "var(--plot-3)" }], hlines: [{ y: -180 }], vlines: wpc ? [{ x: wpc }] : [] }
    ],
    steps,
    copy: `PM = ${pm !== null ? fmt(pm, 4) + "°" : "n/a"} at ${wgc ? fmt(wgc, 5) : "-"} rad/s; GM = ${gm !== null ? fmt(gm, 4) + " dB" : "inf"} at ${wpc ? fmt(wpc, 5) : "-"} rad/s`
  };
}
