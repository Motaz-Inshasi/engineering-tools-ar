import { fail, str, choice } from "../core/validate.js";
import { fmt, normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Convertissez un nombre décimal en sa représentation IEEE-754 en simple précision (32 bits) ou double précision (64 bits) : bit de signe, exposant biaisé, partie fractionnaire et valeur hexadécimale, avec la valeur réellement stockée et l'erreur d'arrondi, et l'inverse.",
  keywords: ["IEEE 754", "floating point", "Virgule flottante", "float", "double", "simple précision", "double précision", "mantissa", "Exposant biaisé", "exponent bias", "Représentation des nombres", "0.1 + 0.2"],
  formulas: [{ label: "Valeur du nombre normal", tex: "x = (-1)^s \\times 1.f \\times 2^{e - \\text{bias}},\\qquad \\text{bias} = 127\\ (32),\\ 1023\\ (64)" }],
  inputs: [
    { id: "mode", label: "Sens", type: "select", default: "encode", options: [["encode", "De décimal vers IEEE-754"], ["decode", "D'hexadécimal vers nombre"]] },
    { id: "precision", label: "Précision", type: "select", default: "32", options: [["32", "simple (32 bits)"], ["64", "double (64 bits)"]] },
    { id: "value", label: "Nombre décimal", type: "text", default: "-6.75", when: { mode: ["encode"] }, help: "Par exemple 0.1, -6.75, 1e-40, inf ou nan." },
    { id: "hex", label: "Représentation hexadécimale", type: "text", default: "C0D80000", when: { mode: ["decode"] }, help: "8 chiffres hexadécimaux pour la simple précision ou 16 pour la double, par exemple 3DCCCCCD." }
  ],
  example: { values: { mode: "encode", precision: "32", value: "-6.75", hex: "" }, expect: ["0xC0D80000", "1 10000001 10110000000000000000000"], note: "Exemple : représentation de −6.75 en simple précision." },
  invalid: { values: { mode: "encode", precision: "32", value: "abc", hex: "" } },
  related: ["binary-twos-complement", "number-bases", "significant-figures", "text-encoding"]
};

function bitsOf(x, prec) {
  const buf = new DataView(new ArrayBuffer(8));
  if (prec === 32) { buf.setFloat32(0, x); return { bits: buf.getUint32(0).toString(2).padStart(32, "0"), hex: buf.getUint32(0).toString(16).toUpperCase().padStart(8, "0"), stored: buf.getFloat32(0) }; }
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0), lo = buf.getUint32(4);
  return { bits: hi.toString(2).padStart(32, "0") + lo.toString(2).padStart(32, "0"), hex: (hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0")).toUpperCase(), stored: buf.getFloat64(0) };
}

function fromHex(h, prec) {
  const buf = new DataView(new ArrayBuffer(8));
  if (prec === 32) { buf.setUint32(0, parseInt(h, 16)); return buf.getFloat32(0); }
  buf.setUint32(0, parseInt(h.slice(0, 8), 16));
  buf.setUint32(4, parseInt(h.slice(8), 16));
  return buf.getFloat64(0);
}

function exact(x) {
  if (!isFinite(x) || x === 0) return String(x);
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4);
  const be = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e2;
  if (be === 0) e2 = -1074;
  else { mant |= 1n << 52n; e2 = be - 1075; }
  let s;
  if (e2 >= 0) s = (mant << BigInt(e2)).toString();
  else {
    const k = -e2;
    const digits = (mant * 5n ** BigInt(k)).toString().padStart(k + 1, "0");
    s = `${digits.slice(0, digits.length - k)}.${digits.slice(digits.length - k)}`.replace(/0+$/, "").replace(/\.$/, "");
  }
  return (x < 0 ? "-" : "") + s;
}

function shortExact(s) {
  return s.length > 60 ? `${s.slice(0, 58)}…` : s;
}

function scaled(s, D) {
  const m = s.replace(/^\+/, "").match(/^(-?)(\d*)\.?(\d*)(?:e([+-]?\d+))?$/i);
  const digits = (m[2] + m[3]).replace(/^0+(?=\d)/, "") || "0";
  const shift = D - m[3].length + Number(m[4] || 0);
  const v = shift >= 0 ? BigInt(digits) * 10n ** BigInt(shift) : BigInt(digits) / 10n ** BigInt(-shift);
  return m[1] === "-" ? -v : v;
}

function decimalError(raw, stored) {
  const D = 1200;
  const a = scaled(raw, D), b = scaled(exact(stored), D);
  const d = a > b ? a - b : b - a;
  if (d === 0n) return null;
  const s = d.toString(), A = (a < 0n ? -a : a).toString();
  const lead = (t) => Number(`${t[0]}.${t.slice(1, 16) || 0}`);
  const ex = s.length - 1 - D;
  return { abs: ex >= -4 && ex <= 9 ? fmt(lead(s) * 10 ** ex, 4) : `${fmt(lead(s), 4)}e${ex}`, rel: `${fmt(lead(s) / lead(A), 3)}e${s.length - A.length}` };
}

export function solve(input) {
  const mode = choice(input, "mode", "Sens", ["encode", "decode"], "encode");
  const prec = Number(choice(input, "precision", "Précision", ["32", "64"], "32"));
  const E = prec === 32 ? 8 : 11, F = prec === 32 ? 23 : 52, bias = prec === 32 ? 127 : 1023;
  let x, info, original = null;
  if (mode === "encode") {
    const raw = normalizeDigits(str(input, "value", "Nombre")).replace(/\s+/g, "").toLowerCase();
    if (/^[+-]?(inf|infinity|∞)$/.test(raw)) x = raw.startsWith("-") ? -Infinity : Infinity;
    else if (raw === "nan") x = NaN;
    else {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(raw)) fail("Saisissez un nombre décimal, par exemple 0.1, -6.75 ou 1e-5.", "value");
      x = Number(raw);
      original = raw;
    }
    info = bitsOf(x, prec);
  } else {
    const h = str(input, "hex", "Représentation hexadécimale").replace(/^0x/i, "").replace(/[\s_]/g, "").toUpperCase();
    if (!/^[0-9A-F]+$/.test(h)) fail("La représentation hexadécimale contient des caractères invalides (autorisés : 0-9 et A-F).", "hex");
    if (h.length !== prec / 4) fail(`La précision exige exactement ${prec === 32 ? "la simple précision exige 8" : "la double précision exige 16"} chiffres hexadécimaux (vous avez saisi ${h.length}).`, "hex");
    x = fromHex(h, prec);
    info = { bits: [...h].map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join(""), hex: h, stored: x };
  }
  const s = info.bits[0], e = info.bits.slice(1, 1 + E), f = info.bits.slice(1 + E);
  const ev = parseInt(e, 2);
  const allOnes = ev === 2 ** E - 1, zeroE = ev === 0, zeroF = !/1/.test(f);
  let kind, valTex;
  if (allOnes) { kind = zeroF ? "infini" : "non un nombre (NaN)"; valTex = zeroF ? `${s === "1" ? "-" : "+"}\\infty` : "\\text{NaN}"; }
  else if (zeroE) { kind = zeroF ? "zéro" : "nombre sous-normal (subnormal)"; valTex = zeroF ? `${s === "1" ? "-" : "+"}0` : `(-1)^{${s}} \\times 0.f \\times 2^{${1 - bias}}`; }
  else { kind = "nombre normal (normalisé)"; valTex = `(-1)^{${s}} \\times 1.${f.replace(/0+$/, "") || "0"}_2 \\times 2^{${ev} - ${bias}} = (-1)^{${s}} \\times 1.f \\times 2^{${ev - bias}}`; }
  const grouped = `${s} ${e} ${f}`;
  const steps = [];
  if (mode === "encode" && isFinite(x) && x !== 0 && !zeroE) {
    const m = Math.abs(x), k = Math.floor(Math.log2(m));
    const kk = m / 2 ** k >= 2 ? k + 1 : m / 2 ** k < 1 ? k - 1 : k;
    steps.push(`Bit de signe : ${s} car le nombre est ${x < 0 ? "négatif" : "positif"}.`);
    steps.push({ text: "On écrit la valeur absolue en notation scientifique binaire :", tex: `${fmt(m, 10)} = ${fmt(m / 2 ** kk, 10)} \\times 2^{${kk}}` });
    steps.push({ text: "Exposant biaisé :", tex: `e = ${kk} + ${bias} = ${kk + bias} = ${e}_2` });
    steps.push(`Partie fractionnaire : les bits après «1.» dans la représentation binaire, arrondis à ${F} bits : ${f}.`);
  } else {
    steps.push(`On répartit les bits : signe (1 bit), exposant (${E} bits) et fraction (${F} bits).`);
    steps.push({ text: `Exposant stocké ${e}₂ = ${ev}, type : ${kind}.`, tex: valTex });
  }
  const results = [
    { label: "Représentation hexadécimale", value: `0x${info.hex}`, text: `0x${info.hex}` },
    { label: "Bits (signe | exposant | fraction)", value: grouped, text: grouped },
    { label: "Type", value: kind },
    { label: "Exposant réel", value: allOnes || zeroE ? (zeroE && !zeroF ? String(1 - bias) : "—") : String(ev - bias) },
    { label: "Valeur réellement stockée", value: Number.isNaN(info.stored) ? "NaN" : shortExact(exact(info.stored)) }
  ];
  let copy = `0x${info.hex} = ${grouped}`;
  if (original !== null && isFinite(x)) {
    const over = !isFinite(info.stored), err = over ? null : decimalError(original, info.stored);
    results.push({ label: "Erreur d'arrondi", value: over ? "dépassement de capacité (overflow), la valeur devient infinie" : err === null ? "zéro (représentation exacte)" : `${err.abs} (relative ${err.rel})` });
    if (!over && err !== null) steps.push(`Le nombre ${original} ne peut pas être représenté exactement en binaire : on stocke le plus proche possible, ce qui explique des erreurs comme 0.1 + 0.2 ≠ 0.3.`);
    if (prec === 32 && !isFinite(info.stored)) steps.push("Le nombre est supérieur à la plus grande valeur en simple précision (≈ 3.4 × 10^38) : il devient infini.");
  }
  results.push({ label: "Limites de cette précision", value: prec === 32 ? "max ≈ 3.403e38, plus petit normal ≈ 1.175e-38, précision ≈ 7 chiffres décimaux" : "max ≈ 1.798e308, plus petit normal ≈ 2.225e-308, précision ≈ 15–16 chiffres décimaux" });
  return {
    results, steps, copy,
    blocks: [{ type: "table", ltr: true, caption: "Répartition des bits", head: ["Champ", "Nombre de bits", "Valeur"], rows: [["Sign", "1", s], ["Exponent", String(E), `${e} (${ev})`], ["Fraction", String(F), f]] }]
  };
}
