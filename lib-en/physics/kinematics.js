import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const IDS = ["v0", "v", "a", "t", "x"];
const NAMES = { v0: "Initial velocity v0", v: "Final velocity v", a: "Acceleration a", t: "Time t", x: "Displacement x" };
const UNITS = { v0: "m/s", v: "m/s", a: "m/s²", t: "s", x: "m" };
const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;

function quadTex(A, B, C, t) {
  return `${T(A)}t^2 + ${S(B)}t + ${S(C)} = 0 \\Rightarrow t = ${T(t)}\\ s`;
}

function quadraticRoot(A, B, C, field) {
  const D = B * B - 4 * A * C;
  if (D < 0) fail("No real motion satisfies these data.", field);
  const q = Math.sqrt(D);
  const roots = [(-B - q) / (2 * A), (-B + q) / (2 * A)].filter((r) => r > 0);
  if (roots.length === 0) fail("No positive time satisfies these data.", field);
  return Math.min(...roots);
}

export const meta = {
  description: "Solves the equations of motion with constant acceleration: enter three of v0, v, a, t and x, and the other two are calculated with the steps and the plots of v(t) and x(t).",
  keywords: ["Equations of motion", "SUVAT", "SUVAT", "constant acceleration", "velocity", "displacement", "time", "kinematics"],
  formulas: [
    { label: "Equations of motion with constant acceleration", tex: "v = v_0 + at,\\qquad x = v_0 t + \\tfrac{1}{2}at^2,\\qquad v^2 = v_0^2 + 2ax" },
    { label: "Average velocity", tex: "x = \\frac{v_0 + v}{2}\\,t" }
  ],
  inputs: [
    { id: "v0", label: "Initial velocity v0", unit: "m/s", type: "number", help: "Enter exactly three of the five values and leave the rest empty." },
    { id: "v", label: "Final velocity v", unit: "m/s", type: "number" },
    { id: "a", label: "Acceleration a", unit: "m/s²", type: "number", help: "Positive means acceleration and negative means deceleration." },
    { id: "t", label: "Time t", unit: "s", type: "number" },
    { id: "x", label: "Displacement x", unit: "m", type: "number" }
  ],
  example: { values: { v0: "0", v: "", a: "9.81", t: "3", x: "" }, expect: ["v = 29.43 m/s", "x = 44.145 m"], note: "Example: a body starts from rest with an acceleration of 9.81 m/s² for 3 s." },
  invalid: { values: { v0: "5", v: "10", a: "2", t: "3", x: "" } },
  related: ["projectile-motion", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const given = IDS.filter((k) => !isBlank(input[k]));
  if (given.length !== 3) {
    const field = given.length > 3 ? given[3] : IDS.find((k) => isBlank(input[k]));
    fail(`Enter exactly three of the five values (you entered ${given.length}).`, field);
  }
  const u = {};
  for (const k of given) u[k] = num(input, k, NAMES[k], k === "t" ? { positive: true } : {});
  let { v0, v, a, t, x } = u;
  const steps = [];
  switch (given.join("")) {
    case "v0va": {
      if (a === 0) {
        if (v !== v0) fail("When a = 0, v must equal the initial velocity v0.", "v");
        fail("When a = 0 and v = v0, the time or displacement cannot be determined from these data.", "a");
      }
      t = (v - v0) / a;
      if (!(t > 0)) fail("The resulting time is not positive, so the data do not describe future motion.", "a");
      x = (v * v - v0 * v0) / (2 * a);
      steps.push({ text: "From the velocity equation v = v0 + at we calculate the time:", tex: `t = \\frac{v - v_0}{a} = \\frac{${S(v)} - ${S(v0)}}{${S(a)}} = ${T(t)}\\ s` });
      steps.push({ text: "From the time-free equation v² = v0² + 2ax we calculate the displacement:", tex: `x = \\frac{v^2 - v_0^2}{2a} = ${T(x)}\\ m` });
      break;
    }
    case "v0vt": {
      a = (v - v0) / t;
      x = ((v0 + v) / 2) * t;
      steps.push({ text: "From the velocity equation v = v0 + at we calculate the acceleration:", tex: `a = \\frac{v - v_0}{t} = \\frac{${S(v)} - ${S(v0)}}{${T(t)}} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "The average velocity in motion with constant acceleration gives the displacement:", tex: `x = \\frac{v_0 + v}{2}\\,t = ${T(x)}\\ m` });
      break;
    }
    case "v0vx": {
      if (v0 + v === 0) fail("The sum of v0 and v equals zero, so the time cannot be determined from the displacement.", "x");
      t = (2 * x) / (v0 + v);
      if (!(t > 0)) fail("The displacement does not match the two given velocities because the resulting time is not positive.", "x");
      a = (v - v0) / t;
      steps.push({ text: "From x = (v0 + v)t / 2 we calculate the time:", tex: `t = \\frac{2x}{v_0 + v} = ${T(t)}\\ s` });
      steps.push({ text: "From the velocity equation we calculate the acceleration:", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "v0at": {
      v = v0 + a * t;
      x = v0 * t + 0.5 * a * t * t;
      steps.push({ text: "Velocity equation:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      steps.push({ text: "Displacement equation:", tex: `x = v_0 t + \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "v0ax": {
      if (a === 0) {
        if (v0 === 0) fail("When a = 0 and v0 = 0 the body does not move, so the time cannot be determined.", "v0");
        t = x / v0;
        if (!(t > 0)) fail("The displacement and initial velocity have opposite signs, so there is no positive time.", "x");
        steps.push({ text: "When a = 0 the displacement equation becomes linear: x = v0 t", tex: `t = \\frac{x}{v_0} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, v0, -x, "x");
        steps.push({ text: "We solve the equation x = v0 t + ½at² and take the smallest positive root:", tex: quadTex(a / 2, v0, -x, t) });
      }
      v = v0 + a * t;
      steps.push({ text: "Velocity equation:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "v0tx": {
      a = (2 * (x - v0 * t)) / (t * t);
      v = v0 + a * t;
      steps.push({ text: "From x = v0 t + ½at² we calculate the acceleration:", tex: `a = \\frac{2(x - v_0 t)}{t^2} = ${T(a)}\\ m/s^2` });
      steps.push({ text: "Velocity equation:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
    case "vat": {
      v0 = v - a * t;
      x = v * t - 0.5 * a * t * t;
      steps.push({ text: "Inverting the velocity equation to find the initial velocity:", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      steps.push({ text: "Displacement equation in terms of the final velocity:", tex: `x = vt - \\frac{1}{2}at^2 = ${T(x)}\\ m` });
      break;
    }
    case "vax": {
      if (a === 0) {
        if (v === 0) fail("When a = 0 and v = 0 the time cannot be determined.", "v");
        t = x / v;
        if (!(t > 0)) fail("The displacement and final velocity have opposite signs, so there is no positive time.", "x");
        steps.push({ text: "When a = 0 the displacement equation becomes linear: x = vt", tex: `t = \\frac{x}{v} = ${T(t)}\\ s` });
      } else {
        t = quadraticRoot(a / 2, -v, x, "x");
        steps.push({ text: "We solve the equation x = vt - ½at² and take the smallest positive root:", tex: quadTex(a / 2, -v, x, t) });
      }
      v0 = v - a * t;
      steps.push({ text: "Inverting the velocity equation to find the initial velocity:", tex: `v_0 = v - at = ${T(v0)}\\ m/s` });
      break;
    }
    case "vtx": {
      v0 = (2 * x) / t - v;
      a = (v - v0) / t;
      steps.push({ text: "From x = (v0 + v)t / 2 we calculate the initial velocity:", tex: `v_0 = \\frac{2x}{t} - v = ${T(v0)}\\ m/s` });
      steps.push({ text: "From the velocity equation we calculate the acceleration:", tex: `a = \\frac{v - v_0}{t} = ${T(a)}\\ m/s^2` });
      break;
    }
    case "atx": {
      v0 = (x - 0.5 * a * t * t) / t;
      v = v0 + a * t;
      steps.push({ text: "From x = v0 t + ½at² we calculate the initial velocity:", tex: `v_0 = \\frac{x - \\frac{1}{2}at^2}{t} = ${T(v0)}\\ m/s` });
      steps.push({ text: "Velocity equation:", tex: `v = v_0 + at = ${T(v)}\\ m/s` });
      break;
    }
  }
  const vals = { v0, v, a, t, x };
  const results = IDS.map((k) => ({
    label: `${NAMES[k]} ${given.includes(k) ? "(given)" : "(calculated)"}`,
    value: `${fmt(vals[k], 6)} ${UNITS[k]}`
  }));
  const copy = `v = ${fmt(v)} m/s، x = ${fmt(x)} m، t = ${fmt(t)} s، a = ${fmt(a)} m/s²`;
  const N = 60;
  const ts = Array.from({ length: N + 1 }, (_, i) => (t * i) / N);
  const blocks = [
    { type: "plot", title: "Velocity versus time v(t)", xLabel: "t (s)", yLabel: "v (m/s)", includeZero: true, series: [{ name: "v(t)", points: ts.map((s) => [s, v0 + a * s]) }] },
    { type: "plot", title: "Displacement versus time x(t)", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: ts.map((s) => [s, v0 * s + 0.5 * a * s * s]) }] }
  ];
  return { results, steps, copy, blocks, values: vals };
}
