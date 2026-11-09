import { C, cadd, cdiv, cmul, cabs, carg } from "../core/complex.js";

export const zR = (R) => C(R, 0);
export const zL = (L, w) => C(0, w * L);
export const zC = (Cap, w) => C(0, -1 / (w * Cap));
export const zsum = (...zs) => zs.reduce((a, b) => cadd(a, b), C(0, 0));
export const zpar = (...zs) => cdiv(C(1, 0), zs.reduce((a, z) => cadd(a, cdiv(C(1, 0), z)), C(0, 0)));
export const deg = (z) => (carg(z) * 180) / Math.PI;

export function phasorBlock(list, title = "مخطط الطور") {
  const m = Math.max(1e-30, ...list.map(([, z]) => cabs(z))) * 1.2;
  return {
    type: "plot", title, xLabel: "Re", yLabel: "Im", equalAspect: true, xMin: -m, xMax: m, yMin: -m, yMax: m,
    series: list.map(([name, z]) => ({ name, points: [[0, 0], [z.re, z.im]], line: true, marker: "o" }))
  };
}

export function scaleList(list) {
  const m = Math.max(1e-30, ...list.map(([, z]) => cabs(z)));
  return list.map(([n, z]) => [n, { re: z.re / m, im: z.im / m }]);
}

export { C, cadd, cdiv, cmul, cabs, carg };
