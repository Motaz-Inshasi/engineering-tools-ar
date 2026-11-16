import { integrate, simplify } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice } from "../core/format.js";
import { integrateNumeric, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Herhangi bir fonksiyonun belirsiz ve belirli integralini hesaplayın: güvenilir olduğunda adımlarıyla sembolik çözüm, sembolik çözüm yoksa net adlandırılmış kesin bir sayısal değer.",
  intro: "Sembolik integral; kuvvet, trigonometrik, üstel ve logaritmik fonksiyonları, değişken değiştirmeyi, kısmi integrasyonu ve kısmi kesirleri destekler. Her sembolik sonuç gösterilmeden önce sayısal olarak denetlenir.",
  keywords: ["integral", "integral", "belirli integral", "belirsiz integral", "eğrinin altındaki alan", "kısmi integrasyon", "değişken değiştirme"],
  formulas: [
    { label: "Belirsiz ve belirli integral", tex: "\\int f(x)\\,dx = F(x) + C, \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "Kuvvet kuralı ve kısmi integrasyon", tex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C,\\qquad \\int u\\,dv = uv - \\int v\\,du" }
  ],
  inputs: [
    { id: "f", label: "İntegrali alınacak fonksiyon", type: "expr", placeholder: "x e^x", help: "örneğin: x^2 sin(x), 1/(x^2+1), e^(2x), ln(x)" },
    { id: "v", label: "Değişken", type: "text", default: "x" },
    { id: "mode", label: "İntegral türü", type: "select", default: "indefinite", options: [["indefinite", "belirsiz"], ["definite", "belirli"]] },
    { id: "a", label: "Alt sınır a", type: "number", when: { mode: ["definite"] }, help: "inf veya -inf yazılabilir" },
    { id: "b", label: "Üst sınır b", type: "number", when: { mode: ["definite"] } }
  ],
  example: { values: { f: "x e^x", v: "x", mode: "definite", a: "0", b: "1" }, expect: ["= 1"], note: "Örnek: kısmi integrasyonla $\\int_0^1 x e^x\\,dx$, sonuç 1." },
  invalid: { values: { f: "sin(x", mode: "indefinite" } },
  related: ["derivative", "function-plotter", "laplace", "partial-fractions"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const mode = choice(input, "mode", "İntegral türü", ["indefinite", "definite"], "indefinite");
  const steps = [{ text: "Sadeleştirilmiş fonksiyon:", tex: `f(${v}) = ${toTex(f)}` }];
  const blocks = [];
  const sym = integrate(f, v);
  if (sym) {
    for (const s of sym.steps) steps.push({ text: s.rule, tex: s.tex });
    steps.push(`Sonucu sayısal olarak türevini alıp birkaç noktada orijinal fonksiyonla karşılaştırarak doğruladık.`);
  }
  if (mode === "indefinite") {
    if (!sym) {
      blocks.push({ type: "note", tone: "warn", text: "Desteklenen kurallarla bu fonksiyon için güvenilir bir sembolik integral bulamadık. Temel fonksiyonlarla ifade edilemeyen bir integrali olabilir (örneğin $e^{x^2}$). Sayısal bir değer için belirli integrali deneyin." });
      return { results: [{ label: "Belirsiz integral", value: "sembolik olarak mevcut değil" }], steps, blocks, copy: "Belirsiz integral sembolik olarak mevcut değil" };
    }
    return {
      results: [{ label: "Belirsiz integral", tex: `\\int ${toTex(f)}\\,d${v} = ${toTex(sym.result)} + C`, text: `${toText(sym.result)} + C` }],
      steps, blocks, copy: `∫ ${toText(f)} d${v} = ${toText(sym.result)} + C`
    };
  }
  const a = num(input, "a", "Alt sınır", { allowInfinity: true });
  const b = num(input, "b", "Üst sınır", { allowInfinity: true });
  if (a === b) fail("İki sınır eşit, dolayısıyla integral sıfırdır. Farklı iki sınır girin.", "b");
  const F = f1(f, v);
  const numeric = integrateNumeric(F, a, b, { tol: 1e-11 });
  let exact = null;
  if (sym && isFinite(a) && isFinite(b)) {
    const G = f1(sym.result, v);
    const Fa = G(a), Fb = G(b);
    const pts = sampleFunction(F, Math.min(a, b), Math.max(a, b), 401);
    const continuous = pts.every(([, y]) => y !== null);
    const val = Fb - Fa;
    if (continuous && isFinite(val) && numeric.ok && Math.abs(val - numeric.value) <= 1e-6 * Math.max(1, Math.abs(val))) {
      exact = val;
      steps.push({ text: `Analizin temel teoremini uyguluyoruz: $F(b) - F(a)$`, tex: `F(${ntex(b)}) - F(${ntex(a)}) = ${ntex(Fb, 10)} - (${ntex(Fa, 10)}) = ${ntex(val, 10)}` });
    } else if (!continuous) {
      blocks.push({ type: "note", tone: "warn", text: "Fonksiyon integral aralığının içindeki bir noktada tanımsız, bu nedenle $F(b)-F(a)$ doğrudan uygulanamaz." });
    }
  }
  const results = [];
  if (exact !== null) {
    const shown = Math.abs(exact - Math.round(exact)) < 1e-10 ? Math.round(exact) : exact;
    results.push({ label: "Belirli integralin değeri", tex: `\\int_{${ntex(a)}}^{${ntex(b)}} ${toTex(f)}\\,d${v} = ${niceTex(shown, 10)}`, text: `= ${nice(shown, 10)}` });
    results.push({ label: "Ondalık değer", value: exact, sig: 12 });
  } else {
    if (!numeric.ok || !isFinite(numeric.value)) {
      blocks.push({ type: "note", tone: "warn", text: "İntegral yakınsamıyor veya fonksiyon aralıkta sınırsız, bu yüzden güvenilir bir değer verilemez." });
      return { results: [{ label: "Belirli integralin değeri", value: "yakınsamıyor veya tanımsız" }], steps, blocks, copy: "integral yakınsamıyor" };
    }
    results.push({ label: "Belirli integralin değeri (sayısal yaklaşım)", value: numeric.value, sig: 10, text: `≈ ${fmt(numeric.value, 10)}` });
    results.push({ label: "Sayısal hata tahmini", value: numeric.error, sig: 2 });
    steps.push(`Sayısal değeri uyarlanabilir Gauss-Kronrod yöntemiyle (15 nokta) hesapladık; aralığı ${numeric.intervals} parçaya bölerek.`);
    if (!isFinite(a) || !isFinite(b)) steps.push("Sonsuz sınırlar için, sayısal integralden önce aralığı sınırlı hâle getiren bir değişken dönüşümü kullandık.");
    blocks.push({ type: "note", text: "Bu bir sayısal yaklaşık değerdir, sembolik sonuç değildir." });
  }
  if (isFinite(a) && isFinite(b)) {
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    blocks.push({ type: "plot", title: `Fonksiyonun eğrisi ve integral sınırları`, xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }], vlines: [{ x: lo }, { x: hi }] });
  }
  const copyVal = exact !== null ? nice(exact, 10) : `≈ ${fmt(numeric.value, 10)}`;
  return { results, steps, blocks, copy: `∫ ${fmt(a)} ile ${fmt(b)} arasında, ${toText(f)} için d${v} = ${copyVal}` };
}
