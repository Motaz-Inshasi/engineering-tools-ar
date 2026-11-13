import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "احسب استهلاك الأصل سنوياً بطريقة القسط الثابت أو القسط المتناقص أو مجموع أرقام السنين، مع جدول يوضح الاستهلاك والمجمع والقيمة الدفترية دون نزول عن القيمة الخردة.",
  keywords: ["الاستهلاك", "الإهلاك", "depreciation", "القسط الثابت", "القسط المتناقص", "مجموع أرقام السنين", "القيمة الدفترية", "القيمة الخردة"],
  formulas: [
    { label: "القسط الثابت", tex: "D = \\frac{C-S}{n}" },
    { label: "مجموع أرقام السنين", tex: "D_y = \\frac{n-y+1}{n(n+1)/2}\\,(C-S)" },
    { label: "القسط المتناقص", tex: "D_y = \\max\\left(B_{y-1}\\frac{k}{n},\\ \\frac{B_{y-1}-S}{n-y+1}\\right)" }
  ],
  inputs: [
    { id: "cost", label: "تكلفة الأصل C", type: "number", default: "10000" },
    { id: "salvage", label: "القيمة الخردة S", type: "number", default: "1000" },
    { id: "life", label: "العمر الإنتاجي n", unit: "سنة", type: "number", default: "5", help: "عدد صحيح من 1 إلى 100." },
    { id: "method", label: "طريقة الاستهلاك", type: "select", default: "sl", options: [["sl", "القسط الثابت"], ["db", "القسط المتناقص"], ["syd", "مجموع أرقام السنين"]] },
    { id: "factor", label: "معامل القسط المتناقص k", type: "select", default: "2", options: [["2", "مضاعف (2)"], ["1.5", "1.5"]], when: { method: ["db"] } }
  ],
  example: { values: { cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2" }, expect: ["1,800.00"], note: "مثال: أصل بتكلفة 10,000 وقيمة خردة 1,000 وعمر 5 سنوات بالقسط الثابت." },
  invalid: { values: { cost: "1000", salvage: "2000", life: "5", method: "sl", factor: "2" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const cost = num(input, "cost", "تكلفة الأصل", { positive: true });
  const salvage = num(input, "salvage", "القيمة الخردة", { nonNegative: true });
  const n = num(input, "life", "العمر الإنتاجي", { integer: true, min: 1, max: 100 });
  const method = choice(input, "method", "طريقة الاستهلاك", ["sl", "db", "syd"], "sl");
  const factor = Number(choice(input, "factor", "معامل القسط المتناقص", ["2", "1.5"], "2"));
  if (salvage > cost) fail("القيمة الخردة لا يمكن أن تتجاوز تكلفة الأصل.", "salvage");
  const base = cost - salvage;
  const sumYears = (n * (n + 1)) / 2;
  let bv = cost;
  let acc = 0;
  let switchYear = null;
  const schedule = [];
  for (let y = 1; y <= n; y++) {
    let d;
    let kind = "";
    if (method === "sl") d = base / n;
    else if (method === "syd") d = (base * (n - y + 1)) / sumYears;
    else {
      const dbAmt = (bv * factor) / n;
      const slAmt = (bv - salvage) / (n - y + 1);
      const useSl = slAmt > dbAmt;
      if (useSl && switchYear === null) switchYear = y;
      d = Math.min(Math.max(dbAmt, slAmt), bv - salvage);
      kind = useSl ? "قسط ثابت" : "متناقص";
    }
    bv = Math.max(bv - d, salvage);
    acc += d;
    schedule.push({ y, d, acc, bv, kind });
  }
  const withKind = method === "db";
  const rows = schedule.map((s) => (withKind ? [fmt(s.y), money(s.d), money(s.acc), money(s.bv), s.kind] : [fmt(s.y), money(s.d), money(s.acc), money(s.bv)]));
  const head = ["السنة", "الاستهلاك", "المجمّع", "القيمة الدفترية"];
  if (withKind) head.push("الطريقة");
  const first = schedule[0].d;
  const last = schedule[n - 1].bv;
  const results = [
    { label: "استهلاك السنة الأولى", value: money(first) },
    { label: "إجمالي الاستهلاك", value: money(base) },
    { label: "القيمة الدفترية في نهاية العمر", value: money(last) }
  ];
  if (method === "sl") results.unshift({ label: "القسط السنوي الثابت", value: money(base / n) });
  const steps = [];
  if (method === "sl") {
    steps.push({ text: "القسط الثابت:", tex: `D = \\frac{C-S}{n} = \\frac{${ntex(cost)} - ${ntex(salvage)}}{${n}} = ${ntex(base / n, 8)}` });
  } else if (method === "syd") {
    steps.push({ text: "مجموع أرقام السنين:", tex: `\\sum = \\frac{n(n+1)}{2} = \\frac{${n}(${n}+1)}{2} = ${ntex(sumYears)}` });
    steps.push({ text: "استهلاك السنة الأولى:", tex: `D_1 = \\frac{n}{\\sum}(C-S) = \\frac{${n}}{${ntex(sumYears)}} \\times ${ntex(base)} = ${ntex(first, 8)}` });
  } else {
    steps.push({ text: "معدل القسط المتناقص:", tex: `\\text{rate} = \\frac{k}{n} = \\frac{${factor}}{${n}} = ${ntex(factor / n, 6)}` });
    steps.push({ text: "استهلاك السنة الأولى:", tex: `D_1 = C \\times \\text{rate} = ${ntex(cost)} \\times ${ntex(factor / n, 6)} = ${ntex(first, 8)}` });
    steps.push("في كل سنة نأخذ الأكبر بين القسط المتناقص والقسط الثابت على القيمة المتبقية، ولا نتجاوز القيمة الخردة.");
  }
  const copy = method === "sl"
    ? `القسط السنوي الثابت: ${money(base / n)}، القيمة الدفترية في نهاية العمر: ${money(last)}`
    : `استهلاك السنة الأولى: ${money(first)}، القيمة الدفترية في نهاية العمر: ${money(last)}`;
  const blocks = [{ type: "table", caption: "جدول الاستهلاك السنوي", head, rows }];
  if (method === "db") {
    blocks.push(switchYear === null
      ? { type: "note", text: "لم يحتج الحساب إلى التحول إلى القسط الثابت، ولا تنزل القيمة الدفترية عن القيمة الخردة." }
      : { type: "note", text: `يتحول الحساب إلى القسط الثابت ابتداءً من السنة ${switchYear}، لأن القسط الثابت على القيمة المتبقية أكبر، فتبلغ القيمة الدفترية القيمة الخردة في نهاية العمر دون أن تنزل عنها.` });
  }
  return { results, steps, copy, blocks };
}
