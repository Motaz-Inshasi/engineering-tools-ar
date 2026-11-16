import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "طراحی پله بین دو طبقه: محاسبه تعداد پله‌ها، ارتفاع و عمق هر پله با قاعده بلوندل، سپس بررسی معیارها و طول افقی در دسترس.",
  keywords: ["پله", "قاعده بلوندل", "ارتفاع پله", "عمق پله", "stair", "blondel", "زاویه پله"],
  formulas: [
    { label: "تعداد پله‌ها", tex: "n = \\operatorname{round}\\left(\\frac{H}{R_p}\\right)" },
    { label: "ارتفاع و عمق پله", tex: "R = \\frac{H}{n},\\qquad G = (2R+G) - 2R" },
    { label: "طول افقی و زاویه پله", tex: "L_h = (n-1)\\,G,\\qquad \\theta = \\arctan\\frac{R}{G}" }
  ],
  inputs: [
    { id: "H", label: "ارتفاع بین طبقات H", unit: "cm", type: "number", default: "300" },
    { id: "riser", label: "ارتفاع مطلوب پله R", unit: "cm", type: "number", default: "17", help: "تقریبی؛ ارتفاع پله برای تقسیم دقیق ارتفاع تنظیم می‌شود." },
    { id: "blondel", label: "هدف بلوندل 2R + G", unit: "cm", type: "number", default: "63", help: "مقدار ایده‌آل بین 60 و 64 سانتی‌متر است." },
    { id: "avail", label: "طول افقی در دسترس", unit: "cm", type: "number", help: "اختیاری: برای بررسی اینکه پله در فضا جا می‌شود." }
  ],
  example: { values: { H: "300", riser: "17", blondel: "63", avail: "" }, expect: ["504.3 cm", "18"], note: "مثال: ارتفاع 300 سانتی‌متر بین دو طبقه." },
  invalid: { values: { H: "300", riser: "17", blondel: "20", avail: "" } },
  related: ["polygon-area", "far-coverage"]
};

export function solve(input) {
  const H = num(input, "H", "ارتفاع بین طبقات", { positive: true });
  const Rp = num(input, "riser", "ارتفاع مطلوب پله", { positive: true, max: 30 });
  const B = num(input, "blondel", "هدف بلوندل", { positive: true, max: 100 });
  const avail = num(input, "avail", "طول افقی در دسترس", { positive: true, optional: true });
  const n = Math.round(H / Rp);
  if (n < 2) fail("ارتفاع برای ارتفاع مطلوب پله کم است؛ پله به حداقل دو پله نیاز دارد.", "H");
  const R = H / n;
  const G = B - 2 * R;
  if (!(G > 0)) fail("هدف بلوندل برای این ارتفاع خیلی کوچک است؛ آن را افزایش دهید یا تعداد پله‌ها را کم کنید.", "blondel");
  const treads = n - 1;
  const run = treads * G;
  const angle = (Math.atan(R / G) * 180) / Math.PI;
  const stringer = Math.hypot(H, run);
  const twoRG = 2 * R + G;
  const checks = [
    { name: "ارتفاع پله R", value: `${fmt(R, 4)} cm`, rule: "15 – 18 cm", ok: R >= 15 && R <= 18 },
    { name: "عمق پله G", value: `${fmt(G, 4)} cm`, rule: "≥ 27 cm", ok: G >= 27 },
    { name: "قاعده بلوندل 2R + G", value: `${fmt(twoRG, 4)} cm`, rule: "60 – 64 cm", ok: twoRG >= 60 && twoRG <= 64 },
    { name: "زاویه پله", value: `${fmt(angle, 3)}°`, rule: "25° – 42°", ok: angle >= 25 && angle <= 42 }
  ];
  if (avail !== null) checks.push({ name: "طول افقی در برابر طول در دسترس", value: `${fmt(run, 4)} cm`, rule: `≤ ${fmt(avail)} cm`, ok: run <= avail });
  const allOk = checks.every((c) => c.ok);
  const verdict = allOk ? "مناسب و مطابق معیارها" : "نیاز به اصلاح دارد";
  const steps = [
    { text: "تعداد پله‌ها با گرد کردن از ارتفاع مطلوب:", tex: `n = \\operatorname{round}\\left(\\frac{${ntex(H, 6)}}{${ntex(Rp, 6)}}\\right) = ${n}` },
    { text: "ارتفاع واقعی پله:", tex: `R = \\frac{H}{n} = \\frac{${ntex(H, 6)}}{${n}} = ${ntex(R, 4)}\\ cm` },
    { text: "عمق پله از قاعده بلوندل:", tex: `G = ${ntex(B, 6)} - 2(${ntex(R, 4)}) = ${ntex(G, 4)}\\ cm` },
    { text: "طول افقی پله:", tex: `L_h = (n-1)G = ${treads} \\times ${ntex(G, 4)} = ${ntex(run, 4)}\\ cm` },
    { text: "زاویه پله:", tex: `\\theta = \\arctan\\frac{R}{G} = ${ntex(angle, 4)}^\\circ` },
    { text: "طول تیرک مایل:", tex: `L = \\sqrt{H^2 + L_h^2} = ${ntex(stringer, 4)}\\ cm` }
  ];
  const blocks = [
    { type: "table", caption: "بررسی معیارها", head: ["بررسی", "مقدار", "معیار", "حکم"], rows: checks.map((c) => [c.name, c.value, c.rule, c.ok ? "مطابق" : "غیرمطابق"]) }
  ];
  if (!allOk) blocks.push({ type: "note", tone: "warn", text: "برخی معیارها رعایت نشده‌اند؛ ارتفاع مطلوب پله، هدف بلوندل یا طول در دسترس را تنظیم کنید." });
  return {
    results: [
      { label: "تعداد خیزها (ارتفاع پله‌ها) n", value: `${n}` },
      { label: "تعداد کف‌پله‌ها (سطوح پله‌ها)", value: `${treads}` },
      { label: "ارتفاع پله R", value: `${fmt(R, 4)} cm` },
      { label: "عمق پله G", value: `${fmt(G, 4)} cm` },
      { label: "طول افقی کل", value: `${fmt(run, 4)} cm` },
      { label: "زاویه پله", value: `${fmt(angle, 3)}°` },
      { label: "طول تیرک مایل", value: `${fmt(stringer, 4)} cm` },
      { label: "حکم", value: verdict }
    ],
    steps,
    blocks,
    copy: `تعداد پله‌ها: ${n}، R = ${fmt(R, 4)} cm، G = ${fmt(G, 4)} cm، طول افقی = ${fmt(run, 4)} cm، زاویه = ${fmt(angle, 3)}°، حکم: ${verdict}`,
    values: { n, treads, R, G, run, angle, stringer, twoRG, allOk }
  };
}
