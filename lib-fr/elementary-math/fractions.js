import { fail, choice, str } from "../core/validate.js";

const MAX_DIGITS = 50;
const SYM = { add: "+", sub: "−", mul: "×", div: "÷" };
const KIND = { terminating: "fini", repeating: "périodique", truncated: "non répété sur 50 chiffres" };
const ABS = (x) => (x < 0n ? -x : x);
const wrap = (x) => (x < 0n ? `(${x})` : `${x}`);

export const meta = {
  description: "Additionnez, soustrayez, multipliez ou divisez deux fractions, comparez-les ou simplifiez une fraction. Accepte fractions, nombres mixtes, entiers et décimaux, et affiche le résultat en fraction simplifiée, nombre mixte et décimal, avec les étapes du calcul.",
  keywords: ["fractions", "fractions", "nombre mixte", "simplification de fraction", "dénominateur commun", "fraction décimale périodique", "addition des fractions", "multiplication des fractions"],
  formulas: [
    { label: "Addition et soustraction des fractions", tex: "\\frac{a}{b} \\pm \\frac{c}{d} = \\frac{ad \\pm bc}{bd}" },
    { label: "Multiplication et division des fractions", tex: "\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{ac}{bd},\\qquad \\frac{a}{b} \\div \\frac{c}{d} = \\frac{ad}{bc}" }
  ],
  inputs: [
    { id: "a", label: "Première fraction a", type: "text", default: "3/4", help: "Exemples acceptés : 3/4, -2 1/3 (nombre mixte), 5 (entier), 0.75 (décimal)." },
    { id: "op", label: "Opération", type: "select", default: "add", options: [["add", "+ addition"], ["sub", "− soustraction"], ["mul", "× multiplication"], ["div", "÷ division"], ["cmp", "comparaison"], ["simplify", "simplifier la première fraction seulement"]] },
    { id: "b", label: "Deuxième fraction b", type: "text", default: "1/6", when: { op: ["add", "sub", "mul", "div", "cmp"] } }
  ],
  example: { values: { a: "3/4", op: "add", b: "1/6" }, expect: ["11/12", "0.91(6)"], note: "Exemple : 3/4 + 1/6 = 11/12 = 0.91(6)." },
  invalid: { values: { a: "3/0", op: "add", b: "1/6" } },
  related: ["gcd-lcm", "percentage", "ratio-proportion", "significant-figures"]
};

function gcd(a, b) {
  let x = ABS(a);
  let y = ABS(b);
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}

function reduce(n, d) {
  const s = d < 0n ? -1n : 1n;
  const g = gcd(n, d);
  return { n: (s * n) / g, d: (s * d) / g };
}

function tf(n, d) {
  const sg = n < 0n ? "-" : "";
  const a = ABS(n);
  return d === 1n ? `${sg}${a}` : `${sg}\\frac{${a}}{${d}}`;
}

function fs(f) {
  return f.d === 1n ? `${f.n}` : `${f.n}/${f.d}`;
}

function mixed(f) {
  if (f.d === 1n) return `${f.n}`;
  const sg = f.n < 0n ? "-" : "";
  const a = ABS(f.n);
  const w = a / f.d;
  const r = a % f.d;
  if (w === 0n) return `${sg}${r}/${f.d}`;
  return `${sg}${w} ${r}/${f.d}`;
}

function decimal(n, d) {
  const sg = n < 0n ? "-" : "";
  const a = ABS(n);
  const q = a / d;
  let r = a % d;
  const head = `${sg}${q}`;
  if (r === 0n) return { text: head, tex: head, kind: "terminating" };
  const digits = [];
  const seen = new Map();
  let start = -1;
  while (r !== 0n) {
    if (seen.has(r)) {
      start = seen.get(r);
      break;
    }
    if (digits.length === MAX_DIGITS) break;
    seen.set(r, digits.length);
    r *= 10n;
    digits.push(String(r / d));
    r %= d;
  }
  if (start < 0 && r === 0n) {
    const body = digits.join("");
    return { text: `${head}.${body}`, tex: `${head}.${body}`, kind: "terminating" };
  }
  if (start < 0) {
    const body = digits.join("");
    return { text: `${head}.${body}…`, tex: `${head}.${body}\\ldots`, kind: "truncated" };
  }
  const pre = digits.slice(0, start).join("");
  const rep = digits.slice(start).join("");
  return { text: `${head}.${pre}(${rep})`, tex: `${head}.${pre}\\overline{${rep}}`, kind: "repeating" };
}

function finish(raw, n0, d0, lhs, mid) {
  const f = reduce(n0, d0);
  const parts = [lhs];
  if (mid) parts.push(mid);
  if (f.n !== n0 || f.d !== d0) parts.push(tf(f.n, f.d));
  return { n: f.n, d: f.d, raw, conv: parts.length > 1 ? parts.join(" = ") : null };
}

function parseFrac(input, key, label) {
  const raw = str(input, key, label).replace(/\s+/g, " ");
  let body = raw;
  let sign = 1n;
  if (body.startsWith("-") || body.startsWith("+")) {
    sign = body.startsWith("-") ? -1n : 1n;
    body = body.slice(1).trim();
  }
  const sg = sign < 0n ? "-" : "";
  let m = body.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const w = BigInt(m[1]);
    const p = BigInt(m[2]);
    const q = BigInt(m[3]);
    if (q === 0n) fail(`Le dénominateur de ${label} ne peut pas être égal à zéro.`, key);
    if (p >= q) fail(`Dans ${label}, le nombre mixte doit avoir un numérateur inférieur au dénominateur.`, key);
    return finish(raw, sign * (w * q + p), q, `${sg}${w}\\frac{${p}}{${q}}`, `${sg}\\frac{${w * q + p}}{${q}}`);
  }
  m = body.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const p = BigInt(m[1]);
    const q = BigInt(m[2]);
    if (q === 0n) fail(`Le dénominateur de ${label} ne peut pas être égal à zéro.`, key);
    return finish(raw, sign * p, q, `${sg}\\frac{${p}}{${q}}`, null);
  }
  m = body.match(/^(\d+)$/);
  if (m) {
    const v = BigInt(m[1]);
    return finish(raw, sign * v, 1n, `${sg}${v}`, null);
  }
  m = body.match(/^(\d*)\.(\d*)$/);
  if (m && m[1] + m[2] !== "") {
    const a = BigInt(m[1] + m[2]);
    const q = 10n ** BigInt(m[2].length);
    return finish(raw, sign * a, q, `${sg}${m[1] || "0"}.${m[2]}`, `${sg}\\frac{${a}}{${q}}`);
  }
  fail(`Je n'ai pas compris ${label}. Utilisez une forme comme 3/4, -2 1/3, 5 ou 0.75.`, key);
}

function lcmStep(a, b, L) {
  return {
    text: `Plus petit commun multiple des deux dénominateurs ${a} et ${b} :`,
    tex: `\\operatorname{lcm}(${a},${b}) = \\frac{${a}\\cdot ${b}}{\\gcd(${a},${b})} = \\frac{${a * b}}{${gcd(a, b)}} = ${L}`
  };
}

function reduceStep(n, d) {
  const g = gcd(n, d);
  if (g === 1n) return null;
  return {
    text: `On divise le numérateur et le dénominateur par leur plus grand commun diviseur ${g} :`,
    tex: `\\frac{${n}}{${d}} = \\frac{${n / g}}{${d / g}}`
  };
}

function output(R, steps, prefix) {
  const dec = decimal(R.n, R.d);
  if (R.d !== 1n) steps.push({ text: "On convertit la fraction obtenue en décimal par division posée :", tex: `${tf(R.n, R.d)} = ${dec.tex}` });
  const out = {
    results: [
      { label: "Fraction simplifiée", value: fs(R) },
      { label: "Nombre mixte", value: mixed(R) },
      { label: "Fraction décimale", value: dec.text },
      { label: "Type de fraction décimale", value: KIND[dec.kind] }
    ],
    steps,
    copy: `${prefix} = ${fs(R)}${R.d !== 1n ? ` = ${dec.text}` : ""}`
  };
  if (dec.kind === "truncated") out.blocks = [{ type: "note", text: "La fraction ne se répète pas sur 50 chiffres, donc seuls les 50 premiers chiffres sont affichés." }];
  return out;
}

function compareOut(A, B, steps) {
  const L = lcm(A.d, B.d);
  const na = A.n * (L / A.d);
  const nb = B.n * (L / B.d);
  const rel = na > nb ? ">" : na < nb ? "<" : "=";
  steps.push(lcmStep(A.d, B.d, L));
  steps.push({ text: "On met les deux fractions au même dénominateur :", tex: `${tf(A.n, A.d)} = \\frac{${na}}{${L}},\\quad ${tf(B.n, B.d)} = \\frac{${nb}}{${L}}` });
  steps.push({ text: "On compare les numérateurs :", tex: `${na} ${rel} ${nb}` });
  const da = decimal(A.n, A.d);
  const db = decimal(B.n, B.d);
  return {
    results: [
      { label: "Résultat de la comparaison", value: `${fs(A)} ${rel} ${fs(B)}` },
      { label: "Première fraction en décimal", value: da.text },
      { label: "Deuxième fraction en décimal", value: db.text }
    ],
    steps,
    copy: `${fs(A)} ${rel} ${fs(B)} (${da.text} ${rel} ${db.text})`
  };
}

export function solve(input) {
  const op = choice(input, "op", "Opération", ["add", "sub", "mul", "div", "cmp", "simplify"], "add");
  const A = parseFrac(input, "a", "Première fraction");
  const steps = [];
  if (A.conv) steps.push({ text: "On convertit la première fraction en fraction et on la simplifie :", tex: A.conv });
  if (op === "simplify") {
    steps.push({ text: "Plus grand commun diviseur du numérateur et du dénominateur :", tex: `\\gcd(${ABS(A.n)},${A.d}) = ${gcd(A.n, A.d)}` });
    return output(A, steps, A.raw);
  }
  const B = parseFrac(input, "b", "Deuxième fraction");
  if (B.conv) steps.push({ text: "On convertit la deuxième fraction en fraction et on la simplifie :", tex: B.conv });
  if (op === "cmp") return compareOut(A, B, steps);
  if (op === "div" && B.n === 0n) fail("Division par zéro impossible : la deuxième fraction est égale à zéro.", "b");

  let un;
  let ud;
  if (op === "mul") {
    un = A.n * B.n;
    ud = A.d * B.d;
    steps.push({ text: "On multiplie les numérateurs entre eux et les dénominateurs entre eux :", tex: `${tf(A.n, A.d)} \\times ${tf(B.n, B.d)} = \\frac{${un}}{${ud}}` });
  } else if (op === "div") {
    const rn = B.n < 0n ? -B.d : B.d;
    const rd = ABS(B.n);
    un = A.n * rn;
    ud = A.d * rd;
    steps.push({ text: "On inverse la deuxième fraction puis on multiplie :", tex: `${tf(A.n, A.d)} \\div ${tf(B.n, B.d)} = ${tf(A.n, A.d)} \\times ${tf(rn, rd)} = \\frac{${un}}{${ud}}` });
  } else {
    const L = lcm(A.d, B.d);
    const na = A.n * (L / A.d);
    const nb = B.n * (L / B.d);
    un = op === "add" ? na + nb : na - nb;
    ud = L;
    steps.push(lcmStep(A.d, B.d, L));
    steps.push({ text: "On met chaque fraction au même dénominateur :", tex: `${tf(A.n, A.d)} = \\frac{${na}}{${L}},\\quad ${tf(B.n, B.d)} = \\frac{${nb}}{${L}}` });
    steps.push({ text: op === "add" ? "On additionne les numérateurs et on garde le même dénominateur :" : "On soustrait les numérateurs et on garde le même dénominateur :", tex: `\\frac{${na} ${op === "add" ? "+" : "-"} ${wrap(nb)}}{${L}} = \\frac{${un}}{${L}}` });
  }
  const R = reduce(un, ud);
  const rs = reduceStep(un, ud);
  if (rs) steps.push(rs);
  return output(R, steps, `${A.raw} ${SYM[op]} ${B.raw}`);
}
