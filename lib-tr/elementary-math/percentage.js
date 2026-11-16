import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["of", "what", "change", "add", "sub", "reverse", "points"];
const N = (x) => fmt(x, 10);
const P = (x) => `${fmt(x, 10)}%`;

export const meta = {
  description: "Yüzdeyi yedi biçimde hesaplayın: bir sayının yüzdesi, bir sayının diğerinin yüzde kaçı olduğu, iki değer arasındaki değişim yüzdesi, bir değeri yüzdeyle artırma veya azaltma, değişimden önceki asıl değeri bulma ya da iki yüzde arasındaki fark (yüzde puan).",
  keywords: ["Yüzde", "percentage", "Değişim yüzdesi", "Yüzdeyle artış", "Yüzdeyle azalış", "Yüzde puan", "percentage points", "Orijinal değer"],
  formulas: [
    { label: "Bir sayının yüzdesi", tex: "P = \\frac{X}{100}\\, Y" },
    { label: "Değişim yüzdesi", tex: "\\Delta\\% = \\frac{B - A}{A}\\times 100" },
    { label: "Değişimden önceki asıl değer", tex: "Y = \\frac{F}{1 \\pm \\frac{X}{100}}" },
    { label: "Yüzde puan", tex: "\\Delta p = p_2 - p_1,\\qquad \\text{nispi değişim} = \\frac{\\Delta p}{p_1}\\times 100" }
  ],
  inputs: [
    { id: "mode", label: "Hesaplama türü", type: "select", default: "of", options: [["of", "Y'nin %X'i"], ["what", "X parçası, Y'nin yüzde kaçıdır"], ["change", "A'dan B'ye değişim yüzdesi"], ["add", "Y, %X oranında artırılır"], ["sub", "Y, %X oranında azaltılır"], ["reverse", "Değişimden önceki asıl değer"], ["points", "İki yüzde arasındaki fark (yüzde puan)"]] },
    { id: "pct", label: "Yüzde X", unit: "%", type: "number", default: "20", when: { mode: ["of", "add", "sub", "reverse"] } },
    { id: "base", label: "Değer Y", type: "number", default: "150", when: { mode: ["of", "add", "sub"] } },
    { id: "part", label: "Parça X", type: "number", default: "30", when: { mode: ["what"] } },
    { id: "whole", label: "Bütün Y", type: "number", default: "150", when: { mode: ["what"] } },
    { id: "dir", label: "Değişim türü", type: "select", default: "inc", options: [["inc", "Artış"], ["dec", "Azalış"]], when: { mode: ["reverse"] } },
    { id: "final", label: "Son değer F", type: "number", default: "230", when: { mode: ["reverse"] } },
    { id: "from", label: "Orijinal değer A", type: "number", default: "80", when: { mode: ["change"] } },
    { id: "to", label: "Yeni değer B", type: "number", default: "100", when: { mode: ["change"] } },
    { id: "p1", label: "Birinci yüzde p1", unit: "%", type: "number", default: "12", when: { mode: ["points"] } },
    { id: "p2", label: "İkinci yüzde p2", unit: "%", type: "number", default: "15", when: { mode: ["points"] } }
  ],
  example: {
    values: { mode: "of", pct: "20", base: "150", part: "30", whole: "150", dir: "inc", final: "230", from: "80", to: "100", p1: "12", p2: "15" },
    expect: ["= 30"],
    note: "Örnek: 150'nin %20'si = 30."
  },
  invalid: { values: { mode: "change", from: "0", to: "5" } },
  related: ["fractions", "ratio-proportion", "significant-figures"]
};

function ofMode(input) {
  const x = num(input, "pct", "Yüzde X", { nonNegative: true });
  const y = num(input, "base", "Değer Y");
  const r = (x * y) / 100;
  return {
    results: [
      { label: "Sonuç", value: N(r) },
      { label: "Yüzdenin ondalık sayı karşılığı", value: N(x / 100) }
    ],
    steps: [
      { text: "Yüzdeyi 100'e bölerek ondalık sayıya çeviriyoruz:", tex: `\\frac{${ntex(x)}}{100} = ${ntex(x / 100, 8)}` },
      { text: "Ondalık sayıyı değerle çarpıyoruz:", tex: `${ntex(x / 100, 8)} \\times ${ntex(y)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} sayısının %${N(x)}'i = ${N(r)}`
  };
}

function whatMode(input) {
  const part = num(input, "part", "Parça X");
  const whole = num(input, "whole", "Bütün Y", { nonZero: true });
  const p = (part * 100) / whole;
  return {
    results: [{ label: "Yüzde", value: P(p) }],
    steps: [
      { text: "Parçayı bütüne bölüp 100 ile çarpıyoruz:", tex: `\\frac{${ntex(part)}}{${ntex(whole)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(part)}, ${N(whole)} sayısının %${N(p)}'i kadardır`
  };
}

function changeMode(input) {
  const a = num(input, "from", "Orijinal değer A", { nonZero: true });
  const b = num(input, "to", "Yeni değer B");
  const diff = b - a;
  const p = (diff * 100) / a;
  const dir = diff > 0 ? "Artış" : diff < 0 ? "Azalış" : "Değişim yok";
  return {
    results: [
      { label: "Değişim yüzdesi", value: `${p > 0 ? "+" : ""}${P(p)}` },
      { label: "Değişim miktarı", value: N(diff) },
      { label: "Değişim türü", value: dir }
    ],
    steps: [
      { text: "İki değer arasındaki farkı hesaplıyoruz:", tex: `\\Delta = B - A = ${ntex(b)} - ${ntex(a)} = ${ntex(diff)}` },
      { text: "Farkı orijinal değere bölüp 100 ile çarpıyoruz:", tex: `\\frac{${ntex(diff)}}{${ntex(a)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(a)}'dan ${N(b)}'e: ${dir} %${N(Math.abs(p))}`
  };
}

function shiftMode(input, sign) {
  const x = num(input, "pct", "Yüzde X", { nonNegative: true });
  if (sign < 0 && x > 100) fail("Azalış durumunda yüzde 100'ü geçemez.", "pct");
  const y = num(input, "base", "Değer Y");
  const inc = (y * x) / 100;
  const r = y + sign * inc;
  const word = sign > 0 ? "Artış" : "Azalış";
  const op = sign > 0 ? "+" : "-";
  return {
    results: [
      { label: sign > 0 ? "Artıştan sonraki değer" : "Azalıştan sonraki değer", value: N(r) },
      { label: "Değişim miktarı", value: N(inc) }
    ],
    steps: [
      { text: "Yüzdeden değişim miktarını hesaplıyoruz:", tex: `\\frac{${ntex(x)}}{100} \\times ${ntex(y)} = ${ntex(inc, 8)}` },
      { text: `${word} yüzdesini orijinal değere uyguluyoruz:`, tex: `${ntex(y)} ${op} ${ntex(inc, 8)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} değerinde %${N(x)} ${word} sonrası = ${N(r)}`
  };
}

function reverseMode(input) {
  const f = num(input, "final", "Son değer F");
  const x = num(input, "pct", "Yüzde X", { nonNegative: true });
  const dir = choice(input, "dir", "Değişim türü", ["inc", "dec"], "inc");
  if (dir === "dec" && x >= 100) fail("Azalış durumunda yüzde 100'den küçük olmalıdır.", "pct");
  const inc = dir === "inc";
  const f0 = inc ? 100 + x : 100 - x;
  const orig = (f * 100) / f0;
  const word = inc ? "Artış" : "Azalış";
  return {
    results: [
      { label: "Orijinal değer", value: N(orig) },
      { label: "Değişim çarpanı", value: `× ${N(f0 / 100)}` }
    ],
    steps: [
      { text: "Son değer = orijinal × değişim çarpanı; değişim çarpanı = 1 ± X/100:", tex: `1 ${inc ? "+" : "-"} \\frac{${ntex(x)}}{100} = \\frac{${ntex(f0)}}{100}` },
      { text: "Son değeri değişim çarpanına bölüyoruz:", tex: `Y = \\frac{${ntex(f)}}{${ntex(f0 / 100, 8)}} = \\frac{${ntex(f)} \\times 100}{${ntex(f0)}} = ${ntex(orig, 8)}` }
    ],
    copy: `Orijinal değer = ${N(orig)} (son değer ${N(f)}, %${N(x)} ${word} sonrası)`
  };
}

function pointsMode(input) {
  const p1 = num(input, "p1", "Birinci yüzde p1", { nonZero: true });
  const p2 = num(input, "p2", "İkinci yüzde p2");
  const diff = p2 - p1;
  const rel = (diff * 100) / p1;
  const word = diff > 0 ? "Artış" : diff < 0 ? "Azalış" : "Değişim yok";
  return {
    results: [
      { label: "Yüzde puan farkı", value: `${N(diff)} yüzde puan` },
      { label: "Nispi değişim", value: `${rel > 0 ? "+" : ""}${P(rel)}` },
      { label: "Değişim türü", value: word }
    ],
    steps: [
      { text: "Yüzde puan farkı, iki yüzdenin doğrudan çıkarılmasıdır:", tex: `\\Delta p = p_2 - p_1 = ${ntex(p2)} - ${ntex(p1)} = ${ntex(diff)}\\ \\text{pp}` },
      { text: "Nispi değişim, farkı birinci yüzdeye göre karşılaştırır:", tex: `\\frac{\\Delta p}{p_1} \\times 100 = \\frac{${ntex(diff)}}{${ntex(p1)}} \\times 100 = ${ntex(rel, 8)}\\%` }
    ],
    copy: `%${N(p1)}'dan %${N(p2)}'e: ${N(diff)} yüzde puan fark, nispi değişim %${N(rel)}`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama türü", MODES, "of");
  if (mode === "of") return ofMode(input);
  if (mode === "what") return whatMode(input);
  if (mode === "change") return changeMode(input);
  if (mode === "add") return shiftMode(input, 1);
  if (mode === "sub") return shiftMode(input, -1);
  if (mode === "reverse") return reverseMode(input);
  return pointsMode(input);
}
