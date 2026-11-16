import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TARGETS = [50, 60, 70, 80, 90];

function verdictWord(need) {
  if (need > 100) return "Imposible";
  if (need <= 0) return "Garantizado";
  return "Posible";
}

export const meta = {
  description: "Calcule la nota que necesita en el examen final para alcanzar el total deseado, indicando si la meta es posible, imposible o garantizada, con una tabla de metas habituales.",
  keywords: ["Nota del final", "examen final", "nota necesaria", "final grade", "promedio de la asignatura", "peso del examen"],
  formulas: [{ label: "Nota necesaria en el final", tex: "x = \\frac{T - C(1 - w)}{w}" }],
  inputs: [
    { id: "current", label: "Nota actual antes del final", unit: "%", type: "number", default: "80", help: "Suma de sus notas en la asignatura antes del examen final." },
    { id: "weight", label: "Peso del examen final", unit: "%", type: "number", default: "40", help: "Porcentaje que representa el examen final sobre la nota total, de 1 a 100." },
    { id: "target", label: "Total deseado", unit: "%", type: "number", default: "85" }
  ],
  example: { values: { current: "80", weight: "40", target: "85" }, expect: ["92.5%"], note: "Ejemplo: su nota es 80% antes del final, su peso es 40% y la meta es 85%." },
  invalid: { values: { current: "80", weight: "0", target: "85" } },
  related: ["gpa-calculator", "study-planner"]
};

export function solve(input) {
  const C = num(input, "current", "Nota actual", { nonNegative: true, max: 100 });
  const W = num(input, "weight", "Peso del examen final", { min: 1, max: 100 });
  const T = num(input, "target", "Total deseado", { nonNegative: true, max: 100 });
  const w = W / 100;
  const need = (T - C * (1 - w)) / w;
  const kept = C * (1 - w);
  const verdict = verdictWord(need);
  let message;
  if (need > 100) message = `La meta no es posible: necesita ${fmt(need, 4)}% en el examen final, lo que supera el 100%.`;
  else if (need <= 0) message = `La meta está garantizada: aunque saque 0% en el final, llegará como mínimo a ${fmt(kept, 4)}%.`;
  else message = `Necesita ${fmt(need, 4)}% en el examen final para llegar a ${fmt(T)}%.`;
  const steps = [
    { text: "Aporte actual al total:", tex: `C(1-w) = ${ntex(C, 6)} \\times ${ntex(1 - w, 6)} = ${ntex(kept, 6)}\\ \\%` },
    { text: "Nota necesaria en el examen final:", tex: `x = \\frac{T - C(1-w)}{w} = \\frac{${ntex(T, 6)} - ${ntex(kept, 6)}}{${ntex(w, 6)}} = ${ntex(need, 6)}\\ \\%` },
    { text: "Comprobación: el total resultante es igual a la meta:", tex: `C(1-w) + x\\,w = ${ntex(kept, 6)} + ${ntex(need * w, 6)} = ${ntex(T, 6)}\\ \\%` }
  ];
  const rows = TARGETS.map((t) => {
    const r = (t - C * (1 - w)) / w;
    return [`${t}%`, r <= 0 ? "Cualquier nota" : `${fmt(r, 4)}%`, verdictWord(r)];
  });
  return {
    results: [
      { label: "Nota necesaria en el final", value: `${fmt(need, 4)}%`, text: `${fmt(need, 4)}%` },
      { label: "Veredicto", value: verdict },
      { label: "Total deseado", value: `${fmt(T)}%` },
      { label: "Aporte actual al total", value: `${fmt(kept, 4)}%` }
    ],
    steps,
    blocks: [
      { type: "note", text: message, tone: need > 100 ? "warn" : undefined },
      { type: "table", caption: "Nota necesaria para metas habituales", head: ["Total deseado", "Nota necesaria en el final", "Veredicto"], rows }
    ],
    copy: `${message} (peso ${fmt(W)}%, nota actual ${fmt(C)}%)`,
    values: { need, kept, verdict }
  };
}
