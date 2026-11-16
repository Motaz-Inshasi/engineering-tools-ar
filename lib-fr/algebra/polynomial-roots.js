import { str, fail } from "../core/validate.js";
import { parse, sub, variables } from "../core/parser.js";
import { toRational, toDescending, Unsupported, degree as pdeg } from "../core/polynomial.js";
import { parseNumber, normalizeDigits } from "../core/format.js";
import { C, cabs, ctex, cfmt } from "../core/complex.js";
import { roots, cleanRoot, fromDescending, pevalC, pdivmod, trim, toTex, factorTex, peval, groupRoots } from "../core/polynomial.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "Recherche de toutes les racines d'un polynôme réel ou complexe jusqu'au degré 20 : saisie sous forme x^7 − x^5, factorisée ou en équation, avec test des racines rationnelles, division synthétique, vérification et factorisation.",
  keywords: ["racines d'un polynôme", "polynôme", "polynomial roots", "équation cubique", "division synthétique", "factorisation", "racines rationnelles"],
  formulas: [
    { label: "Test des racines rationnelles", tex: "a_n x^n + \\cdots + a_0 = 0,\\quad x = \\frac{p}{q},\\; p \\mid a_0,\\; q \\mid a_n" },
    { label: "Méthode numérique d'Aberth pour toutes les racines simultanément", tex: "z_k \\leftarrow z_k - \\frac{p/p'}{1 - \\frac{p}{p'}\\sum_{j\\ne k}\\frac{1}{z_k - z_j}}" }
  ],
  inputs: [
    { id: "c", label: "Polynôme ou équation", type: "expr", default: "x^3 - 6x^2 + 11x - 6", help: "Écrivez-le dans n'importe quel ordre : x^7 - x^5, (x-1)(x+2)^3, ou une équation comme 2x^3 = 8x. On peut aussi saisir seulement les coefficients, du plus haut degré, comme 1 -6 11 -6.", wide: true }
  ],
  example: { values: { c: "x^3 - 6x^2 + 11x - 6" }, expect: ["x = 1", "x = 2", "x = 3"], note: "Exemple : $x^3 - 6x^2 + 11x - 6 = 0$." },
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
  const raw = normalizeDigits(str(input, "c", "Polynôme")).trim();
  const tokens = raw.split(/[\s,،;؛]+/).filter(Boolean);
  if (tokens.length && tokens.every((t) => isFinite(parseNumber(t)))) {
    if (tokens.length < 2) fail("Saisissez un polynôme d'au moins le premier degré, par exemple x - 3 ou les coefficients 1 -3.", "c");
    return { desc: tokens.map(parseNumber), v: "x", mode: "coeffs" };
  }
  const sides = raw.split("=");
  if (sides.length > 2) fail("L'équation contient plus d'un signe =.", "c");
  let left, right;
  try {
    left = parse(sides[0]);
    right = sides.length === 2 ? parse(sides[1]) : null;
  } catch (e) {
    if (e.name === "InputError") fail(e.message, "c");
    throw e;
  }
  const vars = new Set([...variables(left), ...(right ? variables(right) : [])]);
  if (vars.size > 1) fail(`Le polynôme doit contenir une seule variable, or on a trouvé : ${[...vars].join("، ")}.`, "c");
  if (vars.size === 0) fail("Aucune variable dans l'expression. Saisissez un polynôme comme x^2 - 4.", "c");
  const v = [...vars][0];
  let r;
  try {
    r = toRational(right ? sub(left, right) : left, v);
  } catch (e) {
    if (e instanceof Unsupported) fail("Ce n'est pas un polynôme : seules l'addition, la soustraction, la multiplication et les puissances entières positives sont autorisées (pas de fonctions comme sin, ni de puissances fractionnaires).", "c");
    if (e.name === "InputError") fail(e.message, "c");
    throw e;
  }
  if (pdeg(r.den) > 0) fail(`Ce n'est pas un polynôme, car ${v} apparaît au dénominateur. Multipliez d'abord les deux membres par le dénominateur.`, "c");
  const scale = Math.max(...r.num.map(Math.abs));
  const asc = r.num.map((c) => (Math.abs(c) < 1e-14 * scale ? 0 : c / r.den[0]));
  return { desc: toDescending(asc), v, mode: "expr" };
}

export function solve(input) {
  const read = readPolynomial(input);
  let desc = read.desc;
  const v = read.v;
  while (desc.length && desc[0] === 0) desc = desc.slice(1);
  if (desc.length < 2) fail("Le polynôme doit être au moins de degré 1 (le coefficient de plus haut degré doit être non nul).", "c");
  if (desc.length - 1 > MAX_DEG) fail(`Le degré maximal est ${MAX_DEG}.`, "c");
  const p = fromDescending(desc);
  const n = desc.length - 1;
  const steps = [{ text: `Polynôme de degré ${n} :`, tex: `p(${v}) = ${toTex(p, v)}` }];
  let all = [];
  let rest = p;
  const rr = rationalRoots(desc);
  if (rr && n > 2 && rr.found.length) {
    steps.push(`Les coefficients sont entiers : on teste les racines rationnelles possibles $\\pm p/q$ (${rr.candidates ?? 0} possibilités).`);
    for (const r of rr.found) steps.push(`La racine $${v} = ${niceTex(r)}$ vérifie $p(${niceTex(r)}) = 0$ : on divise par $(${v} ${r < 0 ? "+" : "-"} ${niceTex(Math.abs(r))})$ par division synthétique.`);
    all = rr.found.map((r) => C(r));
    rest = rr.rest;
    if (rest.length > 1) steps.push({ text: "Polynôme restant :", tex: toTex(rest, v) });
  }
  const dr = trim(rest).length - 1;
  if (dr === 1) {
    all.push(C(-rest[0] / rest[1]));
    steps.push(`Le reste est linéaire : $${v} = ${niceTex(-rest[0] / rest[1])}$.`);
  } else if (dr === 2) {
    const [c, b, a] = rest;
    const D = b * b - 4 * a * c;
    steps.push({ text: "Le reste est quadratique, on utilise la formule générale :", tex: `\\Delta = b^2 - 4ac = ${niceTex(D, 8)},\\quad ${v} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}` });
    all.push(...roots(rest));
  } else if (dr > 2) {
    steps.push(`On calcule les racines restantes (${dr}) ensemble par la méthode itérative d'Aberth, puis on affine chacune par la méthode de Newton.`);
    all.push(...roots(rest));
  }
  all = all.map(cleanRoot).sort((a, b) => a.re - b.re || a.im - b.im);
  const groups = groupRoots(all, 1e-6);
  const maxRes = Math.max(...all.map((r) => cabs(pevalC(p, r))));
  steps.push(`Pour vérifier, on a substitué chaque racine dans $p(${v})$ : le plus grand reste est ${fmt(maxRes, 2)}.`);
  const fact = factorTex(p, v);
  steps.push({ text: "Factorisation (les facteurs quadratiques correspondent aux racines complexes conjuguées) :", tex: `p(${v}) = ${fact}` });
  const rows = groups.map((g) => [{ tex: `${v} = ${ctex(g.root, 10)}` }, String(g.mult), g.root.im === 0 ? "réelle" : "complexe"]);
  const text = groups.map((g) => `${v} = ${cfmt(g.root, 10)}${g.mult > 1 ? ` (multiplicité ${g.mult})` : ""}`).join("، ");
  const real = groups.filter((g) => g.root.im === 0).map((g) => g.root.re);
  const lo = Math.min(-2, ...real) - 1, hi = Math.max(2, ...real) + 1;
  return {
    results: [{ label: "Racines", value: text }, { label: "Nombre de racines réelles distinctes", value: real.length }],
    blocks: [
      { type: "table", head: ["Racine", "Multiplicité", "Type"], rows },
      { type: "plot", title: "Courbe du polynôme", xLabel: v, yLabel: `p(${v})`, series: [{ name: `p(${v})`, points: sampleFunction((x) => peval(p, x), lo, hi, 400) }, { name: "Racines réelles", points: real.map((r) => [r, 0]), marker: "o" }] }
    ],
    steps, copy: groups.map((g) => `${v} = ${cfmt(g.root, 10)}`).join("\n")
  };
}
