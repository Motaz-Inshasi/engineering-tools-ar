import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
const MODES = [
  ["ke", "Énergie cinétique KE = ½mv²"],
  ["pe", "Énergie potentielle PE = mgh"],
  ["work", "Travail W = F d cosθ"],
  ["power", "Puissance P = W/t ou P = Fv"],
  ["fall", "Vitesse après une chute avec perte d'énergie"]
];

export const meta = {
  description: "Calcule l'énergie cinétique, l'énergie potentielle, le travail, la puissance et la vitesse de chute avec un pourcentage de perte d'énergie, en choisissant le mode approprié, avec les étapes et les unités SI.",
  keywords: ["travail", "énergie", "énergie cinétique", "énergie potentielle", "puissance", "work", "energy", "power", "chute"],
  formulas: [
    { label: "Énergie cinétique", tex: "KE = \\tfrac{1}{2}mv^2" },
    { label: "Énergie potentielle", tex: "PE = mgh" },
    { label: "Travail et puissance", tex: "W = Fd\\cos\\theta,\\qquad P = \\frac{W}{t} = Fv" },
    { label: "Vitesse après la chute", tex: "v = \\sqrt{\\left(v_0^2 + 2gh\\right)\\left(1 - \\frac{L}{100}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "ke", options: MODES },
    { id: "m", label: "Masse m", unit: "kg", type: "number", default: "2", when: { mode: ["ke", "pe"] } },
    { id: "v", label: "Vitesse v", unit: "m/s", type: "number", when: { mode: ["ke", "power"] }, help: "En mode puissance : facultative, utilisée avec F pour calculer P = Fv." },
    { id: "h", label: "Hauteur h", unit: "m", type: "number", default: "10", when: { mode: ["pe", "fall"] } },
    { id: "g", label: "Pesanteur g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pe", "fall"] } },
    { id: "F", label: "Force F", unit: "N", type: "number", when: { mode: ["work", "power"] }, help: "En mode puissance : facultative, utilisée avec v pour calculer P = Fv." },
    { id: "d", label: "Déplacement d", unit: "m", type: "number", when: { mode: ["work"] } },
    { id: "theta", label: "Angle entre F et d θ", unit: "°", type: "number", default: "0", when: { mode: ["work"] } },
    { id: "W", label: "Travail W", unit: "J", type: "number", when: { mode: ["power"] } },
    { id: "t", label: "Temps t", unit: "s", type: "number", when: { mode: ["power"] } },
    { id: "v0", label: "Vitesse initiale v0", unit: "m/s", type: "number", when: { mode: ["fall"] } },
    { id: "loss", label: "Pourcentage de perte d'énergie", unit: "%", type: "number", default: "0", when: { mode: ["fall"] }, help: "Entre 0 et 100, réduit l'énergie totale après la chute." }
  ],
  example: { values: { mode: "ke", m: "2", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" }, expect: ["KE = 100 J"], note: "Exemple : masse de 2 kg se déplaçant à 10 m/s." },
  invalid: { values: { mode: "ke", m: "0", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" } },
  related: ["kinematics", "collisions", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Mode", MODES.map((m) => m[0]), "ke");
  const steps = [];
  const results = [];
  let copy;
  let values;
  switch (mode) {
    case "ke": {
      const m = num(input, "m", "la masse", { positive: true });
      const v = num(input, "v", "la vitesse", { nonNegative: true });
      const KE = 0.5 * m * v * v;
      steps.push({ text: "Énergie cinétique :", tex: `KE = \\frac{1}{2}mv^2 = \\frac{1}{2} \\times ${T(m)} \\times (${T(v)})^2 = ${T(KE)}\\ J` });
      results.push({ label: "Énergie cinétique KE", value: `${fmt(KE, 6)} J` });
      copy = `KE = ${fmt(KE, 6)} J`;
      values = { KE };
      break;
    }
    case "pe": {
      const m = num(input, "m", "la masse", { positive: true });
      const h = num(input, "h", "la hauteur");
      const g = num(input, "g", "la pesanteur", { positive: true });
      const PE = m * g * h;
      steps.push({ text: "Énergie potentielle de pesanteur :", tex: `PE = mgh = ${T(m)} \\times ${T(g)} \\times (${T(h)}) = ${T(PE)}\\ J` });
      results.push({ label: "Énergie potentielle PE", value: `${fmt(PE, 6)} J` });
      copy = `PE = ${fmt(PE, 6)} J`;
      values = { PE };
      break;
    }
    case "work": {
      const F = num(input, "F", "Force F");
      const d = num(input, "d", "Déplacement d");
      const theta = num(input, "theta", "l'angle θ", { min: -360, max: 360 });
      const c = snap(Math.cos((theta * Math.PI) / 180));
      const W = F * d * c;
      steps.push({ text: "Travail d'une force constante :", tex: `W = Fd\\cos\\theta = ${T(F)} \\times ${T(d)} \\times \\cos(${T(theta)}^\\circ) = ${T(W)}\\ J` });
      results.push({ label: "Travail W", value: `${fmt(W, 6)} J` });
      copy = `W = ${fmt(W, 6)} J`;
      values = { W };
      break;
    }
    case "power": {
      const W = num(input, "W", "Travail W");
      const t = num(input, "t", "Temps t", { positive: true });
      const hasF = !isBlank(input.F);
      const hasV = !isBlank(input.v);
      if (hasF !== hasV) fail("Pour calculer P = Fv, saisissez ensemble la force F et la vitesse v, ou laissez-les vides.", hasF ? "v" : "F");
      const P = W / t;
      steps.push({ text: "Puissance moyenne :", tex: `P = \\frac{W}{t} = \\frac{${T(W)}}{${T(t)}} = ${T(P)}\\ W` });
      results.push({ label: "Puissance P = W/t", value: `${fmt(P, 6)} W` });
      copy = `P = ${fmt(P, 6)} W`;
      values = { P };
      if (hasF) {
        const F = num(input, "F", "Force F");
        const v = num(input, "v", "Vitesse v");
        const Pf = F * v;
        steps.push({ text: "Puissance instantanée en fonction de la force et de la vitesse :", tex: `P = Fv = ${T(F)} \\times ${T(v)} = ${T(Pf)}\\ W` });
        results.push({ label: "Puissance P = Fv", value: `${fmt(Pf, 6)} W` });
        copy += `، P = Fv = ${fmt(Pf, 6)} W`;
        values.Pf = Pf;
      }
      break;
    }
    case "fall": {
      const v0 = num(input, "v0", "Vitesse initiale", { nonNegative: true });
      const h = num(input, "h", "Hauteur h", { nonNegative: true });
      const g = num(input, "g", "la pesanteur", { positive: true });
      const loss = num(input, "loss", "pourcentage de perte", { default: 0, min: 0, max: 100 });
      const energy = v0 * v0 + 2 * g * h;
      const vIdeal = Math.sqrt(energy);
      const v = Math.sqrt(energy * (1 - loss / 100));
      steps.push({ text: "Sans perte, par conservation de l'énergie :", tex: `v_{ideal} = \\sqrt{v_0^2 + 2gh} = ${T(vIdeal)}\\ m/s` });
      steps.push({ text: "Avec le pourcentage de perte L, l'énergie totale est réduite dans le rapport (1 - L/100) :", tex: `v = \\sqrt{(v_0^2 + 2gh)\\left(1 - \\frac{${T(loss)}}{100}\\right)} = ${T(v)}\\ m/s` });
      results.push({ label: "Vitesse après la chute v", value: `${fmt(v, 6)} m/s` });
      results.push({ label: "Vitesse sans perte", value: `${fmt(vIdeal, 6)} m/s` });
      copy = `v = ${fmt(v, 6)} m/s, sans perte = ${fmt(vIdeal, 6)} m/s`;
      values = { v, vIdeal };
      break;
    }
  }
  return { results, steps, copy, values };
}
