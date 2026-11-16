const XGK = [0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926, 0.741531185599394439863864773280788, 0.586087235467691130294144845693013, 0.405845151377397166906606412076961, 0.207784955007898467600689403773245, 0];
const WGK = [0.022935322010529224963732008058970, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518, 0.140653259715525918745189590510238, 0.169004726639267902826583426598550, 0.190350578064785409913256402421014, 0.204432940075298892414161999234649, 0.209482141084727828012999174891714];
const WG = [0.129484966168869693270611432679082, 0.279705391489276667901467771423780, 0.381830050505118944950369775488975, 0.417959183673469387755102040816327];

function gk15(f, a, b) {
  const c = (a + b) / 2, h = (b - a) / 2;
  const fc = f(c);
  let k = fc * WGK[7], g = fc * WG[3];
  for (let j = 0; j < 7; j++) {
    const dx = h * XGK[j];
    const f1 = f(c - dx), f2 = f(c + dx);
    k += WGK[j] * (f1 + f2);
    if (j % 2 === 1) g += WG[(j - 1) / 2] * (f1 + f2);
  }
  return { value: k * h, error: Math.abs((k - g) * h) };
}

export function integrateNumeric(f, a, b, opts = {}) {
  const tol = opts.tol ?? 1e-10;
  const maxIntervals = opts.maxIntervals ?? 2000;
  if (a === b) return { value: 0, error: 0, ok: true, intervals: 0 };
  if (a > b) {
    const r = integrateNumeric(f, b, a, opts);
    return { ...r, value: -r.value };
  }
  let g = f, lo = a, hi = b;
  if (!isFinite(a) && !isFinite(b)) {
    g = (t) => { const x = t / (1 - t * t); return f(x) * (1 + t * t) / Math.pow(1 - t * t, 2); };
    lo = -1; hi = 1;
  } else if (!isFinite(b)) {
    g = (t) => f(a + t / (1 - t)) / Math.pow(1 - t, 2);
    lo = 0; hi = 1;
  } else if (!isFinite(a)) {
    g = (t) => f(b - (1 - t) / t) / (t * t);
    lo = 0; hi = 1;
  }
  const safe = (x) => {
    const y = g(x);
    return Number.isFinite(y) ? y : NaN;
  };
  let list = [{ a: lo, b: hi, ...gk15(safe, lo, hi) }];
  let bad = false;
  for (let it = 0; it < maxIntervals; it++) {
    let total = 0, err = 0, worst = 0;
    for (let i = 0; i < list.length; i++) {
      total += list[i].value; err += list[i].error;
      if (list[i].error > list[worst].error) worst = i;
    }
    if (!isFinite(total)) { bad = true; break; }
    if (err <= Math.max(tol * Math.abs(total), tol)) return { value: total, error: err, ok: true, intervals: list.length };
    const w = list[worst];
    const m = (w.a + w.b) / 2;
    if (m === w.a || m === w.b) break;
    list.splice(worst, 1, { a: w.a, b: m, ...gk15(safe, w.a, m) }, { a: m, b: w.b, ...gk15(safe, m, w.b) });
  }
  let total = 0, err = 0;
  for (const s of list) { total += s.value; err += s.error; }
  return { value: total, error: err, ok: !bad && isFinite(total) && err <= 1e-6 * Math.max(1, Math.abs(total)), intervals: list.length };
}

export function simpson(f, a, b, n = 1000) {
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

export function derivNumeric(f, x, order = 1) {
  const h = (order === 1 ? 1e-4 : 1e-3) * Math.max(1, Math.abs(x));
  if (order === 1) return (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);
  if (order === 2) return (-f(x + 2 * h) + 16 * f(x + h) - 30 * f(x) + 16 * f(x - h) - f(x - 2 * h)) / (12 * h * h);
  throw new Error("order");
}

export function bisection(f, a, b, opts = {}) {
  const tol = opts.tol ?? 1e-10, maxIter = opts.maxIter ?? 200;
  let fa = f(a), fb = f(b);
  const rows = [];
  if (!isFinite(fa) || !isFinite(fb)) return { ok: false, reason: "undefined", rows };
  if (fa === 0) return { ok: true, root: a, rows, iterations: 0 };
  if (fb === 0) return { ok: true, root: b, rows, iterations: 0 };
  if (fa * fb > 0) return { ok: false, reason: "sign", rows };
  for (let i = 1; i <= maxIter; i++) {
    const m = (a + b) / 2, fm = f(m);
    rows.push({ i, a, b, x: m, fx: fm });
    if (fm === 0 || (b - a) / 2 < tol) return { ok: true, root: m, rows, iterations: i };
    if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return { ok: true, root: (a + b) / 2, rows, iterations: maxIter, maxed: true };
}

export function newton(f, df, x0, opts = {}) {
  const tol = opts.tol ?? 1e-12, maxIter = opts.maxIter ?? 100;
  let x = x0;
  const rows = [];
  for (let i = 1; i <= maxIter; i++) {
    const fx = f(x), d = df(x);
    if (!isFinite(fx) || !isFinite(d)) return { ok: false, reason: "undefined", rows };
    if (d === 0) return { ok: false, reason: "zeroDerivative", rows };
    const nx = x - fx / d;
    rows.push({ i, x, fx, dfx: d, next: nx });
    if (!isFinite(nx)) return { ok: false, reason: "diverged", rows };
    if (Math.abs(nx - x) <= tol * Math.max(1, Math.abs(nx))) return { ok: true, root: nx, rows, iterations: i };
    x = nx;
  }
  return { ok: false, reason: "maxIter", rows };
}

export function secant(f, x0, x1, opts = {}) {
  const tol = opts.tol ?? 1e-12, maxIter = opts.maxIter ?? 100;
  let f0 = f(x0), f1 = f(x1);
  const rows = [];
  for (let i = 1; i <= maxIter; i++) {
    if (!isFinite(f0) || !isFinite(f1)) return { ok: false, reason: "undefined", rows };
    if (f1 === f0) {
      if (f1 === 0) return { ok: true, root: x1, rows, iterations: i };
      return { ok: false, reason: "flat", rows };
    }
    const x2 = x1 - (f1 * (x1 - x0)) / (f1 - f0);
    rows.push({ i, x0, x1, fx1: f1, next: x2 });
    if (!isFinite(x2)) return { ok: false, reason: "diverged", rows };
    if (Math.abs(x2 - x1) <= tol * Math.max(1, Math.abs(x2))) return { ok: true, root: x2, rows, iterations: i };
    x0 = x1; f0 = f1; x1 = x2; f1 = f(x2);
  }
  return { ok: false, reason: "maxIter", rows };
}

export function linspace(a, b, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / (n - 1));
  return out;
}

export function sampleFunction(f, a, b, n = 400) {
  const pts = [];
  for (const x of linspace(a, b, n)) {
    let y;
    try { y = f(x); } catch { y = NaN; }
    pts.push([x, Number.isFinite(y) ? y : null]);
  }
  return pts;
}

export function approxEqual(a, b, rel = 1e-9, abs = 1e-12) {
  if (a === b) return true;
  return Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));
}
