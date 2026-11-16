import { str, fail } from "../core/validate.js";
import { parse, sub, variables } from "../core/parser.js";
import { toRational, toDescending, Unsupported, degree as pdeg } from "../core/polynomial.js";
import { parseNumber, normalizeDigits } from "../core/format.js";
import { C, cabs, ctex, cfmt } from "../core/complex.js";
import { roots, cleanRoot, fromDescending, pevalC, pdivmod, trim, toTex, factorTex, peval, groupRoots } from "../core/polynomial.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Halla todas las raíces reales y complejas de polinomios de grado hasta 20: escríbelos como x^7 − x^5, factorizados o como ecuación, con prueba de raíces racionales, división sintética, verificación y factorización.",
  keywords: ["raíces de polinomios", "polinomio", "polynomial roots", "ecuación cúbica", "división sintética", "factorización", "raíces racionales"],
  formulas: [
    { label: "Prueba de raíces racionales", tex: "a_n x^n + \\cdots + a_0 = 0,\\quad x = \\frac{p}{q},\\; p \\mid a_0,\\; q \\mid a_n" },
    { label: "Método numérico de Aberth para todas las raíces a la vez", tex: "z_k \\leftarrow z_k - \\frac{p/p'}{1 - \\frac{p}{p'}\\sum_{j\\ne k}\\frac{1}{z_k - z_j}}" }
  ],
  inputs: [
    { id: "c", label: "Polinomio o ecuación", type: "expr", default: "x^3 - 6x^2 + 11x - 6", help: "Escríbelo en cualquier orden: x^7 - x^5, o (x-1)(x+2)^3, o una ecuación como 2x^3 = 8x. También puedes escribir solo los coeficientes desde la potencia más alta, como 1 -6 11 -6.", wide: true }
  ],
  example: { values: { c: "x^3 - 6x^2 + 11x - 6" }, expect: ["x = 1", "x = 2", "x = 3"], note: "Ejemplo: $x^3 - 6x^2 + 11x - 6 = 0$." },
  invalid: { values: { c: "0 0 5" } },
  related: ["quadratic", "partial-fractions", "transfer-function", "root-finding"]
};

function divisors(n) {
  n = Math.abs(n);
  const out = [];
  for (let i = 1; i * i <= n; i++) if (n % i === 0) { out.push(i); if (i * i !== n) out.push(n / i); }
  return out.sort((a, b) => a - b);
}

export function rationalRoots(desc) {
  if (!desc.every((c) => Number.isInteger(c)) || desc.some((c) => Math.abs(c) > 1e6)) return null;
  let p = fromDescending(desc);
  const found = [];
  while (p.length > 1 && p[0] === 0) { found.push(0); p = p.slice(1); }
  if (p.length <= 1) return { found, rest: p };
  const a0 = p[0], an = p[p.length - 1];
  const cands = [];
  for (const q of divisors(an)) for (const pp of divisors(a0)) for (const s of [1, -1]) {
    const v = (s * pp) / q;
    if (!cands.some((c) => Math.abs(c - v) < 1e-12)) cands.push(v);
  }
  cands.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
  let changed = true;
  while (changed && p.length > 1) {
    changed = false;
    for (const r of cands) {
      const val = peval(p, r);
      if (Math.abs(val) < 1e-9 * Math.max(1, ...p.map(Math.abs))) {
        found.push(r);
        p = pdivmod(p, [-r, 1]).q;
        changed = true;
        break;
      }
    }
  }
  return { found, rest: p, candidates: cands.length };
}

const MAX_DEG = 20;

export function readPolynomial(input) {
  const raw = normalizeDigits(str(input, "c", "Polinomio")).trim();
  const tokens = raw.split(/[\s,،;؛]+/).filter(Boolean);
  if (tokens.length && tokens.every((t) => isFinite(parseNumber(t)))) {
    if (tokens.length < 2) fail("Introduce un polinomio de grado 1 como mínimo, como x - 3 o los coeficientes 1 -3.", "c");
    return { desc: tokens.map(parseNumber), v: "x", mode: "coeffs" };
  }
  const sides = raw.split("=");
  if (sides.length > 2) fail("La ecuación contiene más de un signo =.", "c");
  let left, right;
  try {
    left = parse(sides[0]);
    right = sides.length === 2 ? parse(sides[1]) : null;
  } catch (e) {
    if (e.name === "InputError") fail(e.message, "c");
    throw e;
  }
  const vars = new Set([...variables(left), ...(right ? variables(right) : [])]);
  if (vars.size > 1) fail(`El polinomio debe contener una sola variable; la encontrada: ${[...vars].join("، ")}.`, "c");
  if (vars.size === 0) fail("No hay variable en la expresión. Escribe un polinomio como x^2 - 4.", "c");
  const v = [...vars][0];
  let r;
  try {
    r = toRational(right ? sub(left, right) : left, v);
  } catch (e) {
    if (e instanceof Unsupported) fail("Esto no es un polinomio: solo se permiten sumas, restas, productos y potencias enteras positivas (sin funciones como sin ni potencias fraccionarias).", "c");
    if (e.name === "InputError") fail(e.message, "c");
    throw e;
  }
  if (pdeg(r.den) > 0) fail(`Esto no es un polinomio porque ${v} aparece en un denominador. Multiplica ambos lados por el denominador primero.`, "c");
  const scale = Math.max(...r.num.map(Math.abs));
  const asc = r.num.map((c) => (Math.abs(c) < 1e-14 * scale ? 0 : c / r.den[0]));
  return { desc: toDescending(asc), v, mode: "expr" };
}

export function solve(input) {
  const read = readPolynomial(input);
  let desc = read.desc;
  const v = read.v;
  while (desc.length && desc[0] === 0) desc = desc.slice(1);
  if (desc.length < 2) fail("El polinomio debe ser de grado 1 como mínimo (el coeficiente principal no nulo).", "c");
  if (desc.length - 1 > MAX_DEG) fail(`El grado máximo es ${MAX_DEG}.`, "c");
  const p = fromDescending(desc);
  const n = desc.length - 1;
  const steps = [{ text: `Polinomio de grado ${n}:`, tex: `p(${v}) = ${toTex(p, v)}` }];
  let all = [];
  let rest = p;
  const rr = rationalRoots(desc);
  if (rr && n > 2 && rr.found.length) {
    steps.push(`Los coeficientes son enteros, así que probamos las posibles raíces racionales $\\pm p/q$ (${rr.candidates ?? 0} posibilidades).`);
    for (const r of rr.found) steps.push(`La raíz $${v} = ${niceTex(r)}$ cumple $p(${niceTex(r)}) = 0$, así que dividimos entre $(${v} ${r < 0 ? "+" : "-"} ${niceTex(Math.abs(r))})$ por división sintética.`);
    all = rr.found.map((r) => C(r));
    rest = rr.rest;
    if (rest.length > 1) steps.push({ text: "Polinomio restante:", tex: toTex(rest, v) });
  }
  const dr = trim(rest).length - 1;
  if (dr === 1) {
    all.push(C(-rest[0] / rest[1]));
    steps.push(`El resto es lineal: $${v} = ${niceTex(-rest[0] / rest[1])}$.`);
  } else if (dr === 2) {
    const [c, b, a] = rest;
    const D = b * b - 4 * a * c;
    steps.push({ text: "El resto es cuadrático; usamos la fórmula general:", tex: `\\Delta = b^2 - 4ac = ${niceTex(D, 8)},\\quad ${v} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}` });
    all.push(...roots(rest));
  } else if (dr > 2) {
    steps.push(`Calculamos las raíces restantes (${dr}) a la vez con el método iterativo de Aberth y luego refinamos cada una con el método de Newton.`);
    all.push(...roots(rest));
  }
  all = all.map(cleanRoot).sort((a, b) => a.re - b.re || a.im - b.im);
  const groups = groupRoots(all, 1e-6);
  const maxRes = Math.max(...all.map((r) => cabs(pevalC(p, r))));
  steps.push(`Para comprobar, sustituimos cada raíz en $p(${v})$; el mayor residuo fue ${fmt(maxRes, 2)}.`);
  const fact = factorTex(p, v);
  steps.push({ text: "Factorización (los factores cuadráticos corresponden a las raíces complejas conjugadas):", tex: `p(${v}) = ${fact}` });
  const rows = groups.map((g) => [{ tex: `${v} = ${ctex(g.root, 10)}` }, String(g.mult), g.root.im === 0 ? "Real" : "Complejo"]);
  const text = groups.map((g) => `${v} = ${cfmt(g.root, 10)}${g.mult > 1 ? ` (multiplicidad ${g.mult})` : ""}`).join("، ");
  const real = groups.filter((g) => g.root.im === 0).map((g) => g.root.re);
  const lo = Math.min(-2, ...real) - 1, hi = Math.max(2, ...real) + 1;
  return {
    results: [{ label: "Raíces", value: text }, { label: "Número de raíces reales distintas", value: real.length }],
    blocks: [
      { type: "table", head: ["Raíz", "Multiplicidad", "Tipo"], rows },
      { type: "plot", title: "Gráfica del polinomio", xLabel: v, yLabel: `p(${v})`, series: [{ name: `p(${v})`, points: sampleFunction((x) => peval(p, x), lo, hi, 400) }, { name: "Raíces reales", points: real.map((r) => [r, 0]), marker: "o" }] }
    ],
    steps, copy: groups.map((g) => `${v} = ${cfmt(g.root, 10)}`).join("\n")
  };
}
