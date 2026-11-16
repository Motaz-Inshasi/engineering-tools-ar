import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { fmt, tex as ntex, eng } from "../core/format.js";
import { cadd, csub, cmul, cdiv, cabs, carg, ctex, cfmt, cpolarText, cpolarTex } from "../core/complex.js";
import { phasorBlock } from "./common.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Calculatrice de phaseurs (Phasor) : additionnez, soustrayez, multipliez ou divisez deux signaux sinusoïdaux en forme polaire ou cartésienne, convertissez le résultat en forme temporelle v(t), avec diagramme de phase et tracé des ondes.",
  keywords: ["phase", "phaseur", "phasor", "Addition de signaux sinusoïdaux", "Forme polaire", "Diagramme de phase", "v(t)"],
  formulas: [
    { label: "Passage entre le temps et le phaseur", tex: "v(t) = V_m\\cos(\\omega t + \\phi) \\;\\leftrightarrow\\; \\mathbf{V} = V_m\\angle\\phi" },
    { label: "Addition en cartésien et multiplication en polaire", tex: "\\mathbf{V}_1 + \\mathbf{V}_2 = (a_1+a_2) + j(b_1+b_2),\\qquad \\mathbf{V}_1\\mathbf{V}_2 = V_1V_2\\angle(\\phi_1+\\phi_2)" }
  ],
  inputs: [
    { id: "p1", label: "Premier phaseur", type: "text", default: "10∠30", help: "Polaire, par exemple 10∠30 (en degrés), ou cartésienne, par exemple 8.66+5j." },
    { id: "p2", label: "Second phaseur", type: "text", default: "5∠-45" },
    { id: "op", label: "Opération", type: "select", default: "add", options: [["add", "Addition"], ["sub", "Soustraction"], ["mul", "Multiplication"], ["div", "Division"]] },
    { id: "f", label: "Fréquence (pour écrire v(t))", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { p1: "10∠30", p2: "5∠-45", op: "add", f: "50" }, expect: ["12.28 ∠ 6.847°", "12.1958 + 1.46447j"], note: "Exemple : addition de $10\\angle 30^\\circ$ et $5\\angle -45^\\circ$." },
  invalid: { values: { p1: "10∠30", p2: "0", op: "div", f: "50" } },
  related: ["complex-numbers", "rlc-circuit", "complex-power", "three-phase"]
};

const D = (z) => (carg(z) * 180) / Math.PI;

export function solve(input) {
  const a = readComplex(input, "p1", "Premier phaseur"), b = readComplex(input, "p2", "Second phaseur");
  const op = choice(input, "op", "Opération", ["add", "sub", "mul", "div"], "add");
  const f = num(input, "f", "Fréquence", { positive: true });
  const w = 2 * Math.PI * f;
  const steps = [
    { text: "Écrivons les deux phaseurs sous les deux formes :", tex: `\\mathbf{A} = ${cpolarTex(a, 6)} = ${ctex(a, 6)},\\quad \\mathbf{B} = ${cpolarTex(b, 6)} = ${ctex(b, 6)}` }
  ];
  let z;
  if (op === "add" || op === "sub") {
    z = op === "add" ? cadd(a, b) : csub(a, b);
    steps.push({ text: "L'addition et la soustraction sont plus simples en cartésien :", tex: `${ctex(a, 6)} ${op === "add" ? "+" : "-"} (${ctex(b, 6)}) = ${ctex(z, 6)}` });
    steps.push({ text: "On revient ensuite à la forme polaire :", tex: `|\\mathbf{R}| = ${ntex(cabs(z), 6)},\\quad \\angle\\mathbf{R} = ${ntex(D(z), 5)}^\\circ` });
  } else {
    if (op === "div" && cabs(b) === 0) fail("Division impossible par un phaseur de module nul.", "p2");
    z = op === "mul" ? cmul(a, b) : cdiv(a, b);
    steps.push({ text: op === "mul" ? "La multiplication est plus simple en polaire : on multiplie les modules et on additionne les angles :" : "La division en polaire : on divise les modules et on soustrait les angles :", tex: `${ntex(cabs(a), 6)} ${op === "mul" ? "\\times" : "\\div"} ${ntex(cabs(b), 6)} \\angle (${ntex(D(a), 5)}^\\circ ${op === "mul" ? "+" : "-"} ${ntex(D(b), 5)}^\\circ) = ${cpolarTex(z, 6)}` });
  }
  const timeTex = (p) => `${ntex(cabs(p), 5)}\\cos(${ntex(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${ntex(Math.abs(D(p)), 5)}^\\circ)`;
  const timeText = (p) => `${fmt(cabs(p), 5)} cos(${fmt(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${fmt(Math.abs(D(p)), 5)}°)`;
  if (op === "add" || op === "sub") steps.push({ text: "Sous forme temporelle (les deux signaux ont la même fréquence) :", tex: `r(t) = ${timeTex(z)}` });
  const T = 1 / f;
  const sig = (p) => (t) => cabs(p) * Math.cos(w * t + carg(p));
  const series = [{ name: "A", points: sampleFunction(sig(a), 0, 2 * T, 400) }, { name: "B", points: sampleFunction(sig(b), 0, 2 * T, 400) }];
  if (op === "add" || op === "sub") series.push({ name: "Résultat", points: sampleFunction(sig(z), 0, 2 * T, 400), width: 3 });
  return {
    results: [
      { label: "Résultat en polaire", tex: cpolarTex(z, 6), text: cpolarText(z, 4) },
      { label: "Résultat en cartésien", tex: ctex(z, 6), text: cfmt(z, 6) },
      ...(op === "add" || op === "sub" ? [{ label: "Forme temporelle", tex: `r(t) = ${timeTex(z)}`, text: timeText(z) }] : [])
    ],
    blocks: [phasorBlock([["A", a], ["B", b], ["Résultat", z]]), { type: "plot", title: `Ondes sur deux périodes (${eng(f, "Hz")})`, xLabel: "t (s)", yLabel: "v", series }],
    steps, copy: `${cpolarText(z, 4)} = ${cfmt(z, 6)}`
  };
}
