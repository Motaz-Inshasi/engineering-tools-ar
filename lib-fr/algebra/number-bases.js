import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { normalizeDigits } from "../core/format.js";

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const meta = {
  description: "Conversion de nombres entre deux bases quelconques de 2 à 36 (binaire, octal, décimal, hexadécimal…), avec les parties fractionnaires, et les étapes de division successive, de multiplication successive et de développement positionnel.",
  keywords: ["Conversion entre systèmes de numération", "binaire", "décimal", "hexadécimal", "octal", "binary", "hex", "decimal", "octal", "base conversion", "base"],
  formulas: [
    { label: "De n'importe quelle base vers la décimale (développement positionnel)", tex: "(d_k \\dots d_1 d_0 . d_{-1}\\dots)_b = \\sum_i d_i\\, b^{i}" },
    { label: "De la décimale : divisions successives pour la partie entière, multiplications successives pour la fraction", tex: "N = q_0 b + r_0,\\; q_0 = q_1 b + r_1,\\dots \\qquad f \\cdot b = d_{-1} + f_1,\\dots" }
  ],
  inputs: [
    { id: "x", label: "Nombre", type: "text", default: "1011.101", help: "Utilisez les lettres A à Z pour les chiffres supérieurs à 9. Le signe négatif et la virgule décimale sont acceptés." },
    { id: "from", label: "De la base", type: "number", default: "2" },
    { id: "to", label: "Vers la base", type: "number", default: "10" }
  ],
  example: { values: { x: "2AF", from: "16", to: "2" }, expect: ["1010101111"], note: "Exemple : conversion de $(2AF)_{16}$ en binaire." },
  invalid: { values: { x: "129", from: "2", to: "10" } },
  related: ["binary-twos-complement", "truth-table", "logic-gates"]
};

export function parseInBase(s, base) {
  let t = normalizeDigits(s).toUpperCase().replace(/[\s_]/g, "");
  let neg = false;
  if (t.startsWith("-")) { neg = true; t = t.slice(1); }
  else if (t.startsWith("+")) t = t.slice(1);
  if (!/^[0-9A-Z]*\.?[0-9A-Z]*$/.test(t) || t === "" || t === ".") return null;
  const [ip, fp = ""] = t.split(".");
  let iv = 0n;
  const B = BigInt(base);
  for (const ch of ip) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { bad: ch };
    iv = iv * B + BigInt(d);
  }
  let fv = 0, w = 1 / base;
  for (const ch of fp) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { bad: ch };
    fv += d * w;
    w /= base;
  }
  return { neg, int: iv, frac: fv, ip, fp };
}

export function toBase(intPart, frac, base, maxFrac = 20) {
  const B = BigInt(base);
  let s = intPart === 0n ? "0" : "";
  let q = intPart;
  const divs = [];
  while (q > 0n) {
    const r = q % B;
    divs.push([q, q / B, Number(r)]);
    s = DIGITS[Number(r)] + s;
    q = q / B;
  }
  let fs = "";
  const muls = [];
  let f = frac;
  for (let i = 0; i < maxFrac && f > 0; i++) {
    const p = f * base;
    const d = Math.floor(p + 1e-12);
    muls.push([f, p, d]);
    fs += DIGITS[Math.min(d, base - 1)];
    f = p - d;
    if (f < 1e-12) f = 0;
  }
  return { str: fs ? `${s}.${fs}` : s, divs, muls, exact: f === 0 };
}

export function convert(x, from, to) {
  const p = parseInBase(x, from);
  if (!p || p.bad) return null;
  const r = toBase(p.int, p.frac, to);
  return (p.neg && (p.int !== 0n || p.frac !== 0) ? "-" : "") + r.str;
}

export function solve(input) {
  const s = str(input, "x", "Nombre");
  const from = num(input, "from", "Base d'origine", { integer: true, min: 2, max: 36 });
  const to = num(input, "to", "Base cible", { integer: true, min: 2, max: 36 });
  const p = parseInBase(s, from);
  if (!p) fail("Format du nombre incorrect.", "x");
  if (p.bad) fail(`Le chiffre « ${p.bad} » n'est pas autorisé en base ${from} (de 0 à ${DIGITS[from - 1]} autorisés).`, "x");
  const sign = p.neg && (p.int !== 0n || p.frac !== 0) ? "-" : "";
  const steps = [];
  const decStr = p.int.toString() + (p.frac ? (p.frac.toString().slice(1, 22)) : "");
  if (from !== 10) {
    const digits = (p.ip + p.fp).split("");
    const terms = digits.map((ch, i) => {
      const pos = p.ip.length - 1 - i;
      return `${DIGITS.indexOf(ch)} \\times ${from}^{${pos}}`;
    }).slice(0, 24);
    steps.push({ text: `On convertit en décimal par développement positionnel (chaque chiffre multiplié par la base élevée à sa position) :`, tex: `${terms.join(" + ")}${digits.length > 24 ? " + \\cdots" : ""} = ${sign}${decStr}` });
  } else steps.push(`Le nombre est déjà décimal : ${sign}${decStr}.`);
  const r = toBase(p.int, p.frac, to);
  const blocks = [];
  if (to !== 10) {
    if (r.divs.length) {
      steps.push(`On convertit la partie entière en base ${to} par divisions successives par ${to}, et on prend les restes de bas en haut (voir le tableau).`);
      const rows = r.divs.slice(0, 64).map(([q, qq, rem]) => [q.toString(), qq.toString(), `${rem} → ${DIGITS[rem]}`]);
      blocks.push({ type: "table", caption: "Divisions successives de la partie entière", head: ["Nombre", `÷ ${to} = quotient`, "Reste"], rows });
    }
    if (r.muls.length) {
      steps.push(`On convertit la partie fractionnaire par multiplications successives par ${to}, en prenant la partie entière à chaque fois, de haut en bas.`);
      blocks.push({ type: "table", caption: "Multiplications successives de la partie fractionnaire", head: ["Fraction", `× ${to}`, "Chiffre"], rows: r.muls.map(([f, pr, d]) => [String(Number(f.toPrecision(12))), String(Number(pr.toPrecision(12))), DIGITS[d]]) });
      if (!r.exact) blocks.push({ type: "note", tone: "warn", text: `La fraction ne se termine pas en base ${to} : on s'est arrêté à vingt chiffres après la virgule.` });
    }
  }
  const out = sign + r.str;
  steps.push(`Résultat : (${s})${from} = (${out})${to}`);
  const all = [2, 8, 10, 16].map((b) => ({ label: `Base ${b}`, value: sign + toBase(p.int, p.frac, b).str }));
  return {
    results: [{ label: `Résultat en base ${to}`, value: out, text: out }, ...all],
    blocks, steps, copy: out
  };
}
