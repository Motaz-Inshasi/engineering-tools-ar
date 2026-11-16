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
  description: "Hitung konsentrasi pengenceran bertingkat dan volume pengencer untuk setiap langkah, atau jumlah unit pembentuk koloni CFU/mL dari koloni yang dihitung, atau jumlah sel/mL dengan kamar hitung (hemositometer).",
  keywords: ["Pengenceran bertingkat", "serial dilution", "CFU", "Unit pembentuk koloni", "Penghitungan sel", "hemocytometer", "Biru tripan", "Konsentrasi"],
  formulas: [
    { label: "Pengenceran pada langkah k", tex: "D_k = f^{k},\\qquad C_k = \\frac{C_0}{f^{k}}" },
    { label: "Unit pembentuk koloni", tex: "\\text{CFU/mL} = \\frac{\\text{koloni}}{V \\times d}" },
    { label: "Kamar hitung", tex: "\\text{sel/mL} = \\frac{\\text{jumlah sel}}{\\text{jumlah kotak}} \\times D \\times 10^4" }
  ],
  inputs: [
    {
      id: "mode", label: "Metode perhitungan", type: "select", default: "series",
      options: [["series", "Pengenceran bertingkat"], ["cfu", "Hitung koloni (CFU/mL)"], ["hemocytometer", "Hitung sel dengan kamar hitung"]]
    },
    { id: "c0", label: "Konsentrasi awal C0", type: "number", default: "1000", when: { mode: ["series"] }, help: "Dalam satuan apa pun yang Anda inginkan, misalnya CFU/mL atau sel/mL." },
    { id: "factor", label: "Faktor pengenceran pada setiap langkah f", type: "number", default: "10", when: { mode: ["series"] }, help: "Misalnya 10 atau 2." },
    { id: "nsteps", label: "Jumlah langkah pengenceran", type: "number", default: "6", when: { mode: ["series"] }, help: "Bilangan bulat dari 1 hingga 15." },
    { id: "vt", label: "Volume pemindahan dari satu tabung ke tabung berikutnya", unit: "mL", type: "number", default: "1", when: { mode: ["series"] } },
    { id: "colonies", label: "Jumlah koloni yang dihitung", type: "number", default: "150", when: { mode: ["cfu"] } },
    { id: "vplate", label: "Volume larutan yang dituang ke cawan", unit: "mL", type: "number", default: "0.1", when: { mode: ["cfu"] } },
    { id: "dcfu", label: "Faktor pengenceran cawan yang dihitung", type: "number", default: "1e-6", when: { mode: ["cfu"] }, help: "Masukkan 1e-6 atau 1000000; nilai yang lebih besar dari 1 diperlakukan sebagai kebalikan pengenceran." },
    { id: "cells", label: "Jumlah sel yang dihitung pada kamar", type: "number", default: "200", when: { mode: ["hemocytometer"] } },
    { id: "squares", label: "Jumlah kotak besar yang dihitung", type: "number", default: "4", when: { mode: ["hemocytometer"] } },
    { id: "dhemo", label: "Faktor pengenceran", type: "number", default: "2", when: { mode: ["hemocytometer"] }, help: "Misalnya 2 jika sel dicampur dengan biru tripan dengan perbandingan 1:1." }
  ],
  example: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "150", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" }, expect: ["1.5 × 10^9 CFU/mL"], note: "Contoh: 150 koloni dari 0.1 mL pengenceran 10^-6." },
  invalid: { values: { mode: "cfu", c0: "1000", factor: "10", nsteps: "6", vt: "1", colonies: "-5", vplate: "0.1", dcfu: "1e-6", cells: "200", squares: "4", dhemo: "2" } },
  related: ["solutions", "population-growth", "lab-units"]
};

function seriesMode(input) {
  const c0 = num(input, "c0", "Konsentrasi awal C0", { positive: true });
  const f = num(input, "factor", "Faktor pengenceran", { positive: true });
  if (f <= 1) fail("Faktor pengenceran harus lebih besar dari 1.", "factor");
  const n = num(input, "nsteps", "Jumlah langkah", { integer: true, min: 1, max: 15 });
  const vt = num(input, "vt", "Volume pemindahan", { positive: true });
  const perTube = vt * (f - 1);
  const cn = c0 / Math.pow(f, n);
  const rows = [["Asli", "1:1", fmt(c0, 6), "—"]];
  for (let k = 1; k <= n; k++) rows.push([String(k), `1:${dilText(Math.pow(f, k))}`, fmt(c0 / Math.pow(f, k), 4), fmt(perTube, 4)]);
  return {
    results: [
      { label: "Konsentrasi akhir", value: fmt(cn, 4) },
      { label: "Pengenceran total", value: `1:${dilText(Math.pow(f, n))}` },
      { label: "Total pengencer yang ditambahkan (mL)", value: fmt(n * perTube, 4) }
    ],
    steps: [
      { text: "Pengenceran pada tabung terakhir:", tex: `D_n = f^n = ${ntex(f)}^{${n}} = ${ntex(Math.pow(f, n))}` },
      { text: "Konsentrasi akhir:", tex: `C_n = \\frac{C_0}{f^n} = \\frac{${ntex(c0)}}{${ntex(Math.pow(f, n))}} = ${ntex(cn, 6)}` },
      { text: "Volume pengencer yang ditambahkan ke setiap tabung:", tex: `V_d = V_t (f-1) = ${ntex(vt)} \\times ${ntex(f - 1)} = ${ntex(perTube)}\\ \\text{mL}` }
    ],
    copy: `Konsentrasi setelah ${n} langkah = ${fmt(cn, 4)} (pengenceran 1:${dilText(Math.pow(f, n))})`,
    blocks: [{ type: "table", caption: "Tabel tabung", head: ["Tabung", "Pengenceran", "Konsentrasi", "Pengencer yang ditambahkan (mL)"], rows, ltr: true }]
  };
}

function cfuMode(input) {
  const colonies = num(input, "colonies", "Jumlah koloni", { integer: true, nonNegative: true });
  const V = num(input, "vplate", "Volume larutan yang dituang ke cawan", { positive: true });
  const d0 = num(input, "dcfu", "Faktor pengenceran", { positive: true });
  const d = d0 > 1 ? 1 / d0 : d0;
  const cfu = colonies / (V * d);
  const inRange = colonies >= 30 && colonies <= 300;
  const blocks = [];
  if (!inRange) blocks.push({ type: "note", tone: "warn", text: "Jumlah koloni di luar kisaran yang dapat diterima, 30 hingga 300, sehingga hasilnya bersifat perkiraan dan kurang akurat." });
  return {
    results: [
      { label: "Jumlah unit pembentuk koloni", value: `${sci(cfu)} CFU/mL` },
      { label: "Faktor pengenceran yang digunakan", value: dilText(d) },
      { label: "Rentang penghitungan", value: inRange ? "Dalam rentang 30 hingga 300" : "Di luar rentang 30 hingga 300" }
    ],
    steps: [
      d0 > 1 ? { text: "Nilai masukan lebih besar dari 1 sehingga diperlakukan sebagai kebalikan pengenceran:", tex: `d = \\frac{1}{${ntex(d0)}} = ${ntex(d)}` } : { text: "Faktor pengenceran yang digunakan:", tex: `d = ${ntex(d)}` },
      { text: "Unit pembentuk koloni per mL:", tex: `\\frac{${colonies}}{${ntex(V)} \\times ${ntex(d)}} = ${ntex(cfu, 6)}\\ \\text{CFU/mL}` }
    ],
    copy: `${sci(cfu)} CFU/mL`,
    blocks
  };
}

function hemoMode(input) {
  const cells = num(input, "cells", "Jumlah sel yang dihitung", { integer: true, nonNegative: true });
  const squares = num(input, "squares", "Jumlah kotak", { integer: true, positive: true });
  const D = num(input, "dhemo", "Faktor pengenceran", { positive: true });
  if (D < 1) fail("Faktor pengenceran harus 1 atau lebih.", "dhemo");
  const avg = cells / squares;
  const cpm = avg * D * HEMO_VOLUME_FACTOR;
  return {
    results: [
      { label: "Jumlah sel per mL", value: `${sci(cpm)} sel/mL` },
      { label: "Rata-rata sel per kotak", value: fmt(avg, 4) }
    ],
    steps: [
      { text: "Rata-rata sel per kotak besar:", tex: `\\frac{${cells}}{${squares}} = ${ntex(avg, 6)}` },
      { text: "Konversi ke sel per mL dengan pengenceran dan volume kotak (10^4 mL):", tex: `${ntex(avg, 6)} \\times ${ntex(D)} \\times 10^4 = ${ntex(cpm, 6)}\\ \\text{cells/mL}` }
    ],
    copy: `${sci(cpm)} sel/mL`,
    blocks: [{ type: "note", text: "Volume satu kotak besar pada kamar 1 mm × 1 mm × 0.1 mm = 0.1 µL = 10^-4 mL, sehingga rata-rata dikalikan 10^4 untuk memperoleh sel per mL." }]
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Metode perhitungan", ["series", "cfu", "hemocytometer"], "series");
  if (mode === "cfu") return cfuMode(input);
  if (mode === "hemocytometer") return hemoMode(input);
  return seriesMode(input);
}
