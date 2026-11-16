import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { fmt, tex as ntex, eng } from "../core/format.js";
import { cadd, csub, cmul, cdiv, cabs, carg, ctex, cfmt, cpolarText, cpolarTex } from "../core/complex.js";
import { phasorBlock } from "./common.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "فیزر کیلکولیٹر: دو سائن نما سگنلز کو پولر یا ریکٹینگولر شکل میں جمع، تفریق، ضرب یا تقسیم کریں، نتیجے کو v(t) کی ٹائم شکل میں بدلیں، ساتھ فیزر ڈائیگرام اور ویو فارم گراف۔",
  keywords: ["فیزر", "فیزر", "phasor", "سائن نما سگنلز کا جمع", "پولر شکل", "فیزر ڈائیگرام", "v(t)"],
  formulas: [
    { label: "ٹائم اور فیزر کے درمیان تبدیلی", tex: "v(t) = V_m\\cos(\\omega t + \\phi) \\;\\leftrightarrow\\; \\mathbf{V} = V_m\\angle\\phi" },
    { label: "ریکٹینگولر شکل میں جمع، پولر شکل میں ضرب", tex: "\\mathbf{V}_1 + \\mathbf{V}_2 = (a_1+a_2) + j(b_1+b_2),\\qquad \\mathbf{V}_1\\mathbf{V}_2 = V_1V_2\\angle(\\phi_1+\\phi_2)" }
  ],
  inputs: [
    { id: "p1", label: "پہلا فیزر", type: "text", default: "10∠30", help: "پولر شکل جیسے 10∠30 (ڈگری میں) یا ریکٹینگولر شکل جیسے 8.66+5j۔" },
    { id: "p2", label: "دوسرا فیزر", type: "text", default: "5∠-45" },
    { id: "op", label: "عمل", type: "select", default: "add", options: [["add", "جمع"], ["sub", "تفریق"], ["mul", "ضرب"], ["div", "تقسیم"]] },
    { id: "f", label: "فریکوئنسی (v(t) لکھنے کے لیے)", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { p1: "10∠30", p2: "5∠-45", op: "add", f: "50" }, expect: ["12.28 ∠ 6.847°", "12.1958 + 1.46447j"], note: "مثال: $10\\angle 30^\\circ$ اور $5\\angle -45^\\circ$ کو جمع کریں۔" },
  invalid: { values: { p1: "10∠30", p2: "0", op: "div", f: "50" } },
  related: ["complex-numbers", "rlc-circuit", "complex-power", "three-phase"]
};

const D = (z) => (carg(z) * 180) / Math.PI;

export function solve(input) {
  const a = readComplex(input, "p1", "پہلا فیزر"), b = readComplex(input, "p2", "دوسرا فیزر");
  const op = choice(input, "op", "عمل", ["add", "sub", "mul", "div"], "add");
  const f = num(input, "f", "فریکوئنسی", { positive: true });
  const w = 2 * Math.PI * f;
  const steps = [
    { text: "ہم دونوں فیزرز کو دونوں شکلوں میں لکھتے ہیں:", tex: `\\mathbf{A} = ${cpolarTex(a, 6)} = ${ctex(a, 6)},\\quad \\mathbf{B} = ${cpolarTex(b, 6)} = ${ctex(b, 6)}` }
  ];
  let z;
  if (op === "add" || op === "sub") {
    z = op === "add" ? cadd(a, b) : csub(a, b);
    steps.push({ text: "جمع اور تفریق ریکٹینگولر شکل میں آسان ہیں:", tex: `${ctex(a, 6)} ${op === "add" ? "+" : "-"} (${ctex(b, 6)}) = ${ctex(z, 6)}` });
    steps.push({ text: "پھر ہم پولر شکل کی طرف واپس آتے ہیں:", tex: `|\\mathbf{R}| = ${ntex(cabs(z), 6)},\\quad \\angle\\mathbf{R} = ${ntex(D(z), 5)}^\\circ` });
  } else {
    if (op === "div" && cabs(b) === 0) fail("صفر مقدار والے فیزر سے تقسیم ممکن نہیں۔", "p2");
    z = op === "mul" ? cmul(a, b) : cdiv(a, b);
    steps.push({ text: op === "mul" ? "ضرب پولر شکل میں آسان ہے: مقداروں کو ضرب دیں اور زاویوں کو جمع کریں:" : "پولر شکل میں تقسیم: مقداروں کو تقسیم کریں اور زاویوں کو تفریق کریں:", tex: `${ntex(cabs(a), 6)} ${op === "mul" ? "\\times" : "\\div"} ${ntex(cabs(b), 6)} \\angle (${ntex(D(a), 5)}^\\circ ${op === "mul" ? "+" : "-"} ${ntex(D(b), 5)}^\\circ) = ${cpolarTex(z, 6)}` });
  }
  const timeTex = (p) => `${ntex(cabs(p), 5)}\\cos(${ntex(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${ntex(Math.abs(D(p)), 5)}^\\circ)`;
  const timeText = (p) => `${fmt(cabs(p), 5)} cos(${fmt(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${fmt(Math.abs(D(p)), 5)}°)`;
  if (op === "add" || op === "sub") steps.push({ text: "ٹائم شکل میں (دونوں سگنلز ایک ہی فریکوئنسی پر):", tex: `r(t) = ${timeTex(z)}` });
  const T = 1 / f;
  const sig = (p) => (t) => cabs(p) * Math.cos(w * t + carg(p));
  const series = [{ name: "A", points: sampleFunction(sig(a), 0, 2 * T, 400) }, { name: "B", points: sampleFunction(sig(b), 0, 2 * T, 400) }];
  if (op === "add" || op === "sub") series.push({ name: "نتیجہ", points: sampleFunction(sig(z), 0, 2 * T, 400), width: 3 });
  return {
    results: [
      { label: "نتیجہ پولر شکل میں", tex: cpolarTex(z, 6), text: cpolarText(z, 4) },
      { label: "نتیجہ ریکٹینگولر شکل میں", tex: ctex(z, 6), text: cfmt(z, 6) },
      ...(op === "add" || op === "sub" ? [{ label: "ٹائم شکل", tex: `r(t) = ${timeTex(z)}`, text: timeText(z) }] : [])
    ],
    blocks: [phasorBlock([["A", a], ["B", b], ["نتیجہ", z]]), { type: "plot", title: `دو سائیکلز پر ویو فارمز (${eng(f, "Hz")})`, xLabel: "t (s)", yLabel: "v", series }],
    steps, copy: `${cpolarText(z, 4)} = ${cfmt(z, 6)}`
  };
}
