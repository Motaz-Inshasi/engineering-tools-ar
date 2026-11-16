import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const GAS = { P: "Presión P", V: "Volumen V", n: "Número de moles n", T: "Temperatura T" };
const GAS_UNIT = { P: "kPa", V: "L", n: "mol", T: "K" };
const HEAT = { Q: "Calor Q", m: "Masa m", c: "Calor específico c", dT: "Variación de temperatura ΔT" };
const HEAT_UNIT = { Q: "J", m: "kg", c: "J/(kg·K)", dT: "K" };
const HEAT_OPTS = { Q: {}, m: { positive: true }, c: { positive: true }, dT: {} };

export const meta = {
  description: "Calcula cualquier cuarta cantidad de la ley de los gases ideales PV = nRT, el calor absorbido Q = mcΔT a partir de tres valores conocidos, o el aumento de longitud de un material por dilatación térmica con su longitud final.",
  keywords: ["Ley de los gases ideales", "PV = nRT", "Presión", "Volumen", "Moles", "Calor específico", "Capacidad calorífica", "Dilatación térmica", "Coeficiente de dilatación", "ideal gas", "heat", "expansion"],
  formulas: [
    { label: "Ley de los gases ideales", tex: "PV = nRT,\\qquad R = 8.314\\ \\frac{kPa\\cdot L}{mol\\cdot K}" },
    { label: "Calor absorbido", tex: "Q = m\\,c\\,\\Delta T" },
    { label: "Dilatación lineal", tex: "\\Delta L = \\alpha L_0\\,\\Delta T,\\qquad L = L_0 + \\Delta L" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "gas", options: [["gas", "Ley de los gases ideales PV = nRT"], ["heat", "Calor absorbido Q = mcΔT"], ["expansion", "Dilatación lineal ΔL = αL0ΔT"]] },
    { id: "P", label: "Presión P", unit: "kPa", type: "number", default: "101.325", when: { mode: ["gas"] }, help: "Introduce solo tres valores de P, V, n y T." },
    { id: "V", label: "Volumen V", unit: "L", type: "number", when: { mode: ["gas"] } },
    { id: "n", label: "Número de moles n", unit: "mol", type: "number", default: "1", when: { mode: ["gas"] } },
    { id: "T", label: "Temperatura T", unit: "K", type: "number", default: "273.15", when: { mode: ["gas"] }, help: "En kelvin: T = °C + 273.15." },
    { id: "Q", label: "Calor Q", unit: "J", type: "number", when: { mode: ["heat"] }, help: "Introduce solo tres valores de Q, m, c y ΔT." },
    { id: "m", label: "Masa m", unit: "kg", type: "number", when: { mode: ["heat"] } },
    { id: "c", label: "Calor específico c", unit: "J/(kg·K)", type: "number", default: "4186", when: { mode: ["heat"] }, help: "Para el agua 4186 J/(kg·K)." },
    { id: "dT", label: "Variación de temperatura ΔT", unit: "K", type: "number", default: "10", when: { mode: ["heat"] }, help: "Negativo en el enfriamiento." },
    { id: "alpha", label: "Coeficiente de dilatación α", unit: "1/K", type: "number", default: "12e-6", when: { mode: ["expansion"] }, help: "El acero tiene alrededor de 12e-6 /K." },
    { id: "L0", label: "Longitud inicial L0", unit: "m", type: "number", default: "1", when: { mode: ["expansion"] } },
    { id: "dTx", label: "Variación de temperatura ΔT", unit: "K", type: "number", default: "100", when: { mode: ["expansion"] } }
  ],
  example: {
    values: { mode: "gas", P: "101.325", V: "", n: "1", T: "273.15", Q: "", m: "", c: "4186", dT: "", alpha: "12e-6", L0: "1", dTx: "100" },
    expect: ["V = 22.41 L"],
    note: "Ejemplo: un mol de gas a 273.15 K y 101.325 kPa ocupa unos 22.41 L."
  },
  invalid: { values: { mode: "gas", P: "101.325", V: "22.4", n: "1", T: "273.15", Q: "", m: "", c: "4186", dT: "", alpha: "12e-6", L0: "1", dTx: "100" } },
  related: ["formulas-constants", "unit-converter", "work-energy", "standard-resistor-values"]
};

function threeOfFour(input, keys, name) {
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : keys.find((k) => isBlank(input[k]));
    fail(`Introduce exactamente tres valores de ${name} (introdujiste ${given.length}).`, field);
  }
  return keys.find((k) => !given.includes(k));
}

function gas(input) {
  const keys = ["P", "V", "n", "T"];
  const unknown = threeOfFour(input, keys, "P, V, n y T");
  const x = {};
  for (const k of keys) if (k !== unknown) x[k] = num(input, k, GAS[k], { positive: true });
  const v = { ...x };
  v[unknown] = unknown === "P" ? v.n * R * v.T / v.V
    : unknown === "V" ? v.n * R * v.T / v.P
    : unknown === "n" ? v.P * v.V / (R * v.T)
    : v.P * v.V / (v.n * R);
  const tex = {
    P: `P = \\frac{nRT}{V} = \\frac{${ntex(v.n)} \\times 8.314 \\times ${ntex(v.T)}}{${ntex(v.V)}} = ${ntex(v.P, 6)}\\ kPa`,
    V: `V = \\frac{nRT}{P} = \\frac{${ntex(v.n)} \\times 8.314 \\times ${ntex(v.T)}}{${ntex(v.P)}} = ${ntex(v.V, 6)}\\ L`,
    n: `n = \\frac{PV}{RT} = \\frac{${ntex(v.P)} \\times ${ntex(v.V)}}{8.314 \\times ${ntex(v.T)}} = ${ntex(v.n, 6)}\\ mol`,
    T: `T = \\frac{PV}{nR} = \\frac{${ntex(v.P)} \\times ${ntex(v.V)}}{${ntex(v.n)} \\times 8.314} = ${ntex(v.T, 6)}\\ K`
  }[unknown];
  return {
    results: keys.map((k) => ({ label: GAS[k], value: `${fmt(v[k], 4)} ${GAS_UNIT[k]}` })),
    steps: [
      { text: "Ley de los gases ideales con R = 8.314 kPa·L/(mol·K):", tex: "PV = nRT" },
      { text: `Calculamos ${GAS[unknown]}:`, tex }
    ],
    copy: `${unknown} = ${fmt(v[unknown], 4)} ${GAS_UNIT[unknown]} (P = ${fmt(v.P, 4)} kPa, V = ${fmt(v.V, 4)} L, n = ${fmt(v.n, 4)} mol, T = ${fmt(v.T, 4)} K)`
  };
}

function heat(input) {
  const keys = ["Q", "m", "c", "dT"];
  const unknown = threeOfFour(input, keys, "Q, m, c y ΔT");
  const x = {};
  for (const k of keys) if (k !== unknown) x[k] = num(input, k, HEAT[k], HEAT_OPTS[k]);
  const v = { ...x };
  if (unknown === "Q") v.Q = v.m * v.c * v.dT;
  if (unknown === "m") {
    if (v.dT === 0) fail("No se puede calcular la masa cuando ΔT = 0.", "dT");
    v.m = v.Q / (v.c * v.dT);
  }
  if (unknown === "c") {
    if (v.dT === 0) fail("No se puede calcular la capacidad calorífica cuando ΔT = 0.", "dT");
    v.c = v.Q / (v.m * v.dT);
  }
  if (unknown === "dT") v.dT = v.Q / (v.m * v.c);
  const tex = {
    Q: `Q = mc\\Delta T = ${ntex(v.m)} \\times ${ntex(v.c)} \\times ${ntex(v.dT)} = ${ntex(v.Q, 6)}\\ J`,
    m: `m = \\frac{Q}{c\\Delta T} = \\frac{${ntex(v.Q)}}{${ntex(v.c)} \\times ${ntex(v.dT)}} = ${ntex(v.m, 6)}\\ kg`,
    c: `c = \\frac{Q}{m\\Delta T} = \\frac{${ntex(v.Q)}}{${ntex(v.m)} \\times ${ntex(v.dT)}} = ${ntex(v.c, 6)}\\ \\frac{J}{kg\\cdot K}`,
    dT: `\\Delta T = \\frac{Q}{mc} = \\frac{${ntex(v.Q)}}{${ntex(v.m)} \\times ${ntex(v.c)}} = ${ntex(v.dT, 6)}\\ K`
  }[unknown];
  return {
    results: keys.map((k) => ({ label: HEAT[k], value: `${fmt(v[k], 4)} ${HEAT_UNIT[k]}` })),
    steps: [
      { text: "Calor absorbido o cedido:", tex: "Q = mc\\Delta T" },
      { text: `Calculamos ${HEAT[unknown]}:`, tex }
    ],
    copy: `${unknown} = ${fmt(v[unknown], 4)} ${HEAT_UNIT[unknown]}`
  };
}

function expansion(input) {
  const alpha = num(input, "alpha", "Coeficiente de dilatación α", { positive: true });
  const L0 = num(input, "L0", "Longitud inicial L0", { positive: true });
  const dT = num(input, "dTx", "Variación de temperatura ΔT");
  const dL = alpha * L0 * dT;
  const L = L0 + dL;
  return {
    results: [
      { label: "Variación de longitud ΔL", value: eng(dL, "m", 4) },
      { label: "Longitud final L", value: `${fmt(L, 6)} m` }
    ],
    steps: [
      { text: "Variación de longitud:", tex: `\\Delta L = \\alpha L_0\\Delta T = ${ntex(alpha)} \\times ${ntex(L0)} \\times ${ntex(dT)} = ${ntex(dL, 6)}\\ m` },
      { text: "Longitud final:", tex: `L = L_0 + \\Delta L = ${ntex(L0)} + ${ntex(dL, 6)} = ${ntex(L, 6)}\\ m` }
    ],
    copy: `ΔL = ${eng(dL, "m", 4)}, L = ${fmt(L, 6)} m`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["gas", "heat", "expansion"], "gas");
  if (mode === "heat") return heat(input);
  if (mode === "expansion") return expansion(input);
  return gas(input);
}
