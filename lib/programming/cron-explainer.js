import { choice, fail } from "../core/validate.js";

const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DOW_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const SPECS = {
  minute: { label: "الدقائق", min: 0, max: 59 },
  hour: { label: "الساعات", min: 0, max: 23 },
  dom: { label: "يوم الشهر", min: 1, max: 31 },
  month: { label: "الشهر", min: 1, max: 12, names: MONTH_EN },
  dow: { label: "يوم الأسبوع", min: 0, max: 6, inMax: 7, names: DOW_EN }
};
const FIELD_NAMES = ["الدقيقة", "الساعة", "يوم الشهر", "الشهر", "يوم الأسبوع"];
const MACROS = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *"
};
const MAX_YEARS = 5;
const MAX_STEPS = 2000000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function atom(tok, spec) {
  if (spec.names && /^[A-Za-z]+$/.test(tok)) {
    const idx = spec.names.indexOf(tok.toUpperCase());
    if (idx < 0) fail(`الاسم «${tok}» غير معروف في حقل ${spec.label}.`, "expr");
    return idx + spec.min;
  }
  if (!/^\d+$/.test(tok)) fail(`القيمة «${tok}» في حقل ${spec.label} غير صالحة.`, "expr");
  const v = Number(tok);
  const top = spec.inMax ?? spec.max;
  if (v < spec.min || v > top) fail(`القيمة ${v} خارج المجال ${spec.min}-${top} في حقل ${spec.label}.`, "expr");
  return v;
}

function parseField(raw, spec) {
  if (raw === "") fail(`حقل ${spec.label} فارغ.`, "expr");
  const vals = new Set();
  for (const part of raw.split(",")) {
    if (part === "") fail(`في حقل ${spec.label} قيمة فارغة بين الفواصل.`, "expr");
    const pieces = part.split("/");
    if (pieces.length > 2) fail(`صيغة الخطوة غير صحيحة في حقل ${spec.label}: «${part}».`, "expr");
    const [range, stepTok] = pieces;
    let step = 1;
    if (stepTok !== undefined) {
      if (!/^\d+$/.test(stepTok) || Number(stepTok) < 1) fail(`الخطوة في حقل ${spec.label} يجب أن تكون عدداً أكبر من صفر: «${stepTok}».`, "expr");
      step = Number(stepTok);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const ends = range.split("-");
      if (ends.length !== 2 || ends[0] === "" || ends[1] === "") fail(`المجال «${range}» غير صحيح في حقل ${spec.label}.`, "expr");
      lo = atom(ends[0], spec);
      hi = atom(ends[1], spec);
      if (lo > hi) fail(`المجال «${range}» معكوس في حقل ${spec.label} (البداية أكبر من النهاية).`, "expr");
    } else {
      lo = atom(range, spec);
      hi = stepTok !== undefined ? spec.max : lo;
    }
    for (let v = lo; v <= hi; v += step) vals.add(spec.inMax === 7 && v === 7 ? 0 : v);
  }
  return [...vals].sort((a, b) => a - b);
}

export function parseCron(expr) {
  const text = String(expr).trim();
  let macro = null;
  let src = text;
  if (text.startsWith("@")) {
    macro = text.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) fail(`الاختصار «${text}» غير معروف. الاختصارات المدعومة: @yearly، @monthly، @weekly، @daily، @hourly.`, "expr");
    src = MACROS[macro];
  }
  const parts = src.split(/\s+/);
  if (parts.length !== 5) fail(`يجب أن يحتوي التعبير على 5 حقول (الدقيقة الساعة يوم-الشهر الشهر يوم-الأسبوع)، لكنه يحتوي على ${parts.length}.`, "expr");
  const [mi, ho, dom, mo, dow] = parts;
  return {
    macro,
    src: parts,
    minute: parseField(mi, SPECS.minute),
    hour: parseField(ho, SPECS.hour),
    dom: parseField(dom, SPECS.dom),
    month: parseField(mo, SPECS.month),
    dow: parseField(dow, SPECS.dow),
    domR: !dom.startsWith("*"),
    dowR: !dow.startsWith("*")
  };
}

export function parseStart(raw) {
  const s = String(raw ?? "").trim();
  if (s === "") fail("أدخل تاريخ البداية بصيغة YYYY-MM-DD HH:MM.", "start");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fail("صيغة تاريخ البداية غير صحيحة، والصيغة المطلوبة YYYY-MM-DD HH:MM.", "start");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || h > 23 || mi > 59) fail("قيمة من قيم تاريخ البداية خارج المجال المسموح.", "start");
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) fail("هذا التاريخ غير موجود في التقويم.", "start");
  return date;
}

export function formatRun(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function dayMatches(p, d) {
  const domOk = p.dom.includes(d.getUTCDate());
  const dowOk = p.dow.includes(d.getUTCDay());
  return p.domR && p.dowR ? domOk || dowOk : domOk && dowOk;
}

export function nextRuns(p, start, count) {
  const out = [];
  const endMs = Date.UTC(start.getUTCFullYear() + MAX_YEARS, start.getUTCMonth(), start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes());
  let t = start.getTime();
  for (let steps = 0; out.length < count && t <= endMs && steps < MAX_STEPS; steps++) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const dd = d.getUTCDate();
    const h = d.getUTCHours();
    const mi = d.getUTCMinutes();
    if (!p.month.includes(mo + 1)) {
      t = Date.UTC(y, mo + 1, 1);
      continue;
    }
    if (!dayMatches(p, d)) {
      t = Date.UTC(y, mo, dd + 1);
      continue;
    }
    if (!p.hour.includes(h)) {
      const nh = p.hour.find((v) => v > h);
      t = nh !== undefined ? Date.UTC(y, mo, dd, nh) : Date.UTC(y, mo, dd + 1);
      continue;
    }
    if (!p.minute.includes(mi)) {
      const nm = p.minute.find((v) => v > mi);
      t = nm !== undefined ? Date.UTC(y, mo, dd, h, nm) : Date.UTC(y, mo, dd, h + 1);
      continue;
    }
    out.push(d);
    t += 60000;
  }
  return out;
}

function isRange(v) {
  return v.length > 1 && v.every((x, i) => i === 0 || x === v[i - 1] + 1);
}

function stepOf(v) {
  if (v.length < 3) return 0;
  const n = v[1] - v[0];
  return n > 1 && v.every((x, i) => i === 0 || x - v[i - 1] === n) ? n : 0;
}

function abbrev(items) {
  if (items.length <= 12) return items.join("، ");
  return `${items.slice(0, 6).join("، ")}، …، ${items.slice(-2).join("، ")} (المجموع ${items.length})`;
}

function minutePart(v) {
  if (v.length === 60) return "كل دقيقة";
  if (v.length === 1) return `عند الدقيقة ${v[0]}`;
  if (isRange(v)) return `من الدقيقة ${v[0]} إلى ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `كل ${n} دقيقة` + (v[0] ? ` ابتداءً من الدقيقة ${v[0]}` : "");
  return `عند الدقائق ${abbrev(v.map(String))}`;
}

function hourPart(v) {
  if (v.length === 1) return `في الساعة ${v[0]}`;
  if (isRange(v)) return `من الساعة ${v[0]} إلى ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `كل ${n} ساعة` + (v[0] ? ` ابتداءً من الساعة ${v[0]}` : "");
  return `في الساعات ${abbrev(v.map(String))}`;
}

function domText(v) {
  if (v.length === 31) return null;
  if (v.length === 1) return `في اليوم ${v[0]} من الشهر`;
  if (isRange(v)) return `من اليوم ${v[0]} إلى ${v[v.length - 1]} من الشهر`;
  return `في أيام الشهر ${abbrev(v.map(String))}`;
}

function dowText(v) {
  if (v.length === 7) return null;
  if (v.length === 1) return `يوم ${DOW_AR[v[0]]}`;
  if (isRange(v)) return `من ${DOW_AR[v[0]]} إلى ${DOW_AR[v[v.length - 1]]}`;
  return `أيام ${abbrev(v.map((d) => DOW_AR[d]))}`;
}

function monText(v) {
  if (v.length === 12) return null;
  if (v.length === 1) return `في شهر ${MONTH_AR[v[0] - 1]}`;
  if (isRange(v)) return `من ${MONTH_AR[v[0] - 1]} إلى ${MONTH_AR[v[v.length - 1] - 1]}`;
  return `في أشهر ${abbrev(v.map((m) => MONTH_AR[m - 1]))}`;
}

function dayText(p) {
  const a = domText(p.dom);
  const b = dowText(p.dow);
  if (a && b) return p.domR && p.dowR ? `${a} أو ${b}` : `${a} و ${b}`;
  return a || b || "كل يوم";
}

function timeParts(p) {
  const mAll = p.minute.length === 60;
  const hAll = p.hour.length === 24;
  if (mAll && hAll) return ["كل دقيقة"];
  if (hAll) return [`${minutePart(p.minute)} من كل ساعة`];
  if (p.minute.length === 1 && p.hour.length === 1) return [`الساعة ${pad2(p.hour[0])}:${pad2(p.minute[0])}`];
  return [minutePart(p.minute), hourPart(p.hour)];
}

export function describeCron(p) {
  return [...timeParts(p), dayText(p), monText(p.month)].filter(Boolean).join("، ");
}

function fieldRows(p) {
  const numbers = (v) => v.map(String);
  return [
    [FIELD_NAMES[0], p.src[0], minutePart(p.minute), abbrev(numbers(p.minute))],
    [FIELD_NAMES[1], p.src[1], p.hour.length === 24 ? "كل ساعة" : hourPart(p.hour), abbrev(numbers(p.hour))],
    [FIELD_NAMES[2], p.src[2], domText(p.dom) || "كل يوم من الشهر", abbrev(numbers(p.dom))],
    [FIELD_NAMES[3], p.src[3], monText(p.month) || "كل شهر", abbrev(p.month.map((m) => `${m} (${MONTH_AR[m - 1]})`))],
    [FIELD_NAMES[4], p.src[4], dowText(p.dow) || "كل يوم من الأسبوع", abbrev(p.dow.map((d) => `${d} (${DOW_AR[d]})`))]
  ];
}

export const meta = {
  description: "اشرح تعبير cron المكوّن من خمسة حقول بلغة عربية واضحة: وصف طبيعي، وتفكيك كل حقل مع قيمه الموسّعة، وحساب أول التشغيلات القادمة بتوقيت UTC، مع دعم الاختصارات مثل @daily.",
  keywords: ["cron", "crontab", "تعبير cron", "جدولة", "مهام مجدولة", "UTC", "scheduler", "@daily"],
  formulas: [{ label: "قاعدة يوم الشهر ويوم الأسبوع معاً", tex: "\\text{day} = \\text{dom} \\lor \\text{dow}" }],
  inputs: [
    { id: "expr", label: "تعبير cron", type: "text", wide: true, default: "*/15 9-17 * * 1-5", placeholder: "*/15 9-17 * * 1-5", help: "خمسة حقول: الدقيقة، الساعة، يوم الشهر، الشهر، يوم الأسبوع. أو اختصار مثل @daily." },
    { id: "start", label: "تاريخ ووقت البداية (UTC)", type: "text", default: "2026-01-05 08:00", help: "بصيغة YYYY-MM-DD HH:MM بالتوقيت العالمي UTC." },
    { id: "count", label: "عدد التشغيلات المعروضة", type: "select", default: "5", options: [["5", "5"], ["10", "10"]] }
  ],
  example: { values: { expr: "*/15 9-17 * * 1-5", start: "2026-01-05 08:00", count: "5" }, expect: ["كل 15 دقيقة، من الساعة 9 إلى 17، من الإثنين إلى الجمعة"], note: "مثال: كل 15 دقيقة بين الساعة 9 و17 في أيام العمل من الإثنين إلى الجمعة." },
  invalid: { values: { expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" } },
  related: ["regex-tester", "js-checker", "unix-timestamp", "chmod-calculator"]
};

export function solve(input) {
  const expr = String(input.expr ?? "").trim();
  if (expr === "") fail("أدخل تعبير cron.", "expr");
  const count = Number(choice(input, "count", "عدد التشغيلات", ["5", "10"], "5"));
  const start = parseStart(input.start);
  const p = parseCron(expr);
  const runs = nextRuns(p, start, count);
  const desc = describeCron(p);
  const blocks = [
    { type: "table", wrap: true, caption: "تفكيك الحقول", head: ["الحقل", "القيمة", "المعنى", "القيم الموسّعة"], rows: fieldRows(p), ltr: true }
  ];
  if (runs.length) {
    blocks.push({
      type: "table",
      caption: "أول التشغيلات القادمة (UTC)",
      head: ["التاريخ والوقت", "اليوم"],
      rows: runs.map((d) => [formatRun(d), DOW_AR[d.getUTCDay()]]),
      ltr: true
    });
  }
  if (runs.length === 0) blocks.push({ type: "note", text: `لم يُعثر على أي تشغيل مطابق خلال ${MAX_YEARS} سنوات من تاريخ البداية. تحقق من التعبير، فمثلاً يوم 30 من شباط غير موجود.`, tone: "warn" });
  else if (runs.length < count) blocks.push({ type: "note", text: `لم تُعثر على تشغيلات أخرى خلال ${MAX_YEARS} سنوات من تاريخ البداية.`, tone: "warn" });
  blocks.push({ type: "note", text: "الأوقات بالتوقيت العالمي UTC. يبدأ البحث من الدقيقة المحددة ويتضمنها إن طابقت." });
  const results = [
    { label: "المعنى بالعربية", value: desc },
    { label: "أول تشغيل", value: runs.length ? formatRun(runs[0]) : "لا يوجد" },
    { label: "عدد التشغيلات المعروضة", value: String(runs.length) }
  ];
  const steps = [];
  if (p.macro) steps.push(`الاختصار ${p.macro} يعادل التعبير «${p.src.join(" ")}».`);
  steps.push(`قُسِّم التعبير إلى 5 حقول: ${p.src.join(" ")}.`);
  steps.push(p.domR && p.dowR ? "لأن يوم الشهر ويوم الأسبوع مقيّدان معاً، يُعتبر اليوم مطابقاً إذا وافق أحدهما." : "لا يُقيَّد يوم الشهر ويوم الأسبوع معاً، لذلك يجب أن يوافق اليوم كل الحقول.");
  steps.push(`يبحث البرنامج دقيقةً بدقيقة مع تخطي الأيام والساعات غير المطابقة، بدءاً من ${formatRun(start)} UTC.`);
  const copy = `${expr}: ${desc}` + (runs.length ? `. أول تشغيل: ${formatRun(runs[0])}` : ". لا توجد تشغيلات قادمة");
  return { results, steps, copy, blocks };
}
