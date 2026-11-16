import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const ISOTOPES = {
  C14: { label: "C-14", T: 5730 },
  K40: { label: "K-40", T: 1.248e9 },
  U238: { label: "U-238", T: 4.468e9 },
  U235: { label: "U-235", T: 7.04e8 },
  Rb87: { label: "Rb-87", T: 4.97e10 }
};

export const meta = {
  description: "Calcule la edad de una muestra a partir de la fracción remanente del elemento padre o de la razón hijo/padre, o calcule la fracción remanente para una edad conocida, con la curva de desintegración radiactiva hasta cinco semividas.",
  keywords: ["Datación radiométrica", "Semivida", "Carbono 14", "C-14", "K-40", "U-238", "Rb-87", "radiometric dating", "half-life"],
  formulas: [
    { label: "Edad a partir de la fracción remanente", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{100}{p}" },
    { label: "Edad a partir de la razón hijo/padre", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(1+\\frac{D}{P}\\right)" },
    { label: "Fracción remanente a partir de la edad", tex: "p = 100\\cdot 2^{-t/T_{1/2}}" }
  ],
  inputs: [
    { id: "iso", label: "Isótopo radiactivo", type: "select", default: "C14", options: [["C14", "C-14 (5730 años)"], ["K40", "K-40"], ["U238", "U-238"], ["U235", "U-235"], ["Rb87", "Rb-87"], ["custom", "Semivida personalizada"]] },
    { id: "halfLife", label: "Semivida personalizada", unit: "años", type: "number", default: "5730", when: { iso: ["custom"] } },
    { id: "mode", label: "Resultado buscado", type: "select", default: "fraction", options: [["fraction", "Edad a partir de la fracción remanente del padre"], ["ratio", "Edad a partir de la razón hijo/padre D/P"], ["age", "Fracción remanente a partir de la edad"]] },
    { id: "pct", label: "Fracción remanente del padre", unit: "%", type: "number", default: "25", when: { mode: ["fraction"] } },
    { id: "ratio", label: "Razón hijo/padre D/P", type: "number", default: "1", when: { mode: ["ratio"] } },
    { id: "age", label: "Edad", unit: "años", type: "number", default: "11460", when: { mode: ["age"] } }
  ],
  example: { values: { iso: "C14", halfLife: "", mode: "fraction", pct: "25", ratio: "", age: "" }, expect: ["11460 años"], note: "Ejemplo: que quede el 25 % de C-14 significa que han pasado dos semividas." },
  invalid: { values: { iso: "C14", halfLife: "", mode: "fraction", pct: "0", ratio: "", age: "" } },
  related: ["earthquake-magnitude", "carbon-footprint"]
};

export function solve(input) {
  const iso = choice(input, "iso", "Isótopo", ["C14", "K40", "U238", "U235", "Rb87", "custom"], "C14");
  const mode = choice(input, "mode", "Resultado buscado", ["fraction", "ratio", "age"], "fraction");
  const T = iso === "custom" ? num(input, "halfLife", "Semivida", { positive: true }) : ISOTOPES[iso].T;
  const name = iso === "custom" ? "Isótopo personalizado" : ISOTOPES[iso].label;
  const steps = [];
  let t;
  if (mode === "fraction") {
    const p = num(input, "pct", "Fracción remanente", { positive: true, max: 100 });
    t = T * Math.log(100 / p) / Math.LN2;
    steps.push({ text: "Ley de desintegración radiactiva:", tex: "\\frac{N}{N_0} = \\left(\\tfrac{1}{2}\\right)^{t/T_{1/2}}" });
    steps.push({ text: "Despejamos el tiempo de la ecuación:", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{100}{p}" });
    steps.push({ text: "Sustituyendo:", tex: `t = \\frac{${ntex(T)}}{\\ln 2}\\ln\\frac{100}{${ntex(p)}} = ${ntex(t, 6)}\\ \\text{y}` });
  } else if (mode === "ratio") {
    const r = num(input, "ratio", "Razón hijo/padre", { nonNegative: true });
    t = T * Math.log(1 + r) / Math.LN2;
    steps.push({ text: "La razón hijo/padre da el tiempo:", tex: "t = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(1+\\frac{D}{P}\\right)" });
    steps.push({ text: "Sustituyendo:", tex: `t = \\frac{${ntex(T)}}{\\ln 2}\\ln\\left(1+${ntex(r)}\\right) = ${ntex(t, 6)}\\ \\text{y}` });
  } else {
    t = num(input, "age", "Edad", { nonNegative: true });
    steps.push({ text: "Edad obtenida:", tex: `t = ${ntex(t, 6)}\\ \\text{y}` });
  }
  const remain = 100 * Math.pow(2, -t / T);
  steps.push({ text: "Fracción remanente del elemento padre:", tex: `p = 100 \\cdot 2^{-${ntex(t, 6)}/${ntex(T)}} = ${ntex(remain, 6)}\\ \\%` });
  const tTxt = `${fmt(t, 4)} años`;
  const pts = [];
  const xMax = Math.max(5 * T, t);
  for (let i = 0; i <= 80; i++) {
    const x = xMax * i / 80;
    pts.push([x, 100 * Math.pow(2, -x / T)]);
  }
  return {
    results: [
      { label: "Edad", value: tTxt, text: `t = ${tTxt}` },
      { label: "En millones", value: `${fmt(t / 1e6, 4)} millones de años` },
      { label: "Fracción remanente del padre", value: `${fmt(remain, 4)} %` },
      { label: "Número de semividas transcurridas", value: fmt(t / T, 4) },
      { label: "Semivida utilizada", value: `${fmt(T, 4)} años` }
    ],
    steps,
    copy: `Edad ≈ ${tTxt} (${name}, semivida de ${fmt(T, 4)} años)`,
    blocks: [
      { type: "plot", title: "Curva de desintegración radiactiva", xLabel: "Tiempo (años)", yLabel: "Fracción remanente (%)", series: [{ name: "Fracción remanente", points: pts }], vlines: [{ x: t }], includeZero: true }
    ],
    values: { t, T, remain }
  };
}
