import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرفاً برای آموزش و تمرین است و جایگزین پزشک، داروساز یا پروتکل معتبر مؤسسهٔ شما نیست." };

function maintenance(w) {
  const b1 = Math.min(w, 10);
  const b2 = Math.min(Math.max(w - 10, 0), 10);
  const b3 = Math.max(w - 20, 0);
  const daily = b1 * 100 + b2 * 50 + b3 * 20;
  const hourly = b1 * 4 + b2 * 2 + b3 * 1;
  const steps = [
    { text: "اولین 10 کیلوگرم با آهنگ 100 mL به ازای هر کیلوگرم در روز:", tex: `${ntex(b1)} \\times 100 = ${ntex(b1 * 100)}\\ mL` },
    { text: "10 کیلوگرم بعدی با آهنگ 50 mL به ازای هر کیلوگرم در روز:", tex: `${ntex(b2)} \\times 50 = ${ntex(b2 * 50)}\\ mL` },
    { text: "بیش از 20 کیلوگرم با آهنگ 20 mL به ازای هر کیلوگرم در روز:", tex: `${ntex(b3)} \\times 20 = ${ntex(b3 * 20)}\\ mL` },
    { text: "نیاز روزانهٔ کل:", tex: `${ntex(b1 * 100)} + ${ntex(b2 * 50)} + ${ntex(b3 * 20)} = ${ntex(daily)}\\ mL/day` },
    { text: "آهنگ ساعتی بر اساس قاعدهٔ 4-2-1:", tex: `4 \\times ${ntex(b1)} + 2 \\times ${ntex(b2)} + 1 \\times ${ntex(b3)} = ${ntex(hourly)}\\ mL/h` }
  ];
  return {
    daily,
    hourly,
    steps,
    results: [
      { label: "نیاز روزانه", value: `${fmt(daily)} mL/day`, text: `${fmt(daily)} mL/day` },
      { label: "آهنگ ساعتی (4-2-1)", value: `${fmt(hourly)} mL/h`, text: `${fmt(hourly)} mL/h` }
    ],
    table: {
      caption: "سطوح نیاز نگه‌داری (Holliday-Segar)",
      head: ["سطح", "وزن (کیلوگرم)", "mL/kg/day", "mL/day", "mL/kg/h", "mL/h"],
      rows: [
        ["اولین 10 کیلوگرم", fmt(b1), "100", fmt(b1 * 100), "4", fmt(b1 * 4)],
        ["از 11 تا 20 کیلوگرم", fmt(b2), "50", fmt(b2 * 50), "2", fmt(b2 * 2)],
        ["بیش از 20 کیلوگرم", fmt(b3), "20", fmt(b3 * 20), "1", fmt(b3)]
      ]
    },
    copy: `نیاز روزانه ${fmt(daily)} mL/day، یعنی ${fmt(hourly)} mL/h (قاعدهٔ 4-2-1)`
  };
}

function parkland(w, burn) {
  const total = 4 * w * burn;
  const half = total / 2;
  const r1 = half / 8;
  const r2 = half / 16;
  const steps = [
    { text: "حجم محلول در 24 ساعت بر اساس فرمول پارکلند:", tex: `V = 4 \\times ${ntex(w)} \\times ${ntex(burn)} = ${ntex(total)}\\ mL` },
    { text: "نیمی از حجم در 8 ساعت اول داده می‌شود:", tex: `\\frac{${ntex(total)}}{2} = ${ntex(half)}\\ mL` },
    { text: "آهنگ 8 ساعت اول:", tex: `\\frac{${ntex(half)}}{8} = ${ntex(r1, 6)}\\ mL/h` },
    { text: "نیمهٔ دوم در 16 ساعت بعد داده می‌شود:", tex: `\\frac{${ntex(half)}}{16} = ${ntex(r2, 6)}\\ mL/h` }
  ];
  return {
    total,
    r1,
    r2,
    steps,
    results: [
      { label: "مجموع 24 ساعت", value: `${fmt(total)} mL`, text: `${fmt(total)} mL` },
      { label: "آهنگ 8 ساعت اول", value: `${fmt(r1)} mL/h`, text: `${fmt(r1)} mL/h` },
      { label: "آهنگ 16 ساعت بعد", value: `${fmt(r2)} mL/h`, text: `${fmt(r2)} mL/h` }
    ],
    table: {
      caption: "جدول آهنگ‌های پارکلند",
      head: ["بازه", "حجم (mL)", "آهنگ (mL/h)"],
      rows: [
        ["8 ساعت اول از زمان سوختگی", fmt(half), fmt(r1)],
        ["16 ساعت بعد", fmt(half), fmt(r2)]
      ]
    },
    copy: `پارکلند: ${fmt(total)} mL در 24 ساعت، 8 ساعت اول با ${fmt(r1)} mL/h و سپس ${fmt(r2)} mL/h به مدت 16 ساعت`
  };
}

export const meta = {
  description: "نیاز روزانهٔ مایعات کودکان و بزرگسالان را با قاعدهٔ Holliday-Segar و آهنگ ساعتی بر اساس قاعدهٔ 4-2-1 محاسبه کنید، یا حجم احیای سوختگی را با فرمول پارکلند و آهنگ‌های 8 ساعت اول و 16 ساعت بعد بیابید.",
  keywords: ["نیاز مایعات", "Holliday-Segar", "قاعدهٔ 4-2-1", "پارکلند", "Parkland", "سوختگی", "نگه‌داری", "fluid requirements"],
  formulas: [
    { label: "نیاز نگه‌داری روزانه", tex: "V = 100W\\ (W\\le10),\\quad 1000 + 50(W-10)\\ (10<W\\le20),\\quad 1500 + 20(W-20)" },
    { label: "فرمول پارکلند", tex: "V_{24} = 4 \\times W \\times \\%TBSA" }
  ],
  inputs: [
    { id: "mode", label: "نوع محاسبه", type: "select", default: "maintenance", options: [["maintenance", "نیاز نگه‌داری (Holliday-Segar)"], ["parkland", "احیای سوختگی (پارکلند)"]] },
    { id: "weight", label: "وزن", unit: "kg", type: "number", default: "70" },
    { id: "burn", label: "درصد سطح بدن سوخته", unit: "%TBSA", type: "number", default: "20", help: "از 1 تا 100.", when: { mode: ["parkland"] } }
  ],
  example: { values: { mode: "maintenance", weight: "70", burn: "" }, expect: ["2500 mL/day", "110 mL/h"], note: "مثال: بیماری به وزن 70 kg در حالت نگه‌داری." },
  invalid: { values: { mode: "parkland", weight: "70", burn: "0" } },
  related: ["iv-drip-rate", "drug-dosage", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع محاسبه", ["maintenance", "parkland"], "maintenance");
  const w = num(input, "weight", "وزن", { positive: true, max: 300 });
  const out = mode === "parkland"
    ? parkland(w, num(input, "burn", "درصد سوختگی", { min: 1, max: 100 }))
    : maintenance(w);
  return {
    results: out.results,
    steps: out.steps,
    blocks: [NOTE, { type: "table", caption: out.table.caption, head: out.table.head, rows: out.table.rows }],
    copy: out.copy
  };
}
