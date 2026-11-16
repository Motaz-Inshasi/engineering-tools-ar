import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "Analyse d'un corps sur un plan incliné avec frottement : poids et ses composantes, force normale, frottement statique maximal et glissement éventuel depuis le repos, accélération de glissement et angle critique, avec la courbe de la force de frottement.",
  keywords: ["plan incliné", "frottement", "inclined plane", "friction", "angle critique", "coefficient de frottement", "glissement"],
  formulas: [
    { label: "Composantes du poids", tex: "W = mg,\\qquad F_\\parallel = mg\\sin\\theta,\\qquad N = mg\\cos\\theta" },
    { label: "Condition de glissement depuis le repos", tex: "\\tan\\theta > \\mu_s \\quad\\Leftrightarrow\\quad mg\\sin\\theta > \\mu_s N" },
    { label: "Accélération de glissement", tex: "a = g(\\sin\\theta - \\mu_k\\cos\\theta)" }
  ],
  inputs: [
    { id: "m", label: "Masse m", unit: "kg", type: "number", default: "10" },
    { id: "theta", label: "Angle d'inclinaison θ", unit: "°", type: "number", default: "30", help: "De 0 à 89.9 degrés." },
    { id: "mu_s", label: "Coefficient de frottement statique μs", type: "number", default: "0.5" },
    { id: "mu_k", label: "Coefficient de frottement cinétique μk", type: "number", default: "0.3", help: "μk doit être inférieur ou égal à μs." },
    { id: "g", label: "Pesanteur g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { m: "10", theta: "30", mu_s: "0.5", mu_k: "0.3", g: "9.81" }, expect: ["Glisse : oui", "a = 2.356 m/s²"], note: "Exemple : caisse de 10 kg sur un plan incliné de 30 degrés." },
  invalid: { values: { m: "10", theta: "30", mu_s: "0.3", mu_k: "0.5", g: "9.81" } },
  related: ["kinematics", "work-energy", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const m = num(input, "m", "la masse", { positive: true });
  const theta = num(input, "theta", "l'angle d'inclinaison", { min: 0, max: 89.9 });
  const mus = num(input, "mu_s", "le coefficient de frottement statique", { nonNegative: true });
  const muk = num(input, "mu_k", "le coefficient de frottement cinétique", { nonNegative: true });
  if (muk > mus) fail("Le coefficient de frottement cinétique μk ne peut pas dépasser le coefficient statique μs.", "mu_k");
  const g = num(input, "g", "la pesanteur", { positive: true });
  const rad = (theta * Math.PI) / 180;
  const s = snap(Math.sin(rad));
  const c = snap(Math.cos(rad));
  const W = m * g;
  const Fp = W * s;
  const N = W * c;
  const fsMax = mus * N;
  const tanT = Math.tan(rad);
  const slides = tanT > mus;
  const a = slides ? g * (s - muk * c) : 0;
  const fk = muk * N;
  const critical = (Math.atan(mus) * 180) / Math.PI;
  const friction = slides ? fk : Fp;
  const steps = [
    { text: "Poids :", tex: `W = mg = ${T(m)} \\times ${T(g)} = ${T(W)}\\ N` },
    { text: "Composante parallèle au plan et force normale :", tex: `F_\\parallel = W\\sin\\theta = ${T(Fp)}\\ N,\\qquad N = W\\cos\\theta = ${T(N)}\\ N` },
    { text: "Frottement statique maximal :", tex: `f_{s,max} = \\mu_s N = ${T(mus)} \\times ${T(N)} = ${T(fsMax)}\\ N` },
    { text: "Condition de glissement depuis le repos :", tex: `\\tan\\theta = ${T(tanT)}\\ ${slides ? ">" : "\\le"}\\ \\mu_s = ${T(mus)}` }
  ];
  if (slides) {
    steps.push({ text: "Le corps glisse, donc la force de frottement est cinétique et l'accélération vaut :", tex: `a = g(\\sin\\theta - \\mu_k\\cos\\theta) = ${T(a)}\\ m/s^2` });
  } else {
    steps.push({ text: "Le corps reste immobile, et le frottement statique requis est égal à la composante parallèle :", tex: `f = F_\\parallel = ${T(Fp)}\\ N \\le f_{s,max} = ${T(fsMax)}\\ N` });
  }
  const results = [
    { label: "Poids W", value: `${fmt(W, 4)} N` },
    { label: "Composante parallèle au plan", value: `${fmt(Fp, 4)} N` },
    { label: "Force normale N", value: `${fmt(N, 4)} N` },
    { label: "Frottement statique maximal μs·N", value: `${fmt(fsMax, 4)} N` },
    { label: "Le corps glisse-t-il depuis le repos ?", value: slides ? "oui" : "non" },
    { label: "Accélération sur le plan", value: `${fmt(a, 4)} m/s²` },
    { label: "Force de frottement cinétique μk·N", value: `${fmt(fk, 4)} N` },
    { label: slides ? "Force de frottement agissante (cinétique)" : "Force de frottement statique requise", value: `${fmt(friction, 4)} N` },
    { label: "Angle critique atan(μs)", value: `${fmt(critical, 4)}°` }
  ];
  const copy = `Glisse : ${slides ? "oui" : "non"}, a = ${fmt(a, 4)} m/s², angle critique = ${fmt(critical, 4)}°`;
  const angles = Array.from({ length: 180 }, (_, i) => (i * 89.9) / 179);
  const pts = angles.map((d) => {
    const r = (d * Math.PI) / 180;
    return [d, Math.tan(r) > mus ? muk * m * g * Math.cos(r) : m * g * Math.sin(r)];
  });
  const blocks = [
    { type: "plot", title: "Force de frottement en fonction de l'angle d'inclinaison", xLabel: "θ (°)", yLabel: "f (N)", includeZero: true, series: [{ name: "f(θ)", points: pts }], vlines: [{ x: critical }] }
  ];
  return {
    results, steps, copy, blocks,
    values: { W, Fp, N, fsMax, slides, a, fk, critical, friction }
  };
}
