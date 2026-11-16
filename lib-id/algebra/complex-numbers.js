import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { C, cadd, csub, cmul, cdiv, cabs, carg, cconj, cpow, croots, cclean, ctex, cfmt, cpolarTex, cpolarText } from "../core/complex.js";
import { tex as ntex, fmt } from "../core/format.js";

const OPS = [["convert", "Konversi antar bentuk"], ["add", "Jumlah z₁ + z₂"], ["sub", "Selisih z₁ − z₂"], ["mul", "Kali z₁ × z₂"], ["div", "Bagi z₁ ÷ z₂"], ["pow", "Pangkat z₁ dengan n"], ["roots", "Akar ke-n dari z₁"], ["conj", "Konjugat"]];

export const meta = {
  description: "Operasi bilangan kompleks dalam bentuk kartesian dan polar: konversi, penjumlahan, pengurangan, perkalian, pembagian, pangkat, dan akar (teorema De Moivre), dengan grafik pada bidang kompleks.",
  keywords: ["Bilangan kompleks", "bilangan kompleks", "complex", "polar", "kartesian", "De Moivre", "modulus", "sudut", "konjugat"],
  formulas: [
    { label: "Konversi antara kedua bentuk", tex: "z = a + jb = r\\angle\\theta,\\quad r = \\sqrt{a^2+b^2},\\quad \\theta = \\operatorname{atan2}(b, a)" },
    { label: "Perkalian, pembagian, dan teorema De Moivre", tex: "z_1 z_2 = r_1 r_2 \\angle(\\theta_1+\\theta_2),\\quad z^n = r^n\\angle n\\theta,\\quad \\sqrt[n]{z} = \\sqrt[n]{r}\\angle\\frac{\\theta + 360^\\circ k}{n}" }
  ],
  inputs: [
    { id: "op", label: "Operasi", type: "select", default: "mul", options: OPS },
    { id: "z1", label: "Bilangan pertama z₁", type: "text", default: "3+4j", help: "Kartesian seperti 3+4j atau 2-5i, atau polar seperti 5∠53.13 (dalam derajat)." },
    { id: "z2", label: "Bilangan kedua z₂", type: "text", default: "1-2j", when: { op: ["add", "sub", "mul", "div"] } },
    { id: "n", label: "n", type: "number", default: "3", when: { op: ["pow", "roots"] } }
  ],
  example: { values: { op: "mul", z1: "3+4j", z2: "1-2j" }, expect: ["11 - 2j"], note: "Contoh: $(3+4j)(1-2j) = 11 - 2j$." },
  invalid: { values: { op: "div", z1: "1+j", z2: "0" } },
  related: ["phasor", "impedance", "polynomial-roots", "quadratic"]
};

const deg = (z) => (carg(z) * 180) / Math.PI;

function forms(z) {
  return `${ctex(z, 8)} = ${cpolarTex(z, 8)}`;
}

export function solve(input) {
  const op = choice(input, "op", "Operasi", OPS.map((o) => o[0]), "mul");
  const z1 = readComplex(input, "z1", "Bilangan pertama");
  const steps = [{ text: "Bilangan pertama dalam kedua bentuk:", tex: `z_1 = ${forms(z1)}` }];
  steps.push({ text: "Hitung modulus dan sudut:", tex: `r_1 = \\sqrt{(${ntex(z1.re)})^2 + (${ntex(z1.im)})^2} = ${ntex(cabs(z1), 8)},\\quad \\theta_1 = ${ntex(deg(z1), 8)}^\\circ` });
  let z, label = "Hasil", extra = [], points = [["z₁", z1]];
  if (["add", "sub", "mul", "div"].includes(op)) {
    const z2 = readComplex(input, "z2", "Bilangan kedua");
    points.push(["z₂", z2]);
    steps.push({ text: "Bilangan kedua:", tex: `z_2 = ${forms(z2)}` });
    if (op === "add" || op === "sub") {
      z = op === "add" ? cadd(z1, z2) : csub(z1, z2);
      steps.push({ text: "Kita jumlahkan atau kurangkan bagian real bersama-sama dan bagian imajiner bersama-sama:", tex: `(${ntex(z1.re)} ${op === "add" ? "+" : "-"} ${ntex(z2.re)}) + j(${ntex(z1.im)} ${op === "add" ? "+" : "-"} ${ntex(z2.im)}) = ${ctex(z, 8)}` });
    } else if (op === "mul") {
      z = cmul(z1, z2);
      steps.push({ text: "Dalam bentuk kartesian dengan $j^2 = -1$:", tex: `(ac - bd) + j(ad + bc) = ${ctex(z, 8)}` });
      steps.push({ text: "Atau dalam bentuk polar: kalikan modulusnya dan jumlahkan sudutnya:", tex: `${ntex(cabs(z1), 6)} \\cdot ${ntex(cabs(z2), 6)} \\angle (${ntex(deg(z1), 6)}^\\circ + ${ntex(deg(z2), 6)}^\\circ) = ${cpolarTex(z, 8)}` });
    } else {
      if (cabs(z2) === 0) fail("Pembagian dengan nol tidak mungkin.", "z2");
      z = cdiv(z1, z2);
      steps.push({ text: "Kalikan pembilang dan penyebut dengan konjugat penyebut:", tex: `\\frac{z_1 \\cdot \\overline{z_2}}{|z_2|^2} = \\frac{${ctex(cmul(z1, cconj(z2)), 8)}}{${ntex(cabs(z2) ** 2, 8)}} = ${ctex(z, 8)}` });
      steps.push({ text: "Atau secara polar: bagi modulusnya dan kurangkan sudutnya:", tex: `${cpolarTex(z, 8)}` });
    }
  } else if (op === "pow") {
    const n = num(input, "n", "n", { integer: true, min: -50, max: 50 });
    if (cabs(z1) === 0 && n < 0) fail("Nol tidak dapat dipangkatkan dengan pangkat negatif.", "n");
    z = cpow(z1, n);
    steps.push({ text: "Teorema De Moivre:", tex: `z_1^{${n}} = ${ntex(cabs(z1), 6)}^{${n}} \\angle (${n} \\times ${ntex(deg(z1), 6)}^\\circ) = ${cpolarTex(z, 8)}` });
  } else if (op === "roots") {
    const n = num(input, "n", "n", { integer: true, min: 1, max: 24 });
    const rs = croots(z1, n).map((w) => cclean(w, 1e-12));
    steps.push({ text: `Akar ke-n: ambil akar ke-n dari modulus, lalu bagi sudut yang ditambah $360^\\circ k$ dengan ${n}:`, tex: `w_k = \\sqrt[${n}]{${ntex(cabs(z1), 6)}} \\angle \\frac{${ntex(deg(z1), 6)}^\\circ + 360^\\circ k}{${n}},\\; k = 0,\\dots,${n - 1}` });
    const rows = rs.map((w, k) => [String(k), { tex: ctex(w, 8) }, { tex: cpolarTex(w, 8) }]);
    rs.forEach((w, k) => points.push([`w${k}`, w]));
    const text = rs.map((w) => cfmt(w, 8)).join("، ");
    return {
      results: [{ label: `Akar (${n})`, value: text }],
      blocks: [{ type: "table", head: ["k", "kartesian", "polar"], rows }, plot(points)],
      steps, copy: rs.map((w) => cfmt(w, 8)).join("\n")
    };
  } else if (op === "conj") {
    z = cconj(z1);
    steps.push({ tex: `\\overline{z_1} = ${ctex(z, 8)} = ${cpolarTex(z, 8)}` });
    label = "Konjugat";
  } else {
    z = z1;
    label = "z₁";
  }
  z = cclean(z, 1e-13);
  points.push(["Hasil", z]);
  return {
    results: [
      { label: `${label} (kartesian)`, tex: ctex(z, 10), text: cfmt(z, 10) },
      { label: `${label} (polar)`, tex: cpolarTex(z, 10), text: cpolarText(z, 10) },
      { label: "Modulus", value: cabs(z), sig: 10 },
      { label: "Sudut", value: deg(z), unit: "°", sig: 10 },
      { label: "Sudut dalam radian", value: carg(z), unit: "rad", sig: 10 }
    ],
    blocks: [plot(points)],
    steps, copy: `${cfmt(z, 10)} = ${cpolarText(z, 10)}`
  };
}

function plot(points) {
  const m = Math.max(1, ...points.map(([, z]) => Math.max(Math.abs(z.re), Math.abs(z.im)))) * 1.25;
  return {
    type: "plot", title: "Bidang kompleks", xLabel: "Re", yLabel: "Im", equalAspect: true, xMin: -m, xMax: m, yMin: -m, yMax: m,
    series: points.map(([name, z]) => ({ name, points: [[0, 0], [z.re, z.im]], marker: "o", line: true }))
  };
}
