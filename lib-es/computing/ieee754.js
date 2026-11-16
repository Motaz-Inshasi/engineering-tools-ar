import { fail, str, choice } from "../core/validate.js";
import { fmt, normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Convierte cualquier número decimal a su representación IEEE-754 en precisión simple (32 bits) o doble (64 bits): el bit de signo, el exponente sesgado, la fracción y el valor hexadecimal, además del valor realmente almacenado y el error de redondeo, y también el proceso inverso.",
  keywords: ["IEEE 754", "floating point", "coma flotante", "float", "double", "precisión simple", "precisión doble", "mantissa", "exponente sesgado", "exponent bias", "Representación de números", "0.1 + 0.2"],
  formulas: [{ label: "Valor de un número normal", tex: "x = (-1)^s \\times 1.f \\times 2^{e - \\text{bias}},\\qquad \\text{bias} = 127\\ (32),\\ 1023\\ (64)" }],
  inputs: [
    { id: "mode", label: "Sentido", type: "select", default: "encode", options: [["encode", "De número decimal a IEEE-754"], ["decode", "De representación hexadecimal a número"]] },
    { id: "precision", label: "Precisión", type: "select", default: "32", options: [["32", "Simple (32 bits)"], ["64", "Doble (64 bits)"]] },
    { id: "value", label: "Número decimal", type: "text", default: "-6.75", when: { mode: ["encode"] }, help: "Por ejemplo 0.1, -6.75, 1e-40, inf o nan." },
    { id: "hex", label: "Representación hexadecimal", type: "text", default: "C0D80000", when: { mode: ["decode"] }, help: "8 dígitos hexadecimales para precisión simple o 16 para doble, por ejemplo 3DCCCCCD." }
  ],
  example: { values: { mode: "encode", precision: "32", value: "-6.75", hex: "" }, expect: ["0xC0D80000", "1 10000001 10110000000000000000000"], note: "Ejemplo: representación de −6.75 en precisión simple." },
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
  const mode = choice(input, "mode", "Sentido", ["encode", "decode"], "encode");
  const prec = Number(choice(input, "precision", "Precisión", ["32", "64"], "32"));
  const E = prec === 32 ? 8 : 11, F = prec === 32 ? 23 : 52, bias = prec === 32 ? 127 : 1023;
  let x, info, original = null;
  if (mode === "encode") {
    const raw = normalizeDigits(str(input, "value", "número")).replace(/\s+/g, "").toLowerCase();
    if (/^[+-]?(inf|infinity|∞)$/.test(raw)) x = raw.startsWith("-") ? -Infinity : Infinity;
    else if (raw === "nan") x = NaN;
    else {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(raw)) fail("Introduce un número decimal como 0.1, -6.75 o 1e-5.", "value");
      x = Number(raw);
      original = raw;
    }
    info = bitsOf(x, prec);
  } else {
    const h = str(input, "hex", "Representación hexadecimal").replace(/^0x/i, "").replace(/[\s_]/g, "").toUpperCase();
    if (!/^[0-9A-F]+$/.test(h)) fail("La representación hexadecimal contiene caracteres no válidos (se permiten 0-9 y A-F).", "hex");
    if (h.length !== prec / 4) fail(`${prec === 32 ? "La precisión simple requiere 8" : "La precisión doble requiere 16"} dígitos hexadecimales exactos (introducidos: ${h.length}).`, "hex");
    x = fromHex(h, prec);
    info = { bits: [...h].map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join(""), hex: h, stored: x };
  }
  const s = info.bits[0], e = info.bits.slice(1, 1 + E), f = info.bits.slice(1 + E);
  const ev = parseInt(e, 2);
  const allOnes = ev === 2 ** E - 1, zeroE = ev === 0, zeroF = !/1/.test(f);
  let kind, valTex;
  if (allOnes) { kind = zeroF ? "Infinito" : "No es un número (NaN)"; valTex = zeroF ? `${s === "1" ? "-" : "+"}\\infty` : "\\text{NaN}"; }
  else if (zeroE) { kind = zeroF ? "Cero" : "Número subnormal"; valTex = zeroF ? `${s === "1" ? "-" : "+"}0` : `(-1)^{${s}} \\times 0.f \\times 2^{${1 - bias}}`; }
  else { kind = "Número normal"; valTex = `(-1)^{${s}} \\times 1.${f.replace(/0+$/, "") || "0"}_2 \\times 2^{${ev} - ${bias}} = (-1)^{${s}} \\times 1.f \\times 2^{${ev - bias}}`; }
  const grouped = `${s} ${e} ${f}`;
  const steps = [];
  if (mode === "encode" && isFinite(x) && x !== 0 && !zeroE) {
    const m = Math.abs(x), k = Math.floor(Math.log2(m));
    const kk = m / 2 ** k >= 2 ? k + 1 : m / 2 ** k < 1 ? k - 1 : k;
    steps.push(`Bit de signo: ${s} porque el número es ${x < 0 ? "negativo" : "positivo"}.`);
    steps.push({ text: "Escribimos el valor absoluto en notación científica binaria:", tex: `${fmt(m, 10)} = ${fmt(m / 2 ** kk, 10)} \\times 2^{${kk}}` });
    steps.push({ text: "Exponente sesgado:", tex: `e = ${kk} + ${bias} = ${kk + bias} = ${e}_2` });
    steps.push(`Parte fraccionaria: los bits después de «1.» en la representación binaria, redondeados a ${F} bits: ${f}.`);
  } else {
    steps.push(`Separamos los bits: el signo (1 bit), el exponente (${E} bits) y la fracción (${F} bits).`);
    steps.push({ text: `Exponente almacenado ${e}₂ = ${ev}, y el tipo: ${kind}.`, tex: valTex });
  }
  const results = [
    { label: "Representación hexadecimal", value: `0x${info.hex}`, text: `0x${info.hex}` },
    { label: "Bits (signo | exponente | fracción)", value: grouped, text: grouped },
    { label: "Tipo", value: kind },
    { label: "Exponente real", value: allOnes || zeroE ? (zeroE && !zeroF ? String(1 - bias) : "—") : String(ev - bias) },
    { label: "Valor realmente almacenado", value: Number.isNaN(info.stored) ? "NaN" : shortExact(exact(info.stored)) }
  ];
  let copy = `0x${info.hex} = ${grouped}`;
  if (original !== null && isFinite(x)) {
    const over = !isFinite(info.stored), err = over ? null : decimalError(original, info.stored);
    results.push({ label: "Error de redondeo", value: over ? "Desbordamiento del rango, por lo que se convierte en infinito" : err === null ? "Cero (representación exacta)" : `${err.abs} (relativo ${err.rel})` });
    if (!over && err !== null) steps.push(`El número ${original} no puede representarse exactamente en binario, así que se almacena el número posible más cercano; por eso aparecen errores como 0.1 + 0.2 ≠ 0.3.`);
    if (prec === 32 && !isFinite(info.stored)) steps.push("El número es mayor que el mayor valor de precisión simple (≈ 3.4 × 10^38), así que se convierte en infinito.");
  }
  results.push({ label: "Límites de esta precisión", value: prec === 32 ? "Mayor ≈ 3.403e38, menor normal ≈ 1.175e-38, precisión ≈ 7 cifras decimales" : "Mayor ≈ 1.798e308, menor normal ≈ 2.225e-308, precisión ≈ 15–16 cifras decimales" });
  return {
    results, steps, copy,
    blocks: [{ type: "table", ltr: true, caption: "Desglose de bits", head: ["Campo", "Número de bits", "Valor"], rows: [["Sign", "1", s], ["Exponent", String(E), `${e} (${ev})`], ["Fraction", String(F), f]] }]
  };
}
