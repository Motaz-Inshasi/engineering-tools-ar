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
    fail(`${label} değerini girin.`, key);
  }
  const v = parseNumber(raw);
  if (Number.isNaN(v)) fail(`${label} değeri geçerli bir sayı değil.`, key);
  if (!opts.allowInfinity && !isFinite(v)) fail(`${label} değeri sonlu olmalıdır.`, key);
  if (opts.integer && !Number.isInteger(v)) fail(`${label} bir tam sayı olmalıdır.`, key);
  if (opts.positive && !(v > 0)) fail(`${label} sıfırdan büyük olmalıdır.`, key);
  if (opts.nonNegative && v < 0) fail(`${label} negatif olamaz.`, key);
  if (opts.nonZero && v === 0) fail(`${label} sıfıra eşit olamaz.`, key);
  if (opts.min !== undefined && v < opts.min) fail(`${label} en az ${opts.min} olmalıdır.`, key);
  if (opts.max !== undefined && v > opts.max) fail(`${label} en fazla ${opts.max} olabilir.`, key);
  if (opts.below !== undefined && !(v < opts.below)) fail(`${label} ${opts.below} değerinden küçük olmalıdır.`, key);
  return v;
}

export function str(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return "";
    fail(`${label} girin.`, key);
  }
  return normalizeDigits(String(raw));
}

export function choice(input, key, label, allowed, def) {
  const raw = isBlank(input[key]) ? def : String(input[key]);
  if (!allowed.includes(raw)) fail(`${label} için geçerli bir değer seçin.`, key);
  return raw;
}

export function numList(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const parts = raw.split(/[\s,;،؛]+/).filter((p) => p !== "");
  if (parts.length === 0) fail(`${label} girin.`, key);
  const out = parts.map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`${label} içindeki «${p}» değeri geçerli bir sayı değil.`, key);
    if (opts.positive && !(v > 0)) fail(`${label} içindeki bütün değerler sıfırdan büyük olmalıdır.`, key);
    return v;
  });
  if (opts.min && out.length < opts.min) fail(`${label} en az ${opts.min} değer gerektirir.`, key);
  if (opts.max && out.length > opts.max) fail(`${label} en fazla ${opts.max} değer kabul eder.`, key);
  return out;
}

export function matrixInput(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const rows = raw.split(/\r?\n|;|؛/).map((r) => r.trim()).filter((r) => r !== "");
  const m = rows.map((r) => r.split(/[\s,،]+/).filter((p) => p !== "").map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`${label} içindeki «${p}» değeri geçerli bir sayı değil.`, key);
    return v;
  }));
  if (m.length === 0) fail(`${label} girin.`, key);
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) fail(`${label} satırlarının tamamı aynı sayıda değer içermelidir.`, key);
  if (opts.square && m.length !== cols) fail(`${label} kare matris olmalıdır.`, key);
  if (opts.maxSize && (m.length > opts.maxSize || cols > opts.maxSize)) fail(`${label} için en büyük boyut ${opts.maxSize}×${opts.maxSize}'dir.`, key);
  return m;
}
