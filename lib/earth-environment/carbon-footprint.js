import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const FUEL = { gasoline: 2.31, diesel: 2.68 };
const LPG = 2.98;
const FLIGHT = 0.15;
const TREE = 21;

export const meta = {
  description: "احسب البصمة الكربونية السنوية من الكهرباء والسيارة وغاز البوتان والرحلات الجوية، مع نسبة كل مصدر وعدد الأشجار اللازمة لامتصاص الانبعاثات، والمعاملات تقريبية.",
  keywords: ["بصمة كربونية", "ثاني أكسيد الكربون", "CO2", "carbon footprint", "كهرباء", "سيارة", "طيران", "أشجار"],
  formulas: [
    { label: "انبعاث الكهرباء السنوي", tex: "E_{el} = 12\\,k\\,f_{el}" },
    { label: "انبعاث السيارة السنوي", tex: "E_{car} = 12\\,d\\,\\frac{c}{100}\\,f_{fuel}" },
    { label: "انبعاث الغاز والرحلات", tex: "E_{LPG} = 12\\,m\\cdot 2.98,\\qquad E_{fl} = 0.15\\,D" },
    { label: "عدد الأشجار", tex: "N = \\left\\lceil \\frac{E_{total}}{21} \\right\\rceil" }
  ],
  inputs: [
    { id: "elec", label: "استهلاك الكهرباء شهرياً", unit: "kWh", type: "number", default: "0" },
    { id: "elecF", label: "معامل انبعاث الكهرباء", unit: "كغ CO2/kWh", type: "number", default: "0.5", help: "يختلف المعامل بين الدول ومصادر الكهرباء، والقيمة الافتراضية متوسط تقريبي." },
    { id: "km", label: "المسافة بالسيارة شهرياً", unit: "km", type: "number", default: "0" },
    { id: "cons", label: "استهلاك السيارة", unit: "L/100 km", type: "number", default: "7" },
    { id: "fuel", label: "نوع الوقود", type: "select", default: "gasoline", options: [["gasoline", "بنزين (2.31 كغ/لتر)"], ["diesel", "ديزل (2.68 كغ/لتر)"]] },
    { id: "lpg", label: "غاز البوتان أو البروبان شهرياً", unit: "kg", type: "number", default: "0" },
    { id: "flights", label: "مسافة الرحلات الجوية سنوياً", unit: "km", type: "number", default: "0", help: "مجموع كيلومترات الرحلات للشخص الواحد." }
  ],
  example: { values: { elec: "300", elecF: "0.5", km: "1000", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" }, expect: ["3.74 طن", "179 شجرة"], note: "مثال: 300 kWh كهرباء و1000 km سيارة شهرياً." },
  invalid: { values: { elec: "0", elecF: "0.5", km: "0", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" } },
  related: ["air-quality-index", "unit-converter"]
};

export function solve(input) {
  const elec = num(input, "elec", "استهلاك الكهرباء", { nonNegative: true, default: 0 });
  const elecF = num(input, "elecF", "معامل انبعاث الكهرباء", { nonNegative: true, default: 0.5 });
  const km = num(input, "km", "المسافة بالسيارة", { nonNegative: true, default: 0 });
  const cons = num(input, "cons", "استهلاك السيارة", { nonNegative: true, default: 0 });
  const fuel = choice(input, "fuel", "نوع الوقود", ["gasoline", "diesel"], "gasoline");
  const lpg = num(input, "lpg", "غاز البوتان", { nonNegative: true, default: 0 });
  const flights = num(input, "flights", "مسافة الرحلات الجوية", { nonNegative: true, default: 0 });
  const litres = km * 12 * cons / 100;
  const eEl = elec * 12 * elecF;
  const eCar = litres * FUEL[fuel];
  const eLpg = lpg * 12 * LPG;
  const eFl = flights * FLIGHT;
  const total = eEl + eCar + eLpg + eFl;
  if (!(total > 0)) fail("أدخل قيمة موجبة لمصدر واحد على الأقل.", "elec");
  const tonnes = total / 1000;
  const trees = Math.ceil(total / TREE);
  const share = (x) => fmt(x / total * 100, 3) + " %";
  const steps = [
    { text: "انبعاث الكهرباء السنوي:", tex: `E_{el} = 12 \\times ${ntex(elec)} \\times ${ntex(elecF)} = ${ntex(eEl, 6)}\\ kg` },
    { text: "حجم الوقود السنوي للسيارة:", tex: `V = 12 \\times ${ntex(km)} \\times \\frac{${ntex(cons)}}{100} = ${ntex(litres, 6)}\\ L` },
    { text: "انبعاث السيارة السنوي:", tex: `E_{car} = ${ntex(litres, 6)} \\times ${ntex(FUEL[fuel])} = ${ntex(eCar, 6)}\\ kg` },
    { text: "انبعاث غاز البوتان السنوي:", tex: `E_{LPG} = 12 \\times ${ntex(lpg)} \\times 2.98 = ${ntex(eLpg, 6)}\\ kg` },
    { text: "انبعاث الرحلات الجوية:", tex: `E_{fl} = ${ntex(flights)} \\times 0.15 = ${ntex(eFl, 6)}\\ kg` },
    { text: "الإجمالي وعدد الأشجار (21 kg لكل شجرة سنوياً):", tex: `E = ${ntex(total, 6)}\\ kg = ${ntex(tonnes, 6)}\\ t,\\qquad N = \\left\\lceil \\frac{${ntex(total, 6)}}{21} \\right\\rceil = ${trees}` }
  ];
  return {
    results: [
      { label: "انبعاث الكهرباء سنوياً", value: `${fmt(eEl, 4)} كغ CO2` },
      { label: "انبعاث السيارة سنوياً", value: `${fmt(eCar, 4)} كغ CO2` },
      { label: "انبعاث غاز البوتان سنوياً", value: `${fmt(eLpg, 4)} كغ CO2` },
      { label: "انبعاث الرحلات الجوية سنوياً", value: `${fmt(eFl, 4)} كغ CO2` },
      { label: "الإجمالي السنوي", value: `${fmt(tonnes, 4)} طن CO2`, text: `${fmt(tonnes, 4)} طن CO2` },
      { label: "عدد الأشجار اللازمة لامتصاصه سنوياً", value: `${trees} شجرة` }
    ],
    steps,
    copy: `البصمة السنوية ${fmt(tonnes, 4)} طن CO2 (تعادل ${trees} شجرة)`,
    blocks: [
      {
        type: "table",
        caption: "توزيع الانبعاثات السنوية",
        head: ["المصدر", "الانبعاث السنوي (كغ CO2)", "النسبة"],
        rows: [
          ["الكهرباء", fmt(eEl, 4), share(eEl)],
          ["السيارة", fmt(eCar, 4), share(eCar)],
          ["غاز البوتان", fmt(eLpg, 4), share(eLpg)],
          ["الرحلات الجوية", fmt(eFl, 4), share(eFl)],
          ["الإجمالي", fmt(total, 4), "100 %"]
        ]
      },
      { type: "note", text: "معاملات الانبعاث تقريبية، وهي متوسطات عامة تختلف حسب بلدك ونوع الوقود وطريقة التشغيل، والنتيجة للتقدير فقط." }
    ],
    values: { eEl, eCar, eLpg, eFl, total, tonnes, trees }
  };
}
