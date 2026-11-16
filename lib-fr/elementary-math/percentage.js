import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["of", "what", "change", "add", "sub", "reverse", "points"];
const N = (x) => fmt(x, 10);
const P = (x) => `${fmt(x, 10)}%`;

export const meta = {
  description: "Calculez un pourcentage selon sept modes : pourcentage d'un nombre, part qu'un nombre représente d'un autre, variation en pourcentage entre deux valeurs, augmentation ou diminution d'une valeur de X %, valeur d'origine avant variation, ou écart entre deux pourcentages en points de pourcentage.",
  keywords: ["pourcentage", "percentage", "variation en pourcentage", "augmentation de", "diminution de", "points de pourcentage", "percentage points", "Valeur d'origine"],
  formulas: [
    { label: "Pourcentage d'un nombre", tex: "P = \\frac{X}{100}\\, Y" },
    { label: "variation en pourcentage", tex: "\\Delta\\% = \\frac{B - A}{A}\\times 100" },
    { label: "Valeur d'origine avant variation", tex: "Y = \\frac{F}{1 \\pm \\frac{X}{100}}" },
    { label: "points de pourcentage", tex: "\\Delta p = p_2 - p_1,\\qquad \\text{variation relative} = \\frac{\\Delta p}{p_1}\\times 100" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "of", options: [["of", "X % de Y"], ["what", "La partie X représente quel % de Y"], ["change", "Variation en % de A à B"], ["add", "Augmenter Y de X %"], ["sub", "Diminuer Y de X %"], ["reverse", "Valeur d'origine avant variation"], ["points", "Écart entre deux pourcentages (points de pourcentage)"]] },
    { id: "pct", label: "Pourcentage X", unit: "%", type: "number", default: "20", when: { mode: ["of", "add", "sub", "reverse"] } },
    { id: "base", label: "Valeur Y", type: "number", default: "150", when: { mode: ["of", "add", "sub"] } },
    { id: "part", label: "Partie X", type: "number", default: "30", when: { mode: ["what"] } },
    { id: "whole", label: "Total Y", type: "number", default: "150", when: { mode: ["what"] } },
    { id: "dir", label: "Type de variation", type: "select", default: "inc", options: [["inc", "augmentation"], ["dec", "diminution"]], when: { mode: ["reverse"] } },
    { id: "final", label: "Valeur finale F", type: "number", default: "230", when: { mode: ["reverse"] } },
    { id: "from", label: "Valeur initiale A", type: "number", default: "80", when: { mode: ["change"] } },
    { id: "to", label: "Nouvelle valeur B", type: "number", default: "100", when: { mode: ["change"] } },
    { id: "p1", label: "Premier pourcentage p1", unit: "%", type: "number", default: "12", when: { mode: ["points"] } },
    { id: "p2", label: "Deuxième pourcentage p2", unit: "%", type: "number", default: "15", when: { mode: ["points"] } }
  ],
  example: {
    values: { mode: "of", pct: "20", base: "150", part: "30", whole: "150", dir: "inc", final: "230", from: "80", to: "100", p1: "12", p2: "15" },
    expect: ["= 30"],
    note: "Exemple : 20 % de 150 = 30."
  },
  invalid: { values: { mode: "change", from: "0", to: "5" } },
  related: ["fractions", "ratio-proportion", "significant-figures"]
};

function ofMode(input) {
  const x = num(input, "pct", "Pourcentage X", { nonNegative: true });
  const y = num(input, "base", "Valeur Y");
  const r = (x * y) / 100;
  return {
    results: [
      { label: "Résultat", value: N(r) },
      { label: "Pourcentage en décimal", value: N(x / 100) }
    ],
    steps: [
      { text: "On convertit le pourcentage en décimal en divisant par 100 :", tex: `\\frac{${ntex(x)}}{100} = ${ntex(x / 100, 8)}` },
      { text: "On multiplie le nombre décimal par la valeur :", tex: `${ntex(x / 100, 8)} \\times ${ntex(y)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(x)} % de ${N(y)} = ${N(r)}`
  };
}

function whatMode(input) {
  const part = num(input, "part", "Partie X");
  const whole = num(input, "whole", "Total Y", { nonZero: true });
  const p = (part * 100) / whole;
  return {
    results: [{ label: "Pourcentage", value: P(p) }],
    steps: [
      { text: "On divise la partie par le total puis on multiplie par 100 :", tex: `\\frac{${ntex(part)}}{${ntex(whole)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(part)} est ${N(p)} % de ${N(whole)}`
  };
}

function changeMode(input) {
  const a = num(input, "from", "Valeur initiale A", { nonZero: true });
  const b = num(input, "to", "Nouvelle valeur B");
  const diff = b - a;
  const p = (diff * 100) / a;
  const dir = diff > 0 ? "augmentation" : diff < 0 ? "diminution" : "Aucun changement";
  return {
    results: [
      { label: "variation en pourcentage", value: `${p > 0 ? "+" : ""}${P(p)}` },
      { label: "Montant de la variation", value: N(diff) },
      { label: "Type de variation", value: dir }
    ],
    steps: [
      { text: "On calcule l'écart entre les deux valeurs :", tex: `\\Delta = B - A = ${ntex(b)} - ${ntex(a)} = ${ntex(diff)}` },
      { text: "On divise l'écart par la valeur d'origine puis on multiplie par 100 :", tex: `\\frac{${ntex(diff)}}{${ntex(a)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `De ${N(a)} à ${N(b)} : ${dir} ${N(Math.abs(p))}%`
  };
}

function shiftMode(input, sign) {
  const x = num(input, "pct", "Pourcentage X", { nonNegative: true });
  if (sign < 0 && x > 100) fail("En cas de diminution, le pourcentage ne peut pas dépasser 100 %.", "pct");
  const y = num(input, "base", "Valeur Y");
  const inc = (y * x) / 100;
  const r = y + sign * inc;
  const word = sign > 0 ? "augmentation" : "diminution";
  const op = sign > 0 ? "+" : "-";
  return {
    results: [
      { label: sign > 0 ? "Valeur après augmentation" : "Valeur après diminution", value: N(r) },
      { label: "Montant de la variation", value: N(inc) }
    ],
    steps: [
      { text: "On calcule le montant de la variation à partir du pourcentage :", tex: `\\frac{${ntex(x)}}{100} \\times ${ntex(y)} = ${ntex(inc, 8)}` },
      { text: `On applique ${word} à la valeur d'origine :`, tex: `${ntex(y)} ${op} ${ntex(inc, 8)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} après ${word} ${N(x)} % = ${N(r)}`
  };
}

function reverseMode(input) {
  const f = num(input, "final", "Valeur finale F");
  const x = num(input, "pct", "Pourcentage X", { nonNegative: true });
  const dir = choice(input, "dir", "Type de variation", ["inc", "dec"], "inc");
  if (dir === "dec" && x >= 100) fail("En cas de diminution, le pourcentage doit être inférieur à 100 %.", "pct");
  const inc = dir === "inc";
  const f0 = inc ? 100 + x : 100 - x;
  const orig = (f * 100) / f0;
  const word = inc ? "augmentation" : "diminution";
  return {
    results: [
      { label: "Valeur d'origine", value: N(orig) },
      { label: "Coefficient de variation", value: `× ${N(f0 / 100)}` }
    ],
    steps: [
      { text: "La valeur finale = valeur d'origine × coefficient de variation, avec coefficient = 1 ± X/100 :", tex: `1 ${inc ? "+" : "-"} \\frac{${ntex(x)}}{100} = \\frac{${ntex(f0)}}{100}` },
      { text: "On divise la valeur finale par le coefficient de variation :", tex: `Y = \\frac{${ntex(f)}}{${ntex(f0 / 100, 8)}} = \\frac{${ntex(f)} \\times 100}{${ntex(f0)}} = ${ntex(orig, 8)}` }
    ],
    copy: `Valeur d'origine = ${N(orig)} (finale ${N(f)} après ${word} ${N(x)}%)`
  };
}

function pointsMode(input) {
  const p1 = num(input, "p1", "Premier pourcentage p1", { nonZero: true });
  const p2 = num(input, "p2", "Deuxième pourcentage p2");
  const diff = p2 - p1;
  const rel = (diff * 100) / p1;
  const word = diff > 0 ? "augmentation" : diff < 0 ? "diminution" : "Aucun changement";
  return {
    results: [
      { label: "Écart en points de pourcentage", value: `${N(diff)} points de pourcentage` },
      { label: "Variation relative", value: `${rel > 0 ? "+" : ""}${P(rel)}` },
      { label: "Type de variation", value: word }
    ],
    steps: [
      { text: "L'écart en points de pourcentage est la simple soustraction des deux pourcentages :", tex: `\\Delta p = p_2 - p_1 = ${ntex(p2)} - ${ntex(p1)} = ${ntex(diff)}\\ \\text{pp}` },
      { text: "La variation relative compare l'écart à la première valeur en pourcentage :", tex: `\\frac{\\Delta p}{p_1} \\times 100 = \\frac{${ntex(diff)}}{${ntex(p1)}} \\times 100 = ${ntex(rel, 8)}\\%` }
    ],
    copy: `De ${N(p1)} % à ${N(p2)} % : écart de ${N(diff)} points de pourcentage, et variation relative de ${N(rel)} %`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", MODES, "of");
  if (mode === "of") return ofMode(input);
  if (mode === "what") return whatMode(input);
  if (mode === "change") return changeMode(input);
  if (mode === "add") return shiftMode(input, 1);
  if (mode === "sub") return shiftMode(input, -1);
  if (mode === "reverse") return reverseMode(input);
  return pointsMode(input);
}
