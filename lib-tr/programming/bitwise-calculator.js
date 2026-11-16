import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const BIN_OPS = ["and", "or", "xor"];
const SHIFT_OPS = ["shl", "shr", "sar"];
const NAMES = { and: "AND", or: "OR", xor: "XOR", not: "NOT", shl: "SHL", shr: "SHR", sar: "SAR" };
const TEX_BIN = { and: "\\mathrm{AND}", or: "\\mathrm{OR}", xor: "\\mathrm{XOR}" };
const TEXTS = {
  and: "AND yalnızca A ve B'nin ilgili bitleri ikisi de 1 ise 1 verir; diğer tüm durumlarda 0 verir.",
  or: "OR, iki bitten biri veya ikisi de 1 ise 1 verir; yalnızca iki bit de 0 ise 0 verir.",
  xor: "XOR, iki bit farklıysa 1, eşitse 0 verir.",
  not: "NOT her biti çevirir: 0 olan 1 olur, 1 olan 0 olur.",
  shl: "SHL bitleri sola kaydırır; üstten taşan bitler kaybolur, sağ taraf sıfırlarla doldurulur.",
  shr: "SHR (mantıksal) bitleri sağa kaydırır; sol taraf her zaman sıfırlarla doldurulur.",
  sar: "SAR (aritmetik) bitleri sağa kaydırır ve işaret bitini korur; sol taraf onun kopyalarıyla doldurulur."
};

export const meta = {
  description: "8, 16 veya 32 bit genişliğindeki sayılarla AND, OR, XOR, NOT ve SHL, SHR, SAR kaydırmalarını hesaplar; sonucu ikilik, onaltılık ve işaretli ile işaretsiz ondalık olarak gösterir ve her işlemin kuralını açıklayan adımlar sunar.",
  keywords: ["bit işlemleri", "bitwise", "AND", "OR", "XOR", "NOT", "kaydırma", "shift", "2'nin tümleyeni", "two's complement", "SAR", "SHR"],
  formulas: [
    { label: "Mantıksal işlemler", tex: "A \\land B,\\quad A \\lor B,\\quad A \\oplus B,\\quad \\lnot A" },
    { label: "Sola s kadar kaydırma", tex: "A \\ll s = (A \\cdot 2^{s}) \\bmod 2^{w}" }
  ],
  inputs: [
    { id: "a", label: "A değeri", type: "text", default: "12", help: "Ondalık olarak, ör. -5; onaltılık için 0x öneki ile, ör. 0x0A; ikilik için 0b öneki ile, ör. 0b1010." },
    { id: "op", label: "İşlem", type: "select", default: "and", options: [["and", "AND (ve)"], ["or", "OR (veya)"], ["xor", "XOR (özel veya)"], ["not", "NOT (değil)"], ["shl", "SHL (sola kaydırma)"], ["shr", "SHR (sağa kaydırma, mantıksal)"], ["sar", "SAR (sağa kaydırma, aritmetik)"]] },
    { id: "b", label: "B değeri", type: "text", default: "10", when: { op: ["and", "or", "xor"] } },
    { id: "shift", label: "Kaydırma miktarı", type: "number", default: "3", help: "0 ile bit genişliği eksi 1 arasında.", when: { op: ["shl", "shr", "sar"] } },
    { id: "width", label: "Bit genişliği", type: "select", default: "8", options: [["8", "8 bit"], ["16", "16 bit"], ["32", "32 bit"]] }
  ],
  example: { values: { a: "12", op: "and", b: "10", shift: "3", width: "8" }, expect: ["0000 1000 (0x08 = 8)"], note: "Örnek: 8 bit genişliğinde 12 AND 10." },
  invalid: { values: { a: "300", op: "and", b: "1", shift: "0", width: "8" } },
  related: ["number-bases", "binary-twos-complement", "logic-gates", "truth-table", "chmod-calculator", "unix-timestamp"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

function parseOperand(raw, label, field, w) {
  const s = normalizeDigits(String(raw)).replace(/[\s_]/g, "");
  const m = s.match(/^([+-]?)(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)$/);
  if (!m) fail(`${label} geçerli bir tam sayı değil. Ondalık yazın (ör. -5), 0x öneki (ör. 0x0A) ya da 0b öneki (ör. 0b1010) kullanın.`, field);
  let v = BigInt(m[2].toLowerCase());
  if (m[1] === "-") v = -v;
  const full = 1n << BigInt(w);
  const half = full >> 1n;
  if (v >= 0n && v < full) return { v, raw: v };
  if (v < 0n && v >= -half) return { v, raw: v + full };
  fail(`${label} ${w} bit aralığının dışında; izin verilen aralık ${-half} ile ${full - 1n} arasıdır.`, field);
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
  const op = choice(input, "op", "İşlem", ["and", "or", "xor", "not", "shl", "shr", "sar"], "and");
  const w = Number(choice(input, "width", "Bit genişliği", ["8", "16", "32"], "8"));
  if (isBlank(input.a)) fail("A değerini girin.", "a");
  const va = parseOperand(input.a, "A değeri", "a", w);
  const isBin = BIN_OPS.includes(op);
  const isShift = SHIFT_OPS.includes(op);
  let vb = null;
  if (isBin) {
    if (isBlank(input.b)) fail("B değerini girin.", "b");
    vb = parseOperand(input.b, "B değeri", "b", w);
  }
  let sh = null;
  if (isShift) sh = num(input, "shift", "Kaydırma miktarı", { integer: true, min: 0, max: w - 1 });
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
  rows.push(rowOf("Sonuç", rr));
  const named = [["A", ra]];
  if (vb) named.push(["B", rb]);
  named.push([NAMES[op], rr]);
  const steps = [TEXTS[op]];
  steps.push({ text: "A değerini seçilen genişlikte bit desenine çevirin:", tex: `A = ${va.v} \\Rightarrow \\text{${grouped(ra, w)}}_{2}` });
  if (vb) steps.push({ text: "B değerini seçilen genişlikte bit desenine çevirin:", tex: `B = ${vb.v} \\Rightarrow \\text{${grouped(rb, w)}}_{2}` });
  if (isShift) steps.push({ text: "Kaydırma miktarı:", tex: `s = ${sh}` });
  steps.push({ text: "İşlemi bit bit uygulayın:", tex: `${expr(op, sh)} = \\text{${bin}}_{2}` });
  steps.push({ text: "İşaretsiz ondalık değer:", tex: `\\text{${bin}}_{2} = \\text{${hx}} = ${un}` });
  steps.push(
    (rr >> BigInt(w - 1)) === 1n
      ? `Sonucun en yüksek biti 1 olduğu için 2'nin tümleyeni işaretiyle değer ${sg} olarak yorumlanır.`
      : `Sonucun en yüksek biti 0 olduğu için 2'nin tümleyeni işaretiyle değer aynen ${sg} kalır.`
  );
  const blocks = [
    { type: "table", caption: "Bit tablosu", head: ["Değişken", "İkilik", "Onaltılık", "İşaretsiz", "İşaretli (2'nin tümleyeni)"], rows, ltr: true },
    { type: "html", html: `<pre class="code" dir="ltr"><code>${escapeHtml(bitAlignment(named, w))}</code></pre>` }
  ];
  if (op === "shl" && (ra << BigInt(sh)) > (1n << BigInt(w)) - 1n) {
    blocks.push({ type: "note", text: "Kaydırma seçilen bit genişliğinin sınırlarını aştığı için sayının en üstündeki bazı bitler kayboldu.", tone: "warn" });
  }
  const lhs = isBin ? `${va.v} ${NAMES[op]} ${vb.v}` : op === "not" ? `NOT ${va.v}` : `${va.v} ${NAMES[op]} ${sh}`;
  return {
    results: [
      { label: "Sonuç ikilik", value: bin },
      { label: "Sonuç onaltılık", value: hx },
      { label: "Sonuç işaretsiz", value: un },
      { label: "Sonuç işaretli (2'nin tümleyeni)", value: sg }
    ],
    steps,
    blocks,
    copy: `${lhs} = ${bin} (${hx} = ${un})`
  };
}
