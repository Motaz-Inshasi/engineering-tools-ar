import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { fmt, tex as ntex, eng } from "../core/format.js";
import { cadd, csub, cmul, cdiv, cabs, carg, ctex, cfmt, cpolarText, cpolarTex } from "../core/complex.js";
import { phasorBlock } from "./common.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Phasor calculator: add, subtract, multiply or divide two sinusoidal signals in polar or rectangular form, convert the result to the time form v(t), with a phasor diagram and waveform plot.",
  keywords: ["Phasor", "Phasor", "phasor", "Adding sinusoidal signals", "Polar form", "Phasor diagram", "v(t)"],
  formulas: [
    { label: "Conversion between time and phasor", tex: "v(t) = V_m\\cos(\\omega t + \\phi) \\;\\leftrightarrow\\; \\mathbf{V} = V_m\\angle\\phi" },
    { label: "Add in rectangular form, multiply in polar form", tex: "\\mathbf{V}_1 + \\mathbf{V}_2 = (a_1+a_2) + j(b_1+b_2),\\qquad \\mathbf{V}_1\\mathbf{V}_2 = V_1V_2\\angle(\\phi_1+\\phi_2)" }
  ],
  inputs: [
    { id: "p1", label: "First phasor", type: "text", default: "10∠30", help: "Polar, e.g. 10∠30 (in degrees), or rectangular, e.g. 8.66+5j." },
    { id: "p2", label: "Second phasor", type: "text", default: "5∠-45" },
    { id: "op", label: "Operation", type: "select", default: "add", options: [["add", "Add"], ["sub", "Subtract"], ["mul", "Multiply"], ["div", "Divide"]] },
    { id: "f", label: "Frequency (for writing v(t))", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { p1: "10∠30", p2: "5∠-45", op: "add", f: "50" }, expect: ["12.28 ∠ 6.847°", "12.1958 + 1.46447j"], note: "Example: add $10\\angle 30^\\circ$ and $5\\angle -45^\\circ$." },
  invalid: { values: { p1: "10∠30", p2: "0", op: "div", f: "50" } },
  related: ["complex-numbers", "rlc-circuit", "complex-power", "three-phase"]
};

const D = (z) => (carg(z) * 180) / Math.PI;

export function solve(input) {
  const a = readComplex(input, "p1", "First phasor"), b = readComplex(input, "p2", "Second phasor");
  const op = choice(input, "op", "Operation", ["add", "sub", "mul", "div"], "add");
  const f = num(input, "f", "Frequency", { positive: true });
  const w = 2 * Math.PI * f;
  const steps = [
    { text: "We write both phasors in both forms:", tex: `\\mathbf{A} = ${cpolarTex(a, 6)} = ${ctex(a, 6)},\\quad \\mathbf{B} = ${cpolarTex(b, 6)} = ${ctex(b, 6)}` }
  ];
  let z;
  if (op === "add" || op === "sub") {
    z = op === "add" ? cadd(a, b) : csub(a, b);
    steps.push({ text: "Addition and subtraction are easier in rectangular form:", tex: `${ctex(a, 6)} ${op === "add" ? "+" : "-"} (${ctex(b, 6)}) = ${ctex(z, 6)}` });
    steps.push({ text: "Then we return to polar form:", tex: `|\\mathbf{R}| = ${ntex(cabs(z), 6)},\\quad \\angle\\mathbf{R} = ${ntex(D(z), 5)}^\\circ` });
  } else {
    if (op === "div" && cabs(b) === 0) fail("Cannot divide by a phasor with zero magnitude.", "p2");
    z = op === "mul" ? cmul(a, b) : cdiv(a, b);
    steps.push({ text: op === "mul" ? "Multiplication is easier in polar form: multiply the magnitudes and add the angles:" : "Division in polar form: divide the magnitudes and subtract the angles:", tex: `${ntex(cabs(a), 6)} ${op === "mul" ? "\\times" : "\\div"} ${ntex(cabs(b), 6)} \\angle (${ntex(D(a), 5)}^\\circ ${op === "mul" ? "+" : "-"} ${ntex(D(b), 5)}^\\circ) = ${cpolarTex(z, 6)}` });
  }
  const timeTex = (p) => `${ntex(cabs(p), 5)}\\cos(${ntex(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${ntex(Math.abs(D(p)), 5)}^\\circ)`;
  const timeText = (p) => `${fmt(cabs(p), 5)} cos(${fmt(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${fmt(Math.abs(D(p)), 5)}°)`;
  if (op === "add" || op === "sub") steps.push({ text: "In time form (both signals at the same frequency):", tex: `r(t) = ${timeTex(z)}` });
  const T = 1 / f;
  const sig = (p) => (t) => cabs(p) * Math.cos(w * t + carg(p));
  const series = [{ name: "A", points: sampleFunction(sig(a), 0, 2 * T, 400) }, { name: "B", points: sampleFunction(sig(b), 0, 2 * T, 400) }];
  if (op === "add" || op === "sub") series.push({ name: "Result", points: sampleFunction(sig(z), 0, 2 * T, 400), width: 3 });
  return {
    results: [
      { label: "Result in polar form", tex: cpolarTex(z, 6), text: cpolarText(z, 4) },
      { label: "Result in rectangular form", tex: ctex(z, 6), text: cfmt(z, 6) },
      ...(op === "add" || op === "sub" ? [{ label: "Time form", tex: `r(t) = ${timeTex(z)}`, text: timeText(z) }] : [])
    ],
    blocks: [phasorBlock([["A", a], ["B", b], ["Result", z]]), { type: "plot", title: `Waveforms over two cycles (${eng(f, "Hz")})`, xLabel: "t (s)", yLabel: "v", series }],
    steps, copy: `${cpolarText(z, 4)} = ${cfmt(z, 6)}`
  };
}
