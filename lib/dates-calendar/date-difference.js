import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseGregorian, toHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, weeksW, DAY, WEEKDAYS } from "./calendar.js";

export const meta = {
  description: "احسب المدة بين تاريخين بالسنوات والأشهر والأيام وبالأيام والأسابيع وأيام العمل، أو أضف عدداً من الأيام إلى تاريخ واطرحه منه لمعرفة التاريخ الناتج واليوم الموافق.",
  keywords: ["الفرق بين تاريخين", "عدد الأيام بين تاريخين", "حساب المدة", "إضافة أيام", "date difference", "days between dates", "أيام العمل", "كم يوم"],
  formulas: [{ label: "المدة بالأيام", tex: "\\Delta = \\frac{t_2 - t_1}{86400\\ \\text{s}}" }],
  inputs: [
    { id: "mode", label: "العملية", type: "select", default: "diff", options: [["diff", "الفرق بين تاريخين"], ["add", "إضافة أيام أو طرحها"]] },
    { id: "d1", label: "التاريخ الأول (أو البداية)", type: "text", default: "2026-01-01", help: "بالصيغة YYYY-MM-DD أو DD/MM/YYYY." },
    { id: "d2", label: "التاريخ الثاني", type: "text", default: "2026-12-31", when: { mode: ["diff"] } },
    { id: "inclusive", label: "احسب يوم النهاية ضمن المدة", type: "checkbox", default: "", when: { mode: ["diff"] } },
    { id: "weekend", label: "عطلة نهاية الأسبوع (لحساب أيام العمل)", type: "select", default: "fs", options: [["fs", "الجمعة والسبت"], ["ss", "السبت والأحد"], ["f", "الجمعة فقط"], ["none", "بدون عطلة"]], when: { mode: ["diff"] } },
    { id: "days", label: "عدد الأيام (سالب للطرح)", type: "number", default: "100", when: { mode: ["add"] } }
  ],
  example: { values: { mode: "diff", d1: "2026-01-01", d2: "2026-12-31", inclusive: "", weekend: "fs", days: "" }, expect: ["364 يوماً", "11 شهراً و30 يوماً"], note: "مثال: كم يوماً بين بداية سنة 2026 ونهايتها؟" },
  invalid: { values: { mode: "diff", d1: "2026-02-30", d2: "2026-12-31" } },
  related: ["age-calculator", "hijri-converter", "study-planner"]
};

const WEEKENDS = { fs: [5, 6], ss: [6, 0], f: [5], none: [] };

export function solve(input) {
  const mode = choice(input, "mode", "العملية", ["diff", "add"], "diff");
  const a = parseGregorian(input, "d1", "التاريخ الأول");
  if (mode === "add") {
    const k = num(input, "days", "عدد الأيام", { integer: true, min: -1000000, max: 1000000 });
    const t = a + k * DAY;
    if (new Date(t).getUTCFullYear() < 1 || new Date(t).getUTCFullYear() > 9999) fail("التاريخ الناتج خارج المدى المدعوم.", "days");
    const h = toHijri(t);
    return {
      results: [
        { label: "التاريخ الناتج", value: gLong(t), text: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} يوماً = ${iso(t)}` },
        { label: "بالهجري (أم القرى)", value: hLong(h) },
        { label: "اليوم", value: WEEKDAYS[new Date(t).getUTCDay()] }
      ],
      steps: [
        `نحوّل ${iso(a)} إلى رقم يوم متسلسل، ثم ${k >= 0 ? "نضيف" : "نطرح"} ${daysW(Math.abs(k))}.`,
        `يمر الحساب تلقائياً على أطوال الشهور والسنوات الكبيسة (فبراير 29 يوماً في السنة الكبيسة).`,
        `الناتج: ${gLong(t)}.`
      ],
      copy: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} يوماً = ${iso(t)}`
    };
  }
  const b = parseGregorian(input, "d2", "التاريخ الثاني");
  const inc = !isBlank(input.inclusive) && input.inclusive !== "0";
  const we = WEEKENDS[choice(input, "weekend", "عطلة نهاية الأسبوع", Object.keys(WEEKENDS), "fs")];
  const [s, e] = a <= b ? [a, b] : [b, a];
  const n = Math.round((e - s) / DAY) + (inc ? 1 : 0);
  const ymd = diffYMD(s, inc ? e + DAY : e);
  const full = Math.floor(n / 7), rem = n % 7;
  let work = full * (7 - we.length);
  const sd = new Date(s).getUTCDay();
  for (let i = 0; i < rem; i++) if (!we.includes((sd + full * 7 + i) % 7)) work++;
  const results = [
    { label: "المدة بالأيام", value: daysW(n), text: `${iso(s)} → ${iso(e)}: ${daysW(n)}` },
    { label: "بالسنوات والأشهر والأيام", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "بالأسابيع", value: `${weeksW(full)}${rem ? ` و${daysW(rem)}` : ""}` },
    { label: "أيام العمل", value: daysW(work) },
    { label: "بالساعات", value: `${(n * 24).toLocaleString("en-US")} ساعة` }
  ];
  const steps = [
    a > b ? "التاريخ الأول بعد الثاني، فبدّلنا ترتيبهما لحساب المدة موجبة." : `من ${gLong(s)} إلى ${gLong(e)}.`,
    `عدد الأيام = الفرق بين رقمي اليومين${inc ? " + 1 (لاحتساب يوم النهاية)" : ""} = ${n}.`,
    `نعدّ الأشهر الكاملة أولاً ثم الأيام المتبقية: ${ymdText(ymd)}.`,
    `أيام العمل: نستبعد أيام العطلة الأسبوعية (${we.length ? we.map((d) => WEEKDAYS[d]).join(" و") : "لا يوجد"}) دون العطل الرسمية.`
  ];
  return { results, steps, copy: `${iso(s)} → ${iso(e)}: ${daysW(n)} (${ymdText(ymd)})` };
}
