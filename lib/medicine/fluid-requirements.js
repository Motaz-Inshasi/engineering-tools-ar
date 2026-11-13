import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "للتعليم والتدريب فقط، ولا يغني عن الطبيب أو الصيدلي أو البروتوكول المعتمد في مؤسستك." };

function maintenance(w) {
  const b1 = Math.min(w, 10);
  const b2 = Math.min(Math.max(w - 10, 0), 10);
  const b3 = Math.max(w - 20, 0);
  const daily = b1 * 100 + b2 * 50 + b3 * 20;
  const hourly = b1 * 4 + b2 * 2 + b3 * 1;
  const steps = [
    { text: "أول 10 كغ بمعدل 100 mL لكل كغ يومياً:", tex: `${ntex(b1)} \\times 100 = ${ntex(b1 * 100)}\\ mL` },
    { text: "الـ 10 كغ التالية بمعدل 50 mL لكل كغ يومياً:", tex: `${ntex(b2)} \\times 50 = ${ntex(b2 * 50)}\\ mL` },
    { text: "ما زاد على 20 كغ بمعدل 20 mL لكل كغ يومياً:", tex: `${ntex(b3)} \\times 20 = ${ntex(b3 * 20)}\\ mL` },
    { text: "الاحتياج اليومي الكلي:", tex: `${ntex(b1 * 100)} + ${ntex(b2 * 50)} + ${ntex(b3 * 20)} = ${ntex(daily)}\\ mL/day` },
    { text: "المعدل بالساعة بقاعدة 4-2-1:", tex: `4 \\times ${ntex(b1)} + 2 \\times ${ntex(b2)} + 1 \\times ${ntex(b3)} = ${ntex(hourly)}\\ mL/h` }
  ];
  return {
    daily,
    hourly,
    steps,
    results: [
      { label: "الاحتياج اليومي", value: `${fmt(daily)} mL/day`, text: `${fmt(daily)} mL/day` },
      { label: "المعدل بالساعة (4-2-1)", value: `${fmt(hourly)} mL/h`, text: `${fmt(hourly)} mL/h` }
    ],
    table: {
      caption: "شرائح الاحتياج الصيانية (Holliday-Segar)",
      head: ["الشريحة", "الوزن (كغ)", "mL/kg/day", "mL/day", "mL/kg/h", "mL/h"],
      rows: [
        ["أول 10 كغ", fmt(b1), "100", fmt(b1 * 100), "4", fmt(b1 * 4)],
        ["من 11 إلى 20 كغ", fmt(b2), "50", fmt(b2 * 50), "2", fmt(b2 * 2)],
        ["ما فوق 20 كغ", fmt(b3), "20", fmt(b3 * 20), "1", fmt(b3)]
      ]
    },
    copy: `الاحتياج اليومي ${fmt(daily)} mL/day، أي ${fmt(hourly)} mL/h (قاعدة 4-2-1)`
  };
}

function parkland(w, burn) {
  const total = 4 * w * burn;
  const half = total / 2;
  const r1 = half / 8;
  const r2 = half / 16;
  const steps = [
    { text: "حجم المحلول خلال 24 ساعة من معادلة باركلاند:", tex: `V = 4 \\times ${ntex(w)} \\times ${ntex(burn)} = ${ntex(total)}\\ mL` },
    { text: "نصف الحجم يُعطى في أول 8 ساعات:", tex: `\\frac{${ntex(total)}}{2} = ${ntex(half)}\\ mL` },
    { text: "معدل أول 8 ساعات:", tex: `\\frac{${ntex(half)}}{8} = ${ntex(r1, 6)}\\ mL/h` },
    { text: "النصف الثاني يُعطى في الـ 16 ساعة التالية:", tex: `\\frac{${ntex(half)}}{16} = ${ntex(r2, 6)}\\ mL/h` }
  ];
  return {
    total,
    r1,
    r2,
    steps,
    results: [
      { label: "إجمالي 24 ساعة", value: `${fmt(total)} mL`, text: `${fmt(total)} mL` },
      { label: "معدل أول 8 ساعات", value: `${fmt(r1)} mL/h`, text: `${fmt(r1)} mL/h` },
      { label: "معدل الـ 16 ساعة التالية", value: `${fmt(r2)} mL/h`, text: `${fmt(r2)} mL/h` }
    ],
    table: {
      caption: "جدول معدلات باركلاند",
      head: ["الفترة", "الحجم (mL)", "المعدل (mL/h)"],
      rows: [
        ["أول 8 ساعات من وقت الحرق", fmt(half), fmt(r1)],
        ["الـ 16 ساعة التالية", fmt(half), fmt(r2)]
      ]
    },
    copy: `باركلاند: ${fmt(total)} mL خلال 24 ساعة، أول 8 ساعات ${fmt(r1)} mL/h ثم ${fmt(r2)} mL/h لمدة 16 ساعة`
  };
}

export const meta = {
  description: "احسب احتياج السوائل اليومي للأطفال والبالغين بقاعدة Holliday-Segar مع المعدل بالساعة بقاعدة 4-2-1، أو حجم الإنعاش بمعادلة باركلاند للحروق مع معدلات أول 8 ساعات والـ 16 ساعة التالية.",
  keywords: ["احتياج السوائل", "Holliday-Segar", "قاعدة 4-2-1", "باركلاند", "Parkland", "الحروق", "الصيانة", "fluid requirements"],
  formulas: [
    { label: "الاحتياج الصيانيّ اليومي", tex: "V = 100W\\ (W\\le10),\\quad 1000 + 50(W-10)\\ (10<W\\le20),\\quad 1500 + 20(W-20)" },
    { label: "معادلة باركلاند", tex: "V_{24} = 4 \\times W \\times \\%TBSA" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "maintenance", options: [["maintenance", "احتياج الصيانة (Holliday-Segar)"], ["parkland", "إنعاش الحروق (باركلاند)"]] },
    { id: "weight", label: "الوزن", unit: "kg", type: "number", default: "70" },
    { id: "burn", label: "نسبة مساحة الحروق من الجسم", unit: "%TBSA", type: "number", default: "20", help: "من 1 إلى 100.", when: { mode: ["parkland"] } }
  ],
  example: { values: { mode: "maintenance", weight: "70", burn: "" }, expect: ["2500 mL/day", "110 mL/h"], note: "مثال: مريض وزنه 70 kg في وضع الصيانة." },
  invalid: { values: { mode: "parkland", weight: "70", burn: "0" } },
  related: ["iv-drip-rate", "drug-dosage", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["maintenance", "parkland"], "maintenance");
  const w = num(input, "weight", "الوزن", { positive: true, max: 300 });
  const out = mode === "parkland"
    ? parkland(w, num(input, "burn", "نسبة الحروق", { min: 1, max: 100 }))
    : maintenance(w);
  return {
    results: out.results,
    steps: out.steps,
    blocks: [NOTE, { type: "table", caption: out.table.caption, head: out.table.head, rows: out.table.rows }],
    copy: out.copy
  };
}
