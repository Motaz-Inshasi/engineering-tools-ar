import { str, fail } from "../core/validate.js";
import { parse } from "../core/parser.js";
import { toRational, Unsupported, trim, degree, pevalC, toTex as ptex, factorTex, distinctRoots } from "../core/polynomial.js";
import { C, cdiv } from "../core/complex.js";

export function readTF(input, key = "G", label = "دالة التحويل", opts = {}) {
  const s = str(input, key, label);
  let r;
  try {
    r = toRational(parse(s, ["s"]), "s");
  } catch (e) {
    if (e instanceof Unsupported) fail(`${label} يجب أن تكون دالة كسرية في s (بسط ومقام كثيرات حدود).`, key);
    if (e.name === "InputError") fail(`${label}: ${e.message}`, key);
    throw e;
  }
  const num = trim(r.num.map((x) => (Math.abs(x) < 1e-14 ? 0 : x)));
  const den = trim(r.den.map((x) => (Math.abs(x) < 1e-14 ? 0 : x)));
  if (num.every((x) => x === 0)) fail(`${label} تساوي صفراً.`, key);
  if (opts.polynomial && degree(den) > 0) fail(`${label} يجب أن تكون كثيرة حدود وليست كسراً.`, key);
  if (!opts.polynomial && opts.needDen !== false && degree(den) < 1) fail(`مقام ${label} يجب أن يحتوي s.`, key);
  if (degree(den) > 12 || degree(num) > 12) fail(`أقصى درجة هي 12.`, key);
  return { num, den };
}

export function tfTex(tf) {
  const d = trim(tf.den);
  if (d.length === 1) return ptex(tf.num.map((x) => x / d[0]), "s");
  return `\\frac{${ptex(tf.num, "s")}}{${ptex(d, "s")}}`;
}

export function tfFactorTex(tf) {
  const lead = tf.num[tf.num.length - 1] / tf.den[tf.den.length - 1];
  const nTex = degree(tf.num) > 0 ? factorTex(tf.num.map((x) => x / tf.num[tf.num.length - 1]), "s") : "1";
  const dTex = degree(tf.den) > 0 ? factorTex(tf.den.map((x) => x / tf.den[tf.den.length - 1]), "s") : "1";
  return { lead, nTex, dTex };
}

export function evalTF(tf, z) {
  return cdiv(pevalC(tf.num, z), pevalC(tf.den, z));
}

export function polesZeros(tf) {
  return {
    zeros: degree(tf.num) > 0 ? distinctRoots(tf.num) : [],
    poles: degree(tf.den) > 0 ? distinctRoots(tf.den) : []
  };
}

export function logspace(a, b, n) {
  const la = Math.log10(a), lb = Math.log10(b);
  return Array.from({ length: n }, (_, i) => Math.pow(10, la + ((lb - la) * i) / (n - 1)));
}

export { C };
