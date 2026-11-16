import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

export const DAY = 86400000;
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const G_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const H_MONTHS = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"];
export const H_MIN = 1300, H_MAX = 1600;

const FMT = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });

export function toHijri(t) {
  const p = Object.fromEntries(FMT.formatToParts(new Date(t)).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  return { y: parseInt(p.year, 10), m: Number(p.month), d: Number(p.day) };
}

export function fromHijri(y, m, d) {
  const approx = Date.UTC(622, 6, 16) + Math.round((y - 1) * 354.36707 + (m - 1) * 29.530589 + (d - 1)) * DAY;
  for (let k = -40; k <= 40; k++) {
    const t = approx + k * DAY;
    const h = toHijri(t);
    if (h.y === y && h.m === m && h.d === d) return t;
  }
  return null;
}

export function hijriMonthLength(y, m) {
  const t = fromHijri(y, m, 29);
  if (t === null) return null;
  const nx = toHijri(t + DAY);
  return nx.m === m ? 30 : 29;
}

export function utc(y, m, d) {
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t);
  if (y < 100) dt.setUTCFullYear(y);
  return dt.getTime();
}

export function parseGregorian(input, key, label) {
  const raw = normalizeDigits(str(input, key, label)).trim().replace(/[/.]/g, "-");
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y, mo, d;
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else fail(`Write ${label} in the format YYYY-MM-DD, such as 2026-03-20, or DD/MM/YYYY.`, key);
  if (y < 1 || y > 9999) fail(`The year in ${label} is outside the supported range.`, key);
  const t = utc(y, mo, d);
  const dt = new Date(t);
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail(`${label}: this date does not exist in the calendar (check the day and month).`, key);
  return t;
}

export function todayUtc() {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
}

export function iso(t) {
  const d = new Date(t);
  return `${String(d.getUTCFullYear()).padStart(4, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function gLong(t) {
  const d = new Date(t);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${G_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} AD`;
}

export function hLong(h) {
  return `${h.d} ${H_MONTHS[h.m - 1]} ${h.y} AH`;
}

export function addMonths(t, k) {
  const A = new Date(t);
  const y = A.getUTCFullYear(), m = A.getUTCMonth() + k;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(A.getUTCDate(), last));
}

export function diffYMD(a, b) {
  const A = new Date(a), B = new Date(b);
  let total = (B.getUTCFullYear() - A.getUTCFullYear()) * 12 + (B.getUTCMonth() - A.getUTCMonth());
  if (addMonths(a, total) > b) total--;
  const d = Math.round((b - addMonths(a, total)) / DAY);
  return { y: Math.floor(total / 12), m: total % 12, d };
}

export function plural(n, one, two, few, many) {
  if (n === 0) return `0 ${many}`;
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n.toLocaleString("en-US")} ${many}`;
}

export const yearsW = (n) => plural(n, "1 year", "2 years", "years", "years");
export const monthsW = (n) => plural(n, "1 month", "2 months", "months", "months");
export const daysW = (n) => plural(n, "1 day", "2 days", "days", "days");
export const weeksW = (n) => plural(n, "1 week", "2 weeks", "weeks", "weeks");

export function ymdText({ y, m, d }) {
  const parts = [];
  if (y) parts.push(yearsW(y));
  if (m) parts.push(monthsW(m));
  if (d || !parts.length) parts.push(daysW(d));
  return parts.join(" and ");
}
