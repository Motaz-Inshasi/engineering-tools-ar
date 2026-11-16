import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Daya kompleks pada rangkaian AC: daya aktif, daya reaktif, dan daya semu, faktor daya, segitiga daya, serta perhitungan kapasitor koreksi untuk faktor daya target apa pun.",
  keywords: ["Daya kompleks", "Faktor daya", "power factor", "Koreksi faktor daya", "Segitiga daya", "Daya aktif", "Daya reaktif", "kVAR", "Kapasitor koreksi"],
  formulas: [
    { label: "Segitiga daya", tex: "S = V I^* = P + jQ,\\quad P = VI\\cos\\theta,\\quad Q = VI\\sin\\theta,\\quad |S|^2 = P^2 + Q^2" },
    { label: "Kapasitor koreksi", tex: "Q_C = P(\\tan\\theta_1 - \\tan\\theta_2),\\qquad C = \\frac{Q_C}{\\omega V^2}" }
  ],
  inputs: [
    { id: "mode", label: "Data masukan", type: "select", default: "ppf", options: [["ppf", "Daya aktif dan faktor daya"], ["vi", "Tegangan, arus, dan sudut fasa"]] },
    { id: "V", label: "Tegangan (RMS)", unit: "V", type: "number", default: "400" },
    { id: "P", label: "Daya aktif P", unit: "W", type: "number", default: "50k", when: { mode: ["ppf"] } },
    { id: "pf", label: "Faktor daya saat ini", type: "number", default: "0.7", when: { mode: ["ppf"] } },
    { id: "I", label: "Arus (RMS)", unit: "A", type: "number", default: "10", when: { mode: ["vi"] } },
    { id: "theta", label: "Sudut θ = θv − θi", unit: "°", type: "number", default: "36.87", when: { mode: ["vi"] }, help: "Positif untuk beban induktif (arus tertinggal)." },
    { id: "nature", label: "Jenis beban", type: "select", default: "lag", options: [["lag", "Induktif (tertinggal)"], ["lead", "Kapasitif (mendahului)"]], when: { mode: ["ppf"] } },
    { id: "target", label: "Faktor daya target (opsional)", type: "number", default: "0.95" },
    { id: "f", label: "Frekuensi jaringan", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { mode: "ppf", V: "400", P: "50k", pf: "0.7", nature: "lag", target: "0.95", f: "50" }, expect: ["Qc = 34.58 kVAR"], note: "Contoh: beban 50 kW dengan faktor daya 0.7 tertinggal, dikoreksi menjadi 0.95." },
  invalid: { values: { mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" } },
  related: ["rlc-circuit", "three-phase", "phasor", "transformer"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Data masukan", ["ppf", "vi"], "ppf");
  const V = num(input, "V", "Tegangan", { positive: true });
  let P, Q, th;
  const steps = [];
  if (mode === "ppf") {
    P = num(input, "P", "Daya aktif", { positive: true });
    const pf = num(input, "pf", "Faktor daya", { positive: true, max: 1 });
    const lag = choice(input, "nature", "Jenis beban", ["lag", "lead"], "lag") === "lag";
    th = (lag ? 1 : -1) * Math.acos(pf);
    Q = P * Math.tan(th);
    steps.push({ text: "Sudut daya dari faktor daya:", tex: `\\theta = ${lag ? "" : "-"}\\cos^{-1}(${ntex(pf)}) = ${ntex((th * 180) / Math.PI, 5)}^\\circ` });
    steps.push({ text: "Daya reaktif dan daya semu:", tex: `Q = P\\tan\\theta = ${ntex(Q, 6)}\\ VAR,\\quad |S| = \\frac{P}{PF} = ${ntex(P / pf, 6)}\\ VA` });
  } else {
    const I = num(input, "I", "Arus", { positive: true });
    const deg = num(input, "theta", "Sudut", { min: -90, max: 90 });
    th = (deg * Math.PI) / 180;
    P = V * I * Math.cos(th);
    Q = V * I * Math.sin(th);
    steps.push({ text: "Dari tegangan, arus, dan sudut:", tex: `P = VI\\cos\\theta = ${ntex(P, 6)}\\ W,\\quad Q = VI\\sin\\theta = ${ntex(Q, 6)}\\ VAR` });
  }
  const S = Math.hypot(P, Q), pf = P / S, I = S / V;
  const nature = Math.abs(Q) < 1e-12 * S ? "Resistif" : Q > 0 ? "Induktif (tertinggal)" : "Kapasitif (mendahului)";
  const results = [
    { label: "Daya aktif P", value: eng(P, "W", 5) },
    { label: "Daya reaktif Q", value: eng(Q, "VAR", 5) },
    { label: "Daya semu |S|", value: eng(S, "VA", 5) },
    { label: "Faktor daya", value: `${fmt(pf, 5)} ${nature}` },
    { label: "Arus", value: eng(I, "A", 5) }
  ];
  const target = num(input, "target", "Faktor daya target", { optional: true, positive: true, max: 1 });
  let copy = `P = ${eng(P, "W", 5)}, Q = ${eng(Q, "VAR", 5)}, S = ${eng(S, "VA", 5)}, PF = ${fmt(pf, 5)}`;
  const tri = [[0, 0], [P, 0], [P, Q], [0, 0]];
  const series = [{ name: "Segitiga daya", points: tri }];
  if (target !== null) {
    if (Q <= 0) fail("Beban tidak bersifat induktif, sehingga koreksi dengan kapasitor tidak berlaku.", "target");
    if (target <= pf) fail(`Faktor daya target harus lebih besar dari nilai saat ini (${fmt(pf, 4)}).`, "target");
    const f = num(input, "f", "Frekuensi", { positive: true });
    const th2 = Math.acos(target);
    const Q2 = P * Math.tan(th2), Qc = Q - Q2;
    const w = 2 * Math.PI * f;
    const Cap = Qc / (w * V * V);
    const I2 = P / target / V;
    steps.push({ text: "Daya reaktif yang diperlukan setelah koreksi:", tex: `Q_2 = P\\tan(\\cos^{-1}${ntex(target)}) = ${ntex(Q2, 6)}\\ VAR` });
    steps.push({ text: "Kapasitor harus menyediakan selisihnya:", tex: `Q_C = Q - Q_2 = ${ntex(Qc, 6)}\\ VAR,\\quad C = \\frac{Q_C}{\\omega V^2} = \\frac{${ntex(Qc, 6)}}{${ntex(w, 6)} \\times ${ntex(V)}^2} = ${ntex(Cap, 6)}\\ F` });
    steps.push(`Setelah koreksi, arus turun dari ${eng(I, "A", 4)} menjadi ${eng(I2, "A", 4)} untuk daya aktif yang sama. Nilainya untuk satu kapasitor pada tegangan masukan (satu fasa).`);
    results.push({ label: "Daya kapasitor yang diperlukan", value: eng(Qc, "VAR", 4), text: `Qc = ${eng(Qc, "VAR", 4)}` }, { label: "Ukuran kapasitor", value: eng(Cap, "F", 4) }, { label: "Arus setelah koreksi", value: eng(I2, "A", 4) });
    copy += `\nQc = ${eng(Qc, "VAR", 4)}, C = ${eng(Cap, "F", 4)}`;
    series.push({ name: "Setelah koreksi", points: [[0, 0], [P, Q2]], dashed: true });
  }
  return { results, steps, copy, blocks: [{ type: "plot", title: "Segitiga daya (P mendatar, Q tegak)", xLabel: "P (W)", yLabel: "Q (VAR)", includeZero: true, series }] };
}
