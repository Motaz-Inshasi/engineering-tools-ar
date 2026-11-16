import { parseComplex, cclean } from "./complex.js";
import { parseNumber } from "./format.js";
import { str, fail, isBlank } from "./validate.js";

export function readComplex(input, key, label, opts = {}) {
  if (isBlank(input[key]) && opts.optional) return null;
  const s = str(input, key, label);
  const z = parseComplex(s, parseNumber);
  if (!z || !isFinite(z.re) || !isFinite(z.im)) fail(`${label} biçimi hatalı. 3+4j veya 5∠53.13 gibi yazın.`, key);
  return cclean(z, 1e-14);
}
