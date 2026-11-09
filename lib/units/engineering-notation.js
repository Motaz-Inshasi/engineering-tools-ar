import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, normalizeDigits } from "../core/format.js";

const PREFIX = [[24, "Y", "يوتا"], [21, "Z", "زيتا"], [18, "E", "إكسا"], [15, "P", "بيتا"], [12, "T", "تيرا"], [9, "G", "غيغا"], [6, "M", "ميغا"], [3, "k", "كيلو"], [0, "", "—"], [-3, "m", "ملّي"], [-6, "µ", "مايكرو"], [-9, "n", "نانو"], [-12, "p", "بيكو"], [-15, "f", "فيمتو"], [-18, "a", "أتو"], [-21, "z", "زبتو"], [-24, "y", "يوكتو"]];

export const meta = {
  description: "حوّل أي رقم إلى الصيغة العلمية والصيغة الهندسية (أُسس من مضاعفات 3) مع البادئة المناسبة (كيلو، ميغا، ملّي، مايكرو، نانو…)، أو اقرأ قيمة مكتوبة بالبادئة مثل 4.7k أو 22n.",
  keywords: ["الصيغة الهندسية", "engineering notation", "صيغة علمية", "بادئات", "كيلو", "ميغا", "ملي", "مايكرو", "نانو", "بيكو", "SI prefix"],
  formulas: [
    { label: "الصيغة العلمية والهندسية", tex: "x = a \\times 10^{n},\\; 1 \\le |a| < 10 \\qquad x = b \\times 10^{3k},\\; 1 \\le |b| < 1000" },
    { label: "البادئات الشائعة", tex: "\\text{k} = 10^{3},\\ \\text{M} = 10^{6},\\ \\text{G} = 10^{9},\\ \\text{m} = 10^{-3},\\ \\mu = 10^{-6},\\ \\text{n} = 10^{-9},\\ \\text{p} = 10^{-12}" }
  ],
  inputs: [
    { id: "x", label: "الرقم", type: "text", default: "0.00047", help: "مثل 0.00047 أو 4.7e-4 أو 470u أو 2.2M." },
    { id: "unit", label: "الوحدة (اختياري)", type: "text", default: "F" }
  ],
  example: { values: { x: "0.00047", unit: "F" }, expect: ["470 µF", "4.7 × 10^-4"], note: "مثال: 0.00047 F هي 470 µF." },
  invalid: { values: { x: "12abc" } },
  related: ["unit-converter", "standard-resistor-values", "resistor-color-code"]
};

export function engParts(x) {
  if (x === 0) return { mant: 0, exp: 0 };
  let e = Math.floor(Math.log10(Math.abs(x)) / 3) * 3;
  let m = x / Math.pow(10, e);
  if (Math.abs(Number(m.toPrecision(12))) >= 1000) { e += 3; m /= 1000; }
  return { mant: Number(m.toPrecision(12)), exp: e === 0 ? 0 : e };
}

export function solve(input) {
  const raw = normalizeDigits(str(input, "x", "الرقم")).replace(/\s+/g, "");
  const x = parseNumber(raw);
  if (!isFinite(x)) fail("القيمة ليست رقماً صحيحاً. أمثلة: 0.0047 أو 4.7e-3 أو 4.7m.", "x");
  const unit = String(input.unit ?? "").trim().slice(0, 12);
  const sciE = x === 0 ? 0 : Math.floor(Math.log10(Math.abs(x)));
  const sciM = x === 0 ? 0 : Number((x / Math.pow(10, sciE)).toPrecision(12));
  const { mant, exp } = engParts(x);
  const p = PREFIX.find((q) => q[0] === exp);
  const steps = [
    `القيمة العشرية: ${fmt(x, 12)}.`,
    { text: "الصيغة العلمية: نحرّك الفاصلة حتى يبقى رقم واحد غير صفري قبلها:", tex: `${fmt(sciM, 12)} \\times 10^{${sciE}}` },
    { text: "الصيغة الهندسية: نختار أُساً من مضاعفات 3 فيكون المعامل بين 1 و 1000:", tex: `${fmt(mant, 12)} \\times 10^{${exp}}` },
    p ? `الأُس ${exp} يقابل البادئة «${p[1] || "بلا بادئة"}» (${p[2]})، فالقيمة ${fmt(mant, 12)} ${p[1]}${unit}.` : "القيمة خارج مدى البادئات القياسية."
  ];
  const engText = p ? `${fmt(mant, 12)} ${p[1]}${unit}`.trim() : fmt(x, 12);
  return {
    results: [
      { label: "بالبادئة", value: engText, text: engText },
      { label: "الصيغة الهندسية", value: `${fmt(mant, 12)} × 10^${exp}` },
      { label: "الصيغة العلمية", value: `${fmt(sciM, 12)} × 10^${sciE}`, text: `${fmt(sciM, 12)} × 10^${sciE}` },
      { label: "عشرياً", value: fmt(x, 15) },
      { label: "تقريب بأربعة أرقام معنوية", value: eng(x, unit, 4) }
    ],
    blocks: [{ type: "table", caption: "جدول البادئات", head: ["البادئة", "الرمز", "القيمة"], rows: PREFIX.filter((q) => q[0] !== 0).map((q) => [q[2], q[1], `10^${q[0]}`]) }],
    steps, copy: `${engText} = ${fmt(sciM, 12)} × 10^${sciE}`
  };
}
