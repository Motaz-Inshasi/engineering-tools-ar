import { derivative, simplify } from "../core/symbolic.js";
import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { derivNumeric } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Herhangi bir fonksiyonun türevini sembolik olarak hesaplayın; kullanılan her türev kuralını açıklayın: kuvvet, çarpım, bölüm, zincir, trigonometrik, üstel ve logaritmik kurallar.",
  intro: "Fonksiyonu yazın; birinci veya daha yüksek mertebeden türevini, her adımda kullanılan kuralın açıklamasıyla birlikte alın. İsterseniz bir noktadaki türev değerini de hesaplayın.",
  keywords: ["türev", "türev alma", "diferansiyel", "derivative", "zincir kuralı", "çarpım kuralı", "bölüm kuralı"],
  formulas: [
    { label: "Kuvvet kuralı ve çarpım kuralı", tex: "\\frac{d}{dx}x^n = n x^{n-1}, \\qquad (uv)' = u'v + uv'" },
    { label: "Bölüm kuralı ve zincir kuralı", tex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}, \\qquad \\frac{d}{dx}f(g(x)) = f'(g(x))\\,g'(x)" }
  ],
  inputs: [
    { id: "f", label: "Fonksiyon f", type: "expr", placeholder: "x^2 sin(x)", help: "Üs için ^ kullanın; sin cos tan ln log sqrt exp abs ile sabitler pi ve e kullanılabilir. 2x gibi örtük çarpma serbesttir." },
    { id: "v", label: "Değişken", type: "text", default: "x" },
    { id: "order", label: "Türevin mertebesi", type: "select", default: "1", options: [["1", "Birinci"], ["2", "İkinci"], ["3", "Üçüncü"], ["4", "Dördüncü"], ["5", "Beşinci"]] },
    { id: "at", label: "Türevin hesaplanacağı değişken değeri (isteğe bağlı)", type: "number", placeholder: "örneğin 1.5" }
  ],
  example: { values: { f: "x^2 sin(x)", v: "x", order: "1", at: "" }, expect: ["x^2*cos(x) + 2*x*sin(x)"], note: "Örnek: çarpım kuralıyla $x^2\\sin x$ fonksiyonunun türevi." },
  invalid: { values: { f: "x^2 +* 3", v: "x", order: "1" } },
  related: ["integral", "limit", "taylor-series", "function-plotter"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const order = Number(choice(input, "order", "Türevin mertebesi", ["1", "2", "3", "4", "5"], "1"));
  const at = num(input, "at", "Değerlendirme noktası", { optional: true });
  const steps = [];
  steps.push({ text: "Sadeleştirilmiş fonksiyon:", tex: `f(${v}) = ${toTex(f)}` });
  let cur = f;
  const all = [];
  for (let k = 1; k <= order; k++) {
    const r = derivative(cur, v, { maxSteps: k === 1 ? 40 : 12 });
    if (order > 1) steps.push({ text: `${k}. türev: önceki adımın sonucunu türetiyoruz.` });
    for (const s of r.steps) steps.push({ text: s.rule, tex: s.tex });
    cur = r.result;
    all.push(cur);
  }
  const prime = order === 1 ? "'" : order === 2 ? "''" : `^{(${order})}`;
  const results = [{ label: `$f${prime}(${v})$ türevi`, tex: `f${prime}(${v}) = ${toTex(cur)}`, text: toText(cur) }];
  const blocks = [];
  if (at !== null) {
    const val = f1(cur, v)(at);
    if (!isFinite(val)) {
      blocks.push({ type: "note", tone: "warn", text: `Türev ${v} = ${fmt(at)} noktasında tanımsızdır.` });
    } else {
      results.push({ label: `${v} = ${fmt(at)} noktasındaki değer`, value: val, text: fmt(val, 10) });
      steps.push({ text: `Türevde ${v} = ${fmt(at)} yerine koyarız:`, tex: `f${prime}(${ntex(at)}) = ${ntex(val, 10)}` });
      if (order <= 2) {
        const nd = derivNumeric(f1(f, v), at, order);
        if (isFinite(nd)) steps.push(`Kontrol: merkezi farklarla sayısal yaklaşım ${fmt(nd, 8)} sonucunu verir.`);
      }
    }
  }
  return { results, steps, blocks, copy: `f${order === 1 ? "'" : order === 2 ? "''" : `(${order})`}(${v}) = ${toText(cur)}${at !== null && isFinite(f1(cur, v)(at)) ? `
${v} = ${fmt(at)} için: ${fmt(f1(cur, v)(at), 10)}` : ""}` };
}
