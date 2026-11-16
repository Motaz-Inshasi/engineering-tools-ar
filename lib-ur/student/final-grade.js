import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const TARGETS = [50, 60, 70, 80, 90];

function verdictWord(need) {
  if (need > 100) return "مستحيل";
  if (need <= 0) return "مضمون";
  return "ممكن";
}

export const meta = {
  description: "احسب الدرجة التي تحتاجها في الامتحان النهائي لتصل إلى المجموع المستهدف، مع بيان هل الهدف ممكن أو مستحيل أو مضمون، وجدول لأهداف شائعة.",
  keywords: ["درجة النهائي", "امتحان نهائي", "درجة مطلوبة", "final grade", "معدل المقرر", "وزن الامتحان"],
  formulas: [{ label: "الدرجة المطلوبة في النهائي", tex: "x = \\frac{T - C(1 - w)}{w}" }],
  inputs: [
    { id: "current", label: "الدرجة الحالية قبل النهائي", unit: "%", type: "number", default: "80", help: "مجموع درجاتك في المقرر قبل الامتحان النهائي." },
    { id: "weight", label: "وزن الامتحان النهائي", unit: "%", type: "number", default: "40", help: "نسبة الامتحان النهائي من الدرجة الكلية، من 1 إلى 100." },
    { id: "target", label: "المجموع المستهدف", unit: "%", type: "number", default: "85" }
  ],
  example: { values: { current: "80", weight: "40", target: "85" }, expect: ["92.5%"], note: "مثال: درجتك 80% قبل النهائي ووزنه 40%، والهدف 85%." },
  invalid: { values: { current: "80", weight: "0", target: "85" } },
  related: ["gpa-calculator", "study-planner"]
};

export function solve(input) {
  const C = num(input, "current", "الدرجة الحالية", { nonNegative: true, max: 100 });
  const W = num(input, "weight", "وزن الامتحان النهائي", { min: 1, max: 100 });
  const T = num(input, "target", "المجموع المستهدف", { nonNegative: true, max: 100 });
  const w = W / 100;
  const need = (T - C * (1 - w)) / w;
  const kept = C * (1 - w);
  const verdict = verdictWord(need);
  let message;
  if (need > 100) message = `الهدف غير ممكن: تحتاج ${fmt(need, 4)}% في الامتحان النهائي وهي أعلى من 100%.`;
  else if (need <= 0) message = `الهدف مضمون: حتى لو حصلت على 0% في النهائي ستصل إلى ${fmt(kept, 4)}% على الأقل.`;
  else message = `تحتاج ${fmt(need, 4)}% في الامتحان النهائي لتصل إلى ${fmt(T)}%.`;
  const steps = [
    { text: "المساهمة الحالية في المجموع:", tex: `C(1-w) = ${ntex(C, 6)} \\times ${ntex(1 - w, 6)} = ${ntex(kept, 6)}\\ \\%` },
    { text: "الدرجة المطلوبة في النهائي:", tex: `x = \\frac{T - C(1-w)}{w} = \\frac{${ntex(T, 6)} - ${ntex(kept, 6)}}{${ntex(w, 6)}} = ${ntex(need, 6)}\\ \\%` },
    { text: "للتحقق: المجموع الناتج يساوي الهدف:", tex: `C(1-w) + x\\,w = ${ntex(kept, 6)} + ${ntex(need * w, 6)} = ${ntex(T, 6)}\\ \\%` }
  ];
  const rows = TARGETS.map((t) => {
    const r = (t - C * (1 - w)) / w;
    return [`${t}%`, r <= 0 ? "أي درجة" : `${fmt(r, 4)}%`, verdictWord(r)];
  });
  return {
    results: [
      { label: "الدرجة المطلوبة في النهائي", value: `${fmt(need, 4)}%`, text: `${fmt(need, 4)}%` },
      { label: "الحكم", value: verdict },
      { label: "المجموع المستهدف", value: `${fmt(T)}%` },
      { label: "المساهمة الحالية في المجموع", value: `${fmt(kept, 4)}%` }
    ],
    steps,
    blocks: [
      { type: "note", text: message, tone: need > 100 ? "warn" : undefined },
      { type: "table", caption: "الدرجة المطلوبة لأهداف شائعة", head: ["المجموع المستهدف", "الدرجة المطلوبة في النهائي", "الحكم"], rows }
    ],
    copy: `${message} (الوزن ${fmt(W)}%، الدرجة الحالية ${fmt(C)}%)`,
    values: { need, kept, verdict }
  };
}
