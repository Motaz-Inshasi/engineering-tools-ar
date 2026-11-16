import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const EPS = 1e-9;

export const meta = {
  description: "محاسبه نسبت پوشش، ضریب بهره‌برداری (FAR) و فضای باز یک قطعه زمین، بررسی ضوابط ساختمانی، و محاسبه حداکثر سطح تصویر، حداکثر مساحت کل و حداکثر تعداد طبقات مجاز.",
  keywords: ["نسبت پوشش", "ضریب بهره‌برداری", "FAR", "coverage", "ضوابط ساختمانی", "فضای باز", "طبقات"],
  formulas: [
    { label: "نسبت پوشش", tex: "C = \\frac{A_{f}}{A_{p}} \\times 100" },
    { label: "ضریب بهره‌برداری", tex: "FAR = \\frac{A_{total}}{A_{p}}" },
    { label: "مساحت کل ساختمان", tex: "A_{total} = A_{f} \\times N" }
  ],
  inputs: [
    { id: "plot", label: "مساحت قطعه", unit: "m²", type: "number", default: "500" },
    { id: "footprint", label: "مساحت طبقه همکف (سطح تصویر)", unit: "m²", type: "number", default: "300" },
    { id: "mode", label: "روش محاسبه مساحت کل", type: "select", default: "floors", options: [["floors", "تعداد طبقات"], ["area", "مساحت کل"]] },
    { id: "floors", label: "تعداد طبقات", type: "number", default: "4", when: { mode: ["floors"] }, help: "فرض می‌شود همه طبقات مساحتی برابر سطح تصویر دارند." },
    { id: "totalArea", label: "مساحت کل ساختمان", unit: "m²", type: "number", when: { mode: ["area"] } },
    { id: "maxCov", label: "حداکثر نسبت پوشش مجاز", unit: "%", type: "number", help: "اختیاری." },
    { id: "maxFar", label: "حداکثر ضریب بهره‌برداری مجاز", type: "number", help: "اختیاری." }
  ],
  example: { values: { plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "60", maxFar: "2.5" }, expect: ["60%", "2.4"], note: "مثال: قطعه 500 m²، سطح تصویر 300 m² و 4 طبقه." },
  invalid: { values: { plot: "500", footprint: "600", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "" } },
  related: ["polygon-area", "stair-design"]
};

export function solve(input) {
  const P = num(input, "plot", "مساحت قطعه", { positive: true });
  const F = num(input, "footprint", "مساحت طبقه همکف", { positive: true });
  if (F > P) fail("مساحت سطح تصویر نمی‌تواند از مساحت قطعه بیشتر باشد.", "footprint");
  const mode = choice(input, "mode", "روش محاسبه", ["floors", "area"], "floors");
  let total, floors = null;
  if (mode === "floors") {
    floors = num(input, "floors", "تعداد طبقات", { integer: true, min: 1, max: 200 });
    total = F * floors;
  } else {
    total = num(input, "totalArea", "مساحت کل ساختمان", { positive: true });
  }
  const maxCov = num(input, "maxCov", "حداکثر نسبت پوشش مجاز", { positive: true, max: 100, optional: true });
  const maxFar = num(input, "maxFar", "حداکثر ضریب بهره‌برداری مجاز", { positive: true, optional: true });
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
  if (!covOk) issues.push(`پوشش از حد مجاز فراتر رفته به میزان ${fmt(cov - maxCov, 4)}%`);
  if (!farOk) issues.push(`ضریب بهره‌برداری از حد مجاز فراتر رفته به میزان ${fmt(far - maxFar, 4)}`);
  const verdict = issues.length === 0 ? "مطابق با ضوابط" : `غیرمطابق: ${issues.join("، ")}`;
  const judge = (ok, limit) => (limit === null ? "بدون حد" : ok ? "مطابق" : "غیرمطابق");
  const steps = [
    { text: "نسبت پوشش:", tex: `C = \\frac{${ntex(F, 6)}}{${ntex(P, 6)}} \\times 100 = ${ntex(cov, 6)}\\ \\%` },
    { text: "مساحت کل ساختمان:", tex: mode === "floors" ? `A_{total} = ${ntex(F, 6)} \\times ${ntex(floors, 6)} = ${ntex(total, 6)}\\ m^2` : `A_{total} = ${ntex(total, 6)}\\ m^2` },
    { text: "ضریب بهره‌برداری:", tex: `FAR = \\frac{${ntex(total, 6)}}{${ntex(P, 6)}} = ${ntex(far, 6)}` },
    { text: "فضای باز:", tex: `A_{open} = ${ntex(P, 6)} - ${ntex(F, 6)} = ${ntex(open, 6)}\\ m^2` }
  ];
  const rows = [
    ["نسبت پوشش", `${fmt(cov, 4)}%`, maxCov === null ? "بدون حد" : `≤ ${fmt(maxCov)}%`, judge(covOk, maxCov)],
    ["ضریب بهره‌برداری (FAR)", fmt(far, 4), maxFar === null ? "بدون حد" : `≤ ${fmt(maxFar)}`, judge(farOk, maxFar)]
  ];
  const results = [
    { label: "نسبت پوشش", value: `${fmt(cov, 4)}%`, text: `پوشش ${fmt(cov, 4)}%` },
    { label: "مساحت کل ساختمان", value: `${fmt(total, 6)} m²` },
    { label: "ضریب بهره‌برداری (FAR)", value: fmt(far, 4), text: `FAR = ${fmt(far, 4)}` },
    { label: "فضای باز", value: `${fmt(open, 4)} m² (${fmt(openPct, 4)}%)` }
  ];
  if (maxFootprint !== null) results.push({ label: "حداکثر سطح تصویر مجاز", value: `${fmt(maxFootprint, 6)} m²` });
  if (maxTotal !== null) {
    results.push({ label: "حداکثر مساحت کل مجاز", value: `${fmt(maxTotal, 6)} m²` });
    results.push({ label: "حداکثر تعداد طبقات بر اساس FAR", value: `${fmt(maxFloors)}` });
  }
  results.push({ label: "حکم", value: verdict });
  return {
    results,
    steps,
    blocks: [{ type: "table", caption: "مقایسه با ضوابط", head: ["شاخص", "مقدار", "حد مجاز", "حکم"], rows }],
    copy: `پوشش ${fmt(cov, 4)}%، FAR = ${fmt(far, 4)}، فضای باز ${fmt(open, 4)} m²، حکم: ${verdict}`,
    values: { cov, far, open, total, covOk, farOk, maxFootprint, maxTotal, maxFloors }
  };
}
