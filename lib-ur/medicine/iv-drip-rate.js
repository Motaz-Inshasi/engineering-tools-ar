import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرف تعلیم اور تربیت کے لیے ہے، یہ آپ کے معالج، فارماسسٹ یا آپ کے ادارے کے منظور شدہ پروٹوکول کا متبادل نہیں ہے۔" };

export const meta = {
  description: "نس کے ذریعے دیے جانے والے محلول کی شرح فی گھنٹہ ملی لیٹر اور ٹیوب کے ڈراپ فیکٹر کے لیے فی منٹ قطروں کی تعداد حساب کریں، ساتھ عین قدر اور پورے قطرے تک گول کی گئی قدر۔",
  keywords: ["وریدی ڈرِپ کی رفتار", "قطروں کی تعداد", "gtt/min", "انفیوژن کی رفتار", "IV drip rate", "drop factor", "mL/h"],
  formulas: [
    { label: "بہاؤ کی شرح", tex: "R = \\frac{V}{T}" },
    { label: "فی منٹ قطرے", tex: "N = \\frac{R \\times DF}{60}" }
  ],
  inputs: [
    { id: "volume", label: "محلول کا حجم", unit: "mL", type: "number", default: "1000" },
    { id: "hours", label: "مدت گھنٹوں میں", unit: "h", type: "number", default: "8", help: "0 سے 999 تک صحیح عدد۔" },
    { id: "minutes", label: "مدت منٹوں میں", unit: "min", type: "number", default: "0", help: "0 سے 59 تک صحیح عدد۔" },
    { id: "dropFactor", label: "ٹیوب کا ڈراپ فیکٹر", unit: "gtt/mL", type: "select", default: "20", options: [["10", "10 قطرے/mL"], ["15", "15 قطرے/mL"], ["20", "20 قطرے/mL"], ["60", "60 قطرے/mL (مائیکرو)"]] }
  ],
  example: { values: { volume: "1000", hours: "8", minutes: "0", dropFactor: "15" }, expect: ["125 mL/h", "31 gtt/min"], note: "مثال: 15 قطرے/mL کی ٹیوب کے ساتھ 8 گھنٹوں میں دیے جانے والے 1000 mL۔" },
  invalid: { values: { volume: "1000", hours: "0", minutes: "0", dropFactor: "15" } },
  related: ["drug-dosage", "fluid-requirements", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const V = num(input, "volume", "محلول کا حجم", { positive: true });
  const hours = num(input, "hours", "مدت گھنٹوں میں", { integer: true, min: 0, max: 999 });
  const minutes = num(input, "minutes", "مدت منٹوں میں", { integer: true, min: 0, max: 59 });
  const DF = Number(choice(input, "dropFactor", "ٹیوب کا ڈراپ فیکٹر", ["10", "15", "20", "60"], "20"));
  const T = hours * 60 + minutes;
  if (T <= 0) fail("صفر سے زیادہ مدت درج کریں (گھنٹے یا منٹ)۔", "hours");
  const rate = V * 60 / T;
  const exactDrops = rate * DF / 60;
  const drops = Math.round(exactDrops);
  const steps = [
    { text: "کل مدت منٹوں میں:", tex: `T = ${ntex(hours)} \\times 60 + ${ntex(minutes)} = ${ntex(T)}\\ min` },
    { text: "فی گھنٹہ ملی لیٹر میں بہاؤ کی شرح:", tex: `R = \\frac{${ntex(V)}}{${ntex(T / 60, 6)}} = ${ntex(rate, 6)}\\ mL/h` },
    { text: "فی منٹ قطرے (عین قدر):", tex: `N = \\frac{${ntex(rate, 6)} \\times ${DF}}{60} = ${ntex(exactDrops, 6)}\\ gtt/min` },
    { text: "ہم قریب ترین پورے قطرے تک گول کرتے ہیں:", tex: `N \\approx ${drops}\\ gtt/min` }
  ];
  const blocks = [NOTE];
  if (drops === 0) blocks.unshift({ type: "note", tone: "warn", text: "گول کرنے کے بعد شرح فی منٹ ایک قطرے سے کم ہے، اس لیے اس ٹیوب کے ساتھ اسے سیٹ نہیں کیا جا سکتا۔ زیادہ ڈراپ فیکٹر والی ٹیوب یا انفیوژن پمپ استعمال کریں۔" });
  return {
    results: [
      { label: "بہاؤ کی شرح", value: `${fmt(rate, 6)} mL/h`, text: `${fmt(rate, 6)} mL/h` },
      { label: "فی منٹ قطرے (عین)", value: `${fmt(exactDrops, 6)} gtt/min` },
      { label: "فی منٹ قطرے (گول شدہ)", value: `${drops} gtt/min`, text: `${drops} gtt/min` }
    ],
    steps,
    blocks,
    copy: `بہاؤ کی شرح ${fmt(rate, 6)} mL/h، اور قطرے ${fmt(exactDrops, 6)} کو ${drops} gtt/min تک گول کیا گیا`
  };
}
