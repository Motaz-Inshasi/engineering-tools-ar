import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "دو منزلوں کے درمیان سیڑھی ڈیزائن کریں: بلونڈل رول کے مطابق سیڑھیوں کی تعداد، ہر سیڑھی کی اونچائی اور گہرائی حساب کریں، پھر معیارات اور دستیاب افقی لمبائی کی جانچ کریں۔",
  keywords: ["سیڑھی", "بلونڈل رول", "سیڑھی کی اونچائی", "سیڑھی کی گہرائی", "stair", "blondel", "سیڑھی کا زاویہ"],
  formulas: [
    { label: "سیڑھیوں کی تعداد", tex: "n = \\operatorname{round}\\left(\\frac{H}{R_p}\\right)" },
    { label: "سیڑھی کی اونچائی اور گہرائی", tex: "R = \\frac{H}{n},\\qquad G = (2R+G) - 2R" },
    { label: "افقی پھیلاؤ اور سیڑھی کا زاویہ", tex: "L_h = (n-1)\\,G,\\qquad \\theta = \\arctan\\frac{R}{G}" }
  ],
  inputs: [
    { id: "H", label: "دو منزلوں کے درمیان اونچائی H", unit: "cm", type: "number", default: "300" },
    { id: "riser", label: "سیڑھی کی ترجیحی اونچائی R", unit: "cm", type: "number", default: "17", help: "تقریبی؛ سیڑھی کی اونچائی کو اونچائی کی مکمل تقسیم کے لیے ایڈجسٹ کیا جاتا ہے۔" },
    { id: "blondel", label: "بلونڈل ہدف 2R + G", unit: "cm", type: "number", default: "63", help: "مثالی قدر 60 اور 64 سینٹی میٹر کے درمیان ہے۔" },
    { id: "avail", label: "دستیاب افقی لمبائی", unit: "cm", type: "number", help: "اختیاری: یہ جانچنے کے لیے کہ سیڑھی جگہ میں سما جاتی ہے۔" }
  ],
  example: { values: { H: "300", riser: "17", blondel: "63", avail: "" }, expect: ["504.3 cm", "18"], note: "مثال: دو منزلوں کے درمیان 300 سم اونچائی۔" },
  invalid: { values: { H: "300", riser: "17", blondel: "20", avail: "" } },
  related: ["polygon-area", "far-coverage"]
};

export function solve(input) {
  const H = num(input, "H", "دو منزلوں کے درمیان اونچائی", { positive: true });
  const Rp = num(input, "riser", "سیڑھی کی ترجیحی اونچائی", { positive: true, max: 30 });
  const B = num(input, "blondel", "بلونڈل ہدف", { positive: true, max: 100 });
  const avail = num(input, "avail", "دستیاب افقی لمبائی", { positive: true, optional: true });
  const n = Math.round(H / Rp);
  if (n < 2) fail("اونچائی ترجیحی سیڑھی کے لیے بہت کم ہے؛ سیڑھی میں کم از کم دو سیڑھیاں ہونی چاہئیں۔", "H");
  const R = H / n;
  const G = B - 2 * R;
  if (!(G > 0)) fail("اس اونچائی کے لیے بلونڈل ہدف بہت کم ہے؛ اسے بڑھائیں یا سیڑھیوں کی تعداد کم کریں۔", "blondel");
  const treads = n - 1;
  const run = treads * G;
  const angle = (Math.atan(R / G) * 180) / Math.PI;
  const stringer = Math.hypot(H, run);
  const twoRG = 2 * R + G;
  const checks = [
    { name: "سیڑھی کی اونچائی R", value: `${fmt(R, 4)} cm`, rule: "15 – 18 cm", ok: R >= 15 && R <= 18 },
    { name: "سیڑھی کی گہرائی G", value: `${fmt(G, 4)} cm`, rule: "≥ 27 cm", ok: G >= 27 },
    { name: "بلونڈل رول 2R + G", value: `${fmt(twoRG, 4)} cm`, rule: "60 – 64 cm", ok: twoRG >= 60 && twoRG <= 64 },
    { name: "سیڑھی کا زاویہ", value: `${fmt(angle, 3)}°`, rule: "25° – 42°", ok: angle >= 25 && angle <= 42 }
  ];
  if (avail !== null) checks.push({ name: "افقی پھیلاؤ بمقابلہ دستیاب", value: `${fmt(run, 4)} cm`, rule: `≤ ${fmt(avail)} cm`, ok: run <= avail });
  const allOk = checks.every((c) => c.ok);
  const verdict = allOk ? "موزوں اور معیارات پر پورا" : "ایڈجسٹمنٹ کی ضرورت ہے";
  const steps = [
    { text: "ترجیحی اونچائی سے تقریباً سیڑھیوں کی تعداد:", tex: `n = \\operatorname{round}\\left(\\frac{${ntex(H, 6)}}{${ntex(Rp, 6)}}\\right) = ${n}` },
    { text: "اصل سیڑھی کی اونچائی:", tex: `R = \\frac{H}{n} = \\frac{${ntex(H, 6)}}{${n}} = ${ntex(R, 4)}\\ cm` },
    { text: "بلونڈل رول سے سیڑھی کی گہرائی:", tex: `G = ${ntex(B, 6)} - 2(${ntex(R, 4)}) = ${ntex(G, 4)}\\ cm` },
    { text: "سیڑھی کا افقی پھیلاؤ:", tex: `L_h = (n-1)G = ${treads} \\times ${ntex(G, 4)} = ${ntex(run, 4)}\\ cm` },
    { text: "سیڑھی کا زاویہ:", tex: `\\theta = \\arctan\\frac{R}{G} = ${ntex(angle, 4)}^\\circ` },
    { text: "مائل اسٹرنگر کی لمبائی:", tex: `L = \\sqrt{H^2 + L_h^2} = ${ntex(stringer, 4)}\\ cm` }
  ];
  const blocks = [
    { type: "table", caption: "معیارات کی جانچ", head: ["جانچ", "قدر", "معیار", "فیصلہ"], rows: checks.map((c) => [c.name, c.value, c.rule, c.ok ? "پاس" : "فیل"]) }
  ];
  if (!allOk) blocks.push({ type: "note", tone: "warn", text: "کچھ معیارات پورے نہیں ہوتے؛ ترجیحی اونچائی، بلونڈل ہدف یا دستیاب لمبائی میں تبدیلی کریں۔" });
  return {
    results: [
      { label: "رائزرز کی تعداد (سیڑھیوں کی اونچائیاں) n", value: `${n}` },
      { label: "ٹریڈز کی تعداد (سیڑھیوں کی سطحیں)", value: `${treads}` },
      { label: "سیڑھی کی اونچائی R", value: `${fmt(R, 4)} cm` },
      { label: "سیڑھی کی گہرائی G", value: `${fmt(G, 4)} cm` },
      { label: "کل افقی پھیلاؤ", value: `${fmt(run, 4)} cm` },
      { label: "سیڑھی کا زاویہ", value: `${fmt(angle, 3)}°` },
      { label: "مائل اسٹرنگر کی لمبائی", value: `${fmt(stringer, 4)} cm` },
      { label: "فیصلہ", value: verdict }
    ],
    steps,
    blocks,
    copy: `سیڑھیاں: ${n}، R = ${fmt(R, 4)} cm، G = ${fmt(G, 4)} cm، افقی پھیلاؤ = ${fmt(run, 4)} cm، زاویہ = ${fmt(angle, 3)}°، فیصلہ: ${verdict}`,
    values: { n, treads, R, G, run, angle, stringer, twoRG, allOk }
  };
}
