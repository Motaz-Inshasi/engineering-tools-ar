import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculez la capacité équivalente de condensateurs ou l'inductance équivalente de bobines en série ou en parallèle, avec la répartition de la tension, de la charge et de l'énergie entre les condensateurs lors de l'application d'une tension.",
  keywords: ["Condensateurs en série", "Condensateurs en parallèle", "Capacité équivalente", "Bobines", "Inductance équivalente", "capacitors", "inductors", "Énergie du condensateur"],
  formulas: [
    { label: "Condensateurs (à l'inverse des résistances)", tex: "C_{par} = \\sum C_i,\\qquad \\frac{1}{C_{ser}} = \\sum\\frac{1}{C_i}" },
    { label: "Bobines sans inductance mutuelle (comme les résistances)", tex: "L_{ser} = \\sum L_i,\\qquad \\frac{1}{L_{par}} = \\sum\\frac{1}{L_i}" }
  ],
  inputs: [
    { id: "kind", label: "Type", type: "select", default: "C", options: [["C", "Condensateurs"], ["L", "Bobines"]] },
    { id: "mode", label: "Montage", type: "select", default: "series", options: [["series", "Série"], ["parallel", "Parallèle"]] },
    { id: "list", label: "Valeurs (F ou H)", type: "text", default: "10u, 22u, 47u", wide: true, help: "Par exemple 10u, 22u ou 4.7n." },
    { id: "V", label: "Tension totale (facultatif, pour les condensateurs)", unit: "V", type: "number", default: "12", when: { kind: ["C"] } }
  ],
  example: { values: { kind: "C", mode: "series", list: "10u, 22u, 47u", V: "12" }, expect: ["Ceq = 5.998 µF"], note: "Exemple : trois condensateurs en série sous 12 V." },
  invalid: { values: { kind: "C", mode: "series", list: "10u, 0", V: "" } },
  related: ["series-parallel-resistors", "impedance", "resonance", "timer-555"]
};

export function equivalent(kind, mode, list) {
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const inv = (a) => 1 / a.reduce((s, x) => s + 1 / x, 0);
  if (kind === "C") return mode === "parallel" ? sum(list) : inv(list);
  return mode === "series" ? sum(list) : inv(list);
}

export function solve(input) {
  const kind = choice(input, "kind", "Type", ["C", "L"], "C");
  const mode = choice(input, "mode", "Montage", ["series", "parallel"], "series");
  const list = numList(input, "list", "Valeurs", { positive: true, max: 40 });
  const eq = equivalent(kind, mode, list);
  const unit = kind === "C" ? "F" : "H";
  const sym = kind === "C" ? "C" : "L";
  const reciprocal = (kind === "C" && mode === "series") || (kind === "L" && mode === "parallel");
  const steps = [reciprocal
    ? { text: `${kind === "C" ? "Condensateurs en série" : "Bobines en parallèle"} : on additionne les inverses.`, tex: `\\frac{1}{${sym}_{eq}} = ${list.map((x) => `\\frac{1}{${ntex(x)}}`).join(" + ")} \\Rightarrow ${sym}_{eq} = ${ntex(eq, 6)}\\ ${unit}` }
    : { text: `${kind === "C" ? "Condensateurs en parallèle" : "Bobines en série"} : on additionne directement les valeurs.`, tex: `${sym}_{eq} = ${list.map((x) => ntex(x)).join(" + ")} = ${ntex(eq, 6)}\\ ${unit}` }];
  const results = [{ label: kind === "C" ? "Capacité équivalente" : "Inductance équivalente", value: eng(eq, unit, 4), text: `${sym}eq = ${eng(eq, unit, 4)}` }];
  const blocks = [];
  if (kind === "C") {
    const V = num(input, "V", "Tension", { optional: true });
    if (V !== null) {
      if (V === 0) fail("Tension nulle ; laissez vide si elle n'est pas nécessaire.", "V");
      const Q = eq * V;
      results.push({ label: "Charge totale", value: eng(Q, "C", 4) }, { label: "Énergie stockée", value: eng(0.5 * eq * V * V, "J", 4) });
      const rows = list.map((c, k) => {
        const vk = mode === "series" ? Q / c : V, qk = c * vk;
        return [`C${k + 1}`, eng(c, "F"), eng(vk, "V", 4), eng(qk, "C", 4), eng(0.5 * c * vk * vk, "J", 4)];
      });
      blocks.push({ type: "table", caption: mode === "series" ? "En série : même charge, et la plus grande tension se trouve sur le plus petit condensateur" : "En parallèle : même tension, et la charge est proportionnelle à la capacité", head: ["Condensateur", "Capacité", "Tension", "Charge", "Énergie"], rows });
      steps.push({ text: "Charge totale et énergie :", tex: `Q = C_{eq}V = ${ntex(Q, 6)}\\ C,\\quad W = \\tfrac{1}{2}C_{eq}V^2 = ${ntex(0.5 * eq * V * V, 6)}\\ J` });
    }
  } else steps.push("On suppose qu'il n'y a pas d'inductance mutuelle entre les bobines (elles sont éloignées ou blindées).");
  return { results, blocks, steps, copy: `${sym}eq = ${eng(eq, unit, 4)}` };
}
