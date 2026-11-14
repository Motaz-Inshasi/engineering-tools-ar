import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const TZ = [
  ["-12", "UTC-12"], ["-11", "UTC-11 (ساموا)"], ["-10", "UTC-10 (هاواي)"], ["-9", "UTC-9 (ألاسكا)"],
  ["-8", "UTC-8 (لوس أنجلوس)"], ["-7", "UTC-7 (دنفر)"], ["-6", "UTC-6 (مكسيكو سيتي)"], ["-5", "UTC-5 (نيويورك)"],
  ["-4", "UTC-4 (كراكاس)"], ["-3", "UTC-3 (بوينس آيرس)"], ["-2", "UTC-2 (جنوب الأطلسي)"], ["-1", "UTC-1 (الأزور)"],
  ["+0", "UTC+0 (UTC/غرينتش)"], ["+1", "UTC+1 (لاغوس)"], ["+2", "UTC+2 (القاهرة)"], ["+3", "UTC+3 (مكة، الرياض، الكويت)"],
  ["+3.5", "UTC+3:30 (طهران)"], ["+4", "UTC+4 (دبي)"], ["+4.5", "UTC+4:30 (كابول)"], ["+5", "UTC+5 (كراتشي)"],
  ["+5.5", "UTC+5:30 (نيودلهي)"], ["+5.75", "UTC+5:45 (كاتماندو)"], ["+6", "UTC+6 (دكا)"], ["+6.5", "UTC+6:30 (يانغون)"],
  ["+7", "UTC+7 (بانكوك)"], ["+8", "UTC+8 (بكين، سنغافورة)"], ["+9", "UTC+9 (طوكيو)"], ["+9.5", "UTC+9:30 (أديلايد)"],
  ["+10", "UTC+10 (سيدني)"], ["+11", "UTC+11 (جزر سليمان)"], ["+12", "UTC+12 (أوكلاند)"], ["+13", "UTC+13 (تونغا)"],
  ["+14", "UTC+14 (كيريتيماتي)"]
];

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MAX_SECONDS = 2.6e11;

export const meta = {
  description: "حوّل الطابع الزمني Unix بالثواني أو الملي ثانية إلى تاريخ ووقت بتوقيت محدد، أو حوّل تاريخاً ووقتاً إلى طابع زمني، مع التوقيت العالمي ISO واليوم بالعربية وخطوات الحساب.",
  keywords: ["طابع زمني", "unix timestamp", "epoch", "Unix", "ثواني", "ملي ثانية", "تاريخ", "ISO 8601", "UTC", "منطقة زمنية"],
  formulas: [
    { label: "من الطابع الزمني إلى التاريخ", tex: "D = \\left\\lfloor \\frac{t}{86400} \\right\\rfloor,\\qquad r = t - 86400\\,D" },
    { label: "من التاريخ إلى الطابع الزمني", tex: "t = 86400\\,D + 3600\\,h + 60\\,m + s - \\text{offset}" }
  ],
  inputs: [
    { id: "mode", label: "الاتجاه", type: "select", default: "toDate", options: [["toDate", "طابع زمني ← تاريخ"], ["toTs", "تاريخ ← طابع زمني"]] },
    { id: "ts", label: "الطابع الزمني", type: "text", default: "1700000000", help: "عدد صحيح بالثواني أو بالملي ثانية حسب الوحدة.", when: { mode: ["toDate"] } },
    { id: "unit", label: "الوحدة", type: "select", default: "auto", options: [["auto", "تلقائي"], ["s", "ثوانٍ (s)"], ["ms", "ملي ثانية (ms)"]], when: { mode: ["toDate"] } },
    { id: "date", label: "التاريخ والوقت", type: "text", default: "2000-01-01 00:00:00", help: "YYYY-MM-DD HH:MM:SS أو YYYY-MM-DD.", when: { mode: ["toTs"] } },
    { id: "tz", label: "المنطقة الزمنية", type: "select", default: "+3", options: TZ }
  ],
  example: { values: { mode: "toDate", ts: "1700000000", unit: "auto", date: "2000-01-01 00:00:00", tz: "+0" }, expect: ["2023-11-14T22:13:20Z"], note: "مثال: الطابع 1700000000 بتوقيت UTC." },
  invalid: { values: { mode: "toTs", ts: "", unit: "auto", date: "2024-02-30", tz: "+3" } },
  related: ["bitwise-calculator", "number-bases", "chmod-calculator"]
};

const pad = (n, k) => String(n).padStart(k, "0");
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysInMonth = (y, m) => (m === 2 && isLeap(y) ? 29 : MONTH_DAYS[m - 1]);

function daysFromCivil(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(z0) {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return { y, m, d };
}

function parts(sec) {
  const days = Math.floor(sec / 86400);
  const rem = sec - days * 86400;
  const { y, m, d } = civilFromDays(days);
  return { days, y, m, d, h: Math.floor(rem / 3600), mi: Math.floor((rem % 3600) / 60), s: rem % 60 };
}

function offLabel(offMin) {
  const a = Math.abs(offMin);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `UTC${offMin < 0 ? "-" : "+"}${h}${m ? ":" + pad(m, 2) : ""}`;
}

function localStr(p, off) {
  return `${pad(p.y, 4)}-${pad(p.m, 2)}-${pad(p.d, 2)} ${pad(p.h, 2)}:${pad(p.mi, 2)}:${pad(p.s, 2)} (${off})`;
}

function isoStr(p, fracMs) {
  const f = fracMs ? `.${pad(fracMs, 3)}` : "";
  return `${pad(p.y, 4)}-${pad(p.m, 2)}-${pad(p.d, 2)}T${pad(p.h, 2)}:${pad(p.mi, 2)}:${pad(p.s, 2)}${f}Z`;
}

function weekdayOf(days) {
  return WEEKDAYS[((days % 7) + 11) % 7];
}

function checkYear(p, field) {
  if (p.y < 1 || p.y > 9999) fail("النتيجة خارج نطاق السنوات المدعومة من 1 إلى 9999.", field);
}

function fromTimestamp(input, offMin, off) {
  const raw = num(input, "ts", "الطابع الزمني", { integer: true });
  const unit = choice(input, "unit", "الوحدة", ["auto", "s", "ms"], "auto");
  const isMs = unit === "ms" || (unit === "auto" && String(Math.abs(raw)).length >= 12);
  const ms = isMs ? raw : raw * 1000;
  const secs = Math.floor(ms / 1000);
  const frac = ms - secs * 1000;
  if (Math.abs(secs) > MAX_SECONDS) fail("الطابع الزمني خارج نطاق السنوات المدعومة من 1 إلى 9999.", "ts");
  const utc = parts(secs);
  const localSec = secs + offMin * 60;
  const loc = parts(localSec);
  checkYear(utc, "ts");
  checkYear(loc, "ts");
  const weekday = weekdayOf(loc.days);
  const local = localStr(loc, off);
  const iso = isoStr(utc, frac);
  const steps = [
    "نقطة البداية (الطابع 0): 1970-01-01 00:00:00 UTC."
  ];
  if (isMs) steps.push({ text: "تحويل الملي ثانية إلى ثوانٍ بالقسمة على 1000:", tex: `\\frac{${raw}}{1000} = ${secs}\\ s${frac ? ` + ${frac}\\ ms` : ""}` });
  steps.push({ text: "عدد الأيام الكاملة منذ بداية الحقبة:", tex: `\\left\\lfloor \\frac{${secs}}{86400} \\right\\rfloor = ${utc.days}` });
  steps.push({ text: "الثواني المتبقية في ذلك اليوم:", tex: `${secs} - (${utc.days})\\times 86400 = ${secs - utc.days * 86400}` });
  steps.push({ text: "تحويلها إلى ساعات ودقائق وثوان:", tex: `${secs - utc.days * 86400} = ${utc.h}\\times 3600 + ${utc.mi}\\times 60 + ${utc.s}` });
  steps.push({ text: `تطبيق الفرق الزمني ${offLabel(offMin)}:`, tex: `${secs} + (${offMin * 60}) = ${localSec}` });
  steps.push(`التاريخ المحلي: ${local}، وهو يوم ${weekday}.`);
  return {
    results: [
      { label: "الثواني", value: String(secs) },
      { label: "بالمللي ثانية", value: String(secs * 1000 + frac) },
      { label: "التوقيت العالمي ISO", value: iso },
      { label: "التاريخ والوقت المحلي", value: local },
      { label: "يوم الأسبوع", value: weekday }
    ],
    steps,
    copy: `${iso} = ${local} (${weekday})`
  };
}

function parseDate(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim().replace(/\s+/g, " ");
  if (s === "") fail("أدخل التاريخ بالصيغة YYYY-MM-DD HH:MM:SS.", "date");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) fail("صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD أو YYYY-MM-DD HH:MM:SS.", "date");
  return {
    y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]),
    h: m[4] === undefined ? 0 : Number(m[4]),
    mi: m[5] === undefined ? 0 : Number(m[5]),
    s: m[6] === undefined ? 0 : Number(m[6])
  };
}

function toTimestamp(input, offMin, off) {
  const t = parseDate(input.date);
  if (t.y < 1 || t.y > 9999) fail("السنة يجب أن تكون بين 1 و9999.", "date");
  if (t.mo < 1 || t.mo > 12) fail("الشهر يجب أن يكون بين 1 و12.", "date");
  if (t.d < 1 || t.d > daysInMonth(t.y, t.mo)) fail(`اليوم ${t.d} غير موجود في الشهر ${t.mo} من السنة ${t.y}.`, "date");
  if (t.h > 23) fail("الساعة يجب أن تكون بين 0 و23.", "date");
  if (t.mi > 59) fail("الدقائق يجب أن تكون بين 0 و59.", "date");
  if (t.s > 59) fail("الثواني يجب أن تكون بين 0 و59.", "date");
  const days = daysFromCivil(t.y, t.mo, t.d);
  const localSec = days * 86400 + t.h * 3600 + t.mi * 60 + t.s;
  const utcSec = localSec - offMin * 60;
  const utc = parts(utcSec);
  checkYear(utc, "date");
  const local = localStr(parts(localSec), off);
  const weekday = weekdayOf(days);
  const steps = [
    { text: "عدد الأيام منذ 1970-01-01 لهذا التاريخ:", tex: `D = ${days}` },
    { text: "تحويل الوقت المحلي إلى ثوانٍ:", tex: `(${days})\\times 86400 + ${t.h}\\times 3600 + ${t.mi}\\times 60 + ${t.s} = ${localSec}` },
    { text: `طرح الفرق الزمني ${offLabel(offMin)} للحصول على التوقيت العالمي:`, tex: `${localSec} - (${offMin * 60}) = ${utcSec}` },
    `اليوم: ${weekday}.`
  ];
  return {
    results: [
      { label: "الثواني", value: String(utcSec) },
      { label: "بالمللي ثانية", value: String(utcSec * 1000) },
      { label: "التوقيت العالمي ISO", value: isoStr(utc, 0) },
      { label: "التاريخ والوقت المحلي", value: local },
      { label: "يوم الأسبوع", value: weekday }
    ],
    steps,
    copy: `${local} = ${utcSec} s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "الاتجاه", ["toDate", "toTs"], "toDate");
  const tz = choice(input, "tz", "المنطقة الزمنية", TZ.map(([v]) => v), "+3");
  const offMin = Math.round(Number(tz) * 60);
  const off = offLabel(offMin);
  if (mode === "toTs") return toTimestamp(input, offMin, off);
  if (isBlank(input.ts)) fail("أدخل الطابع الزمني.", "ts");
  return fromTimestamp(input, offMin, off);
}
