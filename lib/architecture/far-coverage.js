import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const EPS = 1e-9;

export const meta = {
  description: "احسب نسبة التغطية ومعامل الاستغلال FAR والمساحة المفتوحة لقطعة أرض، وتحقق من الاشتراطات البنائية، واحسب أقصى مسقط وأقصى مساحة وأقصى عدد طوابق مسموح.",
  keywords: ["نسبة التغطية", "معامل الاستغلال", "FAR", "coverage", "اشتراطات بنائية", "مساحة مفتوحة", "طوابق"],
  formulas: [
    { label: "نسبة التغطية", tex: "C = \\frac{A_{f}}{A_{p}} \\times 100" },
    { label: "معامل الاستغلال", tex: "FAR = \\frac{A_{total}}{A_{p}}" },
    { label: "المساحة الإجمالية للبناء", tex: "A_{total} = A_{f} \\times N" }
  ],
  inputs: [
    { id: "plot", label: "مساحة القطعة", unit: "m²", type: "number", default: "500" },
    { id: "footprint", label: "مساحة الدور الأرضي (المسقط)", unit: "m²", type: "number", default: "300" },
    { id: "mode", label: "طريقة حساب المساحة الإجمالية", type: "select", default: "floors", options: [["floors", "عدد الطوابق"], ["area", "المساحة الإجمالية"]] },
    { id: "floors", label: "عدد الطوابق", type: "number", default: "4", when: { mode: ["floors"] }, help: "يُفترض أن كل الطوابق بمساحة المسقط نفسها." },
    { id: "totalArea", label: "المساحة الإجمالية للبناء", unit: "m²", type: "number", when: { mode: ["area"] } },
    { id: "maxCov", label: "نسبة التغطية المسموحة", unit: "%", type: "number", help: "اختياري." },
    { id: "maxFar", label: "معامل الاستغلال المسموح", type: "number", help: "اختياري." }
  ],
  example: { values: { plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "60", maxFar: "2.5" }, expect: ["60%", "2.4"], note: "مثال: قطعة 500 م² ومسقط 300 م² و4 طوابق." },
  invalid: { values: { plot: "500", footprint: "600", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "" } },
  related: ["polygon-area", "stair-design"]
};

export function solve(input) {
  const P = num(input, "plot", "مساحة القطعة", { positive: true });
  const F = num(input, "footprint", "مساحة الدور الأرضي", { positive: true });
  if (F > P) fail("مساحة المسقط لا يمكن أن تتجاوز مساحة القطعة.", "footprint");
  const mode = choice(input, "mode", "طريقة الحساب", ["floors", "area"], "floors");
  let total, floors = null;
  if (mode === "floors") {
    floors = num(input, "floors", "عدد الطوابق", { integer: true, min: 1, max: 200 });
    total = F * floors;
  } else {
    total = num(input, "totalArea", "المساحة الإجمالية للبناء", { positive: true });
  }
  const maxCov = num(input, "maxCov", "نسبة التغطية المسموحة", { positive: true, max: 100, optional: true });
  const maxFar = num(input, "maxFar", "معامل الاستغلال المسموح", { positive: true, optional: true });
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
  if (!covOk) issues.push(`التغطية تتجاوز الحد بمقدار ${fmt(cov - maxCov, 4)}%`);
  if (!farOk) issues.push(`معامل الاستغلال يتجاوز الحد بمقدار ${fmt(far - maxFar, 4)}`);
  const verdict = issues.length === 0 ? "مطابق للاشتراطات" : `غير مطابق: ${issues.join("، ")}`;
  const judge = (ok, limit) => (limit === null ? "بدون حد" : ok ? "مطابق" : "غير مطابق");
  const steps = [
    { text: "نسبة التغطية:", tex: `C = \\frac{${ntex(F, 6)}}{${ntex(P, 6)}} \\times 100 = ${ntex(cov, 6)}\\ \\%` },
    { text: "المساحة الإجمالية للبناء:", tex: mode === "floors" ? `A_{total} = ${ntex(F, 6)} \\times ${ntex(floors, 6)} = ${ntex(total, 6)}\\ m^2` : `A_{total} = ${ntex(total, 6)}\\ m^2` },
    { text: "معامل الاستغلال:", tex: `FAR = \\frac{${ntex(total, 6)}}{${ntex(P, 6)}} = ${ntex(far, 6)}` },
    { text: "المساحة المفتوحة:", tex: `A_{open} = ${ntex(P, 6)} - ${ntex(F, 6)} = ${ntex(open, 6)}\\ m^2` }
  ];
  const rows = [
    ["نسبة التغطية", `${fmt(cov, 4)}%`, maxCov === null ? "بدون حد" : `≤ ${fmt(maxCov)}%`, judge(covOk, maxCov)],
    ["معامل الاستغلال FAR", fmt(far, 4), maxFar === null ? "بدون حد" : `≤ ${fmt(maxFar)}`, judge(farOk, maxFar)]
  ];
  const results = [
    { label: "نسبة التغطية", value: `${fmt(cov, 4)}%`, text: `التغطية ${fmt(cov, 4)}%` },
    { label: "المساحة الإجمالية للبناء", value: `${fmt(total, 6)} m²` },
    { label: "معامل الاستغلال FAR", value: fmt(far, 4), text: `FAR = ${fmt(far, 4)}` },
    { label: "المساحة المفتوحة", value: `${fmt(open, 4)} m² (${fmt(openPct, 4)}%)` }
  ];
  if (maxFootprint !== null) results.push({ label: "أقصى مسقط مسموح", value: `${fmt(maxFootprint, 6)} m²` });
  if (maxTotal !== null) {
    results.push({ label: "أقصى مساحة إجمالية مسموحة", value: `${fmt(maxTotal, 6)} m²` });
    results.push({ label: "أقصى عدد طوابق وفق FAR", value: `${fmt(maxFloors)}` });
  }
  results.push({ label: "الحكم", value: verdict });
  return {
    results,
    steps,
    blocks: [{ type: "table", caption: "مقارنة بالاشتراطات", head: ["المؤشر", "القيمة", "الحد المسموح", "الحكم"], rows }],
    copy: `التغطية ${fmt(cov, 4)}%، FAR = ${fmt(far, 4)}، المساحة المفتوحة ${fmt(open, 4)} m²، الحكم: ${verdict}`,
    values: { cov, far, open, total, covOk, farOk, maxFootprint, maxTotal, maxFloors }
  };
}
