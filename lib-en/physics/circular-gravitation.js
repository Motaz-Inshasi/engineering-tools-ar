import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const G = 6.674e-11;

export const meta = {
  description: "Calculate uniform circular motion from the radius and speed or period, the attraction force between two bodies, orbital speed, orbital period, escape speed, and gravity at a given height above a planet's surface.",
  keywords: ["Circular motion", "Centripetal force", "Centripetal acceleration", "Universal gravitation", "Newton", "orbit", "Satellite", "Escape velocity", "circular motion", "gravitation", "orbit"],
  formulas: [
    { label: "Circular motion", tex: "a_c = \\frac{v^2}{r} = \\omega^2 r,\\qquad F_c = \\frac{m v^2}{r}" },
    { label: "Law of universal gravitation", tex: "F = G\\frac{m_1 m_2}{r^2},\\qquad G = 6.674\\times10^{-11}\\ \\frac{N\\,m^2}{kg^2}" },
    { label: "Circular orbit", tex: "v = \\sqrt{\\frac{GM}{r}},\\quad T = \\frac{2\\pi r}{v},\\quad v_{esc} = \\sqrt{\\frac{2GM}{r}},\\quad g = \\frac{GM}{r^2}" }
  ],
  inputs: [
    { id: "mode", label: "Calculation type", type: "select", default: "circular", options: [["circular", "Uniform circular motion"], ["gravity", "Gravitational force between two bodies"], ["orbit", "Orbit and satellite"]] },
    { id: "speedBy", label: "Given with radius", type: "select", default: "v", options: [["v", "Linear speed v"], ["T", "Period T"]], when: { mode: ["circular"] } },
    { id: "rc", label: "Radius r", unit: "m", type: "number", default: "2", when: { mode: ["circular"] } },
    { id: "vc", label: "Linear speed v", unit: "m/s", type: "number", default: "3", when: { mode: ["circular"], speedBy: ["v"] } },
    { id: "Tc", label: "Period T", unit: "s", type: "number", default: "4.19", when: { mode: ["circular"], speedBy: ["T"] } },
    { id: "mc", label: "Mass m", unit: "kg", type: "number", default: "0.5", when: { mode: ["circular"] } },
    { id: "m1", label: "First mass m1", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["gravity"] }, help: "By default, the mass of the Earth." },
    { id: "m2", label: "Second mass m2", unit: "kg", type: "number", default: "7.348e22", when: { mode: ["gravity"] }, help: "By default, the mass of the Moon." },
    { id: "rg", label: "Distance between centers r", unit: "m", type: "number", default: "3.844e8", when: { mode: ["gravity"] }, help: "By default, the distance between the centers of the Earth and the Moon." },
    { id: "M", label: "Mass of central body M", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["orbit"] }, help: "By default, the mass of the Earth." },
    { id: "R", label: "Radius of body R", unit: "m", type: "number", default: "6.371e6", when: { mode: ["orbit"] }, help: "By default, the radius of the Earth." },
    { id: "orbBy", label: "Given for orbit", type: "select", default: "h", options: [["h", "Height above surface h"], ["r", "Radius from center r"]], when: { mode: ["orbit"] } },
    { id: "ro", label: "Radius from center r", unit: "m", type: "number", default: "6.771e6", when: { mode: ["orbit"], orbBy: ["r"] } },
    { id: "ho", label: "Height above surface h", unit: "m", type: "number", default: "400k", when: { mode: ["orbit"], orbBy: ["h"] }, help: "Example: the altitude of the International Space Station is about 400 km." }
  ],
  example: {
    values: { mode: "circular", speedBy: "v", rc: "2", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" },
    expect: ["Fc = 2.25 N", "ac = 4.5 m/s²"],
    note: "Example: a 0.5 kg body orbits on a 2 m radius at 3 m/s."
  },
  invalid: { values: { mode: "circular", speedBy: "v", rc: "0", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" } },
  related: ["kinematics", "projectile-motion", "work-energy", "formulas-constants"]
};

function circular(input) {
  const speedBy = choice(input, "speedBy", "Given", ["v", "T"], "v");
  const r = num(input, "rc", "Radius r", { positive: true });
  const m = num(input, "mc", "Mass m", { positive: true });
  const steps = [];
  let v, T;
  if (speedBy === "v") {
    v = num(input, "vc", "Linear speed v", { positive: true });
    T = 2 * Math.PI * r / v;
    steps.push({ text: "Period from linear speed:", tex: `T = \\frac{2\\pi r}{v} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(v)}} = ${ntex(T, 6)}\\ s` });
  } else {
    T = num(input, "Tc", "Period T", { positive: true });
    v = 2 * Math.PI * r / T;
    steps.push({ text: "Linear speed from period:", tex: `v = \\frac{2\\pi r}{T} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(T)}} = ${ntex(v, 6)}\\ m/s` });
  }
  const w = v / r;
  const f = 1 / T;
  const ac = v * v / r;
  const Fc = m * ac;
  steps.push({ text: "Angular speed:", tex: `\\omega = \\frac{v}{r} = ${ntex(w, 6)}\\ rad/s` });
  steps.push({ text: "Centripetal acceleration:", tex: `a_c = \\frac{v^2}{r} = ${ntex(ac, 6)}\\ m/s^2` });
  steps.push({ text: "Centripetal force:", tex: `F_c = m\\,a_c = ${ntex(m)} \\times ${ntex(ac, 6)} = ${ntex(Fc, 6)}\\ N` });
  return {
    results: [
      { label: "Angular speed ω", value: `${fmt(w, 4)} rad/s` },
      { label: "Centripetal acceleration a_c", value: `${fmt(ac, 4)} m/s²` },
      { label: "Centripetal force F_c", value: `${fmt(Fc, 4)} N` },
      { label: "Linear speed v", value: `${fmt(v, 4)} m/s` },
      { label: "Frequency f", value: `${fmt(f, 4)} Hz` },
      { label: "Period T", value: `${fmt(T, 4)} s` }
    ],
    steps,
    copy: `ω = ${fmt(w, 4)} rad/s, ac = ${fmt(ac, 4)} m/s², Fc = ${fmt(Fc, 4)} N, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s`
  };
}

function gravity(input) {
  const m1 = num(input, "m1", "First mass m1", { positive: true });
  const m2 = num(input, "m2", "Second mass m2", { positive: true });
  const r = num(input, "rg", "Distance between centers r", { positive: true });
  const F = G * m1 * m2 / (r * r);
  return {
    results: [{ label: "Mutual attraction force F", value: `${fmt(F, 4)} N` }],
    steps: [
      { text: "Newton's law of universal gravitation:", tex: `F = G\\frac{m_1 m_2}{r^2} = 6.674\\times10^{-11} \\times \\frac{${ntex(m1)} \\times ${ntex(m2)}}{(${ntex(r)})^2} = ${ntex(F, 6)}\\ N` }
    ],
    copy: `F = ${fmt(F, 4)} N`
  };
}

function orbit(input) {
  const M = num(input, "M", "Mass of central body M", { positive: true });
  const R = num(input, "R", "Radius of body R", { positive: true });
  const orbBy = choice(input, "orbBy", "Given", ["h", "r"], "h");
  const steps = [];
  let r;
  if (orbBy === "h") {
    const h = num(input, "ho", "Height h", { nonNegative: true });
    r = R + h;
    steps.push({ text: "Radius from the center of the body:", tex: `r = R + h = ${ntex(R)} + ${ntex(h)} = ${ntex(r, 6)}\\ m` });
  } else {
    r = num(input, "ro", "Radius from center r", { positive: true });
    if (r < R) fail("The orbit radius is smaller than the body's radius, so the orbit passes inside the body.", "ro");
  }
  const GM = G * M;
  const v = Math.sqrt(GM / r);
  const T = 2 * Math.PI * r / v;
  const vEsc = Math.sqrt(2 * GM / r);
  const g = GM / (r * r);
  steps.push({ text: "Orbital speed of a circular orbit:", tex: `v = \\sqrt{\\frac{GM}{r}} = \\sqrt{\\frac{6.674\\times10^{-11} \\times ${ntex(M)}}{${ntex(r)}}} = ${ntex(v, 6)}\\ m/s` });
  steps.push({ text: "Orbital period:", tex: `T = \\frac{2\\pi r}{v} = ${ntex(T, 6)}\\ s` });
  steps.push({ text: "Escape speed:", tex: `v_{esc} = \\sqrt{2}\\,v = ${ntex(vEsc, 6)}\\ m/s` });
  steps.push({ text: "Local gravity on this orbit:", tex: `g = \\frac{GM}{r^2} = ${ntex(g, 6)}\\ m/s^2` });
  return {
    results: [
      { label: "Radius from center r", value: `${fmt(r, 4)} m` },
      { label: "Orbital speed v", value: `${fmt(v, 4)} m/s` },
      { label: "Orbital period T", value: `${fmt(T, 4)} s` },
      { label: "Orbital period in minutes", value: `${fmt(T / 60, 4)} min` },
      { label: "Escape velocity", value: `${fmt(vEsc, 4)} m/s` },
      { label: "Local gravity g", value: `${fmt(g, 4)} m/s²` }
    ],
    steps,
    copy: `v = ${fmt(v, 4)} m/s, T = ${fmt(T / 60, 4)} min, v_esc = ${fmt(vEsc, 4)} m/s, g = ${fmt(g, 4)} m/s²`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", ["circular", "gravity", "orbit"], "circular");
  if (mode === "gravity") return gravity(input);
  if (mode === "orbit") return orbit(input);
  return circular(input);
}
