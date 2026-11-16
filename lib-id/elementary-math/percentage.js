import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["of", "what", "change", "add", "sub", "reverse", "points"];
const N = (x) => fmt(x, 10);
const P = (x) => `${fmt(x, 10)}%`;

export const meta = {
  description: "Hitung persentase dengan tujuh pola: persentase dari suatu bilangan, suatu bilangan dalam persen dari bilangan lain, perubahan persentase antara dua nilai, kenaikan atau penurunan nilai dengan persentase, nilai awal sebelum perubahan, atau selisih dua persentase dalam poin persen.",
  keywords: ["persentase", "percentage", "perubahan persentase", "kenaikan persentase", "penurunan persentase", "poin persen", "percentage points", "nilai awal"],
  formulas: [
    { label: "Persentase dari suatu bilangan", tex: "P = \\frac{X}{100}\\, Y" },
    { label: "perubahan persentase", tex: "\\Delta\\% = \\frac{B - A}{A}\\times 100" },
    { label: "Nilai awal sebelum perubahan", tex: "Y = \\frac{F}{1 \\pm \\frac{X}{100}}" },
    { label: "poin persen", tex: "\\Delta p = p_2 - p_1,\\qquad \\text{perubahan relatif} = \\frac{\\Delta p}{p_1}\\times 100" }
  ],
  inputs: [
    { id: "mode", label: "Jenis perhitungan", type: "select", default: "of", options: [["of", "X% dari Y"], ["what", "Bagian X adalah berapa % dari Y"], ["change", "Perubahan persentase dari A ke B"], ["add", "Menaikkan Y sebesar X%"], ["sub", "Menurunkan Y sebesar X%"], ["reverse", "Nilai awal sebelum perubahan"], ["points", "Selisih dua persentase (poin persen)"]] },
    { id: "pct", label: "Persentase X", unit: "%", type: "number", default: "20", when: { mode: ["of", "add", "sub", "reverse"] } },
    { id: "base", label: "Nilai Y", type: "number", default: "150", when: { mode: ["of", "add", "sub"] } },
    { id: "part", label: "Bagian X", type: "number", default: "30", when: { mode: ["what"] } },
    { id: "whole", label: "Keseluruhan Y", type: "number", default: "150", when: { mode: ["what"] } },
    { id: "dir", label: "Jenis perubahan", type: "select", default: "inc", options: [["inc", "Kenaikan"], ["dec", "Penurunan"]], when: { mode: ["reverse"] } },
    { id: "final", label: "Nilai akhir F", type: "number", default: "230", when: { mode: ["reverse"] } },
    { id: "from", label: "Nilai awal A", type: "number", default: "80", when: { mode: ["change"] } },
    { id: "to", label: "Nilai baru B", type: "number", default: "100", when: { mode: ["change"] } },
    { id: "p1", label: "Persentase pertama p1", unit: "%", type: "number", default: "12", when: { mode: ["points"] } },
    { id: "p2", label: "Persentase kedua p2", unit: "%", type: "number", default: "15", when: { mode: ["points"] } }
  ],
  example: {
    values: { mode: "of", pct: "20", base: "150", part: "30", whole: "150", dir: "inc", final: "230", from: "80", to: "100", p1: "12", p2: "15" },
    expect: ["= 30"],
    note: "Contoh: 20% dari 150 = 30."
  },
  invalid: { values: { mode: "change", from: "0", to: "5" } },
  related: ["fractions", "ratio-proportion", "significant-figures"]
};

function ofMode(input) {
  const x = num(input, "pct", "Persentase X", { nonNegative: true });
  const y = num(input, "base", "Nilai Y");
  const r = (x * y) / 100;
  return {
    results: [
      { label: "Hasil", value: N(r) },
      { label: "Persentase sebagai desimal", value: N(x / 100) }
    ],
    steps: [
      { text: "Kita ubah persentase menjadi desimal dengan membaginya dengan 100:", tex: `\\frac{${ntex(x)}}{100} = ${ntex(x / 100, 8)}` },
      { text: "Kita kalikan desimal dengan nilai:", tex: `${ntex(x / 100, 8)} \\times ${ntex(y)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(x)}% dari ${N(y)} = ${N(r)}`
  };
}

function whatMode(input) {
  const part = num(input, "part", "Bagian X");
  const whole = num(input, "whole", "Keseluruhan Y", { nonZero: true });
  const p = (part * 100) / whole;
  return {
    results: [{ label: "Persentase", value: P(p) }],
    steps: [
      { text: "Kita bagi bagian dengan keseluruhan lalu kalikan dengan 100:", tex: `\\frac{${ntex(part)}}{${ntex(whole)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `${N(part)} adalah ${N(p)}% dari ${N(whole)}`
  };
}

function changeMode(input) {
  const a = num(input, "from", "Nilai awal A", { nonZero: true });
  const b = num(input, "to", "Nilai baru B");
  const diff = b - a;
  const p = (diff * 100) / a;
  const dir = diff > 0 ? "Kenaikan" : diff < 0 ? "Penurunan" : "Tidak ada perubahan";
  return {
    results: [
      { label: "perubahan persentase", value: `${p > 0 ? "+" : ""}${P(p)}` },
      { label: "Besar perubahan", value: N(diff) },
      { label: "Jenis perubahan", value: dir }
    ],
    steps: [
      { text: "Kita hitung selisih kedua nilai:", tex: `\\Delta = B - A = ${ntex(b)} - ${ntex(a)} = ${ntex(diff)}` },
      { text: "Kita bagi selisih dengan nilai awal lalu kalikan dengan 100:", tex: `\\frac{${ntex(diff)}}{${ntex(a)}} \\times 100 = ${ntex(p, 8)}\\%` }
    ],
    copy: `Dari ${N(a)} ke ${N(b)}: ${dir} ${N(Math.abs(p))}%`
  };
}

function shiftMode(input, sign) {
  const x = num(input, "pct", "Persentase X", { nonNegative: true });
  if (sign < 0 && x > 100) fail("Persentase penurunan tidak boleh melebihi 100%.", "pct");
  const y = num(input, "base", "Nilai Y");
  const inc = (y * x) / 100;
  const r = y + sign * inc;
  const word = sign > 0 ? "Kenaikan" : "Penurunan";
  const op = sign > 0 ? "+" : "-";
  return {
    results: [
      { label: sign > 0 ? "Nilai setelah kenaikan" : "Nilai setelah penurunan", value: N(r) },
      { label: "Besar perubahan", value: N(inc) }
    ],
    steps: [
      { text: "Kita hitung besar perubahan dari persentase:", tex: `\\frac{${ntex(x)}}{100} \\times ${ntex(y)} = ${ntex(inc, 8)}` },
      { text: `Kita terapkan ${word} pada nilai awal:`, tex: `${ntex(y)} ${op} ${ntex(inc, 8)} = ${ntex(r, 8)}` }
    ],
    copy: `${N(y)} setelah ${word} ${N(x)}% = ${N(r)}`
  };
}

function reverseMode(input) {
  const f = num(input, "final", "Nilai akhir F");
  const x = num(input, "pct", "Persentase X", { nonNegative: true });
  const dir = choice(input, "dir", "Jenis perubahan", ["inc", "dec"], "inc");
  if (dir === "dec" && x >= 100) fail("Persentase penurunan harus kurang dari 100%.", "pct");
  const inc = dir === "inc";
  const f0 = inc ? 100 + x : 100 - x;
  const orig = (f * 100) / f0;
  const word = inc ? "Kenaikan" : "Penurunan";
  return {
    results: [
      { label: "nilai awal", value: N(orig) },
      { label: "Koefisien perubahan", value: `× ${N(f0 / 100)}` }
    ],
    steps: [
      { text: "Nilai akhir = nilai awal × koefisien perubahan, dan koefisien perubahan = 1 ± X/100:", tex: `1 ${inc ? "+" : "-"} \\frac{${ntex(x)}}{100} = \\frac{${ntex(f0)}}{100}` },
      { text: "Kita bagi nilai akhir dengan koefisien perubahan:", tex: `Y = \\frac{${ntex(f)}}{${ntex(f0 / 100, 8)}} = \\frac{${ntex(f)} \\times 100}{${ntex(f0)}} = ${ntex(orig, 8)}` }
    ],
    copy: `Nilai awal = ${N(orig)} (akhir ${N(f)} setelah ${word} ${N(x)}%)`
  };
}

function pointsMode(input) {
  const p1 = num(input, "p1", "Persentase pertama p1", { nonZero: true });
  const p2 = num(input, "p2", "Persentase kedua p2");
  const diff = p2 - p1;
  const rel = (diff * 100) / p1;
  const word = diff > 0 ? "Kenaikan" : diff < 0 ? "Penurunan" : "Tidak ada perubahan";
  return {
    results: [
      { label: "Selisih dalam poin persen", value: `${N(diff)} poin persen` },
      { label: "Perubahan relatif", value: `${rel > 0 ? "+" : ""}${P(rel)}` },
      { label: "Jenis perubahan", value: word }
    ],
    steps: [
      { text: "Selisih dalam poin persen adalah pengurangan langsung kedua persentase:", tex: `\\Delta p = p_2 - p_1 = ${ntex(p2)} - ${ntex(p1)} = ${ntex(diff)}\\ \\text{pp}` },
      { text: "Perubahan relatif membandingkan selisih dengan persentase pertama:", tex: `\\frac{\\Delta p}{p_1} \\times 100 = \\frac{${ntex(diff)}}{${ntex(p1)}} \\times 100 = ${ntex(rel, 8)}\\%` }
    ],
    copy: `Dari ${N(p1)}% ke ${N(p2)}%: selisih ${N(diff)} poin persen, dan perubahan relatif ${N(rel)}%`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", MODES, "of");
  if (mode === "of") return ofMode(input);
  if (mode === "what") return whatMode(input);
  if (mode === "change") return changeMode(input);
  if (mode === "add") return shiftMode(input, 1);
  if (mode === "sub") return shiftMode(input, -1);
  if (mode === "reverse") return reverseMode(input);
  return pointsMode(input);
}
