import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const TZ = [
  ["-12", "UTC-12"], ["-11", "UTC-11 (Samoa)"], ["-10", "UTC-10 (Hawaii)"], ["-9", "UTC-9 (Alaska)"],
  ["-8", "UTC-8 (Los Angeles)"], ["-7", "UTC-7 (Denver)"], ["-6", "UTC-6 (Mexico City)"], ["-5", "UTC-5 (New York)"],
  ["-4", "UTC-4 (Caracas)"], ["-3", "UTC-3 (Buenos Aires)"], ["-2", "UTC-2 (South Atlantic)"], ["-1", "UTC-1 (Azores)"],
  ["+0", "UTC+0 (UTC/Greenwich)"], ["+1", "UTC+1 (Lagos)"], ["+2", "UTC+2 (Cairo)"], ["+3", "UTC+3 (Mecca, Riyadh, Kuwait)"],
  ["+3.5", "UTC+3:30 (Tehran)"], ["+4", "UTC+4 (Dubai)"], ["+4.5", "UTC+4:30 (Kabul)"], ["+5", "UTC+5 (Karachi)"],
  ["+5.5", "UTC+5:30 (New Delhi)"], ["+5.75", "UTC+5:45 (Kathmandu)"], ["+6", "UTC+6 (Dhaka)"], ["+6.5", "UTC+6:30 (Yangon)"],
  ["+7", "UTC+7 (Bangkok)"], ["+8", "UTC+8 (Beijing, Singapore)"], ["+9", "UTC+9 (Tokyo)"], ["+9.5", "UTC+9:30 (Adelaide)"],
  ["+10", "UTC+10 (Sydney)"], ["+11", "UTC+11 (Solomon Islands)"], ["+12", "UTC+12 (Auckland)"], ["+13", "UTC+13 (Tonga)"],
  ["+14", "UTC+14 (Kiritimati)"]
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MAX_SECONDS = 2.6e11;

export const meta = {
  description: "Convert a Unix timestamp in seconds or milliseconds to a date and time in a chosen time zone, or convert a date and time to a timestamp, with the ISO UTC time, the weekday in Arabic, and the calculation steps.",
  keywords: ["Unix timestamp", "unix timestamp", "epoch", "Unix", "seconds", "milliseconds", "date", "ISO 8601", "UTC", "time zone"],
  formulas: [
    { label: "From timestamp to date", tex: "D = \\left\\lfloor \\frac{t}{86400} \\right\\rfloor,\\qquad r = t - 86400\\,D" },
    { label: "From date to timestamp", tex: "t = 86400\\,D + 3600\\,h + 60\\,m + s - \\text{offset}" }
  ],
  inputs: [
    { id: "mode", label: "Direction", type: "select", default: "toDate", options: [["toDate", "Timestamp → date"], ["toTs", "Date → timestamp"]] },
    { id: "ts", label: "Timestamp", type: "text", default: "1700000000", help: "An integer in seconds or milliseconds, depending on the unit.", when: { mode: ["toDate"] } },
    { id: "unit", label: "Unit", type: "select", default: "auto", options: [["auto", "Auto"], ["s", "Seconds (s)"], ["ms", "Milliseconds (ms)"]], when: { mode: ["toDate"] } },
    { id: "date", label: "Date and time", type: "text", default: "2000-01-01 00:00:00", help: "YYYY-MM-DD HH:MM:SS or YYYY-MM-DD.", when: { mode: ["toTs"] } },
    { id: "tz", label: "Time zone", type: "select", default: "+3", options: TZ }
  ],
  example: { values: { mode: "toDate", ts: "1700000000", unit: "auto", date: "2000-01-01 00:00:00", tz: "+0" }, expect: ["2023-11-14T22:13:20Z"], note: "Example: timestamp 1700000000 in UTC." },
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
  if (p.y < 1 || p.y > 9999) fail("The result is outside the supported year range of 1 to 9999.", field);
}

function fromTimestamp(input, offMin, off) {
  const raw = num(input, "ts", "Timestamp", { integer: true });
  const unit = choice(input, "unit", "Unit", ["auto", "s", "ms"], "auto");
  const isMs = unit === "ms" || (unit === "auto" && String(Math.abs(raw)).length >= 12);
  const ms = isMs ? raw : raw * 1000;
  const secs = Math.floor(ms / 1000);
  const frac = ms - secs * 1000;
  if (Math.abs(secs) > MAX_SECONDS) fail("The timestamp is outside the supported year range of 1 to 9999.", "ts");
  const utc = parts(secs);
  const localSec = secs + offMin * 60;
  const loc = parts(localSec);
  checkYear(utc, "ts");
  checkYear(loc, "ts");
  const weekday = weekdayOf(loc.days);
  const local = localStr(loc, off);
  const iso = isoStr(utc, frac);
  const steps = [
    "Starting point (timestamp 0): 1970-01-01 00:00:00 UTC."
  ];
  if (isMs) steps.push({ text: "Convert milliseconds to seconds by dividing by 1000:", tex: `\\frac{${raw}}{1000} = ${secs}\\ s${frac ? ` + ${frac}\\ ms` : ""}` });
  steps.push({ text: "Number of full days since the epoch:", tex: `\\left\\lfloor \\frac{${secs}}{86400} \\right\\rfloor = ${utc.days}` });
  steps.push({ text: "Remaining seconds in that day:", tex: `${secs} - (${utc.days})\\times 86400 = ${secs - utc.days * 86400}` });
  steps.push({ text: "Convert them to hours, minutes, and seconds:", tex: `${secs - utc.days * 86400} = ${utc.h}\\times 3600 + ${utc.mi}\\times 60 + ${utc.s}` });
  steps.push({ text: `Apply the time zone offset ${offLabel(offMin)}:`, tex: `${secs} + (${offMin * 60}) = ${localSec}` });
  steps.push(`Local date: ${local}, which is a ${weekday}.`);
  return {
    results: [
      { label: "Seconds", value: String(secs) },
      { label: "In milliseconds", value: String(secs * 1000 + frac) },
      { label: "ISO 8601 (UTC)", value: iso },
      { label: "Local date and time", value: local },
      { label: "Day of week", value: weekday }
    ],
    steps,
    copy: `${iso} = ${local} (${weekday})`
  };
}

function parseDate(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim().replace(/\s+/g, " ");
  if (s === "") fail("Enter the date in the format YYYY-MM-DD HH:MM:SS.", "date");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) fail("Invalid date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS.", "date");
  return {
    y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]),
    h: m[4] === undefined ? 0 : Number(m[4]),
    mi: m[5] === undefined ? 0 : Number(m[5]),
    s: m[6] === undefined ? 0 : Number(m[6])
  };
}

function toTimestamp(input, offMin, off) {
  const t = parseDate(input.date);
  if (t.y < 1 || t.y > 9999) fail("The year must be between 1 and 9999.", "date");
  if (t.mo < 1 || t.mo > 12) fail("The month must be between 1 and 12.", "date");
  if (t.d < 1 || t.d > daysInMonth(t.y, t.mo)) fail(`Day ${t.d} does not exist in month ${t.mo} of year ${t.y}.`, "date");
  if (t.h > 23) fail("The hour must be between 0 and 23.", "date");
  if (t.mi > 59) fail("The minutes must be between 0 and 59.", "date");
  if (t.s > 59) fail("The seconds must be between 0 and 59.", "date");
  const days = daysFromCivil(t.y, t.mo, t.d);
  const localSec = days * 86400 + t.h * 3600 + t.mi * 60 + t.s;
  const utcSec = localSec - offMin * 60;
  const utc = parts(utcSec);
  checkYear(utc, "date");
  const local = localStr(parts(localSec), off);
  const weekday = weekdayOf(days);
  const steps = [
    { text: "Number of days since 1970-01-01 for this date:", tex: `D = ${days}` },
    { text: "Convert the local time to seconds:", tex: `(${days})\\times 86400 + ${t.h}\\times 3600 + ${t.mi}\\times 60 + ${t.s} = ${localSec}` },
    { text: `Subtract the time zone offset ${offLabel(offMin)} to get UTC:`, tex: `${localSec} - (${offMin * 60}) = ${utcSec}` },
    `Day: ${weekday}.`
  ];
  return {
    results: [
      { label: "Seconds", value: String(utcSec) },
      { label: "In milliseconds", value: String(utcSec * 1000) },
      { label: "ISO 8601 (UTC)", value: isoStr(utc, 0) },
      { label: "Local date and time", value: local },
      { label: "Day of week", value: weekday }
    ],
    steps,
    copy: `${local} = ${utcSec} s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Direction", ["toDate", "toTs"], "toDate");
  const tz = choice(input, "tz", "Time zone", TZ.map(([v]) => v), "+3");
  const offMin = Math.round(Number(tz) * 60);
  const off = offLabel(offMin);
  if (mode === "toTs") return toTimestamp(input, offMin, off);
  if (isBlank(input.ts)) fail("Enter the timestamp.", "ts");
  return fromTimestamp(input, offMin, off);
}
