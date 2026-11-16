import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

const R = 8.314;
const GAS = { P: "دباؤ P", V: "حجم V", n: "مولز کی تعداد n", T: "درجۂ حرارت T" };
const GAS_UNIT = { P: "kPa", V: "L", n: "mol", T: "K" };
const HEAT = { Q: "حرارت Q", m: "کمیت m", c: "مخصوص حرارتی گنجائش c", dT: "درجۂ حرارت میں تبدیلی ΔT" };
const HEAT_UNIT = { Q: "J", m: "kg", c: "J/(kg·K)", dT: "K" };
const HEAT_OPTS = { Q: {}, m: { positive: true }, c: { positive: true }, dT: {} };

export const meta = {
  description: "مثالی گیس کے قانون PV = nRT سے کوئی چوتھی مقدار، یا تین معلوم قدروں سے حاصل شدہ حرارت Q = mcΔT، یا حرارتی پھیلاؤ سے کسی مادے کی لمبائی میں اضافہ اس کی آخری لمبائی کے ساتھ حساب کریں۔",
  keywords: ["مثالی گیس کا قانون", "PV = nRT", "دباؤ", "حجم", "مولز", "مخصوص حرارت", "حرارتی گنجائش", "حرارتی پھیلاؤ", "پھیلاؤ کا عامل", "ideal gas", "heat", "expansion"],
  formulas: [
    { label: "مثالی گیس کا قانون", tex: "PV = nRT,\\qquad R = 8.314\\ \\frac{kPa\\cdot L}{mol\\cdot K}" },
    { label: "حاصل شدہ حرارت", tex: "Q = m\\,c\\,\\Delta T" },
    { label: "طولی پھیلاؤ", tex: "\\Delta L = \\alpha L_0\\,\\Delta T,\\qquad L = L_0 + \\Delta L" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "gas", options: [["gas", "مثالی گیس کا قانون PV = nRT"], ["heat", "حاصل شدہ حرارت Q = mcΔT"], ["expansion", "طولی پھیلاؤ ΔL = αL0ΔT"]] },
    { id: "P", label: "دباؤ P", unit: "kPa", type: "number", default: "101.325", when: { mode: ["gas"] }, help: "P، V، n اور T میں سے صرف تین قدریں درج کریں۔" },
    { id: "V", label: "حجم V", unit: "L", type: "number", when: { mode: ["gas"] } },
    { id: "n", label: "مولز کی تعداد n", unit: "mol", type: "number", default: "1", when: { mode: ["gas"] } },
    { id: "T", label: "درجۂ حرارت T", unit: "K", type: "number", default: "273.15", when: { mode: ["gas"] }, help: "کیلون میں: T = °C + 273.15۔" },
    { id: "Q", label: "حرارت Q", unit: "J", type: "number", when: { mode: ["heat"] }, help: "Q، m، c اور ΔT میں سے صرف تین قدریں درج کریں۔" },
    { id: "m", label: "کمیت m", unit: "kg", type: "number", when: { mode: ["heat"] } },
    { id: "c", label: "مخصوص حرارتی گنجائش c", unit: "J/(kg·K)", type: "number", default: "4186", when: { mode: ["heat"] }, help: "پانی کے لیے: 4186 J/(kg·K)۔" },
    { id: "dT", label: "درجۂ حرارت میں تبدیلی ΔT", unit: "K", type: "number", default: "10", when: { mode: ["heat"] }, help: "ٹھنڈا ہونے کی صورت میں منفی۔" },
    { id: "alpha", label: "پھیلاؤ کا عامل α", unit: "1/K", type: "number", default: "12e-6", when: { mode: ["expansion"] }, help: "اسٹیل کے لیے تقریباً 12e-6 /K۔" },
    { id: "L0", label: "اصل لمبائی L0", unit: "m", type: "number", default: "1", when: { mode: ["expansion"] } },
    { id: "dTx", label: "درجۂ حرارت میں تبدیلی ΔT", unit: "K", type: "number", default: "100", when: { mode: ["expansion"] } }
  ],
  example: {
    values: { mode: "gas", P: "101.325", V: "", n: "1", T: "273.15", Q: "", m: "", c: "4186", dT: "", alpha: "12e-6", L0: "1", dTx: "100" },
    expect: ["V = 22.41 L"],
    note: "مثال: 273.15 K اور 101.325 kPa پر گیس کا ایک مول تقریباً 22.41 L جگہ گھیرتا ہے۔"
  },
  invalid: { values: { mode: "gas", P: "101.325", V: "22.4", n: "1", T: "273.15", Q: "", m: "", c: "4186", dT: "", alpha: "12e-6", L0: "1", dTx: "100" } },
  related: ["formulas-constants", "unit-converter", "work-energy", "standard-resistor-values"]
};

function threeOfFour(input, keys, name) {
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : keys.find((k) => isBlank(input[k]));
    fail(`${name} میں سے ٹھیک تین قدریں درج کریں (آپ نے ${given.length} درج کی ہیں)۔`, field);
  }
  return keys.find((k) => !given.includes(k));
}

function gas(input) {
  const keys = ["P", "V", "n", "T"];
  const unknown = threeOfFour(input, keys, "P، V، n اور T");
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
      { text: "R = 8.314 kPa·L/(mol·K) کے ساتھ مثالی گیس کا قانون:", tex: "PV = nRT" },
      { text: `ہم ${GAS[unknown]} حساب کرتے ہیں:`, tex }
    ],
    copy: `${unknown} = ${fmt(v[unknown], 4)} ${GAS_UNIT[unknown]} (P = ${fmt(v.P, 4)} kPa, V = ${fmt(v.V, 4)} L, n = ${fmt(v.n, 4)} mol, T = ${fmt(v.T, 4)} K)`
  };
}

function heat(input) {
  const keys = ["Q", "m", "c", "dT"];
  const unknown = threeOfFour(input, keys, "Q، m، c اور ΔT");
  const x = {};
  for (const k of keys) if (k !== unknown) x[k] = num(input, k, HEAT[k], HEAT_OPTS[k]);
  const v = { ...x };
  if (unknown === "Q") v.Q = v.m * v.c * v.dT;
  if (unknown === "m") {
    if (v.dT === 0) fail("جب ΔT = 0 ہو تو کمیت کا حساب نہیں لگایا جا سکتا۔", "dT");
    v.m = v.Q / (v.c * v.dT);
  }
  if (unknown === "c") {
    if (v.dT === 0) fail("جب ΔT = 0 ہو تو حرارتی گنجائش کا حساب نہیں لگایا جا سکتا۔", "dT");
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
      { text: "حاصل یا خارج ہونے والی حرارت:", tex: "Q = mc\\Delta T" },
      { text: `ہم ${HEAT[unknown]} حساب کرتے ہیں:`, tex }
    ],
    copy: `${unknown} = ${fmt(v[unknown], 4)} ${HEAT_UNIT[unknown]}`
  };
}

function expansion(input) {
  const alpha = num(input, "alpha", "پھیلاؤ کا عامل α", { positive: true });
  const L0 = num(input, "L0", "اصل لمبائی L0", { positive: true });
  const dT = num(input, "dTx", "درجۂ حرارت میں تبدیلی ΔT");
  const dL = alpha * L0 * dT;
  const L = L0 + dL;
  return {
    results: [
      { label: "لمبائی میں تبدیلی ΔL", value: eng(dL, "m", 4) },
      { label: "آخری لمبائی L", value: `${fmt(L, 6)} m` }
    ],
    steps: [
      { text: "لمبائی میں تبدیلی:", tex: `\\Delta L = \\alpha L_0\\Delta T = ${ntex(alpha)} \\times ${ntex(L0)} \\times ${ntex(dT)} = ${ntex(dL, 6)}\\ m` },
      { text: "آخری لمبائی:", tex: `L = L_0 + \\Delta L = ${ntex(L0)} + ${ntex(dL, 6)} = ${ntex(L, 6)}\\ m` }
    ],
    copy: `ΔL = ${eng(dL, "m", 4)}, L = ${fmt(L, 6)} m`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["gas", "heat", "expansion"], "gas");
  if (mode === "heat") return heat(input);
  if (mode === "expansion") return expansion(input);
  return gas(input);
}
