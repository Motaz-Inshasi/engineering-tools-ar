import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LO = -0.99;
const HI = 10;
const GRID = 4000;
const NO_PAYBACK = "سرمایہ کاری مدت کے اندر واپس نہیں ہوتی";

const npvAt = (cf, r) => {
  let s = 0;
  let d = 1;
  for (let t = 0; t < cf.length; t++) {
    if (t > 0) d *= 1 + r;
    s += cf[t] / d;
  }
  return s;
};

function bisect(cf, a, b) {
  let fa = npvAt(cf, a);
  for (let k = 0; k < 200; k++) {
    const m = (a + b) / 2;
    const fm = npvAt(cf, m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

function findIrr(cf) {
  let prevR = LO;
  let prevV = npvAt(cf, LO);
  let root = null;
  let changes = 0;
  for (let k = 1; k <= GRID; k++) {
    const r = LO + ((HI - LO) * k) / GRID;
    const v = npvAt(cf, r);
    if (Number.isFinite(prevV) && Number.isFinite(v) && prevV * v < 0) {
      changes++;
      if (root === null) root = bisect(cf, prevR, r);
    }
    if (Number.isFinite(v) && v === 0 && root === null) root = r;
    prevR = r;
    prevV = v;
  }
  return { root, changes };
}

function payback(vals) {
  let cum = 0;
  for (let t = 0; t < vals.length; t++) {
    const prev = cum;
    cum += vals[t];
    if (cum >= 0 && (t === 0 || prev < 0)) return t === 0 ? 0 : t - 1 + -prev / vals[t];
  }
  return null;
}

export const meta = {
  description: "نقدی بہاؤ کے سلسلے کے لیے خالص حال قدر، داخلی شرح منافع، منافع بخشی انڈیکس اور عام اور رعایتی واپسی کی مدت کا حساب لگائیں، ساتھ ایک سالانہ جدول جس میں حال قدر اور جمع شدہ قدریں ہوں۔",
  keywords: ["خالص حال قدر", "NPV", "داخلی شرح منافع", "IRR", "واپسی کی مدت", "payback", "منافع بخشی انڈیکس", "فزیبیلیٹی اسٹڈی"],
  formulas: [
    { label: "خالص حال قدر", tex: "NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^t}" },
    { label: "داخلی شرح منافع", tex: "NPV(IRR) = 0" },
    { label: "منافع بخشی انڈیکس", tex: "PI = \\frac{\\sum_{t=1}^{n} CF_t/(1+r)^t}{|CF_0|}" }
  ],
  inputs: [
    { id: "r", label: "رعایتی شرح", unit: "%", type: "number", default: "10" },
    { id: "cf", label: "نقدی بہاؤ CF0, CF1, ...", type: "textarea", rows: 3, default: "-1000 300 400 500", placeholder: "-1000 300 400 500", help: "ابتدائی نقدی بہاؤ CF0 (عموماً منفی) سے شروع کریں، پھر سالانہ نقدی بہاؤ۔ قدروں کو خالی جگہ یا کاما لگا کر الگ کریں۔" }
  ],
  example: { values: { r: "10", cf: "-1000 300 400 500" }, expect: ["NPV = -21.04", "IRR = 8.896%"], note: "مثال: 10% رعایتی شرح پر 1000 کی سرمایہ کاری سے اگلے تین سالوں میں 300، 400 اور 500 حاصل ہوتے ہیں۔" },
  invalid: { values: { r: "10", cf: "-1000" } },
  related: ["compound-interest", "loan-amortization", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const rPct = num(input, "r", "رعایتی شرح", { min: -99, max: 1000 });
  const cf = numList(input, "cf", "نقدی بہاؤ", { min: 2, max: 200 });
  if (cf[0] === 0) fail("ابتدائی نقدی بہاؤ CF0 صفر نہیں ہو سکتا۔", "cf");
  const rate = rPct / 100;
  const npv = npvAt(cf, rate);
  if (!Number.isFinite(npv)) fail("اس شرح پر خالص حال قدر کا حساب نہیں لگایا جا سکتا؛ زیادہ شرح آزمائیں۔", "r");
  const df = cf.map((_, t) => 1 / Math.pow(1 + rate, t));
  const pv = cf.map((c, t) => c * df[t]);
  const pvFuture = pv.slice(1).reduce((s, x) => s + x, 0);
  const PI = pvFuture / Math.abs(cf[0]);
  const cum = [];
  const cumPv = [];
  let a = 0;
  let b = 0;
  cf.forEach((c, t) => {
    a += c;
    b += pv[t];
    cum.push(a);
    cumPv.push(b);
  });
  const pb = payback(cf);
  const dpb = payback(pv);
  const { root, changes } = findIrr(cf);
  const irrText = root === null ? "غیر متعین" : `${fmt(root * 100, 4)}%`;
  const pbText = pb === null ? NO_PAYBACK : `${fmt(pb, 4)} سال`;
  const dpbText = dpb === null ? NO_PAYBACK : `${fmt(dpb, 4)} سال`;
  const terms = cf.map((c, t) => (t === 0 ? ntex(c) : `\\frac{${ntex(c)}}{(1+${ntex(rate, 6)})^{${t}}}`)).join(" + ");
  const steps = [
    { text: "خالص حال قدر = بہاؤ کی حال قدروں کا مجموعہ:", tex: `NPV = ${terms} = ${ntex(npv, 8)}` },
    "داخلی شرح منافع وہ شرح ہے جس پر NPV = 0 ہوتا ہے۔ ہم -99% سے 1000% کے دائرے میں NPV کی علامت میں پہلی تبدیلی تلاش کرتے ہیں، پھر تنصیف کے ذریعے وقفہ مزید تنگ کرتے ہیں۔",
    "واپسی کی مدت: وہ آخری سال جس میں جمع شدہ بقایا منفی ہو، پھر اگلے سال کا کسری حصہ شامل کیا جاتا ہے۔",
    `منافع بخشی انڈیکس = ${ntex(pvFuture, 8)} ÷ ${ntex(Math.abs(cf[0]), 8)} = ${fmt(PI, 4)}`
  ];
  const blocks = [
    { type: "table", caption: "حال اور جمع شدہ قدروں کا جدول", head: ["سال", "نقدی بہاؤ", "رعایتی عامل", "حال قدر", "جمع شدہ", "رعایتی جمع شدہ"], rows: cf.map((c, t) => [fmt(t), money(c), fmt(df[t], 6), money(pv[t]), money(cum[t]), money(cumPv[t])]) }
  ];
  if (changes === 0) blocks.push({ type: "note", text: "-99% سے 1000% کے دائرے میں NPV کی علامت نہیں بدلتی، اس لیے داخلی شرح منافع متعین نہیں کی جا سکتی۔", tone: "warn" });
  if (changes > 1) blocks.push({ type: "note", text: "ان نقدی بہاؤ کے لیے ایک سے زیادہ داخلی شرحیں موجود ہیں؛ سب سے چھوٹی دکھائی گئی ہے۔" });
  return {
    results: [
      { label: "خالص حال قدر NPV", value: money(npv), text: `NPV = ${money(npv)}` },
      { label: "داخلی شرح منافع IRR", value: irrText, text: `IRR = ${irrText}` },
      { label: "واپسی کی مدت", value: pbText },
      { label: "رعایتی واپسی کی مدت", value: dpbText },
      { label: "منافع بخشی انڈیکس PI", value: fmt(PI, 4) }
    ],
    steps,
    copy: `NPV = ${money(npv)}، IRR = ${irrText}، منافع بخشی انڈیکس PI = ${fmt(PI, 4)}`,
    blocks
  };
}
