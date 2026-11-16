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
  const rt = r === 0 ? "" : r === 1 ? "ماہ" : r === 2 ? "دو ماہ" : r <= 10 ? `${r} ماہ` : `${r} ماہ`;
  if (!yt && !rt) return "0 ماہ";
  if (!yt) return rt;
  if (!rt) return yt;
  return `${yt} اور ${rt}`;
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
  caption: "ہر سال کے اختتام پر بقایا رقم کی پیش رفت",
  head: ["مدت (سالوں میں)", "بقایا رقم", "کل جمع شدہ رقم", "اب تک سود"],
  rows: yearRows(PV, PMT, i, months)
});

export const meta = {
  description: "متوقع سالانہ منافع کے ساتھ مقررہ مدت میں مالی ہدف تک پہنچنے کے لیے درکار ماہانہ جمع رقم حساب کریں، یا ماہانہ جمع رقم معلوم ہو تو درکار مدت حساب کریں، ساتھ سالانہ بقایا رقم کا جدول۔",
  keywords: ["بچت", "مالی ہدف", "ماہانہ جمع رقم", "PMT", "بچت", "بچتیں", "savings goal"],
  formulas: [
    { label: "درکار ماہانہ جمع رقم (ہر مہینے کے اختتام پر)", tex: "PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1},\\qquad i = \\frac{r}{12}" },
    { label: "N ماہ کے بعد بقایا رقم", tex: "FV = PV(1+i)^N + PMT\\,\\frac{(1+i)^N - 1}{i}" },
    { label: "ہدف تک پہنچنے کے لیے ماہ کی تعداد", tex: "N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)}" }
  ],
  inputs: [
    { id: "mode", label: "آپ کیا حساب کرنا چاہتے ہیں؟", type: "select", default: "forward", options: [["forward", "درکار ماہانہ جمع رقم"], ["reverse", "مقررہ ماہانہ جمع رقم کے لیے درکار مدت"]] },
    { id: "target", label: "ہدف رقم", type: "number", default: "100000" },
    { id: "current", label: "موجودہ بچتیں", type: "number", default: "10000" },
    { id: "rate", label: "متوقع سالانہ منافع", unit: "%", type: "number", default: "5", help: "اگر منافع کی توقع نہ ہو تو صفر رکھیں۔" },
    { id: "time", label: "دستیاب مدت", type: "number", default: "10", when: { mode: ["forward"] } },
    { id: "timeUnit", label: "مدت کی اکائی", type: "select", default: "years", options: [["years", "سال"], ["months", "ماہ"]], when: { mode: ["forward"] } },
    { id: "deposit", label: "ماہانہ جمع رقم", type: "number", default: "500", when: { mode: ["reverse"] }, help: "ہر مہینے کے اختتام پر جمع کی جاتی ہے۔" }
  ],
  example: { values: { mode: "forward", target: "100000", current: "10000", rate: "5", time: "10", timeUnit: "years", deposit: "500" }, expect: ["537.92"], note: "مثال: 10 سال میں 5% سالانہ منافع کے ساتھ 10000 سے 100000 کا ہدف۔" },
  invalid: { values: { mode: "reverse", target: "100000", current: "10000", rate: "0", time: "10", timeUnit: "years", deposit: "0" } },
  related: ["compound-interest", "loan-amortization", "budget-planner", "zakat"]
};

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["forward", "reverse"], "forward");
  const target = num(input, "target", "ہدف رقم", { positive: true });
  const current = num(input, "current", "موجودہ بچتیں", { nonNegative: true, default: 0 });
  const rate = num(input, "rate", "سالانہ منافع", { nonNegative: true, max: 100, default: 0 });
  const i = rate / 1200;
  return mode === "reverse" ? reverse(input, target, current, i) : forward(input, target, current, i);
}

function forward(input, target, current, i) {
  const unit = choice(input, "timeUnit", "مدت کی اکائی", ["years", "months"], "years");
  const t = num(input, "time", "مدت", { positive: true });
  const n = unit === "years" ? t * 12 : t;
  if (!isInt(n)) fail("مدت ماہ کی صحیح تعداد دینی چاہیے، جیسے 2.5 سال یا 30 ماہ۔", "time");
  if (n > MAX_MONTHS) fail("مدت 100 سال سے زیادہ نہیں ہو سکتی۔", "time");
  const months = Math.round(n);
  const pmt = balanceAt(current, 0, i, months) >= target ? 0
    : i === 0 ? (target - current) / months
    : ((target - current * Math.pow(1 + i, months)) * i) / (Math.pow(1 + i, months) - 1);
  const reached = pmt === 0;
  const deposited = current + pmt * months;
  const final = balanceAt(current, pmt, i, months);
  const interest = final - deposited;

  const steps = [{ text: "مدت کو ماہ میں اور ماہانہ شرح تبدیل کریں:", tex: `N = ${months},\\qquad i = \\frac{r}{12} = ${ntex(i, 6)}` }];
  if (reached) steps.push(current >= target ? "موجودہ بچتیں پہلے ہی ہدف رقم تک پہنچ چکی ہیں، اس لیے جمع کرانے کی ضرورت نہیں۔" : "آپ کا موجودہ بقایا اضافی جمع کے بغیر ہدف تک بڑھ جاتا ہے۔");
  else if (i === 0) steps.push({ text: "منافع کے بغیر ماہانہ جمع رقم فرق کو ماہ کی تعداد پر تقسیم کر کے ملتی ہے:", tex: `PMT = \\frac{FV - PV}{N} = \\frac{${ntex(target)} - ${ntex(current)}}{${months}} = ${ntex(pmt, 8)}` });
  else steps.push({ text: "درکار ماہانہ جمع رقم:", tex: `PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1} = \\frac{(${ntex(target)} - ${ntex(current)} \\times (1+${ntex(i, 6)})^{${months}}) \\times ${ntex(i, 6)}}{(1+${ntex(i, 6)})^{${months}} - 1} = ${ntex(pmt, 8)}` });

  return {
    results: [
      { label: "درکار ماہانہ جمع رقم", value: reached ? "جمع کرانے کی ضرورت نہیں" : money(pmt) },
      { label: "مدت", value: monthsText(months) },
      { label: "کل جو آپ جمع کریں گے", value: money(deposited) },
      { label: "متوقع کل سود", value: money(interest) },
      { label: "مدت کے اختتام پر بقایا رقم", value: money(final) }
    ],
    steps,
    copy: reached
      ? `جمع کرائے بغیر ہدف حاصل ہے؛ متوقع بقایا رقم: ${money(final)}`
      : `درکار ماہانہ جمع رقم: ${money(pmt)} برائے ${monthsText(months)}، متوقع کل سود: ${money(interest)}`,
    blocks: [yearTable(current, pmt, i, months)]
  };
}

function reverse(input, target, current, i) {
  const deposit = num(input, "deposit", "ماہانہ جمع رقم", { nonNegative: true });
  let real = 0;
  if (current < target) {
    if (i === 0) {
      if (!(deposit > 0)) fail("منافع کے بغیر ہدف تک پہنچنے کے لیے ماہانہ جمع رقم صفر سے زیادہ ہونی چاہیے۔", "deposit");
      real = (target - current) / deposit;
    } else {
      const denom = current * i + deposit;
      if (!(denom > 0)) fail("صفر جمع رقم اور صفر موجودہ بچتوں کے ساتھ ہدف تک نہیں پہنچا جا سکتا۔", "deposit");
      real = Math.log((target * i + deposit) / denom) / Math.log(1 + i);
    }
  }
  const months = Math.ceil(real - 1e-9);
  if (months > MAX_MONTHS) fail("درکار مدت 100 سال سے زیادہ ہے؛ جمع رقم بڑھائیں۔", "deposit");
  const final = balanceAt(current, deposit, i, months);
  const deposited = current + deposit * months;
  const interest = final - deposited;

  const steps = [];
  if (months === 0) steps.push("موجودہ بچتیں پہلے ہی ہدف رقم تک پہنچ چکی ہیں۔");
  else {
    steps.push(i === 0
      ? { text: "منافع کے بغیر ماہ کی تعداد فرق کو جمع رقم پر تقسیم کر کے ملتی ہے:", tex: `N = \\frac{FV - PV}{PMT} = \\frac{${ntex(target)} - ${ntex(current)}}{${ntex(deposit)}} = ${ntex(real, 6)}` }
      : { text: "بقایا رقم کی مساوات کو ماہ کی تعداد N کے لیے حل کرنا:", tex: `N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)} = ${ntex(real, 6)}` });
    steps.push({ text: "N کو اوپر گول کرتے ہیں کیونکہ جمع رقم ماہانہ کی جاتی ہے:", tex: `N = \\lceil ${ntex(real, 6)} \\rceil = ${months}` });
  }

  return {
    results: [
      { label: "درکار مدت", value: months === 0 ? "ہدف پہلے ہی حاصل ہے" : `${months} ماہ (${monthsText(months)})` },
      { label: "ہدف تک پہنچنے پر بقایا رقم", value: money(final) },
      { label: "کل جو آپ جمع کریں گے", value: money(deposited) },
      { label: "کل سود", value: money(interest) }
    ],
    steps,
    copy: months === 0
      ? "ہدف پہلے ہی حاصل ہے"
      : `${money(deposit)} ماہانہ جمع کر کے ${money(target)} تک پہنچنے کے لیے آپ کو ${months} ماہ (${monthsText(months)}) درکار ہیں`,
    blocks: months === 0 ? [] : [yearTable(current, deposit, i, months)]
  };
}
