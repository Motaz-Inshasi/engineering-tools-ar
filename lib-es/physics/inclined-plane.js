import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "Análisis de un cuerpo sobre un plano inclinado con fricción: peso y sus componentes, fuerza normal, fricción estática máxima, si desliza desde el reposo, aceleración de deslizamiento y ángulo crítico, con la gráfica de la fuerza de fricción.",
  keywords: ["Plano inclinado", "Fricción", "inclined plane", "friction", "Ángulo crítico", "Coeficiente de fricción", "Deslizamiento"],
  formulas: [
    { label: "Componentes del peso", tex: "W = mg,\\qquad F_\\parallel = mg\\sin\\theta,\\qquad N = mg\\cos\\theta" },
    { label: "Condición de deslizamiento desde el reposo", tex: "\\tan\\theta > \\mu_s \\quad\\Leftrightarrow\\quad mg\\sin\\theta > \\mu_s N" },
    { label: "Aceleración de deslizamiento", tex: "a = g(\\sin\\theta - \\mu_k\\cos\\theta)" }
  ],
  inputs: [
    { id: "m", label: "Masa m", unit: "kg", type: "number", default: "10" },
    { id: "theta", label: "Ángulo de inclinación θ", unit: "°", type: "number", default: "30", help: "De 0 a 89.9 grados." },
    { id: "mu_s", label: "Coeficiente de fricción estática μs", type: "number", default: "0.5" },
    { id: "mu_k", label: "Coeficiente de fricción cinética μk", type: "number", default: "0.3", help: "μk debe ser menor o igual que μs." },
    { id: "g", label: "Gravedad g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { m: "10", theta: "30", mu_s: "0.5", mu_k: "0.3", g: "9.81" }, expect: ["Desliza: sí", "a = 2.356 m/s²"], note: "Ejemplo: caja de 10 kg en un plano inclinado de 30 grados." },
  invalid: { values: { m: "10", theta: "30", mu_s: "0.3", mu_k: "0.5", g: "9.81" } },
  related: ["kinematics", "work-energy", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const m = num(input, "m", "Masa", { positive: true });
  const theta = num(input, "theta", "Ángulo de inclinación", { min: 0, max: 89.9 });
  const mus = num(input, "mu_s", "Coeficiente de fricción estática", { nonNegative: true });
  const muk = num(input, "mu_k", "Coeficiente de fricción cinética", { nonNegative: true });
  if (muk > mus) fail("El coeficiente de fricción cinética μk no puede superar al estático μs.", "mu_k");
  const g = num(input, "g", "Gravedad", { positive: true });
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
    { text: "Peso:", tex: `W = mg = ${T(m)} \\times ${T(g)} = ${T(W)}\\ N` },
    { text: "Componente paralela al plano y fuerza normal:", tex: `F_\\parallel = W\\sin\\theta = ${T(Fp)}\\ N,\\qquad N = W\\cos\\theta = ${T(N)}\\ N` },
    { text: "Fricción estática máxima:", tex: `f_{s,max} = \\mu_s N = ${T(mus)} \\times ${T(N)} = ${T(fsMax)}\\ N` },
    { text: "Condición de deslizamiento desde el reposo:", tex: `\\tan\\theta = ${T(tanT)}\\ ${slides ? ">" : "\\le"}\\ \\mu_s = ${T(mus)}` }
  ];
  if (slides) {
    steps.push({ text: "El cuerpo desliza, así que la fricción es cinética y la aceleración es:", tex: `a = g(\\sin\\theta - \\mu_k\\cos\\theta) = ${T(a)}\\ m/s^2` });
  } else {
    steps.push({ text: "El cuerpo permanece en reposo, y la fricción estática requerida es igual a la componente paralela:", tex: `f = F_\\parallel = ${T(Fp)}\\ N \\le f_{s,max} = ${T(fsMax)}\\ N` });
  }
  const results = [
    { label: "Peso W", value: `${fmt(W, 4)} N` },
    { label: "Componente paralela al plano", value: `${fmt(Fp, 4)} N` },
    { label: "Fuerza normal N", value: `${fmt(N, 4)} N` },
    { label: "Fricción estática máxima μs·N", value: `${fmt(fsMax, 4)} N` },
    { label: "¿Desliza el cuerpo desde el reposo?", value: slides ? "Sí" : "No" },
    { label: "Aceleración sobre el plano", value: `${fmt(a, 4)} m/s²` },
    { label: "Fuerza de fricción cinética μk·N", value: `${fmt(fk, 4)} N` },
    { label: slides ? "Fuerza de fricción activa (cinética)" : "Fuerza de fricción estática requerida", value: `${fmt(friction, 4)} N` },
    { label: "Ángulo crítico atan(μs)", value: `${fmt(critical, 4)}°` }
  ];
  const copy = `Desliza: ${slides ? "Sí" : "No"}, a = ${fmt(a, 4)} m/s², ángulo crítico = ${fmt(critical, 4)}°`;
  const angles = Array.from({ length: 180 }, (_, i) => (i * 89.9) / 179);
  const pts = angles.map((d) => {
    const r = (d * Math.PI) / 180;
    return [d, Math.tan(r) > mus ? muk * m * g * Math.cos(r) : m * g * Math.sin(r)];
  });
  const blocks = [
    { type: "plot", title: "Fricción frente al ángulo de inclinación", xLabel: "θ (°)", yLabel: "f (N)", includeZero: true, series: [{ name: "f(θ)", points: pts }], vlines: [{ x: critical }] }
  ];
  return {
    results, steps, copy, blocks,
    values: { W, Fp, N, fsMax, slides, a, fk, critical, friction }
  };
}
