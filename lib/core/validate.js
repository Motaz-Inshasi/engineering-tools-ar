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
    fail(`أدخل قيمة ${label}.`, key);
  }
  const v = parseNumber(raw);
  if (Number.isNaN(v)) fail(`قيمة ${label} ليست رقماً صحيحاً.`, key);
  if (!opts.allowInfinity && !isFinite(v)) fail(`قيمة ${label} يجب أن تكون محدودة.`, key);
  if (opts.integer && !Number.isInteger(v)) fail(`${label} يجب أن يكون عدداً صحيحاً.`, key);
  if (opts.positive && !(v > 0)) fail(`${label} يجب أن يكون أكبر من صفر.`, key);
  if (opts.nonNegative && v < 0) fail(`${label} لا يمكن أن يكون سالباً.`, key);
  if (opts.nonZero && v === 0) fail(`${label} لا يمكن أن يساوي صفراً.`, key);
  if (opts.min !== undefined && v < opts.min) fail(`${label} يجب ألا يقل عن ${opts.min}.`, key);
  if (opts.max !== undefined && v > opts.max) fail(`${label} يجب ألا يزيد عن ${opts.max}.`, key);
  if (opts.below !== undefined && !(v < opts.below)) fail(`${label} يجب أن يكون أقل من ${opts.below}.`, key);
  return v;
}

export function str(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return "";
    fail(`أدخل ${label}.`, key);
  }
  return normalizeDigits(String(raw));
}

export function choice(input, key, label, allowed, def) {
  const raw = isBlank(input[key]) ? def : String(input[key]);
  if (!allowed.includes(raw)) fail(`اختر قيمة صحيحة لـ ${label}.`, key);
  return raw;
}

export function numList(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const parts = raw.split(/[\s,;،؛]+/).filter((p) => p !== "");
  if (parts.length === 0) fail(`أدخل ${label}.`, key);
  const out = parts.map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`القيمة «${p}» في ${label} ليست رقماً صحيحاً.`, key);
    if (opts.positive && !(v > 0)) fail(`كل القيم في ${label} يجب أن تكون أكبر من صفر.`, key);
    return v;
  });
  if (opts.min && out.length < opts.min) fail(`${label} يحتاج ${opts.min} قيم على الأقل.`, key);
  if (opts.max && out.length > opts.max) fail(`${label} يقبل ${opts.max} قيم على الأكثر.`, key);
  return out;
}

export function matrixInput(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const rows = raw.split(/\r?\n|;|؛/).map((r) => r.trim()).filter((r) => r !== "");
  const m = rows.map((r) => r.split(/[\s,،]+/).filter((p) => p !== "").map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`القيمة «${p}» في ${label} ليست رقماً صحيحاً.`, key);
    return v;
  }));
  if (m.length === 0) fail(`أدخل ${label}.`, key);
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) fail(`كل صفوف ${label} يجب أن تحتوي العدد نفسه من القيم.`, key);
  if (opts.square && m.length !== cols) fail(`${label} يجب أن تكون مربعة.`, key);
  if (opts.maxSize && (m.length > opts.maxSize || cols > opts.maxSize)) fail(`أقصى حجم لـ ${label} هو ${opts.maxSize}×${opts.maxSize}.`, key);
  return m;
}
