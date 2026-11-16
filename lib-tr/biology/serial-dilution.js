import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const HEMO_VOLUME_FACTOR = 1e4;

function sci(x, sig = 4) {
  if (x === 0) return "0";
  const [m, e] = x.toExponential(sig - 1).split("e");
  return `${m.includes(".") ? m.replace(/\.?0+$/, "") : m} × 10^${Number(e)}`;
}

function dilText(x) {
  return Number.isInteger(x) && x < 1e15 ? String(x) : fmt(x, 4);
}

export const meta = {
  description: "Seri seyreltme konsantrasyonlarını ve her adımdaki seyreltici hacmini, sayılan kolonilerden CFU/mL koloni oluşturan birim sayısını veya sayım lamı (hemositometre) ile hücre/mL sayısını hesaplayın.",
  keywords: ["seri seyreltme", "serial dilution", "CFU", "koloni oluşturan birim", "hücre sayımı", "hemocytometer", "tripan mavisi", "konsantrasyon"],
  formulas: [
    { label: "k. adımdaki seyreltme", tex: "D_k = f^{k},\\qquad C_k = \\frac{C_0}{f^{k}}" },
    { label: "koloni oluşturan birim", tex: "\\text{CFU/mL} = \\frac{\\text{koloni sayısı}}{V \\times d}" },
    { label: "Sayım lamı", tex: "\\text{hücre/mL} = \\frac{\\text{hücre sayısı}}{\\text{kare sayısı}} \\times D \\times 10^4" }
  ],
  inputs: [
    {
      id: "mode", label: "Hesaplama yöntemi", type: "select", default: "series",
      options: [["series", "seri seyreltme"], ["cfu", "Koloni sayımı (CFU/mL)"], ["hemocytometer", "Sayım lamıyla hücre sayımı"]]
    },
    { id: "c0", label: "Başlangıç konsantrasyonu C0", type: "number", default: "1000", when: { mode: ["series"] }, help: "Hangi birimde isterseniz, örn. CFU/mL veya hücre/mL." },
    { id: "factor", label: "Her adımdaki seyreltme faktörü f", type: "number", default: "10", when: { mode: ["series"] }, help: "Örn. 10 veya 2." },
    { id: "nsteps", label: "Seyreltme adım sayısı", type: "number", default: "6", when: { mode: ["series"] }, help: "1 ile 15 arasında tam sayı." },
    { id: "vt", label: "Bir tüpten diğerine aktarılan hacim", unit: "mL", type: "number", default: "1", when: { mode: ["series"] } },
    { id: "colonies", label: "Sayılan koloni sayısı", type: "number", default: "150", when: { mode: ["cfu"] } },
    { id: "vplate", label: "Plaklanan çözelti hacmi", unit: "mL", type: "number", default: "0.1", when: { mode: ["cfu"] } },
    { id: "dcfu", label: "Sayılan plağın seyreltme faktörü", type: "number", default: "1e-6", when: { mode: ["cfu"] }, help: "1e-6 veya 1000000 girin; 1'den büyük değer seyreltme tersi olarak alınır." },
    { id: "cells", label: "Lamda sayılan hücre sayısı", type: "number", default: "200", when: { mode: ["hemocytometer"] } },
    { id: "squares", label: "Sayılan büyük kare sayısı", type: "number", default: "4", when: { mode: ["hemocytometer"] } },
    { id: "dhemo", label: "Seyreltme (dilüsyon) faktörü", type: "number", default: "2", when: { mode: ["hemocytometer"] }, help: "Hücreleri tripan mavisi ile 1:1 karıştırırsanız örn. 2." }
  ],
  example: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "150", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" }, expect: ["1.5 × 10^9 CFU/mL"], note: "Örnek: 10^-6 seyreltmenin 0.1 mL'sinden 150 koloni." },
  invalid: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "-5", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" } },
  related: ["solutions", "population-growth", "lab-units"]
};

function seriesMode(input) {
  const c0 = num(input, "c0", "Başlangıç konsantrasyonu C0", { positive: true });
  const f = num(input, "factor", "Seyreltme faktörü", { positive: true });
  if (f <= 1) fail("Seyreltme faktörü 1'den büyük olmalıdır.", "factor");
  const n = num(input, "nsteps", "Adım sayısı", { integer: true, min: 1, max: 15 });
  const vt = num(input, "vt", "Aktarım hacmi", { positive: true });
  const perTube = vt * (f - 1);
  const cn = c0 / Math.pow(f, n);
  const rows = [["Orijinal", "1:1", fmt(c0, 6), "—"]];
  for (let k = 1; k <= n; k++) rows.push([String(k), `1:${dilText(Math.pow(f, k))}`, fmt(c0 / Math.pow(f, k), 4), fmt(perTube, 4)]);
  return {
    results: [
      { label: "Son konsantrasyon", value: fmt(cn, 4) },
      { label: "Toplam seyreltme", value: `1:${dilText(Math.pow(f, n))}` },
      { label: "Eklenen toplam seyreltici (mL)", value: fmt(n * perTube, 4) }
    ],
    steps: [
      { text: "Son tüpteki seyreltme:", tex: `D_n = f^n = ${ntex(f)}^{${n}} = ${ntex(Math.pow(f, n))}` },
      { text: "Son konsantrasyon:", tex: `C_n = \\frac{C_0}{f^n} = \\frac{${ntex(c0)}}{${ntex(Math.pow(f, n))}} = ${ntex(cn, 6)}` },
      { text: "Her tüpe eklenen seyreltici hacmi:", tex: `V_d = V_t (f-1) = ${ntex(vt)} \\times ${ntex(f - 1)} = ${ntex(perTube)}\\ \\text{mL}` }
    ],
    copy: `${n} adımdan sonra konsantrasyon = ${fmt(cn, 4)} (1:${dilText(Math.pow(f, n))} seyreltme)`,
    blocks: [{ type: "table", caption: "Tüp tablosu", head: ["Tüp", "Seyreltme", "Konsantrasyon", "Eklenen seyreltici (mL)"], rows, ltr: true }]
  };
}

function cfuMode(input) {
  const colonies = num(input, "colonies", "Koloni sayısı", { integer: true, nonNegative: true });
  const V = num(input, "vplate", "Plaklanan çözelti hacmi", { positive: true });
  const d0 = num(input, "dcfu", "Seyreltme faktörü", { positive: true });
  const d = d0 > 1 ? 1 / d0 : d0;
  const cfu = colonies / (V * d);
  const inRange = colonies >= 30 && colonies <= 300;
  const blocks = [];
  if (!inRange) blocks.push({ type: "note", tone: "warn", text: "Koloni sayısı kabul edilen 30 ile 300 aralığının dışında; bu nedenle sonuç tahmini ve daha az hassastır." });
  return {
    results: [
      { label: "Koloni oluşturan birim sayısı", value: `${sci(cfu)} CFU/mL` },
      { label: "Kullanılan seyreltme faktörü", value: dilText(d) },
      { label: "Sayım aralığı", value: inRange ? "30 ile 300 aralığında" : "30 ile 300 aralığının dışında" }
    ],
    steps: [
      d0 > 1 ? { text: "Girilen değer 1'den büyük olduğundan seyreltme tersi olarak alınır:", tex: `d = \\frac{1}{${ntex(d0)}} = ${ntex(d)}` } : { text: "Kullanılan seyreltme faktörü:", tex: `d = ${ntex(d)}` },
      { text: "Koloni oluşturan birim sayısı, mL başına:", tex: `\\frac{${colonies}}{${ntex(V)} \\times ${ntex(d)}} = ${ntex(cfu, 6)}\\ \\text{CFU/mL}` }
    ],
    copy: `${sci(cfu)} CFU/mL`,
    blocks
  };
}

function hemoMode(input) {
  const cells = num(input, "cells", "Sayılan hücre sayısı", { integer: true, nonNegative: true });
  const squares = num(input, "squares", "Kare sayısı", { integer: true, positive: true });
  const D = num(input, "dhemo", "Seyreltme (dilüsyon) faktörü", { positive: true });
  if (D < 1) fail("Seyreltme (dilüsyon) faktörü 1 veya daha büyük olmalıdır.", "dhemo");
  const avg = cells / squares;
  const cpm = avg * D * HEMO_VOLUME_FACTOR;
  return {
    results: [
      { label: "mL başına hücre sayısı", value: `${sci(cpm)} hücre/mL` },
      { label: "Tek kare başına ortalama hücre", value: fmt(avg, 4) }
    ],
    steps: [
      { text: "Tek büyük karede ortalama hücre:", tex: `\\frac{${cells}}{${squares}} = ${ntex(avg, 6)}` },
      { text: "Seyreltme ve kare hacmi (10^4 mL) ile mL başına hücreye çeviriyoruz:", tex: `${ntex(avg, 6)} \\times ${ntex(D)} \\times 10^4 = ${ntex(cpm, 6)}\\ \\text{cells/mL}` }
    ],
    copy: `${sci(cpm)} hücre/mL`,
    blocks: [{ type: "note", text: "Lamdaki büyük karenin hacmi 1 mm × 1 mm × 0.1 mm = 0.1 µL = 10^-4 mL'dir; bu nedenle ortalama, mL başına hücre elde etmek için 10^4 ile çarpılır." }]
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Hesaplama yöntemi", ["series", "cfu", "hemocytometer"], "series");
  if (mode === "cfu") return cfuMode(input);
  if (mode === "hemocytometer") return hemoMode(input);
  return seriesMode(input);
}
