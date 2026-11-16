import { choice, numList, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["inv", "Pembalik"], ["noninv", "Non-pembalik"], ["sum", "Penjumlah pembalik"], ["diff", "Diferensial (pengurang)"], ["integ", "Integrator"], ["deriv", "Diferensiator"]];

export const meta = {
  description: "Hitung penguatan op-amp ideal pada rangkaian umum: pembalik, non-pembalik, penjumlah, pengurang, integrator, dan diferensiator, dengan tegangan keluaran dan peringatan saturasi jika melebihi tegangan catu.",
  keywords: ["op-amp", "op-amp", "op-amp", "penguat pembalik", "penguat non-pembalik", "penjumlah", "Integrator", "Diferensiator", "penguatan"],
  formulas: [
    { label: "Pembalik dan non-pembalik", tex: "A_{inv} = -\\frac{R_f}{R_{in}},\\qquad A_{non} = 1 + \\frac{R_f}{R_{in}}" },
    { label: "Penjumlah, integrator, dan diferensiator (untuk sinyal sinus)", tex: "V_o = -R_f\\sum\\frac{V_i}{R_i},\\qquad |A_{int}| = \\frac{1}{\\omega RC},\\qquad |A_{diff}| = \\omega RC" }
  ],
  inputs: [
    { id: "cfg", label: "Rangkaian", type: "select", default: "inv", options: CFG },
    { id: "Rf", label: "Resistor umpan balik Rf", unit: "Ω", type: "number", default: "100k", when: { cfg: ["inv", "noninv", "sum", "diff"] } },
    { id: "Rin", label: "Resistansi masukan Rin", unit: "Ω", type: "number", default: "10k", when: { cfg: ["inv", "noninv", "diff"] } },
    { id: "Vin", label: "Tegangan masukan Vin", unit: "V", type: "number", default: "0.5", when: { cfg: ["inv", "noninv", "integ", "deriv"] }, help: "Untuk integrator dan diferensiator: amplitudo sinyal sinus." },
    { id: "V2", label: "Tegangan masukan kedua V2 (dikurangi V1 = Vin)", unit: "V", type: "number", default: "1", when: { cfg: ["diff"] } },
    { id: "V1d", label: "Tegangan masukan V1", unit: "V", type: "number", default: "0.5", when: { cfg: ["diff"] } },
    { id: "Rs", label: "Resistansi masukan untuk penjumlah", unit: "Ω", type: "text", default: "10k, 20k, 50k", when: { cfg: ["sum"] } },
    { id: "Vs", label: "Tegangan masukan untuk penjumlah", unit: "V", type: "text", default: "1, 0.5, -2", when: { cfg: ["sum"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k", when: { cfg: ["integ", "deriv"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "10n", when: { cfg: ["integ", "deriv"] } },
    { id: "f", label: "Frekuensi sinyal", unit: "Hz", type: "number", default: "1k", when: { cfg: ["integ", "deriv"] } },
    { id: "Vsat", label: "Tegangan catu ±Vcc", unit: "V", type: "number", default: "15" }
  ],
  example: { values: { cfg: "inv", Rf: "100k", Rin: "10k", Vin: "0.5", Vsat: "15" }, expect: ["A = -10", "Vout = -5 V"], note: "Contoh: penguat pembalik dengan penguatan −10 dan masukan 0.5 V." },
  invalid: { values: { cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" } },
  related: ["bjt-bias", "passive-filter", "adc", "sensor-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "Rangkaian", CFG.map((c) => c[0]), "inv");
  const Vsat = num(input, "Vsat", "Tegangan catu", { positive: true });
  const steps = ["Kita asumsikan op-amp ideal: penguatan tak hingga, tidak ada arus mengalir ke kedua masukan, dan kedua tegangannya sama (hubung singkat virtual)."];
  let A = null, Vout, gainText;
  if (cfg === "inv" || cfg === "noninv") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true }), Vin = num(input, "Vin", "Vin");
    A = cfg === "inv" ? -Rf / Rin : 1 + Rf / Rin;
    Vout = A * Vin;
    steps.push({ text: cfg === "inv" ? "Terminal pembalik berada pada ground virtual, sehingga seluruh arus masukan mengalir melalui Rf:" : "Tegangan terminal pembalik sama dengan Vin, dan Rf serta Rin membentuk pembagi terhadap keluaran:", tex: cfg === "inv" ? `A = -\\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` : `A = 1 + \\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` });
    steps.push({ tex: `V_{out} = A V_{in} = ${ntex(A, 6)} \\times ${ntex(Vin)} = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else if (cfg === "sum") {
    const Rf = num(input, "Rf", "Rf", { positive: true });
    const Rs = numList(input, "Rs", "Resistansi masukan", { positive: true, max: 10 });
    const Vs = numList(input, "Vs", "Tegangan masukan", { max: 10 });
    if (Rs.length !== Vs.length) fail(`Jumlah resistor (${Rs.length}) harus sama dengan jumlah tegangan (${Vs.length}).`, "Vs");
    Vout = -Rf * Rs.reduce((s, r, i) => s + Vs[i] / r, 0);
    steps.push({ text: "Arus masukan dijumlahkan di ground virtual dan mengalir melalui Rf:", tex: `V_{out} = -${ntex(Rf)}\\left(${Rs.map((r, i) => `\\frac{${ntex(Vs[i])}}{${ntex(r)}}`).join(" + ")}\\right) = ${ntex(Vout, 6)}\\ V` });
    gainText = Rs.map((r, i) => `A${i + 1} = ${fmt(-Rf / r, 5)}`).join(", ");
  } else if (cfg === "diff") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true });
    const V1 = num(input, "V1d", "V1"), V2 = num(input, "V2", "V2");
    A = Rf / Rin;
    Vout = A * (V2 - V1);
    steps.push({ text: "Dengan resistor yang sama (Rf/Rin pada kedua sisi) hanya selisih yang diperkuat:", tex: `V_{out} = \\frac{R_f}{R_{in}}(V_2 - V_1) = ${ntex(A, 6)}(${ntex(V2)} - ${ntex(V1)}) = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else {
    const R = num(input, "R", "R", { positive: true }), C = num(input, "C", "C", { positive: true }), f = num(input, "f", "Frekuensi", { positive: true }), Vin = num(input, "Vin", "Vin");
    const w = 2 * Math.PI * f, wc = 1 / (R * C);
    A = cfg === "integ" ? 1 / (w * R * C) : w * R * C;
    Vout = A * Vin;
    steps.push(cfg === "integ"
      ? { text: "Integrator: $v_o = -\\frac{1}{RC}\\int v_i\\,dt$, dan untuk sinyal sinus penguatannya menjadi:", tex: `|A| = \\frac{1}{\\omega RC} = \\frac{1}{${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)}} = ${ntex(A, 5)},\\ \\text{phase } +90^\\circ` }
      : { text: "Diferensiator: $v_o = -RC\\frac{dv_i}{dt}$, dan untuk sinyal sinus penguatannya menjadi:", tex: `|A| = \\omega RC = ${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)} = ${ntex(A, 5)},\\ \\text{phase } -90^\\circ` });
    steps.push(`Pada frekuensi ${eng(wc / (2 * Math.PI), "Hz", 4)} penguatannya menjadi 1. ${cfg === "integ" ? "Dalam praktik, sebuah resistor dipasang paralel dengan kapasitor untuk mencegah saturasi oleh tegangan DC." : "Dalam praktik, sebuah resistor dipasang seri dengan kapasitor untuk mengurangi derau frekuensi tinggi."}`);
    gainText = `|A| = ${fmt(A, 5)}`;
  }
  const sat = Math.abs(Vout) > Vsat;
  if (sat) steps.push(`Peringatan: keluaran terhitung ${fmt(Vout, 4)} V melebihi tegangan catu ±${fmt(Vsat)} V, sehingga keluaran sebenarnya akan saturasi pada sekitar ${fmt(Math.sign(Vout) * Vsat, 3)} V.`);
  const results = [];
  if (A !== null) results.push({ label: "Penguatan", value: A, sig: 6, text: gainText }, { label: "Penguatan dalam desibel", value: `${fmt(20 * Math.log10(Math.abs(A)), 4)} dB` });
  else results.push({ label: "Penguatan per masukan", value: gainText });
  results.push({ label: cfg === "integ" || cfg === "deriv" ? "Amplitudo keluaran" : "Tegangan keluaran", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Status", value: sat ? "Saturasi (keluaran terpotong)" : "Dalam rentang linear" });
  return { results, steps, copy: `${gainText}, Vout = ${eng(Vout, "V", 4)}${sat ? " (saturated)" : ""}` };
}
