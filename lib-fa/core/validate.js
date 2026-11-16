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
    fail(`مقدار ${label} را وارد کنید.`, key);
  }
  const v = parseNumber(raw);
  if (Number.isNaN(v)) fail(`مقدار ${label} عدد معتبری نیست.`, key);
  if (!opts.allowInfinity && !isFinite(v)) fail(`مقدار ${label} باید متناهی باشد.`, key);
  if (opts.integer && !Number.isInteger(v)) fail(`${label} باید عدد صحیح باشد.`, key);
  if (opts.positive && !(v > 0)) fail(`${label} باید بزرگ‌تر از صفر باشد.`, key);
  if (opts.nonNegative && v < 0) fail(`${label} نمی‌تواند منفی باشد.`, key);
  if (opts.nonZero && v === 0) fail(`${label} نمی‌تواند برابر صفر باشد.`, key);
  if (opts.min !== undefined && v < opts.min) fail(`${label} نباید کمتر از ${opts.min} باشد.`, key);
  if (opts.max !== undefined && v > opts.max) fail(`${label} نباید بیشتر از ${opts.max} باشد.`, key);
  if (opts.below !== undefined && !(v < opts.below)) fail(`${label} باید کمتر از ${opts.below} باشد.`, key);
  return v;
}

export function str(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return "";
    fail(`${label} را وارد کنید.`, key);
  }
  return normalizeDigits(String(raw));
}

export function choice(input, key, label, allowed, def) {
  const raw = isBlank(input[key]) ? def : String(input[key]);
  if (!allowed.includes(raw)) fail(`یک مقدار معتبر برای ${label} انتخاب کنید.`, key);
  return raw;
}

export function numList(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const parts = raw.split(/[\s,;،؛]+/).filter((p) => p !== "");
  if (parts.length === 0) fail(`${label} را وارد کنید.`, key);
  const out = parts.map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`مقدار «${p}» در ${label} عدد معتبری نیست.`, key);
    if (opts.positive && !(v > 0)) fail(`همهٔ مقادیر در ${label} باید بزرگ‌تر از صفر باشند.`, key);
    return v;
  });
  if (opts.min && out.length < opts.min) fail(`${label} حداقل به ${opts.min} مقدار نیاز دارد.`, key);
  if (opts.max && out.length > opts.max) fail(`${label} حداکثر ${opts.max} مقدار می‌پذیرد.`, key);
  return out;
}

export function matrixInput(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const rows = raw.split(/\r?\n|;|؛/).map((r) => r.trim()).filter((r) => r !== "");
  const m = rows.map((r) => r.split(/[\s,،]+/).filter((p) => p !== "").map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`مقدار «${p}» در ${label} عدد معتبری نیست.`, key);
    return v;
  }));
  if (m.length === 0) fail(`${label} را وارد کنید.`, key);
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) fail(`همهٔ سطرهای ${label} باید تعداد یکسانی مقدار داشته باشند.`, key);
  if (opts.square && m.length !== cols) fail(`${label} باید مربعی باشد.`, key);
  if (opts.maxSize && (m.length > opts.maxSize || cols > opts.maxSize)) fail(`بیشترین اندازه برای ${label} برابر ${opts.maxSize}×${opts.maxSize} است.`, key);
  return m;
}
