import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const HEMO_VOLUME_FACTOR = 1e4;

function sci(x, sig = 4) {
  if (x === 0) return "0";
  const [m, e] = x.toExponential(sig - 1).split("e");
  return `${m.includes(".") ? m.replace(/\.?0+$/, "") : m} × 10^${Number(e)}`;
}

function dilText(x) {
  return Number.isInteger(x) && x < 1e15 ? String(x) : fmt(x, 4);
}

export const meta = {
  description: "احسب تراكيز التخفيف المتسلسل وحجم المخفف لكل خطوة، أو عدد وحدات الاستعمار CFU/mL من المستعمرات المعدودة، أو عدد الخلايا/mL بشريحة العدّ (hemocytometer).",
  keywords: ["تخفيف متسلسل", "serial dilution", "CFU", "وحدات تكوين المستعمرات", "عدّ الخلايا", "hemocytometer", "تريبان أزرق", "تركيز"],
  formulas: [
    { label: "التخفيف عند الخطوة k", tex: "D_k = f^{k},\\qquad C_k = \\frac{C_0}{f^{k}}" },
    { label: "وحدات تكوين المستعمرات", tex: "\\text{CFU/mL} = \\frac{\\text{المستعمرات}}{V \\times d}" },
    { label: "شريحة العدّ", tex: "\\text{خلية/mL} = \\frac{\\text{عدد الخلايا}}{\\text{عدد المربعات}} \\times D \\times 10^4" }
  ],
  inputs: [
    {
      id: "mode", label: "طريقة الحساب", type: "select", default: "series",
      options: [["series", "تخفيف متسلسل"], ["cfu", "عدّ المستعمرات (CFU/mL)"], ["hemocytometer", "عدّ الخلايا بشريحة العدّ"]]
    },
    { id: "c0", label: "تركيز البداية C0", type: "number", default: "1000", when: { mode: ["series"] }, help: "بأي وحدة تريد، مثل CFU/mL أو خلية/mL." },
    { id: "factor", label: "عامل التخفيف في كل خطوة f", type: "number", default: "10", when: { mode: ["series"] }, help: "مثلاً 10 أو 2." },
    { id: "nsteps", label: "عدد خطوات التخفيف", type: "number", default: "6", when: { mode: ["series"] }, help: "عدد صحيح من 1 إلى 15." },
    { id: "vt", label: "حجم النقل من أنبوب لآخر", unit: "mL", type: "number", default: "1", when: { mode: ["series"] } },
    { id: "colonies", label: "عدد المستعمرات المعدودة", type: "number", default: "150", when: { mode: ["cfu"] } },
    { id: "vplate", label: "حجم المحلول المطلي", unit: "mL", type: "number", default: "0.1", when: { mode: ["cfu"] } },
    { id: "dcfu", label: "عامل التخفيف للطبق المعدود", type: "number", default: "1e-6", when: { mode: ["cfu"] }, help: "أدخل 1e-6 أو 1000000؛ القيمة الأكبر من 1 تُعامَل كمقلوب تخفيف." },
    { id: "cells", label: "عدد الخلايا المعدودة في الشريحة", type: "number", default: "200", when: { mode: ["hemocytometer"] } },
    { id: "squares", label: "عدد المربعات الكبيرة المعدودة", type: "number", default: "4", when: { mode: ["hemocytometer"] } },
    { id: "dhemo", label: "عامل التمييع", type: "number", default: "2", when: { mode: ["hemocytometer"] }, help: "مثلاً 2 عند خلط الخلايا مع تريبان أزرق بنسبة 1:1." }
  ],
  example: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "150", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" }, expect: ["1.5 × 10^9 CFU/mL"], note: "مثال: 150 مستعمرة من 0.1 mL من تخفيف 10^-6." },
  invalid: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "-5", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" } },
  related: ["solutions", "population-growth", "lab-units"]
};

function seriesMode(input) {
  const c0 = num(input, "c0", "تركيز البداية C0", { positive: true });
  const f = num(input, "factor", "عامل التخفيف", { positive: true });
  if (f <= 1) fail("عامل التخفيف يجب أن يكون أكبر من 1.", "factor");
  const n = num(input, "nsteps", "عدد الخطوات", { integer: true, min: 1, max: 15 });
  const vt = num(input, "vt", "حجم النقل", { positive: true });
  const perTube = vt * (f - 1);
  const cn = c0 / Math.pow(f, n);
  const rows = [["الأصلي", "1:1", fmt(c0, 6), "—"]];
  for (let k = 1; k <= n; k++) rows.push([String(k), `1:${dilText(Math.pow(f, k))}`, fmt(c0 / Math.pow(f, k), 4), fmt(perTube, 4)]);
  return {
    results: [
      { label: "التركيز النهائي", value: fmt(cn, 4) },
      { label: "التخفيف الكلي", value: `1:${dilText(Math.pow(f, n))}` },
      { label: "إجمالي المخفف المضاف (mL)", value: fmt(n * perTube, 4) }
    ],
    steps: [
      { text: "التخفيف عند الأنبوب الأخير:", tex: `D_n = f^n = ${ntex(f)}^{${n}} = ${ntex(Math.pow(f, n))}` },
      { text: "التركيز النهائي:", tex: `C_n = \\frac{C_0}{f^n} = \\frac{${ntex(c0)}}{${ntex(Math.pow(f, n))}} = ${ntex(cn, 6)}` },
      { text: "حجم المخفف المضاف في كل أنبوب:", tex: `V_d = V_t (f-1) = ${ntex(vt)} \\times ${ntex(f - 1)} = ${ntex(perTube)}\\ \\text{mL}` }
    ],
    copy: `التركيز بعد ${n} خطوات = ${fmt(cn, 4)} (تخفيف 1:${dilText(Math.pow(f, n))})`,
    blocks: [{ type: "table", caption: "جدول الأنابيب", head: ["الأنبوب", "التخفيف", "التركيز", "المخفف المضاف (mL)"], rows, ltr: true }]
  };
}

function cfuMode(input) {
  const colonies = num(input, "colonies", "عدد المستعمرات", { integer: true, nonNegative: true });
  const V = num(input, "vplate", "حجم المحلول المطلي", { positive: true });
  const d0 = num(input, "dcfu", "عامل التخفيف", { positive: true });
  const d = d0 > 1 ? 1 / d0 : d0;
  const cfu = colonies / (V * d);
  const inRange = colonies >= 30 && colonies <= 300;
  const blocks = [];
  if (!inRange) blocks.push({ type: "note", tone: "warn", text: "عدد المستعمرات خارج المدى المقبول 30 إلى 300، لذا تكون النتيجة تقديرية وأقل دقة." });
  return {
    results: [
      { label: "عدد وحدات تكوين المستعمرات", value: `${sci(cfu)} CFU/mL` },
      { label: "عامل التخفيف المستخدم", value: dilText(d) },
      { label: "نطاق العدّ", value: inRange ? "ضمن المدى 30 إلى 300" : "خارج المدى 30 إلى 300" }
    ],
    steps: [
      d0 > 1 ? { text: "القيمة المدخلة أكبر من 1 فتُعامل كمقلوب تخفيف:", tex: `d = \\frac{1}{${ntex(d0)}} = ${ntex(d)}` } : { text: "عامل التخفيف المستخدم:", tex: `d = ${ntex(d)}` },
      { text: "وحدات تكوين المستعمرات لكل mL:", tex: `\\frac{${colonies}}{${ntex(V)} \\times ${ntex(d)}} = ${ntex(cfu, 6)}\\ \\text{CFU/mL}` }
    ],
    copy: `${sci(cfu)} CFU/mL`,
    blocks
  };
}

function hemoMode(input) {
  const cells = num(input, "cells", "عدد الخلايا المعدودة", { integer: true, nonNegative: true });
  const squares = num(input, "squares", "عدد المربعات", { integer: true, positive: true });
  const D = num(input, "dhemo", "عامل التمييع", { positive: true });
  if (D < 1) fail("عامل التمييع يجب أن يكون 1 أو أكبر.", "dhemo");
  const avg = cells / squares;
  const cpm = avg * D * HEMO_VOLUME_FACTOR;
  return {
    results: [
      { label: "عدد الخلايا لكل mL", value: `${sci(cpm)} خلية/mL` },
      { label: "متوسط الخلايا في المربع الواحد", value: fmt(avg, 4) }
    ],
    steps: [
      { text: "متوسط الخلايا في المربع الكبير الواحد:", tex: `\\frac{${cells}}{${squares}} = ${ntex(avg, 6)}` },
      { text: "تحويل إلى خلايا لكل mL مع التمييع وحجم المربع (10^4 mL):", tex: `${ntex(avg, 6)} \\times ${ntex(D)} \\times 10^4 = ${ntex(cpm, 6)}\\ \\text{cells/mL}` }
    ],
    copy: `${sci(cpm)} خلية/mL`,
    blocks: [{ type: "note", text: "حجم المربع الكبير في الشريحة 1 mm × 1 mm × 0.1 mm = 0.1 µL = 10^-4 mL، لذلك يُضرب المتوسط في 10^4 للحصول على خلايا لكل mL." }]
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "طريقة الحساب", ["series", "cfu", "hemocytometer"], "series");
  if (mode === "cfu") return cfuMode(input);
  if (mode === "hemocytometer") return hemoMode(input);
  return seriesMode(input);
}
