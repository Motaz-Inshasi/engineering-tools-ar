import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { fmt, tex as ntex, eng } from "../core/format.js";
import { cadd, csub, cmul, cdiv, cabs, carg, ctex, cfmt, cpolarText, cpolarTex } from "../core/complex.js";
import { phasorBlock } from "./common.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Calculadora fasorial: sume, reste, multiplique o divida dos señales senoidales en forma polar o cartesiana, convierta el resultado a v(t), con diagrama fasorial y gráfica de ondas.",
  keywords: ["Fasor", "Fasor", "phasor", "Suma de señales senoidales", "Forma polar", "Diagrama fasorial", "v(t)"],
  formulas: [
    { label: "Conversión entre tiempo y fasor", tex: "v(t) = V_m\\cos(\\omega t + \\phi) \\;\\leftrightarrow\\; \\mathbf{V} = V_m\\angle\\phi" },
    { label: "Suma en forma cartesiana y producto en forma polar", tex: "\\mathbf{V}_1 + \\mathbf{V}_2 = (a_1+a_2) + j(b_1+b_2),\\qquad \\mathbf{V}_1\\mathbf{V}_2 = V_1V_2\\angle(\\phi_1+\\phi_2)" }
  ],
  inputs: [
    { id: "p1", label: "Primer fasor", type: "text", default: "10∠30", help: "Polar, por ejemplo 10∠30 (en grados), o cartesiana, por ejemplo 8.66+5j." },
    { id: "p2", label: "Segundo fasor", type: "text", default: "5∠-45" },
    { id: "op", label: "Operación", type: "select", default: "add", options: [["add", "Suma"], ["sub", "Resta"], ["mul", "Multiplicación"], ["div", "División"]] },
    { id: "f", label: "Frecuencia (para escribir v(t))", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { p1: "10∠30", p2: "5∠-45", op: "add", f: "50" }, expect: ["12.28 ∠ 6.847°", "12.1958 + 1.46447j"], note: "Ejemplo: suma de $10\\angle 30^\\circ$ y $5\\angle -45^\\circ$." },
  invalid: { values: { p1: "10∠30", p2: "0", op: "div", f: "50" } },
  related: ["complex-numbers", "rlc-circuit", "complex-power", "three-phase"]
};

const D = (z) => (carg(z) * 180) / Math.PI;

export function solve(input) {
  const a = readComplex(input, "p1", "Primer fasor"), b = readComplex(input, "p2", "Segundo fasor");
  const op = choice(input, "op", "Operación", ["add", "sub", "mul", "div"], "add");
  const f = num(input, "f", "Frecuencia", { positive: true });
  const w = 2 * Math.PI * f;
  const steps = [
    { text: "Escribimos los dos fasores en ambas formas:", tex: `\\mathbf{A} = ${cpolarTex(a, 6)} = ${ctex(a, 6)},\\quad \\mathbf{B} = ${cpolarTex(b, 6)} = ${ctex(b, 6)}` }
  ];
  let z;
  if (op === "add" || op === "sub") {
    z = op === "add" ? cadd(a, b) : csub(a, b);
    steps.push({ text: "La suma y la resta son más sencillas en forma cartesiana:", tex: `${ctex(a, 6)} ${op === "add" ? "+" : "-"} (${ctex(b, 6)}) = ${ctex(z, 6)}` });
    steps.push({ text: "Luego volvemos a la forma polar:", tex: `|\\mathbf{R}| = ${ntex(cabs(z), 6)},\\quad \\angle\\mathbf{R} = ${ntex(D(z), 5)}^\\circ` });
  } else {
    if (op === "div" && cabs(b) === 0) fail("No se puede dividir entre un fasor de módulo cero.", "p2");
    z = op === "mul" ? cmul(a, b) : cdiv(a, b);
    steps.push({ text: op === "mul" ? "El producto es más sencillo en forma polar: multiplicamos los módulos y sumamos los ángulos:" : "La división en forma polar: dividimos los módulos y restamos los ángulos:", tex: `${ntex(cabs(a), 6)} ${op === "mul" ? "\\times" : "\\div"} ${ntex(cabs(b), 6)} \\angle (${ntex(D(a), 5)}^\\circ ${op === "mul" ? "+" : "-"} ${ntex(D(b), 5)}^\\circ) = ${cpolarTex(z, 6)}` });
  }
  const timeTex = (p) => `${ntex(cabs(p), 5)}\\cos(${ntex(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${ntex(Math.abs(D(p)), 5)}^\\circ)`;
  const timeText = (p) => `${fmt(cabs(p), 5)} cos(${fmt(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${fmt(Math.abs(D(p)), 5)}°)`;
  if (op === "add" || op === "sub") steps.push({ text: "En forma temporal (ambas señales con la misma frecuencia):", tex: `r(t) = ${timeTex(z)}` });
  const T = 1 / f;
  const sig = (p) => (t) => cabs(p) * Math.cos(w * t + carg(p));
  const series = [{ name: "A", points: sampleFunction(sig(a), 0, 2 * T, 400) }, { name: "B", points: sampleFunction(sig(b), 0, 2 * T, 400) }];
  if (op === "add" || op === "sub") series.push({ name: "Resultado", points: sampleFunction(sig(z), 0, 2 * T, 400), width: 3 });
  return {
    results: [
      { label: "Resultado en forma polar", tex: cpolarTex(z, 6), text: cpolarText(z, 4) },
      { label: "Resultado en forma cartesiana", tex: ctex(z, 6), text: cfmt(z, 6) },
      ...(op === "add" || op === "sub" ? [{ label: "Forma temporal", tex: `r(t) = ${timeTex(z)}`, text: timeText(z) }] : [])
    ],
    blocks: [phasorBlock([["A", a], ["B", b], ["Resultado", z]]), { type: "plot", title: `Ondas durante dos periodos (${eng(f, "Hz")})`, xLabel: "t (s)", yLabel: "v", series }],
    steps, copy: `${cpolarText(z, 4)} = ${cfmt(z, 6)}`
  };
}
