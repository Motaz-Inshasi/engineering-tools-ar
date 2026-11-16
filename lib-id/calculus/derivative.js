import { derivative, simplify } from "../core/symbolic.js";
import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { derivNumeric } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Hitung turunan fungsi apa pun secara simbolik dengan penjelasan setiap aturan turunan yang digunakan: pangkat, perkalian, pembagian, rantai, serta fungsi trigonometri, eksponen, dan logaritma.",
  intro: "Tulis fungsi dan dapatkan turunan pertamanya atau turunan tingkat lebih tinggi, dengan penjelasan aturan yang digunakan pada setiap langkah, serta nilai turunan di suatu titik jika diinginkan.",
  keywords: ["turunan", "diferensiasi", "diferensial", "derivative", "aturan rantai", "aturan perkalian", "aturan pembagian"],
  formulas: [
    { label: "Aturan pangkat dan aturan perkalian", tex: "\\frac{d}{dx}x^n = n x^{n-1}, \\qquad (uv)' = u'v + uv'" },
    { label: "Aturan pembagian dan aturan rantai", tex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}, \\qquad \\frac{d}{dx}f(g(x)) = f'(g(x))\\,g'(x)" }
  ],
  inputs: [
    { id: "f", label: "Fungsi f", type: "expr", placeholder: "x^2 sin(x)", help: "Gunakan ^ untuk pangkat, serta sin cos tan ln log sqrt exp abs, dan konstanta pi dan e. Perkalian implisit diizinkan, seperti 2x." },
    { id: "v", label: "Variabel", type: "text", default: "x" },
    { id: "order", label: "Orde turunan", type: "select", default: "1", options: [["1", "Pertama"], ["2", "Kedua"], ["3", "Ketiga"], ["4", "Keempat"], ["5", "Kelima"]] },
    { id: "at", label: "Nilai variabel tempat turunan dihitung (opsional)", type: "number", placeholder: "misalnya 1.5" }
  ],
  example: { values: { f: "x^2 sin(x)", v: "x", order: "1", at: "" }, expect: ["x^2*cos(x) + 2*x*sin(x)"], note: "Contoh: turunan $x^2\\sin x$ dengan aturan perkalian." },
  invalid: { values: { f: "x^2 +* 3", v: "x", order: "1" } },
  related: ["integral", "limit", "taylor-series", "function-plotter"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const order = Number(choice(input, "order", "Orde turunan", ["1", "2", "3", "4", "5"], "1"));
  const at = num(input, "at", "Titik evaluasi", { optional: true });
  const steps = [];
  steps.push({ text: "Fungsi setelah disederhanakan:", tex: `f(${v}) = ${toTex(f)}` });
  let cur = f;
  const all = [];
  for (let k = 1; k <= order; k++) {
    const r = derivative(cur, v, { maxSteps: k === 1 ? 40 : 12 });
    if (order > 1) steps.push({ text: `Turunan ke-${k}: kita turunkan hasil langkah sebelumnya.` });
    for (const s of r.steps) steps.push({ text: s.rule, tex: s.tex });
    cur = r.result;
    all.push(cur);
  }
  const prime = order === 1 ? "'" : order === 2 ? "''" : `^{(${order})}`;
  const results = [{ label: `Turunan $f${prime}(${v})$`, tex: `f${prime}(${v}) = ${toTex(cur)}`, text: toText(cur) }];
  const blocks = [];
  if (at !== null) {
    const val = f1(cur, v)(at);
    if (!isFinite(val)) {
      blocks.push({ type: "note", tone: "warn", text: `Turunan tidak terdefinisi di ${v} = ${fmt(at)}.` });
    } else {
      results.push({ label: `Nilai di ${v} = ${fmt(at)}`, value: val, text: fmt(val, 10) });
      steps.push({ text: `Kita substitusi ${v} = ${fmt(at)} ke dalam turunan:`, tex: `f${prime}(${ntex(at)}) = ${ntex(val, 10)}` });
      if (order <= 2) {
        const nd = derivNumeric(f1(f, v), at, order);
        if (isFinite(nd)) steps.push(`Untuk memeriksa, pendekatan numerik dengan selisih pusat menghasilkan ${fmt(nd, 8)}.`);
      }
    }
  }
  return { results, steps, blocks, copy: `f${order === 1 ? "'" : order === 2 ? "''" : `(${order})`}(${v}) = ${toText(cur)}${at !== null && isFinite(f1(cur, v)(at)) ? `
Pada ${v} = ${fmt(at)}: ${fmt(f1(cur, v)(at), 10)}` : ""}` };
}
