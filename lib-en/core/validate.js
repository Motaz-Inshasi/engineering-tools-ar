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
    fail(`Enter a value for ${label}.`, key);
  }
  const v = parseNumber(raw);
  if (Number.isNaN(v)) fail(`The value of ${label} is not a valid number.`, key);
  if (!opts.allowInfinity && !isFinite(v)) fail(`The value of ${label} must be finite.`, key);
  if (opts.integer && !Number.isInteger(v)) fail(`${label} must be an integer.`, key);
  if (opts.positive && !(v > 0)) fail(`${label} must be greater than zero.`, key);
  if (opts.nonNegative && v < 0) fail(`${label} cannot be negative.`, key);
  if (opts.nonZero && v === 0) fail(`${label} cannot be zero.`, key);
  if (opts.min !== undefined && v < opts.min) fail(`${label} must be at least ${opts.min}.`, key);
  if (opts.max !== undefined && v > opts.max) fail(`${label} must be at most ${opts.max}.`, key);
  if (opts.below !== undefined && !(v < opts.below)) fail(`${label} must be less than ${opts.below}.`, key);
  return v;
}

export function str(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return "";
    fail(`Enter ${label}.`, key);
  }
  return normalizeDigits(String(raw));
}

export function choice(input, key, label, allowed, def) {
  const raw = isBlank(input[key]) ? def : String(input[key]);
  if (!allowed.includes(raw)) fail(`Choose a valid value for ${label}.`, key);
  return raw;
}

export function numList(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const parts = raw.split(/[\s,;،؛]+/).filter((p) => p !== "");
  if (parts.length === 0) fail(`Enter ${label}.`, key);
  const out = parts.map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`The value «${p}» in ${label} is not a valid number.`, key);
    if (opts.positive && !(v > 0)) fail(`All values in ${label} must be greater than zero.`, key);
    return v;
  });
  if (opts.min && out.length < opts.min) fail(`${label} needs at least ${opts.min} values.`, key);
  if (opts.max && out.length > opts.max) fail(`${label} accepts at most ${opts.max} values.`, key);
  return out;
}

export function matrixInput(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const rows = raw.split(/\r?\n|;|؛/).map((r) => r.trim()).filter((r) => r !== "");
  const m = rows.map((r) => r.split(/[\s,،]+/).filter((p) => p !== "").map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`The value «${p}» in ${label} is not a valid number.`, key);
    return v;
  }));
  if (m.length === 0) fail(`Enter ${label}.`, key);
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) fail(`All rows of ${label} must contain the same number of values.`, key);
  if (opts.square && m.length !== cols) fail(`${label} must be square.`, key);
  if (opts.maxSize && (m.length > opts.maxSize || cols > opts.maxSize)) fail(`The maximum size of ${label} is ${opts.maxSize}×${opts.maxSize}.`, key);
  return m;
}
