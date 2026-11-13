import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KARATS = ["24", "22", "21", "18"];
const RATE = 0.025;
const SILVER_NISAB_G = 595;
const GOLD_NISAB_G = 85;

export const meta = {
  description: "احسب الزكاة على المال الزكوي بعد خصم الديون المستحقة، مع النقد والذهب بعياراته والفضة وعروض التجارة والديون المرجوة والاستثمارات، وبيان بلوغ النصاب بالذهب أو بالفضة.",
  keywords: ["زكاة", "نصاب الزكاة", "زكاة الذهب", "زكاة الفضة", "زكاة المال", "حساب الزكاة", "zakat"],
  formulas: [
    { label: "قيمة الذهب بعد تحويله إلى عيار 24", tex: "V_{Au} = G \\times \\frac{k}{24} \\times P_{Au}" },
    { label: "المال الزكوي الصافي", tex: "N = A - D" },
    { label: "النصاب", tex: "N_{sb} = 595\\ \\text{g} \\times P_{Ag},\\qquad N_{gd} = 85\\ \\text{g} \\times P_{Au}" },
    { label: "الزكاة", tex: "Z = 2.5\\% \\times N \\quad \\text{if } N \\ge \\text{Nisab}" }
  ],
  inputs: [
    { id: "cash", label: "النقد والأرصدة البنكية", type: "number", default: "0" },
    { id: "goldG", label: "الذهب المملوك", unit: "غرام", type: "number", default: "0" },
    { id: "karat", label: "عيار الذهب", type: "select", default: "24", options: [["24", "عيار 24"], ["22", "عيار 22"], ["21", "عيار 21"], ["18", "عيار 18"]] },
    { id: "silverG", label: "الفضة المملوكة", unit: "غرام", type: "number", default: "0" },
    { id: "trade", label: "قيمة عروض التجارة والمخزون", type: "number", default: "0" },
    { id: "receivables", label: "الديون المرجوّ تحصيلها", type: "number", default: "0" },
    { id: "invest", label: "الاستثمارات والأسهم (القيمة السوقية)", type: "number", default: "0" },
    { id: "debts", label: "الديون المستحقة الآن", type: "number", default: "0", help: "الديون قصيرة الأجل التي تستحق خلال السنة، وتُخصم من الأصول." },
    { id: "goldPrice", label: "سعر غرام الذهب عيار 24", type: "number", help: "مطلوب إذا كان لديك ذهب أو كان أساس النصاب الذهب." },
    { id: "silverPrice", label: "سعر غرام الفضة", type: "number", help: "مطلوب إذا كانت لديك فضة أو كان أساس النصاب الفضة." },
    { id: "basis", label: "أساس النصاب", type: "select", default: "silver", options: [["silver", "الفضة (595 غراماً)"], ["gold", "الذهب (85 غراماً)"]], help: "يعتمد كثير من العلماء والهيئات نصاب الفضة لأنه أنفع للفقراء، ويرى آخرون الأخذ بنصاب الذهب." }
  ],
  example: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "1", basis: "silver" }, expect: ["250.00", "595.00"], note: "مثال: نقد 10000 مع سعر الفضة 1 لكل غرام، فالنصاب 595 والزكاة 250." },
  invalid: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "", basis: "silver" } },
  related: ["budget-planner", "savings-goal", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const cash = num(input, "cash", "النقد والأرصدة", { nonNegative: true, default: 0 });
  const goldG = num(input, "goldG", "وزن الذهب", { nonNegative: true, default: 0 });
  const karat = Number(choice(input, "karat", "عيار الذهب", KARATS, "24"));
  const silverG = num(input, "silverG", "وزن الفضة", { nonNegative: true, default: 0 });
  const trade = num(input, "trade", "عروض التجارة", { nonNegative: true, default: 0 });
  const receivables = num(input, "receivables", "الديون المرجوة", { nonNegative: true, default: 0 });
  const invest = num(input, "invest", "الاستثمارات", { nonNegative: true, default: 0 });
  const debts = num(input, "debts", "الديون المستحقة", { nonNegative: true, default: 0 });
  const basis = choice(input, "basis", "أساس النصاب", ["silver", "gold"], "silver");
  const goldPrice = num(input, "goldPrice", "سعر غرام الذهب", { nonNegative: true, optional: true });
  const silverPrice = num(input, "silverPrice", "سعر غرام الفضة", { nonNegative: true, optional: true });

  const gross = cash + goldG + silverG + trade + receivables + invest;
  if (!(gross > 0)) fail("أدخل قيمة أكبر من صفر لأحد الأصول الزكوية.", "cash");
  if ((goldG > 0 || basis === "gold") && !(goldPrice > 0)) fail("أدخل سعر غرام الذهب عيار 24 لحساب قيمة الذهب أو النصاب.", "goldPrice");
  if ((silverG > 0 || basis === "silver") && !(silverPrice > 0)) fail("أدخل سعر غرام الفضة لحساب قيمة الفضة أو النصاب.", "silverPrice");

  const goldValue = goldG > 0 ? goldG * (karat / 24) * goldPrice : 0;
  const silverValue = silverG > 0 ? silverG * silverPrice : 0;
  const assets = cash + goldValue + silverValue + trade + receivables + invest;
  const net = assets - debts;
  const gold = basis === "gold";
  const nisab = gold ? GOLD_NISAB_G * goldPrice : SILVER_NISAB_G * silverPrice;
  const basisLabel = gold ? "الذهب" : "الفضة";
  const eligible = net > 0 && net >= nisab;
  const zakat = eligible ? net * RATE : 0;
  const status = eligible ? "بلغ المال النصاب، وتجب الزكاة بشرط مرور الحول" : "المال دون النصاب، فلا زكاة واجبة";

  const rows = [
    ["النقد والأرصدة البنكية", money(cash)],
    [`الذهب (${fmt(goldG)} غ عيار ${karat})`, money(goldValue)],
    [`الفضة (${fmt(silverG)} غ)`, money(silverValue)],
    ["عروض التجارة والمخزون", money(trade)],
    ["الديون المرجوة التحصيل", money(receivables)],
    ["الاستثمارات والأسهم", money(invest)],
    ["إجمالي الأصول", money(assets)],
    ["ناقص الديون المستحقة", money(-debts)],
    ["المال الزكوي الصافي", money(net)],
    [`النصاب (${basisLabel})`, money(nisab)]
  ];

  const steps = [];
  if (goldG > 0) steps.push({ text: "تحويل الذهب إلى عيار 24 ثم حساب قيمته:", tex: `V_{Au} = ${ntex(goldG)} \\times \\frac{${karat}}{24} \\times ${ntex(goldPrice)} = ${ntex(goldValue, 8)}` });
  if (silverG > 0) steps.push({ text: "قيمة الفضة:", tex: `V_{Ag} = ${ntex(silverG)} \\times ${ntex(silverPrice)} = ${ntex(silverValue, 8)}` });
  steps.push({ text: "مجموع الأصول الزكوية ثم خصم الديون المستحقة:", tex: `N = A - D = ${ntex(assets, 8)} - ${ntex(debts, 8)} = ${ntex(net, 8)}` });
  steps.push({ text: "حساب النصاب حسب الأساس المختار:", tex: gold ? `N_{gd} = 85 \\times ${ntex(goldPrice)} = ${ntex(nisab, 8)}` : `N_{sb} = 595 \\times ${ntex(silverPrice)} = ${ntex(nisab, 8)}` });
  steps.push(eligible
    ? { text: "المال بلغ النصاب، فتُحسب الزكاة بنسبة 2.5%:", tex: `Z = 0.025 \\times ${ntex(net, 8)} = ${ntex(zakat, 8)}` }
    : "المال الزكوي أقل من النصاب، فلا زكاة واجبة.");

  return {
    results: [
      { label: "المال الزكوي الصافي", value: money(net) },
      { label: `قيمة النصاب (${basisLabel})`, value: money(nisab) },
      { label: "الحالة", value: eligible ? "بلغ النصاب" : "دون النصاب" },
      { label: "الزكاة المستحقة (2.5%)", value: money(zakat) }
    ],
    steps,
    copy: `${status}. الزكاة المستحقة: ${money(zakat)}، المال الزكوي الصافي: ${money(net)}، النصاب: ${money(nisab)} (${basisLabel})`,
    blocks: [
      { type: "table", caption: "مكونات الوعاء الزكوي", head: ["البند", "القيمة"], rows },
      { type: "note", text: "الحول: يُشترط أن يمضي على المال النصاب سنة هجرية كاملة (حول قمري) عند مالكه." },
      { type: "note", text: "الحساب تقديري للتوعية؛ راجع جهة فتوى موثوقة في الحالات الخاصة.", tone: "warn" }
    ]
  };
}
