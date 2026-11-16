import { readTF, tfTex, polesZeros, logspace } from "../signals/common.js";
import { C, cabs, csub, carg } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "Dibuja el diagrama de Bode (magnitud en decibelios y fase) de cualquier función de transferencia, con las frecuencias de quiebre, la frecuencia de cruce de ganancia, la frecuencia de cruce de fase y los márgenes de ganancia y de fase.",
  keywords: ["Bode", "Diagrama de Bode", "bode", "bode plot", "Margen de fase", "Margen de ganancia", "phase margin", "gain margin", "Respuesta en frecuencia", "Decibelio"],
  formulas: [
    { label: "Magnitud y fase", tex: "|G(j\\omega)|_{dB} = 20\\log_{10}|G(j\\omega)|,\\qquad \\angle G(j\\omega) = \\angle K + \\sum\\angle(j\\omega - z_i) - \\sum\\angle(j\\omega - p_i)" },
    { label: "Márgenes", tex: "PM = 180^\\circ + \\angle G(j\\omega_{gc}),\\qquad GM = -|G(j\\omega_{pc})|_{dB}" }
  ],
  inputs: [
    { id: "G", label: "Función de transferencia G(s)", type: "expr", default: "100/(s(s + 2)(s + 10))" },
    { id: "wmin", label: "Frecuencia mínima (opcional)", unit: "rad/s", type: "number" },
    { id: "wmax", label: "Frecuencia máxima (opcional)", unit: "rad/s", type: "number" }
  ],
  example: { values: { G: "100/(s(s + 2)(s + 10))", wmin: "", wmax: "" }, expect: ["PM = 19.91", "GM = 7.604 dB"], note: "Ejemplo: $G(s) = \\frac{100}{s(s+2)(s+10)}$, sistema de tipo 1." },
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
  const tf = readTF(input, "G", "Función de transferencia");
  const { zeros, poles } = polesZeros(tf);
  const corners = [...zeros, ...poles].map((r) => cabs(r.root)).filter((x) => x > 1e-9);
  let wmin = num(input, "wmin", "Frecuencia mínima", { optional: true, positive: true });
  let wmax = num(input, "wmax", "Frecuencia máxima", { optional: true, positive: true });
  if (wmin === null) wmin = corners.length ? Math.pow(10, Math.floor(Math.log10(Math.min(...corners))) - 2) : 0.01;
  if (wmax === null) wmax = corners.length ? Math.pow(10, Math.ceil(Math.log10(Math.max(...corners))) + 2) : 100;
  if (wmin >= wmax) fail("La frecuencia mínima debe ser menor que la máxima.", "wmax");
  if (wmax / wmin > 1e12) fail("El rango de frecuencias es demasiado amplio (más de 12 décadas).", "wmax");
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
    { text: "Sustituimos $s = j\\omega$ en la función de transferencia:", tex: `G(j\\omega) = \\left.${tfTex(tf)}\\right|_{s = j\\omega}` },
    corners.length ? `Frecuencias de quiebre (módulos de polos y ceros): ${[...new Set(corners.map((c) => fmt(c, 5)))].join("، ")} rad/s. Cada polo reduce la pendiente en 20 dB/década y cada cero la aumenta en 20 dB/década.` : "No hay frecuencias de quiebre distintas de cero.",
    poles.some((p) => cabs(p.root) < 1e-9) ? "Si hay un polo en el origen, la curva empieza con pendiente −20 dB/década y fase −90°." : "No hay polo en el origen, así que la curva empieza horizontal en la ganancia estática.",
    "Calculamos la magnitud y la fase en 600 frecuencias distribuidas logarítmicamente; la fase se obtiene sumando los ángulos de los factores, por lo que permanece continua sin saltos."
  ];
  if (wgc) steps.push({ text: "En la frecuencia de cruce de ganancia la magnitud es 0 dB:", tex: `\\omega_{gc} = ${ntex(wgc, 5)}\\ \\text{rad/s},\\quad PM = 180^\\circ + (${ntex(fph(wgc), 5)}^\\circ) = ${ntex(pm, 5)}^\\circ` });
  else steps.push("La magnitud no cruza 0 dB en este rango, así que el margen de fase no está definido aquí.");
  if (wpc) steps.push({ text: `En la frecuencia de cruce de fase la fase es ${target}°:`, tex: `\\omega_{pc} = ${ntex(wpc, 5)}\\ \\text{rad/s},\\quad GM = ${ntex(gm, 5)}\\ \\text{dB}` });
  else steps.push("La fase no alcanza −180° en este rango, así que el margen de ganancia es infinito.");
  steps.push("Los márgenes indican estabilidad en lazo cerrado solo si el lazo abierto es estable y no tiene ceros en el semiplano derecho.");
  const verdict = pm === null ? "—" : pm > 0 && (gm === null || gm > 0) ? "Lazo cerrado estable (ambos márgenes positivos)" : "Lazo cerrado inestable (margen negativo)";
  return {
    results: [
      { label: "Frecuencia de cruce de ganancia ωgc", value: wgc ?? "No existe", unit: wgc ? "rad/s" : "", sig: 5 },
      { label: "Margen de fase PM", value: pm ?? "No definido", unit: pm !== null ? "°" : "", sig: 4, text: pm !== null ? `PM = ${fmt(pm, 4)}°` : undefined },
      { label: "Frecuencia de cruce de fase ωpc", value: wpc ?? "No existe", unit: wpc ? "rad/s" : "", sig: 5 },
      { label: "Margen de ganancia GM", value: gm ?? "Infinito", unit: gm !== null ? "dB" : "", sig: 4 },
      { label: "Veredicto", value: verdict }
    ],
    blocks: [
      { type: "plot", title: "Magnitud (dB)", logX: true, xLabel: "ω (rad/s)", yLabel: "|G| (dB)", series: [{ name: "|G(jω)|", points: ws.map((w, i) => [w, db[i]]) }], hlines: [{ y: 0 }], vlines: wgc ? [{ x: wgc }] : [] },
      { type: "plot", title: "Fase (grados)", logX: true, xLabel: "ω (rad/s)", yLabel: "∠G (°)", series: [{ name: "∠G(jω)", points: ws.map((w, i) => [w, ph[i]]), color: "var(--plot-3)" }], hlines: [{ y: -180 }], vlines: wpc ? [{ x: wpc }] : [] }
    ],
    steps,
    copy: `PM = ${pm !== null ? fmt(pm, 4) + "°" : "n/a"} at ${wgc ? fmt(wgc, 5) : "-"} rad/s; GM = ${gm !== null ? fmt(gm, 4) + " dB" : "inf"} at ${wpc ? fmt(wpc, 5) : "-"} rad/s`
  };
}
