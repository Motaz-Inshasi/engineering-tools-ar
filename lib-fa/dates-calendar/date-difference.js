import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseGregorian, toHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, weeksW, DAY, WEEKDAYS } from "./calendar.js";

export const meta = {
  description: "محاسبه مدت بین دو تاریخ بر حسب سال و ماه و روز، و بر حسب روز و هفته و روزهای کاری، یا افزودن تعدادی روز به یک تاریخ یا کم کردن آن برای یافتن تاریخ حاصل و روز هفته‌اش.",
  keywords: ["تفاوت بین دو تاریخ", "تعداد روزها بین دو تاریخ", "محاسبه مدت", "افزودن روز", "date difference", "days between dates", "روزهای کاری", "چند روز"],
  formulas: [{ label: "مدت بر حسب روز", tex: "\\Delta = \\frac{t_2 - t_1}{86400\\ \\text{s}}" }],
  inputs: [
    { id: "mode", label: "عملیات", type: "select", default: "diff", options: [["diff", "تفاوت بین دو تاریخ"], ["add", "افزودن یا کم کردن روز"]] },
    { id: "d1", label: "تاریخ اول (یا شروع)", type: "text", default: "2026-01-01", help: "به صورت YYYY-MM-DD یا DD/MM/YYYY." },
    { id: "d2", label: "تاریخ دوم", type: "text", default: "2026-12-31", when: { mode: ["diff"] } },
    { id: "inclusive", label: "روز پایان را در مدت لحاظ کن", type: "checkbox", default: "", when: { mode: ["diff"] } },
    { id: "weekend", label: "تعطیلی آخر هفته (برای محاسبه روزهای کاری)", type: "select", default: "fs", options: [["fs", "جمعه و شنبه"], ["ss", "شنبه و یکشنبه"], ["f", "فقط جمعه"], ["none", "بدون تعطیلی"]], when: { mode: ["diff"] } },
    { id: "days", label: "تعداد روز (منفی برای کم کردن)", type: "number", default: "100", when: { mode: ["add"] } }
  ],
  example: { values: { mode: "diff", d1: "2026-01-01", d2: "2026-12-31", inclusive: "", weekend: "fs", days: "" }, expect: ["364 روز", "11 ماه و 30 روز"], note: "مثال: چند روز بین ابتدای سال 2026 و انتهای آن است؟" },
  invalid: { values: { mode: "diff", d1: "2026-02-30", d2: "2026-12-31" } },
  related: ["age-calculator", "hijri-converter", "study-planner"]
};

const WEEKENDS = { fs: [5, 6], ss: [6, 0], f: [5], none: [] };

export function solve(input) {
  const mode = choice(input, "mode", "عملیات", ["diff", "add"], "diff");
  const a = parseGregorian(input, "d1", "تاریخ اول");
  if (mode === "add") {
    const k = num(input, "days", "تعداد روز", { integer: true, min: -1000000, max: 1000000 });
    const t = a + k * DAY;
    if (new Date(t).getUTCFullYear() < 1 || new Date(t).getUTCFullYear() > 9999) fail("تاریخ حاصل خارج از محدوده پشتیبانی‌شده است.", "days");
    const h = toHijri(t);
    return {
      results: [
        { label: "تاریخ حاصل", value: gLong(t), text: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} روز = ${iso(t)}` },
        { label: "به هجری (ام‌القرا)", value: hLong(h) },
        { label: "روز هفته", value: WEEKDAYS[new Date(t).getUTCDay()] }
      ],
      steps: [
        `${iso(a)} را به شماره روز متوالی تبدیل می‌کنیم، سپس ${k >= 0 ? "افزودن" : "کم کردن"} ${daysW(Math.abs(k))}.`,
        `محاسبه به‌طور خودکار طول ماه‌ها و سال‌های کبیسه را لحاظ می‌کند (فوریه در سال کبیسه 29 روز است).`,
        `نتیجه: ${gLong(t)}.`
      ],
      copy: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} روز = ${iso(t)}`
    };
  }
  const b = parseGregorian(input, "d2", "تاریخ دوم");
  const inc = !isBlank(input.inclusive) && input.inclusive !== "0";
  const we = WEEKENDS[choice(input, "weekend", "آخر هفته", Object.keys(WEEKENDS), "fs")];
  const [s, e] = a <= b ? [a, b] : [b, a];
  const n = Math.round((e - s) / DAY) + (inc ? 1 : 0);
  const ymd = diffYMD(s, inc ? e + DAY : e);
  const full = Math.floor(n / 7), rem = n % 7;
  let work = full * (7 - we.length);
  const sd = new Date(s).getUTCDay();
  for (let i = 0; i < rem; i++) if (!we.includes((sd + full * 7 + i) % 7)) work++;
  const results = [
    { label: "مدت بر حسب روز", value: daysW(n), text: `${iso(s)} → ${iso(e)}: ${daysW(n)}` },
    { label: "بر حسب سال و ماه و روز", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "بر حسب هفته", value: `${weeksW(full)}${rem ? ` و ${daysW(rem)}` : ""}` },
    { label: "روزهای کاری", value: daysW(work) },
    { label: "بر حسب ساعت", value: `${(n * 24).toLocaleString("en-US")} ساعت` }
  ];
  const steps = [
    a > b ? "تاریخ اول بعد از تاریخ دوم است، پس جای آن‌ها را عوض کردیم تا مدت مثبت محاسبه شود." : `از ${gLong(s)} تا ${gLong(e)}.`,
    `تعداد روز = تفاوت شماره دو روز${inc ? " + 1 (برای لحاظ روز پایان)" : ""} = ${n}.`,
    `ابتدا ماه‌های کامل را می‌شماریم، سپس روزهای باقی‌مانده: ${ymdText(ymd)}.`,
    `روزهای کاری: روزهای تعطیل هفتگی (${we.length ? we.map((d) => WEEKDAYS[d]).join(" و ") : "ندارد"}) حذف می‌شوند، اما تعطیلات رسمی حذف نمی‌شوند.`
  ];
  return { results, steps, copy: `${iso(s)} → ${iso(e)}: ${daysW(n)} (${ymdText(ymd)})` };
}
