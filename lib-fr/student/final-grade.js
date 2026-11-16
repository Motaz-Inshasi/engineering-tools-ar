import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TARGETS = [50, 60, 70, 80, 90];

function verdictWord(need) {
  if (need > 100) return "Impossible";
  if (need <= 0) return "Garanti";
  return "Possible";
}

export const meta = {
  description: "Calculez la note dont vous avez besoin à l'examen final pour atteindre le total visé, en indiquant si l'objectif est possible, impossible ou garanti, avec un tableau d'objectifs courants.",
  keywords: ["Note de l'examen final", "examen final", "note requise", "final grade", "moyenne du cours", "poids de l'examen"],
  formulas: [{ label: "Note requise à l'examen final", tex: "x = \\frac{T - C(1 - w)}{w}" }],
  inputs: [
    { id: "current", label: "Note actuelle avant l'examen final", unit: "%", type: "number", default: "80", help: "Total de vos points dans le cours avant l'examen final." },
    { id: "weight", label: "Poids de l'examen final", unit: "%", type: "number", default: "40", help: "Part de l'examen final dans la note totale, de 1 à 100." },
    { id: "target", label: "Total visé", unit: "%", type: "number", default: "85" }
  ],
  example: { values: { current: "80", weight: "40", target: "85" }, expect: ["92.5%"], note: "Exemple : votre note est de 80% avant l'examen final, son poids est de 40% et l'objectif est de 85%." },
  invalid: { values: { current: "80", weight: "0", target: "85" } },
  related: ["gpa-calculator", "study-planner"]
};

export function solve(input) {
  const C = num(input, "current", "Note actuelle", { nonNegative: true, max: 100 });
  const W = num(input, "weight", "Poids de l'examen final", { min: 1, max: 100 });
  const T = num(input, "target", "Total visé", { nonNegative: true, max: 100 });
  const w = W / 100;
  const need = (T - C * (1 - w)) / w;
  const kept = C * (1 - w);
  const verdict = verdictWord(need);
  let message;
  if (need > 100) message = `Objectif impossible : il faudrait ${fmt(need, 4)}% à l'examen final, ce qui dépasse 100%.`;
  else if (need <= 0) message = `Objectif garanti : même avec 0% à l'examen final, vous atteindrez au moins ${fmt(kept, 4)}%.`;
  else message = `Il vous faut ${fmt(need, 4)}% à l'examen final pour atteindre ${fmt(T)}%.`;
  const steps = [
    { text: "Contribution actuelle au total :", tex: `C(1-w) = ${ntex(C, 6)} \\times ${ntex(1 - w, 6)} = ${ntex(kept, 6)}\\ \\%` },
    { text: "Note requise à l'examen final :", tex: `x = \\frac{T - C(1-w)}{w} = \\frac{${ntex(T, 6)} - ${ntex(kept, 6)}}{${ntex(w, 6)}} = ${ntex(need, 6)}\\ \\%` },
    { text: "Vérification : le total obtenu est égal à l'objectif :", tex: `C(1-w) + x\\,w = ${ntex(kept, 6)} + ${ntex(need * w, 6)} = ${ntex(T, 6)}\\ \\%` }
  ];
  const rows = TARGETS.map((t) => {
    const r = (t - C * (1 - w)) / w;
    return [`${t}%`, r <= 0 ? "N'importe quelle note" : `${fmt(r, 4)}%`, verdictWord(r)];
  });
  return {
    results: [
      { label: "Note requise à l'examen final", value: `${fmt(need, 4)}%`, text: `${fmt(need, 4)}%` },
      { label: "Verdict", value: verdict },
      { label: "Total visé", value: `${fmt(T)}%` },
      { label: "Contribution actuelle au total", value: `${fmt(kept, 4)}%` }
    ],
    steps,
    blocks: [
      { type: "note", text: message, tone: need > 100 ? "warn" : undefined },
      { type: "table", caption: "Note requise pour des objectifs courants", head: ["Total visé", "Note requise à l'examen final", "Verdict"], rows }
    ],
    copy: `${message} (poids ${fmt(W)}%, note actuelle ${fmt(C)}%)`,
    values: { need, kept, verdict }
  };
}
