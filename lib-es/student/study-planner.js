import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DAY = 86400000;
const DAYS_AR = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const dayWord = (n) => (n === 0 ? "Ninguno" : n === 1 ? "1 día" : n === 2 ? "2 días" : n <= 10 ? `${n} días` : `${n} días`);
const hourWord = (h) => (h === 1 ? "1 hora" : h === 2 ? "2 horas" : Number.isInteger(h) && h >= 3 && h <= 10 ? `${h} horas` : `${fmt(h)} horas`);

function parseDate(raw, key, label) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) fail(`${label} debe tener el formato AAAA-MM-DD.`, key);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail(`${label} no es una fecha válida.`, key);
  return t;
}

function isoDate(t) {
  return new Date(t).toISOString().slice(0, 10);
}

export const meta = {
  description: "Planifique su estudio hasta la fecha del examen: calcule los días disponibles, el número de temas por día y el total de horas de estudio, con una tabla diaria que incluya días de descanso y un repaso general.",
  keywords: ["plan de estudio", "horario de estudio", "fecha del examen", "repaso", "study planner", "días de descanso"],
  formulas: [
    { label: "Número de temas por día de estudio", tex: "\\frac{N_{topics}}{N_{study} - N_{review}}" },
    { label: "Total de horas de estudio", tex: "H = N_{study} \\times h" }
  ],
  inputs: [
    { id: "examDate", label: "Fecha del examen", type: "text", default: "2026-01-11", placeholder: "YYYY-MM-DD", help: "Con el formato AAAA-MM-DD, por ejemplo 2026-06-15." },
    { id: "startDate", label: "Fecha de inicio del estudio", type: "text", default: "2026-01-01", placeholder: "YYYY-MM-DD", help: "Déjelo vacío para usar la fecha de hoy." },
    { id: "topics", label: "Número de temas o capítulos", type: "number", default: "8" },
    { id: "hours", label: "Horas de estudio al día", unit: "h", type: "number", default: "2" },
    { id: "restDays", label: "Días de descanso a la semana", type: "number", default: "1", help: "De 0 a 6, repartidos por igual entre los días de la semana." },
    { id: "revisionDays", label: "Días de repaso general antes del examen", type: "number", default: "2" }
  ],
  example: { values: { examDate: "2026-01-11", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" }, expect: ["Días restantes: 10", "1.333"], note: "Ejemplo: 10 días hasta el examen, un día de descanso a la semana y dos días de repaso." },
  invalid: { values: { examDate: "2026-01-01", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" } },
  related: ["gpa-calculator", "word-counter", "final-grade"]
};

export function solve(input) {
  const examRaw = str(input, "examDate", "Fecha del examen");
  const exam = parseDate(examRaw, "examDate", "Fecha del examen");
  let start;
  if (isBlank(input.startDate)) {
    const now = new Date();
    start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  } else {
    start = parseDate(str(input, "startDate", "Fecha de inicio"), "startDate", "Fecha de inicio");
  }
  if (!(exam > start)) fail("La fecha del examen debe ser posterior a la fecha de inicio.", "examDate");
  const D = Math.round((exam - start) / DAY);
  if (D > 366) fail("La duración máxima del horario es de 366 días.", "examDate");
  const topics = num(input, "topics", "Número de temas", { integer: true, min: 1, max: 200 });
  const hours = num(input, "hours", "Horas de estudio al día", { positive: true, max: 24 });
  const rest = num(input, "restDays", "Días de descanso a la semana", { integer: true, min: 0, max: 6 });
  const rev = num(input, "revisionDays", "Días de repaso general", { integer: true, min: 0, max: 60 });
  if (rev >= D) fail("Los días de repaso deben ser menos que los días restantes.", "revisionDays");
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
  if (L < 1) fail("No hay suficientes días de estudio para repartir los temas; reduzca los días de descanso o de repaso, o aumente el período entre el inicio y el examen.", "restDays");
  let li = 0;
  for (const d of days) {
    if (d.kind === "rest") d.plan = "Descanso";
    else if (d.kind === "review") d.plan = "Repaso general";
    else {
      const a = Math.floor((li * topics) / L) + 1;
      const b = Math.floor(((li + 1) * topics) / L);
      d.plan = b < a ? "Práctica y repaso ligero" : a === b ? `Tema ${a}` : `Temas ${a}–${b}`;
      li++;
    }
  }
  const perDay = topics / L;
  const totalHours = studyDays * hours;
  const rows = days.map((d) => [isoDate(d.t), DAYS_AR[d.dow], d.plan]);
  rows.push([isoDate(exam), DAYS_AR[new Date(exam).getUTCDay()], "Día del examen"]);
  const steps = [
    { text: "Días restantes desde el inicio hasta el examen:", tex: `D = \\frac{${isoDate(exam)} - ${isoDate(start)}}{1\\ day} = ${ntex(D, 6)}` },
    { text: "Días de descanso y de estudio:", tex: `N_{rest} = ${ntex(restCount, 6)},\\quad N_{study} = D - N_{rest} = ${ntex(studyDays, 6)}` },
    { text: "Días de temas (sin contar el repaso general):", tex: `L = N_{study} - N_{review} = ${ntex(studyDays, 6)} - ${ntex(reviewCount, 6)} = ${ntex(L, 6)}` },
    { text: "Temas por día de estudio:", tex: `\\frac{${ntex(topics, 6)}}{${ntex(L, 6)}} = ${ntex(perDay, 4)}` },
    { text: "Total de horas de estudio:", tex: `H = ${ntex(studyDays, 6)} \\times ${ntex(hours, 6)} = ${ntex(totalHours, 6)}\\ h` }
  ];
  return {
    results: [
      { label: "Días restantes", value: dayWord(D), text: `Días restantes: ${fmt(D)}` },
      { label: "Días de estudio disponibles (incluido el repaso)", value: dayWord(studyDays) },
      { label: "Días de repaso general", value: dayWord(reviewCount) },
      { label: "días de descanso", value: dayWord(restCount) },
      { label: "Temas por día de estudio", value: fmt(perDay, 4), text: `Temas por día: ${fmt(perDay, 4)}` },
      { label: "Total de horas de estudio", value: hourWord(totalHours), text: `Total de horas: ${fmt(totalHours)}` }
    ],
    steps,
    blocks: [{ type: "table", caption: "Horario diario", head: ["Fecha", "Día", "Plan"], rows }],
    copy: `Días restantes: ${fmt(D)}, días de estudio: ${fmt(studyDays)}, temas por día: ${fmt(perDay, 4)}, total de horas: ${fmt(totalHours)}`,
    values: { D, studyDays, reviewCount, L, perDay, totalHours, restCount }
  };
}
