const PREFIXES = [
  [1e24, "Y"], [1e21, "Z"], [1e18, "E"], [1e15, "P"], [1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"],
  [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"], [1e-18, "a"], [1e-21, "z"], [1e-24, "y"]
];

const SUFFIX = {
  T: 1e12, G: 1e9, M: 1e6, meg: 1e6, MEG: 1e6, k: 1e3, K: 1e3,
  m: 1e-3, u: 1e-6, "µ": 1e-6, "μ": 1e-6, n: 1e-9, p: 1e-12, f: 1e-15
};

export function normalizeDigits(s) {
  return String(s)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/٫/g, ".")
    .replace(/٬/g, "")
    .replace(/[−–]/g, "-")
    .replace(/×\s*10\^?/g, "e")
    .trim();
}

export function parseNumber(input) {
  if (typeof input === "number") return input;
  if (input === null || input === undefined) return NaN;
  let s = normalizeDigits(input).replace(/\s+/g, "");
  if (s === "") return NaN;
  if (/^[+-]?(inf|infinity|∞)$/i.test(s)) return s.startsWith("-") ? -Infinity : Infinity;
  const m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(meg|MEG|[TGMkKmuµμnpf])?$/);
  if (!m) return NaN;
  const v = parseFloat(m[1]);
  return m[2] ? v * SUFFIX[m[2]] : v;
}

function clean(x) {
  return Object.is(x, -0) ? 0 : x;
}

export function round(x, sig = 6) {
  if (!isFinite(x) || x === 0) return clean(x);
  return clean(Number(x.toPrecision(sig)));
}

export function fmt(x, sig = 6) {
  if (typeof x !== "number") return String(x);
  if (Number.isNaN(x)) return "غير معرّف";
  if (x === Infinity) return "∞";
  if (x === -Infinity) return "-∞";
  x = clean(x);
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1e9 || a < 1e-4) {
    const [m, e] = x.toExponential(sig - 1).split("e");
    return `${stripZeros(m)}e${Number(e)}`;
  }
  return stripZeros(String(Number(x.toPrecision(sig))));
}

function stripZeros(s) {
  return s.includes(".") && !s.includes("e") ? s.replace(/\.?0+$/, "") : s;
}

export function tex(x, sig = 6) {
  if (typeof x !== "number") return String(x);
  if (Number.isNaN(x)) return "\\text{NaN}";
  if (x === Infinity) return "\\infty";
  if (x === -Infinity) return "-\\infty";
  const s = fmt(x, sig);
  const m = s.match(/^(-?[\d.]+)e(-?\d+)$/);
  return m ? `${m[1]} \\times 10^{${m[2]}}` : s;
}

export function eng(x, unit = "", sig = 4) {
  if (!isFinite(x)) return `${fmt(x)}${unit ? " " + unit : ""}`;
  x = clean(x);
  if (x === 0) return `0${unit ? " " + unit : ""}`;
  const a = Math.abs(x);
  let chosen = PREFIXES[PREFIXES.length - 1];
  for (const p of PREFIXES) {
    if (a >= p[0] * 0.9999999) { chosen = p; break; }
  }
  let v = Number((x / chosen[0]).toPrecision(sig));
  const idx = PREFIXES.indexOf(chosen);
  if (Math.abs(v) >= 1000 && idx > 0) {
    chosen = PREFIXES[idx - 1];
    v = Number((x / chosen[0]).toPrecision(sig));
  }
  return `${v}${unit || chosen[1] ? " " : ""}${chosen[1]}${unit}`;
}

export function toFraction(x, maxDen = 1000, tol = 1e-9) {
  if (!isFinite(x)) return null;
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  if (Math.abs(a - Math.round(a)) <= tol * Math.max(1, a)) return [sign * Math.round(a), 1];
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = a;
  for (let i = 0; i < 40; i++) {
    const ai = Math.floor(b);
    const h2 = ai * h1 + h0, k2 = ai * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(a - h1 / k1) <= tol * Math.max(1, a)) return [sign * h1, k1];
    const r = b - ai;
    if (r < 1e-15) break;
    b = 1 / r;
  }
  return null;
}

export function niceTex(x, sig = 6) {
  if (typeof x !== "number" || !isFinite(x)) return tex(x, sig);
  const f = toFraction(x, 100);
  if (f && f[1] !== 1) return `${f[0] < 0 ? "-" : ""}\\frac{${Math.abs(f[0])}}{${f[1]}}`;
  if (f) return String(f[0]);
  return tex(x, sig);
}

export function nice(x, sig = 6) {
  if (typeof x !== "number" || !isFinite(x)) return fmt(x, sig);
  const f = toFraction(x, 100);
  if (f) return f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`;
  return fmt(x, sig);
}

export function deg(rad) {
  return rad * 180 / Math.PI;
}

export function rad(d) {
  return d * Math.PI / 180;
}
