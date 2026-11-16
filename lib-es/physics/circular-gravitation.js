import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const G = 6.674e-11;

export const meta = {
  description: "Calcula el movimiento circular uniforme a partir del radio y la velocidad o del periodo, la fuerza de atracción entre dos cuerpos, la velocidad orbital, el periodo, la velocidad de escape y la gravedad a una altura dada sobre la superficie del planeta.",
  keywords: ["Movimiento circular", "Fuerza centrípeta", "Aceleración centrípeta", "Gravitación universal", "Newton", "Órbita", "Satélite artificial", "Velocidad de escape", "circular motion", "gravitation", "orbit"],
  formulas: [
    { label: "Movimiento circular", tex: "a_c = \\frac{v^2}{r} = \\omega^2 r,\\qquad F_c = \\frac{m v^2}{r}" },
    { label: "Ley de la gravitación universal", tex: "F = G\\frac{m_1 m_2}{r^2},\\qquad G = 6.674\\times10^{-11}\\ \\frac{N\\,m^2}{kg^2}" },
    { label: "Órbita circular", tex: "v = \\sqrt{\\frac{GM}{r}},\\quad T = \\frac{2\\pi r}{v},\\quad v_{esc} = \\sqrt{\\frac{2GM}{r}},\\quad g = \\frac{GM}{r^2}" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "circular", options: [["circular", "Movimiento circular uniforme"], ["gravity", "Fuerza de atracción entre dos cuerpos"], ["orbit", "Órbita y satélite artificial"]] },
    { id: "speedBy", label: "Dado con el radio", type: "select", default: "v", options: [["v", "Velocidad lineal v"], ["T", "Periodo T"]], when: { mode: ["circular"] } },
    { id: "rc", label: "Radio r", unit: "m", type: "number", default: "2", when: { mode: ["circular"] } },
    { id: "vc", label: "Velocidad lineal v", unit: "m/s", type: "number", default: "3", when: { mode: ["circular"], speedBy: ["v"] } },
    { id: "Tc", label: "Periodo T", unit: "s", type: "number", default: "4.19", when: { mode: ["circular"], speedBy: ["T"] } },
    { id: "mc", label: "Masa m", unit: "kg", type: "number", default: "0.5", when: { mode: ["circular"] } },
    { id: "m1", label: "Primera masa m1", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["gravity"] }, help: "Por defecto, la masa de la Tierra." },
    { id: "m2", label: "Segunda masa m2", unit: "kg", type: "number", default: "7.348e22", when: { mode: ["gravity"] }, help: "Por defecto, la masa de la Luna." },
    { id: "rg", label: "Distancia entre centros r", unit: "m", type: "number", default: "3.844e8", when: { mode: ["gravity"] }, help: "Por defecto, la distancia entre los centros de la Tierra y la Luna." },
    { id: "M", label: "Masa del cuerpo central M", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["orbit"] }, help: "Por defecto, la masa de la Tierra." },
    { id: "R", label: "Radio del cuerpo R", unit: "m", type: "number", default: "6.371e6", when: { mode: ["orbit"] }, help: "Por defecto, el radio de la Tierra." },
    { id: "orbBy", label: "Dado para la órbita", type: "select", default: "h", options: [["h", "Altura sobre la superficie h"], ["r", "Radio desde el centro r"]], when: { mode: ["orbit"] } },
    { id: "ro", label: "Radio desde el centro r", unit: "m", type: "number", default: "6.771e6", when: { mode: ["orbit"], orbBy: ["r"] } },
    { id: "ho", label: "Altura sobre la superficie h", unit: "m", type: "number", default: "400k", when: { mode: ["orbit"], orbBy: ["h"] }, help: "Ejemplo: la altura de la Estación Espacial Internacional es de unos 400 km." }
  ],
  example: {
    values: { mode: "circular", speedBy: "v", rc: "2", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" },
    expect: ["Fc = 2.25 N", "ac = 4.5 m/s²"],
    note: "Ejemplo: un cuerpo de 0.5 kg que gira con un radio de 2 m a una velocidad de 3 m/s."
  },
  invalid: { values: { mode: "circular", speedBy: "v", rc: "0", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" } },
  related: ["kinematics", "projectile-motion", "work-energy", "formulas-constants"]
};

function circular(input) {
  const speedBy = choice(input, "speedBy", "Dado", ["v", "T"], "v");
  const r = num(input, "rc", "Radio r", { positive: true });
  const m = num(input, "mc", "Masa m", { positive: true });
  const steps = [];
  let v, T;
  if (speedBy === "v") {
    v = num(input, "vc", "Velocidad lineal v", { positive: true });
    T = 2 * Math.PI * r / v;
    steps.push({ text: "Periodo a partir de la velocidad lineal:", tex: `T = \\frac{2\\pi r}{v} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(v)}} = ${ntex(T, 6)}\\ s` });
  } else {
    T = num(input, "Tc", "Periodo T", { positive: true });
    v = 2 * Math.PI * r / T;
    steps.push({ text: "Velocidad lineal a partir del periodo:", tex: `v = \\frac{2\\pi r}{T} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(T)}} = ${ntex(v, 6)}\\ m/s` });
  }
  const w = v / r;
  const f = 1 / T;
  const ac = v * v / r;
  const Fc = m * ac;
  steps.push({ text: "Velocidad angular:", tex: `\\omega = \\frac{v}{r} = ${ntex(w, 6)}\\ rad/s` });
  steps.push({ text: "Aceleración centrípeta:", tex: `a_c = \\frac{v^2}{r} = ${ntex(ac, 6)}\\ m/s^2` });
  steps.push({ text: "Fuerza centrípeta de atracción:", tex: `F_c = m\\,a_c = ${ntex(m)} \\times ${ntex(ac, 6)} = ${ntex(Fc, 6)}\\ N` });
  return {
    results: [
      { label: "Velocidad angular ω", value: `${fmt(w, 4)} rad/s` },
      { label: "Aceleración centrípeta a_c", value: `${fmt(ac, 4)} m/s²` },
      { label: "Fuerza centrípeta F_c", value: `${fmt(Fc, 4)} N` },
      { label: "Velocidad lineal v", value: `${fmt(v, 4)} m/s` },
      { label: "Frecuencia f", value: `${fmt(f, 4)} Hz` },
      { label: "Periodo T", value: `${fmt(T, 4)} s` }
    ],
    steps,
    copy: `ω = ${fmt(w, 4)} rad/s, ac = ${fmt(ac, 4)} m/s², Fc = ${fmt(Fc, 4)} N, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s`
  };
}

function gravity(input) {
  const m1 = num(input, "m1", "Primera masa m1", { positive: true });
  const m2 = num(input, "m2", "Segunda masa m2", { positive: true });
  const r = num(input, "rg", "Distancia entre centros r", { positive: true });
  const F = G * m1 * m2 / (r * r);
  return {
    results: [{ label: "Fuerza de atracción mutua F", value: `${fmt(F, 4)} N` }],
    steps: [
      { text: "Ley de la gravitación universal de Newton:", tex: `F = G\\frac{m_1 m_2}{r^2} = 6.674\\times10^{-11} \\times \\frac{${ntex(m1)} \\times ${ntex(m2)}}{(${ntex(r)})^2} = ${ntex(F, 6)}\\ N` }
    ],
    copy: `F = ${fmt(F, 4)} N`
  };
}

function orbit(input) {
  const M = num(input, "M", "Masa del cuerpo central M", { positive: true });
  const R = num(input, "R", "Radio del cuerpo R", { positive: true });
  const orbBy = choice(input, "orbBy", "Dado", ["h", "r"], "h");
  const steps = [];
  let r;
  if (orbBy === "h") {
    const h = num(input, "ho", "Altura h", { nonNegative: true });
    r = R + h;
    steps.push({ text: "Radio desde el centro del cuerpo:", tex: `r = R + h = ${ntex(R)} + ${ntex(h)} = ${ntex(r, 6)}\\ m` });
  } else {
    r = num(input, "ro", "Radio desde el centro r", { positive: true });
    if (r < R) fail("El radio de la órbita es menor que el radio del cuerpo, por lo que la órbita atraviesa su interior.", "ro");
  }
  const GM = G * M;
  const v = Math.sqrt(GM / r);
  const T = 2 * Math.PI * r / v;
  const vEsc = Math.sqrt(2 * GM / r);
  const g = GM / (r * r);
  steps.push({ text: "Velocidad orbital circular:", tex: `v = \\sqrt{\\frac{GM}{r}} = \\sqrt{\\frac{6.674\\times10^{-11} \\times ${ntex(M)}}{${ntex(r)}}} = ${ntex(v, 6)}\\ m/s` });
  steps.push({ text: "Periodo orbital:", tex: `T = \\frac{2\\pi r}{v} = ${ntex(T, 6)}\\ s` });
  steps.push({ text: "Velocidad de escape:", tex: `v_{esc} = \\sqrt{2}\\,v = ${ntex(vEsc, 6)}\\ m/s` });
  steps.push({ text: "Gravedad local en esta órbita:", tex: `g = \\frac{GM}{r^2} = ${ntex(g, 6)}\\ m/s^2` });
  return {
    results: [
      { label: "Radio desde el centro r", value: `${fmt(r, 4)} m` },
      { label: "Velocidad orbital v", value: `${fmt(v, 4)} m/s` },
      { label: "Periodo T", value: `${fmt(T, 4)} s` },
      { label: "Periodo en minutos", value: `${fmt(T / 60, 4)} min` },
      { label: "Velocidad de escape", value: `${fmt(vEsc, 4)} m/s` },
      { label: "Gravedad local g", value: `${fmt(g, 4)} m/s²` }
    ],
    steps,
    copy: `v = ${fmt(v, 4)} m/s, T = ${fmt(T / 60, 4)} min, v_esc = ${fmt(vEsc, 4)} m/s, g = ${fmt(g, 4)} m/s²`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["circular", "gravity", "orbit"], "circular");
  if (mode === "gravity") return gravity(input);
  if (mode === "orbit") return orbit(input);
  return circular(input);
}
