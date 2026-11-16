import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { fmt, tex as ntex, eng } from "../core/format.js";
import { cadd, csub, cmul, cdiv, cabs, carg, ctex, cfmt, cpolarText, cpolarTex } from "../core/complex.js";
import { phasorBlock } from "./common.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "ماشین حساب فازور: جمع، تفریق، ضرب یا تقسیم دو سیگنال سینوسی به صورت قطبی یا مستطیلی، تبدیل نتیجه به شکل زمانی v(t)، همراه با نمودار فازور و رسم موج.",
  keywords: ["فازور", "فازور", "phasor", "جمع سیگنال‌های سینوسی", "شکل قطبی", "نمودار فازور", "v(t)"],
  formulas: [
    { label: "تبدیل بین زمان و فازور", tex: "v(t) = V_m\\cos(\\omega t + \\phi) \\;\\leftrightarrow\\; \\mathbf{V} = V_m\\angle\\phi" },
    { label: "جمع به صورت مستطیلی و ضرب به صورت قطبی", tex: "\\mathbf{V}_1 + \\mathbf{V}_2 = (a_1+a_2) + j(b_1+b_2),\\qquad \\mathbf{V}_1\\mathbf{V}_2 = V_1V_2\\angle(\\phi_1+\\phi_2)" }
  ],
  inputs: [
    { id: "p1", label: "فازور اول", type: "text", default: "10∠30", help: "قطبی مانند 10∠30 (بر حسب درجه) یا مستطیلی مانند 8.66+5j." },
    { id: "p2", label: "فازور دوم", type: "text", default: "5∠-45" },
    { id: "op", label: "عملیات", type: "select", default: "add", options: [["add", "جمع"], ["sub", "تفریق"], ["mul", "ضرب"], ["div", "تقسیم"]] },
    { id: "f", label: "فرکانس (برای نوشتن v(t))", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { p1: "10∠30", p2: "5∠-45", op: "add", f: "50" }, expect: ["12.28 ∠ 6.847°", "12.1958 + 1.46447j"], note: "مثال: جمع $10\\angle 30^\\circ$ و $5\\angle -45^\\circ$." },
  invalid: { values: { p1: "10∠30", p2: "0", op: "div", f: "50" } },
  related: ["complex-numbers", "rlc-circuit", "complex-power", "three-phase"]
};

const D = (z) => (carg(z) * 180) / Math.PI;

export function solve(input) {
  const a = readComplex(input, "p1", "فازور اول"), b = readComplex(input, "p2", "فازور دوم");
  const op = choice(input, "op", "عملیات", ["add", "sub", "mul", "div"], "add");
  const f = num(input, "f", "فرکانس", { positive: true });
  const w = 2 * Math.PI * f;
  const steps = [
    { text: "هر دو فازور را در هر دو شکل می‌نویسیم:", tex: `\\mathbf{A} = ${cpolarTex(a, 6)} = ${ctex(a, 6)},\\quad \\mathbf{B} = ${cpolarTex(b, 6)} = ${ctex(b, 6)}` }
  ];
  let z;
  if (op === "add" || op === "sub") {
    z = op === "add" ? cadd(a, b) : csub(a, b);
    steps.push({ text: "جمع و تفریق در شکل مستطیلی ساده‌تر است:", tex: `${ctex(a, 6)} ${op === "add" ? "+" : "-"} (${ctex(b, 6)}) = ${ctex(z, 6)}` });
    steps.push({ text: "سپس به شکل قطبی برمی‌گردیم:", tex: `|\\mathbf{R}| = ${ntex(cabs(z), 6)},\\quad \\angle\\mathbf{R} = ${ntex(D(z), 5)}^\\circ` });
  } else {
    if (op === "div" && cabs(b) === 0) fail("نمی‌توان بر فازوری با اندازه صفر تقسیم کرد.", "p2");
    z = op === "mul" ? cmul(a, b) : cdiv(a, b);
    steps.push({ text: op === "mul" ? "ضرب در شکل قطبی ساده‌تر است: اندازه‌ها را ضرب و زاویه‌ها را جمع می‌کنیم:" : "تقسیم در شکل قطبی: اندازه‌ها را تقسیم و زاویه‌ها را تفریق می‌کنیم:", tex: `${ntex(cabs(a), 6)} ${op === "mul" ? "\\times" : "\\div"} ${ntex(cabs(b), 6)} \\angle (${ntex(D(a), 5)}^\\circ ${op === "mul" ? "+" : "-"} ${ntex(D(b), 5)}^\\circ) = ${cpolarTex(z, 6)}` });
  }
  const timeTex = (p) => `${ntex(cabs(p), 5)}\\cos(${ntex(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${ntex(Math.abs(D(p)), 5)}^\\circ)`;
  const timeText = (p) => `${fmt(cabs(p), 5)} cos(${fmt(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${fmt(Math.abs(D(p)), 5)}°)`;
  if (op === "add" || op === "sub") steps.push({ text: "در شکل زمانی (هر دو سیگنال با یک فرکانس):", tex: `r(t) = ${timeTex(z)}` });
  const T = 1 / f;
  const sig = (p) => (t) => cabs(p) * Math.cos(w * t + carg(p));
  const series = [{ name: "A", points: sampleFunction(sig(a), 0, 2 * T, 400) }, { name: "B", points: sampleFunction(sig(b), 0, 2 * T, 400) }];
  if (op === "add" || op === "sub") series.push({ name: "نتیجه", points: sampleFunction(sig(z), 0, 2 * T, 400), width: 3 });
  return {
    results: [
      { label: "نتیجه به صورت قطبی", tex: cpolarTex(z, 6), text: cpolarText(z, 4) },
      { label: "نتیجه به صورت مستطیلی", tex: ctex(z, 6), text: cfmt(z, 6) },
      ...(op === "add" || op === "sub" ? [{ label: "شکل زمانی", tex: `r(t) = ${timeTex(z)}`, text: timeText(z) }] : [])
    ],
    blocks: [phasorBlock([["A", a], ["B", b], ["نتیجه", z]]), { type: "plot", title: `موج‌ها در طول دو دوره (${eng(f, "Hz")})`, xLabel: "t (s)", yLabel: "v", series }],
    steps, copy: `${cpolarText(z, 4)} = ${cfmt(z, 6)}`
  };
}
