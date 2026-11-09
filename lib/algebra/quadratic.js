import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { niceTex, nice, fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "حل المعادلة التربيعية ax² + bx + c = 0 بالقانون العام مع المميز، والجذور الحقيقية أو المركبة، ورأس القطع المكافئ والتحليل إلى عوامل والرسم.",
  keywords: ["معادلة تربيعية", "معادلة من الدرجة الثانية", "القانون العام", "المميز", "quadratic", "دلتا", "رأس القطع"],
  formulas: [
    { label: "القانون العام والمميز", tex: "x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a},\\qquad \\Delta = b^2 - 4ac" },
    { label: "رأس القطع المكافئ", tex: "x_v = -\\frac{b}{2a},\\qquad y_v = c - \\frac{b^2}{4a}" }
  ],
  inputs: [
    { id: "a", label: "a", type: "number", default: "1" },
    { id: "b", label: "b", type: "number", default: "-3" },
    { id: "c", label: "c", type: "number", default: "2" }
  ],
  example: { values: { a: "2", b: "4", c: "10" }, expect: ["x1 = -1 + 2j", "x2 = -1 - 2j"], note: "مثال: $2x^2 + 4x + 10 = 0$ مميزها سالب فجذراها مركبان." },
  invalid: { values: { a: "0", b: "2", c: "1" } },
  related: ["polynomial-roots", "complex-numbers", "function-plotter"]
};

export function solve(input) {
  const a = num(input, "a", "a"), b = num(input, "b", "b"), c = num(input, "c", "c");
  if (a === 0) fail("a لا يمكن أن يساوي صفراً، وإلا تصبح المعادلة خطية وليست تربيعية.", "a");
  const D = b * b - 4 * a * c;
  const steps = [
    { text: "المعادلة:", tex: `${niceTex(a)}x^2 ${b < 0 ? "-" : "+"} ${niceTex(Math.abs(b))}x ${c < 0 ? "-" : "+"} ${niceTex(Math.abs(c))} = 0` },
    { text: "نحسب المميز:", tex: `\\Delta = b^2 - 4ac = (${niceTex(b)})^2 - 4(${niceTex(a)})(${niceTex(c)}) = ${niceTex(D, 10)}` }
  ];
  const xv = -b / (2 * a), yv = c - (b * b) / (4 * a);
  let results, copy;
  const scale = Math.max(b * b, Math.abs(4 * a * c));
  if (Math.abs(D) <= 1e-14 * scale) {
    steps.push({ text: "المميز صفر، فللمعادلة جذر حقيقي مكرر:", tex: `x = -\\frac{b}{2a} = ${niceTex(xv, 10)}` });
    results = [{ label: "نوع الجذرين", value: "حقيقي مكرر (Δ = 0)" }, { label: "$x$", value: xv, display: nice(xv, 10), text: `x = ${nice(xv, 10)}` }];
    copy = `x = ${nice(xv, 10)} (مكرر)`;
    steps.push({ text: "التحليل:", tex: `${niceTex(a)}\\left(x ${xv < 0 ? "+" : "-"} ${niceTex(Math.abs(xv))}\\right)^2` });
  } else if (D > 0) {
    const s = Math.sqrt(D);
    const q = -0.5 * (b + Math.sign(b || 1) * s);
    let x1 = q / a, x2 = c / q;
    if (q === 0) { x1 = s / (2 * a); x2 = -s / (2 * a); }
    if (x1 < x2) [x1, x2] = [x2, x1];
    steps.push({ text: "المميز موجب، فللمعادلة جذران حقيقيان مختلفان:", tex: `x = \\frac{${niceTex(-b)} \\pm \\sqrt{${niceTex(D, 10)}}}{${niceTex(2 * a)}}` });
    steps.push({ tex: `x_1 = ${niceTex(x1, 10)},\\qquad x_2 = ${niceTex(x2, 10)}` });
    steps.push(`استخدمنا الصيغة المستقرة عددياً $x_1 = q/a,\\; x_2 = c/q$ لتجنب فقدان الدقة. للتحقق: $x_1 + x_2 = -b/a = ${niceTex(-b / a, 8)}$ و $x_1 x_2 = c/a = ${niceTex(c / a, 8)}$.`);
    steps.push({ text: "التحليل إلى عوامل:", tex: `${niceTex(a)}\\left(x ${x1 < 0 ? "+" : "-"} ${niceTex(Math.abs(x1), 8)}\\right)\\left(x ${x2 < 0 ? "+" : "-"} ${niceTex(Math.abs(x2), 8)}\\right)` });
    results = [{ label: "نوع الجذرين", value: "حقيقيان مختلفان (Δ > 0)" }, { label: "$x_1$", value: x1, display: nice(x1, 10), text: `x1 = ${nice(x1, 10)}` }, { label: "$x_2$", value: x2, display: nice(x2, 10), text: `x2 = ${nice(x2, 10)}` }];
    copy = `x1 = ${nice(x1, 10)}\nx2 = ${nice(x2, 10)}`;
  } else {
    const re = xv, im = Math.sqrt(-D) / (2 * Math.abs(a));
    const z = (s) => `${nice(re, 10)} ${s} ${nice(im, 10) === "1" ? "" : nice(im, 10)}j`;
    steps.push({ text: "المميز سالب، فالجذران مركبان مترافقان:", tex: `x = \\frac{${niceTex(-b)} \\pm j\\sqrt{${niceTex(-D, 10)}}}{${niceTex(2 * a)}} = ${niceTex(re, 10)} \\pm ${niceTex(im, 10)}j` });
    results = [{ label: "نوع الجذرين", value: "مركبان مترافقان (Δ < 0)" }, { label: "$x_1$", value: z("+"), text: `x1 = ${z("+")}` }, { label: "$x_2$", value: z("-"), text: `x2 = ${z("-")}` }];
    copy = `x1 = ${z("+")}\nx2 = ${z("-")}`;
  }
  steps.push({ text: "رأس القطع المكافئ:", tex: `\\left(${ntex(xv, 8)},\\; ${ntex(yv, 8)}\\right),\\ \\text{${a > 0 ? "minimum" : "maximum"}}` });
  results.push({ label: "رأس القطع", value: `(${fmt(xv, 8)}, ${fmt(yv, 8)})` });
  const w = Math.max(3, Math.sqrt(Math.abs(D)) / Math.abs(a));
  return {
    results, steps, copy,
    blocks: [{ type: "plot", title: "القطع المكافئ", xLabel: "x", yLabel: "y", series: [{ name: "y = ax² + bx + c", points: sampleFunction((x) => a * x * x + b * x + c, xv - w, xv + w, 300) }] }]
  };
}
