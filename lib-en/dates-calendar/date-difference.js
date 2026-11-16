import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseGregorian, toHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, weeksW, DAY, WEEKDAYS } from "./calendar.js";

export const meta = {
  description: "Calculates the duration between two dates in years, months, and days, and in days, weeks, and working days, or adds a number of days to a date or subtracts them to find the resulting date and its weekday.",
  keywords: ["difference between two dates", "number of days between two dates", "duration calculation", "add days", "date difference", "days between dates", "working days", "how many days"],
  formulas: [{ label: "Duration in days", tex: "\\Delta = \\frac{t_2 - t_1}{86400\\ \\text{s}}" }],
  inputs: [
    { id: "mode", label: "Operation", type: "select", default: "diff", options: [["diff", "difference between two dates"], ["add", "Add or subtract days"]] },
    { id: "d1", label: "First date (or start)", type: "text", default: "2026-01-01", help: "In the format YYYY-MM-DD or DD/MM/YYYY." },
    { id: "d2", label: "Second date", type: "text", default: "2026-12-31", when: { mode: ["diff"] } },
    { id: "inclusive", label: "Include the end day in the duration", type: "checkbox", default: "", when: { mode: ["diff"] } },
    { id: "weekend", label: "Weekend (for working-day calculation)", type: "select", default: "fs", options: [["fs", "Friday and Saturday"], ["ss", "Saturday and Sunday"], ["f", "Friday only"], ["none", "No weekend"]], when: { mode: ["diff"] } },
    { id: "days", label: "Number of days (negative to subtract)", type: "number", default: "100", when: { mode: ["add"] } }
  ],
  example: { values: { mode: "diff", d1: "2026-01-01", d2: "2026-12-31", inclusive: "", weekend: "fs", days: "" }, expect: ["364 days", "11 months and 30 days"], note: "Example: how many days are there between the start and end of 2026?" },
  invalid: { values: { mode: "diff", d1: "2026-02-30", d2: "2026-12-31" } },
  related: ["age-calculator", "hijri-converter", "study-planner"]
};

const WEEKENDS = { fs: [5, 6], ss: [6, 0], f: [5], none: [] };

export function solve(input) {
  const mode = choice(input, "mode", "Operation", ["diff", "add"], "diff");
  const a = parseGregorian(input, "d1", "First date");
  if (mode === "add") {
    const k = num(input, "days", "Number of days", { integer: true, min: -1000000, max: 1000000 });
    const t = a + k * DAY;
    if (new Date(t).getUTCFullYear() < 1 || new Date(t).getUTCFullYear() > 9999) fail("The resulting date is outside the supported range.", "days");
    const h = toHijri(t);
    return {
      results: [
        { label: "Resulting date", value: gLong(t), text: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} days = ${iso(t)}` },
        { label: "In Hijri (Umm al-Qura)", value: hLong(h) },
        { label: "Weekday", value: WEEKDAYS[new Date(t).getUTCDay()] }
      ],
      steps: [
        `We convert ${iso(a)} to a serial day number, then ${k >= 0 ? "add" : "subtract"} ${daysW(Math.abs(k))}.`,
        `The calculation automatically accounts for month lengths and leap years (February has 29 days in a leap year).`,
        `Result: ${gLong(t)}.`
      ],
      copy: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} days = ${iso(t)}`
    };
  }
  const b = parseGregorian(input, "d2", "Second date");
  const inc = !isBlank(input.inclusive) && input.inclusive !== "0";
  const we = WEEKENDS[choice(input, "weekend", "Weekend", Object.keys(WEEKENDS), "fs")];
  const [s, e] = a <= b ? [a, b] : [b, a];
  const n = Math.round((e - s) / DAY) + (inc ? 1 : 0);
  const ymd = diffYMD(s, inc ? e + DAY : e);
  const full = Math.floor(n / 7), rem = n % 7;
  let work = full * (7 - we.length);
  const sd = new Date(s).getUTCDay();
  for (let i = 0; i < rem; i++) if (!we.includes((sd + full * 7 + i) % 7)) work++;
  const results = [
    { label: "Duration in days", value: daysW(n), text: `${iso(s)} → ${iso(e)}: ${daysW(n)}` },
    { label: "In years, months, and days", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "In weeks", value: `${weeksW(full)}${rem ? ` and ${daysW(rem)}` : ""}` },
    { label: "working days", value: daysW(work) },
    { label: "In hours", value: `${(n * 24).toLocaleString("en-US")} hours` }
  ];
  const steps = [
    a > b ? "The first date is after the second, so we swapped them to calculate a positive duration." : `From ${gLong(s)} to ${gLong(e)}.`,
    `Number of days = difference between the two day numbers${inc ? " + 1 (to include the end day)" : ""} = ${n}.`,
    `We count the full months first, then the remaining days: ${ymdText(ymd)}.`,
    `Working days: we exclude the weekly weekend days (${we.length ? we.map((d) => WEEKDAYS[d]).join(" and ") : "none"}) but not official holidays.`
  ];
  return { results, steps, copy: `${iso(s)} → ${iso(e)}: ${daysW(n)} (${ymdText(ymd)})` };
}
