import { choice, fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, parseNumber, tex as ntex } from "../core/format.js";

const LETTERS = {
  "4": { "A": 4, "A-": 3.7, "B+": 3.3, "B": 3, "B-": 2.7, "C+": 2.3, "C": 2, "C-": 1.7, "D+": 1.3, "D": 1, "D-": 0.7, "F": 0 },
  "5": { "A+": 5, "A": 4.75, "B+": 4.5, "B": 4, "C+": 3.5, "C": 3, "D+": 2.5, "D": 2, "F": 1 },
  "100": null
};
const MAX = { "4": 4, "5": 5, "100": 100 };
const SCALE_LABEL = { "4": "4 نقاط", "5": "5 نقاط", "100": "من 100" };

function gradePoints(raw, scale) {
  const g = raw.trim().toUpperCase();
  if (scale !== "100" && Object.prototype.hasOwnProperty.call(LETTERS[scale], g)) return LETTERS[scale][g];
  const v = parseNumber(g);
  if (!Number.isNaN(v) && v >= 0 && v <= MAX[scale]) return v;
  return null;
}

function parseCourses(text, scale) {
  const rows = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.trim() === "") return;
    const ln = i + 1;
    const parts = line.split(/[,،\t]/).map((p) => p.trim());
    if (parts.length < 3) fail(`السطر ${ln}: اكتب المقرر بالصيغة: اسم المقرر، عدد الساعات، الدرجة.`, "courses");
    const name = parts.slice(0, -2).join(", ");
    if (name === "") fail(`السطر ${ln}: اسم المقرر فارغ.`, "courses");
    const credits = parseNumber(parts[parts.length - 2]);
    if (!Number.isFinite(credits) || !(credits > 0)) fail(`السطر ${ln}: عدد الساعات يجب أن يكون رقماً أكبر من صفر.`, "courses");
    const raw = parts[parts.length - 1];
    const points = gradePoints(raw, scale);
    if (points === null) fail(`السطر ${ln}: الدرجة «${raw}» غير معروفة في مقياس ${SCALE_LABEL[scale]}.`, "courses");
    rows.push({ name, credits, raw, points });
  });
  if (rows.length === 0) fail("أدخل مقرراً واحداً على الأقل.", "courses");
  return rows;
}

export const meta = {
  description: "احسب المعدل الفصلي والمعدل التراكمي للمقررات من الساعات والدرجات، مع دعم مقياس 4 نقاط ومقياس 5 نقاط ونسبة مئوية من 100 وجدول تفصيلي.",
  keywords: ["معدل", "GPA", "معدل فصلي", "معدل تراكمي", "ساعات معتمدة", "نقاط", "مقياس 4", "مقياس 5"],
  formulas: [
    { label: "المعدل الفصلي", tex: "GPA = \\frac{\\sum c_i\\,p_i}{\\sum c_i}" },
    { label: "المعدل التراكمي", tex: "GPA_{cum} = \\frac{GPA_{old}\\,C_{old} + \\sum c_i\\,p_i}{C_{old} + \\sum c_i}" }
  ],
  inputs: [
    { id: "courses", label: "المقررات", type: "textarea", rows: 6, placeholder: "الرياضيات، 3، A\nالفيزياء، 4، B+", help: "مقرر في كل سطر: اسم المقرر، عدد الساعات، الدرجة. افصل بفاصلة أو فاصلة عربية أو tab." },
    { id: "scale", label: "المقياس", type: "select", default: "4", options: [["4", "مقياس 4 نقاط (A = 4)"], ["5", "مقياس 5 نقاط (A+ = 5، الشائع في السعودية)"], ["100", "نسبة مئوية من 100"]], help: "الحروف أو الأرقام: في مقياس 4 الأرقام من 0 إلى 4، وفي مقياس 5 من 0 إلى 5، وفي المئة من 0 إلى 100." },
    { id: "prevGpa", label: "المعدل التراكمي السابق", type: "number", help: "اختياري. اتركه فارغاً إن لم ترغب في حساب التراكمي." },
    { id: "prevCredits", label: "الساعات المعتمدة السابقة", type: "number", help: "اختياري، ويُستخدم مع المعدل التراكمي السابق." }
  ],
  example: { values: { courses: "Math, 3, A\nPhysics, 4, B+", scale: "4", prevGpa: "", prevCredits: "" }, expect: ["المعدل الفصلي 3.6", "3.6"], note: "مثال: مقرران بمقياس 4 نقاط، (3×4 + 4×3.3) ÷ 7 = 3.6." },
  invalid: { values: { courses: "Math, 3, Z\nPhysics, 4, B", scale: "4", prevGpa: "", prevCredits: "" } },
  related: ["final-grade", "study-planner", "word-counter", "citation-generator"]
};

export function solve(input) {
  const scale = choice(input, "scale", "المقياس", ["4", "5", "100"], "4");
  const rows = parseCourses(str(input, "courses", "المقررات"), scale);
  const prevGpa = num(input, "prevGpa", "المعدل التراكمي السابق", { optional: true, nonNegative: true, max: MAX[scale] });
  const prevCredits = num(input, "prevCredits", "الساعات المعتمدة السابقة", { optional: true, nonNegative: true });
  if (prevGpa !== null && prevCredits === null) fail("أدخل عدد الساعات المعتمدة السابقة مع المعدل التراكمي.", "prevCredits");
  if (prevCredits !== null && prevGpa === null) fail("أدخل المعدل التراكمي السابق مع عدد الساعات.", "prevGpa");
  const credits = rows.reduce((s, r) => s + r.credits, 0);
  const qp = rows.reduce((s, r) => s + r.credits * r.points, 0);
  const gpa = qp / credits;
  const hasCum = prevGpa !== null && prevCredits !== null;
  const cum = hasCum ? (prevGpa * prevCredits + qp) / (prevCredits + credits) : null;
  const suffix = scale === "100" ? "%" : "";
  const steps = [
    { text: "مجموع الساعات المعتمدة:", tex: `\\sum c_i = ${ntex(credits, 6)}` },
    { text: "مجموع النقاط الموزونة (الساعات × النقطة):", tex: `\\sum c_i p_i = ${ntex(qp, 6)}` },
    { text: "المعدل الفصلي:", tex: `GPA = \\frac{${ntex(qp, 6)}}{${ntex(credits, 6)}} = ${ntex(gpa, 4)}` }
  ];
  if (hasCum) steps.push({ text: "المعدل التراكمي:", tex: `GPA_{cum} = \\frac{${ntex(prevGpa, 6)} \\times ${ntex(prevCredits, 6)} + ${ntex(qp, 6)}}{${ntex(prevCredits, 6)} + ${ntex(credits, 6)}} = ${ntex(cum, 4)}` });
  const results = [
    { label: "المعدل الفصلي", value: `${fmt(gpa, 4)}${suffix}`, text: `المعدل الفصلي ${fmt(gpa, 4)}${suffix}` },
    { label: "مجموع الساعات المعتمدة", value: fmt(credits) },
    { label: "مجموع النقاط الموزونة", value: fmt(qp, 4) }
  ];
  if (hasCum) {
    results.push({ label: "المعدل التراكمي", value: `${fmt(cum, 4)}${suffix}`, text: `المعدل التراكمي ${fmt(cum, 4)}${suffix}` });
    results.push({ label: "إجمالي الساعات التراكمية", value: fmt(prevCredits + credits) });
  }
  const head = ["#", "المقرر", "الساعات", "الدرجة", "النقطة", "الساعات × النقطة"];
  const table = { type: "table", caption: "تفاصيل المقررات", head, rows: rows.map((r, i) => [String(i + 1), r.name, fmt(r.credits), r.raw, fmt(r.points, 3), fmt(r.credits * r.points, 4)]) };
  let copy = `المعدل الفصلي ${fmt(gpa, 4)}${suffix}، الساعات ${fmt(credits)}، النقاط الموزونة ${fmt(qp, 4)}`;
  if (hasCum) copy += `، المعدل التراكمي ${fmt(cum, 4)}${suffix}`;
  return {
    results,
    steps,
    blocks: [table],
    copy,
    values: { gpa, credits, qp, cum }
  };
}
