import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "Calcul de l'élasticité-prix de la demande à partir de deux prix et de deux quantités, par la méthode du point moyen ou de la variation simple, classification de l'élasticité et effet d'une variation du prix sur le chiffre d'affaires total.",
  keywords: ["élasticité-prix", "price elasticity", "élasticité de la demande", "chiffre d'affaires total", "élastique", "inélastique", "elasticity"],
  formulas: [
    { label: "Coefficient d'élasticité", tex: "E = \\frac{\\%\\Delta Q}{\\%\\Delta P}" },
    { label: "Point moyen", tex: "\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2},\\qquad \\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2}" }
  ],
  inputs: [
    { id: "P1", label: "Premier prix P1", type: "number", default: "10" },
    { id: "Q1", label: "Première quantité Q1", type: "number", default: "100" },
    { id: "P2", label: "Deuxième prix P2", type: "number", default: "12" },
    { id: "Q2", label: "Deuxième quantité Q2", type: "number", default: "80" },
    { id: "method", label: "Méthode de calcul", type: "select", default: "mid", options: [["mid", "Point moyen (arc)"], ["simple", "Variation simple"]], help: "Le point moyen donne le même résultat quel que soit le sens de la variation." }
  ],
  example: { values: { P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid" }, expect: ["-1.222", "élastique"], note: "Exemple : hausse du prix de 10 à 12, la quantité passe de 100 à 80." },
  invalid: { values: { P1: "10", Q1: "100", P2: "10", Q2: "80", method: "mid" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "financial-ratios"]
};

export function solve(input) {
  const P1 = num(input, "P1", "Premier prix", { positive: true });
  const Q1 = num(input, "Q1", "Première quantité", { nonNegative: true });
  const P2 = num(input, "P2", "Deuxième prix", { positive: true });
  const Q2 = num(input, "Q2", "Deuxième quantité", { nonNegative: true });
  const method = choice(input, "method", "Méthode de calcul", ["mid", "simple"], "mid");
  if (P1 === P2) fail("Le prix n'a pas changé : le calcul de l'élasticité est impossible, car on diviserait par zéro.", "P2");
  if (method === "simple" && Q1 === 0) fail("La première quantité est nulle, or la variation simple se calcule sur la première quantité.", "Q1");
  if (method === "mid" && Q1 + Q2 === 0) fail("Les deux quantités sont nulles : la variation moyenne de la quantité ne peut pas être calculée.", "Q2");
  const mid = method === "mid";
  const dP = P2 - P1;
  const dQ = Q2 - Q1;
  const baseP = mid ? (P1 + P2) / 2 : P1;
  const baseQ = mid ? (Q1 + Q2) / 2 : Q1;
  const pctP = dP / baseP;
  const pctQ = dQ / baseQ;
  const E = pctQ / pctP;
  const a = Math.abs(E);
  let cls;
  if (a < 1e-12) cls = "Parfaitement inélastique";
  else if (Math.abs(a - 1) < 1e-9) cls = "Élasticité unitaire";
  else if (a > 1) cls = "élastique";
  else cls = "inélastique";
  const R1 = P1 * Q1;
  const R2 = P2 * Q2;
  const dR = R2 - R1;
  const effect = Math.abs(dR) < 1e-9
    ? "Le chiffre d'affaires total ne change pas"
    : dR > 0 ? `Le chiffre d'affaires total a augmenté de ${money(dR)}` : `Le chiffre d'affaires total a diminué de ${money(-dR)}`;
  let note;
  if (a < 1e-12) note = "La quantité ne change pas avec le prix, le chiffre d'affaires varie donc dans la même proportion que le prix.";
  else if (Math.abs(a - 1) < 1e-9) note = "L'élasticité est égale à un, donc le chiffre d'affaires total reste à peu près constant lorsque le prix change.";
  else if (a > 1) note = "La demande est élastique : la variation de la quantité est plus grande que celle du prix ; le chiffre d'affaires augmente donc quand le prix baisse, et diminue quand il monte.";
  else note = "La demande est inélastique : la variation de la quantité est plus petite que celle du prix ; le chiffre d'affaires augmente donc quand le prix monte, et diminue quand il baisse.";
  const steps = [
    {
      text: mid ? "Variation de la quantité au point moyen :" : "Variation de la quantité :",
      tex: mid
        ? `\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2} = \\frac{${ntex(dQ)}}{${ntex(baseQ)}} = ${ntex(pctQ, 6)}`
        : `\\%\\Delta Q = \\frac{Q_2-Q_1}{Q_1} = \\frac{${ntex(dQ)}}{${ntex(Q1)}} = ${ntex(pctQ, 6)}`
    },
    {
      text: mid ? "Variation du prix au point moyen :" : "Variation du prix :",
      tex: mid
        ? `\\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2} = \\frac{${ntex(dP)}}{${ntex(baseP)}} = ${ntex(pctP, 6)}`
        : `\\%\\Delta P = \\frac{P_2-P_1}{P_1} = \\frac{${ntex(dP)}}{${ntex(P1)}} = ${ntex(pctP, 6)}`
    },
    { text: "Coefficient d'élasticité :", tex: `E = \\frac{\\%\\Delta Q}{\\%\\Delta P} = \\frac{${ntex(pctQ, 6)}}{${ntex(pctP, 6)}} = ${ntex(E, 6)}` },
    { text: "Chiffre d'affaires total avant et après la variation :", tex: `R_1 = P_1Q_1 = ${ntex(R1)},\\qquad R_2 = P_2Q_2 = ${ntex(R2)}` }
  ];
  return {
    results: [
      { label: "Variation de la quantité", value: `${fmt(pctQ * 100, 4)}%` },
      { label: "Variation du prix", value: `${fmt(pctP * 100, 4)}%` },
      { label: "Coefficient d'élasticité E", value: fmt(E, 4), text: `E = ${fmt(E, 4)}` },
      { label: "Classification de l'élasticité", value: cls },
      { label: "Chiffre d'affaires total avant la variation", value: money(R1) },
      { label: "Chiffre d'affaires total après la variation", value: money(R2) },
      { label: "Effet de la variation sur le chiffre d'affaires", value: effect }
    ],
    steps,
    copy: `E = ${fmt(E, 4)} (${cls}), chiffre d'affaires de ${money(R1)} à ${money(R2)}, ${effect}`,
    blocks: [
      { type: "table", caption: "Comparaison avant et après la variation", head: ["Élément", "Avant", "Après"], rows: [["Prix", fmt(P1, 6), fmt(P2, 6)], ["Quantité", fmt(Q1, 6), fmt(Q2, 6)], ["chiffre d'affaires total", money(R1), money(R2)]] },
      { type: "note", text: note }
    ]
  };
}
