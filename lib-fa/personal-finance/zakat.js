import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KARATS = ["24", "22", "21", "18"];
const RATE = 0.025;
const SILVER_NISAB_G = 595;
const GOLD_NISAB_G = 85;

export const meta = {
  description: "زکات را بر دارایی زکوی پس از کسر بدهی‌های سررسیده محاسبه کنید، شامل پول نقد، طلا بر حسب عیارش، نقره، کالاهای تجاری، مطالبات قابل وصول و سرمایه‌گذاری‌ها، و بلوغ نصاب را بر حسب طلا یا نقره نشان دهید.",
  keywords: ["زکات", "نصاب زکات", "زکات طلا", "زکات نقره", "زکات مال", "محاسبهٔ زکات", "zakat"],
  formulas: [
    { label: "قیمت طلا پس از تبدیل به عیار 24", tex: "V_{Au} = G \\times \\frac{k}{24} \\times P_{Au}" },
    { label: "دارایی زکوی خالص", tex: "N = A - D" },
    { label: "نصاب", tex: "N_{sb} = 595\\ \\text{g} \\times P_{Ag},\\qquad N_{gd} = 85\\ \\text{g} \\times P_{Au}" },
    { label: "زکات", tex: "Z = 2.5\\% \\times N \\quad \\text{if } N \\ge \\text{Nisab}" }
  ],
  inputs: [
    { id: "cash", label: "پول نقد و موجودی بانکی", type: "number", default: "0" },
    { id: "goldG", label: "طلای در اختیار", unit: "گرم", type: "number", default: "0" },
    { id: "karat", label: "عیار طلا", type: "select", default: "24", options: [["24", "عیار 24"], ["22", "عیار 22"], ["21", "عیار 21"], ["18", "عیار 18"]] },
    { id: "silverG", label: "نقرهٔ در اختیار", unit: "گرم", type: "number", default: "0" },
    { id: "trade", label: "ارزش کالاهای تجاری و موجودی", type: "number", default: "0" },
    { id: "receivables", label: "مطالبات قابل وصول", type: "number", default: "0" },
    { id: "invest", label: "سرمایه‌گذاری‌ها و سهام (ارزش بازار)", type: "number", default: "0" },
    { id: "debts", label: "بدهی‌های سررسیده هم‌اکنون", type: "number", default: "0", help: "بدهی‌های کوتاه‌مدتی که در طول سال سررسید می‌شوند و از دارایی‌ها کسر می‌شوند." },
    { id: "goldPrice", label: "قیمت هر گرم طلای عیار 24", type: "number", help: "اگر طلا دارید یا مبنای نصاب طلاست، وارد کردن آن الزامی است." },
    { id: "silverPrice", label: "قیمت هر گرم نقره", type: "number", help: "اگر نقره دارید یا مبنای نصاب نقره است، وارد کردن آن الزامی است." },
    { id: "basis", label: "مبنای نصاب", type: "select", default: "silver", options: [["silver", "نقره (595 گرم)"], ["gold", "طلا (85 گرم)"]], help: "بسیاری از علما و نهادها نصاب نقره را می‌پذیرند، زیرا به نفع فقرا است، و برخی دیگر نصاب طلا را ترجیح می‌دهند." }
  ],
  example: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "1", basis: "silver" }, expect: ["250.00", "595.00"], note: "مثال: پول نقد 10000 با قیمت نقره 1 برای هر گرم؛ نصاب 595 و زکات 250." },
  invalid: { values: { cash: "10000", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "", basis: "silver" } },
  related: ["budget-planner", "savings-goal", "compound-interest", "loan-amortization"]
};

export function solve(input) {
  const cash = num(input, "cash", "پول نقد و موجودی", { nonNegative: true, default: 0 });
  const goldG = num(input, "goldG", "وزن طلا", { nonNegative: true, default: 0 });
  const karat = Number(choice(input, "karat", "عیار طلا", KARATS, "24"));
  const silverG = num(input, "silverG", "وزن نقره", { nonNegative: true, default: 0 });
  const trade = num(input, "trade", "کالاهای تجاری", { nonNegative: true, default: 0 });
  const receivables = num(input, "receivables", "مطالبات قابل وصول", { nonNegative: true, default: 0 });
  const invest = num(input, "invest", "سرمایه‌گذاری‌ها", { nonNegative: true, default: 0 });
  const debts = num(input, "debts", "بدهی‌های سررسیده", { nonNegative: true, default: 0 });
  const basis = choice(input, "basis", "مبنای نصاب", ["silver", "gold"], "silver");
  const goldPrice = num(input, "goldPrice", "قیمت هر گرم طلا", { nonNegative: true, optional: true });
  const silverPrice = num(input, "silverPrice", "قیمت هر گرم نقره", { nonNegative: true, optional: true });

  const gross = cash + goldG + silverG + trade + receivables + invest;
  if (!(gross > 0)) fail("برای یکی از دارایی‌های زکوی مقداری بزرگ‌تر از صفر وارد کنید.", "cash");
  if ((goldG > 0 || basis === "gold") && !(goldPrice > 0)) fail("برای محاسبهٔ ارزش طلا یا نصاب، قیمت هر گرم طلای عیار 24 را وارد کنید.", "goldPrice");
  if ((silverG > 0 || basis === "silver") && !(silverPrice > 0)) fail("برای محاسبهٔ ارزش نقره یا نصاب، قیمت هر گرم نقره را وارد کنید.", "silverPrice");

  const goldValue = goldG > 0 ? goldG * (karat / 24) * goldPrice : 0;
  const silverValue = silverG > 0 ? silverG * silverPrice : 0;
  const assets = cash + goldValue + silverValue + trade + receivables + invest;
  const net = assets - debts;
  const gold = basis === "gold";
  const nisab = gold ? GOLD_NISAB_G * goldPrice : SILVER_NISAB_G * silverPrice;
  const basisLabel = gold ? "طلا" : "نقره";
  const eligible = net > 0 && net >= nisab;
  const zakat = eligible ? net * RATE : 0;
  const status = eligible ? "مال به نصاب رسیده است و زکات واجب است، به شرط آنکه یک سال قمری بر آن گذشته باشد" : "مال کمتر از نصاب است، پس زکات واجب نیست";

  const rows = [
    ["پول نقد و موجودی بانکی", money(cash)],
    [`طلا (${fmt(goldG)} گ عیار ${karat})`, money(goldValue)],
    [`نقره (${fmt(silverG)} گ)`, money(silverValue)],
    ["کالاهای تجاری و موجودی", money(trade)],
    ["مطالبات قابل وصول", money(receivables)],
    ["سرمایه‌گذاری‌ها و سهام", money(invest)],
    ["کل دارایی‌ها", money(assets)],
    ["منهای بدهی‌های سررسیده", money(-debts)],
    ["دارایی زکوی خالص", money(net)],
    [`نصاب (${basisLabel})`, money(nisab)]
  ];

  const steps = [];
  if (goldG > 0) steps.push({ text: "تبدیل طلا به عیار 24 و سپس محاسبهٔ ارزش آن:", tex: `V_{Au} = ${ntex(goldG)} \\times \\frac{${karat}}{24} \\times ${ntex(goldPrice)} = ${ntex(goldValue, 8)}` });
  if (silverG > 0) steps.push({ text: "ارزش نقره:", tex: `V_{Ag} = ${ntex(silverG)} \\times ${ntex(silverPrice)} = ${ntex(silverValue, 8)}` });
  steps.push({ text: "جمع دارایی‌های زکوی و سپس کسر بدهی‌های سررسیده:", tex: `N = A - D = ${ntex(assets, 8)} - ${ntex(debts, 8)} = ${ntex(net, 8)}` });
  steps.push({ text: "محاسبهٔ نصاب بر اساس مبنای انتخاب‌شده:", tex: gold ? `N_{gd} = 85 \\times ${ntex(goldPrice)} = ${ntex(nisab, 8)}` : `N_{sb} = 595 \\times ${ntex(silverPrice)} = ${ntex(nisab, 8)}` });
  steps.push(eligible
    ? { text: "مال به نصاب رسیده است، پس زکات 2.5% محاسبه می‌شود:", tex: `Z = 0.025 \\times ${ntex(net, 8)} = ${ntex(zakat, 8)}` }
    : "دارایی زکوی کمتر از نصاب است، پس زکات واجب نیست.");

  return {
    results: [
      { label: "دارایی زکوی خالص", value: money(net) },
      { label: `ارزش نصاب (${basisLabel})`, value: money(nisab) },
      { label: "وضعیت", value: eligible ? "به نصاب رسیده" : "کمتر از نصاب" },
      { label: "زکات واجب (2.5%)", value: money(zakat) }
    ],
    steps,
    copy: `${status}. زکات واجب: ${money(zakat)}، دارایی زکوی خالص: ${money(net)}، نصاب: ${money(nisab)} (${basisLabel})`,
    blocks: [
      { type: "table", caption: "اجزای دارایی زکوی", head: ["بند", "مقدار"], rows },
      { type: "note", text: "حول: شرط است که یک سال قمری کامل بر مالی که به نصاب رسیده، نزد مالکش گذشته باشد." },
      { type: "note", text: "این محاسبه برای آگاهی‌بخشی و تخمینی است؛ در موارد خاص به یک مرجع فتوای معتبر مراجعه کنید.", tone: "warn" }
    ]
  };
}
