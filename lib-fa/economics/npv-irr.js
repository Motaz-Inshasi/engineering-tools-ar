import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LO = -0.99;
const HI = 10;
const GRID = 4000;
const NO_PAYBACK = "سرمایه‌گذاری در مدت مشخص‌شده بازنمی‌گردد";

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
  description: "خالص ارزش فعلی، نرخ بازده داخلی، شاخص سودآوری و دورهٔ بازگشت ساده و تنزیل‌شده را برای سری جریان‌های نقدی محاسبه کنید، همراه با جدول سالانهٔ ارزش‌های فعلی و تجمعی.",
  keywords: ["خالص ارزش فعلی", "NPV", "نرخ بازده داخلی", "IRR", "دورهٔ بازگشت سرمایه", "payback", "شاخص سودآوری", "مطالعهٔ امکان‌سنجی"],
  formulas: [
    { label: "خالص ارزش فعلی", tex: "NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^t}" },
    { label: "نرخ بازده داخلی", tex: "NPV(IRR) = 0" },
    { label: "شاخص سودآوری", tex: "PI = \\frac{\\sum_{t=1}^{n} CF_t/(1+r)^t}{|CF_0|}" }
  ],
  inputs: [
    { id: "r", label: "نرخ تنزیل", unit: "%", type: "number", default: "10" },
    { id: "cf", label: "جریان‌های نقدی CF0, CF1, ...", type: "textarea", rows: 3, default: "-1000 300 400 500", placeholder: "-1000 300 400 500", help: "از جریان اولیه CF0 شروع کنید (معمولاً منفی)، سپس جریان‌های سالانه را وارد کنید. مقادیر را با فاصله یا ویرگول از هم جدا کنید." }
  ],
  example: { values: { r: "10", cf: "-1000 300 400 500" }, expect: ["NPV = -21.04", "IRR = 8.896%"], note: "مثال: سرمایه‌گذاری 1000 که در سه سال بعد 300 و 400 و 500 بازده دارد، با نرخ تنزیل 10%." },
  invalid: { values: { r: "10", cf: "-1000" } },
  related: ["compound-interest", "loan-amortization", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const rPct = num(input, "r", "نرخ تنزیل", { min: -99, max: 1000 });
  const cf = numList(input, "cf", "جریان‌های نقدی", { min: 2, max: 200 });
  if (cf[0] === 0) fail("جریان اولیه CF0 نمی‌تواند صفر باشد.", "cf");
  const rate = rPct / 100;
  const npv = npvAt(cf, rate);
  if (!Number.isFinite(npv)) fail("خالص ارزش فعلی با این نرخ قابل محاسبه نیست؛ نرخ بزرگ‌تری را امتحان کنید.", "r");
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
  const irrText = root === null ? "تعریف‌نشده" : `${fmt(root * 100, 4)}%`;
  const pbText = pb === null ? NO_PAYBACK : `${fmt(pb, 4)} سال`;
  const dpbText = dpb === null ? NO_PAYBACK : `${fmt(dpb, 4)} سال`;
  const terms = cf.map((c, t) => (t === 0 ? ntex(c) : `\\frac{${ntex(c)}}{(1+${ntex(rate, 6)})^{${t}}}`)).join(" + ");
  const steps = [
    { text: "خالص ارزش فعلی = مجموع ارزش‌های فعلی جریان‌ها:", tex: `NPV = ${terms} = ${ntex(npv, 8)}` },
    "نرخ بازده داخلی نرخی است که NPV = 0 می‌کند. اولین تغییر علامت NPV را در بازهٔ -99% تا 1000% جستجو می‌کنیم و سپس با روش دونیم‌کردن بازه، آن را تنگ‌تر می‌کنیم.",
    "دورهٔ بازگشت: آخرین سالی که ماندهٔ تجمعی در آن منفی است، به‌علاوهٔ بخش کسری سال بعد.",
    `شاخص سودآوری = ${ntex(pvFuture, 8)} ÷ ${ntex(Math.abs(cf[0]), 8)} = ${fmt(PI, 4)}`
  ];
  const blocks = [
    { type: "table", caption: "جدول ارزش‌های فعلی و تجمعی", head: ["سال", "جریان نقدی", "ضریب تنزیل", "ارزش فعلی", "تجمعی", "تجمعی تنزیل‌شده"], rows: cf.map((c, t) => [fmt(t), money(c), fmt(df[t], 6), money(pv[t]), money(cum[t]), money(cumPv[t])]) }
  ];
  if (changes === 0) blocks.push({ type: "note", text: "علامت NPV در بازهٔ -99% تا 1000% تغییر نمی‌کند، بنابراین نرخ بازده داخلی تعریف نمی‌شود.", tone: "warn" });
  if (changes > 1) blocks.push({ type: "note", text: "برای این جریان‌ها بیش از یک نرخ بازده داخلی وجود دارد و کوچک‌ترین آن نمایش داده می‌شود." });
  return {
    results: [
      { label: "خالص ارزش فعلی NPV", value: money(npv), text: `NPV = ${money(npv)}` },
      { label: "نرخ بازده داخلی IRR", value: irrText, text: `IRR = ${irrText}` },
      { label: "دورهٔ بازگشت سرمایه", value: pbText },
      { label: "دورهٔ بازگشت تنزیل‌شده", value: dpbText },
      { label: "شاخص سودآوری PI", value: fmt(PI, 4) }
    ],
    steps,
    copy: `NPV = ${money(npv)}، IRR = ${irrText}، شاخص سودآوری PI = ${fmt(PI, 4)}`,
    blocks
  };
}
