import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

export const DAY = 86400000;
export const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const G_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const H_MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
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
  else fail(`اكتب ${label} بالصيغة YYYY-MM-DD مثل 2026-03-20، أو DD/MM/YYYY.`, key);
  if (y < 1 || y > 9999) fail(`السنة في ${label} خارج المدى المدعوم.`, key);
  const t = utc(y, mo, d);
  const dt = new Date(t);
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail(`${label}: هذا التاريخ غير موجود في التقويم (تحقق من اليوم والشهر).`, key);
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
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${G_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}م`;
}

export function hLong(h) {
  return `${h.d} ${H_MONTHS[h.m - 1]} ${h.y}هـ`;
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

export const yearsW = (n) => plural(n, "سنة واحدة", "سنتان", "سنوات", "سنة");
export const monthsW = (n) => plural(n, "شهر واحد", "شهران", "أشهر", "شهراً");
export const daysW = (n) => plural(n, "يوم واحد", "يومان", "أيام", "يوماً");
export const weeksW = (n) => plural(n, "أسبوع واحد", "أسبوعان", "أسابيع", "أسبوعاً");

export function ymdText({ y, m, d }) {
  const parts = [];
  if (y) parts.push(yearsW(y));
  if (m) parts.push(monthsW(m));
  if (d || !parts.length) parts.push(daysW(d));
  return parts.join(" و");
}
