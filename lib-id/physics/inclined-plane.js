import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "Analisis benda pada bidang miring dengan gesekan: berat dan komponennya, gaya normal, gesekan statis maksimum, apakah benda meluncur dari keadaan diam, percepatan meluncur, dan sudut kritis, dengan grafik gaya gesek.",
  keywords: ["bidang miring", "gesekan", "inclined plane", "friction", "sudut kritis", "koefisien gesekan", "meluncur"],
  formulas: [
    { label: "Komponen berat", tex: "W = mg,\\qquad F_\\parallel = mg\\sin\\theta,\\qquad N = mg\\cos\\theta" },
    { label: "Syarat meluncur dari keadaan diam", tex: "\\tan\\theta > \\mu_s \\quad\\Leftrightarrow\\quad mg\\sin\\theta > \\mu_s N" },
    { label: "Percepatan meluncur", tex: "a = g(\\sin\\theta - \\mu_k\\cos\\theta)" }
  ],
  inputs: [
    { id: "m", label: "Massa m", unit: "kg", type: "number", default: "10" },
    { id: "theta", label: "Sudut kemiringan θ", unit: "°", type: "number", default: "30", help: "Dari 0 hingga 89.9 derajat." },
    { id: "mu_s", label: "Koefisien gesekan statis μs", type: "number", default: "0.5" },
    { id: "mu_k", label: "Koefisien gesekan kinetis μk", type: "number", default: "0.3", help: "μk harus lebih kecil atau sama dengan μs." },
    { id: "g", label: "Percepatan gravitasi g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { m: "10", theta: "30", mu_s: "0.5", mu_k: "0.3", g: "9.81" }, expect: ["Meluncur: ya", "a = 2.356 m/s²"], note: "Contoh: kotak 10 kg pada bidang miring 30 derajat." },
  invalid: { values: { m: "10", theta: "30", mu_s: "0.3", mu_k: "0.5", g: "9.81" } },
  related: ["kinematics", "work-energy", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const m = num(input, "m", "Massa", { positive: true });
  const theta = num(input, "theta", "Sudut kemiringan", { min: 0, max: 89.9 });
  const mus = num(input, "mu_s", "Koefisien gesekan statis", { nonNegative: true });
  const muk = num(input, "mu_k", "Koefisien gesekan kinetis", { nonNegative: true });
  if (muk > mus) fail("Koefisien gesekan kinetis μk tidak boleh melebihi statis μs.", "mu_k");
  const g = num(input, "g", "Percepatan gravitasi", { positive: true });
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
    { text: "Berat:", tex: `W = mg = ${T(m)} \\times ${T(g)} = ${T(W)}\\ N` },
    { text: "Komponen sejajar bidang dan gaya normal:", tex: `F_\\parallel = W\\sin\\theta = ${T(Fp)}\\ N,\\qquad N = W\\cos\\theta = ${T(N)}\\ N` },
    { text: "Gesekan statis maksimum:", tex: `f_{s,max} = \\mu_s N = ${T(mus)} \\times ${T(N)} = ${T(fsMax)}\\ N` },
    { text: "Syarat meluncur dari keadaan diam:", tex: `\\tan\\theta = ${T(tanT)}\\ ${slides ? ">" : "\\le"}\\ \\mu_s = ${T(mus)}` }
  ];
  if (slides) {
    steps.push({ text: "Benda meluncur, sehingga gaya gesek adalah gesekan kinetis dan percepatannya:", tex: `a = g(\\sin\\theta - \\mu_k\\cos\\theta) = ${T(a)}\\ m/s^2` });
  } else {
    steps.push({ text: "Benda tetap diam, dan gesekan statis yang diperlukan sama dengan komponen sejajar:", tex: `f = F_\\parallel = ${T(Fp)}\\ N \\le f_{s,max} = ${T(fsMax)}\\ N` });
  }
  const results = [
    { label: "Berat W", value: `${fmt(W, 4)} N` },
    { label: "Komponen sejajar bidang", value: `${fmt(Fp, 4)} N` },
    { label: "Gaya normal N", value: `${fmt(N, 4)} N` },
    { label: "Gesekan statis maksimum μs·N", value: `${fmt(fsMax, 4)} N` },
    { label: "Apakah benda meluncur dari keadaan diam?", value: slides ? "Ya" : "Tidak" },
    { label: "Percepatan pada bidang", value: `${fmt(a, 4)} m/s²` },
    { label: "Gaya gesek kinetis μk·N", value: `${fmt(fk, 4)} N` },
    { label: slides ? "Gaya gesek yang bekerja (kinetis)" : "Gaya gesek statis yang diperlukan", value: `${fmt(friction, 4)} N` },
    { label: "Sudut kritis atan(μs)", value: `${fmt(critical, 4)}°` }
  ];
  const copy = `Meluncur: ${slides ? "Ya" : "Tidak"}, a = ${fmt(a, 4)} m/s², sudut kritis = ${fmt(critical, 4)}°`;
  const angles = Array.from({ length: 180 }, (_, i) => (i * 89.9) / 179);
  const pts = angles.map((d) => {
    const r = (d * Math.PI) / 180;
    return [d, Math.tan(r) > mus ? muk * m * g * Math.cos(r) : m * g * Math.sin(r)];
  });
  const blocks = [
    { type: "plot", title: "Gaya gesek terhadap sudut kemiringan", xLabel: "θ (°)", yLabel: "f (N)", includeZero: true, series: [{ name: "f(θ)", points: pts }], vlines: [{ x: critical }] }
  ];
  return {
    results, steps, copy, blocks,
    values: { W, Fp, N, fsMax, slides, a, fk, critical, friction }
  };
}
