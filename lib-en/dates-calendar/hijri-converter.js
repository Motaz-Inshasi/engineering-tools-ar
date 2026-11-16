import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { toHijri, fromHijri, hijriMonthLength, parseGregorian, iso, gLong, hLong, H_MONTHS, H_MIN, H_MAX, DAY } from "./calendar.js";

export const meta = {
  description: "Converts a date from Gregorian to Hijri and from Hijri to Gregorian according to the Umm al-Qura calendar, with the weekday, the number of days in the Hijri month, and a table of all the days of the month.",
  keywords: ["Date conversion", "Hijri", "Gregorian", "Hijri calendar", "Umm al-Qura", "hijri", "islamic calendar", "today's date in Hijri", "Ramadan", "Hijri–Gregorian conversion"],
  formulas: [{ label: "Length of the Hijri year and the lunar month, approximately", tex: "\\bar{Y}_H \\approx 354.367\\ \\text{days},\\qquad \\bar{M} \\approx 29.5306\\ \\text{days}" }],
  inputs: [
    { id: "dir", label: "Direction", type: "select", default: "g2h", options: [["g2h", "From Gregorian to Hijri"], ["h2g", "From Hijri to Gregorian"]] },
    { id: "gdate", label: "Gregorian date", type: "text", default: "2026-03-20", help: "In the format YYYY-MM-DD or DD/MM/YYYY.", when: { dir: ["g2h"] } },
    { id: "hy", label: "Hijri year", type: "number", default: "1447", when: { dir: ["h2g"] } },
    { id: "hm", label: "Hijri month", type: "select", default: "9", options: H_MONTHS.map((n, i) => [String(i + 1), `${i + 1} - ${n}`]), when: { dir: ["h2g"] } },
    { id: "hd", label: "Day", type: "number", default: "1", when: { dir: ["h2g"] } }
  ],
  example: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "1" }, expect: ["1 Ramadan 1447 AH = Wednesday 18 February 2026 AD"], note: "Example: when does Ramadan 1447 AH begin according to the Umm al-Qura calendar?" },
  invalid: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "31" } },
  related: ["date-difference", "age-calculator", "study-planner", "zakat"]
};

export function solve(input) {
  const dir = choice(input, "dir", "Direction", ["g2h", "h2g"], "g2h");
  let t, h;
  const steps = [];
  if (dir === "g2h") {
    t = parseGregorian(input, "gdate", "Gregorian date");
    h = toHijri(t);
    if (h.y < H_MIN || h.y > H_MAX) fail(`The supported range is from ${H_MIN} to ${H_MAX} AH (approximately 1882 to 2174 AD).`, "gdate");
    steps.push(`We count the days from the start of the Hijri calendar up to ${iso(t)} and match them with the Umm al-Qura tables of month lengths.`);
  } else {
    const y = num(input, "hy", "Hijri year", { integer: true, min: H_MIN, max: H_MAX });
    const m = Number(choice(input, "hm", "Hijri month", H_MONTHS.map((_, i) => String(i + 1)), "1"));
    const d = num(input, "hd", "Day", { integer: true, min: 1, max: 30 });
    const len = hijriMonthLength(y, m);
    if (d > len) fail(`Month ${H_MONTHS[m - 1]} ${y} AH has only ${len} days.`, "hd");
    t = fromHijri(y, m, d);
    if (t === null) fail("This date could not be converted.", "hy");
    h = { y, m, d };
    steps.push(`We estimate the Gregorian position using the average lunar month length (29.53 days), then correct the estimate by matching the Umm al-Qura tables day by day.`);
  }
  const len = hijriMonthLength(h.y, h.m);
  const start = t - (h.d - 1) * DAY;
  steps.push(`Month ${H_MONTHS[h.m - 1]} ${h.y} AH has ${len} days, and starts on ${gLong(start)}.`);
  steps.push("The actual start of the month may differ by one day in some countries that rely on moon sighting.");
  const line = `${hLong(h)} = ${gLong(t)}`;
  const rows = [];
  for (let i = 0; i < len; i++) {
    const tt = start + i * DAY;
    rows.push([`${i + 1} ${H_MONTHS[h.m - 1]}`, gLong(tt), i + 1 === h.d ? "◀" : ""]);
  }
  return {
    results: [
      { label: "Hijri date", value: hLong(h) },
      { label: "Gregorian date", value: gLong(t) },
      { label: "In numbers", value: `${h.y}/${String(h.m).padStart(2, "0")}/${String(h.d).padStart(2, "0")} AH — ${iso(t)}` },
      { label: `Number of days in ${H_MONTHS[h.m - 1]} ${h.y} AH`, value: `${len} days` }
    ],
    steps,
    blocks: [{ type: "table", caption: `Days of ${H_MONTHS[h.m - 1]} ${h.y} AH`, head: ["Hijri", "Gregorian", ""], rows }],
    copy: line
  };
}

