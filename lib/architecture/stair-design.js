import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "صمّم الدرج بين طابقين: احسب عدد الدرجات وارتفاع الدرجة وعمقها وفق قاعدة بلوندل، ثم تحقق من المعايير وطول الامتداد الأفقي المتاح.",
  keywords: ["درج", "قاعدة بلوندل", "ارتفاع الدرجة", "عمق الدرجة", "stair", "blondel", "زاوية الدرج"],
  formulas: [
    { label: "عدد الدرجات", tex: "n = \\operatorname{round}\\left(\\frac{H}{R_p}\\right)" },
    { label: "ارتفاع الدرجة وعمقها", tex: "R = \\frac{H}{n},\\qquad G = (2R+G) - 2R" },
    { label: "الامتداد الأفقي وزاوية الدرج", tex: "L_h = (n-1)\\,G,\\qquad \\theta = \\arctan\\frac{R}{G}" }
  ],
  inputs: [
    { id: "H", label: "الارتفاع بين الطابقين H", unit: "cm", type: "number", default: "300" },
    { id: "riser", label: "الارتفاع المفضل للدرجة R", unit: "cm", type: "number", default: "17", help: "تقريبي، وتُعدَّل الدرجة لتقسيم الارتفاع بدقة." },
    { id: "blondel", label: "هدف بلوندل 2R + G", unit: "cm", type: "number", default: "63", help: "القيمة المثالية بين 60 و64 سم." },
    { id: "avail", label: "الطول الأفقي المتاح", unit: "cm", type: "number", help: "اختياري: للتحقق من أن الدرج يتسع في المكان." }
  ],
  example: { values: { H: "300", riser: "17", blondel: "63", avail: "" }, expect: ["504.3 cm", "18"], note: "مثال: ارتفاع 300 سم بين طابقين." },
  invalid: { values: { H: "300", riser: "17", blondel: "20", avail: "" } },
  related: ["polygon-area", "far-coverage"]
};

export function solve(input) {
  const H = num(input, "H", "الارتفاع بين الطابقين", { positive: true });
  const Rp = num(input, "riser", "الارتفاع المفضل للدرجة", { positive: true, max: 30 });
  const B = num(input, "blondel", "هدف بلوندل", { positive: true, max: 100 });
  const avail = num(input, "avail", "الطول الأفقي المتاح", { positive: true, optional: true });
  const n = Math.round(H / Rp);
  if (n < 2) fail("الارتفاع قليل جداً بالنسبة للدرجة المفضلة؛ يحتاج الدرج إلى درجتين على الأقل.", "H");
  const R = H / n;
  const G = B - 2 * R;
  if (!(G > 0)) fail("هدف بلوندل صغير جداً بالنسبة لهذا الارتفاع؛ ارفعه أو قلّل عدد الدرجات.", "blondel");
  const treads = n - 1;
  const run = treads * G;
  const angle = (Math.atan(R / G) * 180) / Math.PI;
  const stringer = Math.hypot(H, run);
  const twoRG = 2 * R + G;
  const checks = [
    { name: "ارتفاع الدرجة R", value: `${fmt(R, 4)} cm`, rule: "15 – 18 cm", ok: R >= 15 && R <= 18 },
    { name: "عمق الدرجة G", value: `${fmt(G, 4)} cm`, rule: "≥ 27 cm", ok: G >= 27 },
    { name: "قاعدة بلوندل 2R + G", value: `${fmt(twoRG, 4)} cm`, rule: "60 – 64 cm", ok: twoRG >= 60 && twoRG <= 64 },
    { name: "زاوية الدرج", value: `${fmt(angle, 3)}°`, rule: "25° – 42°", ok: angle >= 25 && angle <= 42 }
  ];
  if (avail !== null) checks.push({ name: "الامتداد الأفقي مقابل المتاح", value: `${fmt(run, 4)} cm`, rule: `≤ ${fmt(avail)} cm`, ok: run <= avail });
  const allOk = checks.every((c) => c.ok);
  const verdict = allOk ? "مناسب ويطابق المعايير" : "يحتاج إلى تعديل";
  const steps = [
    { text: "عدد الدرجات بالتقريب من الارتفاع المفضل:", tex: `n = \\operatorname{round}\\left(\\frac{${ntex(H, 6)}}{${ntex(Rp, 6)}}\\right) = ${n}` },
    { text: "ارتفاع الدرجة الفعلي:", tex: `R = \\frac{H}{n} = \\frac{${ntex(H, 6)}}{${n}} = ${ntex(R, 4)}\\ cm` },
    { text: "عمق الدرجة من قاعدة بلوندل:", tex: `G = ${ntex(B, 6)} - 2(${ntex(R, 4)}) = ${ntex(G, 4)}\\ cm` },
    { text: "الامتداد الأفقي للدرج:", tex: `L_h = (n-1)G = ${treads} \\times ${ntex(G, 4)} = ${ntex(run, 4)}\\ cm` },
    { text: "زاوية الدرج:", tex: `\\theta = \\arctan\\frac{R}{G} = ${ntex(angle, 4)}^\\circ` },
    { text: "طول الحاجز المائل:", tex: `L = \\sqrt{H^2 + L_h^2} = ${ntex(stringer, 4)}\\ cm` }
  ];
  const blocks = [
    { type: "table", caption: "فحص المعايير", head: ["الفحص", "القيمة", "المعيار", "الحكم"], rows: checks.map((c) => [c.name, c.value, c.rule, c.ok ? "مطابق" : "غير مطابق"]) }
  ];
  if (!allOk) blocks.push({ type: "note", tone: "warn", text: "بعض المعايير غير مطابقة؛ عدّل الارتفاع المفضل أو هدف بلوندل أو الطول المتاح." });
  return {
    results: [
      { label: "عدد القوائم (ارتفاعات الدرجات) n", value: `${n}` },
      { label: "عدد النوائم (أسطح الدرجات)", value: `${treads}` },
      { label: "ارتفاع الدرجة R", value: `${fmt(R, 4)} cm` },
      { label: "عمق الدرجة G", value: `${fmt(G, 4)} cm` },
      { label: "الامتداد الأفقي الكلي", value: `${fmt(run, 4)} cm` },
      { label: "زاوية الدرج", value: `${fmt(angle, 3)}°` },
      { label: "طول الحاجز المائل", value: `${fmt(stringer, 4)} cm` },
      { label: "الحكم", value: verdict }
    ],
    steps,
    blocks,
    copy: `عدد الدرجات: ${n}، R = ${fmt(R, 4)} cm، G = ${fmt(G, 4)} cm، الامتداد الأفقي = ${fmt(run, 4)} cm، الزاوية = ${fmt(angle, 3)}°، الحكم: ${verdict}`,
    values: { n, treads, R, G, run, angle, stringer, twoRG, allOk }
  };
}
