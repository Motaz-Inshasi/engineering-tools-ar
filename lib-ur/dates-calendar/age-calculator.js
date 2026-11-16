import { fail, isBlank } from "../core/validate.js";
import { parseGregorian, todayUtc, toHijri, fromHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, DAY, WEEKDAYS, addMonths } from "./calendar.js";

export const meta = {
  description: "احسب عمرك بدقة بالسنوات والأشهر والأيام، وبالأيام والأسابيع والساعات، وعمرك بالهجري، واليوم الذي وُلدت فيه، وكم بقي على عيد ميلادك القادم بالتقويمين.",
  keywords: ["حساب العمر", "كم عمري", "age calculator", "تاريخ الميلاد", "عيد الميلاد", "العمر بالهجري", "العمر بالأيام"],
  formulas: [{ label: "العمر", tex: "\\text{Age} = t_{\\text{today}} - t_{\\text{birth}}" }],
  inputs: [
    { id: "birth", label: "تاريخ الميلاد", type: "text", default: "2000-05-15", help: "بالصيغة YYYY-MM-DD أو DD/MM/YYYY." },
    { id: "ref", label: "احسب العمر في تاريخ (اختياري)", type: "text", default: "", help: "اتركه فارغاً لاستخدام تاريخ اليوم." }
  ],
  example: { values: { birth: "2000-05-15", ref: "2026-11-13" }, expect: ["26 سنة و5 أشهر و29 يوماً"], note: "مثال: مولود في 15 مايو 2000، والعمر في 13 نوفمبر 2026." },
  invalid: { values: { birth: "2030-01-01", ref: "2026-01-01" } },
  related: ["date-difference", "hijri-converter", "bmi-bsa", "calorie-needs"]
};

export function solve(input) {
  const b = parseGregorian(input, "birth", "تاريخ الميلاد");
  const r = isBlank(input.ref) ? todayUtc() : parseGregorian(input, "ref", "تاريخ الحساب");
  if (b > r) fail("تاريخ الميلاد بعد تاريخ الحساب.", "birth");
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
    { label: "العمر", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "العمر بالهجري", value: `${hy} سنة هجرية تقريباً` },
    { label: "بالأشهر / الأسابيع / الأيام", value: `${totalMonths.toLocaleString("en-US")} شهراً / ${Math.floor(days / 7).toLocaleString("en-US")} أسبوعاً / ${days.toLocaleString("en-US")} يوماً` },
    { label: "بالساعات تقريباً", value: `${(days * 24).toLocaleString("en-US")} ساعة` },
    { label: "يوم الميلاد", value: `${WEEKDAYS[new Date(b).getUTCDay()]} — ${hLong(hb)}` },
    { label: "عيد الميلاد القادم", value: toNext === 0 ? "اليوم! كل عام وأنت بخير" : `${gLong(next)} (بعد ${daysW(toNext)})` }
  ];
  if (nh !== null) results.push({ label: "ذكرى الميلاد الهجرية القادمة", value: `${hLong(toHijri(nh))} = ${gLong(nh)}` });
  return {
    results,
    steps: [
      `من ${gLong(b)} إلى ${gLong(r)}.`,
      `نعدّ السنوات الكاملة ثم الأشهر الكاملة ثم الأيام المتبقية: ${ymdText(ymd)}.`,
      `إجمالي الأيام = ${days.toLocaleString("en-US")}، والسنة الهجرية أقصر من الميلادية بنحو 11 يوماً، لذلك العمر الهجري أكبر قليلاً (${hy}).`
    ],
    copy: `العمر في ${iso(r)}: ${ymdText(ymd)} (${days.toLocaleString("en-US")} يوماً)`
  };
}
