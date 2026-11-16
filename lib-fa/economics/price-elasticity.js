import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meta = {
  description: "کشش قیمتی تقاضا را از دو قیمت و دو مقدار با روش نقطهٔ میانی یا درصد ساده محاسبه کنید، کشش را طبقه‌بندی کنید و اثر تغییر قیمت بر درآمد کل را نشان دهید.",
  keywords: ["کشش قیمتی", "price elasticity", "کشش تقاضا", "درآمد کل", "کشسان", "ناکشسان", "elasticity"],
  formulas: [
    { label: "ضریب کشش", tex: "E = \\frac{\\%\\Delta Q}{\\%\\Delta P}" },
    { label: "نقطهٔ میانی", tex: "\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2},\\qquad \\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2}" }
  ],
  inputs: [
    { id: "P1", label: "قیمت اول P1", type: "number", default: "10" },
    { id: "Q1", label: "مقدار اول Q1", type: "number", default: "100" },
    { id: "P2", label: "قیمت دوم P2", type: "number", default: "12" },
    { id: "Q2", label: "مقدار دوم Q2", type: "number", default: "80" },
    { id: "method", label: "روش محاسبه", type: "select", default: "mid", options: [["mid", "نقطهٔ میانی (قوسی)"], ["simple", "درصد ساده"]], help: "روش نقطهٔ میانی، صرف‌نظر از جهت تغییر، نتیجهٔ یکسانی می‌دهد." }
  ],
  example: { values: { P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid" }, expect: ["-1.222", "کشسان"], note: "مثال: افزایش قیمت از 10 به 12 و کاهش مقدار از 100 به 80." },
  invalid: { values: { P1: "10", Q1: "100", P2: "10", Q2: "80", method: "mid" } },
  related: ["compound-interest", "loan-amortization", "npv-irr", "break-even", "depreciation", "financial-ratios"]
};

export function solve(input) {
  const P1 = num(input, "P1", "قیمت اول", { positive: true });
  const Q1 = num(input, "Q1", "مقدار اول", { nonNegative: true });
  const P2 = num(input, "P2", "قیمت دوم", { positive: true });
  const Q2 = num(input, "Q2", "مقدار دوم", { nonNegative: true });
  const method = choice(input, "method", "روش محاسبه", ["mid", "simple"], "mid");
  if (P1 === P2) fail("قیمت تغییر نکرده است، بنابراین کشش قابل محاسبه نیست، زیرا تقسیم بر صفر می‌شود.", "P2");
  if (method === "simple" && Q1 === 0) fail("مقدار اول صفر است و درصد ساده روی مقدار اول محاسبه می‌شود.", "Q1");
  if (method === "mid" && Q1 + Q2 === 0) fail("هر دو مقدار صفر هستند، بنابراین درصد تغییر مقدار با روش نقطهٔ میانی قابل محاسبه نیست.", "Q2");
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
  if (a < 1e-12) cls = "بی‌کشش کامل";
  else if (Math.abs(a - 1) < 1e-9) cls = "تک‌کشش";
  else if (a > 1) cls = "کشسان";
  else cls = "ناکشسان";
  const R1 = P1 * Q1;
  const R2 = P2 * Q2;
  const dR = R2 - R1;
  const effect = Math.abs(dR) < 1e-9
    ? "درآمد کل تغییر نمی‌کند"
    : dR > 0 ? `درآمد کل به اندازهٔ ${money(dR)} افزایش یافت` : `درآمد کل به اندازهٔ ${money(-dR)} کاهش یافت`;
  let note;
  if (a < 1e-12) note = "مقدار با قیمت تغییر نمی‌کند، بنابراین درآمد به همان درصد تغییر قیمت تغییر می‌کند.";
  else if (Math.abs(a - 1) < 1e-9) note = "کشش برابر یک است، بنابراین درآمد کل با تغییر قیمت تقریباً ثابت می‌ماند.";
  else if (a > 1) note = "تقاضا کشسان است: درصد تغییر مقدار بزرگ‌تر از درصد تغییر قیمت است، بنابراین با کاهش قیمت درآمد افزایش و با افزایش قیمت کاهش می‌یابد.";
  else note = "تقاضا ناکشسان است: درصد تغییر مقدار کوچک‌تر از درصد تغییر قیمت است، بنابراین با افزایش قیمت درآمد افزایش و با کاهش قیمت کاهش می‌یابد.";
  const steps = [
    {
      text: mid ? "درصد تغییر مقدار با روش نقطهٔ میانی:" : "درصد تغییر مقدار:",
      tex: mid
        ? `\\%\\Delta Q = \\frac{Q_2-Q_1}{(Q_1+Q_2)/2} = \\frac{${ntex(dQ)}}{${ntex(baseQ)}} = ${ntex(pctQ, 6)}`
        : `\\%\\Delta Q = \\frac{Q_2-Q_1}{Q_1} = \\frac{${ntex(dQ)}}{${ntex(Q1)}} = ${ntex(pctQ, 6)}`
    },
    {
      text: mid ? "درصد تغییر قیمت با روش نقطهٔ میانی:" : "درصد تغییر قیمت:",
      tex: mid
        ? `\\%\\Delta P = \\frac{P_2-P_1}{(P_1+P_2)/2} = \\frac{${ntex(dP)}}{${ntex(baseP)}} = ${ntex(pctP, 6)}`
        : `\\%\\Delta P = \\frac{P_2-P_1}{P_1} = \\frac{${ntex(dP)}}{${ntex(P1)}} = ${ntex(pctP, 6)}`
    },
    { text: "ضریب کشش:", tex: `E = \\frac{\\%\\Delta Q}{\\%\\Delta P} = \\frac{${ntex(pctQ, 6)}}{${ntex(pctP, 6)}} = ${ntex(E, 6)}` },
    { text: "درآمد کل قبل و بعد از تغییر:", tex: `R_1 = P_1Q_1 = ${ntex(R1)},\\qquad R_2 = P_2Q_2 = ${ntex(R2)}` }
  ];
  return {
    results: [
      { label: "درصد تغییر مقدار", value: `${fmt(pctQ * 100, 4)}%` },
      { label: "درصد تغییر قیمت", value: `${fmt(pctP * 100, 4)}%` },
      { label: "ضریب کشش E", value: fmt(E, 4), text: `E = ${fmt(E, 4)}` },
      { label: "طبقه‌بندی کشش", value: cls },
      { label: "درآمد کل قبل از تغییر", value: money(R1) },
      { label: "درآمد کل بعد از تغییر", value: money(R2) },
      { label: "اثر تغییر بر درآمد", value: effect }
    ],
    steps,
    copy: `E = ${fmt(E, 4)} (${cls})، درآمد از ${money(R1)} به ${money(R2)}، ${effect}`,
    blocks: [
      { type: "table", caption: "مقایسه قبل و بعد از تغییر", head: ["مورد", "قبل", "بعد"], rows: [["قیمت", fmt(P1, 6), fmt(P2, 6)], ["مقدار", fmt(Q1, 6), fmt(Q2, 6)], ["درآمد کل", money(R1), money(R2)]] },
      { type: "note", text: note }
    ]
  };
}
