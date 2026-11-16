import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const IDS = ["v0", "v", "a", "t", "x"];
const NAMES = { v0: "Vitesse initiale v0", v: "Vitesse finale v", a: "Accélération a", t: "Temps t", x: "Déplacement x" };
const UNITS = { v0: "m/s", v: "m/s", a: "m/s²", t: "s", x: "m" };
const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;

function quadTex(A, B, C, t) {
  return `${T(A)}t^2 + ${S(B)}t + ${S(C)} = 0 \\Rightarrow t = ${T(t)}\\ s`;
}

function quadraticRoot(A, B, C, field) {
  const D = B * B - 4 * A * C;
  if (D < 0) fail("Aucun mouvement réel ne correspond à ces données.", field);
  const q = Math.sqrt(D);
  const roots = [(-B - q) / (2 * A), (-B + q) / (2 * A)].filter((r) => r > 0);
  if (roots.length === 0) fail("Aucun temps positif ne correspond à ces données.", field);
  return Math.min(...roots);
}

export const meta = {
  description: "Résout les équations du mouvement à accélération constante : saisissez trois valeurs parmi v0, v, a, t et x, les deux autres sont calculées avec les étapes et le tracé de v(t) et x(t).",
  keywords: ["équations du mouvement", "SUVAT", "SUVAT", "accélération constante", "vitesse", "déplacement", "temps", "kinematics"],
  formulas: [
    { label: "Équations du mouvement à accélération constante", tex: "v = v_0 + at,\\qquad x = v_0 t + \\tfrac{1}{2}at^2,\\qquad v^2 = v_0^2 + 2ax" },
    { label: "Vitesse moyenne", tex: "x = \\frac{v_0 + v}{2}\\,t" }
  ],
  inputs: [
    { id: "v0", label: "Vitesse initiale v0", unit: "m/s", type: "number", help: "Saisissez exactement trois valeurs parmi les cinq et laissez les autres vides." },
    { id: "v", label: "Vitesse finale v", unit: "m/s", type: "number" },
    { id: "a", label: "Accélération a", unit: "m/s²", type: "number", help: "Positif pour une accélération, négatif pour une décélération." },
    { id: "t", label: "Temps t", unit: "s", type: "number" },
    { id: "x", label: "Déplacement x", unit: "m", type: "number" }
  ],
  example: { values: { v0: "0", v: "", a: "9.81", t: "3", x: "" }, expect: ["v = 29.43 m/s", "x = 44.145 m"], note: "Exemple : un corps part du repos avec une accélération de 9.81 m/s² pendant 3 s." },
  invalid: { values: { v0: "5", v: "10", a: "2", t: "3", x: "" } },
  related: ["projectile-motion", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const given = IDS.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : IDS.find((k) => isBlank(input[k]));
    fail(`Saisissez exactement trois valeurs parmi les cinq (vous en avez saisi ${given.length}).`, field);
  }
  const u = {};
  for (const k of given) u[k] = num(input, k, NAMES[k], k === "t" ? { positive: true } : {});
  let { v0, v, a, t, x } = u;
  const steps = [];
  switch (given.join("")) {
    case "v0va": {
      if (a === 0) {
        if (v !== v0) fail("Si a = 0, v doit être égal à la vitesse initiale v0.", "v");
        fail("Si a = 0 et v = v0, le temps ou le déplacement ne peut pas être déterminé à partir de ces données.", "a");
      }
      t = (v - v0) / a;
      if (!(t > 0)) fail("Le temps obtenu n'est pas positif, donc ces données ne décrivent pas un mouvement futur.", "a");
      x = (v * v - v0 * v0) / (2 * a);
      steps.push({ text: "À partir de l'équation de vitesse v = v0 + at, on calcule le temps :", tex: `t = \\frac{v - v_0}{a} = \\frac{${S(v)} - ${S(v0)}}{${S(a)}} = ${T(t)}\\ s` });
      steps.push({ text: "À partir de l'équation sans temps v² = v0² + 2ax, on calcule le déplacement :", tex: `x = \\frac{v^2 - v_0^2}{2a} = ${T(x)}\\ m` });
      break;
    }
    case "v0vt": {
      a = (v - v0) / t;
      x = ((v0 + v) / 2) * t;
      steps.push({ text: "À partir de l'équation de vitesse v = v0 + at, on calcule l'accélération :", tex: `a = \\frac{v - v_0}{t} = \\frac{${S(v)} - ${S(v0)}}{${T(t)}} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "La vitesse moyenne d'un mouvement à accélération constante donne le déplacement :", tex: `x = \\frac{v_0 + v}{2}\\,t = ${T(x)}\\ m` });
      break;
    }
    case "v0vx": {
      if (v0 + v === 0) fail("La somme de v0 et v est nulle, donc le temps ne peut pas être déterminé à partir du déplacement.", "x");
      t = (2 * x) / (v0 + v);
      if (!(t > 0)) fail("Le déplacement n'est pas compatible avec les deux vitesses données, car le temps obtenu n'est pas positif.", "x");
      a = (v - v0) / t;
      steps.push({ text: "À partir de x = (v0 + v)t / 2, on calcule le temps :", tex: `t = \\frac{2x}{v_0 + v} = ${T(t)}\\ s` });
      steps.push({ text: "À partir de l'équation de vitesse, on calcule l'accélération :", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "v0at": {
      v = v0 + a * t;
      x = v0 * t + 0.5 * a * t * t;
      steps.push({ text: "Équation de la vitesse :", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      steps.push({ text: "Équation du déplacement :", tex: `x = v_0 t + \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "v0ax": {
      if (a === 0) {
        if (v0 === 0) fail("Si a = 0 et v0 = 0, le corps ne se déplace pas, donc le temps ne peut pas être déterminé.", "v0");
        t = x / v0;
        if (!(t > 0)) fail("Le déplacement et la vitesse initiale ont des signes opposés, donc il n'existe pas de temps positif.", "x");
        steps.push({ text: "Si a = 0, l'équation du déplacement devient linéaire : x = v0 t", tex: `t = \\frac{x}{v_0} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, v0, -x, "x");
        steps.push({ text: "On résout l'équation x = v0 t + ½at² et on retient la plus petite racine positive :", tex: quadTex(a / 2, v0, -x, t) });
      }
      v = v0 + a * t;
      steps.push({ text: "Équation de la vitesse :", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "v0tx": {
      a = (2 * (x - v0 * t)) / (t * t);
      v = v0 + a * t;
      steps.push({ text: "À partir de x = v0 t + ½at², on calcule l'accélération :", tex: `a = \\frac{2(x - v_0 t)}{t^2} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "Équation de la vitesse :", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "vat": {
      v0 = v - a * t;
      x = v * t - 0.5 * a * t * t;
      steps.push({ text: "On inverse l'équation de vitesse pour trouver la vitesse initiale :", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      steps.push({ text: "Équation du déplacement en fonction de la vitesse finale :", tex: `x = vt - \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "vax": {
      if (a === 0) {
        if (v === 0) fail("Si a = 0 et v = 0, le temps ne peut pas être déterminé.", "v");
        t = x / v;
        if (!(t > 0)) fail("Le déplacement et la vitesse finale ont des signes opposés, donc il n'existe pas de temps positif.", "x");
        steps.push({ text: "Si a = 0, l'équation du déplacement devient linéaire : x = vt", tex: `t = \\frac{x}{v} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, -v, x, "x");
        steps.push({ text: "On résout l'équation x = vt - ½at² et on retient la plus petite racine positive :", tex: quadTex(a / 2, -v, x, t) });
      }
      v0 = v - a * t;
      steps.push({ text: "On inverse l'équation de vitesse pour trouver la vitesse initiale :", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      break;
    }
    case "vtx": {
      v0 = (2 * x) / t - v;
      a = (v - v0) / t;
      steps.push({ text: "À partir de x = (v0 + v)t / 2, on calcule la vitesse initiale :", tex: `v_0 = \\frac{2x}{t} - v = ${T(v0)}\\ m/s` });
      steps.push({ text: "À partir de l'équation de vitesse, on calcule l'accélération :", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "atx": {
      v0 = (x - 0.5 * a * t * t) / t;
      v = v0 + a * t;
      steps.push({ text: "À partir de x = v0 t + ½at², on calcule la vitesse initiale :", tex: `v_0 = \\frac{x - \\frac{1}{2}at^2}{t} = ${T(v0)}\\ m/s` });
      steps.push({ text: "Équation de la vitesse :", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
  }
  const vals = { v0, v, a, t, x };
  const results = IDS.map((k) => ({
    label: `${NAMES[k]} ${given.includes(k) ? "(donné)" : "(calculé)"}`,
    value: `${fmt(vals[k], 6)} ${UNITS[k]}`
  }));
  const copy = `v = ${fmt(v)} m/s، x = ${fmt(x)} m، t = ${fmt(t)} s، a = ${fmt(a)} m/s²`;
  const N = 60;
  const ts = Array.from({ length: N + 1 }, (_, i) => (t * i) / N);
  const blocks = [
    { type: "plot", title: "Vitesse en fonction du temps v(t)", xLabel: "t (s)", yLabel: "v (m/s)", includeZero: true, series: [{ name: "v(t)", points: ts.map((s) => [s, v0 + a * s]) }] },
    { type: "plot", title: "Déplacement en fonction du temps x(t)", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: ts.map((s) => [s, v0 * s + 0.5 * a * s * s]) }] }
  ];
  return { results, steps, copy, blocks, values: vals };
}
