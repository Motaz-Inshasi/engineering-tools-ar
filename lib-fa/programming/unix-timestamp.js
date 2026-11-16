import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const TZ = [
  ["-12", "UTC-12"], ["-11", "UTC-11 (ساموآ)"], ["-10", "UTC-10 (هاوایی)"], ["-9", "UTC-9 (آلاسکا)"],
  ["-8", "UTC-8 (لس‌آنجلس)"], ["-7", "UTC-7 (دنور)"], ["-6", "UTC-6 (مکزیکوسیتی)"], ["-5", "UTC-5 (نیویورک)"],
  ["-4", "UTC-4 (کاراکاس)"], ["-3", "UTC-3 (بوئنوس‌آیرس)"], ["-2", "UTC-2 (جنوب اقیانوس اطلس)"], ["-1", "UTC-1 (آزور)"],
  ["+0", "UTC+0 (UTC/گرینویچ)"], ["+1", "UTC+1 (لاگوس)"], ["+2", "UTC+2 (قاهره)"], ["+3", "UTC+3 (مکه، ریاض، کویت)"],
  ["+3.5", "UTC+3:30 (تهران)"], ["+4", "UTC+4 (دبی)"], ["+4.5", "UTC+4:30 (کابل)"], ["+5", "UTC+5 (کراچی)"],
  ["+5.5", "UTC+5:30 (دهلی‌نو)"], ["+5.75", "UTC+5:45 (کاتماندو)"], ["+6", "UTC+6 (داکا)"], ["+6.5", "UTC+6:30 (یانگون)"],
  ["+7", "UTC+7 (بانکوک)"], ["+8", "UTC+8 (پکن، سنگاپور)"], ["+9", "UTC+9 (توکیو)"], ["+9.5", "UTC+9:30 (آدلاید)"],
  ["+10", "UTC+10 (سیدنی)"], ["+11", "UTC+11 (جزایر سلیمان)"], ["+12", "UTC+12 (اوکلند)"], ["+13", "UTC+13 (تونگا)"],
  ["+14", "UTC+14 (کیریتیماتی)"]
];

const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MAX_SECONDS = 2.6e11;

export const meta = {
  description: "تبدیل زمان یونیکس بر حسب ثانیه یا میلی‌ثانیه به تاریخ و ساعت در منطقه زمانی مشخص، یا تبدیل تاریخ و ساعت به زمان یونیکس، همراه با قالب ISO در UTC و روز هفته به فارسی و مراحل محاسبه.",
  keywords: ["زمان یونیکس", "unix timestamp", "epoch", "Unix", "ثانیه", "میلی‌ثانیه", "تاریخ", "ISO 8601", "UTC", "منطقه زمانی"],
  formulas: [
    { label: "از زمان یونیکس به تاریخ", tex: "D = \\left\\lfloor \\frac{t}{86400} \\right\\rfloor,\\qquad r = t - 86400\\,D" },
    { label: "از تاریخ به زمان یونیکس", tex: "t = 86400\\,D + 3600\\,h + 60\\,m + s - \\text{offset}" }
  ],
  inputs: [
    { id: "mode", label: "جهت", type: "select", default: "toDate", options: [["toDate", "زمان یونیکس ← تاریخ"], ["toTs", "تاریخ ← زمان یونیکس"]] },
    { id: "ts", label: "زمان یونیکس", type: "text", default: "1700000000", help: "عدد صحیح بر حسب ثانیه یا میلی‌ثانیه، بسته به واحد.", when: { mode: ["toDate"] } },
    { id: "unit", label: "واحد", type: "select", default: "auto", options: [["auto", "خودکار"], ["s", "ثانیه (s)"], ["ms", "میلی‌ثانیه (ms)"]], when: { mode: ["toDate"] } },
    { id: "date", label: "تاریخ و زمان", type: "text", default: "2000-01-01 00:00:00", help: "YYYY-MM-DD HH:MM:SS یا YYYY-MM-DD.", when: { mode: ["toTs"] } },
    { id: "tz", label: "منطقه زمانی", type: "select", default: "+3", options: TZ }
  ],
  example: { values: { mode: "toDate", ts: "1700000000", unit: "auto", date: "2000-01-01 00:00:00", tz: "+0" }, expect: ["2023-11-14T22:13:20Z"], note: "مثال: زمان یونیکس 1700000000 در UTC." },
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
  if (p.y < 1 || p.y > 9999) fail("نتیجه خارج از محدوده سال‌های پشتیبانی‌شده 1 تا 9999 است.", field);
}

function fromTimestamp(input, offMin, off) {
  const raw = num(input, "ts", "زمان یونیکس", { integer: true });
  const unit = choice(input, "unit", "واحد", ["auto", "s", "ms"], "auto");
  const isMs = unit === "ms" || (unit === "auto" && String(Math.abs(raw)).length >= 12);
  const ms = isMs ? raw : raw * 1000;
  const secs = Math.floor(ms / 1000);
  const frac = ms - secs * 1000;
  if (Math.abs(secs) > MAX_SECONDS) fail("زمان یونیکس خارج از محدوده سال‌های پشتیبانی‌شده 1 تا 9999 است.", "ts");
  const utc = parts(secs);
  const localSec = secs + offMin * 60;
  const loc = parts(localSec);
  checkYear(utc, "ts");
  checkYear(loc, "ts");
  const weekday = weekdayOf(loc.days);
  const local = localStr(loc, off);
  const iso = isoStr(utc, frac);
  const steps = [
    "نقطه شروع (زمان 0): 1970-01-01 00:00:00 UTC."
  ];
  if (isMs) steps.push({ text: "تبدیل میلی‌ثانیه به ثانیه با تقسیم بر 1000:", tex: `\\frac{${raw}}{1000} = ${secs}\\ s${frac ? ` + ${frac}\\ ms` : ""}` });
  steps.push({ text: "تعداد روزهای کامل از شروع دوره:", tex: `\\left\\lfloor \\frac{${secs}}{86400} \\right\\rfloor = ${utc.days}` });
  steps.push({ text: "ثانیه‌های باقی‌مانده در آن روز:", tex: `${secs} - (${utc.days})\\times 86400 = ${secs - utc.days * 86400}` });
  steps.push({ text: "تبدیل آن به ساعت و دقیقه و ثانیه:", tex: `${secs - utc.days * 86400} = ${utc.h}\\times 3600 + ${utc.mi}\\times 60 + ${utc.s}` });
  steps.push({ text: `اعمال اختلاف زمانی ${offLabel(offMin)}:`, tex: `${secs} + (${offMin * 60}) = ${localSec}` });
  steps.push(`تاریخ محلی: ${local}، و آن روز ${weekday} است.`);
  return {
    results: [
      { label: "ثانیه‌ها", value: String(secs) },
      { label: "به میلی‌ثانیه", value: String(secs * 1000 + frac) },
      { label: "قالب ISO در UTC", value: iso },
      { label: "تاریخ و زمان محلی", value: local },
      { label: "روز هفته", value: weekday }
    ],
    steps,
    copy: `${iso} = ${local} (${weekday})`
  };
}

function parseDate(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim().replace(/\s+/g, " ");
  if (s === "") fail("تاریخ را به قالب YYYY-MM-DD HH:MM:SS وارد کنید.", "date");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) fail("قالب تاریخ نادرست است. از YYYY-MM-DD یا YYYY-MM-DD HH:MM:SS استفاده کنید.", "date");
  return {
    y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]),
    h: m[4] === undefined ? 0 : Number(m[4]),
    mi: m[5] === undefined ? 0 : Number(m[5]),
    s: m[6] === undefined ? 0 : Number(m[6])
  };
}

function toTimestamp(input, offMin, off) {
  const t = parseDate(input.date);
  if (t.y < 1 || t.y > 9999) fail("سال باید بین 1 و 9999 باشد.", "date");
  if (t.mo < 1 || t.mo > 12) fail("ماه باید بین 1 و 12 باشد.", "date");
  if (t.d < 1 || t.d > daysInMonth(t.y, t.mo)) fail(`روز ${t.d} در ماه ${t.mo} سال ${t.y} وجود ندارد.`, "date");
  if (t.h > 23) fail("ساعت باید بین 0 و 23 باشد.", "date");
  if (t.mi > 59) fail("دقیقه‌ها باید بین 0 و 59 باشد.", "date");
  if (t.s > 59) fail("ثانیه‌ها باید بین 0 و 59 باشد.", "date");
  const days = daysFromCivil(t.y, t.mo, t.d);
  const localSec = days * 86400 + t.h * 3600 + t.mi * 60 + t.s;
  const utcSec = localSec - offMin * 60;
  const utc = parts(utcSec);
  checkYear(utc, "date");
  const local = localStr(parts(localSec), off);
  const weekday = weekdayOf(days);
  const steps = [
    { text: "تعداد روزها از 1970-01-01 تا این تاریخ:", tex: `D = ${days}` },
    { text: "تبدیل زمان محلی به ثانیه:", tex: `(${days})\\times 86400 + ${t.h}\\times 3600 + ${t.mi}\\times 60 + ${t.s} = ${localSec}` },
    { text: `کم کردن اختلاف زمانی ${offLabel(offMin)} برای رسیدن به UTC:`, tex: `${localSec} - (${offMin * 60}) = ${utcSec}` },
    `روز: ${weekday}.`
  ];
  return {
    results: [
      { label: "ثانیه‌ها", value: String(utcSec) },
      { label: "به میلی‌ثانیه", value: String(utcSec * 1000) },
      { label: "قالب ISO در UTC", value: isoStr(utc, 0) },
      { label: "تاریخ و زمان محلی", value: local },
      { label: "روز هفته", value: weekday }
    ],
    steps,
    copy: `${local} = ${utcSec} s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "جهت", ["toDate", "toTs"], "toDate");
  const tz = choice(input, "tz", "منطقه زمانی", TZ.map(([v]) => v), "+3");
  const offMin = Math.round(Number(tz) * 60);
  const off = offLabel(offMin);
  if (mode === "toTs") return toTimestamp(input, offMin, off);
  if (isBlank(input.ts)) fail("زمان یونیکس را وارد کنید.", "ts");
  return fromTimestamp(input, offMin, off);
}
