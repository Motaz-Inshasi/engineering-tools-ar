import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { readComplex } from "../core/cinput.js";
import { C, cadd, csub, cmul, cdiv, cabs, carg, cconj, cpow, croots, cclean, ctex, cfmt, cpolarTex, cpolarText } from "../core/complex.js";
import { tex as ntex, fmt } from "../core/format.js";

const OPS = [["convert", "Biçim dönüşümü"], ["add", "Toplama z₁ + z₂"], ["sub", "Çıkarma z₁ − z₂"], ["mul", "Çarpma z₁ × z₂"], ["div", "Bölme z₁ ÷ z₂"], ["pow", "z₁ sayısının n. kuvveti"], ["roots", "z₁ sayısının n. dereceden kökleri"], ["conj", "Eşlenik"]];

export const meta = {
  description: "Karmaşık sayılarda kartezyen ve kutupsal biçimlerde işlemler: dönüşüm, toplama, çıkarma, çarpma, bölme, kuvvetler ve kökler (De Moivre teoremi); karmaşık düzlemde çizim ile birlikte.",
  keywords: ["karmaşık sayılar", "karmaşık sayı", "complex", "kutupsal", "kartezyen", "De Moivre", "büyüklük", "açı", "eşlenik"],
  formulas: [
    { label: "İki biçim arasında dönüşüm", tex: "z = a + jb = r\\angle\\theta,\\quad r = \\sqrt{a^2+b^2},\\quad \\theta = \\operatorname{atan2}(b, a)" },
    { label: "Çarpma, bölme ve De Moivre teoremi", tex: "z_1 z_2 = r_1 r_2 \\angle(\\theta_1+\\theta_2),\\quad z^n = r^n\\angle n\\theta,\\quad \\sqrt[n]{z} = \\sqrt[n]{r}\\angle\\frac{\\theta + 360^\\circ k}{n}" }
  ],
  inputs: [
    { id: "op", label: "İşlem", type: "select", default: "mul", options: OPS },
    { id: "z1", label: "Birinci sayı z₁", type: "text", default: "3+4j", help: "Kartezyen biçim, örn. 3+4j veya 2-5i, ya da kutupsal biçim, örn. 5∠53.13 (derece)." },
    { id: "z2", label: "İkinci sayı z₂", type: "text", default: "1-2j", when: { op: ["add", "sub", "mul", "div"] } },
    { id: "n", label: "n", type: "number", default: "3", when: { op: ["pow", "roots"] } }
  ],
  example: { values: { op: "mul", z1: "3+4j", z2: "1-2j" }, expect: ["11 - 2j"], note: "Örnek: $(3+4j)(1-2j) = 11 - 2j$." },
  invalid: { values: { op: "div", z1: "1+j", z2: "0" } },
  related: ["phasor", "impedance", "polynomial-roots", "quadratic"]
};

const deg = (z) => (carg(z) * 180) / Math.PI;

function forms(z) {
  return `${ctex(z, 8)} = ${cpolarTex(z, 8)}`;
}

export function solve(input) {
  const op = choice(input, "op", "İşlem", OPS.map((o) => o[0]), "mul");
  const z1 = readComplex(input, "z1", "Birinci sayı");
  const steps = [{ text: "Birinci sayıyı iki biçimde yazalım:", tex: `z_1 = ${forms(z1)}` }];
  steps.push({ text: "Büyüklük ve açıyı hesaplayalım:", tex: `r_1 = \\sqrt{(${ntex(z1.re)})^2 + (${ntex(z1.im)})^2} = ${ntex(cabs(z1), 8)},\\quad \\theta_1 = ${ntex(deg(z1), 8)}^\\circ` });
  let z, label = "Sonuç", extra = [], points = [["z₁", z1]];
  if (["add", "sub", "mul", "div"].includes(op)) {
    const z2 = readComplex(input, "z2", "İkinci sayı");
    points.push(["z₂", z2]);
    steps.push({ text: "İkinci sayı:", tex: `z_2 = ${forms(z2)}` });
    if (op === "add" || op === "sub") {
      z = op === "add" ? cadd(z1, z2) : csub(z1, z2);
      steps.push({ text: "Gerçek kısımları ve sanal kısımları ayrı ayrı toplarız veya çıkarırız:", tex: `(${ntex(z1.re)} ${op === "add" ? "+" : "-"} ${ntex(z2.re)}) + j(${ntex(z1.im)} ${op === "add" ? "+" : "-"} ${ntex(z2.im)}) = ${ctex(z, 8)}` });
    } else if (op === "mul") {
      z = cmul(z1, z2);
      steps.push({ text: "Kartezyen biçimde $j^2 = -1$ kullanarak:", tex: `(ac - bd) + j(ad + bc) = ${ctex(z, 8)}` });
      steps.push({ text: "Veya kutupsal biçimde: büyüklükleri çarparız, açıları toplarız:", tex: `${ntex(cabs(z1), 6)} \\cdot ${ntex(cabs(z2), 6)} \\angle (${ntex(deg(z1), 6)}^\\circ + ${ntex(deg(z2), 6)}^\\circ) = ${cpolarTex(z, 8)}` });
    } else {
      if (cabs(z2) === 0) fail("Sıfıra bölme yapılamaz.", "z2");
      z = cdiv(z1, z2);
      steps.push({ text: "Pay ve paydayı paydanın eşleniğiyle çarparız:", tex: `\\frac{z_1 \\cdot \\overline{z_2}}{|z_2|^2} = \\frac{${ctex(cmul(z1, cconj(z2)), 8)}}{${ntex(cabs(z2) ** 2, 8)}} = ${ctex(z, 8)}` });
      steps.push({ text: "Veya kutupsal olarak: büyüklükleri böleriz, açıları çıkarırız:", tex: `${cpolarTex(z, 8)}` });
    }
  } else if (op === "pow") {
    const n = num(input, "n", "n", { integer: true, min: -50, max: 50 });
    if (cabs(z1) === 0 && n < 0) fail("Sıfır negatif bir kuvvete yükseltilemez.", "n");
    z = cpow(z1, n);
    steps.push({ text: "De Moivre teoremi:", tex: `z_1^{${n}} = ${ntex(cabs(z1), 6)}^{${n}} \\angle (${n} \\times ${ntex(deg(z1), 6)}^\\circ) = ${cpolarTex(z, 8)}` });
  } else if (op === "roots") {
    const n = num(input, "n", "n", { integer: true, min: 1, max: 24 });
    const rs = croots(z1, n).map((w) => cclean(w, 1e-12));
    steps.push({ text: `n. dereceden kökler: büyüklüğün n. kökünü alırız; açıya 360°k eklenip ${n} ile bölünür:`, tex: `w_k = \\sqrt[${n}]{${ntex(cabs(z1), 6)}} \\angle \\frac{${ntex(deg(z1), 6)}^\\circ + 360^\\circ k}{${n}},\\; k = 0,\\dots,${n - 1}` });
    const rows = rs.map((w, k) => [String(k), { tex: ctex(w, 8) }, { tex: cpolarTex(w, 8) }]);
    rs.forEach((w, k) => points.push([`w${k}`, w]));
    const text = rs.map((w) => cfmt(w, 8)).join("، ");
    return {
      results: [{ label: `Kökler (${n})`, value: text }],
      blocks: [{ type: "table", head: ["k", "kartezyen", "kutupsal"], rows }, plot(points)],
      steps, copy: rs.map((w) => cfmt(w, 8)).join("\n")
    };
  } else if (op === "conj") {
    z = cconj(z1);
    steps.push({ tex: `\\overline{z_1} = ${ctex(z, 8)} = ${cpolarTex(z, 8)}` });
    label = "Eşlenik";
  } else {
    z = z1;
    label = "z₁";
  }
  z = cclean(z, 1e-13);
  points.push(["Sonuç", z]);
  return {
    results: [
      { label: `${label} (kartezyen)`, tex: ctex(z, 10), text: cfmt(z, 10) },
      { label: `${label} (kutupsal)`, tex: cpolarTex(z, 10), text: cpolarText(z, 10) },
      { label: "Büyüklük", value: cabs(z), sig: 10 },
      { label: "Açı", value: deg(z), unit: "°", sig: 10 },
      { label: "Açı (radyan)", value: carg(z), unit: "rad", sig: 10 }
    ],
    blocks: [plot(points)],
    steps, copy: `${cfmt(z, 10)} = ${cpolarText(z, 10)}`
  };
}

function plot(points) {
  const m = Math.max(1, ...points.map(([, z]) => Math.max(Math.abs(z.re), Math.abs(z.im)))) * 1.25;
  return {
    type: "plot", title: "Karmaşık düzlem", xLabel: "Re", yLabel: "Im", equalAspect: true, xMin: -m, xMax: m, yMin: -m, yMax: m,
    series: points.map(([name, z]) => ({ name, points: [[0, 0], [z.re, z.im]], marker: "o", line: true }))
  };
}
