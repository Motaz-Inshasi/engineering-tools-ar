import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calcule la tensión, la corriente, la resistencia o la potencia a partir de dos valores conocidos, con la ley de Ohm y la ley de potencias, con los pasos y las unidades de ingeniería.",
  keywords: ["Ley de Ohm", "ohm", "tensión", "corriente", "resistencia", "potencia", "vatio", "voltio", "amperio"],
  formulas: [
    { label: "Ley de Ohm", tex: "V = I R" },
    { label: "Potencia", tex: "P = V I = I^2 R = \\frac{V^2}{R}" }
  ],
  inputs: [
    { id: "V", label: "Tensión V", unit: "V", type: "number", help: "Deje dos campos vacíos e introduzca solo dos." },
    { id: "I", label: "Corriente I", unit: "A", type: "number", default: "20m", help: "Puede usar prefijos: m para mili, u para micro y k para kilo." },
    { id: "R", label: "Resistencia R", unit: "Ω", type: "number", default: "470" },
    { id: "P", label: "Potencia P", unit: "W", type: "number" }
  ],
  example: { values: { V: "", I: "20m", R: "470", P: "" }, expect: ["V = 9.4 V", "P = 188 mW"], note: "Ejemplo: corriente de 20 mA en una resistencia de 470 Ω." },
  invalid: { values: { V: "5", I: "1", R: "5", P: "" } },
  related: ["series-parallel-resistors", "voltage-current-divider", "led-resistor", "shunt-resistor"]
};

export function solve(input) {
  const given = ["V", "I", "R", "P"].filter((k) => !isBlank(input[k]));
  if (given.length !== 2) fail(`Introduzca solo dos de los cuatro valores (introdujo ${given.length}).`, given.length > 2 ? given[2] : ["V", "I", "R", "P"].find((k) => isBlank(input[k])));
  const v = {};
  for (const k of given) v[k] = num(input, k, { V: "Tensión", I: "Corriente", R: "Resistencia", P: "Potencia" }[k], k === "R" ? { positive: true } : k === "P" ? { nonNegative: true } : {});
  const steps = [];
  const key = given.sort().join("");
  const T = (x) => ntex(x, 6);
  switch (key) {
    case "IV":
      if (v.I === 0) fail("La corriente es cero, por lo que no se puede calcular la resistencia.", "I");
      v.R = v.V / v.I; v.P = v.V * v.I;
      if (!(v.R > 0)) fail("La tensión y la corriente deben tener el mismo signo para una resistencia positiva.", "I");
      steps.push({ text: "Por la ley de Ohm:", tex: `R = \\frac{V}{I} = \\frac{${T(v.V)}}{${T(v.I)}} = ${T(v.R)}\\ \\Omega` });
      steps.push({ text: "Potencia:", tex: `P = VI = ${T(v.V)} \\times ${T(v.I)} = ${T(v.P)}\\ W` });
      break;
    case "RV":
      v.I = v.V / v.R; v.P = (v.V * v.V) / v.R;
      steps.push({ text: "Por la ley de Ohm:", tex: `I = \\frac{V}{R} = \\frac{${T(v.V)}}{${T(v.R)}} = ${T(v.I)}\\ A` });
      steps.push({ text: "Potencia:", tex: `P = \\frac{V^2}{R} = ${T(v.P)}\\ W` });
      break;
    case "IR":
      v.V = v.I * v.R; v.P = v.I * v.I * v.R;
      steps.push({ text: "Por la ley de Ohm:", tex: `V = IR = ${T(v.I)} \\times ${T(v.R)} = ${T(v.V)}\\ V` });
      steps.push({ text: "Potencia:", tex: `P = I^2 R = ${T(v.P)}\\ W` });
      break;
    case "PV":
      if (v.V === 0) fail("La tensión es cero, por lo que no se puede calcular la corriente a partir de la potencia.", "V");
      v.I = v.P / v.V; v.R = (v.V * v.V) / v.P;
      if (v.P === 0) fail("Potencia cero con tensión no nula implica resistencia infinita.", "P");
      steps.push({ text: "Por la ley de potencia:", tex: `I = \\frac{P}{V} = ${T(v.I)}\\ A,\\qquad R = \\frac{V^2}{P} = ${T(v.R)}\\ \\Omega` });
      break;
    case "IP":
      if (v.I === 0) fail("La corriente es cero, por lo que no se puede calcular la tensión a partir de la potencia.", "I");
      if (v.P === 0) fail("Potencia cero con corriente no nula implica resistencia nula.", "P");
      v.V = v.P / v.I; v.R = v.P / (v.I * v.I);
      steps.push({ text: "Por la ley de potencia:", tex: `V = \\frac{P}{I} = ${T(v.V)}\\ V,\\qquad R = \\frac{P}{I^2} = ${T(v.R)}\\ \\Omega` });
      break;
    case "PR":
      v.V = Math.sqrt(v.P * v.R); v.I = Math.sqrt(v.P / v.R);
      steps.push({ text: "Por la ley de potencia (tomamos la raíz positiva):", tex: `V = \\sqrt{PR} = ${T(v.V)}\\ V,\\qquad I = \\sqrt{\\frac{P}{R}} = ${T(v.I)}\\ A` });
      break;
  }
  steps.push({ text: "Comprobación:", tex: `V - IR = ${T(v.V - v.I * v.R)},\\quad P - VI = ${T(v.P - v.V * v.I)}` });
  const out = { V: eng(v.V, "V"), I: eng(v.I, "A"), R: eng(v.R, "Ω"), P: eng(v.P, "W") };
  return {
    results: [
      { label: "Tensión V", value: out.V, text: `V = ${out.V}` },
      { label: "Corriente I", value: out.I, text: `I = ${out.I}` },
      { label: "Resistencia R", value: out.R, text: `R = ${out.R}` },
      { label: "Potencia P", value: out.P, text: `P = ${out.P}` }
    ],
    steps, values: v
  };
}
