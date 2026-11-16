import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { fmt, tex as ntex, eng } from "../core/format.js";
import { cadd, csub, cmul, cdiv, cabs, carg, ctex, cfmt, cpolarText, cpolarTex } from "../core/complex.js";
import { phasorBlock } from "./common.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Fazör hesaplayıcısı: iki sinüzoidal sinyali kutupsal veya kartezyen biçimde toplayın, çıkarın, çarpın veya bölün; sonucu zaman biçimine v(t) dönüştürün; faz diyagramı ve dalga çizimi ile birlikte.",
  keywords: ["faz", "fazör", "phasor", "sinüzoidal sinyalleri toplama", "kutupsal biçim", "Faz diyagramı", "v(t)"],
  formulas: [
    { label: "Zaman ile faz arasında dönüşüm", tex: "v(t) = V_m\\cos(\\omega t + \\phi) \\;\\leftrightarrow\\; \\mathbf{V} = V_m\\angle\\phi" },
    { label: "Kartezyen olarak toplama, kutupsal olarak çarpma", tex: "\\mathbf{V}_1 + \\mathbf{V}_2 = (a_1+a_2) + j(b_1+b_2),\\qquad \\mathbf{V}_1\\mathbf{V}_2 = V_1V_2\\angle(\\phi_1+\\phi_2)" }
  ],
  inputs: [
    { id: "p1", label: "Birinci faz", type: "text", default: "10∠30", help: "Kutupsal biçim, örn. 10∠30 (derece) veya kartezyen biçim, örn. 8.66+5j." },
    { id: "p2", label: "İkinci faz", type: "text", default: "5∠-45" },
    { id: "op", label: "İşlem", type: "select", default: "add", options: [["add", "Toplama"], ["sub", "Çıkarma"], ["mul", "Çarpma"], ["div", "Bölme"]] },
    { id: "f", label: "Frekans (v(t) yazmak için)", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { p1: "10∠30", p2: "5∠-45", op: "add", f: "50" }, expect: ["12.28 ∠ 6.847°", "12.1958 + 1.46447j"], note: "Örnek: $10\\angle 30^\\circ$ ile $5\\angle -45^\\circ$ toplamı." },
  invalid: { values: { p1: "10∠30", p2: "0", op: "div", f: "50" } },
  related: ["complex-numbers", "rlc-circuit", "complex-power", "three-phase"]
};

const D = (z) => (carg(z) * 180) / Math.PI;

export function solve(input) {
  const a = readComplex(input, "p1", "Birinci faz"), b = readComplex(input, "p2", "İkinci faz");
  const op = choice(input, "op", "İşlem", ["add", "sub", "mul", "div"], "add");
  const f = num(input, "f", "Frekans", { positive: true });
  const w = 2 * Math.PI * f;
  const steps = [
    { text: "İki fazı iki biçimde yazalım:", tex: `\\mathbf{A} = ${cpolarTex(a, 6)} = ${ctex(a, 6)},\\quad \\mathbf{B} = ${cpolarTex(b, 6)} = ${ctex(b, 6)}` }
  ];
  let z;
  if (op === "add" || op === "sub") {
    z = op === "add" ? cadd(a, b) : csub(a, b);
    steps.push({ text: "Toplama ve çıkarma kartezyen biçimde daha kolaydır:", tex: `${ctex(a, 6)} ${op === "add" ? "+" : "-"} (${ctex(b, 6)}) = ${ctex(z, 6)}` });
    steps.push({ text: "Sonra kutupsal biçime dönelim:", tex: `|\\mathbf{R}| = ${ntex(cabs(z), 6)},\\quad \\angle\\mathbf{R} = ${ntex(D(z), 5)}^\\circ` });
  } else {
    if (op === "div" && cabs(b) === 0) fail("Açısı sıfır olan bir fazla bölme yapılamaz.", "p2");
    z = op === "mul" ? cmul(a, b) : cdiv(a, b);
    steps.push({ text: op === "mul" ? "Çarpma kutupsal biçimde daha kolaydır: büyüklükleri çarpar, açıları toplarız:" : "Kutupsal biçimde bölme: büyüklükleri böler, açıları çıkarırız:", tex: `${ntex(cabs(a), 6)} ${op === "mul" ? "\\times" : "\\div"} ${ntex(cabs(b), 6)} \\angle (${ntex(D(a), 5)}^\\circ ${op === "mul" ? "+" : "-"} ${ntex(D(b), 5)}^\\circ) = ${cpolarTex(z, 6)}` });
  }
  const timeTex = (p) => `${ntex(cabs(p), 5)}\\cos(${ntex(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${ntex(Math.abs(D(p)), 5)}^\\circ)`;
  const timeText = (p) => `${fmt(cabs(p), 5)} cos(${fmt(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${fmt(Math.abs(D(p)), 5)}°)`;
  if (op === "add" || op === "sub") steps.push({ text: "Zaman biçiminde (iki sinyal aynı frekansta):", tex: `r(t) = ${timeTex(z)}` });
  const T = 1 / f;
  const sig = (p) => (t) => cabs(p) * Math.cos(w * t + carg(p));
  const series = [{ name: "A", points: sampleFunction(sig(a), 0, 2 * T, 400) }, { name: "B", points: sampleFunction(sig(b), 0, 2 * T, 400) }];
  if (op === "add" || op === "sub") series.push({ name: "Sonuç", points: sampleFunction(sig(z), 0, 2 * T, 400), width: 3 });
  return {
    results: [
      { label: "Sonuç kutupsal biçimde", tex: cpolarTex(z, 6), text: cpolarText(z, 4) },
      { label: "Sonuç kartezyen biçimde", tex: ctex(z, 6), text: cfmt(z, 6) },
      ...(op === "add" || op === "sub" ? [{ label: "Zaman biçimi", tex: `r(t) = ${timeTex(z)}`, text: timeText(z) }] : [])
    ],
    blocks: [phasorBlock([["A", a], ["B", b], ["Sonuç", z]]), { type: "plot", title: `İki periyot boyunca dalgalar (${eng(f, "Hz")})`, xLabel: "t (s)", yLabel: "v", series }],
    steps, copy: `${cpolarText(z, 4)} = ${cfmt(z, 6)}`
  };
}
