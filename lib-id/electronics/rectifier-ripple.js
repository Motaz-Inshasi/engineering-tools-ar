import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const TYPES = [["half", "Setengah gelombang"], ["center", "Gelombang penuh dengan trafo center-tap"], ["bridge", "Gelombang penuh dengan jembatan"]];

export const meta = {
  description: "Penyearah dengan kapasitor penghalus: tegangan puncak, tegangan DC, tegangan riak, faktor riak, dan tegangan balik maksimum pada dioda, untuk penyearah setengah gelombang, gelombang penuh, atau jembatan.",
  keywords: ["penyearah", "penyearahan", "rectifier", "riak", "ripple", "jembatan", "bridge", "kapasitor penghalus", "PIV", "dioda"],
  formulas: [
    { label: "Tegangan riak (perkiraan pengosongan linear)", tex: "V_{r(pp)} \\approx \\frac{I_{L}}{f_r C},\\quad f_r = f\\ \\text{(half)},\\; 2f\\ \\text{(full)}" },
    { label: "Tegangan DC", tex: "V_{DC} \\approx V_p - \\frac{V_{r(pp)}}{2},\\qquad V_p = \\sqrt{2}V_{rms} - n_D V_D" }
  ],
  inputs: [
    { id: "type", label: "Jenis penyearah", type: "select", default: "bridge", options: TYPES },
    { id: "Vrms", label: "Tegangan sekunder (RMS)", unit: "V", type: "number", default: "12", help: "Untuk trafo center-tap: tegangan setengah lilitan." },
    { id: "f", label: "Frekuensi jaringan", unit: "Hz", type: "number", default: "50" },
    { id: "C", label: "Kapasitor penghalus", unit: "F", type: "number", default: "2200u" },
    { id: "RL", label: "Resistansi beban", unit: "Ω", type: "number", default: "100" },
    { id: "Vd", label: "Tegangan jatuh pada dioda", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { type: "bridge", Vrms: "12", f: "50", C: "2200u", RL: "100", Vd: "0.7" }, expect: ["Vp = 15.57 V"], note: "Contoh: jembatan dari trafo 12 V dengan kapasitor 2200 µF dan beban 100 Ω." },
  invalid: { values: { type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" } },
  related: ["transformer", "zener-regulator", "voltage-regulator", "fourier-series"]
};

export function solve(input) {
  const type = choice(input, "type", "Jenis", TYPES.map((t) => t[0]), "bridge");
  const Vrms = num(input, "Vrms", "Tegangan", { positive: true });
  const f = num(input, "f", "Frekuensi", { positive: true });
  const C = num(input, "C", "Kapasitor", { positive: true });
  const RL = num(input, "RL", "Beban", { positive: true });
  const Vd = num(input, "Vd", "Jatuh tegangan dioda", { nonNegative: true, max: 5 });
  const nD = type === "bridge" ? 2 : 1;
  const fr = type === "half" ? f : 2 * f;
  const Vm = Math.SQRT2 * Vrms;
  const Vp = Vm - nD * Vd;
  if (Vp <= 0) fail("Tegangan puncak lebih kecil dari jatuh tegangan dioda, sehingga tidak ada keluaran.", "Vrms");
  let Vr = Vp / (fr * RL * C);
  const clipped = Vr > Vp;
  if (clipped) Vr = Vp;
  const Vdc = Vp - Vr / 2, IL = Vdc / RL;
  const PIV = type === "bridge" ? Vm - Vd : type === "center" ? 2 * Vm - Vd : Vm;
  const rf = Vr / (2 * Math.sqrt(3)) / Vdc;
  const steps = [
    { text: "Tegangan puncak sekunder, lalu setelah dikurangi jatuh tegangan dioda yang menghantar:", tex: `V_m = \\sqrt{2} \\times ${ntex(Vrms)} = ${ntex(Vm, 5)}\\ V,\\quad V_p = V_m - ${nD} \\times ${ntex(Vd)} = ${ntex(Vp, 5)}\\ V` },
    `Frekuensi riak ${fmt(fr)} Hz karena ${type === "half" ? "penyearah setengah gelombang mengisi kapasitor sekali setiap siklus" : "penyearah gelombang penuh mengisi kapasitor dua kali setiap siklus"}.`,
    { text: "Kapasitor mengosongkan muatannya ke beban di antara pulsa pengisian, sehingga tegangan riak puncak-ke-puncak:", tex: `V_r \\approx \\frac{V_p}{f_r R_L C} = \\frac{${ntex(Vp, 5)}}{${ntex(fr)} \\times ${ntex(RL)} \\times ${ntex(C)}} = ${ntex(Vr, 5)}\\ V` },
    { text: "Rata-rata tegangan DC dan arus:", tex: `V_{DC} \\approx V_p - \\frac{V_r}{2} = ${ntex(Vdc, 5)}\\ V,\\quad I_L = ${ntex(IL, 5)}\\ A` },
    { text: "Tegangan balik maksimum yang ditahan setiap dioda:", tex: `PIV = ${ntex(PIV, 5)}\\ V` }
  ];
  if (clipped) steps.push("Peringatan: kapasitor terlalu kecil untuk beban, sehingga riak lebih besar dari tegangan itu sendiri dan pendekatan tidak berlaku. Perbesar kapasitansinya.");
  else if (Vr / Vp > 0.2) steps.push("Riak besar (lebih dari 20%), dan pendekatan linear kurang akurat di sini; sebaiknya perbesar kapasitansinya.");
  const T = 1 / f, pts = [];
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600;
    const s = Math.sin(2 * Math.PI * f * t);
    const rect = Math.max(0, (type === "half" ? s : Math.abs(s)) * Vm - nD * Vd);
    pts.push([t, rect]);
  }
  const out = [];
  let v = Vp;
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600, dt = (3 * T) / 600;
    v = v * Math.exp(-dt / (RL * C));
    v = Math.max(v, pts[i][1]);
    out.push([t, v]);
  }
  return {
    results: [
      { label: "Tegangan puncak setelah dioda", value: eng(Vp, "V", 4), text: `Vp = ${eng(Vp, "V", 4)}` },
      { label: "Tegangan riak (puncak-ke-puncak)", value: eng(Vr, "V", 4) },
      { label: "Perkiraan tegangan DC", value: eng(Vdc, "V", 4) },
      { label: "Arus beban", value: eng(IL, "A", 4) },
      { label: "Faktor riak", value: `${fmt(100 * rf, 3)}%` },
      { label: "Tegangan balik maksimum PIV", value: eng(PIV, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "Tegangan hasil penyearahan dan tegangan kapasitor (simulasi)", xLabel: "t (s)", yLabel: "V", includeZero: true, series: [{ name: "Setelah penyearahan", points: pts, dashed: true }, { name: "Tegangan beban", points: out }] }],
    steps, copy: `Vp = ${eng(Vp, "V", 4)}, Vr = ${eng(Vr, "V", 4)}, Vdc = ${eng(Vdc, "V", 4)}, PIV = ${eng(PIV, "V", 4)}`
  };
}
