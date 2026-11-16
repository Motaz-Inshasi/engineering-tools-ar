import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const GAS = { P: "الضغط P", V: "الحجم V", n: "عدد المولات n", T: "درجة الحرارة T" };
const GAS_UNIT = { P: "kPa", V: "L", n: "mol", T: "K" };
const HEAT = { Q: "الحرارة Q", m: "الكتلة m", c: "السعة الحرارية النوعية c", dT: "التغير في الحرارة ΔT" };
const HEAT_UNIT = { Q: "J", m: "kg", c: "J/(kg·K)", dT: "K" };
const HEAT_OPTS = { Q: {}, m: { positive: true }, c: { positive: true }, dT: {} };

export const meta = {
  description: "احسب أي كمية رابعة من قانون الغاز المثالي PV = nRT، أو الحرارة المكتسبة Q = mcΔT من ثلاث قيم معلومة، أو زيادة طول مادة بالتمدد الحراري مع الطول النهائي.",
  keywords: ["قانون الغاز المثالي", "PV = nRT", "ضغط", "حجم", "مولات", "حرارة نوعية", "السعة الحرارية", "تمدد حراري", "معامل التمدد", "ideal gas", "heat", "expansion"],
  formulas: [
    { label: "قانون الغاز المثالي", tex: "PV = nRT,\\qquad R = 8.314\\ \\frac{kPa\\cdot L}{mol\\cdot K}" },
    { label: "الحرارة المكتسبة", tex: "Q = m\\,c\\,\\Delta T" },
    { label: "التمدد الطولي", tex: "\\Delta L = \\alpha L_0\\,\\Delta T,\\qquad L = L_0 + \\Delta L" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "gas", options: [["gas", "قانون الغاز المثالي PV = nRT"], ["heat", "الحرارة المكتسبة Q = mcΔT"], ["expansion", "التمدد الطولي ΔL = αL0ΔT"]] },
    { id: "P", label: "الضغط P", unit: "kPa", type: "number", default: "101.325", when: { mode: ["gas"] }, help: "أدخل ثلاث قيم فقط من P وV وn وT." },
    { id: "V", label: "الحجم V", unit: "L", type: "number", when: { mode: ["gas"] } },
    { id: "n", label: "عدد المولات n", unit: "mol", type: "number", default: "1", when: { mode: ["gas"] } },
    { id: "T", label: "درجة الحرارة T", unit: "K", type: "number", default: "273.15", when: { mode: ["gas"] }, help: "بالكلفن: T = °C + 273.15." },
    { id: "Q", label: "الحرارة Q", unit: "J", type: "number", when: { mode: ["heat"] }, help: "أدخل ثلاث قيم فقط من Q وm وc وΔT." },
    { id: "m", label: "الكتلة m", unit: "kg", type: "number", when: { mode: ["heat"] } },
    { id: "c", label: "السعة الحرارية النوعية c", unit: "J/(kg·K)", type: "number", default: "4186", when: { mode: ["heat"] }, help: "للماء 4186 J/(kg·K)." },
    { id: "dT", label: "التغير في الحرارة ΔT", unit: "K", type: "number", default: "10", when: { mode: ["heat"] }, help: "سالب عند التبريد." },
    { id: "alpha", label: "معامل التمدد α", unit: "1/K", type: "number", default: "12e-6", when: { mode: ["expansion"] }, help: "الفولاذ حوالي 12e-6 /K." },
    { id: "L0", label: "الطول الأصلي L0", unit: "m", type: "number", default: "1", when: { mode: ["expansion"] } },
    { id: "dTx", label: "التغير في الحرارة ΔT", unit: "K", type: "number", default: "100", when: { mode: ["expansion"] } }
  ],
  example: {
    values: { mode: "gas", P: "101.325", V: "", n: "1", T: "273.15", Q: "", m: "", c: "4186", dT: "", alpha: "12e-6", L0: "1", dTx: "100" },
    expect: ["V = 22.41 L"],
    note: "مثال: مول واحد من غاز عند 273.15 K وضغط 101.325 kPa يشغل حوالي 22.41 L."
  },
  invalid: { values: { mode: "gas", P: "101.325", V: "22.4", n: "1", T: "273.15", Q: "", m: "", c: "4186", dT: "", alpha: "12e-6", L0: "1", dTx: "100" } },
  related: ["formulas-constants", "unit-converter", "work-energy", "standard-resistor-values"]
};

function threeOfFour(input, keys, name) {
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : keys.find((k) => isBlank(input[k]));
    fail(`أدخل ثلاث قيم بالضبط من ${name} (أدخلت ${given.length}).`, field);
  }
  return keys.find((k) => !given.includes(k));
}

function gas(input) {
  const keys = ["P", "V", "n", "T"];
  const unknown = threeOfFour(input, keys, "P وV وn وT");
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
      { text: "قانون الغاز المثالي مع R = 8.314 kPa·L/(mol·K):", tex: "PV = nRT" },
      { text: `نحسب ${GAS[unknown]}:`, tex }
    ],
    copy: `${unknown} = ${fmt(v[unknown], 4)} ${GAS_UNIT[unknown]} (P = ${fmt(v.P, 4)} kPa, V = ${fmt(v.V, 4)} L, n = ${fmt(v.n, 4)} mol, T = ${fmt(v.T, 4)} K)`
  };
}

function heat(input) {
  const keys = ["Q", "m", "c", "dT"];
  const unknown = threeOfFour(input, keys, "Q وm وc وΔT");
  const x = {};
  for (const k of keys) if (k !== unknown) x[k] = num(input, k, HEAT[k], HEAT_OPTS[k]);
  const v = { ...x };
  if (unknown === "Q") v.Q = v.m * v.c * v.dT;
  if (unknown === "m") {
    if (v.dT === 0) fail("لا يمكن حساب الكتلة عندما يكون ΔT = 0.", "dT");
    v.m = v.Q / (v.c * v.dT);
  }
  if (unknown === "c") {
    if (v.dT === 0) fail("لا يمكن حساب السعة الحرارية عندما يكون ΔT = 0.", "dT");
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
      { text: "الحرارة المكتسبة أو المفقودة:", tex: "Q = mc\\Delta T" },
      { text: `نحسب ${HEAT[unknown]}:`, tex }
    ],
    copy: `${unknown} = ${fmt(v[unknown], 4)} ${HEAT_UNIT[unknown]}`
  };
}

function expansion(input) {
  const alpha = num(input, "alpha", "معامل التمدد α", { positive: true });
  const L0 = num(input, "L0", "الطول الأصلي L0", { positive: true });
  const dT = num(input, "dTx", "التغير في الحرارة ΔT");
  const dL = alpha * L0 * dT;
  const L = L0 + dL;
  return {
    results: [
      { label: "التغير في الطول ΔL", value: eng(dL, "m", 4) },
      { label: "الطول النهائي L", value: `${fmt(L, 6)} m` }
    ],
    steps: [
      { text: "التغير في الطول:", tex: `\\Delta L = \\alpha L_0\\Delta T = ${ntex(alpha)} \\times ${ntex(L0)} \\times ${ntex(dT)} = ${ntex(dL, 6)}\\ m` },
      { text: "الطول النهائي:", tex: `L = L_0 + \\Delta L = ${ntex(L0)} + ${ntex(dL, 6)} = ${ntex(L, 6)}\\ m` }
    ],
    copy: `ΔL = ${eng(dL, "m", 4)}, L = ${fmt(L, 6)} m`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["gas", "heat", "expansion"], "gas");
  if (mode === "heat") return heat(input);
  if (mode === "expansion") return expansion(input);
  return gas(input);
}
