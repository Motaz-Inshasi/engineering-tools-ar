import { integrate, simplify } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice } from "../core/format.js";
import { integrateNumeric, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Calcule l'intégrale indéfinie ou définie de n'importe quelle fonction : résolution symbolique avec les étapes lorsqu'elle est fiable, et valeur numérique précise et clairement étiquetée lorsqu'aucune solution symbolique n'est disponible.",
  intro: "L'intégration symbolique prend en charge les puissances, les fonctions trigonométriques, exponentielles et logarithmiques, la substitution, l'intégration par parties et les fractions partielles. Chaque résultat symbolique est vérifié numériquement avant d'être affiché.",
  keywords: ["Intégrale", "integral", "Intégrale définie", "Intégrale indéfinie", "Aire sous la courbe", "Intégration par parties", "Substitution"],
  formulas: [
    { label: "Intégrale indéfinie et définie", tex: "\\int f(x)\\,dx = F(x) + C, \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "Règle de la puissance et intégration par parties", tex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C,\\qquad \\int u\\,dv = uv - \\int v\\,du" }
  ],
  inputs: [
    { id: "f", label: "Fonction à intégrer", type: "expr", placeholder: "x e^x", help: "par ex. : x^2 sin(x), 1/(x^2+1), e^(2x), ln(x)" },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "mode", label: "Type d'intégrale", type: "select", default: "indefinite", options: [["indefinite", "Indéfinie"], ["definite", "Définie"]] },
    { id: "a", label: "Borne inférieure a", type: "number", when: { mode: ["definite"] }, help: "On peut écrire inf ou -inf" },
    { id: "b", label: "Borne supérieure b", type: "number", when: { mode: ["definite"] } }
  ],
  example: { values: { f: "x e^x", v: "x", mode: "definite", a: "0", b: "1" }, expect: ["= 1"], note: "Exemple : $\\int_0^1 x e^x\\,dx$ par parties, et le résultat est 1." },
  invalid: { values: { f: "sin(x", mode: "indefinite" } },
  related: ["derivative", "function-plotter", "laplace", "partial-fractions"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const mode = choice(input, "mode", "Type d'intégrale", ["indefinite", "definite"], "indefinite");
  const steps = [{ text: "Fonction après simplification :", tex: `f(${v}) = ${toTex(f)}` }];
  const blocks = [];
  const sym = integrate(f, v);
  if (sym) {
    for (const s of sym.steps) steps.push({ text: s.rule, tex: s.tex });
    steps.push(`Nous avons vérifié le résultat en le dérivant numériquement et en le comparant à la fonction d'origine en plusieurs points.`);
  }
  if (mode === "indefinite") {
    if (!sym) {
      blocks.push({ type: "note", tone: "warn", text: "Nous n'avons pas trouvé d'intégrale symbolique fiable pour cette fonction avec les règles prises en charge. Elle n'admet peut-être pas de primitive élémentaire (comme $e^{x^2}$). Essayez l'intégrale définie pour obtenir une valeur numérique." });
      return { results: [{ label: "Intégrale indéfinie", value: "Non disponible symboliquement" }], steps, blocks, copy: "L'intégrale indéfinie n'est pas disponible symboliquement" };
    }
    return {
      results: [{ label: "Intégrale indéfinie", tex: `\\int ${toTex(f)}\\,d${v} = ${toTex(sym.result)} + C`, text: `${toText(sym.result)} + C` }],
      steps, blocks, copy: `∫ ${toText(f)} d${v} = ${toText(sym.result)} + C`
    };
  }
  const a = num(input, "a", "Borne inférieure", { allowInfinity: true });
  const b = num(input, "b", "Borne supérieure", { allowInfinity: true });
  if (a === b) fail("Les deux bornes sont égales, l'intégrale vaut donc zéro. Saisissez deux bornes différentes.", "b");
  const F = f1(f, v);
  const numeric = integrateNumeric(F, a, b, { tol: 1e-11 });
  let exact = null;
  if (sym && isFinite(a) && isFinite(b)) {
    const G = f1(sym.result, v);
    const Fa = G(a), Fb = G(b);
    const pts = sampleFunction(F, Math.min(a, b), Math.max(a, b), 401);
    const continuous = pts.every(([, y]) => y !== null);
    const val = Fb - Fa;
    if (continuous && isFinite(val) && numeric.ok && Math.abs(val - numeric.value) <= 1e-6 * Math.max(1, Math.abs(val))) {
      exact = val;
      steps.push({ text: `Nous appliquons le théorème fondamental de l'analyse : $F(b) - F(a)$`, tex: `F(${ntex(b)}) - F(${ntex(a)}) = ${ntex(Fb, 10)} - (${ntex(Fa, 10)}) = ${ntex(val, 10)}` });
    } else if (!continuous) {
      blocks.push({ type: "note", tone: "warn", text: "La fonction n'est pas définie en un point de l'intervalle d'intégration, donc $F(b)-F(a)$ ne peut pas être appliquée directement." });
    }
  }
  const results = [];
  if (exact !== null) {
    const shown = Math.abs(exact - Math.round(exact)) < 1e-10 ? Math.round(exact) : exact;
    results.push({ label: "Valeur de l'intégrale définie", tex: `\\int_{${ntex(a)}}^{${ntex(b)}} ${toTex(f)}\\,d${v} = ${niceTex(shown, 10)}`, text: `= ${nice(shown, 10)}` });
    results.push({ label: "Valeur décimale", value: exact, sig: 12 });
  } else {
    if (!numeric.ok || !isFinite(numeric.value)) {
      blocks.push({ type: "note", tone: "warn", text: "L'intégrale ne converge pas, ou la fonction n'est pas bornée sur l'intervalle, donc aucune valeur fiable ne peut être donnée." });
      return { results: [{ label: "Valeur de l'intégrale définie", value: "Non convergente ou indéterminée" }], steps, blocks, copy: "L'intégrale ne converge pas" };
    }
    results.push({ label: "Valeur de l'intégrale définie (approximation numérique)", value: numeric.value, sig: 10, text: `≈ ${fmt(numeric.value, 10)}` });
    results.push({ label: "Estimation de l'erreur numérique", value: numeric.error, sig: 2 });
    steps.push(`Nous avons calculé la valeur numériquement par la méthode adaptative de Gauss-Kronrod (15 points) en divisant l'intervalle en ${numeric.intervals} parties.`);
    if (!isFinite(a) || !isFinite(b)) steps.push("Pour les bornes infinies, nous avons utilisé un changement de variable qui rend l'intervalle borné avant l'intégration numérique.");
    blocks.push({ type: "note", text: "Il s'agit d'une valeur numérique approchée et non d'un résultat symbolique." });
  }
  if (isFinite(a) && isFinite(b)) {
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    blocks.push({ type: "plot", title: `Courbe de la fonction avec les bornes d'intégration`, xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }], vlines: [{ x: lo }, { x: hi }] });
  }
  const copyVal = exact !== null ? nice(exact, 10) : `≈ ${fmt(numeric.value, 10)}`;
  return { results, steps, blocks, copy: `∫ de ${fmt(a)} à ${fmt(b)} pour ${toText(f)} d${v} = ${copyVal}` };
}
