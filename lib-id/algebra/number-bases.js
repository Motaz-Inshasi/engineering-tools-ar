import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { normalizeDigits } from "../core/format.js";

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const meta = {
  description: "Konversi bilangan antara dua basis apa pun dari 2 hingga 36 (biner, oktal, desimal, heksadesimal…), termasuk pecahan, dengan langkah pembagian berulang, perkalian berulang, dan ekspansi posisional.",
  keywords: ["Konversi sistem bilangan", "biner", "desimal", "heksadesimal", "oktal", "binary", "hex", "decimal", "octal", "base conversion", "basis"],
  formulas: [
    { label: "Dari basis apa pun ke desimal (ekspansi posisional)", tex: "(d_k \\dots d_1 d_0 . d_{-1}\\dots)_b = \\sum_i d_i\\, b^{i}" },
    { label: "Dari desimal: pembagian berulang untuk bagian bulat dan perkalian berulang untuk pecahan", tex: "N = q_0 b + r_0,\\; q_0 = q_1 b + r_1,\\dots \\qquad f \\cdot b = d_{-1} + f_1,\\dots" }
  ],
  inputs: [
    { id: "x", label: "Bilangan", type: "text", default: "1011.101", help: "Gunakan huruf A–Z untuk angka di atas 9. Tanda negatif dan titik desimal diperbolehkan." },
    { id: "from", label: "Dari basis", type: "number", default: "2" },
    { id: "to", label: "Ke basis", type: "number", default: "10" }
  ],
  example: { values: { x: "2AF", from: "16", to: "2" }, expect: ["1010101111"], note: "Contoh: konversi $(2AF)_{16}$ ke biner." },
  invalid: { values: { x: "129", from: "2", to: "10" } },
  related: ["binary-twos-complement", "truth-table", "logic-gates"]
};

export function parseInBase(s, base) {
  let t = normalizeDigits(s).toUpperCase().replace(/[\s_]/g, "");
  let neg = false;
  if (t.startsWith("-")) { neg = true; t = t.slice(1); }
  else if (t.startsWith("+")) t = t.slice(1);
  if (!/^[0-9A-Z]*\.?[0-9A-Z]*$/.test(t) || t === "" || t === ".") return null;
  const [ip, fp = ""] = t.split(".");
  let iv = 0n;
  const B = BigInt(base);
  for (const ch of ip) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { bad: ch };
    iv = iv * B + BigInt(d);
  }
  let fv = 0, w = 1 / base;
  for (const ch of fp) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { bad: ch };
    fv += d * w;
    w /= base;
  }
  return { neg, int: iv, frac: fv, ip, fp };
}

export function toBase(intPart, frac, base, maxFrac = 20) {
  const B = BigInt(base);
  let s = intPart === 0n ? "0" : "";
  let q = intPart;
  const divs = [];
  while (q > 0n) {
    const r = q % B;
    divs.push([q, q / B, Number(r)]);
    s = DIGITS[Number(r)] + s;
    q = q / B;
  }
  let fs = "";
  const muls = [];
  let f = frac;
  for (let i = 0; i < maxFrac && f > 0; i++) {
    const p = f * base;
    const d = Math.floor(p + 1e-12);
    muls.push([f, p, d]);
    fs += DIGITS[Math.min(d, base - 1)];
    f = p - d;
    if (f < 1e-12) f = 0;
  }
  return { str: fs ? `${s}.${fs}` : s, divs, muls, exact: f === 0 };
}

export function convert(x, from, to) {
  const p = parseInBase(x, from);
  if (!p || p.bad) return null;
  const r = toBase(p.int, p.frac, to);
  return (p.neg && (p.int !== 0n || p.frac !== 0) ? "-" : "") + r.str;
}

export function solve(input) {
  const s = str(input, "x", "Bilangan");
  const from = num(input, "from", "Basis asal", { integer: true, min: 2, max: 36 });
  const to = num(input, "to", "Basis tujuan", { integer: true, min: 2, max: 36 });
  const p = parseInBase(s, from);
  if (!p) fail("Format bilangan tidak valid.", "x");
  if (p.bad) fail(`Angka “${p.bad}” tidak diizinkan pada basis ${from} (rentang yang diizinkan 0 hingga ${DIGITS[from - 1]}).`, "x");
  const sign = p.neg && (p.int !== 0n || p.frac !== 0) ? "-" : "";
  const steps = [];
  const decStr = p.int.toString() + (p.frac ? (p.frac.toString().slice(1, 22)) : "");
  if (from !== 10) {
    const digits = (p.ip + p.fp).split("");
    const terms = digits.map((ch, i) => {
      const pos = p.ip.length - 1 - i;
      return `${DIGITS.indexOf(ch)} \\times ${from}^{${pos}}`;
    }).slice(0, 24);
    steps.push({ text: `Kita konversi ke desimal dengan ekspansi posisional (setiap angka dikalikan basis berpangkat posisinya):`, tex: `${terms.join(" + ")}${digits.length > 24 ? " + \\cdots" : ""} = ${sign}${decStr}` });
  } else steps.push(`Bilangan sudah desimal: ${sign}${decStr}.`);
  const r = toBase(p.int, p.frac, to);
  const blocks = [];
  if (to !== 10) {
    if (r.divs.length) {
      steps.push(`Kita konversi bagian bulat ke basis ${to} dengan pembagian berulang oleh ${to}, lalu ambil sisanya dari bawah ke atas (lihat tabel).`);
      const rows = r.divs.slice(0, 64).map(([q, qq, rem]) => [q.toString(), qq.toString(), `${rem} → ${DIGITS[rem]}`]);
      blocks.push({ type: "table", caption: "Pembagian berulang untuk bagian bulat", head: ["Bilangan", `÷ ${to} = hasil bagi`, "Sisa"], rows });
    }
    if (r.muls.length) {
      steps.push(`Kita konversi bagian pecahan dengan perkalian berulang oleh ${to}, dan ambil bagian bulat setiap kali dari atas ke bawah.`);
      blocks.push({ type: "table", caption: "Perkalian berulang untuk bagian pecahan", head: ["Pecahan", `× ${to}`, "Angka"], rows: r.muls.map(([f, pr, d]) => [String(Number(f.toPrecision(12))), String(Number(pr.toPrecision(12))), DIGITS[d]]) });
      if (!r.exact) blocks.push({ type: "note", tone: "warn", text: `Pecahan tidak berakhir pada basis ${to}, sehingga kita berhenti pada dua puluh angka di belakang titik.` });
    }
  }
  const out = sign + r.str;
  steps.push(`Hasil: (${s})${from} = (${out})${to}`);
  const all = [2, 8, 10, 16].map((b) => ({ label: `Basis ${b}`, value: sign + toBase(p.int, p.frac, b).str }));
  return {
    results: [{ label: `Hasil dalam basis ${to}`, value: out, text: out }, ...all],
    blocks, steps, copy: out
  };
}
