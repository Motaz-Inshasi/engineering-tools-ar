import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DAY = 86400000;
const DAYS_AR = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayWord = (n) => (n === 0 ? "None" : n === 1 ? "1 day" : n === 2 ? "2 days" : n <= 10 ? `${n} days` : `${n} days`);
const hourWord = (h) => (h === 1 ? "1 hour" : h === 2 ? "2 hours" : Number.isInteger(h) && h >= 3 && h <= 10 ? `${h} hours` : `${fmt(h)} hours`);

function parseDate(raw, key, label) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) fail(`${label} must be in YYYY-MM-DD format.`, key);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail(`${label} is not a valid date.`, key);
  return t;
}

function isoDate(t) {
  return new Date(t).toISOString().slice(0, 10);
}

export const meta = {
  description: "Plan your study until the exam date: calculate the available days, the number of topics per day and total study hours, with a daily table that includes rest days and a full review.",
  keywords: ["study plan", "study schedule", "exam date", "review", "study planner", "rest days"],
  formulas: [
    { label: "Number of topics per study day", tex: "\\frac{N_{topics}}{N_{study} - N_{review}}" },
    { label: "Total study hours", tex: "H = N_{study} \\times h" }
  ],
  inputs: [
    { id: "examDate", label: "Exam date", type: "text", default: "2026-01-11", placeholder: "YYYY-MM-DD", help: "In YYYY-MM-DD format, e.g. 2026-06-15." },
    { id: "startDate", label: "Study start date", type: "text", default: "2026-01-01", placeholder: "YYYY-MM-DD", help: "Leave empty to use today's date." },
    { id: "topics", label: "Number of topics or chapters", type: "number", default: "8" },
    { id: "hours", label: "Study hours per day", unit: "h", type: "number", default: "2" },
    { id: "restDays", label: "Rest days per week", type: "number", default: "1", help: "From 0 to 6, spread evenly across the days of the week." },
    { id: "revisionDays", label: "Full review days before the exam", type: "number", default: "2" }
  ],
  example: { values: { examDate: "2026-01-11", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" }, expect: ["Days remaining: 10", "1.333"], note: "Example: 10 days until the exam, one rest day per week, and two review days." },
  invalid: { values: { examDate: "2026-01-01", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" } },
  related: ["gpa-calculator", "word-counter", "final-grade"]
};

export function solve(input) {
  const examRaw = str(input, "examDate", "Exam date");
  const exam = parseDate(examRaw, "examDate", "Exam date");
  let start;
  if (isBlank(input.startDate)) {
    const now = new Date();
    start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  } else {
    start = parseDate(str(input, "startDate", "Start date"), "startDate", "Start date");
  }
  if (!(exam > start)) fail("The exam date must be after the start date.", "examDate");
  const D = Math.round((exam - start) / DAY);
  if (D > 366) fail("The maximum schedule length is 366 days.", "examDate");
  const topics = num(input, "topics", "Number of topics", { integer: true, min: 1, max: 200 });
  const hours = num(input, "hours", "Study hours per day", { positive: true, max: 24 });
  const rest = num(input, "restDays", "Rest days per week", { integer: true, min: 0, max: 6 });
  const rev = num(input, "revisionDays", "Full review days", { integer: true, min: 0, max: 60 });
  if (rev >= D) fail("Review days must be fewer than the days remaining.", "revisionDays");
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
  if (L < 1) fail("There are not enough study days to distribute the topics; reduce rest or review days, or increase the period between the start and the exam.", "restDays");
  let li = 0;
  for (const d of days) {
    if (d.kind === "rest") d.plan = "Rest";
    else if (d.kind === "review") d.plan = "Full review";
    else {
      const a = Math.floor((li * topics) / L) + 1;
      const b = Math.floor(((li + 1) * topics) / L);
      d.plan = b < a ? "Practice and light review" : a === b ? `Topic ${a}` : `Topics ${a}–${b}`;
      li++;
    }
  }
  const perDay = topics / L;
  const totalHours = studyDays * hours;
  const rows = days.map((d) => [isoDate(d.t), DAYS_AR[d.dow], d.plan]);
  rows.push([isoDate(exam), DAYS_AR[new Date(exam).getUTCDay()], "Exam day"]);
  const steps = [
    { text: "Days remaining from the start to the exam:", tex: `D = \\frac{${isoDate(exam)} - ${isoDate(start)}}{1\\ day} = ${ntex(D, 6)}` },
    { text: "Rest and study days:", tex: `N_{rest} = ${ntex(restCount, 6)},\\quad N_{study} = D - N_{rest} = ${ntex(studyDays, 6)}` },
    { text: "Topic days (after excluding the full review):", tex: `L = N_{study} - N_{review} = ${ntex(studyDays, 6)} - ${ntex(reviewCount, 6)} = ${ntex(L, 6)}` },
    { text: "Topics per study day:", tex: `\\frac{${ntex(topics, 6)}}{${ntex(L, 6)}} = ${ntex(perDay, 4)}` },
    { text: "Total study hours:", tex: `H = ${ntex(studyDays, 6)} \\times ${ntex(hours, 6)} = ${ntex(totalHours, 6)}\\ h` }
  ];
  return {
    results: [
      { label: "Days remaining", value: dayWord(D), text: `Days remaining: ${fmt(D)}` },
      { label: "Available study days (including review)", value: dayWord(studyDays) },
      { label: "Full review days", value: dayWord(reviewCount) },
      { label: "rest days", value: dayWord(restCount) },
      { label: "Topics per study day", value: fmt(perDay, 4), text: `Topics per day: ${fmt(perDay, 4)}` },
      { label: "Total study hours", value: hourWord(totalHours), text: `Total hours: ${fmt(totalHours)}` }
    ],
    steps,
    blocks: [{ type: "table", caption: "Daily schedule", head: ["Date", "Day", "Plan"], rows }],
    copy: `Days remaining: ${fmt(D)}, study days: ${fmt(studyDays)}, topics per day: ${fmt(perDay, 4)}, total hours: ${fmt(totalHours)}`,
    values: { D, studyDays, reviewCount, L, perDay, totalHours, restCount }
  };
}
