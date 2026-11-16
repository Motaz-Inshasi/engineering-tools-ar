import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { toHijri, fromHijri, hijriMonthLength, parseGregorian, iso, gLong, hLong, H_MONTHS, H_MIN, H_MAX, DAY } from "./calendar.js";

export const meta = {
  description: "تبدیل تاریخ از میلادی به هجری و از هجری به میلادی بر اساس تقویم ام‌القرا، همراه با نام روز هفته، تعداد روزهای ماه هجری، و جدولی از همه روزهای ماه.",
  keywords: ["تبدیل تاریخ", "هجری", "میلادی", "تقویم هجری", "ام‌القرا", "hijri", "islamic calendar", "تاریخ امروز به هجری", "رمضان", "تبدیل هجری و میلادی"],
  formulas: [{ label: "طول تقریبی سال هجری و ماه قمری", tex: "\\bar{Y}_H \\approx 354.367\\ \\text{روز},\\qquad \\bar{M} \\approx 29.5306\\ \\text{روز}" }],
  inputs: [
    { id: "dir", label: "جهت", type: "select", default: "g2h", options: [["g2h", "از میلادی به هجری"], ["h2g", "از هجری به میلادی"]] },
    { id: "gdate", label: "تاریخ میلادی", type: "text", default: "2026-03-20", help: "به صورت YYYY-MM-DD یا DD/MM/YYYY.", when: { dir: ["g2h"] } },
    { id: "hy", label: "سال هجری", type: "number", default: "1447", when: { dir: ["h2g"] } },
    { id: "hm", label: "ماه هجری", type: "select", default: "9", options: H_MONTHS.map((n, i) => [String(i + 1), `${i + 1} - ${n}`]), when: { dir: ["h2g"] } },
    { id: "hd", label: "روز", type: "number", default: "1", when: { dir: ["h2g"] } }
  ],
  example: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "1" }, expect: ["1 رمضان 1447 ه.ق. = چهارشنبه 18 فوریه 2026 میلادی"], note: "مثال: رمضان 1447 ه.ق. بر اساس تقویم ام‌القرا کی آغاز می‌شود؟" },
  invalid: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "31" } },
  related: ["date-difference", "age-calculator", "study-planner", "zakat"]
};

export function solve(input) {
  const dir = choice(input, "dir", "جهت", ["g2h", "h2g"], "g2h");
  let t, h;
  const steps = [];
  if (dir === "g2h") {
    t = parseGregorian(input, "gdate", "تاریخ میلادی");
    h = toHijri(t);
    if (h.y < H_MIN || h.y > H_MAX) fail(`بازه پشتیبانی‌شده از ${H_MIN} تا ${H_MAX} هجری قمری است (تقریباً از 1882 تا 2174 میلادی).`, "gdate");
    steps.push(`روزها را از آغاز تقویم هجری تا ${iso(t)} می‌شماریم و با جداول ام‌القرا برای طول ماه‌ها تطبیق می‌دهیم.`);
  } else {
    const y = num(input, "hy", "سال هجری", { integer: true, min: H_MIN, max: H_MAX });
    const m = Number(choice(input, "hm", "ماه هجری", H_MONTHS.map((_, i) => String(i + 1)), "1"));
    const d = num(input, "hd", "روز", { integer: true, min: 1, max: 30 });
    const len = hijriMonthLength(y, m);
    if (d > len) fail(`ماه ${H_MONTHS[m - 1]} ${y} ه.ق. فقط ${len} روز دارد.`, "hd");
    t = fromHijri(y, m, d);
    if (t === null) fail("این تاریخ قابل تبدیل نیست.", "hy");
    h = { y, m, d };
    steps.push(`موقعیت میلادی را با میانگین طول ماه قمری (29.53 روز) برآورد می‌کنیم، سپس برآورد را با تطبیق جداول ام‌القرا روز به روز اصلاح می‌کنیم.`);
  }
  const len = hijriMonthLength(h.y, h.m);
  const start = t - (h.d - 1) * DAY;
  steps.push(`ماه ${H_MONTHS[h.m - 1]} ${h.y} ه.ق. دارای ${len} روز است و از ${gLong(start)} شروع می‌شود.`);
  steps.push("آغاز واقعی ماه ممکن است در برخی کشورهایی که بر رؤیت هلال تکیه دارند یک روز تفاوت داشته باشد.");
  const line = `${hLong(h)} = ${gLong(t)}`;
  const rows = [];
  for (let i = 0; i < len; i++) {
    const tt = start + i * DAY;
    rows.push([`${i + 1} ${H_MONTHS[h.m - 1]}`, gLong(tt), i + 1 === h.d ? "◀" : ""]);
  }
  return {
    results: [
      { label: "تاریخ هجری", value: hLong(h) },
      { label: "تاریخ میلادی", value: gLong(t) },
      { label: "به صورت عددی", value: `${h.y}/${String(h.m).padStart(2, "0")}/${String(h.d).padStart(2, "0")} ه.ق. — ${iso(t)}` },
      { label: `تعداد روزهای ${H_MONTHS[h.m - 1]} ${h.y} ه.ق.`, value: `${len} روز` }
    ],
    steps,
    blocks: [{ type: "table", caption: `روزهای ماه ${H_MONTHS[h.m - 1]} ${h.y} ه.ق.`, head: ["هجری", "میلادی", ""], rows }],
    copy: line
  };
}

