import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Timer 555 dalam mode astabil (osilator) dan monostabil (satu kestabilan): frekuensi, duty cycle, waktu naik dan turun, serta lebar pulsa, dengan bentuk keluaran.",
  keywords: ["555", "timer 555", "timer", "astable", "monostable", "osilator", "pulsa", "duty cycle", "duty cycle"],
  formulas: [
    { label: "Osilator astabil", tex: "t_H = \\ln 2\\,(R_1 + R_2)C,\\quad t_L = \\ln 2\\,R_2 C,\\quad f = \\frac{1}{t_H + t_L} \\approx \\frac{1.44}{(R_1 + 2R_2)C}" },
    { label: "Monostabil", tex: "t = \\ln 3\\,RC \\approx 1.1\\,RC" }
  ],
  inputs: [
    { id: "mode", label: "Mode", type: "select", default: "astable", options: [["astable", "Astabil (osilator)"], ["mono", "Monostabil (satu pulsa)"]] },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k", when: { mode: ["astable"] } },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "10k", when: { mode: ["astable"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "100k", when: { mode: ["mono"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { mode: "astable", R1: "1k", R2: "10k", C: "100n" }, expect: ["f = 687 Hz", "52.38%"], note: "Contoh: R1 = 1 kΩ, R2 = 10 kΩ, dan C = 100 nF." },
  invalid: { values: { mode: "astable", R1: "1k", R2: "0", C: "100n" } },
  related: ["rc-rl-transient", "pwm-servo", "capacitor-inductor-combination"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Mode", ["astable", "mono"], "astable");
  const C = num(input, "C", "C", { positive: true });
  const L2 = Math.LN2, L3 = Math.log(3);
  if (mode === "mono") {
    const R = num(input, "R", "R", { positive: true });
    const t = L3 * R * C;
    return {
      results: [{ label: "Lebar pulsa", value: eng(t, "s", 4), text: `t = ${eng(t, "s", 4)}` }],
      steps: [
        "Saat pulsa pemicu, keluaran naik dan kapasitor mengisi melalui R hingga mencapai 2/3 tegangan catu, lalu keluaran turun.",
        { text: "Waktu pengisian dari 0 hingga ⅔Vcc:", tex: `t = RC\\ln 3 = ${ntex(R)} \\times ${ntex(C)} \\times 1.0986 = ${ntex(t, 5)}\\ s` },
        "Hasilnya tidak bergantung pada tegangan catu karena kedua ambang pembanding merupakan persentase darinya."
      ],
      copy: `t = ${eng(t, "s", 4)}`
    };
  }
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
  if (R1 < 1) fail("R1 terlalu kecil dan dapat merusak pin pengosongan (sebaiknya minimal 1 kΩ).", "R1");
  const tH = L2 * (R1 + R2) * C, tL = L2 * R2 * C, T = tH + tL, f = 1 / T, D = tH / T;
  const steps = [
    "Tegangan kapasitor berayun antara ⅓Vcc dan ⅔Vcc: mengisi melalui R1 + R2 (keluaran tinggi) dan mengosongkan melalui R2 saja (keluaran rendah).",
    { text: "Waktu naik dan turun:", tex: `t_H = \\ln 2 (${ntex(R1)} + ${ntex(R2)})(${ntex(C)}) = ${ntex(tH, 5)}\\ s,\\quad t_L = \\ln 2 \\cdot ${ntex(R2)} \\cdot ${ntex(C)} = ${ntex(tL, 5)}\\ s` },
    { text: "Frekuensi dan duty cycle:", tex: `f = \\frac{1}{t_H + t_L} = ${ntex(f, 5)}\\ Hz,\\quad D = \\frac{t_H}{t_H + t_L} = ${ntex(100 * D, 4)}\\%` },
    "Duty cycle pada rangkaian ini selalu lebih besar dari 50%; untuk mendapatkan yang lebih kecil, dipasang dioda paralel dengan R2."
  ];
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    pts.push([t0, 0], [t0, 1], [t0 + tH, 1], [t0 + tH, 0], [t0 + T, 0]);
  }
  return {
    results: [
      { label: "Frekuensi", value: eng(f, "Hz", 4), text: `f = ${eng(f, "Hz", 4)}` },
      { label: "duty cycle", value: `${fmt(100 * D, 4)}%`, text: `D = ${fmt(100 * D, 4)}%` },
      { label: "Waktu naik tH", value: eng(tH, "s", 4) },
      { label: "Waktu turun tL", value: eng(tL, "s", 4) },
      { label: "Periode T", value: eng(T, "s", 4) }
    ],
    blocks: [{ type: "plot", title: "Bentuk keluaran (tiga siklus)", xLabel: "t (s)", yLabel: "Keluaran", yMin: -0.2, yMax: 1.3, series: [{ name: "Keluaran", points: pts }] }],
    steps, copy: `f = ${eng(f, "Hz", 4)}, D = ${fmt(100 * D, 4)}%, tH = ${eng(tH, "s", 4)}, tL = ${eng(tL, "s", 4)}`
  };
}
