import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "احسب القسط الدوري الثابت لقرض وإجمالي المدفوع وإجمالي الفائدة، مع جدول سنوي يوضح الفائدة المدفوعة وأصل الدين المسدَّد والرصيد المتبقي، ورسم بياني لتناقص الرصيد.",
  keywords: ["قرض", "جدول السداد", "amortization", "القسط الشهري", "الفائدة على القرض", "سداد الدين", "قرض عقاري"],
  formulas: [
    { label: "القسط الثابت", tex: "PMT = \\frac{P\\,i}{1-(1+i)^{-N}},\\qquad i=\\frac{r}{m},\\quad N=mt" },
    { label: "الرصيد بعد الدفعة k", tex: "B_k = B_{k-1}(1+i) - PMT" }
  ],
  inputs: [
    { id: "P", label: "أصل القرض P", type: "number", default: "100000" },
    { id: "r", label: "معدل الفائدة السنوي", unit: "%", type: "number", default: "6" },
    { id: "t", label: "مدة القرض", unit: "سنة", type: "number", default: "30", help: "يجب أن ينتج عن المدة × عدد الدفعات في السنة عدد صحيح من الدفعات، بحد أقصى 100 سنة." },
    { id: "freq", label: "عدد الدفعات في السنة", type: "select", default: "12", options: [["12", "شهرية (12)"], ["4", "ربع سنوية (4)"], ["2", "نصف سنوية (2)"], ["1", "سنوية (1)"]] }
  ],
  example: { values: { P: "100000", r: "6", t: "30", freq: "12" }, expect: ["599.55"], note: "مثال: قرض عقاري 100,000 بفائدة 6% لمدة 30 سنة بأقساط شهرية." },
  invalid: { values: { P: "100000", r: "6", t: "1.01", freq: "12" } },
  related: ["compound-interest", "npv-irr", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const P = num(input, "P", "أصل القرض", { positive: true });
  const r = num(input, "r", "معدل الفائدة", { nonNegative: true, max: 1000 });
  const t = num(input, "t", "مدة القرض", { positive: true, max: 100 });
  const m = Number(choice(input, "freq", "عدد الدفعات في السنة", ["12", "4", "2", "1"], "12"));
  const Nraw = t * m;
  if (Math.abs(Nraw - Math.round(Nraw)) > 1e-9) fail(`عدد الدفعات (${fmt(Nraw)}) يجب أن يكون عدداً صحيحاً، فعدّل المدة بالسنوات.`, "t");
  const N = Math.round(Nraw);
  const i = r / 100 / m;
  const pmt = i === 0 ? P / N : (P * i) / (1 - Math.pow(1 + i, -N));
  const total = pmt * N;
  const interest = total - P;
  const rows = [];
  const points = [[0, P]];
  let bal = P;
  let yInt = 0;
  let yPri = 0;
  for (let k = 1; k <= N; k++) {
    const intr = bal * i;
    const pri = k === N ? bal : pmt - intr;
    bal -= pri;
    yInt += intr;
    yPri += pri;
    if (k % m === 0 || k === N) {
      rows.push([fmt(Math.ceil(k / m)), money(yInt), money(yPri), money(Math.max(0, bal))]);
      points.push([k / m, Math.max(0, bal)]);
      yInt = 0;
      yPri = 0;
    }
  }
  const steps = [
    { text: "معدل الفائدة لكل دفعة:", tex: `i = \\frac{r}{m} = \\frac{${ntex(r / 100, 6)}}{${m}} = ${ntex(i, 6)}` },
    { text: "عدد الدفعات الكلي:", tex: `N = mt = ${m} \\times ${ntex(t)} = ${N}` },
    i === 0
      ? { text: "بدون فائدة يُقسم أصل القرض على عدد الدفعات:", tex: `PMT = \\frac{P}{N} = \\frac{${ntex(P)}}{${N}} = ${ntex(pmt, 8)}` }
      : { text: "القسط الثابت:", tex: `PMT = \\frac{P\\,i}{1-(1+i)^{-N}} = \\frac{${ntex(P)} \\times ${ntex(i, 6)}}{1-(1+${ntex(i, 6)})^{-${N}}} = ${ntex(pmt, 8)}` },
    { text: "إجمالي المدفوع وإجمالي الفائدة:", tex: `${ntex(pmt, 8)} \\times ${N} = ${ntex(total, 8)},\\qquad ${ntex(total, 8)} - ${ntex(P)} = ${ntex(interest, 8)}` }
  ];
  return {
    results: [
      { label: "القسط الدوري", value: money(pmt), text: `القسط ${money(pmt)}` },
      { label: "إجمالي المدفوع", value: money(total) },
      { label: "إجمالي الفائدة", value: money(interest) },
      { label: "عدد الدفعات", value: String(N) }
    ],
    steps,
    copy: `القسط: ${money(pmt)} لكل دفعة، إجمالي المدفوع: ${money(total)}، إجمالي الفائدة: ${money(interest)}`,
    blocks: [
      { type: "table", caption: "الجدول السنوي للسداد", head: ["السنة", "الفائدة المدفوعة", "أصل الدين المسدَّد", "الرصيد المتبقي"], rows: [...rows, ["الإجمالي", money(interest), money(P), "0.00"]] },
      { type: "note", text: "القسط ثابت طوال المدة، لذلك تكون حصة الفائدة في البداية أكبر، وتزداد حصة أصل الدين مع الوقت. الأرقام مقرّبة إلى خانتين عشريتين." },
      { type: "plot", title: "الرصيد المتبقي عبر الزمن", xLabel: "السنوات", yLabel: "الرصيد", includeZero: true, series: [{ name: "الرصيد المتبقي", points, line: true }] }
    ]
  };
}
