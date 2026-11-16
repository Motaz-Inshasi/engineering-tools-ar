import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "Resuelve el movimiento de un proyectil en el aire sin resistencia: componentes de la velocidad inicial, tiempo hasta la altura máxima, altura máxima, tiempo de vuelo, alcance, velocidad y ángulo del impacto, con la trayectoria.",
  keywords: ["Proyectil", "Movimiento de proyectiles", "projectile", "Alcance", "range", "Altura máxima", "Ángulo de lanzamiento", "Tiempo de vuelo"],
  formulas: [
    { label: "Componentes de la velocidad inicial", tex: "v_x = v_0\\cos\\theta,\\qquad v_{y0} = v_0\\sin\\theta" },
    { label: "Altura máxima y tiempo de vuelo", tex: "H = h_0 + \\frac{v_{y0}^2}{2g},\\qquad h_0 + v_{y0}t - \\tfrac{1}{2}gt^2 = 0" },
    { label: "Alcance", tex: "R = v_x\\,T" }
  ],
  inputs: [
    { id: "v0", label: "Velocidad inicial v0", unit: "m/s", type: "number", default: "20" },
    { id: "theta", label: "Ángulo de lanzamiento θ", unit: "°", type: "number", default: "45", help: "De 0 a 90 grados, medido desde la horizontal." },
    { id: "h0", label: "Altura inicial h0", unit: "m", type: "number", default: "0" },
    { id: "g", label: "Gravedad g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { v0: "20", theta: "45", h0: "0", g: "9.81" }, expect: ["R = 40.77 m", "Hmax = 10.19 m", "T = 2.883 s"], note: "Ejemplo: proyectil con velocidad de 20 m/s a 45° desde el suelo." },
  invalid: { values: { v0: "20", theta: "120", h0: "0", g: "9.81" } },
  related: ["kinematics", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const v0 = num(input, "v0", "Velocidad inicial", { positive: true });
  const theta = num(input, "theta", "Ángulo de lanzamiento", { min: 0, max: 90 });
  const h0 = num(input, "h0", "Altura inicial", { nonNegative: true });
  const g = num(input, "g", "Gravedad", { positive: true });
  const rad = (theta * Math.PI) / 180;
  const vx = snap(v0 * Math.cos(rad));
  const vy0 = snap(v0 * Math.sin(rad));
  const tPeak = vy0 / g;
  const H = h0 + (vy0 * vy0) / (2 * g);
  const tof = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  if (!(tof > 0)) fail("El cuerpo no se mueve en el aire: aumenta el ángulo o la altura inicial.", "theta");
  const R = vx * tof;
  const vyImp = vy0 - g * tof;
  const speed = Math.hypot(vx, vyImp);
  const angle = (Math.atan2(-vyImp, vx) * 180) / Math.PI;
  const steps = [
    { text: "Componentes de la velocidad inicial:", tex: `v_x = v_0\\cos\\theta = ${T(v0)}\\cos(${T(theta)}^\\circ) = ${T(vx)}\\ m/s,\\qquad v_{y0} = v_0\\sin\\theta = ${T(vy0)}\\ m/s` },
    { text: "Tiempo para llegar al punto más alto (la velocidad vertical se anula):", tex: `t_{peak} = \\frac{v_{y0}}{g} = ${T(tPeak)}\\ s` },
    { text: "Altura máxima:", tex: `H = h_0 + \\frac{v_{y0}^2}{2g} = ${T(h0)} + \\frac{(${T(vy0)})^2}{2 \\times ${T(g)}} = ${T(H)}\\ m` },
    { text: "Tiempo de vuelo (la raíz positiva de la ecuación h = 0):", tex: `t = \\frac{v_{y0} + \\sqrt{v_{y0}^2 + 2gh_0}}{g} = ${T(tof)}\\ s` },
    { text: "Alcance horizontal:", tex: `R = v_x t = ${T(R)}\\ m` },
    { text: "Velocidad de impacto:", tex: `v_y = v_{y0} - gt = ${T(vyImp)}\\ m/s,\\qquad v = \\sqrt{v_x^2 + v_y^2} = ${T(speed)}\\ m/s` },
    { text: "Ángulo de impacto bajo la horizontal:", tex: `\\alpha = \\arctan\\frac{|v_y|}{v_x} = ${T(angle)}^\\circ` }
  ];
  const results = [
    { label: "Componente horizontal vx", value: `${fmt(vx, 4)} m/s` },
    { label: "Componente vertical inicial vy0", value: `${fmt(vy0, 4)} m/s` },
    { label: "Tiempo para llegar al punto más alto", value: `${fmt(tPeak, 4)} s` },
    { label: "Altura máxima Hmax", value: `${fmt(H, 4)} m` },
    { label: "Tiempo de vuelo T", value: `${fmt(tof, 4)} s` },
    { label: "Alcance R", value: `${fmt(R, 4)} m` },
    { label: "Velocidad de impacto", value: `${fmt(speed, 4)} m/s` },
    { label: "Ángulo de impacto bajo la horizontal", value: `${fmt(angle, 4)}°` }
  ];
  const copy = `R = ${fmt(R, 4)} m، Hmax = ${fmt(H, 4)} m، T = ${fmt(tof, 4)} s`;
  const N = 120;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const s = (tof * i) / N;
    return [vx * s, h0 + vy0 * s - 0.5 * g * s * s];
  });
  const blocks = [
    { type: "plot", title: "Trayectoria del proyectil: y frente a x", xLabel: "x (m)", yLabel: "y (m)", includeZero: true, series: [{ name: "Trayectoria", points: pts }], hlines: [{ y: H }], vlines: [{ x: R }] }
  ];
  return { results, steps, copy, blocks, values: { vx, vy0, tPeak, H, tof, R, speed, angle } };
}
