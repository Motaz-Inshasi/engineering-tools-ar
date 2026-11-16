import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

export const DAY = 86400000;
export const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const G_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const H_MONTHS = ["Muharram", "Safar", "Rabía al-Awwal", "Rabía al-Zani", "Yumada al-Ula", "Yumada al-Ájira", "Rayab", "Shaabán", "Ramadán", "Shawwal", "Dhu al-Qada", "Dhu al-Hiyya"];
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
  else fail(`Escriba ${label} con el formato YYYY-MM-DD, por ejemplo 2026-03-20, o DD/MM/YYYY.`, key);
  if (y < 1 || y > 9999) fail(`El año en ${label} está fuera del rango admitido.`, key);
  const t = utc(y, mo, d);
  const dt = new Date(t);
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail(`${label}: esta fecha no existe en el calendario (revise el día y el mes).`, key);
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
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${G_MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()} d. C.`;
}

export function hLong(h) {
  return `${h.d} de ${H_MONTHS[h.m - 1]} de ${h.y} AH`;
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

export const yearsW = (n) => plural(n, "un año", "dos años", "años", "años");
export const monthsW = (n) => plural(n, "un mes", "dos meses", "meses", "meses");
export const daysW = (n) => plural(n, "un día", "dos días", "días", "días");
export const weeksW = (n) => plural(n, "una semana", "dos semanas", "semanas", "semanas");

export function ymdText({ y, m, d }) {
  const parts = [];
  if (y) parts.push(yearsW(y));
  if (m) parts.push(monthsW(m));
  if (d || !parts.length) parts.push(daysW(d));
  return parts.join(", ");
}
