import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const TZ = [
  ["-12", "UTC-12"], ["-11", "UTC-11 (ساموا)"], ["-10", "UTC-10 (ہوائی)"], ["-9", "UTC-9 (الاسکا)"],
  ["-8", "UTC-8 (لاس اینجلس)"], ["-7", "UTC-7 (ڈینور)"], ["-6", "UTC-6 (میکسیکو سٹی)"], ["-5", "UTC-5 (نیویارک)"],
  ["-4", "UTC-4 (کاراکاس)"], ["-3", "UTC-3 (بیونس آئرس)"], ["-2", "UTC-2 (جنوبی بحر اوقیانوس)"], ["-1", "UTC-1 (آزورز)"],
  ["+0", "UTC+0 (UTC/گرین وچ)"], ["+1", "UTC+1 (لاگوس)"], ["+2", "UTC+2 (قاہرہ)"], ["+3", "UTC+3 (مکہ، ریاض، کویت)"],
  ["+3.5", "UTC+3:30 (تہران)"], ["+4", "UTC+4 (دبئی)"], ["+4.5", "UTC+4:30 (کابل)"], ["+5", "UTC+5 (کراچی)"],
  ["+5.5", "UTC+5:30 (نئی دہلی)"], ["+5.75", "UTC+5:45 (کھٹمنڈو)"], ["+6", "UTC+6 (ڈھاکہ)"], ["+6.5", "UTC+6:30 (یانگون)"],
  ["+7", "UTC+7 (بینکاک)"], ["+8", "UTC+8 (بیجنگ، سنگاپور)"], ["+9", "UTC+9 (ٹوکیو)"], ["+9.5", "UTC+9:30 (ایڈیلیڈ)"],
  ["+10", "UTC+10 (سڈنی)"], ["+11", "UTC+11 (سولومن آئی لینڈز)"], ["+12", "UTC+12 (آکلینڈ)"], ["+13", "UTC+13 (ٹونگا)"],
  ["+14", "UTC+14 (کریتیماتی)"]
];

const WEEKDAYS = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MAX_SECONDS = 2.6e11;

export const meta = {
  description: "Unix ٹائم اسٹیمپ کو سیکنڈ یا ملی سیکنڈ سے منتخب ٹائم زون کی تاریخ اور وقت میں بدلیں، یا تاریخ اور وقت کو ٹائم اسٹیمپ میں بدلیں، ساتھ میں ISO UTC وقت، ہفتے کا دن اور حساب کے مراحل۔",
  keywords: ["ٹائم اسٹیمپ", "unix timestamp", "epoch", "Unix", "سیکنڈ", "ملی سیکنڈ", "تاریخ", "ISO 8601", "UTC", "ٹائم زون"],
  formulas: [
    { label: "ٹائم اسٹیمپ سے تاریخ تک", tex: "D = \\left\\lfloor \\frac{t}{86400} \\right\\rfloor,\\qquad r = t - 86400\\,D" },
    { label: "تاریخ سے ٹائم اسٹیمپ تک", tex: "t = 86400\\,D + 3600\\,h + 60\\,m + s - \\text{offset}" }
  ],
  inputs: [
    { id: "mode", label: "سمت", type: "select", default: "toDate", options: [["toDate", "ٹائم اسٹیمپ ← تاریخ"], ["toTs", "تاریخ ← ٹائم اسٹیمپ"]] },
    { id: "ts", label: "ٹائم اسٹیمپ", type: "text", default: "1700000000", help: "یونٹ کے مطابق سیکنڈ یا ملی سیکنڈ میں ایک مکمل عدد۔", when: { mode: ["toDate"] } },
    { id: "unit", label: "یونٹ", type: "select", default: "auto", options: [["auto", "خودکار"], ["s", "سیکنڈ (s)"], ["ms", "ملی سیکنڈ (ms)"]], when: { mode: ["toDate"] } },
    { id: "date", label: "تاریخ اور وقت", type: "text", default: "2000-01-01 00:00:00", help: "YYYY-MM-DD HH:MM:SS یا YYYY-MM-DD۔", when: { mode: ["toTs"] } },
    { id: "tz", label: "ٹائم زون", type: "select", default: "+3", options: TZ }
  ],
  example: { values: { mode: "toDate", ts: "1700000000", unit: "auto", date: "2000-01-01 00:00:00", tz: "+0" }, expect: ["2023-11-14T22:13:20Z"], note: "مثال: ٹائم اسٹیمپ 1700000000 کا UTC وقت۔" },
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
  if (p.y < 1 || p.y > 9999) fail("نتیجہ سپورٹڈ سالوں 1 تا 9999 کی حد سے باہر ہے۔", field);
}

function fromTimestamp(input, offMin, off) {
  const raw = num(input, "ts", "ٹائم اسٹیمپ", { integer: true });
  const unit = choice(input, "unit", "یونٹ", ["auto", "s", "ms"], "auto");
  const isMs = unit === "ms" || (unit === "auto" && String(Math.abs(raw)).length >= 12);
  const ms = isMs ? raw : raw * 1000;
  const secs = Math.floor(ms / 1000);
  const frac = ms - secs * 1000;
  if (Math.abs(secs) > MAX_SECONDS) fail("ٹائم اسٹیمپ سپورٹڈ سالوں 1 تا 9999 کی حد سے باہر ہے۔", "ts");
  const utc = parts(secs);
  const localSec = secs + offMin * 60;
  const loc = parts(localSec);
  checkYear(utc, "ts");
  checkYear(loc, "ts");
  const weekday = weekdayOf(loc.days);
  const local = localStr(loc, off);
  const iso = isoStr(utc, frac);
  const steps = [
    "نقطۂ آغاز (ٹائم اسٹیمپ 0): 1970-01-01 00:00:00 UTC۔"
  ];
  if (isMs) steps.push({ text: "ملی سیکنڈ کو 1000 سے تقسیم کرکے سیکنڈ میں بدلیں:", tex: `\\frac{${raw}}{1000} = ${secs}\\ s${frac ? ` + ${frac}\\ ms` : ""}` });
  steps.push({ text: "دور کے آغاز سے مکمل دنوں کی تعداد:", tex: `\\left\\lfloor \\frac{${secs}}{86400} \\right\\rfloor = ${utc.days}` });
  steps.push({ text: "اس دن کے باقی سیکنڈ:", tex: `${secs} - (${utc.days})\\times 86400 = ${secs - utc.days * 86400}` });
  steps.push({ text: "انہیں گھنٹوں، منٹوں اور سیکنڈوں میں بدلیں:", tex: `${secs - utc.days * 86400} = ${utc.h}\\times 3600 + ${utc.mi}\\times 60 + ${utc.s}` });
  steps.push({ text: `ٹائم زون کا فرق ${offLabel(offMin)} لاگو کریں:`, tex: `${secs} + (${offMin * 60}) = ${localSec}` });
  steps.push(`مقامی تاریخ: ${local}، اور یہ ${weekday} ہے۔`);
  return {
    results: [
      { label: "سیکنڈ", value: String(secs) },
      { label: "ملی سیکنڈ میں", value: String(secs * 1000 + frac) },
      { label: "ISO UTC وقت", value: iso },
      { label: "مقامی تاریخ اور وقت", value: local },
      { label: "ہفتے کا دن", value: weekday }
    ],
    steps,
    copy: `${iso} = ${local} (${weekday})`
  };
}

function parseDate(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim().replace(/\s+/g, " ");
  if (s === "") fail("تاریخ YYYY-MM-DD HH:MM:SS کی شکل میں درج کریں۔", "date");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) fail("تاریخ کی شکل درست نہیں ہے۔ YYYY-MM-DD یا YYYY-MM-DD HH:MM:SS استعمال کریں۔", "date");
  return {
    y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]),
    h: m[4] === undefined ? 0 : Number(m[4]),
    mi: m[5] === undefined ? 0 : Number(m[5]),
    s: m[6] === undefined ? 0 : Number(m[6])
  };
}

function toTimestamp(input, offMin, off) {
  const t = parseDate(input.date);
  if (t.y < 1 || t.y > 9999) fail("سال 1 اور 9999 کے درمیان ہونا چاہیے۔", "date");
  if (t.mo < 1 || t.mo > 12) fail("مہینہ 1 اور 12 کے درمیان ہونا چاہیے۔", "date");
  if (t.d < 1 || t.d > daysInMonth(t.y, t.mo)) fail(`دن ${t.d} سال ${t.y} کے مہینے ${t.mo} میں موجود نہیں ہے۔`, "date");
  if (t.h > 23) fail("گھنٹہ 0 اور 23 کے درمیان ہونا چاہیے۔", "date");
  if (t.mi > 59) fail("منٹ 0 اور 59 کے درمیان ہونے چاہئیں۔", "date");
  if (t.s > 59) fail("سیکنڈ 0 اور 59 کے درمیان ہونے چاہئیں۔", "date");
  const days = daysFromCivil(t.y, t.mo, t.d);
  const localSec = days * 86400 + t.h * 3600 + t.mi * 60 + t.s;
  const utcSec = localSec - offMin * 60;
  const utc = parts(utcSec);
  checkYear(utc, "date");
  const local = localStr(parts(localSec), off);
  const weekday = weekdayOf(days);
  const steps = [
    { text: "اس تاریخ تک 1970-01-01 سے دنوں کی تعداد:", tex: `D = ${days}` },
    { text: "مقامی وقت کو سیکنڈ میں بدلیں:", tex: `(${days})\\times 86400 + ${t.h}\\times 3600 + ${t.mi}\\times 60 + ${t.s} = ${localSec}` },
    { text: `UTC وقت حاصل کرنے کے لیے ٹائم زون کا فرق ${offLabel(offMin)} منہا کریں:`, tex: `${localSec} - (${offMin * 60}) = ${utcSec}` },
    `دن: ${weekday}۔`
  ];
  return {
    results: [
      { label: "سیکنڈ", value: String(utcSec) },
      { label: "ملی سیکنڈ میں", value: String(utcSec * 1000) },
      { label: "ISO UTC وقت", value: isoStr(utc, 0) },
      { label: "مقامی تاریخ اور وقت", value: local },
      { label: "ہفتے کا دن", value: weekday }
    ],
    steps,
    copy: `${local} = ${utcSec} s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "سمت", ["toDate", "toTs"], "toDate");
  const tz = choice(input, "tz", "ٹائم زون", TZ.map(([v]) => v), "+3");
  const offMin = Math.round(Number(tz) * 60);
  const off = offLabel(offMin);
  if (mode === "toTs") return toTimestamp(input, offMin, off);
  if (isBlank(input.ts)) fail("ٹائم اسٹیمپ درج کریں۔", "ts");
  return fromTimestamp(input, offMin, off);
}
