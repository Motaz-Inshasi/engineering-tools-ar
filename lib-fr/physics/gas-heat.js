import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const GAS = { P: "Pression P", V: "Volume V", n: "Nombre de moles n", T: "Température T" };
const GAS_UNIT = { P: "kPa", V: "L", n: "mol", T: "K" };
const HEAT = { Q: "Chaleur Q", m: "Masse m", c: "Capacité thermique massique c", dT: "Variation de température ΔT" };
const HEAT_UNIT = { Q: "J", m: "kg", c: "J/(kg·K)", dT: "K" };
const HEAT_OPTS = { Q: {}, m: { positive: true }, c: { positive: true }, dT: {} };

export const meta = {
  description: "Calcule une quatrième grandeur à partir de la loi des gaz parfaits PV = nRT, ou la chaleur gagnée Q = mcΔT à partir de trois valeurs connues, ou l'allongement d'un matériau par dilatation thermique à partir de sa longueur finale.",
  keywords: ["loi des gaz parfaits", "PV = nRT", "pression", "volume", "moles", "chaleur massique", "capacité thermique", "dilatation thermique", "coefficient de dilatation", "ideal gas", "heat", "expansion"],
  formulas: [
    { label: "loi des gaz parfaits", tex: "PV = nRT,\\qquad R = 8.314\\ \\frac{kPa\\cdot L}{mol\\cdot K}" },
    { label: "Chaleur gagnée", tex: "Q = m\\,c\\,\\Delta T" },
    { label: "Dilatation linéaire", tex: "\\Delta L = \\alpha L_0\\,\\Delta T,\\qquad L = L_0 + \\Delta L" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "gas", options: [["gas", "Loi des gaz parfaits PV = nRT"], ["heat", "Chaleur gagnée Q = mcΔT"], ["expansion", "Dilatation linéaire ΔL = αL0ΔT"]] },
    { id: "P", label: "Pression P", unit: "kPa", type: "number", default: "101.325", when: { mode: ["gas"] }, help: "Saisissez uniquement trois valeurs parmi P, V, n et T." },
    { id: "V", label: "Volume V", unit: "L", type: "number", when: { mode: ["gas"] } },
    { id: "n", label: "Nombre de moles n", unit: "mol", type: "number", default: "1", when: { mode: ["gas"] } },
    { id: "T", label: "Température T", unit: "K", type: "number", default: "273.15", when: { mode: ["gas"] }, help: "En kelvin : T = °C + 273.15." },
    { id: "Q", label: "Chaleur Q", unit: "J", type: "number", when: { mode: ["heat"] }, help: "Saisissez uniquement trois valeurs parmi Q, m, c et ΔT." },
    { id: "m", label: "Masse m", unit: "kg", type: "number", when: { mode: ["heat"] } },
    { id: "c", label: "Capacité thermique massique c", unit: "J/(kg·K)", type: "number", default: "4186", when: { mode: ["heat"] }, help: "Pour l'eau 4186 J/(kg·K)." },
    { id: "dT", label: "Variation de température ΔT", unit: "K", type: "number", default: "10", when: { mode: ["heat"] }, help: "Négatif en cas de refroidissement." },
    { id: "alpha", label: "Coefficient de dilatation α", unit: "1/K", type: "number", default: "12e-6", when: { mode: ["expansion"] }, help: "L'acier vaut environ 12e-6 /K." },
    { id: "L0", label: "Longueur initiale L0", unit: "m", type: "number", default: "1", when: { mode: ["expansion"] } },
    { id: "dTx", label: "Variation de température ΔT", unit: "K", type: "number", default: "100", when: { mode: ["expansion"] } }
  ],
  example: {
    values: { mode: "gas", P: "101.325", V: "", n: "1", T: "273.15", Q: "", m: "", c: "4186", dT: "", alpha: "12e-6", L0: "1", dTx: "100" },
    expect: ["V = 22.41 L"],
    note: "Exemple : une mole de gaz à 273.15 K et 101.325 kPa occupe environ 22.41 L."
  },
  invalid: { values: { mode: "gas", P: "101.325", V: "22.4", n: "1", T: "273.15", Q: "", m: "", c: "4186", dT: "", alpha: "12e-6", L0: "1", dTx: "100" } },
  related: ["formulas-constants", "unit-converter", "work-energy", "standard-resistor-values"]
};

function threeOfFour(input, keys, name) {
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : keys.find((k) => isBlank(input[k]));
    fail(`Saisissez exactement trois valeurs parmi ${name} (vous en avez saisi ${given.length}).`, field);
  }
  return keys.find((k) => !given.includes(k));
}

function gas(input) {
  const keys = ["P", "V", "n", "T"];
  const unknown = threeOfFour(input, keys, "P, V, n et T");
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
      { text: "Loi des gaz parfaits avec R = 8.314 kPa·L/(mol·K) :", tex: "PV = nRT" },
      { text: `Calcul de ${GAS[unknown]} :`, tex }
    ],
    copy: `${unknown} = ${fmt(v[unknown], 4)} ${GAS_UNIT[unknown]} (P = ${fmt(v.P, 4)} kPa, V = ${fmt(v.V, 4)} L, n = ${fmt(v.n, 4)} mol, T = ${fmt(v.T, 4)} K)`
  };
}

function heat(input) {
  const keys = ["Q", "m", "c", "dT"];
  const unknown = threeOfFour(input, keys, "Q, m, c et ΔT");
  const x = {};
  for (const k of keys) if (k !== unknown) x[k] = num(input, k, HEAT[k], HEAT_OPTS[k]);
  const v = { ...x };
  if (unknown === "Q") v.Q = v.m * v.c * v.dT;
  if (unknown === "m") {
    if (v.dT === 0) fail("Impossible de calculer la masse lorsque ΔT = 0.", "dT");
    v.m = v.Q / (v.c * v.dT);
  }
  if (unknown === "c") {
    if (v.dT === 0) fail("Impossible de calculer la capacité thermique lorsque ΔT = 0.", "dT");
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
      { text: "Chaleur gagnée ou perdue :", tex: "Q = mc\\Delta T" },
      { text: `Calcul de ${HEAT[unknown]} :`, tex }
    ],
    copy: `${unknown} = ${fmt(v[unknown], 4)} ${HEAT_UNIT[unknown]}`
  };
}

function expansion(input) {
  const alpha = num(input, "alpha", "Coefficient de dilatation α", { positive: true });
  const L0 = num(input, "L0", "Longueur initiale L0", { positive: true });
  const dT = num(input, "dTx", "Variation de température ΔT");
  const dL = alpha * L0 * dT;
  const L = L0 + dL;
  return {
    results: [
      { label: "Variation de longueur ΔL", value: eng(dL, "m", 4) },
      { label: "Longueur finale L", value: `${fmt(L, 6)} m` }
    ],
    steps: [
      { text: "Variation de longueur :", tex: `\\Delta L = \\alpha L_0\\Delta T = ${ntex(alpha)} \\times ${ntex(L0)} \\times ${ntex(dT)} = ${ntex(dL, 6)}\\ m` },
      { text: "Longueur finale :", tex: `L = L_0 + \\Delta L = ${ntex(L0)} + ${ntex(dL, 6)} = ${ntex(L, 6)}\\ m` }
    ],
    copy: `ΔL = ${eng(dL, "m", 4)}, L = ${fmt(L, 6)} m`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["gas", "heat", "expansion"], "gas");
  if (mode === "heat") return heat(input);
  if (mode === "expansion") return expansion(input);
  return gas(input);
}
