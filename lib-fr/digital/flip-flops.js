import { choice, str, fail, isBlank } from "../core/validate.js";

const TYPES = [["SR", "SR"], ["D", "D"], ["JK", "JK"], ["T", "T"]];

export const meta = {
  description: "Référence et calculateur des bascules (flip-flops) de types SR, D, JK et T : équation caractéristique, table de caractéristiques et table d'excitation, état suivant pour toute entrée, et diagramme temporel pour une suite d'impulsions d'horloge.",
  keywords: ["Bascule", "flip flop", "JK", "D flip flop", "SR", "T flip flop", "Table d'excitation", "Équation caractéristique", "Circuits séquentiels"],
  formulas: [
    { label: "Équations caractéristiques", tex: "D: Q^+ = D,\\quad T: Q^+ = T \\oplus Q,\\quad JK: Q^+ = J\\overline{Q} + \\overline{K}Q" },
    { label: "SR (avec S·R = 0)", tex: "Q^+ = S + \\overline{R}Q" }
  ],
  inputs: [
    { id: "type", label: "Type de bascule", type: "select", default: "JK", options: TYPES },
    { id: "q0", label: "État actuel Q", type: "select", default: "0", options: [["0", "0"], ["1", "1"]] },
    { id: "seq", label: "Entrées pour chaque impulsion d'horloge", type: "textarea", rows: 4, default: "1 0\n1 1\n0 0\n1 1\n0 1", help: "Une ligne par impulsion. SR : «S R», JK : «J K», D : «D», T : «T»." }
  ],
  example: { values: { type: "JK", q0: "0", seq: "1 0\n1 1\n0 0\n1 1\n0 1" }, expect: ["Q = 1, 0, 0, 1, 0"], note: "Exemple : bascule JK partant de 0 avec cinq impulsions d'horloge." },
  invalid: { values: { type: "SR", q0: "0", seq: "1 1" } },
  related: ["logic-gates", "truth-table", "boolean-simplifier"]
};

export function next(type, q, ins) {
  switch (type) {
    case "D": return ins[0];
    case "T": return ins[0] ^ q;
    case "JK": { const [j, k] = ins; return (j & (q ^ 1)) | ((k ^ 1) & q); }
    case "SR": { const [s, r] = ins; if (s && r) return null; return s | ((r ^ 1) & q); }
  }
  return null;
}

const CHAR = {
  SR: [["S", "R", "Q⁺", "Fonctionnement"], [["0", "0", "Q", "Maintien"], ["0", "1", "0", "Remise à zéro (Reset)"], ["1", "0", "1", "Mise à un (Set)"], ["1", "1", "؟", "Interdit"]]],
  D: [["D", "Q⁺", "Fonctionnement"], [["0", "0", "Remise à zéro"], ["1", "1", "Mise à un"]]],
  JK: [["J", "K", "Q⁺", "Fonctionnement"], [["0", "0", "Q", "Maintien"], ["0", "1", "0", "Remise à zéro"], ["1", "0", "1", "Mise à un"], ["1", "1", "Q'", "Basculement (Toggle)"]]],
  T: [["T", "Q⁺", "Fonctionnement"], [["0", "Q", "Maintien"], ["1", "Q'", "Basculement"]]]
};

const EXC = {
  SR: [["Q", "Q⁺", "S", "R"], [["0", "0", "0", "X"], ["0", "1", "1", "0"], ["1", "0", "0", "1"], ["1", "1", "X", "0"]]],
  D: [["Q", "Q⁺", "D"], [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "0"], ["1", "1", "1"]]],
  JK: [["Q", "Q⁺", "J", "K"], [["0", "0", "0", "X"], ["0", "1", "1", "X"], ["1", "0", "X", "1"], ["1", "1", "X", "0"]]],
  T: [["Q", "Q⁺", "T"], [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "1"], ["1", "1", "0"]]]
};

export function solve(input) {
  const type = choice(input, "type", "Type", TYPES.map((t) => t[0]), "JK");
  let q = Number(choice(input, "q0", "État actuel", ["0", "1"], "0"));
  const width = type === "SR" || type === "JK" ? 2 : 1;
  const lines = isBlank(input.seq) ? [] : str(input, "seq", "Entrées").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) fail("Saisissez les entrées d'au moins une impulsion d'horloge.", "seq");
  if (lines.length > 64) fail("Nombre maximal d'impulsions : 64.", "seq");
  const rows = [], outs = [];
  const q0 = q;
  lines.forEach((l, i) => {
    const ins = l.split(/[\s,،]+/).filter(Boolean);
    if (ins.length !== width || ins.some((b) => b !== "0" && b !== "1")) fail(`Ligne ${i + 1} : saisissez ${width === 2 ? "deux valeurs" : "une seule valeur"} parmi 0 et 1.`, "seq");
    const v = ins.map(Number);
    const nq = next(type, q, v);
    if (nq === null) fail(`Ligne ${i + 1} : S = R = 1 est un état interdit pour une bascule SR.`, "seq");
    rows.push([String(i + 1), ...ins, String(q), String(nq)]);
    outs.push(nq);
    q = nq;
  });
  const names = type === "SR" ? ["S", "R"] : type === "JK" ? ["J", "K"] : [type];
  const steps = [
    { text: "Équation caractéristique de la bascule :", tex: { SR: "Q^+ = S + \\overline{R}Q", D: "Q^+ = D", JK: "Q^+ = J\\overline{Q} + \\overline{K}Q", T: "Q^+ = T \\oplus Q" }[type] },
    `On part de Q = ${q0} ; à chaque front d'horloge, on remplace les entrées et l'état actuel dans l'équation pour obtenir l'état suivant (voir le diagramme temporel).`,
    "La table d'excitation sert à concevoir les compteurs : elle donne les entrées nécessaires pour passer d'un état à un autre (X = indifférent)."
  ];
  const wave = [[0, q0]];
  outs.forEach((v, i) => { wave.push([i + 1, wave[wave.length - 1][1]], [i + 1, v]); });
  wave.push([outs.length + 1, outs[outs.length - 1]]);
  const qs = `Q = ${outs.join(", ")}`;
  return {
    results: [{ label: "Suite des états après chaque impulsion", value: qs, text: qs }, { label: "État final", value: q }],
    blocks: [
      { type: "table", ltr: true, caption: "Diagramme temporel", head: ["Impulsion", ...names, "Q", "Q⁺"], rows },
      { type: "plot", title: "Graphe de Q au fil des impulsions", xLabel: "Impulsion", yLabel: "Q", yMin: -0.3, yMax: 1.3, series: [{ name: "Q", points: wave }] },
      { type: "table", caption: `Table de caractéristiques de la bascule ${type}`, head: CHAR[type][0], rows: CHAR[type][1] },
      { type: "table", caption: `Table d'excitation de la bascule ${type}`, head: EXC[type][0], rows: EXC[type][1] }
    ],
    steps, copy: qs
  };
}
