import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAX_MONTHS = 1200;
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const balanceAt = (PV, PMT, i, m) => (i === 0 ? PV + PMT * m : PV * Math.pow(1 + i, m) + (PMT * (Math.pow(1 + i, m) - 1)) / i);

const monthsText = (m) => {
  const y = Math.floor(m / 12);
  const r = m - y * 12;
  const yt = y === 0 ? "" : y === 1 ? "سنة" : y === 2 ? "سنتان" : y <= 10 ? `${y} سنوات` : `${y} سنة`;
  const rt = r === 0 ? "" : r === 1 ? "شهر" : r === 2 ? "شهران" : r <= 10 ? `${r} أشهر` : `${r} شهراً`;
  if (!yt && !rt) return "0 شهر";
  if (!yt) return rt;
  if (!rt) return yt;
  return `${yt} و${rt}`;
};

const yearRows = (PV, PMT, i, months) => {
  const marks = [];
  for (let m = 12; m < months; m += 12) marks.push(m);
  if (months > 0) marks.push(months);
  return marks.map((m) => {
    const b = balanceAt(PV, PMT, i, m);
    const dep = PV + PMT * m;
    return [fmt(m / 12, 4), money(b), money(dep), money(b - dep)];
  });
};

const yearTable = (PV, PMT, i, months) => ({
  type: "table",
  caption: "تطور الرصيد في نهاية كل سنة",
  head: ["المدة (بالسنوات)", "الرصيد", "إجمالي ما وُضع", "الفائدة حتى الآن"],
  rows: yearRows(PV, PMT, i, months)
});

export const meta = {
  description: "احسب الإيداع الشهري المطلوب لتبلغ هدفاً مالياً بعائد سنوي متوقع ومدة محددة، أو احسب المدة اللازمة لو عرفت الإيداع الشهري، مع جدول الرصيد السنوي.",
  keywords: ["ادخار", "هدف مالي", "الإيداع الشهري", "PMT", "توفير", "مدخرات", "savings goal"],
  formulas: [
    { label: "الإيداع الشهري المطلوب (في نهاية كل شهر)", tex: "PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1},\\qquad i = \\frac{r}{12}" },
    { label: "الرصيد بعد N شهراً", tex: "FV = PV(1+i)^N + PMT\\,\\frac{(1+i)^N - 1}{i}" },
    { label: "عدد الأشهر لبلوغ الهدف", tex: "N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)}" }
  ],
  inputs: [
    { id: "mode", label: "ما الذي تريد حسابه؟", type: "select", default: "forward", options: [["forward", "الإيداع الشهري المطلوب"], ["reverse", "المدة اللازمة لإيداع شهري ثابت"]] },
    { id: "target", label: "المبلغ المستهدف", type: "number", default: "100000" },
    { id: "current", label: "المدخرات الحالية", type: "number", default: "10000" },
    { id: "rate", label: "العائد السنوي المتوقع", unit: "%", type: "number", default: "5", help: "ضعه صفراً إن لم تتوقع عائداً." },
    { id: "time", label: "المدة المتاحة", type: "number", default: "10", when: { mode: ["forward"] } },
    { id: "timeUnit", label: "وحدة المدة", type: "select", default: "years", options: [["years", "سنوات"], ["months", "أشهر"]], when: { mode: ["forward"] } },
    { id: "deposit", label: "الإيداع الشهري", type: "number", default: "500", when: { mode: ["reverse"] }, help: "يُودع في نهاية كل شهر." }
  ],
  example: { values: { mode: "forward", target: "100000", current: "10000", rate: "5", time: "10", timeUnit: "years", deposit: "500" }, expect: ["537.92"], note: "مثال: هدف 100000 من 10000 بعائد 5% سنوياً في 10 سنوات." },
  invalid: { values: { mode: "reverse", target: "100000", current: "10000", rate: "0", time: "10", timeUnit: "years", deposit: "0" } },
  related: ["compound-interest", "loan-amortization", "budget-planner", "zakat"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["forward", "reverse"], "forward");
  const target = num(input, "target", "المبلغ المستهدف", { positive: true });
  const current = num(input, "current", "المدخرات الحالية", { nonNegative: true, default: 0 });
  const rate = num(input, "rate", "العائد السنوي", { nonNegative: true, max: 100, default: 0 });
  const i = rate / 1200;
  return mode === "reverse" ? reverse(input, target, current, i) : forward(input, target, current, i);
}

function forward(input, target, current, i) {
  const unit = choice(input, "timeUnit", "وحدة المدة", ["years", "months"], "years");
  const t = num(input, "time", "المدة", { positive: true });
  const n = unit === "years" ? t * 12 : t;
  if (!isInt(n)) fail("المدة يجب أن تعطي عدداً صحيحاً من الأشهر، مثل 2.5 سنة أو 30 شهراً.", "time");
  if (n > MAX_MONTHS) fail("المدة يجب ألا تتجاوز 100 سنة.", "time");
  const months = Math.round(n);
  const pmt = balanceAt(current, 0, i, months) >= target ? 0
    : i === 0 ? (target - current) / months
    : ((target - current * Math.pow(1 + i, months)) * i) / (Math.pow(1 + i, months) - 1);
  const reached = pmt === 0;
  const deposited = current + pmt * months;
  const final = balanceAt(current, pmt, i, months);
  const interest = final - deposited;

  const steps = [{ text: "تحويل المدة إلى أشهر ومعدل الشهر:", tex: `N = ${months},\\qquad i = \\frac{r}{12} = ${ntex(i, 6)}` }];
  if (reached) steps.push(current >= target ? "المدخرات الحالية تحقق المبلغ المستهدف، فلا حاجة لإيداعات." : "ينمو رصيدك الحالي إلى الهدف دون إيداعات إضافية.");
  else if (i === 0) steps.push({ text: "بدون عائد، الإيداع الشهري هو الفرق مقسوماً على عدد الأشهر:", tex: `PMT = \\frac{FV - PV}{N} = \\frac{${ntex(target)} - ${ntex(current)}}{${months}} = ${ntex(pmt, 8)}` });
  else steps.push({ text: "الإيداع الشهري المطلوب:", tex: `PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1} = \\frac{(${ntex(target)} - ${ntex(current)} \\times (1+${ntex(i, 6)})^{${months}}) \\times ${ntex(i, 6)}}{(1+${ntex(i, 6)})^{${months}} - 1} = ${ntex(pmt, 8)}` });

  return {
    results: [
      { label: "الإيداع الشهري المطلوب", value: reached ? "لا حاجة لإيداع" : money(pmt) },
      { label: "المدة", value: monthsText(months) },
      { label: "إجمالي ما ستودعه", value: money(deposited) },
      { label: "إجمالي الفائدة المتوقعة", value: money(interest) },
      { label: "الرصيد عند نهاية المدة", value: money(final) }
    ],
    steps,
    copy: reached
      ? `الهدف متحقق دون إيداعات، الرصيد المتوقع: ${money(final)}`
      : `الإيداع الشهري المطلوب: ${money(pmt)} لمدة ${monthsText(months)}، إجمالي الفائدة المتوقعة: ${money(interest)}`,
    blocks: [yearTable(current, pmt, i, months)]
  };
}

function reverse(input, target, current, i) {
  const deposit = num(input, "deposit", "الإيداع الشهري", { nonNegative: true });
  let real = 0;
  if (current < target) {
    if (i === 0) {
      if (!(deposit > 0)) fail("الإيداع الشهري يجب أن يكون أكبر من صفر لتحقيق الهدف بدون عائد.", "deposit");
      real = (target - current) / deposit;
    } else {
      const denom = current * i + deposit;
      if (!(denom > 0)) fail("لا يمكن الوصول للهدف بإيداع صفري ومدخرات حالية صفرية.", "deposit");
      real = Math.log((target * i + deposit) / denom) / Math.log(1 + i);
    }
  }
  const months = Math.ceil(real - 1e-9);
  if (months > MAX_MONTHS) fail("المدة المطلوبة تتجاوز 100 سنة، فارفع مبلغ الإيداع.", "deposit");
  const final = balanceAt(current, deposit, i, months);
  const deposited = current + deposit * months;
  const interest = final - deposited;

  const steps = [];
  if (months === 0) steps.push("المدخرات الحالية تحقق المبلغ المستهدف بالفعل.");
  else {
    steps.push(i === 0
      ? { text: "بدون عائد، عدد الأشهر هو الفرق مقسوماً على الإيداع:", tex: `N = \\frac{FV - PV}{PMT} = \\frac{${ntex(target)} - ${ntex(current)}}{${ntex(deposit)}} = ${ntex(real, 6)}` }
      : { text: "بحل معادلة الرصيد لعدد الأشهر N:", tex: `N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)} = ${ntex(real, 6)}` });
    steps.push({ text: "نقرب N للأعلى لأن الإيداع يتم شهرياً:", tex: `N = \\lceil ${ntex(real, 6)} \\rceil = ${months}` });
  }

  return {
    results: [
      { label: "المدة المطلوبة", value: months === 0 ? "الهدف متحقق بالفعل" : `${months} شهر (${monthsText(months)})` },
      { label: "الرصيد عند الوصول", value: money(final) },
      { label: "إجمالي ما ستودعه", value: money(deposited) },
      { label: "إجمالي الفائدة", value: money(interest) }
    ],
    steps,
    copy: months === 0
      ? "الهدف متحقق بالفعل"
      : `تحتاج ${months} شهراً (${monthsText(months)}) للوصول إلى ${money(target)} بإيداع ${money(deposit)} شهرياً`,
    blocks: months === 0 ? [] : [yearTable(current, deposit, i, months)]
  };
}
