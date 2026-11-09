const E6 = [10, 15, 22, 33, 47, 68];
const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];
const E96 = [100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976];
const E48 = E96.filter((_, i) => i % 2 === 0);
const E192 = Array.from({ length: 192 }, (_, i) => {
  const v = Math.round(Math.pow(10, i / 192) * 100);
  return v === 919 ? 920 : v;
});

export const SERIES = { E6, E12, E24, E48, E96, E192 };
export const TOLERANCE = { E6: 20, E12: 10, E24: 5, E48: 2, E96: 1, E192: 0.5 };

export function decadeValues(series, minExp = -2, maxExp = 9) {
  const base = SERIES[series];
  const div = base[0];
  const out = [];
  for (let e = minExp; e <= maxExp; e++) for (const b of base) out.push(Number(((b / div) * Math.pow(10, e)).toPrecision(4)));
  return out;
}

export function nearest(x, series) {
  if (!(x > 0)) return null;
  const base = SERIES[series];
  const div = base[0];
  const e = Math.floor(Math.log10(x));
  const cands = [];
  for (const k of [e - 1, e, e + 1]) for (const b of base) cands.push(Number(((b / div) * Math.pow(10, k)).toPrecision(4)));
  cands.sort((a, b) => a - b);
  let below = null, above = null;
  for (const c of cands) {
    if (c <= x * (1 + 1e-12)) below = c;
    if (c >= x * (1 - 1e-12) && above === null) above = c;
  }
  const closest = [below, above].filter((v) => v !== null).sort((a, b) => Math.abs(Math.log(a / x)) - Math.abs(Math.log(b / x)))[0];
  return { below, above, closest };
}
