import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "Résout le mouvement d'un projectile dans l'air sans résistance : composantes initiales, temps jusqu'au sommet, hauteur maximale, durée du vol, portée, vitesse et angle d'impact, avec la trajectoire.",
  keywords: ["projectile", "mouvement des projectiles", "projectile", "portée", "range", "hauteur maximale", "angle de tir", "durée du vol"],
  formulas: [
    { label: "Composantes de la vitesse initiale", tex: "v_x = v_0\\cos\\theta,\\qquad v_{y0} = v_0\\sin\\theta" },
    { label: "Hauteur maximale et durée du vol", tex: "H = h_0 + \\frac{v_{y0}^2}{2g},\\qquad h_0 + v_{y0}t - \\tfrac{1}{2}gt^2 = 0" },
    { label: "Portée", tex: "R = v_x\\,T" }
  ],
  inputs: [
    { id: "v0", label: "Vitesse initiale v0", unit: "m/s", type: "number", default: "20" },
    { id: "theta", label: "Angle de tir θ", unit: "°", type: "number", default: "45", help: "De 0 à 90 degrés, mesuré par rapport à l'horizontale." },
    { id: "h0", label: "Hauteur initiale h0", unit: "m", type: "number", default: "0" },
    { id: "g", label: "Pesanteur g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { v0: "20", theta: "45", h0: "0", g: "9.81" }, expect: ["R = 40.77 m", "Hmax = 10.19 m", "T = 2.883 s"], note: "Exemple : projectile lancé à 20 m/s avec un angle de 45° depuis le sol." },
  invalid: { values: { v0: "20", theta: "120", h0: "0", g: "9.81" } },
  related: ["kinematics", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const v0 = num(input, "v0", "Vitesse initiale", { positive: true });
  const theta = num(input, "theta", "angle de tir", { min: 0, max: 90 });
  const h0 = num(input, "h0", "Hauteur initiale", { nonNegative: true });
  const g = num(input, "g", "la pesanteur", { positive: true });
  const rad = (theta * Math.PI) / 180;
  const vx = snap(v0 * Math.cos(rad));
  const vy0 = snap(v0 * Math.sin(rad));
  const tPeak = vy0 / g;
  const H = h0 + (vy0 * vy0) / (2 * g);
  const tof = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  if (!(tof > 0)) fail("Le corps ne se déplace pas dans l'air : augmentez l'angle ou la hauteur initiale.", "theta");
  const R = vx * tof;
  const vyImp = vy0 - g * tof;
  const speed = Math.hypot(vx, vyImp);
  const angle = (Math.atan2(-vyImp, vx) * 180) / Math.PI;
  const steps = [
    { text: "Composantes de la vitesse initiale :", tex: `v_x = v_0\\cos\\theta = ${T(v0)}\\cos(${T(theta)}^\\circ) = ${T(vx)}\\ m/s,\\qquad v_{y0} = v_0\\sin\\theta = ${T(vy0)}\\ m/s` },
    { text: "Temps pour atteindre le point le plus haut (la vitesse verticale s'annule) :", tex: `t_{peak} = \\frac{v_{y0}}{g} = ${T(tPeak)}\\ s` },
    { text: "Hauteur maximale :", tex: `H = h_0 + \\frac{v_{y0}^2}{2g} = ${T(h0)} + \\frac{(${T(vy0)})^2}{2 \\times ${T(g)}} = ${T(H)}\\ m` },
    { text: "Durée du vol (racine positive de l'équation h = 0) :", tex: `t = \\frac{v_{y0} + \\sqrt{v_{y0}^2 + 2gh_0}}{g} = ${T(tof)}\\ s` },
    { text: "Portée horizontale :", tex: `R = v_x t = ${T(R)}\\ m` },
    { text: "Vitesse d'impact :", tex: `v_y = v_{y0} - gt = ${T(vyImp)}\\ m/s,\\qquad v = \\sqrt{v_x^2 + v_y^2} = ${T(speed)}\\ m/s` },
    { text: "Angle d'impact sous l'horizontale :", tex: `\\alpha = \\arctan\\frac{|v_y|}{v_x} = ${T(angle)}^\\circ` }
  ];
  const results = [
    { label: "Composante horizontale vx", value: `${fmt(vx, 4)} m/s` },
    { label: "Composante verticale initiale vy0", value: `${fmt(vy0, 4)} m/s` },
    { label: "Temps pour atteindre le point le plus haut", value: `${fmt(tPeak, 4)} s` },
    { label: "Hauteur maximale Hmax", value: `${fmt(H, 4)} m` },
    { label: "Durée du vol T", value: `${fmt(tof, 4)} s` },
    { label: "Portée R", value: `${fmt(R, 4)} m` },
    { label: "Vitesse d'impact", value: `${fmt(speed, 4)} m/s` },
    { label: "Angle d'impact sous l'horizontale", value: `${fmt(angle, 4)}°` }
  ];
  const copy = `R = ${fmt(R, 4)} m، Hmax = ${fmt(H, 4)} m، T = ${fmt(tof, 4)} s`;
  const N = 120;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const s = (tof * i) / N;
    return [vx * s, h0 + vy0 * s - 0.5 * g * s * s];
  });
  const blocks = [
    { type: "plot", title: "Trajectoire du projectile y en fonction de x", xLabel: "x (m)", yLabel: "y (m)", includeZero: true, series: [{ name: "Trajectoire", points: pts }], hlines: [{ y: H }], vlines: [{ x: R }] }
  ];
  return { results, steps, copy, blocks, values: { vx, vy0, tPeak, H, tof, R, speed, angle } };
}
