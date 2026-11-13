import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "للتعليم والتدريب فقط، ولا يغني عن الطبيب أو الصيدلي أو البروتوكول المعتمد في مؤسستك." };

export const meta = {
  description: "احسب معدل التنقيط الوريدي بالمليلتر في الساعة، وعدد القطرات في الدقيقة لعدد من عوامل الأنبوب، مع القيمة الدقيقة والقيمة المقرّبة لأقرب قطرة كاملة.",
  keywords: ["التنقيط الوريدي", "عدد القطرات", "gtt/min", "معدل التسريب", "IV drip rate", "drop factor", "mL/h"],
  formulas: [
    { label: "معدل التدفق", tex: "R = \\frac{V}{T}" },
    { label: "القطرات في الدقيقة", tex: "N = \\frac{R \\times DF}{60}" }
  ],
  inputs: [
    { id: "volume", label: "حجم المحلول", unit: "mL", type: "number", default: "1000" },
    { id: "hours", label: "المدة بالساعات", unit: "h", type: "number", default: "8", help: "عدد صحيح من 0 إلى 999." },
    { id: "minutes", label: "المدة بالدقائق", unit: "min", type: "number", default: "0", help: "عدد صحيح من 0 إلى 59." },
    { id: "dropFactor", label: "عامل الأنبوب", unit: "gtt/mL", type: "select", default: "20", options: [["10", "10 قطرات/mL"], ["15", "15 قطرة/mL"], ["20", "20 قطرة/mL"], ["60", "60 قطرة/mL (مِكرو)"]] }
  ],
  example: { values: { volume: "1000", hours: "8", minutes: "0", dropFactor: "15" }, expect: ["125 mL/h", "31 gtt/min"], note: "مثال: 1000 mL تُعطى خلال 8 ساعات بأنبوب 15 قطرة/mL." },
  invalid: { values: { volume: "1000", hours: "0", minutes: "0", dropFactor: "15" } },
  related: ["drug-dosage", "fluid-requirements", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const V = num(input, "volume", "حجم المحلول", { positive: true });
  const hours = num(input, "hours", "المدة بالساعات", { integer: true, min: 0, max: 999 });
  const minutes = num(input, "minutes", "المدة بالدقائق", { integer: true, min: 0, max: 59 });
  const DF = Number(choice(input, "dropFactor", "عامل الأنبوب", ["10", "15", "20", "60"], "20"));
  const T = hours * 60 + minutes;
  if (T <= 0) fail("أدخل مدة أكبر من صفر (ساعات أو دقائق).", "hours");
  const rate = V * 60 / T;
  const exactDrops = rate * DF / 60;
  const drops = Math.round(exactDrops);
  const steps = [
    { text: "المدة الكلية بالدقائق:", tex: `T = ${ntex(hours)} \\times 60 + ${ntex(minutes)} = ${ntex(T)}\\ min` },
    { text: "معدل التدفق بالمليلتر في الساعة:", tex: `R = \\frac{${ntex(V)}}{${ntex(T / 60, 6)}} = ${ntex(rate, 6)}\\ mL/h` },
    { text: "عدد القطرات في الدقيقة (القيمة الدقيقة):", tex: `N = \\frac{${ntex(rate, 6)} \\times ${DF}}{60} = ${ntex(exactDrops, 6)}\\ gtt/min` },
    { text: "نقرّب إلى أقرب قطرة كاملة:", tex: `N \\approx ${drops}\\ gtt/min` }
  ];
  const blocks = [NOTE];
  if (drops === 0) blocks.unshift({ type: "note", tone: "warn", text: "المعدل أقل من قطرة واحدة في الدقيقة بعد التقريب، لذلك لا يمكن ضبطه بهذا الأنبوب. استخدم أنبوباً بعامل أعلى أو مضخة تسريب." });
  return {
    results: [
      { label: "معدل التدفق", value: `${fmt(rate, 6)} mL/h`, text: `${fmt(rate, 6)} mL/h` },
      { label: "القطرات في الدقيقة (دقيقة)", value: `${fmt(exactDrops, 6)} gtt/min` },
      { label: "القطرات في الدقيقة (مقرّبة)", value: `${drops} gtt/min`, text: `${drops} gtt/min` }
    ],
    steps,
    blocks,
    copy: `معدل التدفق ${fmt(rate, 6)} mL/h، والقطرات ${fmt(exactDrops, 6)} تُقرّب إلى ${drops} gtt/min`
  };
}
