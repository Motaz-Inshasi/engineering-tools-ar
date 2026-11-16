import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const G = 6.674e-11;

export const meta = {
  description: "Calcule le mouvement circulaire uniforme à partir du rayon et de la vitesse ou de la période, la force d'attraction entre deux corps, la vitesse orbitale, la période de révolution, la vitesse de libération et la pesanteur à une altitude donnée au-dessus de la surface de la planète.",
  keywords: ["mouvement circulaire", "force centripète", "accélération centripète", "gravitation universelle", "Newton", "orbite", "satellite artificiel", "vitesse de libération", "circular motion", "gravitation", "orbit"],
  formulas: [
    { label: "Mouvement circulaire", tex: "a_c = \\frac{v^2}{r} = \\omega^2 r,\\qquad F_c = \\frac{m v^2}{r}" },
    { label: "Loi de la gravitation universelle", tex: "F = G\\frac{m_1 m_2}{r^2},\\qquad G = 6.674\\times10^{-11}\\ \\frac{N\\,m^2}{kg^2}" },
    { label: "Orbite circulaire", tex: "v = \\sqrt{\\frac{GM}{r}},\\quad T = \\frac{2\\pi r}{v},\\quad v_{esc} = \\sqrt{\\frac{2GM}{r}},\\quad g = \\frac{GM}{r^2}" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "circular", options: [["circular", "Mouvement circulaire uniforme"], ["gravity", "Force d'attraction entre deux corps"], ["orbit", "Orbite et satellite artificiel"]] },
    { id: "speedBy", label: "Donnée avec le rayon", type: "select", default: "v", options: [["v", "Vitesse linéaire v"], ["T", "Période T"]], when: { mode: ["circular"] } },
    { id: "rc", label: "Rayon r", unit: "m", type: "number", default: "2", when: { mode: ["circular"] } },
    { id: "vc", label: "Vitesse linéaire v", unit: "m/s", type: "number", default: "3", when: { mode: ["circular"], speedBy: ["v"] } },
    { id: "Tc", label: "Période T", unit: "s", type: "number", default: "4.19", when: { mode: ["circular"], speedBy: ["T"] } },
    { id: "mc", label: "Masse m", unit: "kg", type: "number", default: "0.5", when: { mode: ["circular"] } },
    { id: "m1", label: "Première masse m1", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["gravity"] }, help: "Par défaut, masse de la Terre." },
    { id: "m2", label: "Seconde masse m2", unit: "kg", type: "number", default: "7.348e22", when: { mode: ["gravity"] }, help: "Par défaut, masse de la Lune." },
    { id: "rg", label: "Distance entre les centres r", unit: "m", type: "number", default: "3.844e8", when: { mode: ["gravity"] }, help: "Par défaut, distance entre les centres de la Terre et de la Lune." },
    { id: "M", label: "Masse du corps central M", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["orbit"] }, help: "Par défaut, masse de la Terre." },
    { id: "R", label: "Rayon du corps R", unit: "m", type: "number", default: "6.371e6", when: { mode: ["orbit"] }, help: "Par défaut, rayon de la Terre." },
    { id: "orbBy", label: "Donnée pour l'orbite", type: "select", default: "h", options: [["h", "Altitude au-dessus de la surface h"], ["r", "Rayon depuis le centre r"]], when: { mode: ["orbit"] } },
    { id: "ro", label: "Rayon depuis le centre r", unit: "m", type: "number", default: "6.771e6", when: { mode: ["orbit"], orbBy: ["r"] } },
    { id: "ho", label: "Altitude au-dessus de la surface h", unit: "m", type: "number", default: "400k", when: { mode: ["orbit"], orbBy: ["h"] }, help: "Exemple : l'altitude de la Station spatiale internationale est d'environ 400 km." }
  ],
  example: {
    values: { mode: "circular", speedBy: "v", rc: "2", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" },
    expect: ["Fc = 2.25 N", "ac = 4.5 m/s²"],
    note: "Exemple : un corps de masse 0.5 kg tournant sur un rayon de 2 m à une vitesse de 3 m/s."
  },
  invalid: { values: { mode: "circular", speedBy: "v", rc: "0", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" } },
  related: ["kinematics", "projectile-motion", "work-energy", "formulas-constants"]
};

function circular(input) {
  const speedBy = choice(input, "speedBy", "Donnée", ["v", "T"], "v");
  const r = num(input, "rc", "Rayon r", { positive: true });
  const m = num(input, "mc", "Masse m", { positive: true });
  const steps = [];
  let v, T;
  if (speedBy === "v") {
    v = num(input, "vc", "Vitesse linéaire v", { positive: true });
    T = 2 * Math.PI * r / v;
    steps.push({ text: "Période à partir de la vitesse linéaire :", tex: `T = \\frac{2\\pi r}{v} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(v)}} = ${ntex(T, 6)}\\ s` });
  } else {
    T = num(input, "Tc", "Période T", { positive: true });
    v = 2 * Math.PI * r / T;
    steps.push({ text: "Vitesse linéaire à partir de la période :", tex: `v = \\frac{2\\pi r}{T} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(T)}} = ${ntex(v, 6)}\\ m/s` });
  }
  const w = v / r;
  const f = 1 / T;
  const ac = v * v / r;
  const Fc = m * ac;
  steps.push({ text: "Vitesse angulaire :", tex: `\\omega = \\frac{v}{r} = ${ntex(w, 6)}\\ rad/s` });
  steps.push({ text: "Accélération centripète :", tex: `a_c = \\frac{v^2}{r} = ${ntex(ac, 6)}\\ m/s^2` });
  steps.push({ text: "Force centripète :", tex: `F_c = m\\,a_c = ${ntex(m)} \\times ${ntex(ac, 6)} = ${ntex(Fc, 6)}\\ N` });
  return {
    results: [
      { label: "Vitesse angulaire ω", value: `${fmt(w, 4)} rad/s` },
      { label: "Accélération centripète a_c", value: `${fmt(ac, 4)} m/s²` },
      { label: "Force centripète F_c", value: `${fmt(Fc, 4)} N` },
      { label: "Vitesse linéaire v", value: `${fmt(v, 4)} m/s` },
      { label: "Fréquence f", value: `${fmt(f, 4)} Hz` },
      { label: "Période T", value: `${fmt(T, 4)} s` }
    ],
    steps,
    copy: `ω = ${fmt(w, 4)} rad/s, ac = ${fmt(ac, 4)} m/s², Fc = ${fmt(Fc, 4)} N, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s`
  };
}

function gravity(input) {
  const m1 = num(input, "m1", "Première masse m1", { positive: true });
  const m2 = num(input, "m2", "Seconde masse m2", { positive: true });
  const r = num(input, "rg", "Distance entre les centres r", { positive: true });
  const F = G * m1 * m2 / (r * r);
  return {
    results: [{ label: "Force d'attraction mutuelle F", value: `${fmt(F, 4)} N` }],
    steps: [
      { text: "Loi de la gravitation universelle de Newton :", tex: `F = G\\frac{m_1 m_2}{r^2} = 6.674\\times10^{-11} \\times \\frac{${ntex(m1)} \\times ${ntex(m2)}}{(${ntex(r)})^2} = ${ntex(F, 6)}\\ N` }
    ],
    copy: `F = ${fmt(F, 4)} N`
  };
}

function orbit(input) {
  const M = num(input, "M", "Masse du corps central M", { positive: true });
  const R = num(input, "R", "Rayon du corps R", { positive: true });
  const orbBy = choice(input, "orbBy", "Donnée", ["h", "r"], "h");
  const steps = [];
  let r;
  if (orbBy === "h") {
    const h = num(input, "ho", "Altitude h", { nonNegative: true });
    r = R + h;
    steps.push({ text: "Rayon depuis le centre du corps :", tex: `r = R + h = ${ntex(R)} + ${ntex(h)} = ${ntex(r, 6)}\\ m` });
  } else {
    r = num(input, "ro", "Rayon depuis le centre r", { positive: true });
    if (r < R) fail("Le rayon de l'orbite est inférieur au rayon du corps, donc l'orbite traverse celui-ci.", "ro");
  }
  const GM = G * M;
  const v = Math.sqrt(GM / r);
  const T = 2 * Math.PI * r / v;
  const vEsc = Math.sqrt(2 * GM / r);
  const g = GM / (r * r);
  steps.push({ text: "Vitesse de l'orbite circulaire :", tex: `v = \\sqrt{\\frac{GM}{r}} = \\sqrt{\\frac{6.674\\times10^{-11} \\times ${ntex(M)}}{${ntex(r)}}} = ${ntex(v, 6)}\\ m/s` });
  steps.push({ text: "Période de révolution :", tex: `T = \\frac{2\\pi r}{v} = ${ntex(T, 6)}\\ s` });
  steps.push({ text: "Vitesse de libération :", tex: `v_{esc} = \\sqrt{2}\\,v = ${ntex(vEsc, 6)}\\ m/s` });
  steps.push({ text: "Pesanteur locale sur cette orbite :", tex: `g = \\frac{GM}{r^2} = ${ntex(g, 6)}\\ m/s^2` });
  return {
    results: [
      { label: "Rayon depuis le centre r", value: `${fmt(r, 4)} m` },
      { label: "Vitesse orbitale v", value: `${fmt(v, 4)} m/s` },
      { label: "Période de révolution T", value: `${fmt(T, 4)} s` },
      { label: "Période de révolution en minutes", value: `${fmt(T / 60, 4)} min` },
      { label: "vitesse de libération", value: `${fmt(vEsc, 4)} m/s` },
      { label: "Pesanteur locale g", value: `${fmt(g, 4)} m/s²` }
    ],
    steps,
    copy: `v = ${fmt(v, 4)} m/s, T = ${fmt(T / 60, 4)} min, v_esc = ${fmt(vEsc, 4)} m/s, g = ${fmt(g, 4)} m/s²`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["circular", "gravity", "orbit"], "circular");
  if (mode === "gravity") return gravity(input);
  if (mode === "orbit") return orbit(input);
  return circular(input);
}
