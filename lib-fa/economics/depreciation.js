import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "استهلاک دارایی را سالانه با روش خط مستقیم، نزولی یا مجموع ارقام سال‌ها محاسبه کنید، همراه با جدولی از استهلاک، استهلاک انباشته و ارزش دفتری، بدون پایین‌تر رفتن از ارزش اسقاط.",
  keywords: ["استهلاک", "استهلاک", "depreciation", "خط مستقیم", "نزولی", "مجموع ارقام سال‌ها", "ارزش دفتری", "ارزش اسقاط"],
  formulas: [
    { label: "خط مستقیم", tex: "D = \\frac{C-S}{n}" },
    { label: "مجموع ارقام سال‌ها", tex: "D_y = \\frac{n-y+1}{n(n+1)/2}\\,(C-S)" },
    { label: "نزولی", tex: "D_y = \\max\\left(B_{y-1}\\frac{k}{n},\\ \\frac{B_{y-1}-S}{n-y+1}\\right)" }
  ],
  inputs: [
    { id: "cost", label: "بهای اولیهٔ دارایی C", type: "number", default: "10000" },
    { id: "salvage", label: "ارزش اسقاط S", type: "number", default: "1000" },
    { id: "life", label: "عمر مفید n", unit: "سال", type: "number", default: "5", help: "عدد صحیح از 1 تا 100." },
    { id: "method", label: "روش استهلاک", type: "select", default: "sl", options: [["sl", "خط مستقیم"], ["db", "نزولی"], ["syd", "مجموع ارقام سال‌ها"]] },
    { id: "factor", label: "ضریب نزولی k", type: "select", default: "2", options: [["2", "دوبرابر (2)"], ["1.5", "1.5"]], when: { method: ["db"] } }
  ],
  example: { values: { cost: "10000", salvage: "1000", life: "5", method: "sl", factor: "2" }, expect: ["1,800.00"], note: "مثال: دارایی با بهای 10,000، ارزش اسقاط 1,000 و عمر 5 سال به روش خط مستقیم." },
  invalid: { values: { cost: "1000", salvage: "2000", life: "5", method: "sl", factor: "2" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const cost = num(input, "cost", "بهای اولیهٔ دارایی", { positive: true });
  const salvage = num(input, "salvage", "ارزش اسقاط", { nonNegative: true });
  const n = num(input, "life", "عمر مفید", { integer: true, min: 1, max: 100 });
  const method = choice(input, "method", "روش استهلاک", ["sl", "db", "syd"], "sl");
  const factor = Number(choice(input, "factor", "ضریب نزولی", ["2", "1.5"], "2"));
  if (salvage > cost) fail("ارزش اسقاط نمی‌تواند از بهای اولیهٔ دارایی بیشتر باشد.", "salvage");
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
      kind = useSl ? "خط مستقیم" : "نزولی";
    }
    bv = Math.max(bv - d, salvage);
    acc += d;
    schedule.push({ y, d, acc, bv, kind });
  }
  const withKind = method === "db";
  const rows = schedule.map((s) => (withKind ? [fmt(s.y), money(s.d), money(s.acc), money(s.bv), s.kind] : [fmt(s.y), money(s.d), money(s.acc), money(s.bv)]));
  const head = ["سال", "استهلاک", "انباشته", "ارزش دفتری"];
  if (withKind) head.push("روش");
  const first = schedule[0].d;
  const last = schedule[n - 1].bv;
  const results = [
    { label: "استهلاک سال اول", value: money(first) },
    { label: "کل استهلاک", value: money(base) },
    { label: "ارزش دفتری در پایان عمر", value: money(last) }
  ];
  if (method === "sl") results.unshift({ label: "استهلاک سالانهٔ خط مستقیم", value: money(base / n) });
  const steps = [];
  if (method === "sl") {
    steps.push({ text: "خط مستقیم:", tex: `D = \\frac{C-S}{n} = \\frac{${ntex(cost)} - ${ntex(salvage)}}{${n}} = ${ntex(base / n, 8)}` });
  } else if (method === "syd") {
    steps.push({ text: "مجموع ارقام سال‌ها:", tex: `\\sum = \\frac{n(n+1)}{2} = \\frac{${n}(${n}+1)}{2} = ${ntex(sumYears)}` });
    steps.push({ text: "استهلاک سال اول:", tex: `D_1 = \\frac{n}{\\sum}(C-S) = \\frac{${n}}{${ntex(sumYears)}} \\times ${ntex(base)} = ${ntex(first, 8)}` });
  } else {
    steps.push({ text: "نرخ استهلاک نزولی:", tex: `\\text{rate} = \\frac{k}{n} = \\frac{${factor}}{${n}} = ${ntex(factor / n, 6)}` });
    steps.push({ text: "استهلاک سال اول:", tex: `D_1 = C \\times \\text{rate} = ${ntex(cost)} \\times ${ntex(factor / n, 6)} = ${ntex(first, 8)}` });
    steps.push("هر سال، بیشتر میان استهلاک نزولی و استهلاک خط مستقیم روی ارزش باقی‌مانده را برمی‌داریم و از ارزش اسقاط پایین‌تر نمی‌رویم.");
  }
  const copy = method === "sl"
    ? `استهلاک سالانهٔ خط مستقیم: ${money(base / n)}، ارزش دفتری در پایان عمر: ${money(last)}`
    : `استهلاک سال اول: ${money(first)}، ارزش دفتری در پایان عمر: ${money(last)}`;
  const blocks = [{ type: "table", caption: "جدول استهلاک سالانه", head, rows }];
  if (method === "db") {
    blocks.push(switchYear === null
      ? { type: "note", text: "محاسبه نیازی به تغییر به خط مستقیم نداشت و ارزش دفتری از ارزش اسقاط پایین‌تر نرفت." }
      : { type: "note", text: `محاسبه از سال ${switchYear} به خط مستقیم تغییر می‌کند، زیرا استهلاک خط مستقیم روی ارزش باقی‌مانده بیشتر است؛ بنابراین ارزش دفتری در پایان عمر به ارزش اسقاط می‌رسد بدون آنکه از آن پایین‌تر رود.` });
  }
  return { results, steps, copy, blocks };
}
