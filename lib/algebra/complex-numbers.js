import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { C, cadd, csub, cmul, cdiv, cabs, carg, cconj, cpow, croots, cclean, ctex, cfmt, cpolarTex, cpolarText } from "../core/complex.js";
import { tex as ntex, fmt } from "../core/format.js";

const OPS = [["convert", "تحويل بين الصيغ"], ["add", "جمع z₁ + z₂"], ["sub", "طرح z₁ − z₂"], ["mul", "ضرب z₁ × z₂"], ["div", "قسمة z₁ ÷ z₂"], ["pow", "رفع z₁ لقوة n"], ["roots", "جذور z₁ النونية"], ["conj", "المرافق"]];

export const meta = {
  description: "عمليات الأعداد المركبة بالصيغتين الديكارتية والقطبية: التحويل والجمع والطرح والضرب والقسمة والقوى والجذور (نظرية دي موافر)، مع رسم على المستوى المركب.",
  keywords: ["أعداد مركبة", "عدد مركب", "complex", "قطبي", "ديكارتي", "دي موافر", "مقدار", "زاوية", "مرافق"],
  formulas: [
    { label: "التحويل بين الصيغتين", tex: "z = a + jb = r\\angle\\theta,\\quad r = \\sqrt{a^2+b^2},\\quad \\theta = \\operatorname{atan2}(b, a)" },
    { label: "الضرب والقسمة ونظرية دي موافر", tex: "z_1 z_2 = r_1 r_2 \\angle(\\theta_1+\\theta_2),\\quad z^n = r^n\\angle n\\theta,\\quad \\sqrt[n]{z} = \\sqrt[n]{r}\\angle\\frac{\\theta + 360^\\circ k}{n}" }
  ],
  inputs: [
    { id: "op", label: "العملية", type: "select", default: "mul", options: OPS },
    { id: "z1", label: "العدد الأول z₁", type: "text", default: "3+4j", help: "ديكارتي مثل 3+4j أو 2-5i، أو قطبي مثل 5∠53.13 (بالدرجات)." },
    { id: "z2", label: "العدد الثاني z₂", type: "text", default: "1-2j", when: { op: ["add", "sub", "mul", "div"] } },
    { id: "n", label: "n", type: "number", default: "3", when: { op: ["pow", "roots"] } }
  ],
  example: { values: { op: "mul", z1: "3+4j", z2: "1-2j" }, expect: ["11 - 2j"], note: "مثال: $(3+4j)(1-2j) = 11 - 2j$." },
  invalid: { values: { op: "div", z1: "1+j", z2: "0" } },
  related: ["phasor", "impedance", "polynomial-roots", "quadratic"]
};

const deg = (z) => (carg(z) * 180) / Math.PI;

function forms(z) {
  return `${ctex(z, 8)} = ${cpolarTex(z, 8)}`;
}

export function solve(input) {
  const op = choice(input, "op", "العملية", OPS.map((o) => o[0]), "mul");
  const z1 = readComplex(input, "z1", "العدد الأول");
  const steps = [{ text: "العدد الأول بالصيغتين:", tex: `z_1 = ${forms(z1)}` }];
  steps.push({ text: "حساب المقدار والزاوية:", tex: `r_1 = \\sqrt{(${ntex(z1.re)})^2 + (${ntex(z1.im)})^2} = ${ntex(cabs(z1), 8)},\\quad \\theta_1 = ${ntex(deg(z1), 8)}^\\circ` });
  let z, label = "الناتج", extra = [], points = [["z₁", z1]];
  if (["add", "sub", "mul", "div"].includes(op)) {
    const z2 = readComplex(input, "z2", "العدد الثاني");
    points.push(["z₂", z2]);
    steps.push({ text: "العدد الثاني:", tex: `z_2 = ${forms(z2)}` });
    if (op === "add" || op === "sub") {
      z = op === "add" ? cadd(z1, z2) : csub(z1, z2);
      steps.push({ text: "نجمع/نطرح الأجزاء الحقيقية معاً والتخيلية معاً:", tex: `(${ntex(z1.re)} ${op === "add" ? "+" : "-"} ${ntex(z2.re)}) + j(${ntex(z1.im)} ${op === "add" ? "+" : "-"} ${ntex(z2.im)}) = ${ctex(z, 8)}` });
    } else if (op === "mul") {
      z = cmul(z1, z2);
      steps.push({ text: "بالصيغة الديكارتية مع $j^2 = -1$:", tex: `(ac - bd) + j(ad + bc) = ${ctex(z, 8)}` });
      steps.push({ text: "أو بالصيغة القطبية: نضرب المقادير ونجمع الزوايا:", tex: `${ntex(cabs(z1), 6)} \\cdot ${ntex(cabs(z2), 6)} \\angle (${ntex(deg(z1), 6)}^\\circ + ${ntex(deg(z2), 6)}^\\circ) = ${cpolarTex(z, 8)}` });
    } else {
      if (cabs(z2) === 0) fail("لا يمكن القسمة على صفر.", "z2");
      z = cdiv(z1, z2);
      steps.push({ text: "نضرب البسط والمقام في مرافق المقام:", tex: `\\frac{z_1 \\cdot \\overline{z_2}}{|z_2|^2} = \\frac{${ctex(cmul(z1, cconj(z2)), 8)}}{${ntex(cabs(z2) ** 2, 8)}} = ${ctex(z, 8)}` });
      steps.push({ text: "أو قطبياً: نقسم المقادير ونطرح الزوايا:", tex: `${cpolarTex(z, 8)}` });
    }
  } else if (op === "pow") {
    const n = num(input, "n", "n", { integer: true, min: -50, max: 50 });
    if (cabs(z1) === 0 && n < 0) fail("لا يمكن رفع الصفر لقوة سالبة.", "n");
    z = cpow(z1, n);
    steps.push({ text: "نظرية دي موافر:", tex: `z_1^{${n}} = ${ntex(cabs(z1), 6)}^{${n}} \\angle (${n} \\times ${ntex(deg(z1), 6)}^\\circ) = ${cpolarTex(z, 8)}` });
  } else if (op === "roots") {
    const n = num(input, "n", "n", { integer: true, min: 1, max: 24 });
    const rs = croots(z1, n).map((w) => cclean(w, 1e-12));
    steps.push({ text: `الجذور النونية: نأخذ الجذر النوني للمقدار ونقسم الزاوية مضافاً إليها $360^\\circ k$ على ${n}:`, tex: `w_k = \\sqrt[${n}]{${ntex(cabs(z1), 6)}} \\angle \\frac{${ntex(deg(z1), 6)}^\\circ + 360^\\circ k}{${n}},\\; k = 0,\\dots,${n - 1}` });
    const rows = rs.map((w, k) => [String(k), { tex: ctex(w, 8) }, { tex: cpolarTex(w, 8) }]);
    rs.forEach((w, k) => points.push([`w${k}`, w]));
    const text = rs.map((w) => cfmt(w, 8)).join("، ");
    return {
      results: [{ label: `الجذور (${n})`, value: text }],
      blocks: [{ type: "table", head: ["k", "ديكارتي", "قطبي"], rows }, plot(points)],
      steps, copy: rs.map((w) => cfmt(w, 8)).join("\n")
    };
  } else if (op === "conj") {
    z = cconj(z1);
    steps.push({ tex: `\\overline{z_1} = ${ctex(z, 8)} = ${cpolarTex(z, 8)}` });
    label = "المرافق";
  } else {
    z = z1;
    label = "z₁";
  }
  z = cclean(z, 1e-13);
  points.push(["الناتج", z]);
  return {
    results: [
      { label: `${label} (ديكارتي)`, tex: ctex(z, 10), text: cfmt(z, 10) },
      { label: `${label} (قطبي)`, tex: cpolarTex(z, 10), text: cpolarText(z, 10) },
      { label: "المقدار", value: cabs(z), sig: 10 },
      { label: "الزاوية", value: deg(z), unit: "°", sig: 10 },
      { label: "الزاوية بالراديان", value: carg(z), unit: "rad", sig: 10 }
    ],
    blocks: [plot(points)],
    steps, copy: `${cfmt(z, 10)} = ${cpolarText(z, 10)}`
  };
}

function plot(points) {
  const m = Math.max(1, ...points.map(([, z]) => Math.max(Math.abs(z.re), Math.abs(z.im)))) * 1.25;
  return {
    type: "plot", title: "المستوى المركب", xLabel: "Re", yLabel: "Im", equalAspect: true, xMin: -m, xMax: m, yMin: -m, yMax: m,
    series: points.map(([name, z]) => ({ name, points: [[0, 0], [z.re, z.im]], marker: "o", line: true }))
  };
}
