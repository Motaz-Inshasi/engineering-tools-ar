import { fail, str, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Comptez les chiffres significatifs d'une mesure en expliquant la règle appliquée à chaque zéro, arrondissez à un nombre donné de chiffres significatifs, et calculez la propagation de l'incertitude dans l'addition, la soustraction, la multiplication, la division et les puissances.",
  keywords: ["Chiffres significatifs", "significant figures", "sig figs", "Arrondi", "Notation scientifique", "Propagation de l'erreur", "Incertitude", "uncertainty propagation", "Erreur relative", "Précision de la mesure"],
  formulas: [
    { label: "Addition et soustraction", tex: "q = a \\pm b \\Rightarrow \\delta q = \\sqrt{\\delta a^2 + \\delta b^2}" },
    { label: "Multiplication, division et puissances", tex: "\\frac{\\delta q}{|q|} = \\sqrt{\\left(\\frac{\\delta a}{a}\\right)^2 + \\left(\\frac{\\delta b}{b}\\right)^2},\\qquad q = a^n \\Rightarrow \\frac{\\delta q}{|q|} = |n|\\frac{\\delta a}{|a|}" }
  ],
  inputs: [
    { id: "mode", label: "Opération", type: "select", default: "count", options: [["count", "Compter les chiffres significatifs"], ["round", "Arrondir à un nombre de chiffres significatifs"], ["prop", "Propagation de l'erreur"]] },
    { id: "value", label: "Nombre", type: "text", default: "0.004050", when: { mode: ["count", "round"] }, help: "Saisissez-le tel qu'il a été relevé dans la mesure, par exemple 0.004050, 1200 ou 1.20e3." },
    { id: "sf", label: "Nombre de chiffres significatifs voulu", type: "number", default: "2", when: { mode: ["round"] } },
    { id: "op", label: "Opération arithmétique", type: "select", default: "mul", options: [["add", "a + b"], ["sub", "a − b"], ["mul", "a × b"], ["div", "a ÷ b"], ["pow", "aⁿ"]], when: { mode: ["prop"] } },
    { id: "a", label: "Valeur a", type: "number", default: "4.52", when: { mode: ["prop"] } },
    { id: "da", label: "Incertitude δa", type: "number", default: "0.02", when: { mode: ["prop"] } },
    { id: "b", label: "Valeur b", type: "number", default: "2.0", when: { mode: ["prop"], op: ["add", "sub", "mul", "div"] } },
    { id: "db", label: "Incertitude δb", type: "number", default: "0.2", when: { mode: ["prop"], op: ["add", "sub", "mul", "div"] } },
    { id: "power", label: "Exposant n", type: "number", default: "2", when: { mode: ["prop"], op: ["pow"] } }
  ],
  example: { values: { mode: "count", value: "0.004050" }, expect: ["4 chiffres significatifs"], note: "Exemple : combien de chiffres significatifs dans 0.004050 ?" },
  invalid: { values: { mode: "count", value: "12a" } },
  related: ["descriptive-stats", "engineering-notation", "unit-converter"]
};

function analyze(raw) {
  const s0 = normalizeDigits(raw).replace(/\s+/g, "").replace(/^\+/, "");
  const m = s0.match(/^(-?)(\d*)(\.?)(\d*)(?:[eE]([+-]?\d+))?$/);
  if (!m || (!m[2] && !m[4])) return null;
  const [, sign, ip, dot, fp, ex] = m;
  const digits = ip + fp;
  const first = digits.search(/[1-9]/);
  if (first < 0) return { zero: true, sign, ip, dot, fp, ex };
  let last = digits.length - 1;
  let ambiguous = false;
  if (!dot && !fp) {
    const t = ip.match(/0*$/)[0].length;
    if (t > 0) { ambiguous = true; last = ip.length - 1 - t; }
  }
  const sig = digits.slice(first, last + 1);
  return { sign, ip, dot, fp, ex, digits, first, last, count: sig.length, ambiguous, value: Number(s0) };
}

function roundSig(x, n) {
  if (x === 0) return "0";
  const r = Number(x.toPrecision(n));
  const e2 = Math.floor(Math.log10(Math.abs(r)));
  if (e2 >= n || e2 < -4) { const [mm, ee] = r.toExponential(n - 1).split("e"); return `${mm} × 10^${Number(ee)}`; }
  const dec = Math.max(0, n - 1 - e2);
  return r.toFixed(dec);
}

const sfWord = (n) => (n === 1 ? "un seul chiffre significatif" : n === 2 ? "deux chiffres significatifs" : n <= 10 ? `${n} chiffres significatifs` : `${n} chiffres significatifs`);

function sci(x, n) {
  const [mm, ee] = x.toExponential(n - 1).split("e");
  return `${mm} × 10^${Number(ee)}`;
}

export function solve(input) {
  const mode = choice(input, "mode", "Opération", ["count", "round", "prop"], "count");
  if (mode === "prop") return propagate(input);
  const raw = str(input, "value", "Nombre");
  const A = analyze(raw);
  if (!A) fail("Saisissez un nombre, par exemple 0.00450, 1200 ou 3.20e5.", "value");
  if (A.zero) fail("Le nombre zéro n'a pas de chiffres significatifs définis.", "value");
  if (mode === "round") {
    const n = num(input, "sf", "Nombre de chiffres significatifs", { integer: true, min: 1, max: 15 });
    const out = roundSig(A.value, n);
    return {
      results: [{ label: `Arrondi à ${sfWord(n)}`, value: out, text: `${raw} ≈ ${out}` }, { label: "Notation scientifique", value: sci(A.value, n) }],
      steps: [
        `On commence à compter à partir du premier chiffre non nul (${A.digits[A.first]}) et l'on prend ${n} chiffres.`,
        `On regarde le chiffre suivant : s'il est supérieur ou égal à 5, on augmente le dernier chiffre conservé d'une unité ; sinon, on le laisse tel quel.`,
        `Résultat : ${out}.`
      ],
      copy: `${raw} ≈ ${out} (${sfWord(n)})`
    };
  }
  const allDigits = A.digits;
  const rows = [...allDigits].map((d, i) => {
    let why, sig = false;
    if (i < A.first) why = "Zéro initial : indique seulement la position de la virgule";
    else if (i > A.last) why = "Zéro final sans virgule décimale : ambigu, il est considéré comme non significatif";
    else if (d !== "0") { why = "Chiffre non nul : toujours significatif"; sig = true; }
    else if (allDigits.slice(i).search(/[1-9]/) > 0) { why = "Zéro compris entre des chiffres significatifs : significatif"; sig = true; }
    else { why = "Zéro final avec virgule décimale : significatif (il indique la précision de la mesure)"; sig = true; }
    return [d, sig ? "✓" : "✗", why];
  });
  const n = A.count;
  const blocks = [{ type: "table", caption: "Jugement de chaque chiffre", head: ["Chiffre", "Significatif ?", "Raison"], rows }];
  if (A.ambiguous) blocks.push({ type: "note", tone: "warn", text: `Les zéros à la fin d'un entier sans virgule sont ambigus. Écrivez ${A.ip}. (avec un point) ou utilisez la notation scientifique pour indiquer qu'ils sont significatifs.` });
  const word = sfWord(n);
  return {
    results: [
      { label: "Nombre de chiffres significatifs", value: word, text: word },
      { label: "Notation scientifique", value: sci(A.value, n) },
      { label: "Nombre de décimales", value: String(A.fp.length) }
    ],
    steps: [
      "Règles : tout chiffre non nul est significatif, les zéros situés entre des chiffres significatifs le sont aussi, les zéros initiaux ne le sont pas, et les zéros finaux ne le sont que s'il y a une virgule décimale.",
      `Dans «${raw}», on applique les règles à chaque chiffre, comme dans le tableau.`,
      `Total : ${word}.`,
      "Rappel : dans l'addition et la soustraction, on arrondit le résultat au plus petit nombre de décimales ; dans la multiplication et la division, au plus petit nombre de chiffres significatifs."
    ],
    blocks, copy: `${raw}: ${word}`
  };
}

function propagate(input) {
  const op = choice(input, "op", "Opération arithmétique", ["add", "sub", "mul", "div", "pow"], "mul");
  const a = num(input, "a", "Valeur a"), da = num(input, "da", "δa", { nonNegative: true });
  let q, dq, steps = [];
  if (op === "pow") {
    const n = num(input, "power", "Exposant n");
    if (a === 0 && n <= 0) fail("On ne peut pas élever zéro à une puissance non positive.", "a");
    if (a < 0 && !Number.isInteger(n)) fail("On ne peut pas élever un nombre négatif à une puissance fractionnaire.", "power");
    if (a === 0) fail("La valeur a est nulle : l'erreur relative n'est pas définie.", "a");
    q = Math.pow(a, n); dq = Math.abs(q) * Math.abs(n) * (da / Math.abs(a));
    steps.push({ text: "L'erreur relative est multipliée par l'exposant :", tex: `q = ${ntex(a)}^{${ntex(n)}} = ${ntex(q, 6)},\\quad \\frac{\\delta q}{|q|} = |${ntex(n)}| \\times \\frac{${ntex(da)}}{${ntex(Math.abs(a))}} = ${ntex(dq / Math.abs(q), 4)}` });
  } else {
    const b = num(input, "b", "Valeur b"), db = num(input, "db", "δb", { nonNegative: true });
    if (op === "add" || op === "sub") {
      q = op === "add" ? a + b : a - b;
      dq = Math.sqrt(da * da + db * db);
      steps.push({ text: "Dans l'addition et la soustraction, les erreurs absolues se composent quadratiquement :", tex: `q = ${ntex(q, 8)},\\quad \\delta q = \\sqrt{${ntex(da)}^2 + ${ntex(db)}^2} = ${ntex(dq, 4)}` });
    } else {
      if (op === "div" && b === 0) fail("La division par zéro est impossible.", "b");
      if (a === 0 || b === 0) fail("L'erreur relative n'est pas définie lorsque l'une des deux valeurs est nulle.", a === 0 ? "a" : "b");
      q = op === "mul" ? a * b : a / b;
      const rel = Math.sqrt((da / a) ** 2 + (db / b) ** 2);
      dq = Math.abs(q) * rel;
      steps.push({ text: "Dans la multiplication et la division, les erreurs relatives se composent quadratiquement :", tex: `q = ${ntex(q, 8)},\\quad \\frac{\\delta q}{|q|} = \\sqrt{\\left(\\frac{${ntex(da)}}{${ntex(a)}}\\right)^2 + \\left(\\frac{${ntex(db)}}{${ntex(b)}}\\right)^2} = ${ntex(rel, 4)}` });
    }
  }
  let shown;
  if (dq > 0) {
    const e = Math.floor(Math.log10(dq));
    const d1 = Number(dq.toPrecision(1));
    const lead = Number(String(d1).replace(/[-.0]/g, "")[0]);
    const digits = lead === 1 ? 2 : 1;
    const dqr = Number(dq.toPrecision(digits));
    const dec = Math.max(0, -(e - digits + 1));
    const qr = (Math.round(q * 10 ** dec) / 10 ** dec).toFixed(dec);
    shown = `${qr} ± ${dqr.toFixed(dec)}`;
    steps.push(`On arrondit l'incertitude à ${digits === 2 ? "deux chiffres significatifs (car il commence par 1)" : "un seul chiffre significatif"}, puis on arrondit le résultat au même ordre de grandeur : ${shown}.`);
  } else {
    shown = `${fmt(q, 8)} ± 0`;
    steps.push("L'incertitude est nulle : le résultat est exact.");
  }
  return {
    results: [
      { label: "Résultat avec incertitude", value: shown, text: `q = ${shown}` },
      { label: "Résultat brut", value: fmt(q, 8) },
      { label: "Incertitude absolue δq", value: fmt(dq, 4) },
      { label: "Incertitude relative", value: q !== 0 ? `${fmt((100 * dq) / Math.abs(q), 3)}%` : "Non défini" }
    ],
    steps, copy: `q = ${shown}`
  };
}
