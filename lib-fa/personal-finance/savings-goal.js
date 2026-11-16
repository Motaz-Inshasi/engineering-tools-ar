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
  const yt = y === 0 ? "" : y === 1 ? "سال" : y === 2 ? "دو سال" : y <= 10 ? `${y} سال` : `${y} سال`;
  const rt = r === 0 ? "" : r === 1 ? "ماه" : r === 2 ? "دو ماه" : r <= 10 ? `${r} ماه` : `${r} ماه`;
  if (!yt && !rt) return "0 ماه";
  if (!yt) return rt;
  if (!rt) return yt;
  return `${yt} و ${rt}`;
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
  caption: "تحول مانده در پایان هر سال",
  head: ["مدت (بر حسب سال)", "مانده", "کل واریزی", "بهرهٔ تا کنون"],
  rows: yearRows(PV, PMT, i, months)
});

export const meta = {
  description: "واریز ماهانهٔ لازم برای رسیدن به یک هدف مالی با بازدهٔ سالانهٔ مورد انتظار و مدت مشخص را محاسبه کنید، یا اگر واریز ماهانه را می‌دانید، مدت لازم را بیابید، همراه با جدول مانده سالانه.",
  keywords: ["پس‌انداز", "هدف مالی", "واریز ماهانه", "PMT", "صرفه‌جویی", "اندوخته", "savings goal"],
  formulas: [
    { label: "واریز ماهانهٔ لازم (در پایان هر ماه)", tex: "PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1},\\qquad i = \\frac{r}{12}" },
    { label: "مانده پس از N ماه", tex: "FV = PV(1+i)^N + PMT\\,\\frac{(1+i)^N - 1}{i}" },
    { label: "تعداد ماه‌ها برای رسیدن به هدف", tex: "N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)}" }
  ],
  inputs: [
    { id: "mode", label: "چه چیزی را می‌خواهید محاسبه کنید؟", type: "select", default: "forward", options: [["forward", "واریز ماهانهٔ لازم"], ["reverse", "مدت لازم برای واریز ماهانهٔ ثابت"]] },
    { id: "target", label: "مبلغ هدف", type: "number", default: "100000" },
    { id: "current", label: "پس‌انداز فعلی", type: "number", default: "10000" },
    { id: "rate", label: "بازدهٔ سالانهٔ مورد انتظار", unit: "%", type: "number", default: "5", help: "اگر بازده‌ای انتظار ندارید، آن را صفر قرار دهید." },
    { id: "time", label: "مدت در دسترس", type: "number", default: "10", when: { mode: ["forward"] } },
    { id: "timeUnit", label: "واحد مدت", type: "select", default: "years", options: [["years", "سال"], ["months", "ماه"]], when: { mode: ["forward"] } },
    { id: "deposit", label: "واریز ماهانه", type: "number", default: "500", when: { mode: ["reverse"] }, help: "در پایان هر ماه واریز می‌شود." }
  ],
  example: { values: { mode: "forward", target: "100000", current: "10000", rate: "5", time: "10", timeUnit: "years", deposit: "500" }, expect: ["537.92"], note: "مثال: هدف 100000 از 10000 با بازدهی 5% سالانه در 10 سال." },
  invalid: { values: { mode: "reverse", target: "100000", current: "10000", rate: "0", time: "10", timeUnit: "years", deposit: "0" } },
  related: ["compound-interest", "loan-amortization", "budget-planner", "zakat"]
};

export function solve(input) {
  const mode = choice(input, "mode", "نوع محاسبه", ["forward", "reverse"], "forward");
  const target = num(input, "target", "مبلغ هدف", { positive: true });
  const current = num(input, "current", "پس‌انداز فعلی", { nonNegative: true, default: 0 });
  const rate = num(input, "rate", "بازدهی سالانه", { nonNegative: true, max: 100, default: 0 });
  const i = rate / 1200;
  return mode === "reverse" ? reverse(input, target, current, i) : forward(input, target, current, i);
}

function forward(input, target, current, i) {
  const unit = choice(input, "timeUnit", "واحد مدت", ["years", "months"], "years");
  const t = num(input, "time", "مدت", { positive: true });
  const n = unit === "years" ? t * 12 : t;
  if (!isInt(n)) fail("مدت باید تعداد صحیحی ماه بدهد، مانند 2.5 سال یا 30 ماه.", "time");
  if (n > MAX_MONTHS) fail("مدت نباید از 100 سال بیشتر شود.", "time");
  const months = Math.round(n);
  const pmt = balanceAt(current, 0, i, months) >= target ? 0
    : i === 0 ? (target - current) / months
    : ((target - current * Math.pow(1 + i, months)) * i) / (Math.pow(1 + i, months) - 1);
  const reached = pmt === 0;
  const deposited = current + pmt * months;
  const final = balanceAt(current, pmt, i, months);
  const interest = final - deposited;

  const steps = [{ text: "تبدیل مدت به ماه و نرخ ماهانه:", tex: `N = ${months},\\qquad i = \\frac{r}{12} = ${ntex(i, 6)}` }];
  if (reached) steps.push(current >= target ? "پس‌انداز فعلی از قبل به مبلغ هدف می‌رسد، پس واریز لازم نیست." : "مانده فعلی شما بدون واریز اضافی به هدف می‌رسد.");
  else if (i === 0) steps.push({ text: "بدون بازده، واریز ماهانه برابر تفاوت تقسیم بر تعداد ماه‌هاست:", tex: `PMT = \\frac{FV - PV}{N} = \\frac{${ntex(target)} - ${ntex(current)}}{${months}} = ${ntex(pmt, 8)}` });
  else steps.push({ text: "واریز ماهانهٔ لازم:", tex: `PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1} = \\frac{(${ntex(target)} - ${ntex(current)} \\times (1+${ntex(i, 6)})^{${months}}) \\times ${ntex(i, 6)}}{(1+${ntex(i, 6)})^{${months}} - 1} = ${ntex(pmt, 8)}` });

  return {
    results: [
      { label: "واریز ماهانهٔ لازم", value: reached ? "واریز لازم نیست" : money(pmt) },
      { label: "مدت", value: monthsText(months) },
      { label: "کل مبلغی که واریز می‌کنید", value: money(deposited) },
      { label: "کل بهرهٔ مورد انتظار", value: money(interest) },
      { label: "مانده در پایان مدت", value: money(final) }
    ],
    steps,
    copy: reached
      ? `هدف بدون واریز محقق است؛ مانده مورد انتظار: ${money(final)}`
      : `واریز ماهانهٔ لازم: ${money(pmt)} برای مدت ${monthsText(months)}، کل بهرهٔ مورد انتظار: ${money(interest)}`,
    blocks: [yearTable(current, pmt, i, months)]
  };
}

function reverse(input, target, current, i) {
  const deposit = num(input, "deposit", "واریز ماهانه", { nonNegative: true });
  let real = 0;
  if (current < target) {
    if (i === 0) {
      if (!(deposit > 0)) fail("برای رسیدن به هدف بدون بازده، واریز ماهانه باید بزرگ‌تر از صفر باشد.", "deposit");
      real = (target - current) / deposit;
    } else {
      const denom = current * i + deposit;
      if (!(denom > 0)) fail("با واریز صفر و پس‌انداز فعلی صفر نمی‌توان به هدف رسید.", "deposit");
      real = Math.log((target * i + deposit) / denom) / Math.log(1 + i);
    }
  }
  const months = Math.ceil(real - 1e-9);
  if (months > MAX_MONTHS) fail("مدت لازم از 100 سال بیشتر است، پس مبلغ واریز را افزایش دهید.", "deposit");
  const final = balanceAt(current, deposit, i, months);
  const deposited = current + deposit * months;
  const interest = final - deposited;

  const steps = [];
  if (months === 0) steps.push("پس‌انداز فعلی از قبل به مبلغ هدف می‌رسد.");
  else {
    steps.push(i === 0
      ? { text: "بدون بازده، تعداد ماه‌ها برابر تفاوت تقسیم بر واریز است:", tex: `N = \\frac{FV - PV}{PMT} = \\frac{${ntex(target)} - ${ntex(current)}}{${ntex(deposit)}} = ${ntex(real, 6)}` }
      : { text: "با حل معادلهٔ مانده برای تعداد ماه‌های N:", tex: `N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)} = ${ntex(real, 6)}` });
    steps.push({ text: "N را به بالا گرد می‌کنیم، چون واریز ماهانه انجام می‌شود:", tex: `N = \\lceil ${ntex(real, 6)} \\rceil = ${months}` });
  }

  return {
    results: [
      { label: "مدت لازم", value: months === 0 ? "هدف از قبل محقق است" : `${months} ماه (${monthsText(months)})` },
      { label: "مانده در زمان رسیدن به هدف", value: money(final) },
      { label: "کل مبلغی که واریز می‌کنید", value: money(deposited) },
      { label: "کل بهره", value: money(interest) }
    ],
    steps,
    copy: months === 0
      ? "هدف از قبل محقق است"
      : `برای رسیدن به ${money(target)} با واریز ماهانهٔ ${money(deposit)}، به ${months} ماه (${monthsText(months)}) نیاز دارید`,
    blocks: months === 0 ? [] : [yearTable(current, deposit, i, months)]
  };
}
