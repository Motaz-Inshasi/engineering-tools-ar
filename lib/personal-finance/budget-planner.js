import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PRESETS = { "50-30-20": [50, 30, 20], "70-20-10": [70, 20, 10] };

const verdict = (kind, target, actual) => {
  if (actual === null) return "لم يُدخل فعلي";
  const diff = Math.round((actual - target) * 100) / 100;
  if (diff === 0) return "مطابق للميزانية";
  if (kind === "save") return diff > 0 ? `فوق المستهدف بـ ${money(diff)}` : `أقل من المستهدف بـ ${money(-diff)}`;
  return diff < 0 ? `ضمن الميزانية (وفر ${money(-diff)})` : `تجاوز الميزانية بـ ${money(diff)}`;
};

export const meta = {
  description: "وزّع دخلك الشهري الصافي على الاحتياجات والرغبات والادخار وفق قاعدة 50/30/20 أو 70/20/10 أو بنسب تختارها، وقارن المصروف الفعلي بالميزانية لتعرف التجاوز أو الوفر.",
  keywords: ["ميزانية", "توزيع الدخل", "50 30 20", "70 20 10", "ميزانية شهرية", "budget", "ادخار"],
  formulas: [
    { label: "مبلغ كل فئة", tex: "B_i = I \\times \\frac{p_i}{100}" },
    { label: "شرط النسب المخصصة", tex: "p_1 + p_2 + p_3 = 100" },
    { label: "الفرق بين الفعلي والمخطط", tex: "\\Delta_i = A_i - B_i" }
  ],
  inputs: [
    { id: "income", label: "صافي الدخل الشهري", type: "number", default: "10000", help: "الدخل بعد الخصومات والضرائب." },
    { id: "method", label: "طريقة التوزيع", type: "select", default: "50-30-20", options: [["50-30-20", "50 / 30 / 20 (احتياجات / رغبات / ادخار)"], ["70-20-10", "70 / 20 / 10"], ["custom", "نسب مخصصة"]] },
    { id: "needsPct", label: "نسبة الاحتياجات", unit: "%", type: "number", default: "50", when: { method: ["custom"] } },
    { id: "wantsPct", label: "نسبة الرغبات", unit: "%", type: "number", default: "30", when: { method: ["custom"] } },
    { id: "savePct", label: "نسبة الادخار", unit: "%", type: "number", default: "20", when: { method: ["custom"] }, help: "مجموع النسب الثلاث يجب أن يساوي 100%." },
    { id: "needsActual", label: "المصروف الفعلي للاحتياجات", type: "number", help: "اختياري: اتركه فارغاً إن لم ترغب بالمقارنة." },
    { id: "wantsActual", label: "المصروف الفعلي للرغبات", type: "number", help: "اختياري." },
    { id: "savingsActual", label: "المبلغ المدخر فعلياً", type: "number", help: "اختياري." }
  ],
  example: { values: { income: "10000", method: "50-30-20", needsPct: "50", wantsPct: "30", savePct: "20", needsActual: "6000", wantsActual: "", savingsActual: "1500" }, expect: ["5,000.00", "3,000.00"], note: "مثال: دخل 10000 بقاعدة 50/30/20، مع مصروف احتياجات فعلي 6000 يتجاوز الميزانية." },
  invalid: { values: { income: "10000", method: "custom", needsPct: "50", wantsPct: "30", savePct: "30", needsActual: "", wantsActual: "", savingsActual: "" } },
  related: ["savings-goal", "zakat", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const income = num(input, "income", "صافي الدخل", { positive: true });
  const method = choice(input, "method", "طريقة التوزيع", ["50-30-20", "70-20-10", "custom"], "50-30-20");
  let pcts;
  if (method === "custom") {
    const needs = num(input, "needsPct", "نسبة الاحتياجات", { min: 0, max: 100 });
    const wants = num(input, "wantsPct", "نسبة الرغبات", { min: 0, max: 100 });
    const save = num(input, "savePct", "نسبة الادخار", { min: 0, max: 100 });
    if (Math.abs(needs + wants + save - 100) > 1e-9) fail(`مجموع النسب ${fmt(needs + wants + save)}% ويجب أن يساوي 100%.`, "savePct");
    pcts = [needs, wants, save];
  } else {
    pcts = PRESETS[method];
  }
  const actual = (key, label) => num(input, key, label, { nonNegative: true, optional: true });
  const actuals = [actual("needsActual", "المصروف الفعلي للاحتياجات"), actual("wantsActual", "المصروف الفعلي للرغبات"), actual("savingsActual", "المبلغ المدخر فعلياً")];

  const [pNeeds, pWants, pSave] = pcts;
  const needs = (income * pNeeds) / 100;
  const wants = (income * pWants) / 100;
  const save = (income * pSave) / 100;
  const targets = [needs, wants, save];
  const names = ["الاحتياجات", "الرغبات", "الادخار"];
  const kinds = ["spend", "spend", "save"];

  const rows = names.map((name, k) => [
    name,
    `${fmt(pcts[k])}%`,
    money(targets[k]),
    actuals[k] === null ? "—" : money(actuals[k]),
    verdict(kinds[k], targets[k], actuals[k])
  ]);

  const steps = [
    { text: "مبلغ الاحتياجات من الدخل:", tex: `B_{\\text{needs}} = ${ntex(income)} \\times \\frac{${fmt(pNeeds)}}{100} = ${ntex(needs, 8)}` },
    { text: "مبلغ الرغبات من الدخل:", tex: `B_{\\text{wants}} = ${ntex(income)} \\times \\frac{${fmt(pWants)}}{100} = ${ntex(wants, 8)}` },
    { text: "مبلغ الادخار من الدخل:", tex: `B_{\\text{save}} = ${ntex(income)} \\times \\frac{${fmt(pSave)}}{100} = ${ntex(save, 8)}` }
  ];

  return {
    results: [
      { label: "مبلغ الاحتياجات", value: money(needs) },
      { label: "مبلغ الرغبات", value: money(wants) },
      { label: "مبلغ الادخار", value: money(save) }
    ],
    steps,
    copy: `الاحتياجات: ${money(needs)}، الرغبات: ${money(wants)}، الادخار: ${money(save)} (من دخل ${money(income)})`,
    blocks: [
      { type: "table", caption: "الميزانية المخططة مقابل المصروف الفعلي", head: ["الفئة", "النسبة", "المخطط", "الفعلي", "الحكم"], rows }
    ]
  };
}
