import { simplify, diff } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { bisection, newton, secant, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "f(x) = 0 denkleminin kökünü ikiye bölme, Newton-Raphson veya kiriş yöntemiyle sayısal olarak bulun; her iterasyon için tam bir tablo ve kökün konumunu gösteren bir grafik verin.",
  keywords: ["kök", "denklem çözme", "Newton", "Newton-Raphson", "ikiye bölme", "bisection", "newton", "secant", "kiriş", "sayısal yöntemler"],
  formulas: [
    { label: "Newton-Raphson", tex: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    { label: "Kiriş", tex: "x_{n+1} = x_n - f(x_n)\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" },
    { label: "İkiye bölme", tex: "m = \\frac{a+b}{2},\\quad f(a)\\,f(b) < 0" }
  ],
  inputs: [
    { id: "f", label: "Fonksiyon f(x)", type: "expr", placeholder: "x^3 - 2x - 5" },
    { id: "v", label: "Değişken", type: "text", default: "x" },
    { id: "method", label: "Yöntem", type: "select", default: "newton", options: [["newton", "Newton-Raphson"], ["bisection", "İkiye bölme"], ["secant", "Kiriş"]] },
    { id: "x0", label: "Başlangıç değeri x₀", type: "number", default: "2", when: { method: ["newton", "secant"] } },
    { id: "x1", label: "İkinci değer x₁", type: "number", default: "3", when: { method: ["secant"] } },
    { id: "a", label: "Aralığın başlangıcı a", type: "number", default: "2", when: { method: ["bisection"] } },
    { id: "b", label: "Aralığın sonu b", type: "number", default: "3", when: { method: ["bisection"] } },
    { id: "tol", label: "İstenen hassasiyet", type: "number", default: "1e-10" }
  ],
  example: { values: { f: "x^3 - 2x - 5", v: "x", method: "newton", x0: "2", tol: "1e-10" }, expect: ["2.0945514815"], note: "Newton'ın ünlü örneği: 2 civarında $x^3 - 2x - 5 = 0$ denkleminin kökü." },
  invalid: { values: { f: "x^2 + 1", method: "bisection", a: "0", b: "1" } },
  related: ["polynomial-roots", "quadratic", "function-plotter", "derivative"]
};

const REASONS = {
  sign: "f(a) ve f(b) aynı işaretli, bu nedenle ikiye bölme bir kökün varlığını garanti etmez. Fonksiyonun işaret değiştirdiği bir aralık seçin.",
  undefined: "Fonksiyon hesaplama noktalarından birinde tanımsız. Başka bir başlangıç değeri deneyin.",
  zeroDerivative: "Türev noktalardan birinde sıfır olduğu için Newton yöntemi durdu. Başka bir başlangıç değeri deneyin.",
  diverged: "Yöntem ıraksadı, yakınsamadı. Köke daha yakın bir başlangıç değeri deneyin.",
  maxIter: "Yöntem 100 iterasyon içinde yakınsamadı. Başka bir başlangıç değeri veya ikiye bölme yöntemini deneyin.",
  flat: "Fonksiyonun iki ardışık noktadaki değerleri eşit olduğu için kiriş yöntemi durdu."
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const method = choice(input, "method", "Yöntem", ["newton", "bisection", "secant"], "newton");
  const tol = num(input, "tol", "Hassasiyet", { positive: true, default: 1e-10 });
  const F = f1(f, v);
  const steps = [{ text: "Çözülecek denklem:", tex: `${toTex(f)} = 0` }];
  let r, rows, head, start, field;
  if (method === "newton") {
    const x0 = num(input, "x0", "Başlangıç değeri");
    const d = diff(f, v);
    steps.push({ text: "Türevi sembolik olarak hesaplıyoruz:", tex: `f'(${v}) = ${toTex(d)}` });
    steps.push(`${v}₀ = ${fmt(x0)} ile başlayıp değişim ${fmt(tol)} değerinden küçük olana kadar formülü tekrarlarız.`);
    r = newton(F, f1(d, v), x0, { tol });
    head = ["n", "xₙ", "f(xₙ)", "f'(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x, 12), fmt(q.fx, 4), fmt(q.dfx, 6), fmt(q.next, 12)]);
    start = [x0]; field = "x0";
  } else if (method === "secant") {
    const x0 = num(input, "x0", "Başlangıç değeri"), x1 = num(input, "x1", "İkinci değer");
    if (x0 === x1) fail("İki başlangıç değeri farklı olmalıdır.", "x1");
    steps.push(`${v}₀ = ${fmt(x0)} ve ${v}₁ = ${fmt(x1)} ile başlayıp kiriş formülünü tekrarlarız.`);
    r = secant(F, x0, x1, { tol });
    head = ["n", "xₙ₋₁", "xₙ", "f(xₙ)", "xₙ₊₁"];
    rows = r.rows.map((q) => [q.i, fmt(q.x0, 12), fmt(q.x1, 12), fmt(q.fx1, 4), fmt(q.next, 12)]);
    start = [x0, x1]; field = "x0";
  } else {
    const a = num(input, "a", "Aralığın başlangıcı"), b = num(input, "b", "Aralığın sonu");
    if (a >= b) fail("Aralığın başlangıcı, sonundan küçük olmalıdır.", "b");
    const fa = F(a), fb = F(b);
    steps.push(`İşaret değişimini kontrol ediyoruz: f(${fmt(a)}) = ${fmt(fa)} ve f(${fmt(b)}) = ${fmt(fb)}.`);
    r = bisection(F, a, b, { tol });
    head = ["n", "a", "b", "m", "f(m)"];
    rows = r.rows.map((q) => [q.i, fmt(q.a, 12), fmt(q.b, 12), fmt(q.x, 12), fmt(q.fx, 4)]);
    if (rows.length > 60) rows.splice(30, rows.length - 60, ["…", "…", "…", "…", "…"]);
    start = [a, b]; field = r.reason === "sign" ? "b" : "a";
  }
  if (!r.ok) fail(REASONS[r.reason] || "Kök bulunamadı.", field);
  const root = r.root;
  const fr = F(root);
  steps.push(`Yöntem ${r.iterations} iterasyon sonunda ${v} ≈ ${fmt(root, 12)} değerine yakınsadı.`);
  steps.push({ text: "Kontrol için kökü fonksiyonda yerine koyuyoruz:", tex: `f(${ntex(root, 12)}) = ${ntex(fr, 3)}` });
  const lo = Math.min(root, ...start), hi = Math.max(root, ...start);
  const pad = Math.max(1, (hi - lo) * 0.6);
  return {
    results: [
      { label: "Kök", value: root, sig: 12 },
      { label: "Kökteki fonksiyon değeri", value: fr, sig: 3 },
      { label: "İterasyon sayısı", value: r.iterations }
    ],
    blocks: [
      { type: "table", caption: "İterasyon tablosu", head, rows: rows.map((rw) => rw.map(String)) },
      { type: "plot", title: "Fonksiyon ve kökün konumu", xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }, { name: "Kök", points: [[root, 0]], marker: "o" }] }
    ],
    steps,
    copy: `Kök ${v} ≈ ${fmt(root, 12)} (f = ${fmt(fr, 3)}, ${r.iterations} iterasyon)`
  };
}
