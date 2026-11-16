import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرف تعلیم اور تربیت کے لیے ہے، یہ آپ کے معالج، فارماسسٹ یا آپ کے ادارے کے منظور شدہ پروٹوکول کا متبادل نہیں ہے۔" };

function maintenance(w) {
  const b1 = Math.min(w, 10);
  const b2 = Math.min(Math.max(w - 10, 0), 10);
  const b3 = Math.max(w - 20, 0);
  const daily = b1 * 100 + b2 * 50 + b3 * 20;
  const hourly = b1 * 4 + b2 * 2 + b3 * 1;
  const steps = [
    { text: "پہلے 10 kg کے لیے فی کلوگرام یومیہ 100 mL کی شرح سے:", tex: `${ntex(b1)} \\times 100 = ${ntex(b1 * 100)}\\ mL` },
    { text: "اگلے 10 kg کے لیے فی کلوگرام یومیہ 50 mL کی شرح سے:", tex: `${ntex(b2)} \\times 50 = ${ntex(b2 * 50)}\\ mL` },
    { text: "20 kg سے زیادہ کے لیے فی کلوگرام یومیہ 20 mL کی شرح سے:", tex: `${ntex(b3)} \\times 20 = ${ntex(b3 * 20)}\\ mL` },
    { text: "کل یومیہ ضرورت:", tex: `${ntex(b1 * 100)} + ${ntex(b2 * 50)} + ${ntex(b3 * 20)} = ${ntex(daily)}\\ mL/day` },
    { text: "4-2-1 کے اصول سے فی گھنٹہ شرح:", tex: `4 \\times ${ntex(b1)} + 2 \\times ${ntex(b2)} + 1 \\times ${ntex(b3)} = ${ntex(hourly)}\\ mL/h` }
  ];
  return {
    daily,
    hourly,
    steps,
    results: [
      { label: "یومیہ ضرورت", value: `${fmt(daily)} mL/day`, text: `${fmt(daily)} mL/day` },
      { label: "فی گھنٹہ شرح (4-2-1)", value: `${fmt(hourly)} mL/h`, text: `${fmt(hourly)} mL/h` }
    ],
    table: {
      caption: "دیکھ بھال کی ضرورت کے درجات (Holliday-Segar)",
      head: ["درجہ", "وزن (kg)", "mL/kg/day", "mL/day", "mL/kg/h", "mL/h"],
      rows: [
        ["پہلے 10 kg", fmt(b1), "100", fmt(b1 * 100), "4", fmt(b1 * 4)],
        ["11 سے 20 kg تک", fmt(b2), "50", fmt(b2 * 50), "2", fmt(b2 * 2)],
        ["20 kg سے زیادہ", fmt(b3), "20", fmt(b3 * 20), "1", fmt(b3)]
      ]
    },
    copy: `یومیہ ضرورت ${fmt(daily)} mL/day، یعنی ${fmt(hourly)} mL/h (4-2-1 اصول)`
  };
}

function parkland(w, burn) {
  const total = 4 * w * burn;
  const half = total / 2;
  const r1 = half / 8;
  const r2 = half / 16;
  const steps = [
    { text: "پارک لینڈ فارمولے سے 24 گھنٹے میں محلول کا حجم:", tex: `V = 4 \\times ${ntex(w)} \\times ${ntex(burn)} = ${ntex(total)}\\ mL` },
    { text: "آدھا حجم پہلے 8 گھنٹوں میں دیا جاتا ہے:", tex: `\\frac{${ntex(total)}}{2} = ${ntex(half)}\\ mL` },
    { text: "پہلے 8 گھنٹوں کی شرح:", tex: `\\frac{${ntex(half)}}{8} = ${ntex(r1, 6)}\\ mL/h` },
    { text: "دوسرا نصف اگلے 16 گھنٹوں میں دیا جاتا ہے:", tex: `\\frac{${ntex(half)}}{16} = ${ntex(r2, 6)}\\ mL/h` }
  ];
  return {
    total,
    r1,
    r2,
    steps,
    results: [
      { label: "24 گھنٹے کا کل", value: `${fmt(total)} mL`, text: `${fmt(total)} mL` },
      { label: "پہلے 8 گھنٹوں کی شرح", value: `${fmt(r1)} mL/h`, text: `${fmt(r1)} mL/h` },
      { label: "اگلے 16 گھنٹوں کی شرح", value: `${fmt(r2)} mL/h`, text: `${fmt(r2)} mL/h` }
    ],
    table: {
      caption: "پارک لینڈ شرح کا جدول",
      head: ["مدت", "حجم (mL)", "شرح (mL/h)"],
      rows: [
        ["جلنے کے وقت سے پہلے 8 گھنٹے", fmt(half), fmt(r1)],
        ["اگلے 16 گھنٹے", fmt(half), fmt(r2)]
      ]
    },
    copy: `پارک لینڈ: 24 گھنٹے میں ${fmt(total)} mL، پہلے 8 گھنٹے ${fmt(r1)} mL/h پر، پھر 16 گھنٹے ${fmt(r2)} mL/h پر`
  };
}

export const meta = {
  description: "بچوں اور بڑوں کی یومیہ سیال ضرورت Holliday-Segar اصول سے، اور 4-2-1 اصول کے تحت فی گھنٹہ شرح کے ساتھ، یا جلنے کے مریضوں کا ریسسیٹیشن حجم پارک لینڈ فارمولے سے، پہلے 8 گھنٹے اور اگلے 16 گھنٹوں کی شرحوں کے ساتھ حساب کریں۔",
  keywords: ["سیال کی ضرورت", "Holliday-Segar", "4-2-1 اصول", "پارک لینڈ", "Parkland", "جلنے کے مریض", "دیکھ بھال", "fluid requirements"],
  formulas: [
    { label: "یومیہ دیکھ بھال کی ضرورت", tex: "V = 100W\\ (W\\le10),\\quad 1000 + 50(W-10)\\ (10<W\\le20),\\quad 1500 + 20(W-20)" },
    { label: "پارک لینڈ فارمولا", tex: "V_{24} = 4 \\times W \\times \\%TBSA" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "maintenance", options: [["maintenance", "دیکھ بھال کی ضرورت (Holliday-Segar)"], ["parkland", "جلنے کا ریسسیٹیشن (پارک لینڈ)"]] },
    { id: "weight", label: "وزن", unit: "kg", type: "number", default: "70" },
    { id: "burn", label: "جسم کی جلی ہوئی سطح کا فیصد", unit: "%TBSA", type: "number", default: "20", help: "1 سے 100 تک۔", when: { mode: ["parkland"] } }
  ],
  example: { values: { mode: "maintenance", weight: "70", burn: "" }, expect: ["2500 mL/day", "110 mL/h"], note: "مثال: دیکھ بھال کے موڈ میں 70 kg وزن والا مریض۔" },
  invalid: { values: { mode: "parkland", weight: "70", burn: "0" } },
  related: ["iv-drip-rate", "drug-dosage", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["maintenance", "parkland"], "maintenance");
  const w = num(input, "weight", "وزن", { positive: true, max: 300 });
  const out = mode === "parkland"
    ? parkland(w, num(input, "burn", "جلنے کا فیصد", { min: 1, max: 100 }))
    : maintenance(w);
  return {
    results: out.results,
    steps: out.steps,
    blocks: [NOTE, { type: "table", caption: out.table.caption, head: out.table.head, rows: out.table.rows }],
    copy: out.copy
  };
}
