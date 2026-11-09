import { fmt, tex as ntex } from "./format.js";

export const C = (re, im = 0) => ({ re, im });
export const isC = (z) => z && typeof z === "object" && "re" in z && "im" in z;
export const toC = (z) => (isC(z) ? z : C(z, 0));
export const cadd = (a, b) => C(a.re + b.re, a.im + b.im);
export const csub = (a, b) => C(a.re - b.re, a.im - b.im);
export const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const cscale = (a, k) => C(a.re * k, a.im * k);
export const cneg = (a) => C(-a.re, -a.im);
export const cconj = (a) => C(a.re, -a.im);
export const cabs = (a) => Math.hypot(a.re, a.im);
export const carg = (a) => Math.atan2(a.im, a.re);
export const cpolar = (r, th) => C(r * Math.cos(th), r * Math.sin(th));

export function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return C(NaN, NaN);
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}

export function cinv(a) {
  return cdiv(C(1, 0), a);
}

export function cexp(a) {
  const e = Math.exp(a.re);
  return C(e * Math.cos(a.im), e * Math.sin(a.im));
}

export function clog(a) {
  return C(Math.log(cabs(a)), carg(a));
}

export function cpow(a, n) {
  if (a.re === 0 && a.im === 0) return n === 0 ? C(1, 0) : C(0, 0);
  if (Number.isInteger(n) && Math.abs(n) <= 64) {
    let r = C(1, 0), b = n < 0 ? cinv(a) : a;
    for (let i = 0; i < Math.abs(n); i++) r = cmul(r, b);
    return r;
  }
  return cpolar(Math.pow(cabs(a), n), carg(a) * n);
}

export function csqrt(a) {
  const r = cabs(a);
  const re = Math.sqrt((r + a.re) / 2);
  const im = Math.sqrt(Math.max(0, (r - a.re) / 2));
  return C(re, a.im < 0 ? -im : im);
}

export function croots(a, n) {
  const r = Math.pow(cabs(a), 1 / n), th = carg(a);
  const out = [];
  for (let k = 0; k < n; k++) out.push(cpolar(r, (th + 2 * Math.PI * k) / n));
  return out;
}

export function cclean(z, tol = 1e-12) {
  const m = Math.max(1, cabs(z));
  let re = Math.abs(z.re) < tol * m ? 0 : z.re;
  let im = Math.abs(z.im) < tol * m ? 0 : z.im;
  return C(re, im);
}

export function cnear(a, b, tol = 1e-9) {
  return cabs(csub(a, b)) <= tol * Math.max(1, cabs(a), cabs(b));
}

export function cfmt(z, sig = 6, unit = "j") {
  z = cclean(z, 1e-10);
  if (z.im === 0) return fmt(z.re, sig);
  const im = fmt(Math.abs(z.im), sig);
  const imPart = `${im === "1" ? "" : im}${unit}`;
  if (z.re === 0) return `${z.im < 0 ? "-" : ""}${imPart}`;
  return `${fmt(z.re, sig)} ${z.im < 0 ? "-" : "+"} ${imPart}`;
}

export function ctex(z, sig = 6, unit = "j") {
  z = cclean(z, 1e-10);
  if (z.im === 0) return ntex(z.re, sig);
  const im = ntex(Math.abs(z.im), sig);
  const imPart = `${im === "1" ? "" : im}${unit}`;
  if (z.re === 0) return `${z.im < 0 ? "-" : ""}${imPart}`;
  return `${ntex(z.re, sig)} ${z.im < 0 ? "-" : "+"} ${imPart}`;
}

export function cpolarTex(z, sig = 6) {
  return `${ntex(cabs(z), sig)} \\angle ${ntex(carg(z) * 180 / Math.PI, sig)}^\\circ`;
}

export function cpolarText(z, sig = 6) {
  return `${fmt(cabs(z), sig)} ∠ ${fmt(carg(z) * 180 / Math.PI, sig)}°`;
}
