import { fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { mean, quantile, tInv } from "./dist.js";

export const meta = {
  description: "Saisissez un jeu de données et obtenez toutes ses mesures descriptives : moyenne, médiane, mode, variance, écart type, quartiles, valeurs aberrantes, asymétrie et intervalle de confiance de la moyenne, avec un histogramme.",
  keywords: ["Statistique descriptive", "Moyenne arithmétique", "Moyenne", "Médiane", "Mode", "Écart type", "Variance", "Quartiles", "IQR", "Valeurs aberrantes", "descriptive statistics", "mean", "median", "standard deviation", "Histogramme"],
  formulas: [
    { label: "Moyenne et écart type de l'échantillon", tex: "\\bar x = \\frac{1}{n}\\sum x_i,\\qquad s = \\sqrt{\\frac{\\sum (x_i - \\bar x)^2}{n-1}}" },
    { label: "Intervalle de confiance de la moyenne", tex: "\\bar x \\pm t_{\\alpha/2,\\,n-1}\\,\\frac{s}{\\sqrt n}" }
  ],
  inputs: [
    { id: "data", label: "Données", type: "textarea", default: "12 15 11 18 15 20 14 15 16 13 22 9", wide: true, help: "Séparez les valeurs par des espaces, des virgules ou des retours à la ligne." },
    { id: "conf", label: "Niveau de confiance", unit: "%", type: "number", default: "95" }
  ],
  example: { values: { data: "2 4 4 4 5 5 7 9", conf: "95" }, expect: ["x̄ = 5", "s = 2.138", "Médiane = 4.5"], note: "Exemple : huit valeurs célèbres des manuels de statistique." },
  invalid: { values: { data: "5", conf: "95" } },
  related: ["probability-distributions", "hypothesis-tests", "linear-regression", "significant-figures"]
};

export function solve(input) {
  const x = numList(input, "data", "Données", { min: 2, max: 100000 });
  const conf = num(input, "conf", "Niveau de confiance", { min: 50, below: 100 });
  const n = x.length, s = [...x].sort((a, b) => a - b);
  const m = mean(x), sum = x.reduce((a, b) => a + b, 0);
  const ss = x.reduce((a, v) => a + (v - m) ** 2, 0);
  const vs = ss / (n - 1), vp = ss / n, sd = Math.sqrt(vs), sdp = Math.sqrt(vp);
  const med = quantile(s, 0.5), q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1;
  const freq = new Map();
  for (const v of x) freq.set(v, (freq.get(v) || 0) + 1);
  const maxF = Math.max(...freq.values());
  const modes = maxF > 1 ? [...freq].filter(([, c]) => c === maxF).map(([v]) => v).sort((a, b) => a - b) : [];
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const out = s.filter((v) => v < lo || v > hi);
  const se = sd / Math.sqrt(n);
  const tc = tInv(1 - (1 - conf / 100) / 2, n - 1);
  const m3 = x.reduce((a, v) => a + (v - m) ** 3, 0) / n, m4 = x.reduce((a, v) => a + (v - m) ** 4, 0) / n;
  const skew = n > 2 && vp > 0 ? (Math.sqrt(n * (n - 1)) / (n - 2)) * (m3 / vp ** 1.5) : NaN;
  const kurt = n > 3 && vp > 0 ? ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * (m4 / (vp * vp) - 3) + 6) : NaN;
  const f = (v) => fmt(v, 6);
  const results = [
    { label: "Nombre de valeurs n", value: String(n) },
    { label: "Moyenne arithmétique", value: f(m), text: `x̄ = ${f(m)}` },
    { label: "Médiane", value: f(med), text: `Médiane = ${f(med)}` },
    { label: "Mode", value: modes.length ? modes.map(f).join("، ") : "Aucun (chaque valeur n'apparaît qu'une fois)" },
    { label: "Écart type de l'échantillon s", value: f(sd), text: `s = ${fmt(sd, 4)}` },
    { label: "Variance de l'échantillon s²", value: f(vs) },
    { label: "Écart type de la population σ", value: f(sdp) },
    { label: "Plus petite / plus grande valeur", value: `${f(s[0])} / ${f(s[n - 1])}` },
    { label: "Étendue", value: f(s[n - 1] - s[0]) },
    { label: "Premier quartile Q1 / troisième quartile Q3", value: `${f(q1)} / ${f(q3)}` },
    { label: "Écart interquartile IQR", value: f(iqr) },
    { label: "Somme", value: f(sum) },
    { label: "Erreur standard de la moyenne", value: f(se) },
    { label: `Intervalle de confiance à ${fmt(conf)}% pour la moyenne`, value: `[${f(m - tc * se)} ، ${f(m + tc * se)}]` },
    { label: "Coefficient de variation CV", value: m !== 0 ? `${fmt((100 * sd) / Math.abs(m), 4)}%` : "Non défini (moyenne nulle)" },
    { label: "Asymétrie", value: isFinite(skew) ? fmt(skew, 4) : "Non défini" },
    { label: "Aplatissement (excès)", value: isFinite(kurt) ? fmt(kurt, 4) : "Non défini" },
    { label: "Valeurs aberrantes (règle 1.5 × IQR)", value: out.length ? out.map(f).join("، ") : "Aucune" }
  ];
  const steps = [
    { text: "Moyenne arithmétique :", tex: `\\bar x = \\frac{${ntex(sum, 8)}}{${n}} = ${ntex(m, 6)}` },
    `On trie les données par ordre croissant : ${s.length <= 40 ? s.map(f).join("، ") : s.slice(0, 40).map(f).join("، ") + " …"}.`,
    n % 2 ? `Le nombre de valeurs est impair : la médiane est la valeur n° ${(n + 1) / 2} : ${f(med)}.` : `Le nombre de valeurs est pair : la médiane est la moyenne des deux valeurs ${n / 2} et ${n / 2 + 1} : ${f(med)}.`,
    { text: "Somme des carrés des écarts et écart type de l'échantillon :", tex: `\\sum (x_i - \\bar x)^2 = ${ntex(ss, 6)},\\quad s = \\sqrt{\\frac{${ntex(ss, 6)}}{${n - 1}}} = ${ntex(sd, 6)}` },
    "Quartiles calculés par interpolation linéaire (méthode d'Excel et fonction R par défaut).",
    { text: `Intervalle de confiance (${fmt(conf)}%) avec la loi de Student à ${n - 1} degrés de liberté :`, tex: `${ntex(m, 6)} \\pm ${ntex(tc, 5)} \\times \\frac{${ntex(sd, 5)}}{\\sqrt{${n}}} = ${ntex(m, 6)} \\pm ${ntex(tc * se, 5)}` }
  ];
  const blocks = [];
  if (s[n - 1] > s[0]) {
    const k = Math.min(30, Math.max(5, Math.ceil(Math.log2(n) + 1)));
    const w = (s[n - 1] - s[0]) / k;
    const counts = Array(k).fill(0);
    for (const v of s) counts[Math.min(k - 1, Math.floor((v - s[0]) / w))]++;
    const pts = [[s[0], 0]];
    counts.forEach((c, i) => { const a = s[0] + i * w; pts.push([a, c], [a + w, c]); });
    pts.push([s[n - 1], 0]);
    blocks.push({ type: "plot", title: `Histogramme (${k} classes)`, xLabel: "Valeur", yLabel: "Effectif", includeZero: true, series: [{ name: "Effectif", points: pts }], vlines: [{ x: m }] });
    blocks.push({ type: "table", caption: "Tableau de distribution des effectifs", head: ["Classe", "Effectif", "Relatif"], rows: counts.map((c, i) => [`${fmt(s[0] + i * w, 4)} – ${fmt(s[0] + (i + 1) * w, 4)}`, String(c), `${fmt((100 * c) / n, 3)}%`]) });
  } else blocks.push({ type: "note", text: "Toutes les valeurs sont égales : la dispersion est nulle." });
  return { results, steps, blocks, copy: `n = ${n}, x̄ = ${f(m)}, médiane = ${f(med)}, s = ${fmt(sd, 4)}, σ = ${fmt(sdp, 4)}, Q1 = ${f(q1)}, Q3 = ${f(q3)}` };
}
