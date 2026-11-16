import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { fmt, tex as ntex, eng } from "../core/format.js";
import { cadd, csub, cmul, cdiv, cabs, carg, ctex, cfmt, cpolarText, cpolarTex } from "../core/complex.js";
import { phasorBlock } from "./common.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Kalkulator fasor: jumlahkan, kurangkan, kalikan, atau bagi dua sinyal sinusoidal dalam bentuk polar atau kartesian, ubah hasilnya ke bentuk waktu v(t), dengan diagram fasor dan plot gelombang.",
  keywords: ["Fasor", "Fasor", "phasor", "Penjumlahan sinyal sinusoidal", "Bentuk polar", "Diagram fasor", "v(t)"],
  formulas: [
    { label: "Konversi antara waktu dan fasor", tex: "v(t) = V_m\\cos(\\omega t + \\phi) \\;\\leftrightarrow\\; \\mathbf{V} = V_m\\angle\\phi" },
    { label: "Jumlah dan kurang secara kartesian, kali dan bagi secara polar", tex: "\\mathbf{V}_1 + \\mathbf{V}_2 = (a_1+a_2) + j(b_1+b_2),\\qquad \\mathbf{V}_1\\mathbf{V}_2 = V_1V_2\\angle(\\phi_1+\\phi_2)" }
  ],
  inputs: [
    { id: "p1", label: "Fasor pertama", type: "text", default: "10∠30", help: "Polar, misalnya 10∠30 (dalam derajat), atau kartesian, misalnya 8.66+5j." },
    { id: "p2", label: "Fasor kedua", type: "text", default: "5∠-45" },
    { id: "op", label: "Operasi", type: "select", default: "add", options: [["add", "Jumlah"], ["sub", "Kurang"], ["mul", "Kali"], ["div", "Bagi"]] },
    { id: "f", label: "Frekuensi (untuk menulis v(t))", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { p1: "10∠30", p2: "5∠-45", op: "add", f: "50" }, expect: ["12.28 ∠ 6.847°", "12.1958 + 1.46447j"], note: "Contoh: jumlahkan $10\\angle 30^\\circ$ dan $5\\angle -45^\\circ$." },
  invalid: { values: { p1: "10∠30", p2: "0", op: "div", f: "50" } },
  related: ["complex-numbers", "rlc-circuit", "complex-power", "three-phase"]
};

const D = (z) => (carg(z) * 180) / Math.PI;

export function solve(input) {
  const a = readComplex(input, "p1", "Fasor pertama"), b = readComplex(input, "p2", "Fasor kedua");
  const op = choice(input, "op", "Operasi", ["add", "sub", "mul", "div"], "add");
  const f = num(input, "f", "Frekuensi", { positive: true });
  const w = 2 * Math.PI * f;
  const steps = [
    { text: "Kita tulis kedua fasor dalam kedua bentuk:", tex: `\\mathbf{A} = ${cpolarTex(a, 6)} = ${ctex(a, 6)},\\quad \\mathbf{B} = ${cpolarTex(b, 6)} = ${ctex(b, 6)}` }
  ];
  let z;
  if (op === "add" || op === "sub") {
    z = op === "add" ? cadd(a, b) : csub(a, b);
    steps.push({ text: "Penjumlahan dan pengurangan lebih mudah dalam bentuk kartesian:", tex: `${ctex(a, 6)} ${op === "add" ? "+" : "-"} (${ctex(b, 6)}) = ${ctex(z, 6)}` });
    steps.push({ text: "Kemudian kita kembali ke bentuk polar:", tex: `|\\mathbf{R}| = ${ntex(cabs(z), 6)},\\quad \\angle\\mathbf{R} = ${ntex(D(z), 5)}^\\circ` });
  } else {
    if (op === "div" && cabs(b) === 0) fail("Tidak dapat membagi dengan fasor yang besarnya nol.", "p2");
    z = op === "mul" ? cmul(a, b) : cdiv(a, b);
    steps.push({ text: op === "mul" ? "Perkalian lebih mudah secara polar: kalikan besarnya dan jumlahkan sudutnya:" : "Pembagian secara polar: bagi besarnya dan kurangkan sudutnya:", tex: `${ntex(cabs(a), 6)} ${op === "mul" ? "\\times" : "\\div"} ${ntex(cabs(b), 6)} \\angle (${ntex(D(a), 5)}^\\circ ${op === "mul" ? "+" : "-"} ${ntex(D(b), 5)}^\\circ) = ${cpolarTex(z, 6)}` });
  }
  const timeTex = (p) => `${ntex(cabs(p), 5)}\\cos(${ntex(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${ntex(Math.abs(D(p)), 5)}^\\circ)`;
  const timeText = (p) => `${fmt(cabs(p), 5)} cos(${fmt(w, 5)}t ${D(p) < 0 ? "-" : "+"} ${fmt(Math.abs(D(p)), 5)}°)`;
  if (op === "add" || op === "sub") steps.push({ text: "Dalam bentuk waktu (kedua sinyal pada frekuensi yang sama):", tex: `r(t) = ${timeTex(z)}` });
  const T = 1 / f;
  const sig = (p) => (t) => cabs(p) * Math.cos(w * t + carg(p));
  const series = [{ name: "A", points: sampleFunction(sig(a), 0, 2 * T, 400) }, { name: "B", points: sampleFunction(sig(b), 0, 2 * T, 400) }];
  if (op === "add" || op === "sub") series.push({ name: "Hasil", points: sampleFunction(sig(z), 0, 2 * T, 400), width: 3 });
  return {
    results: [
      { label: "Hasil dalam bentuk polar", tex: cpolarTex(z, 6), text: cpolarText(z, 4) },
      { label: "Hasil dalam bentuk kartesian", tex: ctex(z, 6), text: cfmt(z, 6) },
      ...(op === "add" || op === "sub" ? [{ label: "Bentuk waktu", tex: `r(t) = ${timeTex(z)}`, text: timeText(z) }] : [])
    ],
    blocks: [phasorBlock([["A", a], ["B", b], ["Hasil", z]]), { type: "plot", title: `Gelombang selama dua siklus (${eng(f, "Hz")})`, xLabel: "t (s)", yLabel: "v", series }],
    steps, copy: `${cpolarText(z, 4)} = ${cfmt(z, 6)}`
  };
}
