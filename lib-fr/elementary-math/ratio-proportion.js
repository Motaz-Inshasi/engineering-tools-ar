import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["simplify", "solve", "divide", "direct", "inverse"];
const TERMS = ["a", "b", "c", "d"];
const N = (x) => fmt(x, 10);

export const meta = {
  description: "Simplifiez un rapport en nombres entiers les plus petits possibles, résolvez la proportion a/b = c/d pour trouver le terme inconnu, partagez une somme selon un rapport donné, et résolvez des problèmes de proportionnalité directe et inverse, avec les étapes.",
  keywords: ["rapport", "proportion", "ratio", "proportion", "partage selon un rapport", "proportionnalité directe", "proportionnalité inverse", "résolution d'une proportion"],
  formulas: [
    { label: "Proportionnalité directe", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_2}{x_1}" },
    { label: "Proportionnalité inverse", tex: "y_1 x_1 = y_2 x_2\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_1}{x_2}" },
    { label: "Proportion a/b = c/d", tex: "a\\cdot d = b\\cdot c" }
  ],
  inputs: [
    { id: "mode", label: "Type de problème", type: "select", default: "simplify", options: [["simplify", "Simplifier un rapport en nombres entiers"], ["solve", "Résoudre une proportion a/b = c/d (terme inconnu)"], ["divide", "Partager une somme selon un rapport donné"], ["direct", "proportionnalité directe"], ["inverse", "proportionnalité inverse"]] },
    { id: "ratio", label: "Rapport a:b(:c)", type: "text", default: "2:3:5", when: { mode: ["simplify", "divide"] }, help: "De 2 à 5 parties séparées par deux-points ; les décimaux sont acceptés." },
    { id: "total", label: "Somme totale", type: "number", default: "1200", when: { mode: ["divide"] } },
    { id: "a", label: "Terme a", type: "number", default: "2", when: { mode: ["solve"] }, help: "Dans une proportion à résoudre, laissez un seul terme vide." },
    { id: "b", label: "Terme b", type: "number", default: "3", when: { mode: ["solve"] } },
    { id: "c", label: "Terme c", type: "number", default: "4", when: { mode: ["solve"] } },
    { id: "d", label: "Terme d", type: "number", default: "", when: { mode: ["solve"] } },
    { id: "x1", label: "Première valeur x₁", type: "number", default: "5", when: { mode: ["direct", "inverse"] }, help: "Exemple : 5 ouvriers." },
    { id: "y1", label: "Valeur correspondante y₁", type: "number", default: "12", when: { mode: ["direct", "inverse"] }, help: "Exemple : 12 jours." },
    { id: "x2", label: "Deuxième valeur x₂", type: "number", default: "6", when: { mode: ["direct", "inverse"] }, help: "Exemple : 6 ouvriers ; y₂ est l'inconnue." }
  ],
  example: {
    values: { mode: "inverse", ratio: "2:3:5", total: "1200", a: "", b: "", c: "", d: "", x1: "5", y1: "12", x2: "6" },
    expect: ["y₂ = 10"],
    note: "Exemple : 5 ouvriers finissent le travail en 12 jours ; combien de jours faut-il à 6 ouvriers ? (proportionnalité inverse)"
  },
  invalid: { values: { mode: "solve", a: "2", b: "", c: "4", d: "" } },
  related: ["fractions", "percentage", "quadratic"]
};

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function ratioOf(input) {
  const raw = str(input, "ratio", "Rapport");
  const texts = raw.split(":").map((s) => s.trim());
  if (texts.length < 2 || texts.length > 5) fail("Saisissez un rapport de 2 à 5 parties séparées par deux-points, par exemple 2:3:5.", "ratio");
  const parts = texts.map((t) => {
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) fail(`La partie «${t}» du rapport n'est pas un nombre positif.`, "ratio");
    const [ip, fp = ""] = t.split(".");
    const n = BigInt(ip + fp);
    if (n === 0n) fail("Les parties du rapport doivent être supérieures à zéro.", "ratio");
    return { n, scale: fp.length };
  });
  const K = Math.max(...parts.map((p) => p.scale));
  const scaled = parts.map((p) => p.n * 10n ** BigInt(K - p.scale));
  const g = scaled.reduce((x, y) => gcd(x, y));
  return { K, texts, scaled, g, red: scaled.map((x) => x / g) };
}

function simplifyMode(input) {
  const R = ratioOf(input);
  const steps = [];
  if (R.K > 0) steps.push({ text: `On multiplie toutes les parties par ${10n ** BigInt(R.K)} pour obtenir des entiers :`, tex: `${R.texts.join(" : ")} = ${R.scaled.join(" : ")}` });
  if (R.g > 1n) {
    steps.push({ text: "Plus grand commun diviseur de toutes les parties :", tex: `\\gcd(${R.scaled.join(", ")}) = ${R.g}` });
    steps.push({ text: "On divise chaque partie par ce diviseur :", tex: `${R.scaled.join(" : ")} = ${R.red.join(" : ")}` });
  } else {
    steps.push({ text: "Aucun diviseur commun supérieur à 1 : le rapport est déjà simplifié.", tex: `\\gcd(${R.scaled.join(", ")}) = 1` });
  }
  const value = R.red.join(" : ");
  return {
    results: [{ label: "Rapport sous sa forme la plus simple", value }],
    steps,
    copy: `${R.texts.join(" : ")} = ${value}`
  };
}

function divideMode(input) {
  const R = ratioOf(input);
  const total = num(input, "total", "Somme totale", { positive: true });
  const r = R.red.map((x) => Number(x));
  const S = r.reduce((x, y) => x + y, 0);
  const shares = r.map((x) => (total * x) / S);
  const steps = [
    { text: "On simplifie d'abord le rapport, puis on additionne ses parties :", tex: `${R.texts.join(" : ")} = ${r.join(" : ")},\\quad S = ${r.join(" + ")} = ${S}` }
  ];
  r.forEach((x, i) => steps.push({ text: `Part de la partie ${i + 1} = total × sa partie ÷ somme des parties :`, tex: `${ntex(total)} \\times \\frac{${x}}{${S}} = ${N(shares[i])}` }));
  steps.push({ text: "On vérifie que la somme des parts est égale au total :", tex: `${shares.map((s) => N(s)).join(" + ")} = ${ntex(total)}` });
  return {
    results: r.map((x, i) => ({ label: `Part ${i + 1} (${x})`, value: N(shares[i]) })),
    steps,
    copy: `${N(total)} selon le rapport ${R.red.join(":")} = ${shares.map((s) => N(s)).join(" : ")}`
  };
}

function solveMode(input) {
  const v = {};
  const blanks = [];
  for (const k of TERMS) {
    v[k] = num(input, k, `Terme ${k}`, { optional: true });
    if (v[k] === null) blanks.push(k);
  }
  if (blanks.length !== 1) {
    fail(`Saisissez trois termes et laissez un terme vide (vous avez saisi ${4 - blanks.length} termes).`, blanks.length > 1 ? blanks[1] : "a");
  }
  const k = blanks[0];
  if (k !== "b" && v.b === 0) fail("Le dénominateur b ne peut pas être égal à zéro dans une proportion.", "b");
  if (k !== "d" && v.d === 0) fail("Le dénominateur d ne peut pas être égal à zéro dans une proportion.", "d");
  const divisorKey = { a: "d", b: "c", c: "b", d: "a" }[k];
  if (v[divisorKey] === 0) fail(`Impossible de résoudre car le terme ${divisorKey} est égal à zéro.`, divisorKey);

  const known = v;
  const x = k === "a" ? (known.b * known.c) / known.d
    : k === "b" ? (known.a * known.d) / known.c
    : k === "c" ? (known.a * known.d) / known.b
    : (known.b * known.c) / known.a;
  if ((k === "b" || k === "d") && x === 0) fail(`Le terme ${k} calculé est égal à zéro, ce qui donnerait un dénominateur nul dans la proportion.`, k);
  v[k] = x;
  const { a, b, c, d } = v;

  const formula = {
    a: `a = \\frac{b\\cdot c}{d} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(d)}}`,
    b: `b = \\frac{a\\cdot d}{c} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(c)}}`,
    c: `c = \\frac{a\\cdot d}{b} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(b)}}`,
    d: `d = \\frac{b\\cdot c}{a} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(a)}}`
  }[k];
  const steps = [
    { text: "Dans la proportion a/b = c/d, le produit des extrêmes est égal au produit des moyens :", tex: "a\\cdot d = b\\cdot c" },
    { text: `On résout l'équation pour trouver le terme ${k} :`, tex: `${formula} = ${ntex(x, 8)}` },
    { text: "On vérifie la proportion après résolution :", tex: `\\frac{${ntex(a)}}{${ntex(b)}} = ${ntex(a / b, 8)} = ${ntex(c / d, 8)} = \\frac{${ntex(c)}}{${ntex(d)}}` }
  ];
  return {
    results: [
      { label: `Terme inconnu ${k}`, value: N(x) },
      { label: "Proportion complète", value: `${N(a)}/${N(b)} = ${N(c)}/${N(d)}` }
    ],
    steps,
    copy: `${k} = ${N(x)}  (${N(a)}/${N(b)} = ${N(c)}/${N(d)})`
  };
}

function proportionMode(input, inverse) {
  const x1 = num(input, "x1", "Première valeur x₁", { positive: true });
  const y1 = num(input, "y1", "Valeur correspondante y₁", { nonNegative: true });
  const x2 = num(input, "x2", "Deuxième valeur x₂", { positive: true });
  const y2 = inverse ? (y1 * x1) / x2 : (y1 * x2) / x1;
  const k = inverse ? y1 * x1 : y1 / x1;
  const name = inverse ? "inverse" : "directe";
  const steps = inverse
    ? [
        { text: "Dans une proportionnalité inverse, le produit y·x reste constant :", tex: "y_1\\cdot x_1 = y_2\\cdot x_2" },
        { text: "On résout l'équation pour trouver y₂ :", tex: `y_2 = \\frac{y_1\\cdot x_1}{x_2} = \\frac{${ntex(y1)}\\cdot ${ntex(x1)}}{${ntex(x2)}} = ${ntex(y2, 8)}` }
      ]
    : [
        { text: "Dans une proportionnalité directe, le rapport y/x reste constant :", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}" },
        { text: "On résout l'équation pour trouver y₂ :", tex: `y_2 = \\frac{y_1\\cdot x_2}{x_1} = \\frac{${ntex(y1)}\\cdot ${ntex(x2)}}{${ntex(x1)}} = ${ntex(y2, 8)}` }
      ];
  return {
    results: [
      { label: "Valeur inconnue y₂", value: N(y2) },
      { label: inverse ? "Constante de proportionnalité inverse y·x" : "Constante de proportionnalité directe y/x", value: N(k) }
    ],
    steps,
    copy: `y₂ = ${N(y2)} (proportionnalité ${name})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type de problème", MODES, "simplify");
  if (mode === "simplify") return simplifyMode(input);
  if (mode === "solve") return solveMode(input);
  if (mode === "divide") return divideMode(input);
  return proportionMode(input, mode === "inverse");
}
