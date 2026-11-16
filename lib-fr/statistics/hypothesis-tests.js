import { fail, choice, numList, matrixInput, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { normCdf, normInv, tCdf, tInv, chi2Cdf, chi2Inv, mean, variance, pText } from "./dist.js";

export const meta = {
  description: "Effectuez les tests d'hypothèses courants : z et t pour un échantillon, pour deux échantillons et pour des paires, test de proportions, et khi-deux d'adéquation et d'indépendance, avec la statistique de test, la valeur p, la valeur critique, la décision et l'intervalle de confiance.",
  keywords: ["Test d'hypothèses", "Test t", "Test z", "Valeur p", "p-value", "Khi-deux", "chi-square", "Hypothèse nulle", "Niveau de signification", "t-test", "Deux échantillons", "Paires", "Proportion"],
  formulas: [
    { label: "Statistique t pour un échantillon", tex: "t = \\frac{\\bar x - \\mu_0}{s/\\sqrt n},\\quad df = n - 1" },
    { label: "Test de Welch pour deux échantillons", tex: "t = \\frac{\\bar x_1 - \\bar x_2}{\\sqrt{s_1^2/n_1 + s_2^2/n_2}}" },
    { label: "Khi-deux", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "test", label: "Type de test", type: "select", default: "t1", options: [["z1", "z pour un échantillon (σ connu)"], ["t1", "t pour un échantillon"], ["t2", "t pour deux échantillons indépendants"], ["paired", "t pour des paires (avant et après)"], ["prop1", "Une proportion"], ["prop2", "Comparaison de deux proportions"], ["gof", "Khi-deux : adéquation"], ["indep", "Khi-deux : indépendance"]] },
    { id: "xbar", label: "Moyenne x̄", type: "number", default: "52.3", when: { test: ["z1", "t1", "t2"] } },
    { id: "sd", label: "Écart type de l'échantillon s", type: "number", default: "6.1", when: { test: ["t1", "t2"] } },
    { id: "sigma", label: "Écart type de la population σ", type: "number", default: "6", when: { test: ["z1"] } },
    { id: "n", label: "Taille de l'échantillon n", type: "number", default: "25", when: { test: ["z1", "t1", "t2", "prop1", "prop2"] } },
    { id: "xbar2", label: "Moyenne du second échantillon", type: "number", default: "48.9", when: { test: ["t2"] } },
    { id: "sd2", label: "Écart type du second échantillon", type: "number", default: "7.4", when: { test: ["t2"] } },
    { id: "n2", label: "Taille du second échantillon", type: "number", default: "30", when: { test: ["t2", "prop2"] } },
    { id: "pooled", label: "Supposer les variances égales (t groupé)", type: "checkbox", default: "", when: { test: ["t2"] } },
    { id: "mu0", label: "Valeur supposée μ₀ (ou différence)", type: "number", default: "50", when: { test: ["z1", "t1", "t2", "paired"] } },
    { id: "d1", label: "Premières mesures (avant)", type: "textarea", default: "72 68 75 80 66 71 77 69", when: { test: ["paired"] } },
    { id: "d2", label: "Secondes mesures (après)", type: "textarea", default: "75 70 74 85 70 75 80 70", when: { test: ["paired"] } },
    { id: "x", label: "Nombre de succès x", type: "number", default: "58", when: { test: ["prop1", "prop2"] } },
    { id: "x2", label: "Nombre de succès dans le second échantillon", type: "number", default: "45", when: { test: ["prop2"] } },
    { id: "p0", label: "Proportion supposée p₀", type: "number", default: "0.5", when: { test: ["prop1"] } },
    { id: "obs", label: "Effectifs observés", type: "textarea", default: "18 22 20 25 15", when: { test: ["gof"] } },
    { id: "exp", label: "Effectifs ou proportions attendus (facultatif)", type: "textarea", default: "", when: { test: ["gof"] }, help: "Laissez vide pour supposer l'égalité. Vous pouvez saisir des proportions comme 0.25 0.5 0.25 ou des effectifs." },
    { id: "table", label: "Tableau de contingence (une ligne par ligne)", type: "textarea", default: "20 30\n25 25\n15 35", when: { test: ["indep"] } },
    { id: "alt", label: "Hypothèse alternative", type: "select", default: "two", options: [["two", "≠ (bilatérale)"], ["greater", "> (unilatérale droite)"], ["less", "< (unilatérale gauche)"]], when: { test: ["z1", "t1", "t2", "paired", "prop1", "prop2"] } },
    { id: "alpha", label: "Niveau de signification α", type: "number", default: "0.05" }
  ],
  example: { values: { test: "t1", xbar: "52.3", sd: "6.1", n: "25", mu0: "50", alt: "two", alpha: "0.05" }, expect: ["t = 1.885", "p = 0.07156", "Nous ne rejetons pas H₀"], note: "Exemple : un échantillon de 25 étudiants a une moyenne de 52.3 et un écart type de 6.1 ; la moyenne diffère-t-elle de 50 ?" },
  invalid: { values: { test: "t1", xbar: "52", sd: "6", n: "1", mu0: "50", alt: "two", alpha: "0.05" } },
  related: ["descriptive-stats", "probability-distributions", "linear-regression"]
};

const ALT = { two: "\\neq", greater: ">", less: "<" };

function pval(stat, cdf, alt) {
  if (alt === "greater") return 1 - cdf(stat);
  if (alt === "less") return cdf(stat);
  return 2 * Math.min(cdf(stat), 1 - cdf(stat));
}

function crit(inv, alpha, alt) {
  if (alt === "greater") return `${fmt(inv(1 - alpha), 5)}`;
  if (alt === "less") return `${fmt(inv(alpha), 5)}`;
  return `±${fmt(inv(1 - alpha / 2), 5)}`;
}

export function solve(input) {
  const test = choice(input, "test", "Type de test", ["z1", "t1", "t2", "paired", "prop1", "prop2", "gof", "indep"], "t1");
  const alt = choice(input, "alt", "Hypothèse alternative", ["two", "greater", "less"], "two");
  const alpha = num(input, "alpha", "Niveau de signification", { min: 1e-6, max: 0.5 });
  const steps = [], results = [], blocks = [];
  let stat, p, symbol, critText, ci = null, h0, h1, df = null;
  const zDist = { cdf: normCdf, inv: normInv };
  const tDist = (k) => ({ cdf: (x) => tCdf(x, k), inv: (q) => tInv(q, k) });
  const confText = `${fmt(100 * (1 - alpha))}%`;
  if (test === "z1" || test === "t1") {
    const xb = num(input, "xbar", "Moyenne");
    const n = num(input, "n", "Taille de l'échantillon", { integer: true, min: 2 });
    const s = test === "z1" ? num(input, "sigma", "σ", { positive: true }) : num(input, "sd", "Écart type", { positive: true });
    const mu0 = num(input, "mu0", "Valeur supposée");
    const se = s / Math.sqrt(n);
    stat = (xb - mu0) / se;
    symbol = test === "z1" ? "z" : "t";
    const D = test === "z1" ? zDist : tDist(n - 1);
    if (test === "t1") df = n - 1;
    p = pval(stat, D.cdf, alt);
    critText = crit(D.inv, alpha, alt);
    const q = test === "z1" ? normInv(1 - alpha / 2) : tInv(1 - alpha / 2, n - 1);
    ci = [xb - q * se, xb + q * se];
    h0 = `\\mu = ${ntex(mu0)}`; h1 = `\\mu ${ALT[alt]} ${ntex(mu0)}`;
    steps.push({ text: "Erreur standard et statistique de test :", tex: `SE = \\frac{${ntex(s)}}{\\sqrt{${n}}} = ${ntex(se, 5)},\\quad ${symbol} = \\frac{${ntex(xb)} - ${ntex(mu0)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "t2") {
    const x1 = num(input, "xbar", "Première moyenne"), s1 = num(input, "sd", "Premier écart type", { positive: true }), n1 = num(input, "n", "Taille du premier échantillon", { integer: true, min: 2 });
    const x2 = num(input, "xbar2", "Seconde moyenne"), s2 = num(input, "sd2", "Second écart type", { positive: true }), n2 = num(input, "n2", "Taille du second échantillon", { integer: true, min: 2 });
    const d0 = isBlank(input.mu0) ? 0 : num(input, "mu0", "Différence supposée");
    const pooled = !isBlank(input.pooled) && input.pooled !== "0";
    let se;
    if (pooled) {
      const sp2 = ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2);
      se = Math.sqrt(sp2 * (1 / n1 + 1 / n2)); df = n1 + n2 - 2;
      steps.push({ text: "Variance groupée :", tex: `s_p^2 = \\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2} = ${ntex(sp2, 5)},\\quad SE = ${ntex(se, 5)},\\ df = ${df}` });
    } else {
      const a = (s1 * s1) / n1, b = (s2 * s2) / n2;
      se = Math.sqrt(a + b); df = (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1));
      steps.push({ text: "Test de Welch (sans supposer l'égalité des variances) :", tex: `SE = \\sqrt{\\frac{${ntex(s1)}^2}{${n1}} + \\frac{${ntex(s2)}^2}{${n2}}} = ${ntex(se, 5)},\\quad df \\approx ${ntex(df, 5)}` });
    }
    stat = (x1 - x2 - d0) / se; symbol = "t";
    const D = tDist(df);
    p = pval(stat, D.cdf, alt); critText = crit(D.inv, alpha, alt);
    const q = tInv(1 - alpha / 2, df);
    ci = [x1 - x2 - q * se, x1 - x2 + q * se];
    h0 = `\\mu_1 - \\mu_2 = ${ntex(d0)}`; h1 = `\\mu_1 - \\mu_2 ${ALT[alt]} ${ntex(d0)}`;
    steps.push({ text: "Statistique de test :", tex: `t = \\frac{(${ntex(x1)} - ${ntex(x2)}) - ${ntex(d0)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "paired") {
    const a = numList(input, "d1", "Premières mesures", { min: 2 }), b = numList(input, "d2", "Secondes mesures", { min: 2 });
    if (a.length !== b.length) fail(`Le nombre de mesures doit être identique dans les deux listes (${a.length} contre ${b.length}).`, "d2");
    const d = b.map((v, i) => v - a[i]), n = d.length;
    const md = mean(d), sd = Math.sqrt(variance(d));
    if (sd === 0) fail("Toutes les différences sont égales : l'écart type des différences est nul et le test ne peut pas être effectué.", "d2");
    const d0 = isBlank(input.mu0) ? 0 : num(input, "mu0", "Différence supposée");
    const se = sd / Math.sqrt(n);
    stat = (md - d0) / se; symbol = "t"; df = n - 1;
    const D = tDist(df);
    p = pval(stat, D.cdf, alt); critText = crit(D.inv, alpha, alt);
    const q = tInv(1 - alpha / 2, df);
    ci = [md - q * se, md + q * se];
    h0 = `\\mu_d = ${ntex(d0)}`; h1 = `\\mu_d ${ALT[alt]} ${ntex(d0)}`;
    steps.push(`Calcul des différences d = après − avant : ${d.slice(0, 30).map((v) => fmt(v)).join("، ")}.`);
    steps.push({ text: "Moyenne des différences, écart type et statistique de test :", tex: `\\bar d = ${ntex(md, 5)},\\ s_d = ${ntex(sd, 5)},\\quad t = \\frac{${ntex(md, 5)} - ${ntex(d0)}}{${ntex(sd, 5)}/\\sqrt{${n}}} = ${ntex(stat, 5)}` });
  } else if (test === "prop1") {
    const n = num(input, "n", "Taille de l'échantillon", { integer: true, min: 1 }), x = num(input, "x", "Nombre de succès", { integer: true, nonNegative: true });
    if (x > n) fail("Le nombre de succès ne peut pas dépasser la taille de l'échantillon.", "x");
    const p0 = num(input, "p0", "Proportion supposée", { min: 0, max: 1 });
    if (p0 <= 0 || p0 >= 1) fail("La proportion supposée doit être comprise entre 0 et 1, sans les bornes.", "p0");
    const ph = x / n, se = Math.sqrt((p0 * (1 - p0)) / n);
    stat = (ph - p0) / se; symbol = "z";
    p = pval(stat, normCdf, alt); critText = crit(normInv, alpha, alt);
    const sep = Math.sqrt((ph * (1 - ph)) / n);
    ci = [ph - normInv(1 - alpha / 2) * sep, ph + normInv(1 - alpha / 2) * sep];
    h0 = `p = ${ntex(p0)}`; h1 = `p ${ALT[alt]} ${ntex(p0)}`;
    steps.push({ text: "Proportion dans l'échantillon et statistique z :", tex: `\\hat p = \\frac{${x}}{${n}} = ${ntex(ph, 5)},\\quad z = \\frac{${ntex(ph, 5)} - ${ntex(p0)}}{\\sqrt{${ntex(p0)}(1-${ntex(p0)})/${n}}} = ${ntex(stat, 5)}` });
    if (n * p0 < 10 || n * (1 - p0) < 10) blocks.push({ type: "note", tone: "warn", text: "La condition d'approximation normale (np₀ ≥ 10 et n(1−p₀) ≥ 10) n'est pas remplie : le résultat est approximatif." });
  } else if (test === "prop2") {
    const n1 = num(input, "n", "Taille du premier échantillon", { integer: true, min: 1 }), x1 = num(input, "x", "Premiers succès", { integer: true, nonNegative: true });
    const n2 = num(input, "n2", "Taille du second échantillon", { integer: true, min: 1 }), x2 = num(input, "x2", "Seconds succès", { integer: true, nonNegative: true });
    if (x1 > n1) fail("Le nombre de succès ne peut pas dépasser la taille de l'échantillon.", "x");
    if (x2 > n2) fail("Le nombre de succès ne peut pas dépasser la taille de l'échantillon.", "x2");
    const p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2);
    if (pp === 0 || pp === 1) fail("La proportion combinée vaut 0 ou 1 : le test ne peut pas être effectué.", "x");
    const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
    stat = (p1 - p2) / se; symbol = "z";
    p = pval(stat, normCdf, alt); critText = crit(normInv, alpha, alt);
    const seu = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
    ci = [p1 - p2 - normInv(1 - alpha / 2) * seu, p1 - p2 + normInv(1 - alpha / 2) * seu];
    h0 = "p_1 = p_2"; h1 = `p_1 ${ALT[alt]} p_2`;
    steps.push({ text: "Les deux proportions, la proportion combinée et la statistique z :", tex: `\\hat p_1 = ${ntex(p1, 5)},\\ \\hat p_2 = ${ntex(p2, 5)},\\ \\hat p = ${ntex(pp, 5)},\\quad z = \\frac{${ntex(p1 - p2, 5)}}{${ntex(se, 5)}} = ${ntex(stat, 5)}` });
  } else if (test === "gof") {
    const O = numList(input, "obs", "Effectifs observés", { min: 2 });
    if (O.some((v) => v < 0)) fail("Les effectifs ne peuvent pas être négatifs.", "obs");
    const N = O.reduce((a, b) => a + b, 0);
    if (N <= 0) fail("La somme des effectifs doit être supérieure à zéro.", "obs");
    let E;
    if (isBlank(input.exp)) E = O.map(() => N / O.length);
    else {
      const e = numList(input, "exp", "Effectifs attendus", { positive: true });
      if (e.length !== O.length) fail(`Le nombre d'effectifs attendus (${e.length}) doit être égal au nombre de classes (${O.length}).`, "exp");
      const se = e.reduce((a, b) => a + b, 0);
      E = e.map((v) => (v / se) * N);
    }
    stat = O.reduce((a, o, i) => a + (o - E[i]) ** 2 / E[i], 0); symbol = "\\chi^2"; df = O.length - 1;
    p = 1 - chi2Cdf(stat, df); critText = fmt(chi2Inv(1 - alpha, df), 5);
    h0 = "\\text{Les données suivent la distribution attendue}"; h1 = "\\text{elles ne la suivent pas}";
    steps.push({ text: "Calcul de la contribution de chaque classe, puis somme :", tex: `\\chi^2 = ${O.slice(0, 8).map((o, i) => `\\frac{(${ntex(o)} - ${ntex(E[i], 4)})^2}{${ntex(E[i], 4)}}`).join(" + ")}${O.length > 8 ? " + \\cdots" : ""} = ${ntex(stat, 5)}` });
    blocks.push({ type: "table", caption: "Observé et attendu", head: ["Classe", "O", "E", "(O−E)²/E"], rows: O.map((o, i) => [String(i + 1), fmt(o), fmt(E[i], 5), fmt((o - E[i]) ** 2 / E[i], 4)]) });
    if (E.some((v) => v < 5)) blocks.push({ type: "note", tone: "warn", text: "Certains effectifs attendus sont inférieurs à 5 : l'approximation du khi-deux peut être imprécise." });
  } else {
    const T = matrixInput(input, "table", "Tableau de contingence");
    if (T.length < 2 || T[0].length < 2) fail("Le tableau nécessite au moins deux lignes et deux colonnes.", "table");
    if (T.flat().some((v) => v < 0)) fail("Les effectifs ne peuvent pas être négatifs.", "table");
    const R = T.map((r) => r.reduce((a, b) => a + b, 0)), C = T[0].map((_, j) => T.reduce((a, r) => a + r[j], 0));
    const N = R.reduce((a, b) => a + b, 0);
    if (R.some((v) => v === 0) || C.some((v) => v === 0)) fail("Une ligne ou une colonne a un total nul.", "table");
    const E = T.map((r, i) => r.map((_, j) => (R[i] * C[j]) / N));
    stat = T.reduce((a, r, i) => a + r.reduce((b, o, j) => b + (o - E[i][j]) ** 2 / E[i][j], 0), 0);
    symbol = "\\chi^2"; df = (T.length - 1) * (T[0].length - 1);
    p = 1 - chi2Cdf(stat, df); critText = fmt(chi2Inv(1 - alpha, df), 5);
    h0 = "\\text{Les variables sont indépendantes}"; h1 = "\\text{Il existe une association}";
    steps.push({ text: "Effectif attendu de chaque case = (total de sa ligne × total de sa colonne) ÷ total général :", tex: `E_{11} = \\frac{${R[0]} \\times ${C[0]}}{${N}} = ${ntex(E[0][0], 5)},\\ \\ldots` });
    steps.push({ text: "Statistique de test et degrés de liberté :", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(stat, 5)},\\quad df = (${T.length}-1)(${T[0].length}-1) = ${df}` });
    blocks.push({ type: "table", caption: "Observé (attendu)", head: ["", ...C.map((_, j) => `Colonne ${j + 1}`), "Total"], rows: [...T.map((r, i) => [`Ligne ${i + 1}`, ...r.map((o, j) => `${fmt(o)} (${fmt(E[i][j], 4)})`), fmt(R[i])]), ["Total", ...C.map((c) => fmt(c)), fmt(N)]] });
    const cv = Math.sqrt(stat / (N * (Math.min(T.length, T[0].length) - 1)));
    results.push({ label: "V de Cramér (force de l'association)", value: fmt(cv, 4) });
  }
  p = Math.min(1, Math.max(0, p));
  const reject = p < alpha;
  const decision = reject ? "Nous rejetons H₀" : "Nous ne rejetons pas H₀";
  const st = symbol === "\\chi^2" ? "χ²" : symbol;
  steps.unshift({ text: "Les hypothèses :", tex: `H_0:\\ ${h0},\\qquad H_1:\\ ${h1}` });
  steps.push({ text: `Valeur p${df !== null ? ` (degrés de liberté ${fmt(df, 5)})` : ""} et comparaison avec α :`, tex: `${pText(p).replace("<", "<")} ${reject ? "<" : "\\ge"} \\alpha = ${ntex(alpha)}` });
  steps.push(reject ? `Comme la valeur p est inférieure à α, nous rejetons l'hypothèse nulle : il existe une preuve statistique suffisante au niveau de signification ${fmt(alpha)}.` : `Comme la valeur p n'est pas inférieure à α, nous ne rejetons pas l'hypothèse nulle : il n'existe pas de preuve suffisante au niveau de signification ${fmt(alpha)}.`);
  results.unshift(
    { label: "Statistique de test", value: `${st} = ${fmt(stat, 4)}`, text: `${st} = ${fmt(stat, 4)}` },
    { label: "Valeur p", value: pText(p) },
    ...(df !== null ? [{ label: "Degrés de liberté", value: fmt(df, 5) }] : []),
    { label: `Valeur critique (α = ${fmt(alpha)})`, value: critText },
    { label: "Décision", value: decision }
  );
  if (ci) results.push({ label: `Intervalle de confiance ${confText}`, value: `[${fmt(ci[0], 5)} ، ${fmt(ci[1], 5)}]` });
  if (alt !== "two" && ci && !["gof", "indep"].includes(test)) blocks.push({ type: "note", text: `L'intervalle de confiance affiché est bilatéral (${confText}), à titre d'illustration.` });
  return { results, steps, blocks, copy: `${st} = ${fmt(stat, 4)}, ${pText(p)}, ${decision} (α = ${fmt(alpha)})` };
}
