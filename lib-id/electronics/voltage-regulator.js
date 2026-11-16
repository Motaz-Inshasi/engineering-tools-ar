import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Periksa regulator tegangan linear (seperti 7805 atau LDO): margin tegangan dropout, daya disipasi, efisiensi, suhu junction, dan resistansi termal yang diperlukan untuk heatsink.",
  keywords: ["regulator tegangan", "voltage regulator", "LDO", "7805", "tegangan dropout", "dropout", "heatsink", "heatsink", "suhu junction"],
  formulas: [
    { label: "Daya dan efisiensi", tex: "P_D = (V_{in} - V_{out})I_L + V_{in}I_Q,\\qquad \\eta = \\frac{V_{out}I_L}{V_{in}(I_L + I_Q)}" },
    { label: "Termal", tex: "T_J = T_A + P_D\\,\\theta_{JA},\\qquad \\theta_{SA,max} = \\frac{T_{J,max} - T_A}{P_D} - \\theta_{JC} - \\theta_{CS}" }
  ],
  inputs: [
    { id: "Vin", label: "Tegangan masukan (maksimum)", unit: "V", type: "number", default: "12" },
    { id: "Vout", label: "Tegangan keluaran", unit: "V", type: "number", default: "5" },
    { id: "IL", label: "Arus beban", unit: "A", type: "number", default: "500m" },
    { id: "Vdo", label: "Tegangan dropout (Dropout)", unit: "V", type: "number", default: "2" },
    { id: "Iq", label: "Arus diam Iq", unit: "A", type: "number", default: "5m" },
    { id: "Ta", label: "Suhu sekitar", unit: "°C", type: "number", default: "40" },
    { id: "Tj", label: "Suhu maksimum junction", unit: "°C", type: "number", default: "125" },
    { id: "tja", label: "θJA tanpa heatsink", unit: "°C/W", type: "number", default: "50" },
    { id: "tjc", label: "θJC", unit: "°C/W", type: "number", default: "5" },
    { id: "tcs", label: "θCS (pasta termal)", unit: "°C/W", type: "number", default: "0.5" }
  ],
  example: { values: { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" }, expect: ["PD = 3.56 W", "θSA ≤ 18.38 °C/W"], note: "Contoh: 7805 dari 12 V dengan arus 500 mA." },
  invalid: { values: { Vin: "6", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" } },
  related: ["zener-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "Tegangan masukan", { positive: true });
  const Vout = num(input, "Vout", "Tegangan keluaran", { positive: true });
  const IL = num(input, "IL", "Arus beban", { nonNegative: true });
  const Vdo = num(input, "Vdo", "tegangan dropout", { nonNegative: true });
  const Iq = num(input, "Iq", "Arus diam", { nonNegative: true, default: 0 });
  const Ta = num(input, "Ta", "Suhu sekitar", { min: -60, max: 150 });
  const Tjmax = num(input, "Tj", "Suhu maksimum junction", { min: 50, max: 200 });
  const tja = num(input, "tja", "θJA", { positive: true });
  const tjc = num(input, "tjc", "θJC", { nonNegative: true, default: 0 });
  const tcs = num(input, "tcs", "θCS", { nonNegative: true, default: 0 });
  if (Vin < Vout + Vdo) fail(`Tegangan masukan ${fmt(Vin)} V lebih kecil dari batas minimum ${fmt(Vout + Vdo)} V (keluaran + tegangan dropout), sehingga regulator tidak akan mengatur.`, "Vin");
  if (Tjmax <= Ta) fail("Suhu maksimum junction harus lebih tinggi dari suhu sekitar.", "Tj");
  const PD = (Vin - Vout) * IL + Vin * Iq;
  const eff = IL > 0 ? (Vout * IL) / (Vin * (IL + Iq)) : 0;
  const TjNoHs = Ta + PD * tja;
  const PDmax = (Tjmax - Ta) / tja;
  const steps = [
    `Margin tegangan ${fmt(Vin - Vout - Vdo, 4)} V di atas tegangan dropout, sehingga regulator bekerja.`,
    { text: "Daya disipasi (selisih tegangan × arus + konsumsi regulator):", tex: `P_D = (${ntex(Vin)} - ${ntex(Vout)}) \\times ${ntex(IL)} + ${ntex(Vin)} \\times ${ntex(Iq)} = ${ntex(PD, 4)}\\ W` },
    { text: "Efisiensi:", tex: `\\eta = \\frac{${ntex(Vout)} \\times ${ntex(IL)}}{${ntex(Vin)} \\times (${ntex(IL)} + ${ntex(Iq)})} = ${ntex(100 * eff, 4)}\\%` },
    { text: "Suhu junction tanpa heatsink:", tex: `T_J = ${ntex(Ta)} + ${ntex(PD, 4)} \\times ${ntex(tja)} = ${ntex(TjNoHs, 4)}^\\circ C` }
  ];
  const results = [
    { label: "Daya disipasi", value: eng(PD, "W", 3), text: `PD = ${eng(PD, "W", 3)}` },
    { label: "Efisiensi", value: `${fmt(100 * eff, 4)}%` },
    { label: "Suhu junction tanpa heatsink", value: `${fmt(TjNoHs, 4)} °C` },
    { label: "Daya maksimum tanpa heatsink", value: eng(PDmax, "W", 3) }
  ];
  let copy = `PD = ${eng(PD, "W", 3)}, η = ${fmt(100 * eff, 4)}%, Tj = ${fmt(TjNoHs, 4)} °C`;
  if (TjNoHs > Tjmax) {
    const tsa = (Tjmax - Ta) / PD - tjc - tcs;
    if (tsa <= 0) {
      steps.push("Bahkan dengan heatsink ideal, daya ini tidak dapat didisipasikan dengan aman; gunakan regulator switching (Buck) atau turunkan tegangan masukan.");
      results.push({ label: "Kesimpulan", value: "Tidak mungkin dengan regulator linear: gunakan regulator switching" });
    } else {
      steps.push({ text: "Suhu melampaui batas, sehingga kita memerlukan heatsink dengan resistansi termal tidak lebih dari:", tex: `\\theta_{SA} \\le \\frac{${ntex(Tjmax)} - ${ntex(Ta)}}{${ntex(PD, 4)}} - ${ntex(tjc)} - ${ntex(tcs)} = ${ntex(tsa, 4)}^\\circ C/W` });
      results.push({ label: "Kesimpulan", value: "Memerlukan heatsink" }, { label: "θSA maksimum heatsink", value: `${fmt(tsa, 4)} °C/W`, text: `θSA ≤ ${fmt(tsa, 4)} °C/W` });
      copy += `\nθSA ≤ ${fmt(tsa, 4)} °C/W`;
    }
  } else {
    steps.push("Suhu dalam batas, sehingga tidak perlu heatsink (disarankan margin aman minimal 20 °C).");
    results.push({ label: "Kesimpulan", value: TjNoHs > Tjmax - 20 ? "Dapat diterima tetapi dekat batas" : "Tidak memerlukan heatsink" });
  }
  return { results, steps, copy };
}
