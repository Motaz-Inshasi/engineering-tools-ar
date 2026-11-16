import { parseComplex, cclean } from "./complex.js";
import { parseNumber } from "./format.js";
import { str, fail, isBlank } from "./validate.js";

export function readComplex(input, key, label, opts = {}) {
  if (isBlank(input[key]) && opts.optional) return null;
  const s = str(input, key, label);
  const z = parseComplex(s, parseNumber);
  if (!z || !isFinite(z.re) || !isFinite(z.im)) fail(`${label} کی شکل درست نہیں۔ اسے 3+4j یا 5∠53.13 کی طرح لکھیں۔`, key);
  return cclean(z, 1e-14);
}
