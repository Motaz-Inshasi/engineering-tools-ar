import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "Analysis of a body on an inclined plane with friction: weight and its components, normal force, maximum static friction and whether it slides from rest, sliding acceleration and critical angle, with a friction force curve.",
  keywords: ["Inclined plane", "friction", "inclined plane", "friction", "critical angle", "friction coefficient", "sliding"],
  formulas: [
    { label: "Components of weight", tex: "W = mg,\\qquad F_\\parallel = mg\\sin\\theta,\\qquad N = mg\\cos\\theta" },
    { label: "Condition for sliding from rest", tex: "\\tan\\theta > \\mu_s \\quad\\Leftrightarrow\\quad mg\\sin\\theta > \\mu_s N" },
    { label: "Sliding acceleration", tex: "a = g(\\sin\\theta - \\mu_k\\cos\\theta)" }
  ],
  inputs: [
    { id: "m", label: "Mass m", unit: "kg", type: "number", default: "10" },
    { id: "theta", label: "Angle of inclination θ", unit: "°", type: "number", default: "30", help: "From 0 to 89.9 degrees." },
    { id: "mu_s", label: "Static friction coefficient μs", type: "number", default: "0.5" },
    { id: "mu_k", label: "Kinetic friction coefficient μk", type: "number", default: "0.3", help: "μk must be less than or equal to μs." },
    { id: "g", label: "Gravitational acceleration g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { m: "10", theta: "30", mu_s: "0.5", mu_k: "0.3", g: "9.81" }, expect: ["Slides: yes", "a = 2.356 m/s²"], note: "Example: a 10 kg box on a 30° inclined plane." },
  invalid: { values: { m: "10", theta: "30", mu_s: "0.3", mu_k: "0.5", g: "9.81" } },
  related: ["kinematics", "work-energy", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const m = num(input, "m", "Mass", { positive: true });
  const theta = num(input, "theta", "Angle of inclination", { min: 0, max: 89.9 });
  const mus = num(input, "mu_s", "Static friction coefficient", { nonNegative: true });
  const muk = num(input, "mu_k", "Kinetic friction coefficient", { nonNegative: true });
  if (muk > mus) fail("The kinetic friction coefficient μk cannot exceed the static coefficient μs.", "mu_k");
  const g = num(input, "g", "Gravitational acceleration", { positive: true });
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
    { text: "Weight:", tex: `W = mg = ${T(m)} \\times ${T(g)} = ${T(W)}\\ N` },
    { text: "Component parallel to the plane and normal force:", tex: `F_\\parallel = W\\sin\\theta = ${T(Fp)}\\ N,\\qquad N = W\\cos\\theta = ${T(N)}\\ N` },
    { text: "Maximum static friction:", tex: `f_{s,max} = \\mu_s N = ${T(mus)} \\times ${T(N)} = ${T(fsMax)}\\ N` },
    { text: "Condition for sliding from rest:", tex: `\\tan\\theta = ${T(tanT)}\\ ${slides ? ">" : "\\le"}\\ \\mu_s = ${T(mus)}` }
  ];
  if (slides) {
    steps.push({ text: "The body slides, so the friction is kinetic and the acceleration is:", tex: `a = g(\\sin\\theta - \\mu_k\\cos\\theta) = ${T(a)}\\ m/s^2` });
  } else {
    steps.push({ text: "The body stays at rest, and the required static friction equals the parallel component:", tex: `f = F_\\parallel = ${T(Fp)}\\ N \\le f_{s,max} = ${T(fsMax)}\\ N` });
  }
  const results = [
    { label: "Weight W", value: `${fmt(W, 4)} N` },
    { label: "Component parallel to the plane", value: `${fmt(Fp, 4)} N` },
    { label: "Normal force N", value: `${fmt(N, 4)} N` },
    { label: "Maximum static friction μs·N", value: `${fmt(fsMax, 4)} N` },
    { label: "Does the body slide from rest?", value: slides ? "Yes" : "No" },
    { label: "Acceleration on the plane", value: `${fmt(a, 4)} m/s²` },
    { label: "Kinetic friction force μk·N", value: `${fmt(fk, 4)} N` },
    { label: slides ? "Friction force acting (kinetic)" : "Required static friction force", value: `${fmt(friction, 4)} N` },
    { label: "Critical angle atan(μs)", value: `${fmt(critical, 4)}°` }
  ];
  const copy = `Slides: ${slides ? "Yes" : "No"}, a = ${fmt(a, 4)} m/s², critical angle = ${fmt(critical, 4)}°`;
  const angles = Array.from({ length: 180 }, (_, i) => (i * 89.9) / 179);
  const pts = angles.map((d) => {
    const r = (d * Math.PI) / 180;
    return [d, Math.tan(r) > mus ? muk * m * g * Math.cos(r) : m * g * Math.sin(r)];
  });
  const blocks = [
    { type: "plot", title: "Friction force versus angle of inclination", xLabel: "θ (°)", yLabel: "f (N)", includeZero: true, series: [{ name: "f(θ)", points: pts }], vlines: [{ x: critical }] }
  ];
  return {
    results, steps, copy, blocks,
    values: { W, Fp, N, fsMax, slides, a, fk, critical, friction }
  };
}
