import { choice, fail } from "../core/validate.js";

const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_AR = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
const DOW_AR = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];
const SPECS = {
  minute: { label: "منٹ", min: 0, max: 59 },
  hour: { label: "گھنٹے", min: 0, max: 23 },
  dom: { label: "مہینے کا دن", min: 1, max: 31 },
  month: { label: "مہینہ", min: 1, max: 12, names: MONTH_EN },
  dow: { label: "ہفتے کا دن", min: 0, max: 6, inMax: 7, names: DOW_EN }
};
const FIELD_NAMES = ["منٹ", "گھنٹہ", "مہینے کا دن", "مہینہ", "ہفتے کا دن"];
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
    if (idx < 0) fail(`نام «${tok}» حقل ${spec.label} میں نامعلوم ہے۔`, "expr");
    return idx + spec.min;
  }
  if (!/^\d+$/.test(tok)) fail(`قدر «${tok}» حقل ${spec.label} میں درست نہیں ہے۔`, "expr");
  const v = Number(tok);
  const top = spec.inMax ?? spec.max;
  if (v < spec.min || v > top) fail(`قدر ${v} حقل ${spec.label} میں حد ${spec.min} تا ${top} سے باہر ہے۔`, "expr");
  return v;
}

function parseField(raw, spec) {
  if (raw === "") fail(`حقل ${spec.label} خالی ہے۔`, "expr");
  const vals = new Set();
  for (const part of raw.split(",")) {
    if (part === "") fail(`حقل ${spec.label} میں کوماؤں کے درمیان خالی قدر ہے۔`, "expr");
    const pieces = part.split("/");
    if (pieces.length > 2) fail(`حقل ${spec.label} میں قدم کی شکل درست نہیں: «${part}»۔`, "expr");
    const [range, stepTok] = pieces;
    let step = 1;
    if (stepTok !== undefined) {
      if (!/^\d+$/.test(stepTok) || Number(stepTok) < 1) fail(`حقل ${spec.label} میں قدم صفر سے بڑا عدد ہونا چاہیے: «${stepTok}»۔`, "expr");
      step = Number(stepTok);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const ends = range.split("-");
      if (ends.length !== 2 || ends[0] === "" || ends[1] === "") fail(`حقل ${spec.label} میں حد «${range}» درست نہیں ہے۔`, "expr");
      lo = atom(ends[0], spec);
      hi = atom(ends[1], spec);
      if (lo > hi) fail(`حقل ${spec.label} میں حد «${range}» الٹی ہے (ابتدا انتہا سے بڑی ہے)۔`, "expr");
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
    if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) fail(`شارٹ کٹ «${text}» نامعلوم ہے۔ سپورٹڈ شارٹ کٹس: @yearly، @monthly، @weekly، @daily، @hourly۔`, "expr");
    src = MACROS[macro];
  }
  const parts = src.split(/\s+/);
  if (parts.length !== 5) fail(`cron اظہار میں 5 حقلیں ہونی چاہئیں (منٹ گھنٹہ مہینے کا دن مہینہ ہفتے کا دن)، لیکن اس میں ${parts.length} ہیں۔`, "expr");
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
  if (s === "") fail("ابتدائی تاریخ YYYY-MM-DD HH:MM کی شکل میں درج کریں۔", "start");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fail("ابتدائی تاریخ کی شکل درست نہیں، مطلوبہ شکل YYYY-MM-DD HH:MM ہے۔", "start");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || h > 23 || mi > 59) fail("ابتدائی تاریخ کی کوئی قدر اجازت شدہ حد سے باہر ہے۔", "start");
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) fail("یہ تاریخ کیلنڈر میں موجود نہیں ہے۔", "start");
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
  return `${items.slice(0, 6).join("، ")}، …، ${items.slice(-2).join("، ")} (کل ${items.length})`;
}

function minutePart(v) {
  if (v.length === 60) return "ہر منٹ";
  if (v.length === 1) return `منٹ ${v[0]} پر`;
  if (isRange(v)) return `منٹ ${v[0]} سے ${v[v.length - 1]} تک`;
  const n = stepOf(v);
  if (n) return `ہر ${n} منٹ` + (v[0] ? ` منٹ ${v[0]} سے شروع ہو کر` : "");
  return `منٹوں ${abbrev(v.map(String))} پر`;
}

function hourPart(v) {
  if (v.length === 1) return `گھنٹے ${v[0]} پر`;
  if (isRange(v)) return `گھنٹہ ${v[0]} سے ${v[v.length - 1]} تک`;
  const n = stepOf(v);
  if (n) return `ہر ${n} گھنٹے` + (v[0] ? ` گھنٹہ ${v[0]} سے شروع ہو کر` : "");
  return `گھنٹوں ${abbrev(v.map(String))} پر`;
}

function domText(v) {
  if (v.length === 31) return null;
  if (v.length === 1) return `مہینے کی ${v[0]} تاریخ کو`;
  if (isRange(v)) return `مہینے کی ${v[0]} تا ${v[v.length - 1]} تاریخ کو`;
  return `مہینے کی تاریخوں ${abbrev(v.map(String))} کو`;
}

function dowText(v) {
  if (v.length === 7) return null;
  if (v.length === 1) return `${DOW_AR[v[0]]} کو`;
  if (isRange(v)) return `${DOW_AR[v[0]]} سے ${DOW_AR[v[v.length - 1]]} تک`;
  return `دن ${abbrev(v.map((d) => DOW_AR[d]))}`;
}

function monText(v) {
  if (v.length === 12) return null;
  if (v.length === 1) return `مہینہ ${MONTH_AR[v[0] - 1]} میں`;
  if (isRange(v)) return `${MONTH_AR[v[0] - 1]} سے ${MONTH_AR[v[v.length - 1] - 1]} تک`;
  return `مہینوں ${abbrev(v.map((m) => MONTH_AR[m - 1]))} میں`;
}

function dayText(p) {
  const a = domText(p.dom);
  const b = dowText(p.dow);
  if (a && b) return p.domR && p.dowR ? `${a} یا ${b}` : `${a} اور ${b}`;
  return a || b || "ہر دن";
}

function timeParts(p) {
  const mAll = p.minute.length === 60;
  const hAll = p.hour.length === 24;
  if (mAll && hAll) return ["ہر منٹ"];
  if (hAll) return [`ہر گھنٹے کے ${minutePart(p.minute)}`];
  if (p.minute.length === 1 && p.hour.length === 1) return [`گھنٹہ ${pad2(p.hour[0])}:${pad2(p.minute[0])}`];
  return [minutePart(p.minute), hourPart(p.hour)];
}

export function describeCron(p) {
  return [...timeParts(p), dayText(p), monText(p.month)].filter(Boolean).join("، ");
}

function fieldRows(p) {
  const numbers = (v) => v.map(String);
  return [
    [FIELD_NAMES[0], p.src[0], minutePart(p.minute), abbrev(numbers(p.minute))],
    [FIELD_NAMES[1], p.src[1], p.hour.length === 24 ? "ہر گھنٹہ" : hourPart(p.hour), abbrev(numbers(p.hour))],
    [FIELD_NAMES[2], p.src[2], domText(p.dom) || "مہینے کا ہر دن", abbrev(numbers(p.dom))],
    [FIELD_NAMES[3], p.src[3], monText(p.month) || "ہر مہینہ", abbrev(p.month.map((m) => `${m} (${MONTH_AR[m - 1]})`))],
    [FIELD_NAMES[4], p.src[4], dowText(p.dow) || "ہفتے کا ہر دن", abbrev(p.dow.map((d) => `${d} (${DOW_AR[d]})`))]
  ];
}

export const meta = {
  description: "پانچ حقلوں والا cron اظہار واضح اردو میں سمجھائیں: عام وضاحت، ہر حقل کی تقسیم اس کی توسیع شدہ قدروں کے ساتھ، اور UTC وقت کے مطابق اگلی پہلی رنز کا حساب، شارٹ کٹس جیسے @daily سمیت۔",
  keywords: ["cron", "crontab", "cron اظہار", "شیڈول", "شیڈول شدہ کام", "UTC", "scheduler", "@daily"],
  formulas: [{ label: "مہینے کا دن اور ہفتے کا دن مشترکہ قاعدہ", tex: "\\text{day} = \\text{dom} \\lor \\text{dow}" }],
  inputs: [
    { id: "expr", label: "cron اظہار", type: "text", wide: true, default: "*/15 9-17 * * 1-5", placeholder: "*/15 9-17 * * 1-5", help: "پانچ حقلیں: منٹ، گھنٹہ، مہینے کا دن، مہینہ، ہفتے کا دن۔ یا @daily جیسا شارٹ کٹ۔" },
    { id: "start", label: "شروع کی تاریخ اور وقت (UTC)", type: "text", default: "2026-01-05 08:00", help: "YYYY-MM-DD HH:MM کی شکل میں، UTC وقت کے مطابق۔" },
    { id: "count", label: "دکھائی جانے والی رنز کی تعداد", type: "select", default: "5", options: [["5", "5"], ["10", "10"]] }
  ],
  example: { values: { expr: "*/15 9-17 * * 1-5", start: "2026-01-05 08:00", count: "5" }, expect: ["ہر 15 منٹ، گھنٹہ 9 سے 17 تک، پیر سے جمعہ"], note: "مثال: ہر 15 منٹ، 9 بجے اور 17 بجے کے درمیان، کاروباری دنوں میں پیر سے جمعہ تک۔" },
  invalid: { values: { expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" } },
  related: ["regex-tester", "js-checker", "unix-timestamp", "chmod-calculator"]
};

export function solve(input) {
  const expr = String(input.expr ?? "").trim();
  if (expr === "") fail("cron اظہار درج کریں۔", "expr");
  const count = Number(choice(input, "count", "رنز کی تعداد", ["5", "10"], "5"));
  const start = parseStart(input.start);
  const p = parseCron(expr);
  const runs = nextRuns(p, start, count);
  const desc = describeCron(p);
  const blocks = [
    { type: "table", wrap: true, caption: "حقلوں کی تفصیل", head: ["حقل", "قدر", "معنی", "توسیع شدہ قدریں"], rows: fieldRows(p), ltr: true }
  ];
  if (runs.length) {
    blocks.push({
      type: "table",
      caption: "اگلی پہلی رنز (UTC)",
      head: ["تاریخ اور وقت", "دن"],
      rows: runs.map((d) => [formatRun(d), DOW_AR[d.getUTCDay()]]),
      ltr: true
    });
  }
  if (runs.length === 0) blocks.push({ type: "note", text: `شروع کی تاریخ سے ${MAX_YEARS} سال کے اندر کوئی مطابق رن نہیں ملا۔ اظہار چیک کریں، مثلاً فروری کا 30 واں دن موجود نہیں۔`, tone: "warn" });
  else if (runs.length < count) blocks.push({ type: "note", text: `شروع کی تاریخ سے ${MAX_YEARS} سال کے اندر کوئی اور رن نہیں ملا۔`, tone: "warn" });
  blocks.push({ type: "note", text: "اوقات UTC وقت کے مطابق ہیں۔ تلاش مقررہ منٹ سے شروع ہوتی ہے اور اگر مطابق ہو تو اسے شامل کرتی ہے۔" });
  const results = [
    { label: "اردو میں مطلب", value: desc },
    { label: "پہلی رن", value: runs.length ? formatRun(runs[0]) : "کوئی نہیں" },
    { label: "دکھائی جانے والی رنز کی تعداد", value: String(runs.length) }
  ];
  const steps = [];
  if (p.macro) steps.push(`شارٹ کٹ ${p.macro} کا مطلب ہے اظہار «${p.src.join(" ")}»۔`);
  steps.push(`اظہار کو 5 حقلوں میں تقسیم کیا گیا: ${p.src.join(" ")}۔`);
  steps.push(p.domR && p.dowR ? "کیونکہ مہینے کا دن اور ہفتے کا دن دونوں مقید ہیں، اس لیے دن اس وقت مطابق سمجھا جائے گا جب ان میں سے کوئی ایک مطابق ہو۔" : "مہینے کا دن اور ہفتے کا دن ایک ساتھ مقید نہیں، اس لیے دن کو تمام حقلوں سے مطابق ہونا ہوگا۔");
  steps.push(`پروگرام منٹ بہ منٹ تلاش کرتا ہے، غیر مطابق دنوں اور گھنٹوں کو چھوڑتے ہوئے، ${formatRun(start)} UTC سے شروع کرکے۔`);
  const copy = `${expr}: ${desc}` + (runs.length ? `. پہلی رن: ${formatRun(runs[0])}` : ". آنے والی کوئی رن نہیں ہے");
  return { results, steps, copy, blocks };
}
