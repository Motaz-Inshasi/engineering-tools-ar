import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "احسب معامل المرونة السعرية للطلب من سعرين وكميتين بالنقطة المتوسطة أو بالنسبة البسيطة، وصنّف المرونة، وبيّن أثر تغيّر السعر على الإيراد الكلي.",
  keywords: ["المرونة السعرية", "price elasticity", "مرونة الطلب", "الإيراد الكلي", "مرن", "غير مرن", "elasticity"],
  formulas: [
    { label: "معامل المرونة", tex: "E = \\frac{\\%\\Delta Q}{\\%\\Delta P}" },
    { label: "النقطة المتوسطة", tex: "\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2},\\qquad \\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2}" }
  ],
  inputs: [
    { id: "P1", label: "السعر الأول P1", type: "number", default: "10" },
    { id: "Q1", label: "الكمية الأولى Q1", type: "number", default: "100" },
    { id: "P2", label: "السعر الثاني P2", type: "number", default: "12" },
    { id: "Q2", label: "الكمية الثانية Q2", type: "number", default: "80" },
    { id: "method", label: "طريقة الحساب", type: "select", default: "mid", options: [["mid", "النقطة المتوسطة (القوس)"], ["simple", "النسبة البسيطة"]], help: "النقطة المتوسطة تعطي النتيجة نفسها أياً كان اتجاه التغيّر." }
  ],
  example: { values: { P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid" }, expect: ["-1.222", "مرن"], note: "مثال: رفع السعر من 10 إلى 12 فانخفضت الكمية من 100 إلى 80." },
  invalid: { values: { P1: "10", Q1: "100", P2: "10", Q2: "80", method: "mid" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "financial-ratios"]
};

export function solve(input) {
  const P1 = num(input, "P1", "السعر الأول", { positive: true });
  const Q1 = num(input, "Q1", "الكمية الأولى", { nonNegative: true });
  const P2 = num(input, "P2", "السعر الثاني", { positive: true });
  const Q2 = num(input, "Q2", "الكمية الثانية", { nonNegative: true });
  const method = choice(input, "method", "طريقة الحساب", ["mid", "simple"], "mid");
  if (P1 === P2) fail("السعر لم يتغيّر، فلا يمكن حساب المرونة لأن القسمة تكون على صفر.", "P2");
  if (method === "simple" && Q1 === 0) fail("الكمية الأولى صفر، والنسبة البسيطة تُحسب على الكمية الأولى.", "Q1");
  if (method === "mid" && Q1 + Q2 === 0) fail("الكميتان صفر، فلا يمكن حساب النسبة المتوسطة للتغيّر في الكمية.", "Q2");
  const mid = method === "mid";
  const dP = P2 - P1;
  const dQ = Q2 - Q1;
  const baseP = mid ? (P1 + P2) / 2 : P1;
  const baseQ = mid ? (Q1 + Q2) / 2 : Q1;
  const pctP = dP / baseP;
  const pctQ = dQ / baseQ;
  const E = pctQ / pctP;
  const a = Math.abs(E);
  let cls;
  if (a < 1e-12) cls = "عديم المرونة";
  else if (Math.abs(a - 1) < 1e-9) cls = "أحادي المرونة";
  else if (a > 1) cls = "مرن";
  else cls = "غير مرن";
  const R1 = P1 * Q1;
  const R2 = P2 * Q2;
  const dR = R2 - R1;
  const effect = Math.abs(dR) < 1e-9
    ? "لا يتغيّر الإيراد الكلي"
    : dR > 0 ? `ارتفع الإيراد الكلي بمقدار ${money(dR)}` : `انخفض الإيراد الكلي بمقدار ${money(-dR)}`;
  let note;
  if (a < 1e-12) note = "الكمية لا تتغيّر مع السعر، لذلك يتغيّر الإيراد بنسبة تغيّر السعر نفسها.";
  else if (Math.abs(a - 1) < 1e-9) note = "المرونة تساوي واحداً، لذلك يبقى الإيراد الكلي تقريباً ثابتاً عند تغيّر السعر.";
  else if (a > 1) note = "الطلب مرن: نسبة تغيّر الكمية أكبر من نسبة تغيّر السعر، لذلك يرتفع الإيراد عند خفض السعر وينخفض عند رفعه.";
  else note = "الطلب غير مرن: نسبة تغيّر الكمية أصغر من نسبة تغيّر السعر، لذلك يرتفع الإيراد عند رفع السعر وينخفض عند خفضه.";
  const steps = [
    {
      text: mid ? "نسبة التغيّر في الكمية بالنقطة المتوسطة:" : "نسبة التغيّر في الكمية:",
      tex: mid
        ? `\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2} = \\frac{${ntex(dQ)}}{${ntex(baseQ)}} = ${ntex(pctQ, 6)}`
        : `\\%\\Delta Q = \\frac{Q_2-Q_1}{Q_1} = \\frac{${ntex(dQ)}}{${ntex(Q1)}} = ${ntex(pctQ, 6)}`
    },
    {
      text: mid ? "نسبة التغيّر في السعر بالنقطة المتوسطة:" : "نسبة التغيّر في السعر:",
      tex: mid
        ? `\\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2} = \\frac{${ntex(dP)}}{${ntex(baseP)}} = ${ntex(pctP, 6)}`
        : `\\%\\Delta P = \\frac{P_2-P_1}{P_1} = \\frac{${ntex(dP)}}{${ntex(P1)}} = ${ntex(pctP, 6)}`
    },
    { text: "معامل المرونة:", tex: `E = \\frac{\\%\\Delta Q}{\\%\\Delta P} = \\frac{${ntex(pctQ, 6)}}{${ntex(pctP, 6)}} = ${ntex(E, 6)}` },
    { text: "الإيراد الكلي قبل وبعد التغيّر:", tex: `R_1 = P_1Q_1 = ${ntex(R1)},\\qquad R_2 = P_2Q_2 = ${ntex(R2)}` }
  ];
  return {
    results: [
      { label: "نسبة التغيّر في الكمية", value: `${fmt(pctQ * 100, 4)}%` },
      { label: "نسبة التغيّر في السعر", value: `${fmt(pctP * 100, 4)}%` },
      { label: "معامل المرونة E", value: fmt(E, 4), text: `E = ${fmt(E, 4)}` },
      { label: "تصنيف المرونة", value: cls },
      { label: "الإيراد الكلي قبل التغيّر", value: money(R1) },
      { label: "الإيراد الكلي بعد التغيّر", value: money(R2) },
      { label: "أثر التغيّر على الإيراد", value: effect }
    ],
    steps,
    copy: `E = ${fmt(E, 4)} (${cls})، الإيراد من ${money(R1)} إلى ${money(R2)}، ${effect}`,
    blocks: [
      { type: "table", caption: "مقارنة قبل وبعد التغيّر", head: ["البند", "قبل", "بعد"], rows: [["السعر", fmt(P1, 6), fmt(P2, 6)], ["الكمية", fmt(Q1, 6), fmt(Q2, 6)], ["الإيراد الكلي", money(R1), money(R2)]] },
      { type: "note", text: note }
    ]
  };
}
