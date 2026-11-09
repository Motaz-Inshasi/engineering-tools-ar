import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { fmt, tex as ntex, eng } from "../core/format.js";
import { cadd, csub, cmul, cdiv, cabs, carg, ctex, cfmt, cpolarText, cpolarTex } from "../core/complex.js";
import { phasorBlock } from "./common.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "حاسبة الطور (Phasor): اجمع أو اطرح أو اضرب أو اقسم إشارتين جيبيتين بالصيغة القطبية أو الديكارتية، وحوّل الناتج إلى الصيغة الزمنية v(t)، مع مخطط الطور ورسم الموجات.",
  keywords: ["طور", "فيزور", "phasor", "جمع الإشارات الجيبية", "صيغة قطبية", "مخطط الطور", "v(t)"],
  formulas: [
    { label: "التحويل بين الزمن والطور", tex: "v(t) = V_m\\cos(\\omega t + \\phi) \\;\\leftrightarrow\\; \\mathbf{V} = V_m\\angle\\phi" },
    { label: "الجمع ديكارتياً والضرب قطبياً", tex: "\\mathbf{V}_1 + \\mathbf{V}_2 = (a_1+a_2) + j(b_1+b_2),\\qquad \\mathbf{V}_1\\mathbf{V}_2 = V_1V_2\\angle(\\phi_1+\\phi_2)" }
  ],
  inputs: [
    { id: "p1", label: "الطور الأول", type: "text", default: "10∠30", help: "قطبي مثل 10∠30 (بالدرجات) أو ديكارتي مثل 8.66+5j." },
    { id: "p2", label: "الطور الثاني", type: "text", default: "5∠-45" },
    { id: "op", label: "العملية", type: "select", default: "add", options: [["add", "جمع"], ["sub", "طرح"], ["mul", "ضرب"], ["div", "قسمة"]] },
    { id: "f", label: "التردد (لكتابة v(t))", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { p1: "10∠30", p2: "5∠-45", op: "add", f: "50" }, expect: ["12.28 ∠ 6.847°", "12.1958 + 1.46447j"], note: "مثال: جمع $10\\angle 30^\\circ$ و $5\\angle -45^\\circ$." },
  invalid: { values: { p1: "10∠30", p2: "0", op: "div", f: "50" } },
  related: ["complex-numbers", "rlc-circuit", "complex-power", "three-phase"]
};

const D = (z) => (carg(z) * 180) / Math.PI;

export function solve(input) {
  const a = readComplex(input, "p1", "الطور الأول"), b = readComplex(input, "p2", "الطور الثاني");
  const op = choice(input, "op", "العملية", ["add", "sub", "mul", "div"], "add");
  const f = num(input, "f", "التردد", { positive: true });
  const w = 2 * Math.PI * f;
  const steps = [
    { text: "نكتب الطورين بالصيغتين:", tex: `\\mathbf{A} = ${cpolarTex(a, 6)} = ${ctex(a, 6)},\\quad \\mathbf{B} = ${cpolarTex(b, 6)} = ${ctex(b, 6)}` }
  ];
  let z;
  if (op === "add" || op === "sub") {
    z = op === "add" ? cadd(a, b) : csub(a, b);
    steps.push({ text: "الجمع والطرح أسهل بالصيغة الديكارتية:", tex: `${ctex(a, 6)} ${op === "add" ? "+" : "-"} (${ctex(b, 6)}) = ${ctex(z, 6)}` });
    steps.push({ text: "ثم نعود للقطبية:", tex: `|\\mathbf{R}| = ${ntex(cabs(z), 6)},\\quad \\angle\\mathbf{R} = ${ntex(D(z), 5)}^\\circ` });
  } else {
    if (op === "div" && cabs(b) === 0) fail("لا يمكن القسمة على طور مقداره صفر.", "p2");
    z = op === "mul" ? cmul(a, b) : cdiv(a, b);
    steps.push({ text: op === "mul" ? "الضرب أسهل قطبياً: نضرب المقادير ونجمع الزوايا:" : "القسمة قطبياً: نقسم المقادير ونطرح الزوايا:", tex: `${ntex(cabs(a), 6)} ${op === "mul" ? "\\times" : "\\div"} ${ntex(cabs(b), 6)} \\angle (${ntex(D(a), 5)}^\\circ ${op === "mul" ? "+" : "-"} ${ntex(D(b), 5)}^\\circ) = ${cpolarTex(z, 6)}` });
  }
  const timeTex = (p) => `${ntex(cabs(p), 5)}\\cos(${ntex(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${ntex(Math.abs(D(p)), 5)}^\\circ)`;
  const timeText = (p) => `${fmt(cabs(p), 5)} cos(${fmt(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${fmt(Math.abs(D(p)), 5)}°)`;
  if (op === "add" || op === "sub") steps.push({ text: "بالصيغة الزمنية (الإشارتان بالتردد نفسه):", tex: `r(t) = ${timeTex(z)}` });
  const T = 1 / f;
  const sig = (p) => (t) => cabs(p) * Math.cos(w * t + carg(p));
  const series = [{ name: "A", points: sampleFunction(sig(a), 0, 2 * T, 400) }, { name: "B", points: sampleFunction(sig(b), 0, 2 * T, 400) }];
  if (op === "add" || op === "sub") series.push({ name: "الناتج", points: sampleFunction(sig(z), 0, 2 * T, 400), width: 3 });
  return {
    results: [
      { label: "الناتج قطبياً", tex: cpolarTex(z, 6), text: cpolarText(z, 4) },
      { label: "الناتج ديكارتياً", tex: ctex(z, 6), text: cfmt(z, 6) },
      ...(op === "add" || op === "sub" ? [{ label: "الصيغة الزمنية", tex: `r(t) = ${timeTex(z)}`, text: timeText(z) }] : [])
    ],
    blocks: [phasorBlock([["A", a], ["B", b], ["الناتج", z]]), { type: "plot", title: `الموجات خلال دورين (${eng(f, "Hz")})`, xLabel: "t (s)", yLabel: "v", series }],
    steps, copy: `${cpolarText(z, 4)} = ${cfmt(z, 6)}`
  };
}
