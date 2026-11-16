import { choice, fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, parseNumber, tex as ntex } from "../core/format.js";

const LETTERS = {
  "4": { "A": 4, "A-": 3.7, "B+": 3.3, "B": 3, "B-": 2.7, "C+": 2.3, "C": 2, "C-": 1.7, "D+": 1.3, "D": 1, "D-": 0.7, "F": 0 },
  "5": { "A+": 5, "A": 4.75, "B+": 4.5, "B": 4, "C+": 3.5, "C": 3, "D+": 2.5, "D": 2, "F": 1 },
  "100": null
};
const MAX = { "4": 4, "5": 5, "100": 100 };
const SCALE_LABEL = { "4": "4 points", "5": "5 points", "100": "sur 100" };

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
    if (parts.length < 3) fail(`Ligne ${ln} : écrivez le cours sous la forme : nom du cours, nombre de crédits, note.`, "courses");
    const name = parts.slice(0, -2).join(", ");
    if (name === "") fail(`Ligne ${ln} : le nom du cours est vide.`, "courses");
    const credits = parseNumber(parts[parts.length - 2]);
    if (!Number.isFinite(credits) || !(credits > 0)) fail(`Ligne ${ln} : le nombre de crédits doit être un nombre supérieur à zéro.`, "courses");
    const raw = parts[parts.length - 1];
    const points = gradePoints(raw, scale);
    if (points === null) fail(`Ligne ${ln} : la note «${raw}» n'est pas reconnue sur l'échelle ${SCALE_LABEL[scale]}.`, "courses");
    rows.push({ name, credits, raw, points });
  });
  if (rows.length === 0) fail("Saisissez au moins un cours.", "courses");
  return rows;
}

export const meta = {
  description: "Calculez la moyenne semestrielle et la moyenne cumulative des cours à partir des crédits et des notes, avec prise en charge de l'échelle sur 4 points, de l'échelle sur 5 points et des pourcentages sur 100, ainsi qu'un tableau détaillé.",
  keywords: ["moyenne", "GPA", "moyenne semestrielle", "moyenne cumulative", "crédits", "points", "échelle sur 4 points", "échelle sur 5 points"],
  formulas: [
    { label: "Moyenne semestrielle", tex: "GPA = \\frac{\\sum c_i\\,p_i}{\\sum c_i}" },
    { label: "Moyenne cumulative", tex: "GPA_{cum} = \\frac{GPA_{old}\\,C_{old} + \\sum c_i\\,p_i}{C_{old} + \\sum c_i}" }
  ],
  inputs: [
    { id: "courses", label: "Cours", type: "textarea", rows: 6, placeholder: "Mathématiques, 3, A\nPhysique, 4, B+", help: "Un cours par ligne : nom du cours, nombre de crédits, note. Séparez les champs par une virgule (ou la virgule arabe ،) ou par une tabulation." },
    { id: "scale", label: "Échelle", type: "select", default: "4", options: [["4", "Échelle sur 4 points (A = 4)"], ["5", "Échelle sur 5 points (A+ = 5, courante en Arabie saoudite)"], ["100", "Pourcentage sur 100"]], help: "Lettres ou chiffres : sur l'échelle de 4, les valeurs vont de 0 à 4 ; sur l'échelle de 5, de 0 à 5 ; en pourcentage, de 0 à 100." },
    { id: "prevGpa", label: "Moyenne cumulative précédente", type: "number", help: "Facultatif. Laissez vide si vous ne souhaitez pas calculer la moyenne cumulative." },
    { id: "prevCredits", label: "Crédits précédents", type: "number", help: "Facultatif, utilisé avec la moyenne cumulative précédente." }
  ],
  example: { values: { courses: "Math, 3, A\nPhysics, 4, B+", scale: "4", prevGpa: "", prevCredits: "" }, expect: ["Moyenne semestrielle 3.6", "3.6"], note: "Exemple : deux cours sur l'échelle de 4 points, (3×4 + 4×3.3) ÷ 7 = 3.6." },
  invalid: { values: { courses: "Math, 3, Z\nPhysics, 4, B", scale: "4", prevGpa: "", prevCredits: "" } },
  related: ["final-grade", "study-planner", "word-counter", "citation-generator"]
};

export function solve(input) {
  const scale = choice(input, "scale", "Échelle", ["4", "5", "100"], "4");
  const rows = parseCourses(str(input, "courses", "Cours"), scale);
  const prevGpa = num(input, "prevGpa", "Moyenne cumulative précédente", { optional: true, nonNegative: true, max: MAX[scale] });
  const prevCredits = num(input, "prevCredits", "Crédits précédents", { optional: true, nonNegative: true });
  if (prevGpa !== null && prevCredits === null) fail("Saisissez les crédits précédents avec la moyenne cumulative.", "prevCredits");
  if (prevCredits !== null && prevGpa === null) fail("Saisissez la moyenne cumulative précédente avec le nombre de crédits.", "prevGpa");
  const credits = rows.reduce((s, r) => s + r.credits, 0);
  const qp = rows.reduce((s, r) => s + r.credits * r.points, 0);
  const gpa = qp / credits;
  const hasCum = prevGpa !== null && prevCredits !== null;
  const cum = hasCum ? (prevGpa * prevCredits + qp) / (prevCredits + credits) : null;
  const suffix = scale === "100" ? "%" : "";
  const steps = [
    { text: "Total des crédits :", tex: `\\sum c_i = ${ntex(credits, 6)}` },
    { text: "Total des points pondérés (crédits × points) :", tex: `\\sum c_i p_i = ${ntex(qp, 6)}` },
    { text: "Moyenne semestrielle :", tex: `GPA = \\frac{${ntex(qp, 6)}}{${ntex(credits, 6)}} = ${ntex(gpa, 4)}` }
  ];
  if (hasCum) steps.push({ text: "Moyenne cumulative :", tex: `GPA_{cum} = \\frac{${ntex(prevGpa, 6)} \\times ${ntex(prevCredits, 6)} + ${ntex(qp, 6)}}{${ntex(prevCredits, 6)} + ${ntex(credits, 6)}} = ${ntex(cum, 4)}` });
  const results = [
    { label: "Moyenne semestrielle", value: `${fmt(gpa, 4)}${suffix}`, text: `Moyenne semestrielle ${fmt(gpa, 4)}${suffix}` },
    { label: "Total des crédits", value: fmt(credits) },
    { label: "Total des points pondérés", value: fmt(qp, 4) }
  ];
  if (hasCum) {
    results.push({ label: "Moyenne cumulative", value: `${fmt(cum, 4)}${suffix}`, text: `Moyenne cumulative ${fmt(cum, 4)}${suffix}` });
    results.push({ label: "Total cumulé des crédits", value: fmt(prevCredits + credits) });
  }
  const head = ["#", "Cours", "Crédits", "Note", "Points", "Crédits × points"];
  const table = { type: "table", caption: "Détail des cours", head, rows: rows.map((r, i) => [String(i + 1), r.name, fmt(r.credits), r.raw, fmt(r.points, 3), fmt(r.credits * r.points, 4)]) };
  let copy = `Moyenne semestrielle ${fmt(gpa, 4)}${suffix}, crédits ${fmt(credits)}, points pondérés ${fmt(qp, 4)}`;
  if (hasCum) copy += `, moyenne cumulative ${fmt(cum, 4)}${suffix}`;
  return {
    results,
    steps,
    blocks: [table],
    copy,
    values: { gpa, credits, qp, cum }
  };
}
