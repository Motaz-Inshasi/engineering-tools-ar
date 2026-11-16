import { fail, isBlank } from "../core/validate.js";
import { parseGregorian, todayUtc, toHijri, fromHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, DAY, WEEKDAYS, addMonths } from "./calendar.js";

export const meta = {
  description: "Calculate your exact age in years, months, and days, in days, weeks, and hours, your age in Hijri years, the day of the week you were born, and how many days remain until your next birthday in both calendars.",
  keywords: ["Age calculator", "how old am I", "age calculator", "date of birth", "birthday", "age in Hijri years", "age in days"],
  formulas: [{ label: "Age", tex: "\\text{Age} = t_{\\text{today}} - t_{\\text{birth}}" }],
  inputs: [
    { id: "birth", label: "date of birth", type: "text", default: "2000-05-15", help: "In the format YYYY-MM-DD or DD/MM/YYYY." },
    { id: "ref", label: "Calculate age on a date (optional)", type: "text", default: "", help: "Leave empty to use today's date." }
  ],
  example: { values: { birth: "2000-05-15", ref: "2026-11-13" }, expect: ["26 years, 5 months, and 29 days"], note: "Example: born on 15 May 2000, with the age on 13 November 2026." },
  invalid: { values: { birth: "2030-01-01", ref: "2026-01-01" } },
  related: ["date-difference", "hijri-converter", "bmi-bsa", "calorie-needs"]
};

export function solve(input) {
  const b = parseGregorian(input, "birth", "date of birth");
  const r = isBlank(input.ref) ? todayUtc() : parseGregorian(input, "ref", "Calculation date");
  if (b > r) fail("The birth date is after the calculation date.", "birth");
  const ymd = diffYMD(b, r);
  const days = Math.round((r - b) / DAY);
  const hb = toHijri(b), hr = toHijri(r);
  let hy = hr.y - hb.y;
  if (hr.m < hb.m || (hr.m === hb.m && hr.d < hb.d)) hy--;
  const totalMonths = ymd.y * 12 + ymd.m;
  let next = addMonths(b, (ymd.y + 1) * 12);
  if (ymd.m === 0 && ymd.d === 0) next = r;
  const toNext = Math.round((next - r) / DAY);
  let nh = null;
  for (let y = hr.y; y <= hr.y + 1 && nh === null; y++) {
    const t = fromHijri(y, hb.m, Math.min(hb.d, 29));
    if (t !== null && t >= r) nh = t;
  }
  const results = [
    { label: "Age", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "age in Hijri years", value: `About ${hy} Hijri years` },
    { label: "In months / weeks / days", value: `${totalMonths.toLocaleString("en-US")} months / ${Math.floor(days / 7).toLocaleString("en-US")} weeks / ${days.toLocaleString("en-US")} days` },
    { label: "Approximately in hours", value: `${(days * 24).toLocaleString("en-US")} hours` },
    { label: "Day of birth", value: `${WEEKDAYS[new Date(b).getUTCDay()]} — ${hLong(hb)}` },
    { label: "Next birthday", value: toNext === 0 ? "Today! Happy birthday" : `${gLong(next)} (in ${daysW(toNext)})` }
  ];
  if (nh !== null) results.push({ label: "Next Hijri birthday", value: `${hLong(toHijri(nh))} = ${gLong(nh)}` });
  return {
    results,
    steps: [
      `From ${gLong(b)} to ${gLong(r)}.`,
      `We count the full years, then the full months, then the remaining days: ${ymdText(ymd)}.`,
      `Total days = ${days.toLocaleString("en-US")}. The Hijri year is about 11 days shorter than the Gregorian year, so the Hijri age is slightly larger (${hy}).`
    ],
    copy: `Age on ${iso(r)}: ${ymdText(ymd)} (${days.toLocaleString("en-US")} days)`
  };
}
