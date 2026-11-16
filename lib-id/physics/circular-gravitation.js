import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const G = 6.674e-11;

export const meta = {
  description: "Hitung gerak melingkar beraturan dari jari-jari dan kecepatan atau periode, gaya tarik antara dua benda, kecepatan orbit, periode putaran, kecepatan lepas, dan gravitasi pada ketinggian tertentu di atas permukaan planet.",
  keywords: ["gerak melingkar", "gaya sentripetal", "percepatan sentripetal", "gravitasi universal", "Newton", "orbit", "satelit buatan", "kecepatan lepas", "circular motion", "gravitation", "orbit"],
  formulas: [
    { label: "Gerak melingkar", tex: "a_c = \\frac{v^2}{r} = \\omega^2 r,\\qquad F_c = \\frac{m v^2}{r}" },
    { label: "Hukum gravitasi universal", tex: "F = G\\frac{m_1 m_2}{r^2},\\qquad G = 6.674\\times10^{-11}\\ \\frac{N\\,m^2}{kg^2}" },
    { label: "Orbit lingkaran", tex: "v = \\sqrt{\\frac{GM}{r}},\\quad T = \\frac{2\\pi r}{v},\\quad v_{esc} = \\sqrt{\\frac{2GM}{r}},\\quad g = \\frac{GM}{r^2}" }
  ],
  inputs: [
    { id: "mode", label: "Jenis perhitungan", type: "select", default: "circular", options: [["circular", "Gerak melingkar beraturan"], ["gravity", "Gaya tarik antara dua benda"], ["orbit", "Orbit dan satelit"]] },
    { id: "speedBy", label: "Besaran yang diberikan bersama jari-jari", type: "select", default: "v", options: [["v", "Kecepatan linear v"], ["T", "Periode T"]], when: { mode: ["circular"] } },
    { id: "rc", label: "Jari-jari r", unit: "m", type: "number", default: "2", when: { mode: ["circular"] } },
    { id: "vc", label: "Kecepatan linear v", unit: "m/s", type: "number", default: "3", when: { mode: ["circular"], speedBy: ["v"] } },
    { id: "Tc", label: "Periode T", unit: "s", type: "number", default: "4.19", when: { mode: ["circular"], speedBy: ["T"] } },
    { id: "mc", label: "Massa m", unit: "kg", type: "number", default: "0.5", when: { mode: ["circular"] } },
    { id: "m1", label: "Massa pertama m1", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["gravity"] }, help: "Secara default massa Bumi." },
    { id: "m2", label: "Massa kedua m2", unit: "kg", type: "number", default: "7.348e22", when: { mode: ["gravity"] }, help: "Secara default massa Bulan." },
    { id: "rg", label: "Jarak antara pusat r", unit: "m", type: "number", default: "3.844e8", when: { mode: ["gravity"] }, help: "Secara default jarak antara pusat Bumi dan Bulan." },
    { id: "M", label: "Massa benda pusat M", unit: "kg", type: "number", default: "5.972e24", when: { mode: ["orbit"] }, help: "Secara default massa Bumi." },
    { id: "R", label: "Jari-jari benda R", unit: "m", type: "number", default: "6.371e6", when: { mode: ["orbit"] }, help: "Secara default jari-jari Bumi." },
    { id: "orbBy", label: "Besaran yang diberikan untuk orbit", type: "select", default: "h", options: [["h", "Ketinggian di atas permukaan h"], ["r", "Jari-jari dari pusat r"]], when: { mode: ["orbit"] } },
    { id: "ro", label: "Jari-jari dari pusat r", unit: "m", type: "number", default: "6.771e6", when: { mode: ["orbit"], orbBy: ["r"] } },
    { id: "ho", label: "Ketinggian di atas permukaan h", unit: "m", type: "number", default: "400k", when: { mode: ["orbit"], orbBy: ["h"] }, help: "Contoh: ketinggian Stasiun Luar Angkasa Internasional sekitar 400 km." }
  ],
  example: {
    values: { mode: "circular", speedBy: "v", rc: "2", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" },
    expect: ["Fc = 2.25 N", "ac = 4.5 m/s²"],
    note: "Contoh: benda bermassa 0.5 kg berputar pada jari-jari 2 m dengan kecepatan 3 m/s."
  },
  invalid: { values: { mode: "circular", speedBy: "v", rc: "0", vc: "3", Tc: "", mc: "0.5", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8", M: "5.972e24", R: "6.371e6", orbBy: "h", ro: "6.771e6", ho: "400k" } },
  related: ["kinematics", "projectile-motion", "work-energy", "formulas-constants"]
};

function circular(input) {
  const speedBy = choice(input, "speedBy", "Diberikan", ["v", "T"], "v");
  const r = num(input, "rc", "Jari-jari r", { positive: true });
  const m = num(input, "mc", "Massa m", { positive: true });
  const steps = [];
  let v, T;
  if (speedBy === "v") {
    v = num(input, "vc", "Kecepatan linear v", { positive: true });
    T = 2 * Math.PI * r / v;
    steps.push({ text: "Periode dari kecepatan linear:", tex: `T = \\frac{2\\pi r}{v} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(v)}} = ${ntex(T, 6)}\\ s` });
  } else {
    T = num(input, "Tc", "Periode T", { positive: true });
    v = 2 * Math.PI * r / T;
    steps.push({ text: "Kecepatan linear dari periode:", tex: `v = \\frac{2\\pi r}{T} = \\frac{2\\pi \\times ${ntex(r)}}{${ntex(T)}} = ${ntex(v, 6)}\\ m/s` });
  }
  const w = v / r;
  const f = 1 / T;
  const ac = v * v / r;
  const Fc = m * ac;
  steps.push({ text: "Kecepatan sudut:", tex: `\\omega = \\frac{v}{r} = ${ntex(w, 6)}\\ rad/s` });
  steps.push({ text: "Percepatan sentripetal:", tex: `a_c = \\frac{v^2}{r} = ${ntex(ac, 6)}\\ m/s^2` });
  steps.push({ text: "Gaya sentripetal:", tex: `F_c = m\\,a_c = ${ntex(m)} \\times ${ntex(ac, 6)} = ${ntex(Fc, 6)}\\ N` });
  return {
    results: [
      { label: "Kecepatan sudut ω", value: `${fmt(w, 4)} rad/s` },
      { label: "Percepatan sentripetal a_c", value: `${fmt(ac, 4)} m/s²` },
      { label: "Gaya sentripetal F_c", value: `${fmt(Fc, 4)} N` },
      { label: "Kecepatan linear v", value: `${fmt(v, 4)} m/s` },
      { label: "Frekuensi f", value: `${fmt(f, 4)} Hz` },
      { label: "Periode T", value: `${fmt(T, 4)} s` }
    ],
    steps,
    copy: `ω = ${fmt(w, 4)} rad/s, ac = ${fmt(ac, 4)} m/s², Fc = ${fmt(Fc, 4)} N, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s`
  };
}

function gravity(input) {
  const m1 = num(input, "m1", "Massa pertama m1", { positive: true });
  const m2 = num(input, "m2", "Massa kedua m2", { positive: true });
  const r = num(input, "rg", "Jarak antara pusat r", { positive: true });
  const F = G * m1 * m2 / (r * r);
  return {
    results: [{ label: "Gaya tarik-menarik timbal balik F", value: `${fmt(F, 4)} N` }],
    steps: [
      { text: "Hukum gravitasi universal Newton:", tex: `F = G\\frac{m_1 m_2}{r^2} = 6.674\\times10^{-11} \\times \\frac{${ntex(m1)} \\times ${ntex(m2)}}{(${ntex(r)})^2} = ${ntex(F, 6)}\\ N` }
    ],
    copy: `F = ${fmt(F, 4)} N`
  };
}

function orbit(input) {
  const M = num(input, "M", "Massa benda pusat M", { positive: true });
  const R = num(input, "R", "Jari-jari benda R", { positive: true });
  const orbBy = choice(input, "orbBy", "Diberikan", ["h", "r"], "h");
  const steps = [];
  let r;
  if (orbBy === "h") {
    const h = num(input, "ho", "Tinggi h", { nonNegative: true });
    r = R + h;
    steps.push({ text: "Jari-jari dari pusat benda:", tex: `r = R + h = ${ntex(R)} + ${ntex(h)} = ${ntex(r, 6)}\\ m` });
  } else {
    r = num(input, "ro", "Jari-jari dari pusat r", { positive: true });
    if (r < R) fail("Jari-jari orbit lebih kecil dari jari-jari benda, sehingga orbit berada di dalamnya.", "ro");
  }
  const GM = G * M;
  const v = Math.sqrt(GM / r);
  const T = 2 * Math.PI * r / v;
  const vEsc = Math.sqrt(2 * GM / r);
  const g = GM / (r * r);
  steps.push({ text: "Kecepatan orbit lingkaran:", tex: `v = \\sqrt{\\frac{GM}{r}} = \\sqrt{\\frac{6.674\\times10^{-11} \\times ${ntex(M)}}{${ntex(r)}}} = ${ntex(v, 6)}\\ m/s` });
  steps.push({ text: "Periode orbit:", tex: `T = \\frac{2\\pi r}{v} = ${ntex(T, 6)}\\ s` });
  steps.push({ text: "Kecepatan lepas:", tex: `v_{esc} = \\sqrt{2}\\,v = ${ntex(vEsc, 6)}\\ m/s` });
  steps.push({ text: "Gravitasi lokal pada orbit ini:", tex: `g = \\frac{GM}{r^2} = ${ntex(g, 6)}\\ m/s^2` });
  return {
    results: [
      { label: "Jari-jari dari pusat r", value: `${fmt(r, 4)} m` },
      { label: "Kecepatan orbit v", value: `${fmt(v, 4)} m/s` },
      { label: "Periode T", value: `${fmt(T, 4)} s` },
      { label: "Periode dalam menit", value: `${fmt(T / 60, 4)} min` },
      { label: "kecepatan lepas", value: `${fmt(vEsc, 4)} m/s` },
      { label: "Gravitasi lokal g", value: `${fmt(g, 4)} m/s²` }
    ],
    steps,
    copy: `v = ${fmt(v, 4)} m/s, T = ${fmt(T / 60, 4)} min, v_esc = ${fmt(vEsc, 4)} m/s, g = ${fmt(g, 4)} m/s²`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", ["circular", "gravity", "orbit"], "circular");
  if (mode === "gravity") return gravity(input);
  if (mode === "orbit") return orbit(input);
  return circular(input);
}
