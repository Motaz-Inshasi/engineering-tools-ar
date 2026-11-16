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
    fail(`${label} کی قدر درج کریں۔`, key);
  }
  const v = parseNumber(raw);
  if (Number.isNaN(v)) fail(`${label} کی قدر ایک درست عدد نہیں ہے۔`, key);
  if (!opts.allowInfinity && !isFinite(v)) fail(`${label} کی قدر محدود ہونی چاہیے۔`, key);
  if (opts.integer && !Number.isInteger(v)) fail(`${label} ایک صحیح عدد ہونا چاہیے۔`, key);
  if (opts.positive && !(v > 0)) fail(`${label} صفر سے بڑا ہونا چاہیے۔`, key);
  if (opts.nonNegative && v < 0) fail(`${label} منفی نہیں ہو سکتا۔`, key);
  if (opts.nonZero && v === 0) fail(`${label} صفر کے برابر نہیں ہو سکتا۔`, key);
  if (opts.min !== undefined && v < opts.min) fail(`${label} کم از کم ${opts.min} ہونا چاہیے۔`, key);
  if (opts.max !== undefined && v > opts.max) fail(`${label} زیادہ سے زیادہ ${opts.max} ہو سکتا ہے۔`, key);
  if (opts.below !== undefined && !(v < opts.below)) fail(`${label} ${opts.below} سے کم ہونا چاہیے۔`, key);
  return v;
}

export function str(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return "";
    fail(`${label} درج کریں۔`, key);
  }
  return normalizeDigits(String(raw));
}

export function choice(input, key, label, allowed, def) {
  const raw = isBlank(input[key]) ? def : String(input[key]);
  if (!allowed.includes(raw)) fail(`${label} کے لیے درست قدر منتخب کریں۔`, key);
  return raw;
}

export function numList(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const parts = raw.split(/[\s,;،؛]+/).filter((p) => p !== "");
  if (parts.length === 0) fail(`${label} درج کریں۔`, key);
  const out = parts.map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`${label} میں قدر «${p}» ایک درست صحیح عدد نہیں ہے۔`, key);
    if (opts.positive && !(v > 0)) fail(`${label} کی تمام قدریں صفر سے بڑی ہونی چاہئیں۔`, key);
    return v;
  });
  if (opts.min && out.length < opts.min) fail(`${label} کے لیے کم از کم ${opts.min} قدریں درکار ہیں۔`, key);
  if (opts.max && out.length > opts.max) fail(`${label} زیادہ سے زیادہ ${opts.max} قدریں قبول کرتا ہے۔`, key);
  return out;
}

export function matrixInput(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const rows = raw.split(/\r?\n|;|؛/).map((r) => r.trim()).filter((r) => r !== "");
  const m = rows.map((r) => r.split(/[\s,،]+/).filter((p) => p !== "").map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`${label} میں قدر «${p}» ایک درست صحیح عدد نہیں ہے۔`, key);
    return v;
  }));
  if (m.length === 0) fail(`${label} درج کریں۔`, key);
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) fail(`${label} کی ہر قطار میں قدروں کی تعداد یکساں ہونی چاہیے۔`, key);
  if (opts.square && m.length !== cols) fail(`${label} مربع ہونا چاہیے۔`, key);
  if (opts.maxSize && (m.length > opts.maxSize || cols > opts.maxSize)) fail(`${label} کا زیادہ سے زیادہ حجم ${opts.maxSize}×${opts.maxSize} ہے۔`, key);
  return m;
}
