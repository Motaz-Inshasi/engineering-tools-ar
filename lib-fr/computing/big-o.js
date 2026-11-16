import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const LN10 = Math.LN10;
const YEAR_S = 365.25 * 86400;
const UNIVERSE_S = 4.35e17;
const PLOT_CAP = 1000;

const CLASSES = [
  { id: "const", label: "O(1)", tex: "1" },
  { id: "log", label: "O(log n)", tex: "\\log_2 n" },
  { id: "lin", label: "O(n)", tex: "n" },
  { id: "nlogn", label: "O(n log n)", tex: "n\\log_2 n" },
  { id: "quad", label: "O(n²)", tex: "n^2" },
  { id: "cubic", label: "O(n³)", tex: "n^3" },
  { id: "exp", label: "O(2ⁿ)", tex: "2^n" },
  { id: "fact", label: "O(n!)", tex: "n!" }
];

export const meta = {
  description: "Comparez le nombre d'opérations et le temps approximatif des classes de complexité O(1), O(log n), O(n), O(n log n), O(n²), O(n³), O(2ⁿ) et O(n!) pour une taille d'entrée et une vitesse d'exécution données, avec un graphique comparant la croissance.",
  keywords: ["complexité", "Big-O", "O(n)", "O(n^2)", "algorithme", "temps d'exécution", "opérations", "factorial", "log n", "complexity"],
  formulas: [
    { label: "temps d'exécution", tex: "t = \\frac{f(n)}{S}" },
    { label: "logarithme de la factorielle (approximation de Stirling pour les grandes valeurs)", tex: "\\log_{10} n! \\approx \\frac{1}{\\ln 10}\\left(n\\ln n - n + \\tfrac{1}{2}\\ln(2\\pi n)\\right)" }
  ],
  inputs: [
    { id: "n", label: "Taille de l'entrée n", type: "number", default: "1000000", help: "Entier de 1 à 10^12." },
    { id: "cls", label: "Classe de complexité choisie", type: "select", default: "quad", options: CLASSES.map((c) => [c.id, c.label]) },
    { id: "ops", label: "Vitesse d'exécution", unit: "opérations/s", type: "number", default: "1e9", help: "Par exemple 1e9 signifie un milliard d'opérations par seconde." }
  ],
  example: { values: { n: "1000000", cls: "quad", ops: "1e9" }, expect: ["10^12", "1000 s"], note: "Exemple : n = 10^6 et traitement de 10^9 opérations par seconde pour la classe O(n²)." },
  invalid: { values: { n: "0", cls: "quad", ops: "1e9" } },
  related: ["ieee754", "data-transfer"]
};

export function log10Factorial(n) {
  if (n < 20) {
    let s = 0;
    for (let k = 2; k <= n; k++) s += Math.log10(k);
    return s;
  }
  return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n)) / LN10;
}

export function log10Ops(cls, n) {
  const L = Math.log10(n);
  const Lg = Math.log10(Math.log2(n));
  switch (cls) {
    case "const": return 0;
    case "log": return Lg;
    case "lin": return L;
    case "nlogn": return L + Lg;
    case "quad": return 2 * L;
    case "cubic": return 3 * L;
    case "exp": return n * Math.log10(2);
    default: return log10Factorial(n);
  }
}

export function humanize(T) {
  const t = Number(T.toPrecision(9));
  if (t === 0) return "0 seconde";
  if (t < 1e-6) return `${fmt(t * 1e9, 3)} ns`;
  if (t < 1e-3) return `${fmt(t * 1e6, 3)} µs`;
  if (t < 1) return `${fmt(t * 1e3, 3)} ms`;
  if (t < 60) return `${fmt(t, 3)} secondes`;
  if (t < 3600) {
    const m = Math.floor(t / 60);
    return `${m} minutes et ${fmt(t - m * 60, 3)} secondes`;
  }
  if (t < 86400) {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t - h * 3600) / 60);
    return `${h} heures et ${m} minutes`;
  }
  if (t < YEAR_S) {
    const d = Math.floor(t / 86400);
    const h = Math.floor((t - d * 86400) / 3600);
    return `${d} jours et ${h} heures`;
  }
  if (t > UNIVERSE_S) return "plus long que l'âge de l'univers";
  const y = Math.floor(t / YEAR_S);
  const d = Math.floor((t - y * YEAR_S) / 86400);
  return `${y} ans et ${d} jours`;
}

export function timeOf(Lt) {
  if (Lt === -Infinity) return { seconds: 0, text: "0 seconde" };
  if (Lt > Math.log10(UNIVERSE_S)) return { seconds: null, text: "plus long que l'âge de l'univers" };
  const seconds = Math.pow(10, Lt);
  return { seconds, text: humanize(seconds) };
}

export function sciOps(L) {
  if (L === -Infinity) return "0";
  if (L < 6) return fmt(Math.pow(10, L), 4);
  const e = Math.floor(L);
  return `${fmt(Math.pow(10, L - e), 3)} × 10^${e}`;
}

function texOps(L) {
  if (L === -Infinity) return "0";
  if (L < 6) return ntex(Math.pow(10, L), 4);
  const e = Math.floor(L);
  return `${ntex(Math.pow(10, L - e), 3)} \\times 10^{${e}}`;
}

export function solve(input) {
  const n = num(input, "n", "Taille de l'entrée n", { integer: true, min: 1, max: 1e12 });
  const S = num(input, "ops", "Vitesse d'exécution", { positive: true });
  const cls = choice(input, "cls", "Classe de complexité", CLASSES.map((c) => c.id), "quad");
  const info = CLASSES.find((c) => c.id === cls);
  const L = log10Ops(cls, n);
  const time = timeOf(L - Math.log10(S));
  const rows = CLASSES.map((c) => {
    const Lc = log10Ops(c.id, n);
    return [c.label, sciOps(Lc), timeOf(Lc - Math.log10(S)).text];
  });
  const blocks = [{ type: "table", caption: `Classes de complexité pour n = ${fmt(n, 6)} et une vitesse de ${fmt(S, 4)} opérations/s`, head: ["Classe", "Nombre d'opérations", "Temps approximatif"], rows, ltr: true }];
  const plotN = Math.min(n, PLOT_CAP);
  if (n > PLOT_CAP) blocks.push({ type: "note", text: `Le graphique affiche n de 1 à ${PLOT_CAP} uniquement, pour une meilleure lisibilité des courbes.` });
  if (plotN >= 2) {
    const step = Math.max(1, Math.floor(plotN / 200));
    const xs = [];
    for (let x = 1; x <= plotN; x += step) xs.push(x);
    if (xs[xs.length - 1] !== plotN) xs.push(plotN);
    const series = ["lin", "nlogn", "quad", "cubic"].map((id) => ({
      name: CLASSES.find((c) => c.id === id).label,
      points: xs.map((x) => [x, log10Ops(id, x)]).filter((p) => Number.isFinite(p[1]))
    }));
    blocks.push({ type: "plot", title: "log10(nombre d'opérations) en fonction de n", xLabel: "n", yLabel: "log10(ops)", includeZero: true, series });
  }
  const secText = time.seconds === null ? "plus de 4.35 × 10^17 s" : `${fmt(time.seconds, 4)} s`;
  const secTex = time.seconds === null ? "> 4.35 \\times 10^{17}\\ s" : `${ntex(time.seconds, 4)}\\ s`;
  return {
    results: [
      { label: `Nombre d'opérations pour ${info.label}`, value: sciOps(L) },
      { label: "Temps approximatif", value: time.text },
      { label: "Durée en secondes", value: secText }
    ],
    steps: [
      { text: `Nombre d'opérations pour la classe ${info.label} :`, tex: `f(n) = ${info.tex} = ${texOps(L)}` },
      { text: "Temps d'exécution en secondes :", tex: `t = \\frac{f(n)}{S} = \\frac{${texOps(L)}}{${ntex(S)}} = ${secTex}` },
      `Conversion en unité lisible : ${time.text}.`
    ],
    copy: `${info.label} pour n = ${fmt(n, 6)} : ${sciOps(L)} opérations ≈ ${time.text}${time.seconds === null ? "" : ` (${secText})`}`,
    blocks
  };
}
