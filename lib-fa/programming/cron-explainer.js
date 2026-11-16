import { choice, fail } from "../core/validate.js";

const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_AR = ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن", "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"];
const DOW_AR = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const SPECS = {
  minute: { label: "دقیقه‌ها", min: 0, max: 59 },
  hour: { label: "ساعت‌ها", min: 0, max: 23 },
  dom: { label: "روز ماه", min: 1, max: 31 },
  month: { label: "ماه", min: 1, max: 12, names: MONTH_EN },
  dow: { label: "روز هفته", min: 0, max: 6, inMax: 7, names: DOW_EN }
};
const FIELD_NAMES = ["دقیقه", "ساعت", "روز ماه", "ماه", "روز هفته"];
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
    if (idx < 0) fail(`نام «${tok}» در فیلد ${spec.label} ناشناخته است.`, "expr");
    return idx + spec.min;
  }
  if (!/^\d+$/.test(tok)) fail(`مقدار «${tok}» در فیلد ${spec.label} نامعتبر است.`, "expr");
  const v = Number(tok);
  const top = spec.inMax ?? spec.max;
  if (v < spec.min || v > top) fail(`مقدار ${v} خارج از بازه ${spec.min}-${top} در فیلد ${spec.label} است.`, "expr");
  return v;
}

function parseField(raw, spec) {
  if (raw === "") fail(`فیلد ${spec.label} خالی است.`, "expr");
  const vals = new Set();
  for (const part of raw.split(",")) {
    if (part === "") fail(`در فیلد ${spec.label} یک مقدار خالی بین ویرگول‌ها وجود دارد.`, "expr");
    const pieces = part.split("/");
    if (pieces.length > 2) fail(`قالب گام در فیلد ${spec.label} نادرست است: «${part}».`, "expr");
    const [range, stepTok] = pieces;
    let step = 1;
    if (stepTok !== undefined) {
      if (!/^\d+$/.test(stepTok) || Number(stepTok) < 1) fail(`گام در فیلد ${spec.label} باید عددی بزرگ‌تر از صفر باشد: «${stepTok}».`, "expr");
      step = Number(stepTok);
    }
    let lo;
    let hi;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const ends = range.split("-");
      if (ends.length !== 2 || ends[0] === "" || ends[1] === "") fail(`بازه «${range}» در فیلد ${spec.label} نادرست است.`, "expr");
      lo = atom(ends[0], spec);
      hi = atom(ends[1], spec);
      if (lo > hi) fail(`بازه «${range}» در فیلد ${spec.label} وارونه است (شروع از پایان بزرگ‌تر است).`, "expr");
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
    if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) fail(`میان‌بر «${text}» ناشناخته است. میان‌برهای پشتیبانی‌شده: @yearly، @monthly، @weekly، @daily، @hourly.`, "expr");
    src = MACROS[macro];
  }
  const parts = src.split(/\s+/);
  if (parts.length !== 5) fail(`عبارت باید 5 فیلد داشته باشد (دقیقه ساعت روز-ماه ماه روز-هفته)، اما ${parts.length} فیلد دارد.`, "expr");
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
  if (s === "") fail("تاریخ شروع را به قالب YYYY-MM-DD HH:MM وارد کنید.", "start");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fail("قالب تاریخ شروع نادرست است؛ قالب موردنیاز YYYY-MM-DD HH:MM است.", "start");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || h > 23 || mi > 59) fail("یکی از مقادیر تاریخ شروع خارج از بازه مجاز است.", "start");
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) fail("این تاریخ در تقویم وجود ندارد.", "start");
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
  return `${items.slice(0, 6).join("، ")}، …، ${items.slice(-2).join("، ")} (مجموع ${items.length})`;
}

function minutePart(v) {
  if (v.length === 60) return "هر دقیقه";
  if (v.length === 1) return `در دقیقه ${v[0]}`;
  if (isRange(v)) return `از دقیقه ${v[0]} تا ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `هر ${n} دقیقه` + (v[0] ? ` از دقیقه ${v[0]} به بعد` : "");
  return `در دقیقه‌های ${abbrev(v.map(String))}`;
}

function hourPart(v) {
  if (v.length === 1) return `در ساعت ${v[0]}`;
  if (isRange(v)) return `از ساعت ${v[0]} تا ${v[v.length - 1]}`;
  const n = stepOf(v);
  if (n) return `هر ${n} ساعت` + (v[0] ? ` از ساعت ${v[0]} به بعد` : "");
  return `در ساعت‌های ${abbrev(v.map(String))}`;
}

function domText(v) {
  if (v.length === 31) return null;
  if (v.length === 1) return `در روز ${v[0]} ماه`;
  if (isRange(v)) return `از روز ${v[0]} تا ${v[v.length - 1]} ماه`;
  return `در روزهای ماه ${abbrev(v.map(String))}`;
}

function dowText(v) {
  if (v.length === 7) return null;
  if (v.length === 1) return `روز ${DOW_AR[v[0]]}`;
  if (isRange(v)) return `از ${DOW_AR[v[0]]} تا ${DOW_AR[v[v.length - 1]]}`;
  return `روزهای ${abbrev(v.map((d) => DOW_AR[d]))}`;
}

function monText(v) {
  if (v.length === 12) return null;
  if (v.length === 1) return `در ماه ${MONTH_AR[v[0] - 1]}`;
  if (isRange(v)) return `از ${MONTH_AR[v[0] - 1]} تا ${MONTH_AR[v[v.length - 1] - 1]}`;
  return `در ماه‌های ${abbrev(v.map((m) => MONTH_AR[m - 1]))}`;
}

function dayText(p) {
  const a = domText(p.dom);
  const b = dowText(p.dow);
  if (a && b) return p.domR && p.dowR ? `${a} یا ${b}` : `${a} و ${b}`;
  return a || b || "هر روز";
}

function timeParts(p) {
  const mAll = p.minute.length === 60;
  const hAll = p.hour.length === 24;
  if (mAll && hAll) return ["هر دقیقه"];
  if (hAll) return [`${minutePart(p.minute)} از هر ساعت`];
  if (p.minute.length === 1 && p.hour.length === 1) return [`ساعت ${pad2(p.hour[0])}:${pad2(p.minute[0])}`];
  return [minutePart(p.minute), hourPart(p.hour)];
}

export function describeCron(p) {
  return [...timeParts(p), dayText(p), monText(p.month)].filter(Boolean).join("، ");
}

function fieldRows(p) {
  const numbers = (v) => v.map(String);
  return [
    [FIELD_NAMES[0], p.src[0], minutePart(p.minute), abbrev(numbers(p.minute))],
    [FIELD_NAMES[1], p.src[1], p.hour.length === 24 ? "هر ساعت" : hourPart(p.hour), abbrev(numbers(p.hour))],
    [FIELD_NAMES[2], p.src[2], domText(p.dom) || "هر روز از ماه", abbrev(numbers(p.dom))],
    [FIELD_NAMES[3], p.src[3], monText(p.month) || "هر ماه", abbrev(p.month.map((m) => `${m} (${MONTH_AR[m - 1]})`))],
    [FIELD_NAMES[4], p.src[4], dowText(p.dow) || "هر روز از هفته", abbrev(p.dow.map((d) => `${d} (${DOW_AR[d]})`))]
  ];
}

export const meta = {
  description: "عبارت cron با پنج فیلد را به زبان فارسی روشن توضیح دهید: شرح طبیعی، تفکیک هر فیلد همراه با مقادیر بسط‌یافته‌اش، و محاسبه اولین اجراهای بعدی به وقت UTC، با پشتیبانی از میان‌برهایی مانند @daily.",
  keywords: ["cron", "crontab", "عبارت cron", "زمان‌بندی", "وظایف زمان‌بندی‌شده", "UTC", "scheduler", "@daily"],
  formulas: [{ label: "قاعده روز ماه و روز هفته با هم", tex: "\\text{day} = \\text{dom} \\lor \\text{dow}" }],
  inputs: [
    { id: "expr", label: "عبارت cron", type: "text", wide: true, default: "*/15 9-17 * * 1-5", placeholder: "*/15 9-17 * * 1-5", help: "پنج فیلد: دقیقه، ساعت، روز ماه، ماه، روز هفته. یا میان‌بری مانند @daily." },
    { id: "start", label: "تاریخ و زمان شروع (UTC)", type: "text", default: "2026-01-05 08:00", help: "با قالب YYYY-MM-DD HH:MM و به وقت جهانی UTC." },
    { id: "count", label: "تعداد اجراهای نمایش‌داده‌شده", type: "select", default: "5", options: [["5", "5"], ["10", "10"]] }
  ],
  example: { values: { expr: "*/15 9-17 * * 1-5", start: "2026-01-05 08:00", count: "5" }, expect: ["هر 15 دقیقه، از ساعت 9 تا 17، از دوشنبه تا جمعه"], note: "مثال: هر 15 دقیقه بین ساعت 9 و 17 در روزهای کاری از دوشنبه تا جمعه." },
  invalid: { values: { expr: "61 * * * *", start: "2026-01-05 08:00", count: "5" } },
  related: ["regex-tester", "js-checker", "unix-timestamp", "chmod-calculator"]
};

export function solve(input) {
  const expr = String(input.expr ?? "").trim();
  if (expr === "") fail("عبارت cron را وارد کنید.", "expr");
  const count = Number(choice(input, "count", "تعداد اجراها", ["5", "10"], "5"));
  const start = parseStart(input.start);
  const p = parseCron(expr);
  const runs = nextRuns(p, start, count);
  const desc = describeCron(p);
  const blocks = [
    { type: "table", wrap: true, caption: "تفکیک فیلدها", head: ["فیلد", "مقدار", "معنا", "مقادیر بسط‌یافته"], rows: fieldRows(p), ltr: true }
  ];
  if (runs.length) {
    blocks.push({
      type: "table",
      caption: "اولین اجراهای بعدی (UTC)",
      head: ["تاریخ و زمان", "روز"],
      rows: runs.map((d) => [formatRun(d), DOW_AR[d.getUTCDay()]]),
      ltr: true
    });
  }
  if (runs.length === 0) blocks.push({ type: "note", text: `در ${MAX_YEARS} سال از تاریخ شروع هیچ اجرای منطبقی پیدا نشد. عبارت را بررسی کنید؛ برای مثال روز 30 فوریه وجود ندارد.`, tone: "warn" });
  else if (runs.length < count) blocks.push({ type: "note", text: `در ${MAX_YEARS} سال از تاریخ شروع اجرای دیگری پیدا نشد.`, tone: "warn" });
  blocks.push({ type: "note", text: "زمان‌ها به وقت جهانی UTC هستند. جست‌وجو از دقیقه مشخص‌شده شروع می‌شود و در صورت انطباق آن را شامل می‌شود." });
  const results = [
    { label: "معنا به فارسی", value: desc },
    { label: "اولین اجرا", value: runs.length ? formatRun(runs[0]) : "وجود ندارد" },
    { label: "تعداد اجراهای نمایش‌داده‌شده", value: String(runs.length) }
  ];
  const steps = [];
  if (p.macro) steps.push(`میان‌بر ${p.macro} معادل عبارت «${p.src.join(" ")}» است.`);
  steps.push(`عبارت به 5 فیلد تقسیم شد: ${p.src.join(" ")}.`);
  steps.push(p.domR && p.dowR ? "چون روز ماه و روز هفته هر دو محدود شده‌اند، روز منطبق محسوب می‌شود اگر یکی از آن‌ها برقرار باشد." : "روز ماه و روز هفته هر دو محدود نشده‌اند، پس روز باید با همه فیلدها هم‌خوانی داشته باشد.");
  steps.push(`برنامه دقیقه‌به‌دقیقه جست‌وجو می‌کند و روزها و ساعت‌های منطبق‌نشده را رد می‌کند، و از ${formatRun(start)} UTC شروع می‌کند.`);
  const copy = `${expr}: ${desc}` + (runs.length ? `. اولین اجرا: ${formatRun(runs[0])}` : ". هیچ اجرای بعدی وجود ندارد");
  return { results, steps, copy, blocks };
}
