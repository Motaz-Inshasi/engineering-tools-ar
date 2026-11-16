import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const PRESETS = {
  none: { yU: "", tU: "", aU: "", note: "" },
  newton: {
    yU: "°C", tU: "min", aU: "1/min",
    note: "Refroidissement de Newton : T' = −k(T − Tₐ) ⇒ a = k et b = k·Tₐ. Unités : T en °C, temps en minutes, k en 1/min, et l'état stationnaire est la température ambiante Tₐ."
  },
  rc: {
    yU: "V", tU: "s", aU: "1/s",
    note: "Charge d'un condensateur RC : V' + V/(RC) = V_s/(RC) ⇒ a = 1/(RC) et b = V_s/(RC). Unités : tension en volts, temps en secondes, et l'état stationnaire est la tension d'alimentation V_s."
  },
  growth: {
    yU: "Unité de la grandeur", tU: "Unité de temps", aU: "1/unité de temps",
    note: "Croissance ou décroissance exponentielle : y' = r·y ⇒ a = −r et b = 0. Si r > 0, il s'agit d'une croissance (a < 0) ; pour une décroissance, a > 0. L'état stationnaire est 0."
  },
  mixing: {
    yU: "g/L", tU: "min", aU: "1/min",
    note: "Cuve de mélange simple : C' + (q/V)·C = q·C_in/V ⇒ a = q/V et b = q·C_in/V. Unités : concentration en g/L, temps en minutes, débit q en L/min, volume V en litres, et l'état stationnaire est C_in."
  }
};

const unitOf = (u) => (u ? ` ${u}` : "");
const tex = (x) => ntex(x, 6);
const texSigned = (x) => (x < 0 ? `- ${tex(-x)}` : `+ ${tex(x)}`);
const plainSigned = (x) => (x < 0 ? `− ${fmt(-x, 4)}` : `+ ${fmt(x, 4)}`);
const tTex = (t0) => (t0 === 0 ? "t" : `(t ${texSigned(-t0)})`);
const tPlain = (t0) => (t0 === 0 ? "t" : `(t ${plainSigned(-t0)})`);
const samples = (t0, span, f) => {
  const points = [];
  for (let i = 0; i <= 200; i++) {
    const t = t0 + (span * i) / 200;
    points.push([t, f(t)]);
  }
  return points;
};

export const meta = {
  description: "Résout l'équation différentielle linéaire du premier ordre y' + a·y = b à coefficients constants et condition initiale, avec le facteur intégrant, la constante de temps, le temps de demi-écart et le graphe.",
  keywords: ["équation différentielle", "premier ordre", "facteur intégrant", "constante de temps", "refroidissement de Newton", "charge d'un condensateur", "croissance exponentielle", "décroissance exponentielle", "first order ODE", "integrating factor", "time constant"],
  formulas: [
    { label: "Forme standard", tex: "y' + a\\,y = b" },
    { label: "Solution générale avec la condition initiale", tex: "y(t) = \\frac{b}{a} + \\left(y_0 - \\frac{b}{a}\\right)e^{-a(t-t_0)}" },
    { label: "Constante de temps", tex: "\\tau = \\frac{1}{a}" },
    { label: "Cas a = 0", tex: "y(t) = y_0 + b\\,(t - t_0)" }
  ],
  inputs: [
    { id: "a", label: "Coefficient a", type: "number", default: "0.1", help: "Coefficient de y dans la forme y' + a·y = b. Il peut être nul ou négatif." },
    { id: "b", label: "Membre de droite b", type: "number", default: "2", help: "Le terme constant du membre de droite de l'équation." },
    { id: "t0", label: "Temps initial t0", type: "number", default: "0" },
    { id: "y0", label: "Valeur initiale y0", type: "number", default: "0", help: "Valeur de y à l'instant t0." },
    { id: "t1", label: "Temps de calcul t1 (facultatif)", type: "number", default: "10", help: "Laissez le champ vide si vous n'avez pas besoin d'une valeur à un instant précis." },
    {
      id: "preset", label: "Modèle d'application", type: "select", default: "none",
      options: [["none", "Aucun modèle"], ["newton", "refroidissement de Newton"], ["rc", "Charge d'un condensateur RC"], ["growth", "Croissance ou décroissance exponentielle"], ["mixing", "Cuve de mélange simple"]]
    }
  ],
  example: {
    values: { a: "0.1", b: "2", t0: "0", y0: "0", t1: "10", preset: "none" },
    expect: ["y(10) = 12.64", "État stationnaire = 20"],
    note: "Exemple : a = 0.1, b = 2, y0 = 0, donc y(10) = 20(1 − e⁻¹) ≈ 12.64."
  },
  invalid: { values: { a: "0.1", b: "2", t0: "0", y0: "", t1: "10", preset: "none" } },
  related: ["ode-second-order", "ode-numerical", "rc-rl-transient", "population-growth"]
};

export function solve(input) {
  const a = num(input, "a", "Coefficient a");
  const b = num(input, "b", "Membre de droite b");
  const t0 = num(input, "t0", "Temps initial t0");
  const y0 = num(input, "y0", "Valeur initiale y0");
  const t1 = num(input, "t1", "Temps t1", { optional: true });
  const preset = choice(input, "preset", "Modèle", Object.keys(PRESETS), "none");
  const P = PRESETS[preset];
  const tU = unitOf(P.tU);
  const yU = unitOf(P.yU);

  const blocks = [];
  if (P.note) {
    blocks.push({ type: "note", text: P.note });
    blocks.push({ type: "table", caption: "Unités du modèle", head: ["Variable", "Unité"], rows: [["y", P.yU], ["t", P.tU], ["a", P.aU]] });
  }

  if (a === 0) {
    const lin = (t) => y0 + b * (t - t0);
    const steps = [
      { text: "Lorsque a = 0, l'équation devient y' = b, et le facteur intégrant n'est pas nécessaire :", tex: `\\frac{dy}{dt} = ${tex(b)}` },
      { text: "On intègre directement de t0 à t :", tex: "y(t) = y_0 + \\int_{t_0}^{t} b\\,ds = y_0 + b(t - t_0)" },
      { text: "On remplace par les valeurs :", tex: `y(t) = ${tex(y0)} ${texSigned(b)}\\,${tTex(t0)}` }
    ];
    const results = [
      { label: "Solution", value: `y(t) = ${fmt(y0, 4)} ${plainSigned(b)}${tPlain(t0)}` },
      { label: "Taux de variation dy/dt", value: `${fmt(b, 4)}${yU}${tU ? "/" + P.tU : ""}` },
      { label: "État stationnaire", value: "Aucun (la solution est linéaire et croît sans limite)" },
      { label: "Constante de temps τ", value: "Non définie (a = 0)" }
    ];
    let copy = `y(t) = ${fmt(y0, 4)} ${plainSigned(b)}${tPlain(t0)}`;
    if (t1 !== null) {
      const y1 = lin(t1);
      results.push({ label: `Valeur de y pour t = ${fmt(t1, 4)}`, value: `${fmt(y1, 4)}${yU}`, text: `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}` });
      copy = `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}، ${copy}`;
    }
    blocks.push({ type: "plot", title: "Courbe de la solution y(t)", xLabel: `t${tU}`, yLabel: `y${yU}`, includeZero: true, series: [{ name: "y(t)", points: samples(t0, 10, lin), line: true }] });
    return { results, steps, blocks, copy };
  }

  const tau = 1 / a;
  const ss = b / a;
  const C0 = y0 - ss;
  const yAt = (t) => ss + C0 * Math.exp(-a * (t - t0));
  const halfOrDouble = Math.LN2 / Math.abs(a);

  const steps = [
    { text: "Forme standard de la solution :", tex: `y' ${texSigned(a)}\\,y = ${tex(b)}` },
    { text: "Facteur intégrant μ(t) = e^{∫a dt} = e^{at}, multiplié aux deux membres de l'équation :", tex: `\\left(y\\,e^{${tex(a)}\\,t}\\right)' = ${tex(b)}\\,e^{${tex(a)}\\,t}` },
    { text: "On intègre les deux membres :", tex: `y\\,e^{at} = \\frac{b}{a}\\,e^{at} + C` },
    { text: "On divise par e^{at} pour obtenir la solution générale :", tex: "y = \\frac{b}{a} + C\\,e^{-at}" },
    { text: "On applique la condition initiale y(t0) = y0 :", tex: `C = \\left(y_0 - \\frac{b}{a}\\right)e^{a t_0} \\quad\\Rightarrow\\quad y(t) = ${tex(ss)} ${texSigned(C0)}\\,e^{${tex(-a)}${tTex(t0)}}` },
    { text: "Constante de temps :", tex: `\\tau = \\frac{1}{a} = ${tex(tau)}${tU}` }
  ];
  if (a > 0) {
    steps.push({ text: "État stationnaire de la solution :", tex: `y_{\\infty} = \\frac{b}{a} = ${tex(ss)}${yU}` });
    steps.push({ text: "Temps de demi-écart entre y et l'état stationnaire :", tex: `t_{1/2} = \\frac{\\ln 2}{a} = ${tex(halfOrDouble)}${tU}` });
  } else {
    steps.push({ text: "Puisque a < 0, la solution s'éloigne de l'état stationnaire, et le temps de doublement de l'écart est :", tex: `t_2 = \\frac{\\ln 2}{|a|} = ${tex(halfOrDouble)}${tU}` });
  }

  const results = [
    { label: "Solution", value: `y(t) = ${fmt(ss, 4)} ${plainSigned(C0)} e^{${fmt(-a, 4)}${tPlain(t0)}}` },
    { label: "État stationnaire y∞ = b/a", value: a > 0 ? `${fmt(ss, 4)}${yU}` : "Aucun (a < 0)" },
    { label: "Constante de temps τ = 1/a", value: `${fmt(tau, 4)}${tU}` },
    { label: a > 0 ? "Temps de demi-écart t½" : "Temps de doublement de l'écart", value: `${fmt(halfOrDouble, 4)}${tU}` }
  ];
  let copy = `État stationnaire = ${a > 0 ? `${fmt(ss, 4)}${yU}` : "aucun"}, τ = ${fmt(tau, 4)}${tU}`;
  if (t1 !== null) {
    const y1 = yAt(t1);
    results.push({ label: `Valeur de y pour t = ${fmt(t1, 4)}`, value: `${fmt(y1, 4)}${yU}`, text: `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}` });
    copy = `y(${fmt(t1, 4)}) = ${fmt(y1, 4)}${yU}، ${copy}`;
  }

  const plot = { type: "plot", title: "Courbe de la solution y(t)", xLabel: `t${tU}`, yLabel: `y${yU}`, includeZero: true, series: [{ name: "y(t)", points: samples(t0, 5 / Math.abs(a), yAt), line: true }] };
  if (a > 0) plot.hlines = [{ y: ss }];
  blocks.push(plot);

  return { results, steps, blocks, copy };
}
