import { fail, str, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, parseNumber } from "../core/format.js";
import { tCdf, tInv, pFormat, pText } from "./dist.js";

export const meta = {
  description: "Déterminez la droite d'ajustement optimal par la méthode des moindres carrés pour des données (x, y), avec le coefficient de corrélation r, le coefficient de détermination R², le test de significativité de la pente et la prévision, des modèles exponentiel, puissance et logarithmique, et le tracé.",
  keywords: ["Régression linéaire", "Moindres carrés", "Coefficient de corrélation", "de Pearson", "R²", "linear regression", "least squares", "correlation", "Droite d'ajustement optimal", "trendline", "Régression exponentielle"],
  formulas: [
    { label: "Pente et ordonnée à l'origine", tex: "b = \\frac{S_{xy}}{S_{xx}},\\quad a = \\bar y - b\\bar x,\\qquad S_{xy} = \\sum (x_i-\\bar x)(y_i-\\bar y)" },
    { label: "Coefficient de corrélation", tex: "r = \\frac{S_{xy}}{\\sqrt{S_{xx} S_{yy}}},\\qquad t = \\frac{b}{SE_b},\\ \\ df = n - 2" }
  ],
  inputs: [
    { id: "data", label: "Couples de données (x y)", type: "textarea", default: "1 2.1\n2 3.9\n3 6.2\n4 7.8\n5 10.1\n6 12.2", wide: true, help: "Une ligne par point : x puis y, séparés par un espace ou une virgule." },
    { id: "model", label: "Modèle", type: "select", default: "linear", options: [["linear", "Linéaire y = a + bx"], ["exponential", "Exponentiel y = a·e^(bx)"], ["power", "Puissance y = a·x^b"], ["logarithmic", "Logarithmique y = a + b·ln x"]] },
    { id: "x0", label: "Prévision pour x (facultatif)", type: "number", default: "" }
  ],
  example: { values: { data: "1 2\n2 4\n3 5\n4 4\n5 5", model: "linear", x0: "6" }, expect: ["y = 2.2 + 0.6x", "r = 0.7746"], note: "Exemple tiré des manuels de statistique : cinq points, et prévision de la valeur de y pour x = 6." },
  invalid: { values: { data: "1 2\n1 3\n1 4", model: "linear", x0: "" } },
  related: ["descriptive-stats", "hypothesis-tests", "probability-distributions", "function-plotter"]
};

const sig = (v) => fmt(v, 4);

export function solve(input) {
  const model = choice(input, "model", "Modèle", ["linear", "exponential", "power", "logarithmic"], "linear");
  const lines = str(input, "data", "Données").split(/\r?\n|;|؛/).map((l) => l.trim()).filter(Boolean);
  const X = [], Y = [];
  lines.forEach((l, i) => {
    const p = l.split(/[\s,،\t]+/).filter(Boolean);
    if (p.length !== 2) fail(`La ligne ${i + 1} doit contenir deux valeurs : x et y.`, "data");
    const x = parseNumber(p[0]), y = parseNumber(p[1]);
    if (!isFinite(x) || !isFinite(y)) fail(`La ligne ${i + 1} contient une valeur non numérique.`, "data");
    X.push(x); Y.push(y);
  });
  const n = X.length;
  if (n < 3) fail("Saisissez au moins trois points.", "data");
  if ((model === "power" || model === "logarithmic") && X.some((x) => x <= 0)) fail("Ce modèle nécessite des valeurs de x positives (pour le logarithme).", "data");
  if ((model === "exponential" || model === "power") && Y.some((y) => y <= 0)) fail("Ce modèle nécessite des valeurs de y positives (pour le logarithme).", "data");
  const u = X.map((x) => (model === "power" || model === "logarithmic" ? Math.log(x) : x));
  const v = Y.map((y) => (model === "exponential" || model === "power" ? Math.log(y) : y));
  const mu = u.reduce((a, b) => a + b, 0) / n, mv = v.reduce((a, b) => a + b, 0) / n;
  let Sxx = 0, Syy = 0, Sxy = 0;
  for (let i = 0; i < n; i++) { Sxx += (u[i] - mu) ** 2; Syy += (v[i] - mv) ** 2; Sxy += (u[i] - mu) * (v[i] - mv); }
  if (Sxx === 0) fail("Toutes les valeurs de x sont égales : il est impossible de déterminer une droite de régression.", "data");
  if (Syy === 0) fail("Toutes les valeurs de y sont égales : la relation est une droite horizontale et le coefficient de corrélation n'a pas de sens.", "data");
  const b = Sxy / Sxx, a0 = mv - b * mu;
  const r = Sxy / Math.sqrt(Sxx * Syy);
  const sse = Math.max(0, Syy - b * Sxy);
  const se = n > 2 ? Math.sqrt(sse / (n - 2)) : NaN;
  const seb = se / Math.sqrt(Sxx);
  const tstat = seb > 0 ? b / seb : Infinity;
  const p = seb > 0 ? 2 * (1 - tCdf(Math.abs(tstat), n - 2)) : 0;
  const tc = tInv(0.975, n - 2);
  const a = model === "exponential" || model === "power" ? Math.exp(a0) : a0;
  const f = (x) => {
    if (model === "linear") return a + b * x;
    if (model === "exponential") return a * Math.exp(b * x);
    if (model === "power") return a * Math.pow(x, b);
    return a + b * Math.log(x);
  };
  const sgn = (k) => (k < 0 ? "-" : "+");
  const eqText = {
    linear: `y = ${sig(a)} ${sgn(b)} ${sig(Math.abs(b))}x`,
    exponential: `y = ${sig(a)}·e^(${sig(b)}x)`,
    power: `y = ${sig(a)}·x^${sig(b)}`,
    logarithmic: `y = ${sig(a)} ${sgn(b)} ${sig(Math.abs(b))}·ln x`
  }[model];
  const eqTex = {
    linear: `\\hat y = ${ntex(a, 4)} ${sgn(b)} ${ntex(Math.abs(b), 4)}\\,x`,
    exponential: `\\hat y = ${ntex(a, 4)}\\,e^{${ntex(b, 4)}x}`,
    power: `\\hat y = ${ntex(a, 4)}\\,x^{${ntex(b, 4)}}`,
    logarithmic: `\\hat y = ${ntex(a, 4)} ${sgn(b)} ${ntex(Math.abs(b), 4)}\\ln x`
  }[model];
  const steps = [];
  if (model !== "linear") steps.push({ exponential: "On linéarise le modèle en prenant ln y, ce qui donne ln y = ln a + bx.", power: "On prend le logarithme des deux membres : ln y = ln a + b·ln x, puis on effectue une régression linéaire sur (ln x, ln y).", logarithmic: "On remplace x par ln x, puis on effectue une régression linéaire ordinaire." }[model]);
  steps.push(
    { text: "Moyennes et sommes des carrés :", tex: `\\bar u = ${ntex(mu, 6)},\\ \\bar v = ${ntex(mv, 6)},\\ S_{xx} = ${ntex(Sxx, 6)},\\ S_{yy} = ${ntex(Syy, 6)},\\ S_{xy} = ${ntex(Sxy, 6)}` },
    { text: "Pente et ordonnée à l'origine :", tex: `b = \\frac{${ntex(Sxy, 6)}}{${ntex(Sxx, 6)}} = ${ntex(b, 6)},\\quad ${model === "exponential" || model === "power" ? `\\ln a = ${ntex(a0, 6)} \\Rightarrow a = ${ntex(a, 6)}` : `a = ${ntex(mv, 6)} - (${ntex(b, 6)})(${ntex(mu, 6)}) = ${ntex(a, 6)}`}` },
    { text: "Équation de la régression :", tex: eqTex },
    { text: "Coefficient de corrélation et coefficient de détermination :", tex: `r = \\frac{${ntex(Sxy, 6)}}{\\sqrt{${ntex(Sxx, 6)} \\times ${ntex(Syy, 6)}}} = ${ntex(r, 5)},\\quad R^2 = ${ntex(r * r, 5)}` },
    { text: "Test de significativité de la pente (H₀ : b = 0) :", tex: `SE_b = ${ntex(seb, 5)},\\quad t = ${isFinite(tstat) ? ntex(tstat, 5) : "\\infty"},\\quad df = ${n - 2},\\quad p = ${pFormat(p)}` }
  );
  const absr = Math.abs(r);
  const strength = absr >= 0.9 ? "très forte" : absr >= 0.7 ? "forte" : absr >= 0.5 ? "moyenne" : absr >= 0.3 ? "faible" : "très faible ou nulle";
  const results = [
    { label: "Équation de la régression", value: eqText, tex: eqTex },
    { label: "Pente b", value: `${fmt(b, 6)} ± ${fmt(tc * seb, 4)} (95%)` },
    { label: model === "exponential" || model === "power" ? "Coefficient a" : "Ordonnée à l'origine a", value: fmt(a, 6) },
    { label: "Coefficient de corrélation r", value: fmt(r, 4), text: `r = ${fmt(r, 4)}` },
    { label: "Coefficient de détermination R²", value: fmt(r * r, 4) },
    { label: "Force et sens de la relation", value: `${strength}، ${r > 0 ? "directe" : r < 0 ? "inverse" : "aucun sens"}` },
    { label: "Erreur standard de l'estimation", value: fmt(se, 4) },
    { label: "Valeur p de la pente", value: `${pFormat(p)} ${p < 0.05 ? "(significative à 0.05)" : "(non significative à 0.05)"}` }
  ];
  let copy = `${eqText}, r = ${fmt(r, 4)}, R² = ${fmt(r * r, 4)}, ${pText(p)}`;
  if (!isBlank(input.x0)) {
    const x0 = num(input, "x0", "Valeur de x pour la prévision");
    if ((model === "power" || model === "logarithmic") && x0 <= 0) fail("La prévision dans ce modèle nécessite un x positif.", "x0");
    const y0 = f(x0);
    results.push({ label: `Prévision pour x = ${fmt(x0)}`, value: fmt(y0, 6) });
    steps.push({ text: "Prévision :", tex: `\\hat y(${ntex(x0)}) = ${ntex(y0, 6)}` });
    copy += `, ŷ(${fmt(x0)}) = ${fmt(y0, 6)}`;
    const xmin = Math.min(...X), xmax = Math.max(...X);
    if (x0 < xmin || x0 > xmax) steps.push("Attention : la valeur de x est en dehors de l'étendue des données (extrapolation), la prévision est donc moins fiable.");
  }
  const xmin = Math.min(...X), xmax = Math.max(...X), pad = (xmax - xmin) * 0.05;
  const lo = model === "power" || model === "logarithmic" ? Math.max(xmin - pad, xmin / 2) : xmin - pad;
  const line = Array.from({ length: 201 }, (_, i) => { const x = lo + ((xmax + pad - lo) * i) / 200; return [x, f(x)]; });
  const rows = X.map((x, i) => [fmt(x, 6), fmt(Y[i], 6), fmt(f(x), 6), fmt(Y[i] - f(x), 4)]);
  return {
    results, steps, copy,
    blocks: [
      { type: "plot", title: "Données et droite de régression", xLabel: "x", yLabel: "y", series: [{ name: "Données", points: X.map((x, i) => [x, Y[i]]), marker: "o" }, { name: eqText, points: line }] },
      { type: "table", caption: "Valeurs prévues et résidus", head: ["x", "y", "ŷ", "Résidu y − ŷ"], rows: rows.slice(0, 200) }
    ]
  };
}
