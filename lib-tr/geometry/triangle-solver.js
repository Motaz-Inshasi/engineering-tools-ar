import { fail, isBlank, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Üç veriden (üç kenar, iki kenar ve bir açı ya da iki açı ve bir kenar) herhangi bir üçgeni kosinüs ve sinüs teoremleriyle çözün; belirsiz durumu, alanı, yükseklikleri, iç ve dış çember yarıçaplarını ve çizimi de ekleyin.",
  keywords: ["Üçgeni çözme", "Sinüs teoremi", "Kosinüs teoremi", "law of sines", "law of cosines", "triangle solver", "Üçgenin alanı", "Heron", "SSS", "SAS", "ASA", "SSA", "Belirsiz durum"],
  formulas: [
    { label: "Kosinüs teoremi", tex: "c^2 = a^2 + b^2 - 2ab\\cos C" },
    { label: "Sinüs teoremi", tex: "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R" },
    { label: "Heron formülü", tex: "S = \\sqrt{s(s-a)(s-b)(s-c)},\\quad s = \\frac{a+b+c}{2}" }
  ],
  inputs: [
    { id: "a", label: "Kenar a (A'nın karşısında)", type: "number", default: "7" },
    { id: "b", label: "Kenar b (B'nin karşısında)", type: "number", default: "" },
    { id: "c", label: "Kenar c (C'nin karşısında)", type: "number", default: "5" },
    { id: "A", label: "A açısı", unit: "°", type: "number", default: "" },
    { id: "B", label: "B açısı", unit: "°", type: "number", default: "60" },
    { id: "C", label: "C açısı", unit: "°", type: "number", default: "" },
    { id: "unit", label: "Uzunluk birimi", type: "text", default: "cm" }
  ],
  example: { values: { a: "8", b: "", c: "5", A: "", B: "60", C: "", unit: "cm" }, expect: ["b = 7 cm"], note: "Örnek (iki kenar ve aralarındaki açı): a = 8, c = 5 ve aralarındaki açı B = 60°." },
  invalid: { values: { a: "1", b: "2", c: "5", A: "", B: "", C: "", unit: "cm" } },
  related: ["pythagoras", "trigonometry", "plane-shapes", "coordinate-geometry", "polygon-area"]
};

const R = Math.PI / 180;
const deg = (x) => x / R;
const S = ["a", "b", "c"], ANG = ["A", "B", "C"];

function finish(s, ang) {
  const [a, b, c] = s;
  const p = a + b + c, h = p / 2;
  const area = Math.sqrt(Math.max(0, h * (h - a) * (h - b) * (h - c)));
  return { s, ang, p, area, r: area / h, Rc: a / (2 * Math.sin(ang[0] * R)), hs: s.map((x) => (2 * area) / x) };
}

function solveCase(sides, angles, steps) {
  const sk = [0, 1, 2].filter((i) => sides[i] !== null), ak = [0, 1, 2].filter((i) => angles[i] !== null);
  const s = [...sides], g = [...angles];
  const L = (i) => S[i], A = (i) => ANG[i];
  if (ak.length === 2) {
    const k = [0, 1, 2].find((i) => g[i] === null);
    g[k] = 180 - g[ak[0]] - g[ak[1]];
    if (g[k] <= 0) fail("Verilen iki açının toplamı 180° veya daha fazla; bu durumda üçgen yoktur.", ANG[ak[1]]);
    steps.push({ text: "Üçüncü açı, üçgen açılarının toplamından:", tex: `${A(k)} = 180^{\\circ} - ${ntex(g[ak[0]])}^{\\circ} - ${ntex(g[ak[1]])}^{\\circ} = ${ntex(g[k], 6)}^{\\circ}` });
    const i0 = sk[0], ratio = s[i0] / Math.sin(g[i0] * R);
    steps.push({ text: "Diğer iki kenarı bulmak için sinüs teoremi:", tex: `\\frac{${L(i0)}}{\\sin ${A(i0)}} = \\frac{${ntex(s[i0])}}{\\sin ${ntex(g[i0], 6)}^{\\circ}} = ${ntex(ratio, 6)}` });
    for (const i of [0, 1, 2]) if (i !== i0) { s[i] = ratio * Math.sin(g[i] * R); steps.push({ text: "", tex: `${L(i)} = ${ntex(ratio, 6)} \\times \\sin ${ntex(g[i], 6)}^{\\circ} = ${ntex(s[i], 6)}` }); }
    return [finish(s, g)];
  }
  if (sk.length === 3) {
    const [a, b, c] = s;
    for (let i = 0; i < 3; i++) if (s[i] >= s[(i + 1) % 3] + s[(i + 2) % 3]) fail(`Kenarlar üçgen eşitsizliğini sağlamıyor: ${L(i)} = ${fmt(s[i])} diğer iki kenarın toplamından (${fmt(s[(i + 1) % 3] + s[(i + 2) % 3])}) küçük değil.`, L(i));
    g[0] = deg(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
    g[1] = deg(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
    g[2] = 180 - g[0] - g[1];
    steps.push({ text: "Açıları bulmak için kosinüs teoremi:", tex: `\\cos A = \\frac{b^2 + c^2 - a^2}{2bc} = \\frac{${ntex(b)}^2 + ${ntex(c)}^2 - ${ntex(a)}^2}{2(${ntex(b)})(${ntex(c)})} \\Rightarrow A = ${ntex(g[0], 6)}^{\\circ}` });
    steps.push({ text: "", tex: `\\cos B = \\frac{a^2 + c^2 - b^2}{2ac} \\Rightarrow B = ${ntex(g[1], 6)}^{\\circ},\\quad C = 180^{\\circ} - A - B = ${ntex(g[2], 6)}^{\\circ}` });
    return [finish(s, g)];
  }
  const ai = ak[0];
  if (sk.includes(ai)) {
    const oi = sk.find((i) => i !== ai);
    const sinO = (s[oi] * Math.sin(g[ai] * R)) / s[ai];
    steps.push({ text: "Aralarında açı bulunmayan iki kenar ve bir açı (SSA) durumunda sinüs teoremi kullanılır:", tex: `\\sin ${A(oi)} = \\frac{${L(oi)}\\,\\sin ${A(ai)}}{${L(ai)}} = \\frac{${ntex(s[oi])} \\sin ${ntex(g[ai])}^{\\circ}}{${ntex(s[ai])}} = ${ntex(sinO, 6)}` });
    if (sinO > 1 + 1e-12) fail(`Bu verilerle üçgen yoktur: sin ${A(oi)} = ${fmt(sinO, 4)} > 1 (${L(ai)} kenarı üçüncü kenara ulaşamayacak kadar kısa).`, L(ai));
    const base = deg(Math.asin(Math.min(1, sinO)));
    const cands = [base];
    if (sinO < 1 - 1e-10 && 180 - base + g[ai] < 180 - 1e-9) cands.push(180 - base);
    const sols = [];
    for (const go of cands) {
      const gg = [...g], ss = [...s];
      gg[oi] = go;
      const k = 3 - ai - oi;
      gg[k] = 180 - gg[ai] - go;
      if (gg[k] <= 1e-9) continue;
      ss[k] = (s[ai] * Math.sin(gg[k] * R)) / Math.sin(g[ai] * R);
      sols.push(finish(ss, gg));
    }
    if (!sols.length) fail("Bu verilerle üçgen yoktur (açıların toplamı 180°'yi aşıyor).", ANG[ai]);
    steps.push(sols.length === 2 ? `Belirsiz durum: ${A(oi)} açısı ${fmt(base, 6)}° ya da ${fmt(180 - base, 6)}° olabilir; iki farklı üçgen vardır.` : `Tek çözüm var: ${A(oi)} = ${fmt(sols[0].ang[oi], 6)}°.`);
    return sols;
  }
  const [i, j] = sk;
  const k = ai;
  if (g[k] >= 180) fail("Açı 180°'den küçük olmalıdır.", ANG[k]);
  s[k] = Math.sqrt(s[i] * s[i] + s[j] * s[j] - 2 * s[i] * s[j] * Math.cos(g[k] * R));
  steps.push({ text: "Aralarında açı bulunan iki kenar (SAS) durumunda kosinüs teoremi kullanılır:", tex: `${L(k)}^2 = ${ntex(s[i])}^2 + ${ntex(s[j])}^2 - 2(${ntex(s[i])})(${ntex(s[j])})\\cos ${ntex(g[k])}^{\\circ} = ${ntex(s[k] * s[k], 6)} \\Rightarrow ${L(k)} = ${ntex(s[k], 6)}` });
  g[i] = deg(Math.acos((s[j] * s[j] + s[k] * s[k] - s[i] * s[i]) / (2 * s[j] * s[k])));
  g[j] = 180 - g[k] - g[i];
  steps.push({ text: "Sonra diğer iki açı:", tex: `\\cos ${A(i)} = \\frac{${L(j)}^2 + ${L(k)}^2 - ${L(i)}^2}{2${L(j)}${L(k)}} \\Rightarrow ${A(i)} = ${ntex(g[i], 6)}^{\\circ},\\quad ${A(j)} = ${ntex(g[j], 6)}^{\\circ}` });
  return [finish(s, g)];
}

function kind(t) {
  const [a, b, c] = t.s, mx = Math.max(...t.ang);
  const eq = (x, y) => Math.abs(x - y) <= 1e-9 * Math.max(x, y);
  const bySide = eq(a, b) && eq(b, c) ? "Eşkenar üçgen" : eq(a, b) || eq(b, c) || eq(a, c) ? "İkizkenar üçgen" : "Çeşitkenar üçgen";
  const byAng = Math.abs(mx - 90) < 1e-7 ? "Dik açılı üçgen" : mx > 90 ? "Geniş açılı üçgen" : "Dar açılı üçgen";
  return `${bySide}، ${byAng}`;
}

export function solve(input) {
  const unit = str(input, "unit", "Birim", { default: "" }).trim();
  const u = unit ? ` ${unit}` : "";
  const sides = S.map((k) => (isBlank(input[k]) ? null : num(input, k, `Kenar ${k}`, { positive: true })));
  const angles = ANG.map((k) => (isBlank(input[k]) ? null : num(input, k, `Açı ${k}`, { positive: true, below: 180 })));
  const nS = sides.filter((x) => x !== null).length, nA = angles.filter((x) => x !== null).length;
  if (nS + nA !== 3) fail(`Tam olarak üç veri girin (${nS + nA} girdiniz).`, nS + nA > 3 ? "C" : "a");
  if (nS === 0) fail("En az bir kenar girin; açılar yalnızca üçgenin şeklini belirler, boyutunu belirlemez.", "a");
  const steps = [];
  const sols = solveCase(sides, angles, steps);
  const results = [];
  const blocks = [];
  sols.forEach((t, n) => {
    const tag = sols.length > 1 ? ` (çözüm ${n + 1})` : "";
    results.push(
      { label: `Kenarlar${tag}`, value: S.map((k, i) => `${k} = ${fmt(t.s[i], 6)}${u}`).join("، "), text: S.map((k, i) => `${k} = ${fmt(t.s[i], 6)}${u}`).join(", ") },
      { label: `Açılar${tag}`, value: ANG.map((k, i) => `${k} = ${fmt(t.ang[i], 6)}°`).join("، ") },
      { label: `Alan / çevre${tag}`, value: `${fmt(t.area, 6)}${unit ? ` ${unit}²` : ""} / ${fmt(t.p, 6)}${u}` },
      { label: `Tür${tag}`, value: kind(t) }
    );
    if (sols.length === 1) results.push(
      { label: "Yükseklikler hₐ / h_b / h_c", value: t.hs.map((x) => fmt(x, 5)).join(" / ") },
      { label: "İç / dış çember yarıçapı", value: `${fmt(t.r, 5)} / ${fmt(t.Rc, 5)}` }
    );
    const P = [[0, 0], [t.s[2], 0], [t.s[1] * Math.cos(t.ang[0] * R), t.s[1] * Math.sin(t.ang[0] * R)]];
    blocks.push({ type: "plot", title: `Üçgen çizimi${tag}`, xLabel: "", yLabel: "", equalAspect: true, series: [{ name: "Üçgen", points: [...P, P[0]], marker: "o", line: true }] });
  });
  const t0 = sols[0];
  steps.push({ text: "Heron formülüyle alan:", tex: `s = ${ntex(t0.p / 2, 6)},\\quad S = \\sqrt{s(s-a)(s-b)(s-c)} = ${ntex(t0.area, 6)}` });
  return { results, steps, blocks, copy: sols.map((t) => `${S.map((k, i) => `${k} = ${fmt(t.s[i], 6)}${u}`).join(", ")}; ${ANG.map((k, i) => `${k} = ${fmt(t.ang[i], 6)}°`).join(", ")}; S = ${fmt(t.area, 6)}`).join(" | ") };
}
