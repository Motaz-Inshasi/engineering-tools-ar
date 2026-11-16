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
    fail(`Saisissez une valeur pour ${label}.`, key);
  }
  const v = parseNumber(raw);
  if (Number.isNaN(v)) fail(`La valeur ${label} n'est pas un nombre valide.`, key);
  if (!opts.allowInfinity && !isFinite(v)) fail(`La valeur ${label} doit être finie.`, key);
  if (opts.integer && !Number.isInteger(v)) fail(`${label} doit être un nombre entier.`, key);
  if (opts.positive && !(v > 0)) fail(`${label} doit être supérieur à zéro.`, key);
  if (opts.nonNegative && v < 0) fail(`${label} ne peut pas être négatif.`, key);
  if (opts.nonZero && v === 0) fail(`${label} ne peut pas être égal à zéro.`, key);
  if (opts.min !== undefined && v < opts.min) fail(`${label} ne doit pas être inférieur à ${opts.min}.`, key);
  if (opts.max !== undefined && v > opts.max) fail(`${label} ne doit pas dépasser ${opts.max}.`, key);
  if (opts.below !== undefined && !(v < opts.below)) fail(`${label} doit être inférieur à ${opts.below}.`, key);
  return v;
}

export function str(input, key, label, opts = {}) {
  const raw = input[key];
  if (isBlank(raw)) {
    if ("default" in opts) return opts.default;
    if (opts.optional) return "";
    fail(`Saisissez ${label}.`, key);
  }
  return normalizeDigits(String(raw));
}

export function choice(input, key, label, allowed, def) {
  const raw = isBlank(input[key]) ? def : String(input[key]);
  if (!allowed.includes(raw)) fail(`Choisissez une valeur valide pour ${label}.`, key);
  return raw;
}

export function numList(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const parts = raw.split(/[\s,;،؛]+/).filter((p) => p !== "");
  if (parts.length === 0) fail(`Saisissez ${label}.`, key);
  const out = parts.map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`La valeur «${p}» dans ${label} n'est pas un nombre valide.`, key);
    if (opts.positive && !(v > 0)) fail(`Toutes les valeurs de ${label} doivent être supérieures à zéro.`, key);
    return v;
  });
  if (opts.min && out.length < opts.min) fail(`${label} nécessite au moins ${opts.min} valeurs.`, key);
  if (opts.max && out.length > opts.max) fail(`${label} accepte au plus ${opts.max} valeurs.`, key);
  return out;
}

export function matrixInput(input, key, label, opts = {}) {
  const raw = str(input, key, label);
  const rows = raw.split(/\r?\n|;|؛/).map((r) => r.trim()).filter((r) => r !== "");
  const m = rows.map((r) => r.split(/[\s,،]+/).filter((p) => p !== "").map((p) => {
    const v = parseNumber(p);
    if (!isFinite(v)) fail(`La valeur «${p}» dans ${label} n'est pas un nombre valide.`, key);
    return v;
  }));
  if (m.length === 0) fail(`Saisissez ${label}.`, key);
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) fail(`Toutes les lignes de ${label} doivent contenir le même nombre de valeurs.`, key);
  if (opts.square && m.length !== cols) fail(`${label} doit être une matrice carrée.`, key);
  if (opts.maxSize && (m.length > opts.maxSize || cols > opts.maxSize)) fail(`La taille maximale de ${label} est ${opts.maxSize}×${opts.maxSize}.`, key);
  return m;
}
