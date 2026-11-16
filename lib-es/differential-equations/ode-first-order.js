import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const PRESETS = {
  none: { yU: "", tU: "", aU: "", note: "" },
  newton: {
    yU: "°C", tU: "min", aU: "1/min",
    note: "Enfriamiento de Newton: T' = −k(T − Tₐ) ⇒ a = k y b = k·Tₐ. Unidades: T en °C, el tiempo en minutos, k en 1/min, y el estado estacionario es la temperatura del medio Tₐ."
  },
  rc: {
    yU: "V", tU: "s", aU: "1/s",
    note: "Carga de un condensador RC: V' + V/(RC) = V_s/(RC) ⇒ a = 1/(RC) y b = V_s/(RC). Unidades: el voltaje en voltios, el tiempo en segundos, y el estado estacionario es el voltaje de alimentación V_s."
  },
  growth: {
    yU: "unidad de la cantidad", tU: "unidad de tiempo", aU: "1/unidad de tiempo",
    note: "Crecimiento o decaimiento exponencial: y' = r·y ⇒ a = −r y b = 0. Si r > 0 hay crecimiento (a < 0); si hay decaimiento, a > 0. El estado estacionario es 0."
  },
  mixing: {
    yU: "g/L", tU: "min", aU: "1/min",
    note: "Tanque de mezcla simple: C' + (q/V)·C = q·C_in/V ⇒ a = q/V y b = q·C_in/V. Unidades: la concentración en g/L, el tiempo en minutos, el caudal q en L/min, el volumen V en litros, y el estado estacionario es C_in."
  }
};

const unitOf = (u) => (u ? ` ${u}` : "");
const tex = (x) => ntex(x, 6);
const texSigned = (x) => (x < 0 ? `- ${tex(-x)}` : `+ ${tex(x)}`);
const plainSigned = (x) => (x < 0 ? `− ${fmt(-x, 4)}` : `+ ${fmt(x, 4)}`);
const tTex = (t0) => (t0 === 0 ? "t" : `(t ${texSigned(-t0)})`);
const tPlain = (t0) => (t0 === 0 ? "t" : `(t ${plainSigned(-t0)})`);
const samples = (t0, span, f) => {
  const points = [];
  for (let i = 0; i <= 200; i++) {
    const t = t0 + (span * i) / 200;
    points.push([t, f(t)]);
  }
  return points;
};

export const meta = {
  description: "Resuelve la ecuación diferencial lineal de primer orden y' + a·y = b con coeficientes constantes y condición inicial, con el factor integrante, la constante de tiempo, el tiempo de semivida y la gráfica.",
  keywords: ["ecuación diferencial", "primer orden", "factor integrante", "constante de tiempo", "enfriamiento de Newton", "carga del condensador", "crecimiento exponencial", "decaimiento", "first order ODE", "integrating factor", "time constant"],
  formulas: [
    { label: "forma estándar", tex: "y' + a\\,y = b" },
    { label: "solución general con la condición inicial", tex: "y(t) = \\frac{b}{a} + \\left(y_0 - \\frac{b}{a}\\right)e^{-a(t-t_0)}" },
    { label: "constante de tiempo", tex: "\\tau = \\frac{1}{a}" },
    { label: "caso a = 0", tex: "y(t) = y_0 + b\\,(t - t_0)" }
  ],
  inputs: [
    { id: "a", label: "coeficiente a", type: "number", default: "0.1", help: "Coeficiente de y en la forma y' + a·y = b. Puede ser cero o negativo." },
    { id: "b", label: "término derecho b", type: "number", default: "2", help: "Término constante del lado derecho de la ecuación." },
    { id: "t0", label: "tiempo inicial t0", type: "number", default: "0" },
    { id: "y0", label: "valor inicial y0", type: "number", default: "0", help: "Valor de y en el tiempo t0." },
    { id: "t1", label: "tiempo de cálculo t1 (opcional)", type: "number", default: "10", help: "Deje el campo vacío si no necesita un valor en un tiempo específico." },
    {
      id: "preset", label: "modelo de ejemplo", type: "select", default: "none",
      options: [["none", "sin modelo"], ["newton", "enfriamiento de Newton"], ["rc", "carga de un condensador RC"], ["growth", "crecimiento o decaimiento exponencial"], ["mixing", "tanque de mezcla simple"]]
    }
  ],
  example: {
    values: { a: "0.1", b: "2", t0: "0", y0: "0", t1: "10", preset: "none" },
    expect: ["y(10) = 12.64", "Estado estacionario = 20"],
    note: "Ejemplo: a = 0.1, b = 2, y0 = 0; entonces y(10) = 20(1 − e⁻¹) ≈ 12.64."
  },
  invalid: { values: { a: "0.1", b: "2", t0: "0", y0: "", t1: "10", preset: "none" } },
  related: ["ode-second-order", "ode-numerical", "rc-rl-transient", "population-growth"]
};

export function solve(input) {
  const a = num(input, "a", "coeficiente a");
  const b = num(input, "b", "término derecho b");
  const t0 = num(input, "t0", "tiempo inicial t0");
  const y0 = num(input, "y0", "valor inicial y0");
  const t1 = num(input, "t1", "tiempo t1", { optional: true });
  const preset = choice(input, "preset", "el modelo", Object.keys(PRESETS), "none");
  const P = PRESETS[preset];
  const tU = unitOf(P.tU);
  const yU = unitOf(P.yU);

  const blocks = [];
  if (P.note) {
    blocks.push({ type: "note", text: P.note });
    blocks.push({ type: "table", caption: "unidades del modelo", head: ["variable", "unidad"], rows: [["y", P.yU], ["t", P.tU], ["a", P.aU]] });
  }

  if (a === 0) {
    const lin = (t) => y0 + b * (t - t0);
    const steps = [
      { text: "Cuando a = 0, la ecuación se convierte en y' = b y no se necesita el factor integrante:", tex: `\\frac{dy}{dt} = ${tex(b)}` },
      { text: "Integramos directamente de t0 a t:", tex: "y(t) = y_0 + \\int_{t_0}^{t} b\\,ds = y_0 + b(t - t_0)" },
      { text: "Sustituimos los valores:", tex: `y(t) = ${tex(y0)} ${texSigned(b)}\\,${tTex(t0)}` }
    ];
    const results = [
      { label: "Solución", value: `y(t) = ${fmt(y0, 4)} ${plainSigned(b)}${tPlain(t0)}` },
      { label: "Tasa de cambio dy/dt", value: `${fmt(b, 4)}${yU}${tU ? "/" + P.tU : ""}` },
      { label: "Estado estacionario", value: "No existe (la solución es lineal y crece sin límite)" },
      { label: "Constante de tiempo τ", value: "No definida (a = 0)" }
    ];
    let copy = `y(t) = ${fmt(y0, 4)} ${plainSigned(b)}${tPlain(t0)}`;
    if (t1 !== null) {
      const y1 = lin(t1);
      results.push({ label: `Valor de y en t = ${fmt(t1, 4)}`, value: `${fmt(y1, 4)}${yU}`, text: `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}` });
      copy = `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}، ${copy}`;
    }
    blocks.push({ type: "plot", title: "Curva solución y(t)", xLabel: `t${tU}`, yLabel: `y${yU}`, includeZero: true, series: [{ name: "y(t)", points: samples(t0, 10, lin), line: true }] });
    return { results, steps, blocks, copy };
  }

  const tau = 1 / a;
  const ss = b / a;
  const C0 = y0 - ss;
  const yAt = (t) => ss + C0 * Math.exp(-a * (t - t0));
  const halfOrDouble = Math.LN2 / Math.abs(a);

  const steps = [
    { text: "Forma estándar de la solución:", tex: `y' ${texSigned(a)}\\,y = ${tex(b)}` },
    { text: "Factor integrante μ(t) = e^{∫a dt} = e^{at}; lo multiplicamos por ambos lados de la ecuación:", tex: `\\left(y\\,e^{${tex(a)}\\,t}\\right)' = ${tex(b)}\\,e^{${tex(a)}\\,t}` },
    { text: "Integramos ambos lados:", tex: `y\\,e^{at} = \\frac{b}{a}\\,e^{at} + C` },
    { text: "Dividimos entre e^{at} y obtenemos la solución general:", tex: "y = \\frac{b}{a} + C\\,e^{-at}" },
    { text: "Aplicamos la condición inicial y(t0) = y0:", tex: `C = \\left(y_0 - \\frac{b}{a}\\right)e^{a t_0} \\quad\\Rightarrow\\quad y(t) = ${tex(ss)} ${texSigned(C0)}\\,e^{${tex(-a)}${tTex(t0)}}` },
    { text: "Constante de tiempo:", tex: `\\tau = \\frac{1}{a} = ${tex(tau)}${tU}` }
  ];
  if (a > 0) {
    steps.push({ text: "Estado estacionario de la solución:", tex: `y_{\\infty} = \\frac{b}{a} = ${tex(ss)}${yU}` });
    steps.push({ text: "Tiempo de semivida de la diferencia entre y y el estado estacionario:", tex: `t_{1/2} = \\frac{\\ln 2}{a} = ${tex(halfOrDouble)}${tU}` });
  } else {
    steps.push({ text: "Como a < 0, la solución se aleja del estado estacionario, y el tiempo de duplicación de la diferencia es:", tex: `t_2 = \\frac{\\ln 2}{|a|} = ${tex(halfOrDouble)}${tU}` });
  }

  const results = [
    { label: "Solución", value: `y(t) = ${fmt(ss, 4)} ${plainSigned(C0)} e^{${fmt(-a, 4)}${tPlain(t0)}}` },
    { label: "Estado estacionario y∞ = b/a", value: a > 0 ? `${fmt(ss, 4)}${yU}` : "No existe (a < 0)" },
    { label: "Constante de tiempo τ = 1/a", value: `${fmt(tau, 4)}${tU}` },
    { label: a > 0 ? "Semivida de la diferencia t½" : "Tiempo de duplicación de la diferencia", value: `${fmt(halfOrDouble, 4)}${tU}` }
  ];
  let copy = `Estado estacionario = ${a > 0 ? `${fmt(ss, 4)}${yU}` : "No existe"}, τ = ${fmt(tau, 4)}${tU}`;
  if (t1 !== null) {
    const y1 = yAt(t1);
    results.push({ label: `Valor de y en t = ${fmt(t1, 4)}`, value: `${fmt(y1, 4)}${yU}`, text: `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}` });
    copy = `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}، ${copy}`;
  }

  const plot = { type: "plot", title: "Curva solución y(t)", xLabel: `t${tU}`, yLabel: `y${yU}`, includeZero: true, series: [{ name: "y(t)", points: samples(t0, 5 / Math.abs(a), yAt), line: true }] };
  if (a > 0) plot.hlines = [{ y: ss }];
  blocks.push(plot);

  return { results, steps, blocks, copy };
}
