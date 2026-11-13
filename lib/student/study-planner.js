import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DAY = 86400000;
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const dayWord = (n) => (n === 0 ? "لا يوجد" : n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يوماً`);
const hourWord = (h) => (h === 1 ? "ساعة واحدة" : h === 2 ? "ساعتان" : Number.isInteger(h) && h >= 3 && h <= 10 ? `${h} ساعات` : `${fmt(h)} ساعة`);

function parseDate(raw, key, label) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) fail(`${label} يجب أن يكون بالصيغة YYYY-MM-DD.`, key);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail(`${label} ليس تاريخاً صحيحاً.`, key);
  return t;
}

function isoDate(t) {
  return new Date(t).toISOString().slice(0, 10);
}

export const meta = {
  description: "خطط لمذاكرتك حتى موعد الامتحان: احسب الأيام المتاحة وعدد الموضوعات لكل يوم وإجمالي ساعات الدراسة، مع جدول يومي يتضمن أيام الراحة والمراجعة الشاملة.",
  keywords: ["خطة مذاكرة", "جدول دراسة", "موعد الامتحان", "مراجعة", "study planner", "أيام الراحة"],
  formulas: [
    { label: "عدد الموضوعات لكل يوم دراسي", tex: "\\frac{N_{topics}}{N_{study} - N_{review}}" },
    { label: "إجمالي ساعات الدراسة", tex: "H = N_{study} \\times h" }
  ],
  inputs: [
    { id: "examDate", label: "تاريخ الامتحان", type: "text", default: "2026-01-11", placeholder: "YYYY-MM-DD", help: "بصيغة YYYY-MM-DD مثل 2026-06-15." },
    { id: "startDate", label: "تاريخ بداية المذاكرة", type: "text", default: "2026-01-01", placeholder: "YYYY-MM-DD", help: "اتركه فارغاً لاستخدام تاريخ اليوم." },
    { id: "topics", label: "عدد الموضوعات أو الفصول", type: "number", default: "8" },
    { id: "hours", label: "ساعات الدراسة في اليوم", unit: "h", type: "number", default: "2" },
    { id: "restDays", label: "أيام الراحة في الأسبوع", type: "number", default: "1", help: "من 0 إلى 6، وتُوزَّع على أيام الأسبوع بالتساوي." },
    { id: "revisionDays", label: "أيام المراجعة الشاملة قبل الامتحان", type: "number", default: "2" }
  ],
  example: { values: { examDate: "2026-01-11", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" }, expect: ["الأيام المتبقية: 10", "1.333"], note: "مثال: 10 أيام حتى الامتحان، ويوم راحة واحد في الأسبوع، ويومان للمراجعة." },
  invalid: { values: { examDate: "2026-01-01", startDate: "2026-01-01", topics: "8", hours: "2", restDays: "1", revisionDays: "2" } },
  related: ["gpa-calculator", "word-counter", "final-grade"]
};

export function solve(input) {
  const examRaw = str(input, "examDate", "تاريخ الامتحان");
  const exam = parseDate(examRaw, "examDate", "تاريخ الامتحان");
  let start;
  if (isBlank(input.startDate)) {
    const now = new Date();
    start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  } else {
    start = parseDate(str(input, "startDate", "تاريخ البداية"), "startDate", "تاريخ البداية");
  }
  if (!(exam > start)) fail("يجب أن يكون تاريخ الامتحان بعد تاريخ البداية.", "examDate");
  const D = Math.round((exam - start) / DAY);
  if (D > 366) fail("أقصى مدة للجدول 366 يوماً.", "examDate");
  const topics = num(input, "topics", "عدد الموضوعات", { integer: true, min: 1, max: 200 });
  const hours = num(input, "hours", "ساعات الدراسة في اليوم", { positive: true, max: 24 });
  const rest = num(input, "restDays", "أيام الراحة في الأسبوع", { integer: true, min: 0, max: 6 });
  const rev = num(input, "revisionDays", "أيام المراجعة الشاملة", { integer: true, min: 0, max: 60 });
  if (rev >= D) fail("أيام المراجعة يجب أن تكون أقل من عدد الأيام المتبقية.", "revisionDays");
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
  if (L < 1) fail("لا توجد أيام دراسية كافية لتوزيع الموضوعات؛ قلّل أيام الراحة أو المراجعة، أو زد المدة بين البداية والامتحان.", "restDays");
  let li = 0;
  for (const d of days) {
    if (d.kind === "rest") d.plan = "راحة";
    else if (d.kind === "review") d.plan = "مراجعة شاملة";
    else {
      const a = Math.floor((li * topics) / L) + 1;
      const b = Math.floor(((li + 1) * topics) / L);
      d.plan = b < a ? "تطبيق ومراجعة خفيفة" : a === b ? `الموضوع ${a}` : `الموضوعات ${a}–${b}`;
      li++;
    }
  }
  const perDay = topics / L;
  const totalHours = studyDays * hours;
  const rows = days.map((d) => [isoDate(d.t), DAYS_AR[d.dow], d.plan]);
  rows.push([isoDate(exam), DAYS_AR[new Date(exam).getUTCDay()], "يوم الامتحان"]);
  const steps = [
    { text: "الأيام المتبقية من البداية حتى الامتحان:", tex: `D = \\frac{${isoDate(exam)} - ${isoDate(start)}}{1\\ day} = ${ntex(D, 6)}` },
    { text: "أيام الراحة والدراسة:", tex: `N_{rest} = ${ntex(restCount, 6)},\\quad N_{study} = D - N_{rest} = ${ntex(studyDays, 6)}` },
    { text: "أيام الموضوعات (بعد استثناء المراجعة الشاملة):", tex: `L = N_{study} - N_{review} = ${ntex(studyDays, 6)} - ${ntex(reviewCount, 6)} = ${ntex(L, 6)}` },
    { text: "الموضوعات لكل يوم دراسي:", tex: `\\frac{${ntex(topics, 6)}}{${ntex(L, 6)}} = ${ntex(perDay, 4)}` },
    { text: "إجمالي ساعات الدراسة:", tex: `H = ${ntex(studyDays, 6)} \\times ${ntex(hours, 6)} = ${ntex(totalHours, 6)}\\ h` }
  ];
  return {
    results: [
      { label: "الأيام المتبقية", value: dayWord(D), text: `الأيام المتبقية: ${fmt(D)}` },
      { label: "أيام الدراسة المتاحة (منها المراجعة)", value: dayWord(studyDays) },
      { label: "أيام المراجعة الشاملة", value: dayWord(reviewCount) },
      { label: "أيام الراحة", value: dayWord(restCount) },
      { label: "الموضوعات لكل يوم دراسي", value: fmt(perDay, 4), text: `الموضوعات لكل يوم: ${fmt(perDay, 4)}` },
      { label: "إجمالي ساعات الدراسة", value: hourWord(totalHours), text: `إجمالي الساعات: ${fmt(totalHours)}` }
    ],
    steps,
    blocks: [{ type: "table", caption: "الجدول اليومي", head: ["التاريخ", "اليوم", "الخطة"], rows }],
    copy: `الأيام المتبقية: ${fmt(D)}، أيام الدراسة: ${fmt(studyDays)}، الموضوعات لكل يوم: ${fmt(perDay, 4)}، إجمالي الساعات: ${fmt(totalHours)}`,
    values: { D, studyDays, reviewCount, L, perDay, totalHours, restCount }
  };
}
