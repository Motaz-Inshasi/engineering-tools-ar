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
    fail(`Introduce un valor para ${label}.`, key);
  }
  const v = parseNumber(raw);
  if (Number.isNaN(v)) fail(`El valor de ${label} no es un número válido.`, key);
  if (!opts.allowInfinity && !isFinite(v)) fail(`El valor de ${label} debe ser finito.`, key);
  if (opts.integer && !Number.isInteger(v)) fail(`${label} debe ser un número entero.`, key);
  if (opts.positive && !(v > 0)) fail(`${label} debe ser mayor que cero.`, key);
  if (opts.nonNegative && v < 0) fail(`${label} no puede ser negativo.`, key);
  if (opts.nonZero && v === 0) fail(`${label} no puede ser igual a cero.`, key);
  if (opts.min !== undefined && v < opts.min) fail(`${label} no debe ser menor que ${opts.min}.`, key);
  if (opts.max !== undefined && v > opts.max) fail(`${label} no debe ser mayor que ${opts.max}.`, key);
  if (opts.below !== undefined && !(v < opts.below)) fail(`${label} debe ser menor que ${opts.below}.`, key);
  return v;
}

export function str(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return "";
    fail(`Introduce ${label}.`, key);
  }
  return normalizeDigits(String(raw));
}

export function choice(input, key, label, allowed, def) {
  const raw = isBlank(input[key]) ? def : String(input[key]);
  if (!allowed.includes(raw)) fail(`Elige un valor válido para ${label}.`, key);
  return raw;
}

export function numList(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const parts = raw.split(/[\s,;،؛]+/).filter((p) => p !== "");
  if (parts.length === 0) fail(`Introduce ${label}.`, key);
  const out = parts.map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`El valor «${p}» en ${label} no es un número entero.`, key);
    if (opts.positive && !(v > 0)) fail(`Todos los valores de ${label} deben ser mayores que cero.`, key);
    return v;
  });
  if (opts.min && out.length < opts.min) fail(`${label} necesita al menos ${opts.min} valores.`, key);
  if (opts.max && out.length > opts.max) fail(`${label} admite como máximo ${opts.max} valores.`, key);
  return out;
}

export function matrixInput(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const rows = raw.split(/\r?\n|;|؛/).map((r) => r.trim()).filter((r) => r !== "");
  const m = rows.map((r) => r.split(/[\s,،]+/).filter((p) => p !== "").map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`El valor «${p}» en ${label} no es un número entero.`, key);
    return v;
  }));
  if (m.length === 0) fail(`Introduce ${label}.`, key);
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) fail(`Todas las filas de ${label} deben tener el mismo número de valores.`, key);
  if (opts.square && m.length !== cols) fail(`${label} debe ser cuadrada.`, key);
  if (opts.maxSize && (m.length > opts.maxSize || cols > opts.maxSize)) fail(`El tamaño máximo de ${label} es ${opts.maxSize}×${opts.maxSize}.`, key);
  return m;
}
