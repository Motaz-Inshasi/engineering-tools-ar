import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculez la résistance équivalente d'un ensemble de résistances en série ou en parallèle, avec la répartition de la tension ou du courant et de la puissance dans chaque résistance lorsque la tension de source est saisie.",
  keywords: ["Résistances en série", "Résistances en parallèle", "Résistance équivalente", "series", "parallel", "resistors", "Association de résistances"],
  formulas: [
    { label: "Série", tex: "R_{eq} = R_1 + R_2 + \\cdots + R_n" },
    { label: "Parallèle", tex: "\\frac{1}{R_{eq}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots,\\qquad R_1 \\parallel R_2 = \\frac{R_1 R_2}{R_1 + R_2}" }
  ],
  inputs: [
    { id: "list", label: "Valeurs des résistances", unit: "Ω", type: "text", default: "100, 220, 330", wide: true, help: "Séparez par une virgule ou un espace ; vous pouvez utiliser k et M, par exemple 4.7k." },
    { id: "mode", label: "Mode d'association", type: "select", default: "series", options: [["series", "Série"], ["parallel", "Parallèle"]] },
    { id: "V", label: "Tension de source (facultatif)", unit: "V", type: "number" }
  ],
  example: { values: { list: "100, 220, 330", mode: "parallel", V: "12" }, expect: ["Req = 56.9 Ω"], note: "Exemple : trois résistances de 100, 220 et 330 Ω en parallèle." },
  invalid: { values: { list: "100, -5", mode: "series" } },
  related: ["voltage-current-divider", "ohms-law", "capacitor-inductor-combination", "standard-resistor-values"]
};

export function equivalent(list, mode) {
  return mode === "series" ? list.reduce((a, b) => a + b, 0) : 1 / list.reduce((a, b) => a + 1 / b, 0);
}

export function solve(input) {
  const list = numList(input, "list", "Valeurs des résistances", { positive: true, max: 50 });
  const mode = choice(input, "mode", "Mode d'association", ["series", "parallel"], "series");
  const V = num(input, "V", "Tension de source", { optional: true });
  const Req = equivalent(list, mode);
  const steps = [];
  if (mode === "series") {
    steps.push({ text: "En série, on additionne directement les résistances :", tex: `R_{eq} = ${list.map((r) => ntex(r)).join(" + ")} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("La résistance équivalente en série est toujours supérieure à la plus grande résistance.");
  } else {
    steps.push({ text: "En parallèle, on additionne les inverses (conductances) :", tex: `\\frac{1}{R_{eq}} = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(1 / Req, 6)}\\ S` });
    steps.push({ tex: `R_{eq} = ${ntex(Req, 6)}\\ \\Omega` });
    if (list.length === 2) steps.push({ text: "Pour seulement deux résistances, la formule « produit sur somme » s'applique :", tex: `\\frac{${ntex(list[0])} \\times ${ntex(list[1])}}{${ntex(list[0])} + ${ntex(list[1])}} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("La résistance équivalente en parallèle est toujours inférieure à la plus petite résistance.");
  }
  const results = [{ label: "Résistance équivalente", value: eng(Req, "Ω", 4), text: `Req = ${eng(Req, "Ω", 4)}` }, { label: "Conductance équivalente", value: eng(1 / Req, "S", 4) }];
  const blocks = [];
  if (V !== null) {
    if (V === 0) fail("Tension de source nulle ; laissez le champ vide si elle n'est pas demandée.", "V");
    const I = V / Req;
    results.push({ label: "Courant total", value: eng(I, "A", 4) }, { label: "Puissance totale", value: eng(V * I, "W", 4) });
    const rows = list.map((r, k) => {
      const vr = mode === "series" ? I * r : V, ir = mode === "series" ? I : V / r;
      return [`R${k + 1}`, eng(r, "Ω"), eng(vr, "V"), eng(ir, "A"), eng(vr * ir, "W")];
    });
    blocks.push({ type: "table", caption: mode === "series" ? "Même courant dans chaque résistance et tension répartie" : "Même tension aux bornes de chaque résistance et courant réparti", head: ["Résistance", "Valeur", "Tension", "Courant", "Puissance"], rows });
    steps.push({ text: "Courant total d'après la loi d'Ohm :", tex: `I = \\frac{V}{R_{eq}} = \\frac{${ntex(V)}}{${ntex(Req, 6)}} = ${ntex(I, 6)}\\ A` });
    steps.push(mode === "series" ? "En série : tension de chaque résistance $V_k = I R_k$, et la somme des tensions est égale à la tension de source (KVL)." : "En parallèle : courant de chaque résistance $I_k = V / R_k$, et la somme des courants est égale au courant total (KCL).");
  }
  return { results, blocks, steps, copy: `Req = ${eng(Req, "Ω", 4)}` };
}
