import { fail, str, choice } from "../core/validate.js";
import { fmt, normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Herhangi bir ondalık sayıyı tek duyarlılıklı (32 bit) veya çift duyarlılıklı (64 bit) IEEE-754 gösterimine çevirin: işaret biti, sapmalı üs, kesir kısmı ve onaltılık değer, gerçekte saklanan değer ve yuvarlama hatası; ve tersi.",
  keywords: ["IEEE 754", "floating point", "kayan nokta", "float", "double", "tek duyarlılık", "çift duyarlılık", "mantissa", "sapmalı üs", "exponent bias", "sayı gösterimi", "0.1 + 0.2"],
  formulas: [{ label: "Normal bir sayının değeri", tex: "x = (-1)^s \\times 1.f \\times 2^{e - \\text{bias}},\\qquad \\text{bias} = 127\\ (32),\\ 1023\\ (64)" }],
  inputs: [
    { id: "mode", label: "Yön", type: "select", default: "encode", options: [["encode", "Ondalık sayıdan IEEE-754'e"], ["decode", "Onaltılık gösterimden sayıya"]] },
    { id: "precision", label: "Duyarlılık", type: "select", default: "32", options: [["32", "Tek (32 bit)"], ["64", "Çift (64 bit)"]] },
    { id: "value", label: "Ondalık sayı", type: "text", default: "-6.75", when: { mode: ["encode"] }, help: "Örn. 0.1, -6.75, 1e-40, inf veya nan." },
    { id: "hex", label: "Onaltılık gösterim", type: "text", default: "C0D80000", when: { mode: ["decode"] }, help: "Tek duyarlılık için 8, çift için 16 onaltılık basamak, örn. 3DCCCCCD." }
  ],
  example: { values: { mode: "encode", precision: "32", value: "-6.75", hex: "" }, expect: ["0xC0D80000", "1 10000001 10110000000000000000000"], note: "Örnek: −6.75 sayısının tek duyarlılıkta gösterimi." },
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
  const mode = choice(input, "mode", "Yön", ["encode", "decode"], "encode");
  const prec = Number(choice(input, "precision", "Duyarlılık", ["32", "64"], "32"));
  const E = prec === 32 ? 8 : 11, F = prec === 32 ? 23 : 52, bias = prec === 32 ? 127 : 1023;
  let x, info, original = null;
  if (mode === "encode") {
    const raw = normalizeDigits(str(input, "value", "Sayı")).replace(/\s+/g, "").toLowerCase();
    if (/^[+-]?(inf|infinity|∞)$/.test(raw)) x = raw.startsWith("-") ? -Infinity : Infinity;
    else if (raw === "nan") x = NaN;
    else {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(raw)) fail("Ondalık tam bir sayı girin, örn. 0.1, -6.75 veya 1e-5.", "value");
      x = Number(raw);
      original = raw;
    }
    info = bitsOf(x, prec);
  } else {
    const h = str(input, "hex", "Onaltılık gösterim").replace(/^0x/i, "").replace(/[\s_]/g, "").toUpperCase();
    if (!/^[0-9A-F]+$/.test(h)) fail("Onaltılık gösterimde geçersiz karakterler var (izin verilenler 0-9 ve A-F).", "hex");
    if (h.length !== prec / 4) fail(`Duyarlılık için tam ${prec === 32 ? "tek duyarlılık 8 gerektirir" : "çift duyarlılık 16 gerektirir"} onaltılık basamak gerekir (girdiniz: ${h.length}).`, "hex");
    x = fromHex(h, prec);
    info = { bits: [...h].map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join(""), hex: h, stored: x };
  }
  const s = info.bits[0], e = info.bits.slice(1, 1 + E), f = info.bits.slice(1 + E);
  const ev = parseInt(e, 2);
  const allOnes = ev === 2 ** E - 1, zeroE = ev === 0, zeroF = !/1/.test(f);
  let kind, valTex;
  if (allOnes) { kind = zeroF ? "Sonsuz" : "Sayı değil (NaN)"; valTex = zeroF ? `${s === "1" ? "-" : "+"}\\infty` : "\\text{NaN}"; }
  else if (zeroE) { kind = zeroF ? "Sıfır" : "Normalden küçük sayı (subnormal)"; valTex = zeroF ? `${s === "1" ? "-" : "+"}0` : `(-1)^{${s}} \\times 0.f \\times 2^{${1 - bias}}`; }
  else { kind = "Normal sayı (normalized)"; valTex = `(-1)^{${s}} \\times 1.${f.replace(/0+$/, "") || "0"}_2 \\times 2^{${ev} - ${bias}} = (-1)^{${s}} \\times 1.f \\times 2^{${ev - bias}}`; }
  const grouped = `${s} ${e} ${f}`;
  const steps = [];
  if (mode === "encode" && isFinite(x) && x !== 0 && !zeroE) {
    const m = Math.abs(x), k = Math.floor(Math.log2(m));
    const kk = m / 2 ** k >= 2 ? k + 1 : m / 2 ** k < 1 ? k - 1 : k;
    steps.push(`İşaret biti: ${s}, çünkü sayı ${x < 0 ? "negatif" : "pozitif"}.`);
    steps.push({ text: "Mutlak değeri ikilik bilimsel biçimde yazarız:", tex: `${fmt(m, 10)} = ${fmt(m / 2 ** kk, 10)} \\times 2^{${kk}}` });
    steps.push({ text: "Sapmalı üs:", tex: `e = ${kk} + ${bias} = ${kk + bias} = ${e}_2` });
    steps.push(`Kesir kısmı: ikilik gösterimde «1.» sonrasındaki bitler, ${F} bite yuvarlanmış: ${f}.`);
  } else {
    steps.push(`Bitleri bölelim: işaret (1 bit), üs (${E} bit) ve kesir (${F} bit).`);
    steps.push({ text: `Saklanan üs ${e}₂ = ${ev}, tür: ${kind}.`, tex: valTex });
  }
  const results = [
    { label: "Onaltılık gösterim", value: `0x${info.hex}`, text: `0x${info.hex}` },
    { label: "Bitler (işaret | üs | kesir)", value: grouped, text: grouped },
    { label: "Tür", value: kind },
    { label: "Gerçek üs", value: allOnes || zeroE ? (zeroE && !zeroF ? String(1 - bias) : "—") : String(ev - bias) },
    { label: "Gerçekte saklanan değer", value: Number.isNaN(info.stored) ? "NaN" : shortExact(exact(info.stored)) }
  ];
  let copy = `0x${info.hex} = ${grouped}`;
  if (original !== null && isFinite(x)) {
    const over = !isFinite(info.stored), err = over ? null : decimalError(original, info.stored);
    results.push({ label: "Yuvarlama hatası", value: over ? "Aralık taşması (overflow), bu nedenle sonsuz oldu" : err === null ? "Sıfır (kesin gösterim)" : `${err.abs} (göreli ${err.rel})` });
    if (!over && err !== null) steps.push(`${original} sayısı ikilik sistemde tam olarak gösterilemez; mümkün olan en yakın sayı saklanır. Bu nedenle 0.1 + 0.2 ≠ 0.3 gibi hatalar görülür.`);
    if (prec === 32 && !isFinite(info.stored)) steps.push("Sayı, tek duyarlılıktaki en büyük değerden (≈ 3.4 × 10^38) büyük olduğu için sonsuz oldu.");
  }
  results.push({ label: "Bu duyarlılığın sınırları", value: prec === 32 ? "En büyük ≈ 3.403e38, en küçük normal ≈ 1.175e-38, duyarlılık ≈ 7 ondalık basamak" : "En büyük ≈ 1.798e308, en küçük normal ≈ 2.225e-308, duyarlılık ≈ 15–16 ondalık basamak" });
  return {
    results, steps, copy,
    blocks: [{ type: "table", ltr: true, caption: "Bit bölümü", head: ["Alan", "Bit sayısı", "Değer"], rows: [["Sign", "1", s], ["Exponent", String(E), `${e} (${ev})`], ["Fraction", String(F), f]] }]
  };
}
