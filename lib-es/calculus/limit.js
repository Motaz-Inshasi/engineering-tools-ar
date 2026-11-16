import { simplify, diff } from "../core/symbolic.js";
import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, toFraction, nice, niceTex } from "../core/format.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Calcula el límite de una función en un punto o en el infinito: por sustitución directa, por la regla de L'Hôpital para las formas indeterminadas, o por estimación numérica desde ambos lados con una tabla de aproximación.",
  keywords: ["límite", "límites", "limit", "L'Hôpital", "forma indeterminada", "límite por la derecha", "límite por la izquierda"],
  formulas: [
    { label: "Regla de L'Hôpital para la forma 0/0 o ∞/∞", tex: "\\lim_{x\\to a}\\frac{f(x)}{g(x)} = \\lim_{x\\to a}\\frac{f'(x)}{g'(x)}" },
    { label: "Existencia del límite", tex: "\\lim_{x\\to a} f(x) = L \\iff \\lim_{x\\to a^-} f(x) = \\lim_{x\\to a^+} f(x) = L" }
  ],
  inputs: [
    { id: "f", label: "Función", type: "expr", placeholder: "sin(x)/x" },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "a", label: "Punto al que tiende la variable", type: "number", default: "0", help: "Escribe inf para +infinito o -inf para -infinito." },
    { id: "dir", label: "Dirección", type: "select", default: "both", options: [["both", "Por ambos lados"], ["left", "Por la izquierda (−)"], ["right", "Por la derecha (+)"]] }
  ],
  example: { values: { f: "sin(x)/x", v: "x", a: "0", dir: "both" }, expect: ["= 1"], note: "Ejemplo: $\\lim_{x\\to 0} \\frac{\\sin x}{x}$, forma $\\frac{0}{0}$ que se resuelve con L'Hôpital." },
  invalid: { values: { f: "", a: "0" } },
  related: ["derivative", "taylor-series", "function-plotter"]
};

function snap(x) {
  if (!isFinite(x)) return x;
  const r = Math.round(x);
  if (Math.abs(x - r) < 1e-9 * Math.max(1, Math.abs(x))) return r;
  const fr = toFraction(x, 1000, 1e-9);
  return fr ? fr[0] / fr[1] : x;
}

function numericSide(F, a, side) {
  const vals = [];
  for (let k = 1; k <= 8; k++) {
    const x = isFinite(a) ? a + side * Math.pow(10, -k) : side * Math.pow(10, k + 1);
    vals.push([x, F(x)]);
  }
  const ys = vals.map((p) => p[1]);
  const finite = ys.filter((y) => isFinite(y));
  if (finite.length < 4) {
    const last = ys[ys.length - 1];
    if (last === Infinity || last === -Infinity) return { value: last, vals };
    return { value: NaN, vals };
  }
  const tail = ys.slice(-5);
  const grow = tail.every((y, i) => i === 0 || (isFinite(y) && Math.abs(y) > Math.abs(tail[i - 1]) * 1.5));
  if (grow && Math.abs(tail[tail.length - 1]) > 1e5 && tail.every((y) => Math.sign(y) === Math.sign(tail[0]))) return { value: Math.sign(tail[0]) * Infinity, vals };
  const rich = ys.slice(0, -1).map((y, i) => (10 * ys[i + 1] - y) / 9);
  const pick = (seq, upto) => {
    let best = null;
    for (let i = 0; i < Math.min(seq.length, upto) - 1; i++) {
      const d = Math.abs(seq[i + 1] - seq[i]) / Math.max(1, Math.abs(seq[i + 1]));
      if (isFinite(d) && (!best || d < best.err)) best = { value: seq[i + 1], err: d };
    }
    return best;
  };
  const raw = pick(ys, 8), ext = pick(rich, 7);
  const best = [raw, ext].filter(Boolean).sort((p, q) => p.err - q.err)[0];
  if (!best || best.err > 1e-4) {
    const osc = Math.max(...finite.slice(-4)) - Math.min(...finite.slice(-4));
    if (osc > 1e-3 * Math.max(1, Math.abs(finite[finite.length - 1]))) return { value: NaN, vals, oscillates: true };
    return { value: finite[finite.length - 1], vals };
  }
  return { value: best.value, vals };
}

function limText(v) {
  return v === Infinity ? "∞" : v === -Infinity ? "-∞" : nice(v, 10);
}

function limTex(v) {
  return v === Infinity ? "\\infty" : v === -Infinity ? "-\\infty" : niceTex(v, 10);
}

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const a = num(input, "a", "Punto", { allowInfinity: true });
  const dir = choice(input, "dir", "Dirección", ["both", "left", "right"], "both");
  const F = f1(f, v);
  const at = isFinite(a) ? ntex(a) : a > 0 ? "\\infty" : "-\\infty";
  const arrow = `${v} \\to ${at}${dir === "left" && isFinite(a) ? "^-" : dir === "right" && isFinite(a) ? "^+" : ""}`;
  const steps = [{ text: "Lo que se pide:", tex: `\\lim_{${arrow}} ${toTex(f)}` }];
  const blocks = [];
  let value = null, method = "";

  if (isFinite(a)) {
    const direct = F(a);
    const near = [F(a - 1e-7), F(a + 1e-7)];
    if (isFinite(direct) && near.every((y) => isFinite(y) && Math.abs(y - direct) < 1e-4 * Math.max(1, Math.abs(direct)))) {
      value = snap(direct);
      method = "direct";
      steps.push({ text: "La función es continua en el punto, así que sustituimos directamente:", tex: `f(${ntex(a)}) = ${limTex(value)}` });
    }
  }

  if (value === null && f.type === "op" && f.op === "/") {
    let N = f.a, D = f.b;
    const kind = (n, d) => {
      const nv = isFinite(a) ? f1(n, v)(a) : f1(n, v)(a > 0 ? 1e8 : -1e8);
      const dv = isFinite(a) ? f1(d, v)(a) : f1(d, v)(a > 0 ? 1e8 : -1e8);
      if (isFinite(a) && Math.abs(nv) < 1e-12 && Math.abs(dv) < 1e-12) return "0/0";
      if (!isFinite(a) && Math.abs(nv) > 1e6 && Math.abs(dv) > 1e6) return "∞/∞";
      if (isFinite(a) && !isFinite(nv) && !isFinite(dv)) return "∞/∞";
      return null;
    };
    let form = kind(N, D);
    for (let i = 0; i < 4 && form; i++) {
      steps.push(`Al sustituir obtenemos la forma indeterminada $${form === "0/0" ? "\\frac{0}{0}" : "\\frac{\\infty}{\\infty}"}$, así que aplicamos la regla de L'Hôpital (derivamos por separado el numerador y el denominador):`);
      N = diff(N, v); D = diff(D, v);
      steps.push({ tex: `\\lim_{${arrow}} \\frac{${toTex(N)}}{${toTex(D)}}` });
      const q = simplify({ type: "op", op: "/", a: N, b: D });
      const Q = f1(q, v);
      if (isFinite(a)) {
        const val = Q(a);
        const nb = [Q(a - 1e-7), Q(a + 1e-7)];
        if (isFinite(val) && nb.every((y) => isFinite(y) && Math.abs(y - val) < 1e-4 * Math.max(1, Math.abs(val)))) {
          value = snap(val); method = "lhopital";
          steps.push({ text: "Ahora la sustitución directa es posible:", tex: `= ${limTex(value)}` });
          break;
        }
      } else {
        const s = numericSide(Q, a, a > 0 ? 1 : -1);
        if (isFinite(s.value) || Math.abs(s.value) === Infinity) {
          const nd = f1(D, v)(a > 0 ? 1e6 : -1e6);
          if (isFinite(nd)) { value = snap(s.value); method = "lhopital"; steps.push({ tex: `= ${limTex(value)}` }); break; }
        }
      }
      form = kind(N, D);
    }
  }

  if (value === null) {
    method = "numeric";
    const sides = dir === "both" && isFinite(a) ? [-1, 1] : dir === "left" ? [-1] : dir === "right" ? [1] : [a > 0 ? 1 : -1];
    const res = sides.map((s) => ({ s, ...numericSide(F, a, s) }));
    const rows = [];
    for (let i = 0; i < 8; i++) rows.push(res.flatMap((r) => [fmt(r.vals[i][0], 10), isFinite(r.vals[i][1]) ? fmt(r.vals[i][1], 10) : "no definido"]));
    const head = res.flatMap((r) => [r.s < 0 ? (isFinite(a) ? `${v} por la izquierda` : v) : isFinite(a) ? `${v} por la derecha` : v, `f(${v})`]);
    blocks.push({ type: "table", caption: "Tabla de aproximación numérica", head, rows });
    steps.push("La sustitución directa no da un valor definido, así que estimamos el límite numéricamente acercándonos al punto con valores cada vez más próximos (ver la tabla).");
    const vals = res.map((r) => r.value);
    if (vals.some((x) => Number.isNaN(x))) {
      steps.push("Los valores oscilan o no están definidos y no se acercan a un único número.");
      return { results: [{ label: "Límite", value: "No existe" }], steps, blocks, copy: "El límite no existe" };
    }
    if (vals.length === 2) {
      const [l, r] = vals.map(snap);
      const same = l === r || (isFinite(l) && isFinite(r) && Math.abs(l - r) < 1e-5 * Math.max(1, Math.abs(l)));
      steps.push(`El límite por la izquierda ≈ ${limText(l)} y el límite por la derecha ≈ ${limText(r)}.`);
      if (!same) {
        steps.push("Los dos límites laterales son distintos, así que el límite no existe.");
        return {
          results: [{ label: "Límite", value: "No existe" }, { label: "Por la izquierda", value: limText(l) }, { label: "Por la derecha", value: limText(r) }],
          steps, blocks, copy: `El límite no existe (izquierda ${limText(l)}, derecha ${limText(r)})`
        };
      }
      value = l;
    } else value = snap(vals[0]);
    blocks.push({ type: "note", text: "Este límite es una estimación numérica y puede no ser exacto en los casos difíciles." });
  }

  const label = method === "numeric" ? "Límite (estimación numérica)" : "Límite";
  return {
    results: [{ label, tex: `\\lim_{${arrow}} ${toTex(f)} = ${limTex(value)}`, text: `= ${limText(value)}` }],
    steps, blocks, copy: `lim ${toText(f)} = ${limText(value)}`
  };
}
