import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { C, cadd, csub, cmul, cdiv, cabs, carg, cconj, cpow, croots, cclean, ctex, cfmt, cpolarTex, cpolarText } from "../core/complex.js";
import { tex as ntex, fmt } from "../core/format.js";

const OPS = [["convert", "شکل کی تبدیلی"], ["add", "جمع z₁ + z₂"], ["sub", "تفریق z₁ − z₂"], ["mul", "ضرب z₁ × z₂"], ["div", "تقسیم z₁ ÷ z₂"], ["pow", "z₁ کو n کی قوت پر رکھیں"], ["roots", "z₁ کے nویں جذور"], ["conj", "کنجوگیٹ"]];

export const meta = {
  description: "کمپلیکس نمبرز کی کارٹیزئن اور پولر شکلوں میں عملیات: تبدیلی، جمع، تفریق، ضرب، تقسیم، قوتیں اور جذور (ڈی موائیر کا تھیورم)، ساتھ کمپلیکس پلین پر گراف۔",
  keywords: ["کمپلیکس نمبرز", "کمپلیکس نمبر", "complex", "پولر", "کارٹیزئن", "ڈی موائیر", "ماڈیولس", "زاویہ", "کنجوگیٹ"],
  formulas: [
    { label: "دونوں شکلوں کے درمیان تبدیلی", tex: "z = a + jb = r\\angle\\theta,\\quad r = \\sqrt{a^2+b^2},\\quad \\theta = \\operatorname{atan2}(b, a)" },
    { label: "ضرب، تقسیم اور ڈی موائیر کا تھیورم", tex: "z_1 z_2 = r_1 r_2 \\angle(\\theta_1+\\theta_2),\\quad z^n = r^n\\angle n\\theta,\\quad \\sqrt[n]{z} = \\sqrt[n]{r}\\angle\\frac{\\theta + 360^\\circ k}{n}" }
  ],
  inputs: [
    { id: "op", label: "عمل", type: "select", default: "mul", options: OPS },
    { id: "z1", label: "پہلا عدد z₁", type: "text", default: "3+4j", help: "کارٹیزئن جیسے 3+4j یا 2-5i، یا پولر جیسے 5∠53.13 (ڈگری میں)۔" },
    { id: "z2", label: "دوسرا عدد z₂", type: "text", default: "1-2j", when: { op: ["add", "sub", "mul", "div"] } },
    { id: "n", label: "n", type: "number", default: "3", when: { op: ["pow", "roots"] } }
  ],
  example: { values: { op: "mul", z1: "3+4j", z2: "1-2j" }, expect: ["11 - 2j"], note: "مثال: $(3+4j)(1-2j) = 11 - 2j$۔" },
  invalid: { values: { op: "div", z1: "1+j", z2: "0" } },
  related: ["phasor", "impedance", "polynomial-roots", "quadratic"]
};

const deg = (z) => (carg(z) * 180) / Math.PI;

function forms(z) {
  return `${ctex(z, 8)} = ${cpolarTex(z, 8)}`;
}

export function solve(input) {
  const op = choice(input, "op", "عمل", OPS.map((o) => o[0]), "mul");
  const z1 = readComplex(input, "z1", "پہلا عدد");
  const steps = [{ text: "دونوں شکلوں میں پہلا عدد:", tex: `z_1 = ${forms(z1)}` }];
  steps.push({ text: "ماڈیولس اور زاویہ معلوم کریں:", tex: `r_1 = \\sqrt{(${ntex(z1.re)})^2 + (${ntex(z1.im)})^2} = ${ntex(cabs(z1), 8)},\\quad \\theta_1 = ${ntex(deg(z1), 8)}^\\circ` });
  let z, label = "نتیجہ", extra = [], points = [["z₁", z1]];
  if (["add", "sub", "mul", "div"].includes(op)) {
    const z2 = readComplex(input, "z2", "دوسرا عدد");
    points.push(["z₂", z2]);
    steps.push({ text: "دوسرا عدد:", tex: `z_2 = ${forms(z2)}` });
    if (op === "add" || op === "sub") {
      z = op === "add" ? cadd(z1, z2) : csub(z1, z2);
      steps.push({ text: "ہم حقیقی حصوں کو اور تخیلی حصوں کو الگ الگ جمع یا تفریق کرتے ہیں:", tex: `(${ntex(z1.re)} ${op === "add" ? "+" : "-"} ${ntex(z2.re)}) + j(${ntex(z1.im)} ${op === "add" ? "+" : "-"} ${ntex(z2.im)}) = ${ctex(z, 8)}` });
    } else if (op === "mul") {
      z = cmul(z1, z2);
      steps.push({ text: "کارٹیزئن شکل میں $j^2 = -1$ کے ساتھ:", tex: `(ac - bd) + j(ad + bc) = ${ctex(z, 8)}` });
      steps.push({ text: "یا پولر شکل میں: ماڈیولس ضرب دیں اور زاویے جمع کریں:", tex: `${ntex(cabs(z1), 6)} \\cdot ${ntex(cabs(z2), 6)} \\angle (${ntex(deg(z1), 6)}^\\circ + ${ntex(deg(z2), 6)}^\\circ) = ${cpolarTex(z, 8)}` });
    } else {
      if (cabs(z2) === 0) fail("صفر سے تقسیم ممکن نہیں۔", "z2");
      z = cdiv(z1, z2);
      steps.push({ text: "صورت اور مخرج کو مخرج کے کنجوگیٹ سے ضرب دیں:", tex: `\\frac{z_1 \\cdot \\overline{z_2}}{|z_2|^2} = \\frac{${ctex(cmul(z1, cconj(z2)), 8)}}{${ntex(cabs(z2) ** 2, 8)}} = ${ctex(z, 8)}` });
      steps.push({ text: "یا پولر شکل میں: ماڈیولس تقسیم کریں اور زاویے تفریق کریں:", tex: `${cpolarTex(z, 8)}` });
    }
  } else if (op === "pow") {
    const n = num(input, "n", "n", { integer: true, min: -50, max: 50 });
    if (cabs(z1) === 0 && n < 0) fail("صفر کو منفی قوت پر نہیں اٹھایا جا سکتا۔", "n");
    z = cpow(z1, n);
    steps.push({ text: "ڈی موائیر کا تھیورم:", tex: `z_1^{${n}} = ${ntex(cabs(z1), 6)}^{${n}} \\angle (${n} \\times ${ntex(deg(z1), 6)}^\\circ) = ${cpolarTex(z, 8)}` });
  } else if (op === "roots") {
    const n = num(input, "n", "n", { integer: true, min: 1, max: 24 });
    const rs = croots(z1, n).map((w) => cclean(w, 1e-12));
    steps.push({ text: `nویں جذور: ماڈیولس کا nواں جذر لیں اور زاویے میں $360^\\circ k$ جمع کرکے ${n} پر تقسیم کریں:`, tex: `w_k = \\sqrt[${n}]{${ntex(cabs(z1), 6)}} \\angle \\frac{${ntex(deg(z1), 6)}^\\circ + 360^\\circ k}{${n}},\\; k = 0,\\dots,${n - 1}` });
    const rows = rs.map((w, k) => [String(k), { tex: ctex(w, 8) }, { tex: cpolarTex(w, 8) }]);
    rs.forEach((w, k) => points.push([`w${k}`, w]));
    const text = rs.map((w) => cfmt(w, 8)).join("، ");
    return {
      results: [{ label: `جذور (${n})`, value: text }],
      blocks: [{ type: "table", head: ["k", "کارٹیزئن", "پولر"], rows }, plot(points)],
      steps, copy: rs.map((w) => cfmt(w, 8)).join("\n")
    };
  } else if (op === "conj") {
    z = cconj(z1);
    steps.push({ tex: `\\overline{z_1} = ${ctex(z, 8)} = ${cpolarTex(z, 8)}` });
    label = "کنجوگیٹ";
  } else {
    z = z1;
    label = "z₁";
  }
  z = cclean(z, 1e-13);
  points.push(["نتیجہ", z]);
  return {
    results: [
      { label: `${label} (کارٹیزئن)`, tex: ctex(z, 10), text: cfmt(z, 10) },
      { label: `${label} (پولر)`, tex: cpolarTex(z, 10), text: cpolarText(z, 10) },
      { label: "ماڈیولس", value: cabs(z), sig: 10 },
      { label: "زاویہ", value: deg(z), unit: "°", sig: 10 },
      { label: "ریڈین میں زاویہ", value: carg(z), unit: "rad", sig: 10 }
    ],
    blocks: [plot(points)],
    steps, copy: `${cfmt(z, 10)} = ${cpolarText(z, 10)}`
  };
}

function plot(points) {
  const m = Math.max(1, ...points.map(([, z]) => Math.max(Math.abs(z.re), Math.abs(z.im)))) * 1.25;
  return {
    type: "plot", title: "کمپلیکس پلین", xLabel: "Re", yLabel: "Im", equalAspect: true, xMin: -m, xMax: m, yMin: -m, yMax: m,
    series: points.map(([name, z]) => ({ name, points: [[0, 0], [z.re, z.im]], marker: "o", line: true }))
  };
}
