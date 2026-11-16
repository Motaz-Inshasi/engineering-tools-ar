import { readTF, tfTex, polesZeros } from "../signals/common.js";
import { numx as num } from "../core/numexpr.js";
import { fail } from "../core/validate.js";
import { padd, peval, roots, trim } from "../core/polynomial.js";
import { cabs } from "../core/complex.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calcula el error en régimen permanente de un sistema de realimentación unitaria: tipo del sistema, constantes de error Kp, Kv y Ka, y el error para entrada escalón, rampa y parábola, comprobando antes la estabilidad del lazo cerrado.",
  keywords: ["Error en régimen permanente", "steady state error", "Tipo del sistema", "Constante de error", "Kp", "Kv", "Ka", "Realimentación"],
  formulas: [
    { label: "Constantes de error", tex: "K_p = \\lim_{s\\to0}G(s),\\quad K_v = \\lim_{s\\to0}sG(s),\\quad K_a = \\lim_{s\\to0}s^2G(s)" },
    { label: "Error para una entrada de amplitud A", tex: "e_{step} = \\frac{A}{1+K_p},\\quad e_{ramp} = \\frac{A}{K_v},\\quad e_{parabola} = \\frac{A}{K_a}" }
  ],
  inputs: [
    { id: "G", label: "Función de lazo abierto G(s)", type: "expr", default: "10(s + 2)/(s(s + 1)(s + 5))", help: "Con realimentación unitaria: T(s) = G/(1+G)." },
    { id: "A", label: "Amplitud de la entrada A", type: "number", default: "1" }
  ],
  example: { values: { G: "10(s + 2)/(s(s + 1)(s + 5))", A: "1" }, expect: ["e_ramp = 0.25"], note: "Ejemplo: sistema de tipo 1, así que el error de escalón es cero y el de rampa es $1/K_v$." },
  invalid: { values: { G: "1/(s - 1)", A: "1" } },
  related: ["bode-plot", "routh-hurwitz", "transfer-function", "step-response"]
};

export function errorConstants(tf) {
  let den = trim(tf.den), N = 0;
  while (den.length > 1 && Math.abs(den[0]) < 1e-12 * Math.max(...den.map(Math.abs))) { den = den.slice(1); N++; }
  const g0 = peval(tf.num, 0) / den[0];
  const K = [0, 1, 2].map((k) => (N > k ? Infinity : N === k ? g0 : 0));
  return { type: N, Kp: K[0], Kv: K[1], Ka: K[2], g0 };
}

export function solve(input) {
  const tf = readTF(input, "G", "Función de lazo abierto");
  const A = num(input, "A", "Amplitud de la entrada", { nonZero: true });
  const charPoly = padd(tf.den, tf.num);
  const cl = roots(charPoly);
  const unstable = cl.filter((r) => r.re >= -1e-9);
  const steps = [
    { text: "Función de lazo abierto:", tex: `G(s) = ${tfTex(tf)}` },
    { text: "Primero comprobamos la estabilidad del lazo cerrado calculando las raíces de la ecuación característica $1 + G(s) = 0$:", tex: `D(s) + N(s) = 0` }
  ];
  if (unstable.length) {
    fail(`El lazo cerrado es inestable (${unstable.length} raíz(ces) en el eje imaginario o a su derecha), así que el error en régimen permanente no tiene sentido.`, "G");
  }
  steps.push(`Todas las raíces del lazo cerrado están en el semiplano izquierdo (la más lenta en Re = ${fmt(Math.max(...cl.map((r) => r.re)), 5)}), así que el sistema es estable y continuamos.`);
  const c = errorConstants(tf);
  steps.push(`Número de polos en el origen = ${c.type}, así que el sistema es de tipo ${c.type}.`);
  const kTex = (v) => (v === Infinity ? "\\infty" : ntex(v, 6));
  steps.push({ text: "Constantes de error:", tex: `K_p = ${kTex(c.Kp)},\\quad K_v = ${kTex(c.Kv)},\\quad K_a = ${kTex(c.Ka)}` });
  const e = (k, kind) => (kind === "step" ? A / (1 + k) : k === Infinity ? 0 : k === 0 ? Infinity : A / k);
  const es = e(c.Kp, "step"), er = e(c.Kv, "ramp"), ep = e(c.Ka, "par");
  steps.push({ text: `Sustituimos en las fórmulas con A = ${fmt(A)}:`, tex: `e_{step} = ${kTex(es)},\\quad e_{ramp} = ${kTex(er)},\\quad e_{parabola} = ${kTex(ep)}` });
  steps.push("Un error ∞ significa que la salida no puede seguir la entrada y la diferencia crece con el tiempo.");
  const show = (v) => (v === Infinity ? "∞" : fmt(v, 6));
  return {
    results: [
      { label: "Tipo del sistema", value: c.type },
      { label: "Kp", value: show(c.Kp) },
      { label: "Kv", value: show(c.Kv) },
      { label: "Ka", value: show(c.Ka) },
      { label: "Error de escalón", value: show(es), text: `e_step = ${show(es)}` },
      { label: "Error de rampa", value: show(er), text: `e_ramp = ${show(er)}` },
      { label: "Error de parábola", value: show(ep), text: `e_parabola = ${show(ep)}` }
    ],
    steps,
    copy: `type ${c.type}: e_step = ${show(es)}, e_ramp = ${show(er)}, e_parabola = ${show(ep)}`
  };
}

export { cabs };
