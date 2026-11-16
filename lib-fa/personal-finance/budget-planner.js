import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PRESETS = { "50-30-20": [50, 30, 20], "70-20-10": [70, 20, 10] };

const verdict = (kind, target, actual) => {
  if (actual === null) return "مصرف واقعی وارد نشده است";
  const diff = Math.round((actual - target) * 100) / 100;
  if (diff === 0) return "مطابق بودجه";
  if (kind === "save") return diff > 0 ? `${money(diff)} بیشتر از هدف` : `${money(-diff)} کمتر از هدف`;
  return diff < 0 ? `در بودجه (صرفه‌جویی ${money(-diff)})` : `${money(diff)} بیشتر از بودجه`;
};

export const meta = {
  description: "درآمد ماهانهٔ خالص خود را طبق قاعدهٔ 50/30/20 یا 70/20/10 یا درصدهایی که انتخاب می‌کنید، میان نیازها، خواسته‌ها و پس‌انداز تقسیم کنید، و هزینهٔ واقعی را با بودجه مقایسه کنید تا مازاد یا صرفه‌جویی را بدانید.",
  keywords: ["بودجه", "توزیع درآمد", "50 30 20", "70 20 10", "بودجهٔ ماهانه", "budget", "پس‌انداز"],
  formulas: [
    { label: "مبلغ هر دسته", tex: "B_i = I \\times \\frac{p_i}{100}" },
    { label: "شرط درصدهای دلخواه", tex: "p_1 + p_2 + p_3 = 100" },
    { label: "تفاوت واقعی و برنامه‌ریزی‌شده", tex: "\\Delta_i = A_i - B_i" }
  ],
  inputs: [
    { id: "income", label: "درآمد ماهانهٔ خالص", type: "number", default: "10000", help: "درآمد پس از کسورات و مالیات‌ها." },
    { id: "method", label: "روش تقسیم", type: "select", default: "50-30-20", options: [["50-30-20", "50 / 30 / 20 (نیازها / خواسته‌ها / پس‌انداز)"], ["70-20-10", "70 / 20 / 10"], ["custom", "درصدهای دلخواه"]] },
    { id: "needsPct", label: "درصد نیازها", unit: "%", type: "number", default: "50", when: { method: ["custom"] } },
    { id: "wantsPct", label: "درصد خواسته‌ها", unit: "%", type: "number", default: "30", when: { method: ["custom"] } },
    { id: "savePct", label: "درصد پس‌انداز", unit: "%", type: "number", default: "20", when: { method: ["custom"] }, help: "مجموع سه درصد باید 100% باشد." },
    { id: "needsActual", label: "هزینهٔ واقعی نیازها", type: "number", help: "اختیاری: اگر نمی‌خواهید مقایسه کنید، خالی بگذارید." },
    { id: "wantsActual", label: "هزینهٔ واقعی خواسته‌ها", type: "number", help: "اختیاری." },
    { id: "savingsActual", label: "مبلغ واقعی پس‌انداز شده", type: "number", help: "اختیاری." }
  ],
  example: { values: { income: "10000", method: "50-30-20", needsPct: "50", wantsPct: "30", savePct: "20", needsActual: "6000", wantsActual: "", savingsActual: "1500" }, expect: ["5,000.00", "3,000.00"], note: "مثال: درآمد 10000 با قاعدهٔ 50/30/20، و هزینهٔ واقعی نیازها 6000 که از بودجه بیشتر است." },
  invalid: { values: { income: "10000", method: "custom", needsPct: "50", wantsPct: "30", savePct: "30", needsActual: "", wantsActual: "", savingsActual: "" } },
  related: ["savings-goal", "zakat", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const income = num(input, "income", "درآمد خالص", { positive: true });
  const method = choice(input, "method", "روش تقسیم", ["50-30-20", "70-20-10", "custom"], "50-30-20");
  let pcts;
  if (method === "custom") {
    const needs = num(input, "needsPct", "درصد نیازها", { min: 0, max: 100 });
    const wants = num(input, "wantsPct", "درصد خواسته‌ها", { min: 0, max: 100 });
    const save = num(input, "savePct", "درصد پس‌انداز", { min: 0, max: 100 });
    if (Math.abs(needs + wants + save - 100) > 1e-9) fail(`مجموع درصدها ${fmt(needs + wants + save)}% و باید 100% باشد.`, "savePct");
    pcts = [needs, wants, save];
  } else {
    pcts = PRESETS[method];
  }
  const actual = (key, label) => num(input, key, label, { nonNegative: true, optional: true });
  const actuals = [actual("needsActual", "هزینهٔ واقعی نیازها"), actual("wantsActual", "هزینهٔ واقعی خواسته‌ها"), actual("savingsActual", "مبلغ واقعی پس‌انداز شده")];

  const [pNeeds, pWants, pSave] = pcts;
  const needs = (income * pNeeds) / 100;
  const wants = (income * pWants) / 100;
  const save = (income * pSave) / 100;
  const targets = [needs, wants, save];
  const names = ["نیازها", "خواسته‌ها", "پس‌انداز"];
  const kinds = ["spend", "spend", "save"];

  const rows = names.map((name, k) => [
    name,
    `${fmt(pcts[k])}%`,
    money(targets[k]),
    actuals[k] === null ? "—" : money(actuals[k]),
    verdict(kinds[k], targets[k], actuals[k])
  ]);

  const steps = [
    { text: "مبلغ نیازها از درآمد:", tex: `B_{\\text{needs}} = ${ntex(income)} \\times \\frac{${fmt(pNeeds)}}{100} = ${ntex(needs, 8)}` },
    { text: "مبلغ خواسته‌ها از درآمد:", tex: `B_{\\text{wants}} = ${ntex(income)} \\times \\frac{${fmt(pWants)}}{100} = ${ntex(wants, 8)}` },
    { text: "مبلغ پس‌انداز از درآمد:", tex: `B_{\\text{save}} = ${ntex(income)} \\times \\frac{${fmt(pSave)}}{100} = ${ntex(save, 8)}` }
  ];

  return {
    results: [
      { label: "مبلغ نیازها", value: money(needs) },
      { label: "مبلغ خواسته‌ها", value: money(wants) },
      { label: "مبلغ پس‌انداز", value: money(save) }
    ],
    steps,
    copy: `نیازها: ${money(needs)}، خواسته‌ها: ${money(wants)}، پس‌انداز: ${money(save)} (از درآمد ${money(income)})`,
    blocks: [
      { type: "table", caption: "بودجهٔ برنامه‌ریزی‌شده در برابر هزینهٔ واقعی", head: ["دسته", "نسبت", "برنامه", "واقعی", "حکم"], rows }
    ]
  };
}
