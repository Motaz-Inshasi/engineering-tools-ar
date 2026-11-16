import { choice, fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, parseNumber, tex as ntex } from "../core/format.js";

const LETTERS = {
  "4": { "A": 4, "A-": 3.7, "B+": 3.3, "B": 3, "B-": 2.7, "C+": 2.3, "C": 2, "C-": 1.7, "D+": 1.3, "D": 1, "D-": 0.7, "F": 0 },
  "5": { "A+": 5, "A": 4.75, "B+": 4.5, "B": 4, "C+": 3.5, "C": 3, "D+": 2.5, "D": 2, "F": 1 },
  "100": null
};
const MAX = { "4": 4, "5": 5, "100": 100 };
const SCALE_LABEL = { "4": "4 puntos", "5": "5 puntos", "100": "sobre 100" };

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
    if (parts.length < 3) fail(`Línea ${ln}: escriba la asignatura con el formato: nombre de la asignatura, horas de crédito, nota.`, "courses");
    const name = parts.slice(0, -2).join(", ");
    if (name === "") fail(`Línea ${ln}: el nombre de la asignatura está vacío.`, "courses");
    const credits = parseNumber(parts[parts.length - 2]);
    if (!Number.isFinite(credits) || !(credits > 0)) fail(`Línea ${ln}: las horas de crédito deben ser un número mayor que cero.`, "courses");
    const raw = parts[parts.length - 1];
    const points = gradePoints(raw, scale);
    if (points === null) fail(`Línea ${ln}: la nota «${raw}» no se reconoce en la escala de ${SCALE_LABEL[scale]}.`, "courses");
    rows.push({ name, credits, raw, points });
  });
  if (rows.length === 0) fail("Introduzca al menos una asignatura.", "courses");
  return rows;
}

export const meta = {
  description: "Calcule el promedio del semestre y el promedio acumulado a partir de las horas de crédito y las notas de las asignaturas, con soporte para la escala de 4 puntos, la de 5 puntos y porcentajes sobre 100, y una tabla detallada.",
  keywords: ["promedio", "GPA", "promedio del semestre", "promedio acumulado", "horas de crédito", "puntos", "escala de 4", "escala de 5"],
  formulas: [
    { label: "Promedio del semestre", tex: "GPA = \\frac{\\sum c_i\\,p_i}{\\sum c_i}" },
    { label: "Promedio acumulado", tex: "GPA_{cum} = \\frac{GPA_{old}\\,C_{old} + \\sum c_i\\,p_i}{C_{old} + \\sum c_i}" }
  ],
  inputs: [
    { id: "courses", label: "Asignaturas", type: "textarea", rows: 6, placeholder: "Matemáticas, 3, A\nFísica, 4, B+", help: "Una asignatura por línea: nombre, horas de crédito y nota. Separe los campos con una coma, una coma árabe (،) o un tabulador." },
    { id: "scale", label: "Escala", type: "select", default: "4", options: [["4", "Escala de 4 puntos (A = 4)"], ["5", "Escala de 5 puntos (A+ = 5, común en Arabia Saudí)"], ["100", "Porcentaje sobre 100"]], help: "Letras o números: en la escala de 4 los valores van de 0 a 4, en la de 5 de 0 a 5, y en porcentaje de 0 a 100." },
    { id: "prevGpa", label: "Promedio acumulado anterior", type: "number", help: "Opcional. Déjelo vacío si no desea calcular el acumulado." },
    { id: "prevCredits", label: "Horas de crédito anteriores", type: "number", help: "Opcional, se usa junto con el promedio acumulado anterior." }
  ],
  example: { values: { courses: "Math, 3, A\nPhysics, 4, B+", scale: "4", prevGpa: "", prevCredits: "" }, expect: ["Promedio del semestre 3.6", "3.6"], note: "Ejemplo: dos asignaturas en escala de 4 puntos, (3×4 + 4×3.3) ÷ 7 = 3.6." },
  invalid: { values: { courses: "Math, 3, Z\nPhysics, 4, B", scale: "4", prevGpa: "", prevCredits: "" } },
  related: ["final-grade", "study-planner", "word-counter", "citation-generator"]
};

export function solve(input) {
  const scale = choice(input, "scale", "Escala", ["4", "5", "100"], "4");
  const rows = parseCourses(str(input, "courses", "Asignaturas"), scale);
  const prevGpa = num(input, "prevGpa", "Promedio acumulado anterior", { optional: true, nonNegative: true, max: MAX[scale] });
  const prevCredits = num(input, "prevCredits", "Horas de crédito anteriores", { optional: true, nonNegative: true });
  if (prevGpa !== null && prevCredits === null) fail("Introduzca las horas de crédito anteriores junto con el promedio acumulado.", "prevCredits");
  if (prevCredits !== null && prevGpa === null) fail("Introduzca el promedio acumulado anterior junto con las horas de crédito.", "prevGpa");
  const credits = rows.reduce((s, r) => s + r.credits, 0);
  const qp = rows.reduce((s, r) => s + r.credits * r.points, 0);
  const gpa = qp / credits;
  const hasCum = prevGpa !== null && prevCredits !== null;
  const cum = hasCum ? (prevGpa * prevCredits + qp) / (prevCredits + credits) : null;
  const suffix = scale === "100" ? "%" : "";
  const steps = [
    { text: "Total de horas de crédito:", tex: `\\sum c_i = ${ntex(credits, 6)}` },
    { text: "Total de puntos ponderados (horas × puntos):", tex: `\\sum c_i p_i = ${ntex(qp, 6)}` },
    { text: "Promedio del semestre:", tex: `GPA = \\frac{${ntex(qp, 6)}}{${ntex(credits, 6)}} = ${ntex(gpa, 4)}` }
  ];
  if (hasCum) steps.push({ text: "Promedio acumulado:", tex: `GPA_{cum} = \\frac{${ntex(prevGpa, 6)} \\times ${ntex(prevCredits, 6)} + ${ntex(qp, 6)}}{${ntex(prevCredits, 6)} + ${ntex(credits, 6)}} = ${ntex(cum, 4)}` });
  const results = [
    { label: "Promedio del semestre", value: `${fmt(gpa, 4)}${suffix}`, text: `Promedio del semestre ${fmt(gpa, 4)}${suffix}` },
    { label: "Total de horas de crédito", value: fmt(credits) },
    { label: "Total de puntos ponderados", value: fmt(qp, 4) }
  ];
  if (hasCum) {
    results.push({ label: "Promedio acumulado", value: `${fmt(cum, 4)}${suffix}`, text: `Promedio acumulado ${fmt(cum, 4)}${suffix}` });
    results.push({ label: "Total de horas de crédito acumuladas", value: fmt(prevCredits + credits) });
  }
  const head = ["#", "Asignatura", "Horas", "Nota", "Puntos", "Horas × puntos"];
  const table = { type: "table", caption: "Detalle de las asignaturas", head, rows: rows.map((r, i) => [String(i + 1), r.name, fmt(r.credits), r.raw, fmt(r.points, 3), fmt(r.credits * r.points, 4)]) };
  let copy = `Promedio del semestre ${fmt(gpa, 4)}${suffix}, horas ${fmt(credits)}, puntos ponderados ${fmt(qp, 4)}`;
  if (hasCum) copy += `, promedio acumulado ${fmt(cum, 4)}${suffix}`;
  return {
    results,
    steps,
    blocks: [table],
    copy,
    values: { gpa, credits, qp, cum }
  };
}
