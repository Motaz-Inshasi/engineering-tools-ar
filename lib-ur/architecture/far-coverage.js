import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const EPS = 1e-9;

export const meta = {
  description: "کسی قطعہ زمین کا کوریج ریشو، فلور ایریا ریشو (FAR) اور کھلا رقبہ حساب کریں، تعمیراتی ضوابط کی جانچ کریں، اور زیادہ سے زیادہ فُٹ پرنٹ، زیادہ سے زیادہ کل رقبہ اور اجازت شدہ زیادہ سے زیادہ منزلیں معلوم کریں۔",
  keywords: ["کوریج ریشو", "فلور ایریا ریشو", "FAR", "coverage", "تعمیراتی ضوابط", "کھلا رقبہ", "منزلیں"],
  formulas: [
    { label: "کوریج ریشو", tex: "C = \\frac{A_{f}}{A_{p}} \\times 100" },
    { label: "فلور ایریا ریشو", tex: "FAR = \\frac{A_{total}}{A_{p}}" },
    { label: "کل تعمیراتی رقبہ", tex: "A_{total} = A_{f} \\times N" }
  ],
  inputs: [
    { id: "plot", label: "قطعہ زمین کا رقبہ", unit: "m²", type: "number", default: "500" },
    { id: "footprint", label: "گراؤنڈ فلور کا رقبہ (فُٹ پرنٹ)", unit: "m²", type: "number", default: "300" },
    { id: "mode", label: "کل رقبے کے حساب کا طریقہ", type: "select", default: "floors", options: [["floors", "منزلوں کی تعداد"], ["area", "کل رقبہ"]] },
    { id: "floors", label: "منزلوں کی تعداد", type: "number", default: "4", when: { mode: ["floors"] }, help: "فرض کیا جاتا ہے کہ تمام منزلوں کا رقبہ فُٹ پرنٹ کے رقبے کے برابر ہے۔" },
    { id: "totalArea", label: "کل تعمیراتی رقبہ", unit: "m²", type: "number", when: { mode: ["area"] } },
    { id: "maxCov", label: "اجازت شدہ کوریج ریشو", unit: "%", type: "number", help: "اختیاری۔" },
    { id: "maxFar", label: "اجازت شدہ FAR", type: "number", help: "اختیاری۔" }
  ],
  example: { values: { plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "60", maxFar: "2.5" }, expect: ["60%", "2.4"], note: "مثال: 500 m² کا قطعہ، 300 m² فُٹ پرنٹ اور 4 منزلیں۔" },
  invalid: { values: { plot: "500", footprint: "600", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "" } },
  related: ["polygon-area", "stair-design"]
};

export function solve(input) {
  const P = num(input, "plot", "قطعہ زمین کا رقبہ", { positive: true });
  const F = num(input, "footprint", "گراؤنڈ فلور کا رقبہ", { positive: true });
  if (F > P) fail("فُٹ پرنٹ کا رقبہ قطعہ زمین کے رقبے سے زیادہ نہیں ہو سکتا۔", "footprint");
  const mode = choice(input, "mode", "حساب کا طریقہ", ["floors", "area"], "floors");
  let total, floors = null;
  if (mode === "floors") {
    floors = num(input, "floors", "منزلوں کی تعداد", { integer: true, min: 1, max: 200 });
    total = F * floors;
  } else {
    total = num(input, "totalArea", "کل تعمیراتی رقبہ", { positive: true });
  }
  const maxCov = num(input, "maxCov", "اجازت شدہ کوریج ریشو", { positive: true, max: 100, optional: true });
  const maxFar = num(input, "maxFar", "اجازت شدہ FAR", { positive: true, optional: true });
  const cov = (F * 100) / P;
  const far = total / P;
  const open = P - F;
  const openPct = (open * 100) / P;
  const covOk = maxCov === null || cov <= maxCov + EPS;
  const farOk = maxFar === null || far <= maxFar + EPS;
  const maxFootprint = maxCov === null ? null : (maxCov / 100) * P;
  const maxTotal = maxFar === null ? null : maxFar * P;
  const maxFloors = maxTotal === null ? null : Math.floor(maxTotal / F + EPS);
  const issues = [];
  if (!covOk) issues.push(`کوریج حد سے ${fmt(cov - maxCov, 4)}% زیادہ ہے`);
  if (!farOk) issues.push(`FAR حد سے ${fmt(far - maxFar, 4)} زیادہ ہے`);
  const verdict = issues.length === 0 ? "ضوابط کے مطابق" : `ضوابط کے مطابق نہیں: ${issues.join("، ")}`;
  const judge = (ok, limit) => (limit === null ? "کوئی حد نہیں" : ok ? "مطابق" : "غیر مطابق");
  const steps = [
    { text: "کوریج ریشو:", tex: `C = \\frac{${ntex(F, 6)}}{${ntex(P, 6)}} \\times 100 = ${ntex(cov, 6)}\\ \\%` },
    { text: "کل تعمیراتی رقبہ:", tex: mode === "floors" ? `A_{total} = ${ntex(F, 6)} \\times ${ntex(floors, 6)} = ${ntex(total, 6)}\\ m^2` : `A_{total} = ${ntex(total, 6)}\\ m^2` },
    { text: "فلور ایریا ریشو:", tex: `FAR = \\frac{${ntex(total, 6)}}{${ntex(P, 6)}} = ${ntex(far, 6)}` },
    { text: "کھلا رقبہ:", tex: `A_{open} = ${ntex(P, 6)} - ${ntex(F, 6)} = ${ntex(open, 6)}\\ m^2` }
  ];
  const rows = [
    ["کوریج ریشو", `${fmt(cov, 4)}%`, maxCov === null ? "کوئی حد نہیں" : `≤ ${fmt(maxCov)}%`, judge(covOk, maxCov)],
    ["فلور ایریا ریشو (FAR)", fmt(far, 4), maxFar === null ? "کوئی حد نہیں" : `≤ ${fmt(maxFar)}`, judge(farOk, maxFar)]
  ];
  const results = [
    { label: "کوریج ریشو", value: `${fmt(cov, 4)}%`, text: `کوریج ${fmt(cov, 4)}%` },
    { label: "کل تعمیراتی رقبہ", value: `${fmt(total, 6)} m²` },
    { label: "فلور ایریا ریشو (FAR)", value: fmt(far, 4), text: `FAR = ${fmt(far, 4)}` },
    { label: "کھلا رقبہ", value: `${fmt(open, 4)} m² (${fmt(openPct, 4)}%)` }
  ];
  if (maxFootprint !== null) results.push({ label: "اجازت شدہ زیادہ سے زیادہ فُٹ پرنٹ", value: `${fmt(maxFootprint, 6)} m²` });
  if (maxTotal !== null) {
    results.push({ label: "اجازت شدہ زیادہ سے زیادہ کل رقبہ", value: `${fmt(maxTotal, 6)} m²` });
    results.push({ label: "FAR کے مطابق زیادہ سے زیادہ منزلیں", value: `${fmt(maxFloors)}` });
  }
  results.push({ label: "فیصلہ", value: verdict });
  return {
    results,
    steps,
    blocks: [{ type: "table", caption: "ضوابط سے موازنہ", head: ["اشاریہ", "قدر", "اجازت شدہ حد", "فیصلہ"], rows }],
    copy: `کوریج ${fmt(cov, 4)}%، FAR = ${fmt(far, 4)}، کھلا رقبہ ${fmt(open, 4)} m²، فیصلہ: ${verdict}`,
    values: { cov, far, open, total, covOk, farOk, maxFootprint, maxTotal, maxFloors }
  };
}
