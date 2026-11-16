import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculez la tension, le courant, la résistance ou la puissance à partir de deux valeurs connues, avec la loi d'Ohm et la loi de puissance, avec les étapes et les unités techniques.",
  keywords: ["Loi d'Ohm", "ohm", "tension", "courant", "résistance", "puissance", "watt", "volt", "ampère"],
  formulas: [
    { label: "Loi d'Ohm", tex: "V = I R" },
    { label: "Puissance", tex: "P = V I = I^2 R = \\frac{V^2}{R}" }
  ],
  inputs: [
    { id: "V", label: "Tension V", unit: "V", type: "number", help: "Laissez deux champs vides et saisissez-en seulement deux." },
    { id: "I", label: "Courant I", unit: "A", type: "number", default: "20m", help: "Vous pouvez utiliser les préfixes : m pour milli, u pour micro, k pour kilo." },
    { id: "R", label: "Résistance R", unit: "Ω", type: "number", default: "470" },
    { id: "P", label: "Puissance P", unit: "W", type: "number" }
  ],
  example: { values: { V: "", I: "20m", R: "470", P: "" }, expect: ["V = 9.4 V", "P = 188 mW"], note: "Exemple : courant de 20 mA dans une résistance de 470 Ω." },
  invalid: { values: { V: "5", I: "1", R: "5", P: "" } },
  related: ["series-parallel-resistors", "voltage-current-divider", "led-resistor", "shunt-resistor"]
};

export function solve(input) {
  const given = ["V", "I", "R", "P"].filter((k) => !isBlank(input[k]));
  if (given.length !== 2) fail(`Saisissez seulement deux valeurs sur quatre (vous en avez saisi ${given.length}).`, given.length > 2 ? given[2] : ["V", "I", "R", "P"].find((k) => isBlank(input[k])));
  const v = {};
  for (const k of given) v[k] = num(input, k, { V: "Tension", I: "Courant", R: "Résistance", P: "Puissance" }[k], k === "R" ? { positive: true } : k === "P" ? { nonNegative: true } : {});
  const steps = [];
  const key = given.sort().join("");
  const T = (x) => ntex(x, 6);
  switch (key) {
    case "IV":
      if (v.I === 0) fail("Le courant est nul : la résistance ne peut pas être calculée.", "I");
      v.R = v.V / v.I; v.P = v.V * v.I;
      if (!(v.R > 0)) fail("La tension et le courant doivent avoir le même signe pour une résistance positive.", "I");
      steps.push({ text: "D'après la loi d'Ohm :", tex: `R = \\frac{V}{I} = \\frac{${T(v.V)}}{${T(v.I)}} = ${T(v.R)}\\ \\Omega` });
      steps.push({ text: "Puissance :", tex: `P = VI = ${T(v.V)} \\times ${T(v.I)} = ${T(v.P)}\\ W` });
      break;
    case "RV":
      v.I = v.V / v.R; v.P = (v.V * v.V) / v.R;
      steps.push({ text: "D'après la loi d'Ohm :", tex: `I = \\frac{V}{R} = \\frac{${T(v.V)}}{${T(v.R)}} = ${T(v.I)}\\ A` });
      steps.push({ text: "Puissance :", tex: `P = \\frac{V^2}{R} = ${T(v.P)}\\ W` });
      break;
    case "IR":
      v.V = v.I * v.R; v.P = v.I * v.I * v.R;
      steps.push({ text: "D'après la loi d'Ohm :", tex: `V = IR = ${T(v.I)} \\times ${T(v.R)} = ${T(v.V)}\\ V` });
      steps.push({ text: "Puissance :", tex: `P = I^2 R = ${T(v.P)}\\ W` });
      break;
    case "PV":
      if (v.V === 0) fail("La tension est nulle : le courant ne peut pas être calculé à partir de la puissance.", "V");
      v.I = v.P / v.V; v.R = (v.V * v.V) / v.P;
      if (v.P === 0) fail("Une puissance nulle avec une tension non nulle signifie une résistance infinie.", "P");
      steps.push({ text: "D'après la loi de puissance :", tex: `I = \\frac{P}{V} = ${T(v.I)}\\ A,\\qquad R = \\frac{V^2}{P} = ${T(v.R)}\\ \\Omega` });
      break;
    case "IP":
      if (v.I === 0) fail("Le courant est nul : la tension ne peut pas être calculée à partir de la puissance.", "I");
      if (v.P === 0) fail("Une puissance nulle avec un courant non nul signifie une résistance nulle.", "P");
      v.V = v.P / v.I; v.R = v.P / (v.I * v.I);
      steps.push({ text: "D'après la loi de puissance :", tex: `V = \\frac{P}{I} = ${T(v.V)}\\ V,\\qquad R = \\frac{P}{I^2} = ${T(v.R)}\\ \\Omega` });
      break;
    case "PR":
      v.V = Math.sqrt(v.P * v.R); v.I = Math.sqrt(v.P / v.R);
      steps.push({ text: "D'après la loi de puissance (on prend la racine positive) :", tex: `V = \\sqrt{PR} = ${T(v.V)}\\ V,\\qquad I = \\sqrt{\\frac{P}{R}} = ${T(v.I)}\\ A` });
      break;
  }
  steps.push({ text: "Vérification :", tex: `V - IR = ${T(v.V - v.I * v.R)},\\quad P - VI = ${T(v.P - v.V * v.I)}` });
  const out = { V: eng(v.V, "V"), I: eng(v.I, "A"), R: eng(v.R, "Ω"), P: eng(v.P, "W") };
  return {
    results: [
      { label: "Tension V", value: out.V, text: `V = ${out.V}` },
      { label: "Courant I", value: out.I, text: `I = ${out.I}` },
      { label: "Résistance R", value: out.R, text: `R = ${out.R}` },
      { label: "Puissance P", value: out.P, text: `P = ${out.P}` }
    ],
    steps, values: v
  };
}
