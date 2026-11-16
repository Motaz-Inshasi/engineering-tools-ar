import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "Hitung gerak harmonik sederhana pegas (frekuensi, periode, kecepatan dan percepatan maksimum, serta energi) dan bandul sederhana (periode dan frekuensi, dengan periode eksak untuk sudut besar), dengan grafik simpangan atau sudut untuk dua putaran.",
  keywords: ["gerak harmonik", "pegas", "bandul", "konstanta pegas", "amplitudo getaran", "periode", "frekuensi", "simple harmonic motion", "spring", "pendulum"],
  formulas: [
    { label: "Pegas", tex: "\\omega = \\sqrt{\\frac{k}{m}},\\quad T = \\frac{2\\pi}{\\omega},\\quad v_{max} = A\\omega,\\quad a_{max} = A\\omega^2,\\quad E = \\frac{1}{2}kA^2" },
    { label: "Bandul sederhana", tex: "T = 2\\pi\\sqrt{\\frac{L}{g}}\\quad (\\theta_0 \\text{ kecil}),\\qquad T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "Jenis sistem", type: "select", default: "spring", options: [["spring", "Pegas dan massa"], ["pendulum", "Bandul sederhana"]] },
    { id: "k", label: "Konstanta pegas k", unit: "N/m", type: "number", default: "200", when: { mode: ["spring"] } },
    { id: "ms", label: "Massa m", unit: "kg", type: "number", default: "0.5", when: { mode: ["spring"] } },
    { id: "A", label: "Amplitudo A", unit: "m", type: "number", default: "0.1", when: { mode: ["spring"] }, help: "Simpangan maksimum dari posisi setimbang." },
    { id: "L", label: "Panjang tali L", unit: "m", type: "number", default: "1", when: { mode: ["pendulum"] } },
    { id: "g", label: "Percepatan gravitasi g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pendulum"] } },
    { id: "th", label: "Sudut amplitudo θ0", unit: "°", type: "number", default: "5", when: { mode: ["pendulum"] }, help: "Sebaiknya kurang dari 15° agar hampiran sudut kecil akurat." }
  ],
  example: {
    values: { mode: "spring", k: "200", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" },
    expect: ["ω = 20 rad/s", "vmax = 2 m/s"],
    note: "Contoh: pegas dengan konstanta 200 N/m menahan massa 0.5 kg dengan amplitudo 0.1 m."
  },
  invalid: { values: { mode: "spring", k: "0", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" } },
  related: ["waves-doppler", "work-energy", "kinematics", "formulas-constants"]
};

function agm(a, b) {
  let x = a, y = b;
  for (let i = 0; i < 100 && Math.abs(x - y) > 1e-15 * x; i++) {
    const nx = (x + y) / 2;
    y = Math.sqrt(x * y);
    x = nx;
  }
  return x;
}

function samples(span, fn) {
  const N = 240;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = span * i / N;
    pts.push([t, fn(t)]);
  }
  return pts;
}

function spring(input) {
  const k = num(input, "k", "Konstanta pegas k", { positive: true });
  const m = num(input, "ms", "Massa m", { positive: true });
  const A = num(input, "A", "Amplitudo A", { nonNegative: true });
  const w = Math.sqrt(k / m);
  const f = w / (2 * Math.PI);
  const T = 1 / f;
  const vmax = A * w;
  const amax = A * w * w;
  const E = 0.5 * k * A * A;
  return {
    results: [
      { label: "Frekuensi sudut ω", value: `${fmt(w, 4)} rad/s` },
      { label: "Frekuensi f", value: `${fmt(f, 4)} Hz` },
      { label: "Periode T", value: `${fmt(T, 4)} s` },
      { label: "Kecepatan maksimum vmax", value: `${fmt(vmax, 4)} m/s` },
      { label: "Percepatan maksimum amax", value: `${fmt(amax, 4)} m/s²` },
      { label: "Energi total E", value: `${fmt(E, 4)} J` }
    ],
    steps: [
      { text: "Frekuensi sudut pegas:", tex: `\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{${ntex(k)}}{${ntex(m)}}} = ${ntex(w, 6)}\\ rad/s` },
      { text: "Frekuensi dan periode:", tex: `f = \\frac{\\omega}{2\\pi} = ${ntex(f, 6)}\\ Hz,\\qquad T = \\frac{1}{f} = ${ntex(T, 6)}\\ s` },
      { text: "Kecepatan maksimum:", tex: `v_{max} = A\\omega = ${ntex(A)} \\times ${ntex(w, 6)} = ${ntex(vmax, 6)}\\ m/s` },
      { text: "Percepatan maksimum:", tex: `a_{max} = A\\omega^2 = ${ntex(amax, 6)}\\ m/s^2` },
      { text: "Energi total:", tex: `E = \\frac{1}{2}kA^2 = ${ntex(E, 6)}\\ J` }
    ],
    blocks: [
      { type: "plot", title: "Simpangan x(t) selama dua putaran", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: samples(2 * T, (t) => A * Math.cos(w * t)), line: true }] }
    ],
    copy: `ω = ${fmt(w, 4)} rad/s, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s, vmax = ${fmt(vmax, 4)} m/s, amax = ${fmt(amax, 4)} m/s², E = ${fmt(E, 4)} J`
  };
}

function pendulum(input) {
  const L = num(input, "L", "Panjang tali L", { positive: true });
  const g = num(input, "g", "Percepatan gravitasi g", { positive: true });
  const th = num(input, "th", "Sudut amplitudo θ0", { positive: true, below: 180 });
  const T = 2 * Math.PI * Math.sqrt(L / g);
  const f = 1 / T;
  const w = 2 * Math.PI / T;
  const Tex = T / agm(1, Math.cos(th * DEG / 2));
  const blocks = [];
  if (th > 15) blocks.push({ type: "note", tone: "warn", text: "Sudut amplitudo lebih dari 15°, sehingga hampiran sudut kecil mengurangi periode sebenarnya; lihat periode eksak pada hasil." });
  blocks.push({ type: "plot", title: "Sudut θ(t) selama dua putaran (hampiran sudut kecil)", xLabel: "t (s)", yLabel: "θ (°)", includeZero: true, series: [{ name: "θ(t)", points: samples(2 * T, (t) => th * Math.cos(w * t)), line: true }] });
  return {
    results: [
      { label: "Periode dengan hampiran sudut kecil T", value: `${fmt(T, 4)} s` },
      { label: "Periode eksak", value: `${fmt(Tex, 4)} s` },
      { label: "Frekuensi f", value: `${fmt(f, 4)} Hz` },
      { label: "Frekuensi sudut ω", value: `${fmt(w, 4)} rad/s` }
    ],
    steps: [
      { text: "Periode dengan hampiran sudut kecil:", tex: `T = 2\\pi\\sqrt{\\frac{L}{g}} = 2\\pi\\sqrt{\\frac{${ntex(L)}}{${ntex(g)}}} = ${ntex(T, 6)}\\ s` },
      { text: "Frekuensi dan frekuensi sudut:", tex: `f = \\frac{1}{T} = ${ntex(f, 6)}\\ Hz,\\qquad \\omega = \\frac{2\\pi}{T} = ${ntex(w, 6)}\\ rad/s` },
      { text: "Periode eksak untuk sudut amplitudo:", tex: `T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)} = ${ntex(Tex, 6)}\\ s` }
    ],
    blocks,
    copy: `T = ${fmt(T, 4)} s, T_exact = ${fmt(Tex, 4)} s, f = ${fmt(f, 4)} Hz, ω = ${fmt(w, 4)} rad/s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Jenis sistem", ["spring", "pendulum"], "spring");
  return mode === "pendulum" ? pendulum(input) : spring(input);
}
