import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const BIN_OPS = ["and", "or", "xor"];
const SHIFT_OPS = ["shl", "shr", "sar"];
const NAMES = { and: "AND", or: "OR", xor: "XOR", not: "NOT", shl: "SHL", shr: "SHR", sar: "SAR" };
const TEX_BIN = { and: "\\mathrm{AND}", or: "\\mathrm{OR}", xor: "\\mathrm{XOR}" };
const TEXTS = {
  and: "AND menghasilkan 1 hanya jika bit di A dan bit di B keduanya 1; pada semua kasus lain menghasilkan 0.",
  or: "OR menghasilkan 1 jika salah satu dari dua bit bernilai 1 atau keduanya; menghasilkan 0 hanya jika kedua bit bernilai 0.",
  xor: "XOR menghasilkan 1 jika kedua bit berbeda, dan menghasilkan 0 jika keduanya sama.",
  not: "NOT membalik setiap bit: 0 menjadi 1 dan 1 menjadi 0.",
  shl: "SHL menggeser bit ke kiri; bit yang keluar dari sisi atas hilang, dan sisi kanan diisi dengan nol.",
  shr: "SHR (logis) menggeser bit ke kanan; sisi kiri selalu diisi dengan nol.",
  sar: "SAR (aritmetika) menggeser bit ke kanan sambil mempertahankan bit tanda, sehingga sisi kiri diisi dengan salinan bit tersebut."
};

export const meta = {
  description: "Menghitung operasi AND, OR, XOR, NOT, serta pergeseran SHL, SHR, dan SAR pada bilangan 8, 16, atau 32 bit, dengan hasil dalam biner, heksadesimal, dan desimal, bertanda maupun tanpa tanda, serta langkah yang menjelaskan aturan setiap operasi.",
  keywords: ["Operasi bit", "bitwise", "AND", "OR", "XOR", "NOT", "Pergeseran", "shift", "Komplemen 2", "two's complement", "SAR", "SHR"],
  formulas: [
    { label: "Operasi logika", tex: "A \\land B,\\quad A \\lor B,\\quad A \\oplus B,\\quad \\lnot A" },
    { label: "Pergeseran ke kiri sebanyak s", tex: "A \\ll s = (A \\cdot 2^{s}) \\bmod 2^{w}" }
  ],
  inputs: [
    { id: "a", label: "Nilai A", type: "text", default: "12", help: "Desimal seperti -5, heksadesimal dengan awalan 0x seperti 0x0A, atau biner dengan awalan 0b seperti 0b1010." },
    { id: "op", label: "Operasi", type: "select", default: "and", options: [["and", "AND (dan)"], ["or", "OR (atau)"], ["xor", "XOR (atau eksklusif)"], ["not", "NOT (negasi)"], ["shl", "SHL (geser kiri)"], ["shr", "SHR (geser kanan, logis)"], ["sar", "SAR (geser kanan, aritmetika)"]] },
    { id: "b", label: "Nilai B", type: "text", default: "10", when: { op: ["and", "or", "xor"] } },
    { id: "shift", label: "Jumlah posisi geser", type: "number", default: "3", help: "Antara 0 dan lebar bit dikurangi 1.", when: { op: ["shl", "shr", "sar"] } },
    { id: "width", label: "Lebar bit", type: "select", default: "8", options: [["8", "8 bit"], ["16", "16 bit"], ["32", "32 bit"]] }
  ],
  example: { values: { a: "12", op: "and", b: "10", shift: "3", width: "8" }, expect: ["0000 1000 (0x08 = 8)"], note: "Contoh: 12 AND 10 dengan lebar 8 bit." },
  invalid: { values: { a: "300", op: "and", b: "1", shift: "0", width: "8" } },
  related: ["number-bases", "binary-twos-complement", "logic-gates", "truth-table", "chmod-calculator", "unix-timestamp"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

function parseOperand(raw, label, field, w) {
  const s = normalizeDigits(String(raw)).replace(/[\s_]/g, "");
  const m = s.match(/^([+-]?)(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)$/);
  if (!m) fail(`${label} bukan bilangan bulat yang valid. Tulis dalam desimal (seperti -5), dengan awalan 0x (seperti 0x0A), atau dengan awalan 0b (seperti 0b1010).`, field);
  let v = BigInt(m[2].toLowerCase());
  if (m[1] === "-") v = -v;
  const full = 1n << BigInt(w);
  const half = full >> 1n;
  if (v >= 0n && v < full) return { v, raw: v };
  if (v < 0n && v >= -half) return { v, raw: v + full };
  fail(`${label} berada di luar rentang ${w} bit; rentang yang diizinkan adalah dari ${-half} hingga ${full - 1n}.`, field);
}

function bitsOf(raw, w) {
  return raw.toString(2).padStart(w, "0");
}

function grouped(raw, w) {
  return bitsOf(raw, w).match(/.{4}/g).join(" ");
}

function hexOf(raw, w) {
  return "0x" + raw.toString(16).toUpperCase().padStart(w / 4, "0");
}

function signedOf(raw, w) {
  const full = 1n << BigInt(w);
  return raw >= full >> 1n ? raw - full : raw;
}

function compute(op, ra, rb, sh, w) {
  const mask = (1n << BigInt(w)) - 1n;
  switch (op) {
    case "and": return ra & rb;
    case "or": return ra | rb;
    case "xor": return ra ^ rb;
    case "not": return ~ra & mask;
    case "shl": return (ra << BigInt(sh)) & mask;
    case "shr": return ra >> BigInt(sh);
    default: return BigInt.asUintN(w, signedOf(ra, w) >> BigInt(sh));
  }
}

function expr(op, sh) {
  if (op === "not") return "\\mathrm{NOT}\\ A";
  if (op === "shl") return `A \\ll ${sh}`;
  if (op === "shr") return `A \\gg ${sh}`;
  if (op === "sar") return `A \\gg_{\\mathrm{arith}} ${sh}`;
  return `A\\ ${TEX_BIN[op]}\\ B`;
}

function bitAlignment(named, w) {
  const cell = (c) => String(c).padStart(2);
  const head = Array.from({ length: w }, (_, i) => cell(w - 1 - i)).join(" ");
  const lines = [`${"bit".padEnd(5)}${head}`];
  for (const [name, raw] of named) {
    lines.push(`${name.padEnd(5)}${bitsOf(raw, w).split("").map(cell).join(" ")}`);
  }
  return lines.join("\n");
}

export function solve(input) {
  const op = choice(input, "op", "Operasi", ["and", "or", "xor", "not", "shl", "shr", "sar"], "and");
  const w = Number(choice(input, "width", "Lebar bit", ["8", "16", "32"], "8"));
  if (isBlank(input.a)) fail("Masukkan nilai A.", "a");
  const va = parseOperand(input.a, "Nilai A", "a", w);
  const isBin = BIN_OPS.includes(op);
  const isShift = SHIFT_OPS.includes(op);
  let vb = null;
  if (isBin) {
    if (isBlank(input.b)) fail("Masukkan nilai B.", "b");
    vb = parseOperand(input.b, "Nilai B", "b", w);
  }
  let sh = null;
  if (isShift) sh = num(input, "shift", "Jumlah posisi geser", { integer: true, min: 0, max: w - 1 });
  const ra = va.raw;
  const rb = vb ? vb.raw : null;
  const rr = compute(op, ra, rb, sh, w);
  const bin = grouped(rr, w);
  const hx = hexOf(rr, w);
  const un = rr.toString();
  const sg = signedOf(rr, w).toString();
  const rowOf = (name, raw) => [name, grouped(raw, w), hexOf(raw, w), raw.toString(), signedOf(raw, w).toString()];
  const rows = [rowOf("A", ra)];
  if (vb) rows.push(rowOf("B", rb));
  rows.push(rowOf("Hasil", rr));
  const named = [["A", ra]];
  if (vb) named.push(["B", rb]);
  named.push([NAMES[op], rr]);
  const steps = [TEXTS[op]];
  steps.push({ text: "Ubah A menjadi pola bit dengan lebar yang dipilih:", tex: `A = ${va.v} \\Rightarrow \\text{${grouped(ra, w)}}_{2}` });
  if (vb) steps.push({ text: "Ubah B menjadi pola bit dengan lebar yang dipilih:", tex: `B = ${vb.v} \\Rightarrow \\text{${grouped(rb, w)}}_{2}` });
  if (isShift) steps.push({ text: "Jumlah posisi geser:", tex: `s = ${sh}` });
  steps.push({ text: "Terapkan operasi bit per bit:", tex: `${expr(op, sh)} = \\text{${bin}}_{2}` });
  steps.push({ text: "Nilai desimal tanpa tanda:", tex: `\\text{${bin}}_{2} = \\text{${hx}} = ${un}` });
  steps.push(
    (rr >> BigInt(w - 1)) === 1n
      ? `Bit tertinggi pada hasil = 1, sehingga ditafsirkan dengan komplemen 2 sebagai nilai ${sg}.`
      : `Bit tertinggi pada hasil = 0, sehingga nilainya dengan komplemen 2 adalah ${sg} itu sendiri.`
  );
  const blocks = [
    { type: "table", caption: "Tabel bit", head: ["Variabel", "Biner", "Heksadesimal", "Tanpa tanda", "Bertanda (komplemen 2)"], rows, ltr: true },
    { type: "html", html: `<pre class="code" dir="ltr"><code>${escapeHtml(bitAlignment(named, w))}</code></pre>` }
  ];
  if (op === "shl" && (ra << BigInt(sh)) > (1n << BigInt(w)) - 1n) {
    blocks.push({ type: "note", text: "Sebagian bit hilang dari bagian atas bilangan karena pergeseran melampaui batas lebar yang dipilih.", tone: "warn" });
  }
  const lhs = isBin ? `${va.v} ${NAMES[op]} ${vb.v}` : op === "not" ? `NOT ${va.v}` : `${va.v} ${NAMES[op]} ${sh}`;
  return {
    results: [
      { label: "Hasil dalam biner", value: bin },
      { label: "Hasil dalam heksadesimal", value: hx },
      { label: "Hasil tanpa tanda", value: un },
      { label: "Hasil bertanda (komplemen 2)", value: sg }
    ],
    steps,
    blocks,
    copy: `${lhs} = ${bin} (${hx} = ${un})`
  };
}
