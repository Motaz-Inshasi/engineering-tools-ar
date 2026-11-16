import { fail, str, choice } from "../core/validate.js";
import { fmt, normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Convert any decimal number to its IEEE-754 representation in single precision (32 bits) or double precision (64 bits): the sign bit, the biased exponent, the fraction, and the hexadecimal value, as well as the value actually stored and the rounding error, and the reverse.",
  keywords: ["IEEE 754", "floating point", "floating point", "float", "double", "single precision", "double precision", "mantissa", "biased exponent", "exponent bias", "Number representation", "0.1 + 0.2"],
  formulas: [{ label: "Value of a normal number", tex: "x = (-1)^s \\times 1.f \\times 2^{e - \\text{bias}},\\qquad \\text{bias} = 127\\ (32),\\ 1023\\ (64)" }],
  inputs: [
    { id: "mode", label: "Direction", type: "select", default: "encode", options: [["encode", "From decimal number to IEEE-754"], ["decode", "From hexadecimal representation to number"]] },
    { id: "precision", label: "Precision", type: "select", default: "32", options: [["32", "Single (32 bits)"], ["64", "Double (64 bits)"]] },
    { id: "value", label: "Decimal number", type: "text", default: "-6.75", when: { mode: ["encode"] }, help: "Such as 0.1, -6.75, 1e-40, inf or nan." },
    { id: "hex", label: "Hexadecimal representation", type: "text", default: "C0D80000", when: { mode: ["decode"] }, help: "8 hexadecimal digits for single precision or 16 for double, such as 3DCCCCCD." }
  ],
  example: { values: { mode: "encode", precision: "32", value: "-6.75", hex: "" }, expect: ["0xC0D80000", "1 10000001 10110000000000000000000"], note: "Example: representing −6.75 in single precision." },
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
  const mode = choice(input, "mode", "Direction", ["encode", "decode"], "encode");
  const prec = Number(choice(input, "precision", "Precision", ["32", "64"], "32"));
  const E = prec === 32 ? 8 : 11, F = prec === 32 ? 23 : 52, bias = prec === 32 ? 127 : 1023;
  let x, info, original = null;
  if (mode === "encode") {
    const raw = normalizeDigits(str(input, "value", "number")).replace(/\s+/g, "").toLowerCase();
    if (/^[+-]?(inf|infinity|∞)$/.test(raw)) x = raw.startsWith("-") ? -Infinity : Infinity;
    else if (raw === "nan") x = NaN;
    else {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(raw)) fail("Enter a decimal number such as 0.1, -6.75 or 1e-5.", "value");
      x = Number(raw);
      original = raw;
    }
    info = bitsOf(x, prec);
  } else {
    const h = str(input, "hex", "Hexadecimal representation").replace(/^0x/i, "").replace(/[\s_]/g, "").toUpperCase();
    if (!/^[0-9A-F]+$/.test(h)) fail("The hexadecimal representation contains invalid characters (allowed: 0-9 and A-F).", "hex");
    if (h.length !== prec / 4) fail(`The precision requires exactly ${prec === 32 ? "single precision needs 8" : "double precision needs 16"} hexadecimal digits (you entered ${h.length}).`, "hex");
    x = fromHex(h, prec);
    info = { bits: [...h].map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join(""), hex: h, stored: x };
  }
  const s = info.bits[0], e = info.bits.slice(1, 1 + E), f = info.bits.slice(1 + E);
  const ev = parseInt(e, 2);
  const allOnes = ev === 2 ** E - 1, zeroE = ev === 0, zeroF = !/1/.test(f);
  let kind, valTex;
  if (allOnes) { kind = zeroF ? "Infinity" : "Not a number (NaN)"; valTex = zeroF ? `${s === "1" ? "-" : "+"}\\infty` : "\\text{NaN}"; }
  else if (zeroE) { kind = zeroF ? "Zero" : "Subnormal number"; valTex = zeroF ? `${s === "1" ? "-" : "+"}0` : `(-1)^{${s}} \\times 0.f \\times 2^{${1 - bias}}`; }
  else { kind = "Normal number"; valTex = `(-1)^{${s}} \\times 1.${f.replace(/0+$/, "") || "0"}_2 \\times 2^{${ev} - ${bias}} = (-1)^{${s}} \\times 1.f \\times 2^{${ev - bias}}`; }
  const grouped = `${s} ${e} ${f}`;
  const steps = [];
  if (mode === "encode" && isFinite(x) && x !== 0 && !zeroE) {
    const m = Math.abs(x), k = Math.floor(Math.log2(m));
    const kk = m / 2 ** k >= 2 ? k + 1 : m / 2 ** k < 1 ? k - 1 : k;
    steps.push(`Sign bit: ${s} because the number is ${x < 0 ? "negative" : "positive"}.`);
    steps.push({ text: "We write the absolute value in binary scientific notation:", tex: `${fmt(m, 10)} = ${fmt(m / 2 ** kk, 10)} \\times 2^{${kk}}` });
    steps.push({ text: "Biased exponent:", tex: `e = ${kk} + ${bias} = ${kk + bias} = ${e}_2` });
    steps.push(`Fraction: the bits after "1." in the binary representation, rounded to ${F} bits: ${f}.`);
  } else {
    steps.push(`We split the bits: the sign (1 bit), the exponent (${E} bits) and the fraction (${F} bits).`);
    steps.push({ text: `Stored exponent ${e}₂ = ${ev}, and the type: ${kind}.`, tex: valTex });
  }
  const results = [
    { label: "Hexadecimal representation", value: `0x${info.hex}`, text: `0x${info.hex}` },
    { label: "Bits (sign | exponent | fraction)", value: grouped, text: grouped },
    { label: "Type", value: kind },
    { label: "Actual exponent", value: allOnes || zeroE ? (zeroE && !zeroF ? String(1 - bias) : "—") : String(ev - bias) },
    { label: "Actually stored value", value: Number.isNaN(info.stored) ? "NaN" : shortExact(exact(info.stored)) }
  ];
  let copy = `0x${info.hex} = ${grouped}`;
  if (original !== null && isFinite(x)) {
    const over = !isFinite(info.stored), err = over ? null : decimalError(original, info.stored);
    results.push({ label: "Rounding error", value: over ? "Overflow beyond the range, so it becomes infinity" : err === null ? "Zero (exact representation)" : `${err.abs} (relative ${err.rel})` });
    if (!over && err !== null) steps.push(`The number ${original} cannot be represented exactly in the binary system, so the nearest possible number is stored; this is why errors such as 0.1 + 0.2 ≠ 0.3 appear.`);
    if (prec === 32 && !isFinite(info.stored)) steps.push("The number is greater than the largest value in single precision (≈ 3.4 × 10^38), so it becomes infinity.");
  }
  results.push({ label: "Limits of this precision", value: prec === 32 ? "Largest ≈ 3.403e38, smallest normal ≈ 1.175e-38, precision ≈ 7 decimal digits" : "Largest ≈ 1.798e308, smallest normal ≈ 2.225e-308, precision ≈ 15–16 decimal digits" });
  return {
    results, steps, copy,
    blocks: [{ type: "table", ltr: true, caption: "Bit breakdown", head: ["Field", "Number of bits", "Value"], rows: [["Sign", "1", s], ["Exponent", String(E), `${e} (${ev})`], ["Fraction", String(F), f]] }]
  };
}
