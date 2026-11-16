import { parseNumber, normalizeDigits } from "./format.js";

export class InputError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "InputError";
    this.field = field;
  }
}

export function fail(message, field = null) {
  throw new InputError(message, field);
}

export function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

export function num(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return null;
    fail(`Masukkan nilai ${label}.`, key);
  }
  const v = parseNumber(raw);
  if (Number.isNaN(v)) fail(`Nilai ${label} bukan angka yang valid.`, key);
  if (!opts.allowInfinity && !isFinite(v)) fail(`Nilai ${label} harus berhingga.`, key);
  if (opts.integer && !Number.isInteger(v)) fail(`${label} harus berupa bilangan bulat.`, key);
  if (opts.positive && !(v > 0)) fail(`${label} harus lebih besar dari nol.`, key);
  if (opts.nonNegative && v < 0) fail(`${label} tidak boleh negatif.`, key);
  if (opts.nonZero && v === 0) fail(`${label} tidak boleh sama dengan nol.`, key);
  if (opts.min !== undefined && v < opts.min) fail(`${label} tidak boleh kurang dari ${opts.min}.`, key);
  if (opts.max !== undefined && v > opts.max) fail(`${label} tidak boleh lebih dari ${opts.max}.`, key);
  if (opts.below !== undefined && !(v < opts.below)) fail(`${label} harus lebih kecil dari ${opts.below}.`, key);
  return v;
}

export function str(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return "";
    fail(`Masukkan ${label}.`, key);
  }
  return normalizeDigits(String(raw));
}

export function choice(input, key, label, allowed, def) {
  const raw = isBlank(input[key]) ? def : String(input[key]);
  if (!allowed.includes(raw)) fail(`Pilih nilai yang benar untuk ${label}.`, key);
  return raw;
}

export function numList(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const parts = raw.split(/[\s,;،؛]+/).filter((p) => p !== "");
  if (parts.length === 0) fail(`Masukkan ${label}.`, key);
  const out = parts.map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`Nilai «${p}» pada ${label} bukan angka yang valid.`, key);
    if (opts.positive && !(v > 0)) fail(`Semua nilai pada ${label} harus lebih besar dari nol.`, key);
    return v;
  });
  if (opts.min && out.length < opts.min) fail(`${label} memerlukan minimal ${opts.min} nilai.`, key);
  if (opts.max && out.length > opts.max) fail(`${label} menerima maksimal ${opts.max} nilai.`, key);
  return out;
}

export function matrixInput(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const rows = raw.split(/\r?\n|;|؛/).map((r) => r.trim()).filter((r) => r !== "");
  const m = rows.map((r) => r.split(/[\s,،]+/).filter((p) => p !== "").map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`Nilai «${p}» pada ${label} bukan angka yang valid.`, key);
    return v;
  }));
  if (m.length === 0) fail(`Masukkan ${label}.`, key);
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) fail(`Semua baris ${label} harus memiliki jumlah nilai yang sama.`, key);
  if (opts.square && m.length !== cols) fail(`${label} harus berbentuk persegi.`, key);
  if (opts.maxSize && (m.length > opts.maxSize || cols > opts.maxSize)) fail(`Ukuran maksimum ${label} adalah ${opts.maxSize}×${opts.maxSize}.`, key);
  return m;
}
