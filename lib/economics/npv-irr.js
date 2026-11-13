import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LO = -0.99;
const HI = 10;
const GRID = 4000;
const NO_PAYBACK = "لا يسترد الاستثمار خلال المدة";

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
  description: "احسب صافي القيمة الحالية ومعدل العائد الداخلي ومؤشر الربحية وفترة الاسترداد العادية والمخصومة لسلسلة تدفقات نقدية، مع جدول سنوي للقيم الحالية والتراكمية.",
  keywords: ["صافي القيمة الحالية", "NPV", "معدل العائد الداخلي", "IRR", "فترة الاسترداد", "payback", "مؤشر الربحية", "دراسة الجدوى"],
  formulas: [
    { label: "صافي القيمة الحالية", tex: "NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^t}" },
    { label: "معدل العائد الداخلي", tex: "NPV(IRR) = 0" },
    { label: "مؤشر الربحية", tex: "PI = \\frac{\\sum_{t=1}^{n} CF_t/(1+r)^t}{|CF_0|}" }
  ],
  inputs: [
    { id: "r", label: "معدل الخصم", unit: "%", type: "number", default: "10" },
    { id: "cf", label: "التدفقات النقدية CF0, CF1, ...", type: "textarea", rows: 3, default: "-1000 300 400 500", placeholder: "-1000 300 400 500", help: "ابدأ بالتدفق الأولي CF0 (غالباً سالب)، ثم التدفقات السنوية. افصل بين القيم بمسافة أو فاصلة." }
  ],
  example: { values: { r: "10", cf: "-1000 300 400 500" }, expect: ["NPV = -21.04", "IRR = 8.896%"], note: "مثال: استثمار 1000 يعطي 300 و400 و500 في السنوات الثلاث التالية بمعدل خصم 10%." },
  invalid: { values: { r: "10", cf: "-1000" } },
  related: ["compound-interest", "loan-amortization", "break-even", "depreciation", "price-elasticity", "financial-ratios"]
};

export function solve(input) {
  const rPct = num(input, "r", "معدل الخصم", { min: -99, max: 1000 });
  const cf = numList(input, "cf", "التدفقات النقدية", { min: 2, max: 200 });
  if (cf[0] === 0) fail("التدفق الأولي CF0 لا يمكن أن يساوي صفراً.", "cf");
  const rate = rPct / 100;
  const npv = npvAt(cf, rate);
  if (!Number.isFinite(npv)) fail("لا يمكن حساب صافي القيمة الحالية بهذا المعدل، فجرّب معدلاً أكبر.", "r");
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
  const irrText = root === null ? "غير معرّف" : `${fmt(root * 100, 4)}%`;
  const pbText = pb === null ? NO_PAYBACK : `${fmt(pb, 4)} سنة`;
  const dpbText = dpb === null ? NO_PAYBACK : `${fmt(dpb, 4)} سنة`;
  const terms = cf.map((c, t) => (t === 0 ? ntex(c) : `\\frac{${ntex(c)}}{(1+${ntex(rate, 6)})^{${t}}}`)).join(" + ");
  const steps = [
    { text: "صافي القيمة الحالية = مجموع القيم الحالية للتدفقات:", tex: `NPV = ${terms} = ${ntex(npv, 8)}` },
    "معدل العائد الداخلي هو المعدل الذي يجعل NPV = 0، ونبحث عن أول تغيّر في إشارة NPV عبر النطاق من -99% إلى 1000% ثم نضيّق المجال بالتنصيف.",
    "فترة الاسترداد: آخر سنة يكون فيها الرصيد التراكمي سالباً، ثم نضيف الجزء الكسري من السنة التالية.",
    `مؤشر الربحية = ${ntex(pvFuture, 8)} ÷ ${ntex(Math.abs(cf[0]), 8)} = ${fmt(PI, 4)}`
  ];
  const blocks = [
    { type: "table", caption: "جدول القيم الحالية والتراكمية", head: ["السنة", "التدفق النقدي", "معامل الخصم", "القيمة الحالية", "التراكمي", "التراكمي المخصوم"], rows: cf.map((c, t) => [fmt(t), money(c), fmt(df[t], 6), money(pv[t]), money(cum[t]), money(cumPv[t])]) }
  ];
  if (changes === 0) blocks.push({ type: "note", text: "لا يوجد تغيّر في إشارة NPV عبر النطاق من -99% إلى 1000%، لذلك لا يمكن تعريف معدل عائد داخلي.", tone: "warn" });
  if (changes > 1) blocks.push({ type: "note", text: "وُجد أكثر من معدل عائد داخلي لهذه التدفقات، ويُعرض أصغرها." });
  return {
    results: [
      { label: "صافي القيمة الحالية NPV", value: money(npv), text: `NPV = ${money(npv)}` },
      { label: "معدل العائد الداخلي IRR", value: irrText, text: `IRR = ${irrText}` },
      { label: "فترة الاسترداد", value: pbText },
      { label: "فترة الاسترداد المخصوم", value: dpbText },
      { label: "مؤشر الربحية PI", value: fmt(PI, 4) }
    ],
    steps,
    copy: `NPV = ${money(npv)}، IRR = ${irrText}، مؤشر الربحية PI = ${fmt(PI, 4)}`,
    blocks
  };
}
