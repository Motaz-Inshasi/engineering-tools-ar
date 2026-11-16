import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "Solves projectile motion in air without resistance: initial components, time to maximum height, maximum height, flight time, range, impact speed and angle, with the path of motion.",
  keywords: ["projectile", "projectile motion", "projectile", "range", "range", "maximum height", "launch angle", "flight time"],
  formulas: [
    { label: "Components of initial velocity", tex: "v_x = v_0\\cos\\theta,\\qquad v_{y0} = v_0\\sin\\theta" },
    { label: "Maximum height and flight time", tex: "H = h_0 + \\frac{v_{y0}^2}{2g},\\qquad h_0 + v_{y0}t - \\tfrac{1}{2}gt^2 = 0" },
    { label: "Range", tex: "R = v_x\\,T" }
  ],
  inputs: [
    { id: "v0", label: "Initial velocity v0", unit: "m/s", type: "number", default: "20" },
    { id: "theta", label: "Launch angle θ", unit: "°", type: "number", default: "45", help: "From 0 to 90 degrees, measured from the horizontal." },
    { id: "h0", label: "Initial height h0", unit: "m", type: "number", default: "0" },
    { id: "g", label: "Gravitational acceleration g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { v0: "20", theta: "45", h0: "0", g: "9.81" }, expect: ["R = 40.77 m", "Hmax = 10.19 m", "T = 2.883 s"], note: "Example: a projectile launched at 20 m/s at an angle of 45° from ground level." },
  invalid: { values: { v0: "20", theta: "120", h0: "0", g: "9.81" } },
  related: ["kinematics", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const v0 = num(input, "v0", "Initial velocity", { positive: true });
  const theta = num(input, "theta", "launch angle", { min: 0, max: 90 });
  const h0 = num(input, "h0", "Initial height", { nonNegative: true });
  const g = num(input, "g", "Gravitational acceleration", { positive: true });
  const rad = (theta * Math.PI) / 180;
  const vx = snap(v0 * Math.cos(rad));
  const vy0 = snap(v0 * Math.sin(rad));
  const tPeak = vy0 / g;
  const H = h0 + (vy0 * vy0) / (2 * g);
  const tof = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  if (!(tof > 0)) fail("The body does not move in the air: increase the launch angle or the initial height.", "theta");
  const R = vx * tof;
  const vyImp = vy0 - g * tof;
  const speed = Math.hypot(vx, vyImp);
  const angle = (Math.atan2(-vyImp, vx) * 180) / Math.PI;
  const steps = [
    { text: "Components of initial velocity:", tex: `v_x = v_0\\cos\\theta = ${T(v0)}\\cos(${T(theta)}^\\circ) = ${T(vx)}\\ m/s,\\qquad v_{y0} = v_0\\sin\\theta = ${T(vy0)}\\ m/s` },
    { text: "Time to reach the highest point (vertical velocity is zero):", tex: `t_{peak} = \\frac{v_{y0}}{g} = ${T(tPeak)}\\ s` },
    { text: "Maximum height:", tex: `H = h_0 + \\frac{v_{y0}^2}{2g} = ${T(h0)} + \\frac{(${T(vy0)})^2}{2 \\times ${T(g)}} = ${T(H)}\\ m` },
    { text: "Flight time (the positive root of h = 0):", tex: `t = \\frac{v_{y0} + \\sqrt{v_{y0}^2 + 2gh_0}}{g} = ${T(tof)}\\ s` },
    { text: "Horizontal range:", tex: `R = v_x t = ${T(R)}\\ m` },
    { text: "Impact speed:", tex: `v_y = v_{y0} - gt = ${T(vyImp)}\\ m/s,\\qquad v = \\sqrt{v_x^2 + v_y^2} = ${T(speed)}\\ m/s` },
    { text: "Impact angle below the horizontal:", tex: `\\alpha = \\arctan\\frac{|v_y|}{v_x} = ${T(angle)}^\\circ` }
  ];
  const results = [
    { label: "Horizontal component vx", value: `${fmt(vx, 4)} m/s` },
    { label: "Initial vertical component vy0", value: `${fmt(vy0, 4)} m/s` },
    { label: "Time to reach the highest point", value: `${fmt(tPeak, 4)} s` },
    { label: "Maximum height Hmax", value: `${fmt(H, 4)} m` },
    { label: "Flight time T", value: `${fmt(tof, 4)} s` },
    { label: "Range R", value: `${fmt(R, 4)} m` },
    { label: "Impact speed", value: `${fmt(speed, 4)} m/s` },
    { label: "Impact angle below the horizontal", value: `${fmt(angle, 4)}°` }
  ];
  const copy = `R = ${fmt(R, 4)} m، Hmax = ${fmt(H, 4)} m، T = ${fmt(tof, 4)} s`;
  const N = 120;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const s = (tof * i) / N;
    return [vx * s, h0 + vy0 * s - 0.5 * g * s * s];
  });
  const blocks = [
    { type: "plot", title: "Projectile path y versus x", xLabel: "x (m)", yLabel: "y (m)", includeZero: true, series: [{ name: "Path", points: pts }], hlines: [{ y: H }], vlines: [{ x: R }] }
  ];
  return { results, steps, copy, blocks, values: { vx, vy0, tPeak, H, tof, R, speed, angle } };
}
