import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TARGETS = [50, 60, 70, 80, 90];

function verdictWord(need) {
  if (need > 100) return "Impossible";
  if (need <= 0) return "Guaranteed";
  return "Possible";
}

export const meta = {
  description: "Calculate the final exam score you need to reach your target total, showing whether the goal is possible, impossible or guaranteed, with a table of common targets.",
  keywords: ["Final exam grade", "final exam", "required grade", "final grade", "course average", "exam weight"],
  formulas: [{ label: "Required final exam score", tex: "x = \\frac{T - C(1 - w)}{w}" }],
  inputs: [
    { id: "current", label: "Current grade before the final", unit: "%", type: "number", default: "80", help: "Your total score in the course before the final exam." },
    { id: "weight", label: "Final exam weight", unit: "%", type: "number", default: "40", help: "The final exam's share of the total grade, from 1 to 100." },
    { id: "target", label: "Target total", unit: "%", type: "number", default: "85" }
  ],
  example: { values: { current: "80", weight: "40", target: "85" }, expect: ["92.5%"], note: "Example: your grade is 80% before the final, its weight is 40%, and the target is 85%." },
  invalid: { values: { current: "80", weight: "0", target: "85" } },
  related: ["gpa-calculator", "study-planner"]
};

export function solve(input) {
  const C = num(input, "current", "Current grade", { nonNegative: true, max: 100 });
  const W = num(input, "weight", "Final exam weight", { min: 1, max: 100 });
  const T = num(input, "target", "Target total", { nonNegative: true, max: 100 });
  const w = W / 100;
  const need = (T - C * (1 - w)) / w;
  const kept = C * (1 - w);
  const verdict = verdictWord(need);
  let message;
  if (need > 100) message = `The goal is not possible: you need ${fmt(need, 4)}% on the final exam, which is above 100%.`;
  else if (need <= 0) message = `The goal is guaranteed: even if you score 0% on the final, you will reach at least ${fmt(kept, 4)}%.`;
  else message = `You need ${fmt(need, 4)}% on the final exam to reach ${fmt(T)}%.`;
  const steps = [
    { text: "Current contribution to the total:", tex: `C(1-w) = ${ntex(C, 6)} \\times ${ntex(1 - w, 6)} = ${ntex(kept, 6)}\\ \\%` },
    { text: "Required final exam score:", tex: `x = \\frac{T - C(1-w)}{w} = \\frac{${ntex(T, 6)} - ${ntex(kept, 6)}}{${ntex(w, 6)}} = ${ntex(need, 6)}\\ \\%` },
    { text: "Check: the resulting total equals the target:", tex: `C(1-w) + x\\,w = ${ntex(kept, 6)} + ${ntex(need * w, 6)} = ${ntex(T, 6)}\\ \\%` }
  ];
  const rows = TARGETS.map((t) => {
    const r = (t - C * (1 - w)) / w;
    return [`${t}%`, r <= 0 ? "Any score" : `${fmt(r, 4)}%`, verdictWord(r)];
  });
  return {
    results: [
      { label: "Required final exam score", value: `${fmt(need, 4)}%`, text: `${fmt(need, 4)}%` },
      { label: "Verdict", value: verdict },
      { label: "Target total", value: `${fmt(T)}%` },
      { label: "Current contribution to the total", value: `${fmt(kept, 4)}%` }
    ],
    steps,
    blocks: [
      { type: "note", text: message, tone: need > 100 ? "warn" : undefined },
      { type: "table", caption: "Required score for common targets", head: ["Target total", "Required final exam score", "Verdict"], rows }
    ],
    copy: `${message} (weight ${fmt(W)}%, current grade ${fmt(C)}%)`,
    values: { need, kept, verdict }
  };
}
