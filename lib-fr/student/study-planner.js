import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DAY = 86400000;
const DAYS_AR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const dayWord = (n) => (n === 0 ? "Aucun" : n === 1 ? "1 jour" : n === 2 ? "2 jours" : n <= 10 ? `${n} jours` : `${n} jours`);
const hourWord = (h) => (h === 1 ? "1 heure" : h === 2 ? "2 heures" : Number.isInteger(h) && h >= 3 && h <= 10 ? `${h} heures` : `${fmt(h)} heures`);

function parseDate(raw, key, label) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) fail(`${label} doit être au format YYYY-MM-DD.`, key);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail(`${label} n'est pas une date valide.`, key);
  return t;
}

function isoDate(t) {
  return new Date(t).toISOString().slice(0, 10);
}

export const meta = {
  description: "Planifiez vos révisions jusqu'à la date de l'examen : calculez les jours disponibles, le nombre de sujets par jour et le total d'heures d'étude, avec un tableau quotidien incluant les jours de repos et la révision générale.",
  keywords: ["plan de révision", "planning d'étude", "date de l'examen", "révision", "study planner", "jours de repos"],
  formulas: [
    { label: "Nombre de sujets par jour d'étude", tex: "\\frac{N_{topics}}{N_{study} - N_{review}}" },
    { label: "Total d'heures d'étude", tex: "H = N_{study} \\times h" }
  ],
  inputs: [
    { id: "examDate", label: "Date de l'examen", type: "text", default: "2026-01-11", placeholder: "YYYY-MM-DD", help: "Au format YYYY-MM-DD, par exemple 2026-06-15." },
    { id: "startDate", label: "Date de début des révisions", type: "text", default: "2026-01-01", placeholder: "YYYY-MM-DD", help: "Laissez vide pour utiliser la date du jour." },
    { id: "topics", label: "Nombre de sujets ou de chapitres", type: "number", default: "8" },
    { id: "hours", label: "Heures d'étude par jour", unit: "h", type: "number", default: "2" },
    { id: "restDays", label: "Jours de repos par semaine", type: "number", default: "1", help: "De 0 à 6, répartis également sur les jours de la semaine." },
    { id: "revisionDays", label: "Jours de révision générale avant l'examen", type: "number", default: "2" }
  ],
  example: { values: { examDate: "2026-01-11", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" }, expect: ["Jours restants : 10", "1.333"], note: "Exemple : 10 jours avant l'examen, un jour de repos par semaine et deux jours de révision." },
  invalid: { values: { examDate: "2026-01-01", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" } },
  related: ["gpa-calculator", "word-counter", "final-grade"]
};

export function solve(input) {
  const examRaw = str(input, "examDate", "Date de l'examen");
  const exam = parseDate(examRaw, "examDate", "Date de l'examen");
  let start;
  if (isBlank(input.startDate)) {
    const now = new Date();
    start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  } else {
    start = parseDate(str(input, "startDate", "Date de début"), "startDate", "Date de début");
  }
  if (!(exam > start)) fail("La date de l'examen doit être postérieure à la date de début.", "examDate");
  const D = Math.round((exam - start) / DAY);
  if (D > 366) fail("La durée maximale du planning est de 366 jours.", "examDate");
  const topics = num(input, "topics", "Nombre de sujets", { integer: true, min: 1, max: 200 });
  const hours = num(input, "hours", "Heures d'étude par jour", { positive: true, max: 24 });
  const rest = num(input, "restDays", "Jours de repos par semaine", { integer: true, min: 0, max: 6 });
  const rev = num(input, "revisionDays", "Jours de révision générale", { integer: true, min: 0, max: 60 });
  if (rev >= D) fail("Les jours de révision doivent être inférieurs au nombre de jours restants.", "revisionDays");
  const restSet = new Set(Array.from({ length: rest }, (_, i) => (12 - Math.floor((i * 7) / rest)) % 7));
  const days = [];
  for (let k = 0; k < D; k++) {
    const t = start + k * DAY;
    const dow = new Date(t).getUTCDay();
    days.push({ t, dow, kind: restSet.has(dow) ? "rest" : "study", plan: "" });
  }
  for (let k = D - 1, left = rev; k >= 0 && left > 0; k--) {
    if (days[k].kind === "study") { days[k].kind = "review"; left--; }
  }
  const restCount = days.filter((d) => d.kind === "rest").length;
  const studyDays = D - restCount;
  const reviewCount = days.filter((d) => d.kind === "review").length;
  const L = studyDays - reviewCount;
  if (L < 1) fail("Pas assez de jours d'étude pour répartir les sujets ; réduisez les jours de repos ou de révision, ou augmentez la période entre le début et l'examen.", "restDays");
  let li = 0;
  for (const d of days) {
    if (d.kind === "rest") d.plan = "Repos";
    else if (d.kind === "review") d.plan = "Révision générale";
    else {
      const a = Math.floor((li * topics) / L) + 1;
      const b = Math.floor(((li + 1) * topics) / L);
      d.plan = b < a ? "Pratique et révision légère" : a === b ? `Sujet ${a}` : `Sujets ${a}–${b}`;
      li++;
    }
  }
  const perDay = topics / L;
  const totalHours = studyDays * hours;
  const rows = days.map((d) => [isoDate(d.t), DAYS_AR[d.dow], d.plan]);
  rows.push([isoDate(exam), DAYS_AR[new Date(exam).getUTCDay()], "Jour de l'examen"]);
  const steps = [
    { text: "Jours restants entre le début et l'examen :", tex: `D = \\frac{${isoDate(exam)} - ${isoDate(start)}}{1\\ day} = ${ntex(D, 6)}` },
    { text: "Jours de repos et d'étude :", tex: `N_{rest} = ${ntex(restCount, 6)},\\quad N_{study} = D - N_{rest} = ${ntex(studyDays, 6)}` },
    { text: "Jours de sujets (hors révision générale) :", tex: `L = N_{study} - N_{review} = ${ntex(studyDays, 6)} - ${ntex(reviewCount, 6)} = ${ntex(L, 6)}` },
    { text: "Sujets par jour d'étude :", tex: `\\frac{${ntex(topics, 6)}}{${ntex(L, 6)}} = ${ntex(perDay, 4)}` },
    { text: "Total d'heures d'étude :", tex: `H = ${ntex(studyDays, 6)} \\times ${ntex(hours, 6)} = ${ntex(totalHours, 6)}\\ h` }
  ];
  return {
    results: [
      { label: "Jours restants", value: dayWord(D), text: `Jours restants : ${fmt(D)}` },
      { label: "Jours d'étude disponibles (révision incluse)", value: dayWord(studyDays) },
      { label: "Jours de révision générale", value: dayWord(reviewCount) },
      { label: "jours de repos", value: dayWord(restCount) },
      { label: "Sujets par jour d'étude", value: fmt(perDay, 4), text: `Sujets par jour : ${fmt(perDay, 4)}` },
      { label: "Total d'heures d'étude", value: hourWord(totalHours), text: `Total des heures : ${fmt(totalHours)}` }
    ],
    steps,
    blocks: [{ type: "table", caption: "Planning quotidien", head: ["Date", "Jour", "Plan"], rows }],
    copy: `Jours restants : ${fmt(D)}, jours d'étude : ${fmt(studyDays)}, sujets par jour : ${fmt(perDay, 4)}, total des heures : ${fmt(totalHours)}`,
    values: { D, studyDays, reviewCount, L, perDay, totalHours, restCount }
  };
}
