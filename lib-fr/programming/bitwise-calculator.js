import { choice, fail, isBlank, num } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const BIN_OPS = ["and", "or", "xor"];
const SHIFT_OPS = ["shl", "shr", "sar"];
const NAMES = { and: "AND", or: "OR", xor: "XOR", not: "NOT", shl: "SHL", shr: "SHR", sar: "SAR" };
const TEX_BIN = { and: "\\mathrm{AND}", or: "\\mathrm{OR}", xor: "\\mathrm{XOR}" };
const TEXTS = {
  and: "AND ne donne 1 que si le bit de A et le bit de B valent tous deux 1 ; dans tous les autres cas, il donne 0.",
  or: "OR donne 1 si au moins l'un des deux bits vaut 1 ; il ne donne 0 que si les deux bits valent 0.",
  xor: "XOR donne 1 si les deux bits sont différents, et 0 s'ils sont identiques.",
  not: "NOT inverse chaque bit : 0 devient 1 et 1 devient 0.",
  shl: "SHL décale les bits vers la gauche ; les bits sortant par le haut sont perdus, et l'extrémité droite est remplie de zéros.",
  shr: "SHR (logique) décale les bits vers la droite ; l'extrémité gauche est toujours remplie de zéros.",
  sar: "SAR (arithmétique) décale les bits vers la droite en conservant le bit de signe, si bien que l'extrémité gauche est remplie de copies de ce bit."
};

export const meta = {
  description: "Calculez les opérations AND, OR, XOR, NOT et les décalages SHL, SHR et SAR sur des nombres de 8, 16 ou 32 bits, avec le résultat en binaire, hexadécimal et décimal, signé et non signé, et des étapes expliquant la règle de chaque opération.",
  keywords: ["Opérations sur les bits", "bitwise", "AND", "OR", "XOR", "NOT", "Décalage", "shift", "complément à 2", "two's complement", "SAR", "SHR"],
  formulas: [
    { label: "Opérations logiques", tex: "A \\land B,\\quad A \\lor B,\\quad A \\oplus B,\\quad \\lnot A" },
    { label: "Décalage à gauche de s", tex: "A \\ll s = (A \\cdot 2^{s}) \\bmod 2^{w}" }
  ],
  inputs: [
    { id: "a", label: "Valeur A", type: "text", default: "12", help: "En décimal comme -5, en hexadécimal avec le préfixe 0x comme 0x0A, ou en binaire avec le préfixe 0b comme 0b1010." },
    { id: "op", label: "Opération", type: "select", default: "and", options: [["and", "AND (ET)"], ["or", "OR (OU)"], ["xor", "XOR (OU exclusif)"], ["not", "NOT (négation)"], ["shl", "SHL (décalage à gauche)"], ["shr", "SHR (décalage à droite logique)"], ["sar", "SAR (décalage à droite arithmétique)"]] },
    { id: "b", label: "Valeur B", type: "text", default: "10", when: { op: ["and", "or", "xor"] } },
    { id: "shift", label: "Nombre de positions de décalage", type: "number", default: "3", help: "Entre 0 et la largeur en bits moins 1.", when: { op: ["shl", "shr", "sar"] } },
    { id: "width", label: "Largeur en bits", type: "select", default: "8", options: [["8", "8 bits"], ["16", "16 bits"], ["32", "32 bits"]] }
  ],
  example: { values: { a: "12", op: "and", b: "10", shift: "3", width: "8" }, expect: ["0000 1000 (0x08 = 8)"], note: "Exemple : 12 AND 10 sur une largeur de 8 bits." },
  invalid: { values: { a: "300", op: "and", b: "1", shift: "0", width: "8" } },
  related: ["number-bases", "binary-twos-complement", "logic-gates", "truth-table", "chmod-calculator", "unix-timestamp"]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

function parseOperand(raw, label, field, w) {
  const s = normalizeDigits(String(raw)).replace(/[\s_]/g, "");
  const m = s.match(/^([+-]?)(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)$/);
  if (!m) fail(`${label} n'est pas un entier valide. Écrivez-le en décimal (comme -5), avec le préfixe 0x (comme 0x0A) ou avec le préfixe 0b (comme 0b1010).`, field);
  let v = BigInt(m[2].toLowerCase());
  if (m[1] === "-") v = -v;
  const full = 1n << BigInt(w);
  const half = full >> 1n;
  if (v >= 0n && v < full) return { v, raw: v };
  if (v < 0n && v >= -half) return { v, raw: v + full };
  fail(`${label} est hors de la plage de ${w} bits ; la plage autorisée va de ${-half} à ${full - 1n}.`, field);
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
  const op = choice(input, "op", "Opération", ["and", "or", "xor", "not", "shl", "shr", "sar"], "and");
  const w = Number(choice(input, "width", "Largeur en bits", ["8", "16", "32"], "8"));
  if (isBlank(input.a)) fail("Saisissez la valeur A.", "a");
  const va = parseOperand(input.a, "Valeur A", "a", w);
  const isBin = BIN_OPS.includes(op);
  const isShift = SHIFT_OPS.includes(op);
  let vb = null;
  if (isBin) {
    if (isBlank(input.b)) fail("Saisissez la valeur B.", "b");
    vb = parseOperand(input.b, "Valeur B", "b", w);
  }
  let sh = null;
  if (isShift) sh = num(input, "shift", "Nombre de positions de décalage", { integer: true, min: 0, max: w - 1 });
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
  rows.push(rowOf("Résultat", rr));
  const named = [["A", ra]];
  if (vb) named.push(["B", rb]);
  named.push([NAMES[op], rr]);
  const steps = [TEXTS[op]];
  steps.push({ text: "Convertissez A en motif de bits de la largeur choisie :", tex: `A = ${va.v} \\Rightarrow \\text{${grouped(ra, w)}}_{2}` });
  if (vb) steps.push({ text: "Convertissez B en motif de bits de la largeur choisie :", tex: `B = ${vb.v} \\Rightarrow \\text{${grouped(rb, w)}}_{2}` });
  if (isShift) steps.push({ text: "Nombre de positions de décalage :", tex: `s = ${sh}` });
  steps.push({ text: "Appliquez l'opération bit à bit :", tex: `${expr(op, sh)} = \\text{${bin}}_{2}` });
  steps.push({ text: "Valeur décimale non signée :", tex: `\\text{${bin}}_{2} = \\text{${hx}} = ${un}` });
  steps.push(
    (rr >> BigInt(w - 1)) === 1n
      ? `Le bit de poids fort du résultat = 1, il est donc interprété en complément à 2 comme la valeur ${sg}.`
      : `Le bit de poids fort du résultat = 0, la valeur en complément à 2 est donc ${sg} elle-même.`
  );
  const blocks = [
    { type: "table", caption: "Tableau des bits", head: ["Variable", "Binaire", "Hexadécimal", "Non signé", "Signé (complément à 2)"], rows, ltr: true },
    { type: "html", html: `<pre class="code" dir="ltr"><code>${escapeHtml(bitAlignment(named, w))}</code></pre>` }
  ];
  if (op === "shl" && (ra << BigInt(sh)) > (1n << BigInt(w)) - 1n) {
    blocks.push({ type: "note", text: "Certains bits ont été perdus en haut du nombre, car le décalage a dépassé la largeur choisie.", tone: "warn" });
  }
  const lhs = isBin ? `${va.v} ${NAMES[op]} ${vb.v}` : op === "not" ? `NOT ${va.v}` : `${va.v} ${NAMES[op]} ${sh}`;
  return {
    results: [
      { label: "Résultat en binaire", value: bin },
      { label: "Résultat en hexadécimal", value: hx },
      { label: "Résultat non signé", value: un },
      { label: "Résultat signé (complément à 2)", value: sg }
    ],
    steps,
    blocks,
    copy: `${lhs} = ${bin} (${hx} = ${un})`
  };
}
