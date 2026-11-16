import { choice, fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, parseNumber, tex as ntex } from "../core/format.js";

const LETTERS = {
  "4": { "A": 4, "A-": 3.7, "B+": 3.3, "B": 3, "B-": 2.7, "C+": 2.3, "C": 2, "C-": 1.7, "D+": 1.3, "D": 1, "D-": 0.7, "F": 0 },
  "5": { "A+": 5, "A": 4.75, "B+": 4.5, "B": 4, "C+": 3.5, "C": 3, "D+": 2.5, "D": 2, "F": 1 },
  "100": null
};
const MAX = { "4": 4, "5": 5, "100": 100 };
const SCALE_LABEL = { "4": "4 points", "5": "5 points", "100": "out of 100" };

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
    if (parts.length < 3) fail(`Line ${ln}: write the course in the form: course name, credit hours, grade.`, "courses");
    const name = parts.slice(0, -2).join(", ");
    if (name === "") fail(`Line ${ln}: the course name is empty.`, "courses");
    const credits = parseNumber(parts[parts.length - 2]);
    if (!Number.isFinite(credits) || !(credits > 0)) fail(`Line ${ln}: the number of credit hours must be a number greater than zero.`, "courses");
    const raw = parts[parts.length - 1];
    const points = gradePoints(raw, scale);
    if (points === null) fail(`Line ${ln}: the grade “${raw}” is not recognized on the ${SCALE_LABEL[scale]} scale.`, "courses");
    rows.push({ name, credits, raw, points });
  });
  if (rows.length === 0) fail("Enter at least one course.", "courses");
  return rows;
}

export const meta = {
  description: "Calculate the semester average and the cumulative average from course credit hours and grades, supporting the 4-point scale, the 5-point scale and percentages out of 100, with a detailed table.",
  keywords: ["average", "GPA", "semester average", "cumulative average", "credit hours", "points", "4-point scale", "5-point scale"],
  formulas: [
    { label: "Semester average", tex: "GPA = \\frac{\\sum c_i\\,p_i}{\\sum c_i}" },
    { label: "Cumulative average", tex: "GPA_{cum} = \\frac{GPA_{old}\\,C_{old} + \\sum c_i\\,p_i}{C_{old} + \\sum c_i}" }
  ],
  inputs: [
    { id: "courses", label: "Courses", type: "textarea", rows: 6, placeholder: "Math, 3, A\nPhysics, 4, B+", help: "One course per line: course name, credit hours, grade. Separate fields with a comma, an Arabic comma or a tab." },
    { id: "scale", label: "Scale", type: "select", default: "4", options: [["4", "4-point scale (A = 4)"], ["5", "5-point scale (A+ = 5, common in Saudi Arabia)"], ["100", "Percentage out of 100"]], help: "Letters or numbers: on the 4-point scale the values range from 0 to 4, on the 5-point scale from 0 to 5, and in percentages from 0 to 100." },
    { id: "prevGpa", label: "Previous cumulative average", type: "number", help: "Optional. Leave empty if you do not want to calculate the cumulative average." },
    { id: "prevCredits", label: "Previous credit hours", type: "number", help: "Optional, used with the previous cumulative average." }
  ],
  example: { values: { courses: "Math, 3, A\nPhysics, 4, B+", scale: "4", prevGpa: "", prevCredits: "" }, expect: ["Semester average 3.6", "3.6"], note: "Example: two courses on the 4-point scale, (3×4 + 4×3.3) ÷ 7 = 3.6." },
  invalid: { values: { courses: "Math, 3, Z\nPhysics, 4, B", scale: "4", prevGpa: "", prevCredits: "" } },
  related: ["final-grade", "study-planner", "word-counter", "citation-generator"]
};

export function solve(input) {
  const scale = choice(input, "scale", "Scale", ["4", "5", "100"], "4");
  const rows = parseCourses(str(input, "courses", "Courses"), scale);
  const prevGpa = num(input, "prevGpa", "Previous cumulative average", { optional: true, nonNegative: true, max: MAX[scale] });
  const prevCredits = num(input, "prevCredits", "Previous credit hours", { optional: true, nonNegative: true });
  if (prevGpa !== null && prevCredits === null) fail("Enter the previous credit hours along with the cumulative average.", "prevCredits");
  if (prevCredits !== null && prevGpa === null) fail("Enter the previous cumulative average along with the credit hours.", "prevGpa");
  const credits = rows.reduce((s, r) => s + r.credits, 0);
  const qp = rows.reduce((s, r) => s + r.credits * r.points, 0);
  const gpa = qp / credits;
  const hasCum = prevGpa !== null && prevCredits !== null;
  const cum = hasCum ? (prevGpa * prevCredits + qp) / (prevCredits + credits) : null;
  const suffix = scale === "100" ? "%" : "";
  const steps = [
    { text: "Total credit hours:", tex: `\\sum c_i = ${ntex(credits, 6)}` },
    { text: "Total weighted points (hours × points):", tex: `\\sum c_i p_i = ${ntex(qp, 6)}` },
    { text: "Semester average:", tex: `GPA = \\frac{${ntex(qp, 6)}}{${ntex(credits, 6)}} = ${ntex(gpa, 4)}` }
  ];
  if (hasCum) steps.push({ text: "Cumulative average:", tex: `GPA_{cum} = \\frac{${ntex(prevGpa, 6)} \\times ${ntex(prevCredits, 6)} + ${ntex(qp, 6)}}{${ntex(prevCredits, 6)} + ${ntex(credits, 6)}} = ${ntex(cum, 4)}` });
  const results = [
    { label: "Semester average", value: `${fmt(gpa, 4)}${suffix}`, text: `Semester average ${fmt(gpa, 4)}${suffix}` },
    { label: "Total credit hours", value: fmt(credits) },
    { label: "Total weighted points", value: fmt(qp, 4) }
  ];
  if (hasCum) {
    results.push({ label: "Cumulative average", value: `${fmt(cum, 4)}${suffix}`, text: `Cumulative average ${fmt(cum, 4)}${suffix}` });
    results.push({ label: "Total cumulative credit hours", value: fmt(prevCredits + credits) });
  }
  const head = ["#", "Course", "Hours", "Grade", "Points", "Hours × points"];
  const table = { type: "table", caption: "Course details", head, rows: rows.map((r, i) => [String(i + 1), r.name, fmt(r.credits), r.raw, fmt(r.points, 3), fmt(r.credits * r.points, 4)]) };
  let copy = `Semester average ${fmt(gpa, 4)}${suffix}, hours ${fmt(credits)}, weighted points ${fmt(qp, 4)}`;
  if (hasCum) copy += `, cumulative average ${fmt(cum, 4)}${suffix}`;
  return {
    results,
    steps,
    blocks: [table],
    copy,
    values: { gpa, credits, qp, cum }
  };
}
