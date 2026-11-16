import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, deg, tex as ntex } from "../core/format.js";

const LABEL = { a: "Birinci dik kenar a", b: "İkinci dik kenar b", c: "Hipotenüs c" };

const blank = { mode: "", unit: "cm", a: "", b: "", c: "" };

function gcd(x, y) {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

function isInt(v) {
  return Math.abs(v - Math.round(v)) < 1e-9;
}

export const meta = {
  description: "İki bilinen kenardan dik üçgendeki bilinmeyen kenarı Pisagor teoremiyle, açıları, alanı, çevresi ve hipotenüse ait yüksekliği hesaplayın; ya da üç kenarıyla bir üçgeni dik, dar veya geniş açılı olarak sınıflandırın ve Pisagor üçlülerini tanıyın.",
  keywords: ["Pisagor", "Dik üçgen", "Hipotenüs", "Pisagor üçlüsü", "Dar ve geniş açılı", "pythagoras", "right triangle", "hypotenuse"],
  formulas: [
    { label: "Pisagor teoremi", tex: "c^2 = a^2 + b^2" },
    { label: "Alan ve hipotenüse ait yükseklik", tex: "A = \\frac{ab}{2},\\qquad h = \\frac{ab}{c}" },
    { label: "Üçgen sınıflandırması", tex: "c^2 = a^2+b^2 \\Rightarrow \\text{dik}, \\quad c^2 < a^2+b^2 \\Rightarrow \\text{dar}, \\quad c^2 > a^2+b^2 \\Rightarrow \\text{geniş}" }
  ],
  inputs: [
    { id: "mode", label: "Mod", type: "select", default: "solve", options: [["solve", "Dik üçgende bilinmeyen kenarı bulma"], ["check", "Üç kenarıyla üçgen sınıflandırma"]] },
    { id: "unit", label: "Uzunluk birimi", type: "text", default: "cm" },
    { id: "a", label: "Birinci dik kenar a", type: "number", default: "3", help: "Bulma modunda a, b ve c'den yalnızca ikisini girin." },
    { id: "b", label: "İkinci dik kenar b", type: "number", default: "4" },
    { id: "c", label: "Hipotenüs c (ya da sınıflandırma modunda üçüncü kenar)", type: "number", help: "Bulma modunda hipotenüs, bilinen dik kenardan uzun olmalıdır." }
  ],
  example: { values: { ...blank, mode: "solve", unit: "cm", a: "3", b: "4" }, expect: ["Hipotenüs c = 5 cm", "6 cm²"], note: "Örnek: dik kenarlar 3 ve 4 cm; hipotenüs 5 cm olur ve bu 3-4-5 üçlüsüdür." },
  invalid: { values: { ...blank, mode: "solve", unit: "cm", a: "5", c: "3" } },
  related: ["triangle-solver", "plane-shapes", "solids", "circle-geometry", "coordinate-geometry", "trigonometry", "unit-converter"]
};

function ctxOf(unit) {
  return {
    L: (x) => `${fmt(x, 6)} ${unit}`,
    A: (x) => `${fmt(x, 6)} ${unit}²`,
    T: (x) => ntex(x, 6),
    U: `\\text{${unit}}`
  };
}

function tripleLabel(x, y, z) {
  const d = gcd(gcd(x, y), z);
  return d === 1 ? `Evet, ilkel üçlü (${x}, ${y}, ${z})` : `Evet, ilkel bir üçlünün katı (${x}, ${y}, ${z})`;
}

function solveRight(input, c) {
  const vals = {};
  for (const k of ["a", "b", "c"]) vals[k] = num(input, k, LABEL[k], { positive: true, optional: true });
  const keys = ["a", "b", "c"];
  const given = keys.filter((k) => vals[k] !== null);
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => vals[k] === null);
    fail(`a, b ve c kenarlarından yalnızca ikisini girin (${given.length} girdiniz).`, field);
  }
  let a = vals.a, b = vals.b, hyp = vals.c;
  const steps = [];
  if (a !== null && b !== null) {
    hyp = Math.hypot(a, b);
    steps.push({ text: "Pisagor teoremiyle hipotenüs:", tex: `c = \\sqrt{a^2+b^2} = \\sqrt{${c.T(a * a)}+${c.T(b * b)}} = ${c.T(hyp)}\\ ${c.U}` });
  } else if (a !== null) {
    if (hyp <= a) fail("Hipotenüs c, a dik kenarından uzun olmalıdır.", "c");
    b = Math.sqrt(hyp * hyp - a * a);
    steps.push({ text: "Bilinmeyen dik kenar b:", tex: `b = \\sqrt{c^2-a^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(a * a)}} = ${c.T(b)}\\ ${c.U}` });
  } else {
    if (hyp <= b) fail("Hipotenüs c, b dik kenarından uzun olmalıdır.", "c");
    a = Math.sqrt(hyp * hyp - b * b);
    steps.push({ text: "Bilinmeyen dik kenar a:", tex: `a = \\sqrt{c^2-b^2} = \\sqrt{${c.T(hyp * hyp)}-${c.T(b * b)}} = ${c.T(a)}\\ ${c.U}` });
  }
  const angA = deg(Math.atan2(a, b)), angB = 90 - angA;
  const area = (a * b) / 2, perimeter = a + b + hyp, alt = (a * b) / hyp;
  steps.push({ text: "Alan ve çevre:", tex: `A = \\frac{ab}{2} = ${c.T(area)}\\ ${c.U}^2,\\qquad P = a+b+c = ${c.T(perimeter)}\\ ${c.U}` });
  steps.push({ text: "İki dar açı (a'ya karşılık gelen A):", tex: `\\tan A = \\frac{a}{b} \\Rightarrow A = ${fmt(angA, 4)}^\\circ,\\quad B = ${fmt(angB, 4)}^\\circ` });
  steps.push({ text: "Hipotenüse ait yükseklik:", tex: `h = \\frac{ab}{c} = ${c.T(alt)}\\ ${c.U}` });
  const results = [
    { label: "Dik kenar a", value: c.L(a) },
    { label: "Dik kenar b", value: c.L(b) },
    { label: "Hipotenüs c", value: c.L(hyp) },
    { label: "A açısı (a'ya karşılık gelen)", value: `${fmt(angA, 4)}°` },
    { label: "B açısı", value: `${fmt(angB, 4)}°` },
    { label: "Alan", value: c.A(area), text: c.A(area) },
    { label: "Çevre", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "Hipotenüse ait yükseklik", value: c.L(alt) }
  ];
  if ([a, b, hyp].every(isInt)) results.push({ label: "Pisagor üçlüsü", value: tripleLabel(Math.round(a), Math.round(b), Math.round(hyp)) });
  return {
    results,
    steps,
    series: [{ name: "Dik üçgen", points: [[0, 0], [a, 0], [0, b], [0, 0]], line: true }],
    copy: `Hipotenüs c = ${c.L(hyp)}, alan = ${c.A(area)}, çevre = ${c.L(perimeter)}`
  };
}

function checkSides(input, c) {
  const a = num(input, "a", LABEL.a, { positive: true });
  const b = num(input, "b", LABEL.b, { positive: true });
  const k = num(input, "c", "Üçüncü kenar c", { positive: true });
  const [x, y, z] = [a, b, k].sort((p, q) => p - q);
  if (x + y <= z) fail("Üç kenar bir üçgen oluşturmuyor: herhangi iki kenarın toplamı üçüncü kenardan büyük olmalıdır.", "c");
  const diff = x * x + y * y - z * z;
  const kind = Math.abs(diff) <= 1e-9 * z * z ? "Dik açılı" : diff > 0 ? "Dar açılı" : "Geniş açılı";
  const s = (a + b + k) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - k));
  const perimeter = a + b + k;
  const clampCos = (v) => Math.min(1, Math.max(-1, v));
  const angA = deg(Math.acos(clampCos((b * b + k * k - a * a) / (2 * b * k))));
  const angB = deg(Math.acos(clampCos((a * a + k * k - b * b) / (2 * a * k))));
  const angC = 180 - angA - angB;
  const px = (a * a + k * k - b * b) / (2 * a), py = Math.sqrt(k * k - px * px);
  const results = [
    { label: "Üçgen türü", value: kind },
    { label: "En uzun kenarın karesi ile diğer ikisinin karelerinin toplamının karşılaştırması", value: `${fmt(z * z, 6)} ile ${fmt(x * x + y * y, 6)} karşılaştırması` },
    { label: "Alan", value: c.A(area), text: c.A(area) },
    { label: "Çevre", value: c.L(perimeter), text: c.L(perimeter) },
    { label: "Açılar (A, B, C derece)", value: `${fmt(angA, 4)}°، ${fmt(angB, 4)}°، ${fmt(angC, 4)}°` }
  ];
  if ([a, b, k].every(isInt)) {
    const isTriple = diff === 0 && [a, b, k].every((v) => Math.round(v) === v);
    results.push({ label: "Pisagor üçlüsü", value: isTriple ? tripleLabel(x, y, z) : "Hayır" });
  }
  return {
    results,
    steps: [
      { text: "Kenar karelerinin karşılaştırması:", tex: `${c.T(z)}^2 ${diff === 0 ? "=" : diff > 0 ? "<" : ">"} ${c.T(x)}^2+${c.T(y)}^2` },
      { text: "Yarı çevre ve Heron alanı:", tex: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${c.T(area)}\\ ${c.U}^2` }
    ],
    series: [{ name: "Üçgen", points: [[0, 0], [a, 0], [px, py], [0, 0]], line: true }],
    copy: `Üçgen ${kind}, alan = ${c.A(area)}, çevre = ${c.L(perimeter)}`
  };
}

export function solve(input) {
  const unit = str(input, "unit", "Uzunluk birimi", { default: "cm" });
  const mode = choice(input, "mode", "Mod", ["solve", "check"], "solve");
  const c = ctxOf(unit);
  const r = mode === "check" ? checkSides(input, c) : solveRight(input, c);
  const blocks = [{ type: "plot", title: "Üçgen çizimi", xLabel: `x (${unit})`, yLabel: `y (${unit})`, equalAspect: true, series: r.series }];
  return { results: r.results, steps: r.steps, blocks, copy: r.copy };
}
