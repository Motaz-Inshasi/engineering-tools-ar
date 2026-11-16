import { fail, isBlank } from "../core/validate.js";
import { parseGregorian, todayUtc, toHijri, fromHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, DAY, WEEKDAYS, addMonths } from "./calendar.js";

export const meta = {
  description: "محاسبه دقیق سن شما بر حسب سال و ماه و روز، و بر حسب روز و هفته و ساعت، سن هجری شما، روز هفته تولدتان، و تعداد روزهای باقی‌مانده تا تولد بعدی در هر دو تقویم.",
  keywords: ["محاسبه سن", "سن من چقدر است", "age calculator", "تاریخ تولد", "روز تولد", "سن بر حسب سال هجری", "سن بر حسب روز"],
  formulas: [{ label: "سن", tex: "\\text{Age} = t_{\\text{today}} - t_{\\text{birth}}" }],
  inputs: [
    { id: "birth", label: "تاریخ تولد", type: "text", default: "2000-05-15", help: "به صورت YYYY-MM-DD یا DD/MM/YYYY." },
    { id: "ref", label: "محاسبه سن در تاریخ (اختیاری)", type: "text", default: "", help: "برای استفاده از تاریخ امروز خالی بگذارید." }
  ],
  example: { values: { birth: "2000-05-15", ref: "2026-11-13" }, expect: ["26 سال و 5 ماه و 29 روز"], note: "مثال: متولد 15 مه 2000، و سن در 13 نوامبر 2026." },
  invalid: { values: { birth: "2030-01-01", ref: "2026-01-01" } },
  related: ["date-difference", "hijri-converter", "bmi-bsa", "calorie-needs"]
};

export function solve(input) {
  const b = parseGregorian(input, "birth", "تاریخ تولد");
  const r = isBlank(input.ref) ? todayUtc() : parseGregorian(input, "ref", "تاریخ محاسبه");
  if (b > r) fail("تاریخ تولد بعد از تاریخ محاسبه است.", "birth");
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
    { label: "سن", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "سن بر حسب سال هجری", value: `حدود ${hy} سال هجری` },
    { label: "بر حسب ماه / هفته / روز", value: `${totalMonths.toLocaleString("en-US")} ماه / ${Math.floor(days / 7).toLocaleString("en-US")} هفته / ${days.toLocaleString("en-US")} روز` },
    { label: "تقریباً بر حسب ساعت", value: `${(days * 24).toLocaleString("en-US")} ساعت` },
    { label: "روز تولد", value: `${WEEKDAYS[new Date(b).getUTCDay()]} — ${hLong(hb)}` },
    { label: "تولد بعدی", value: toNext === 0 ? "امروز! تولدت مبارک" : `${gLong(next)} (بعد از ${daysW(toNext)})` }
  ];
  if (nh !== null) results.push({ label: "تولد هجری بعدی", value: `${hLong(toHijri(nh))} = ${gLong(nh)}` });
  return {
    results,
    steps: [
      `از ${gLong(b)} تا ${gLong(r)}.`,
      `ابتدا سال‌های کامل، سپس ماه‌های کامل و سپس روزهای باقی‌مانده را می‌شماریم: ${ymdText(ymd)}.`,
      `کل روزها = ${days.toLocaleString("en-US")}. سال هجری حدود 11 روز از سال میلادی کوتاه‌تر است، پس سن هجری کمی بزرگ‌تر است (${hy}).`
    ],
    copy: `سن در ${iso(r)}: ${ymdText(ymd)} (${days.toLocaleString("en-US")} روز)`
  };
}
