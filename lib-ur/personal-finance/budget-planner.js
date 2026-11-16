import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PRESETS = { "50-30-20": [50, 30, 20], "70-20-10": [70, 20, 10] };

const verdict = (kind, target, actual) => {
  if (actual === null) return "حقیقی خرچ درج نہیں کیا گیا";
  const diff = Math.round((actual - target) * 100) / 100;
  if (diff === 0) return "بجٹ کے مطابق ہے";
  if (kind === "save") return diff > 0 ? `ہدف سے ${money(diff)} زیادہ` : `ہدف سے ${money(-diff)} کم`;
  return diff < 0 ? `بجٹ کے اندر (${money(-diff)} کی بچت)` : `بجٹ سے ${money(diff)} زیادہ خرچ`;
};

export const meta = {
  description: "اپنی ماہانہ خالص آمدنی کو 50/30/20 یا 70/20/10 کے اصول، یا اپنی منتخب کردہ فیصد کے مطابق ضروریات، خواہشات اور بچت میں تقسیم کریں، اور حقیقی خرچ کا بجٹ سے موازنہ کر کے زیادہ خرچ یا بچت معلوم کریں۔",
  keywords: ["بجٹ", "آمدنی کی تقسیم", "50 30 20", "70 20 10", "ماہانہ بجٹ", "budget", "بچت"],
  formulas: [
    { label: "ہر زمرے کی رقم", tex: "B_i = I \\times \\frac{p_i}{100}" },
    { label: "حسب ضرورت فیصد کی شرط", tex: "p_1 + p_2 + p_3 = 100" },
    { label: "حقیقی اور منصوبہ بند کے درمیان فرق", tex: "\\Delta_i = A_i - B_i" }
  ],
  inputs: [
    { id: "income", label: "ماہانہ خالص آمدنی", type: "number", default: "10000", help: "کٹوتیوں اور ٹیکسوں کے بعد آمدنی۔" },
    { id: "method", label: "تقسیم کا طریقہ", type: "select", default: "50-30-20", options: [["50-30-20", "50 / 30 / 20 (ضروریات / خواہشات / بچت)"], ["70-20-10", "70 / 20 / 10"], ["custom", "حسب ضرورت فیصد"]] },
    { id: "needsPct", label: "ضروریات کا فیصد", unit: "%", type: "number", default: "50", when: { method: ["custom"] } },
    { id: "wantsPct", label: "خواہشات کا فیصد", unit: "%", type: "number", default: "30", when: { method: ["custom"] } },
    { id: "savePct", label: "بچت کا فیصد", unit: "%", type: "number", default: "20", when: { method: ["custom"] }, help: "تینوں فیصد کا مجموعہ 100% ہونا چاہیے۔" },
    { id: "needsActual", label: "ضروریات پر حقیقی خرچ", type: "number", help: "اختیاری: موازنہ نہ چاہیں تو خالی چھوڑ دیں۔" },
    { id: "wantsActual", label: "خواہشات پر حقیقی خرچ", type: "number", help: "اختیاری۔" },
    { id: "savingsActual", label: "حقیقی طور پر جمع شدہ رقم", type: "number", help: "اختیاری۔" }
  ],
  example: { values: { income: "10000", method: "50-30-20", needsPct: "50", wantsPct: "30", savePct: "20", needsActual: "6000", wantsActual: "", savingsActual: "1500" }, expect: ["5,000.00", "3,000.00"], note: "مثال: 50/30/20 اصول کے مطابق 10000 آمدنی، اور ضروریات پر حقیقی خرچ 6000 جو بجٹ سے زیادہ ہے۔" },
  invalid: { values: { income: "10000", method: "custom", needsPct: "50", wantsPct: "30", savePct: "30", needsActual: "", wantsActual: "", savingsActual: "" } },
  related: ["savings-goal", "zakat", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const income = num(input, "income", "خالص آمدنی", { positive: true });
  const method = choice(input, "method", "تقسیم کا طریقہ", ["50-30-20", "70-20-10", "custom"], "50-30-20");
  let pcts;
  if (method === "custom") {
    const needs = num(input, "needsPct", "ضروریات کا فیصد", { min: 0, max: 100 });
    const wants = num(input, "wantsPct", "خواہشات کا فیصد", { min: 0, max: 100 });
    const save = num(input, "savePct", "بچت کا فیصد", { min: 0, max: 100 });
    if (Math.abs(needs + wants + save - 100) > 1e-9) fail(`فیصد کا مجموعہ ${fmt(needs + wants + save)}% ہے اور 100% ہونا چاہیے۔`, "savePct");
    pcts = [needs, wants, save];
  } else {
    pcts = PRESETS[method];
  }
  const actual = (key, label) => num(input, key, label, { nonNegative: true, optional: true });
  const actuals = [actual("needsActual", "ضروریات پر حقیقی خرچ"), actual("wantsActual", "خواہشات پر حقیقی خرچ"), actual("savingsActual", "حقیقی طور پر جمع شدہ رقم")];

  const [pNeeds, pWants, pSave] = pcts;
  const needs = (income * pNeeds) / 100;
  const wants = (income * pWants) / 100;
  const save = (income * pSave) / 100;
  const targets = [needs, wants, save];
  const names = ["ضروریات", "خواہشات", "بچت"];
  const kinds = ["spend", "spend", "save"];

  const rows = names.map((name, k) => [
    name,
    `${fmt(pcts[k])}%`,
    money(targets[k]),
    actuals[k] === null ? "—" : money(actuals[k]),
    verdict(kinds[k], targets[k], actuals[k])
  ]);

  const steps = [
    { text: "ضروریات کے لیے آمدنی کی رقم:", tex: `B_{\\text{needs}} = ${ntex(income)} \\times \\frac{${fmt(pNeeds)}}{100} = ${ntex(needs, 8)}` },
    { text: "خواہشات کے لیے آمدنی کی رقم:", tex: `B_{\\text{wants}} = ${ntex(income)} \\times \\frac{${fmt(pWants)}}{100} = ${ntex(wants, 8)}` },
    { text: "بچت کے لیے آمدنی کی رقم:", tex: `B_{\\text{save}} = ${ntex(income)} \\times \\frac{${fmt(pSave)}}{100} = ${ntex(save, 8)}` }
  ];

  return {
    results: [
      { label: "ضروریات کی رقم", value: money(needs) },
      { label: "خواہشات کی رقم", value: money(wants) },
      { label: "بچت کی رقم", value: money(save) }
    ],
    steps,
    copy: `ضروریات: ${money(needs)}، خواہشات: ${money(wants)}، بچت: ${money(save)} (آمدنی ${money(income)} میں سے)`,
    blocks: [
      { type: "table", caption: "منصوبہ بند بجٹ بمقابلہ حقیقی خرچ", head: ["زمرہ", "فیصد", "منصوبہ بند", "حقیقی", "فیصلہ"], rows }
    ]
  };
}
