import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { toHijri, fromHijri, hijriMonthLength, parseGregorian, iso, gLong, hLong, H_MONTHS, H_MIN, H_MAX, DAY } from "./calendar.js";

export const meta = {
  description: "حوّل التاريخ من الميلادي إلى الهجري ومن الهجري إلى الميلادي وفق تقويم أم القرى، مع اسم اليوم وعدد أيام الشهر الهجري، وجدول بأيام الشهر كاملة.",
  keywords: ["تحويل التاريخ", "هجري", "ميلادي", "التقويم الهجري", "أم القرى", "hijri", "islamic calendar", "تاريخ اليوم بالهجري", "رمضان", "تحويل هجري ميلادي"],
  formulas: [{ label: "طول السنة الهجرية والشهر القمري تقريباً", tex: "\\bar{Y}_H \\approx 354.367\\ \\text{يوماً},\\qquad \\bar{M} \\approx 29.5306\\ \\text{يوماً}" }],
  inputs: [
    { id: "dir", label: "الاتجاه", type: "select", default: "g2h", options: [["g2h", "من الميلادي إلى الهجري"], ["h2g", "من الهجري إلى الميلادي"]] },
    { id: "gdate", label: "التاريخ الميلادي", type: "text", default: "2026-03-20", help: "بالصيغة YYYY-MM-DD أو DD/MM/YYYY.", when: { dir: ["g2h"] } },
    { id: "hy", label: "السنة الهجرية", type: "number", default: "1447", when: { dir: ["h2g"] } },
    { id: "hm", label: "الشهر الهجري", type: "select", default: "9", options: H_MONTHS.map((n, i) => [String(i + 1), `${i + 1} - ${n}`]), when: { dir: ["h2g"] } },
    { id: "hd", label: "اليوم", type: "number", default: "1", when: { dir: ["h2g"] } }
  ],
  example: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "1" }, expect: ["1 رمضان 1447هـ = الأربعاء 18 فبراير 2026م"], note: "مثال: متى يبدأ رمضان 1447هـ وفق تقويم أم القرى؟" },
  invalid: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "31" } },
  related: ["date-difference", "age-calculator", "study-planner", "zakat"]
};

export function solve(input) {
  const dir = choice(input, "dir", "الاتجاه", ["g2h", "h2g"], "g2h");
  let t, h;
  const steps = [];
  if (dir === "g2h") {
    t = parseGregorian(input, "gdate", "التاريخ الميلادي");
    h = toHijri(t);
    if (h.y < H_MIN || h.y > H_MAX) fail(`المدى المدعوم من ${H_MIN} إلى ${H_MAX} هجرياً (تقريباً 1882 إلى 2174 ميلادياً).`, "gdate");
    steps.push(`نحسب عدد الأيام من بداية التقويم الهجري حتى ${iso(t)} ونطابقها مع جداول أم القرى لأطوال الشهور.`);
  } else {
    const y = num(input, "hy", "السنة الهجرية", { integer: true, min: H_MIN, max: H_MAX });
    const m = Number(choice(input, "hm", "الشهر الهجري", H_MONTHS.map((_, i) => String(i + 1)), "1"));
    const d = num(input, "hd", "اليوم", { integer: true, min: 1, max: 30 });
    const len = hijriMonthLength(y, m);
    if (d > len) fail(`شهر ${H_MONTHS[m - 1]} ${y}هـ عدد أيامه ${len} يوماً فقط.`, "hd");
    t = fromHijri(y, m, d);
    if (t === null) fail("تعذر تحويل هذا التاريخ.", "hy");
    h = { y, m, d };
    steps.push(`نقدّر الموضع الميلادي بمتوسط طول الشهر القمري (29.53 يوماً)، ثم نصحح التقدير بمطابقة جداول أم القرى يوماً بيوم.`);
  }
  const len = hijriMonthLength(h.y, h.m);
  const start = t - (h.d - 1) * DAY;
  steps.push(`شهر ${H_MONTHS[h.m - 1]} ${h.y}هـ عدد أيامه ${len} يوماً، ويبدأ يوم ${gLong(start)}.`);
  steps.push("بداية الشهر الفعلية قد تختلف يوماً واحداً في بعض الدول التي تعتمد رؤية الهلال.");
  const line = `${hLong(h)} = ${gLong(t)}`;
  const rows = [];
  for (let i = 0; i < len; i++) {
    const tt = start + i * DAY;
    rows.push([`${i + 1} ${H_MONTHS[h.m - 1]}`, gLong(tt), i + 1 === h.d ? "◀" : ""]);
  }
  return {
    results: [
      { label: "التاريخ الهجري", value: hLong(h) },
      { label: "التاريخ الميلادي", value: gLong(t) },
      { label: "بالأرقام", value: `${h.y}/${String(h.m).padStart(2, "0")}/${String(h.d).padStart(2, "0")}هـ — ${iso(t)}` },
      { label: `عدد أيام ${H_MONTHS[h.m - 1]} ${h.y}هـ`, value: `${len} يوماً` }
    ],
    steps,
    blocks: [{ type: "table", caption: `أيام شهر ${H_MONTHS[h.m - 1]} ${h.y}هـ`, head: ["الهجري", "الميلادي", ""], rows }],
    copy: line
  };
}

