import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Rancang regulator zener dengan resistor seri: rentang resistansi yang diizinkan, nilai standar yang dipilih, dan arus serta daya zener pada kondisi terburuk saat tegangan masukan dan beban berubah.",
  keywords: ["zener", "zener", "regulator zener", "resistor seri", "regulasi tegangan", "daya zener"],
  formulas: [
    { label: "Resistor seri maksimum (kondisi terburuk: masukan terendah dan beban terbesar)", tex: "R_{s,max} = \\frac{V_{in,min} - V_Z}{I_{L,max} + I_{Z,min}}" },
    { label: "Arus dan daya zener maksimum (masukan terbesar dan beban terkecil)", tex: "I_{Z,max} = \\frac{V_{in,max} - V_Z}{R_s} - I_{L,min},\\quad P_Z = V_Z I_{Z,max}" }
  ],
  inputs: [
    { id: "Vmin", label: "Tegangan masukan minimum", unit: "V", type: "number", default: "10" },
    { id: "Vmax", label: "Tegangan masukan maksimum", unit: "V", type: "number", default: "14" },
    { id: "Vz", label: "Tegangan zener Vz", unit: "V", type: "number", default: "5.1" },
    { id: "ILmax", label: "Arus beban maksimum", unit: "A", type: "number", default: "50m" },
    { id: "ILmin", label: "Arus beban minimum", unit: "A", type: "number", default: "0" },
    { id: "Izmin", label: "Arus zener minimum untuk regulasi", unit: "A", type: "number", default: "5m" },
    { id: "Pz", label: "Daya zener nominal (opsional)", unit: "W", type: "number", default: "1" }
  ],
  example: { values: { Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", Pz: "1" }, expect: ["Rs,max = 89.09 Ω", "Rs = 82 Ω"], note: "Contoh: regulasi 5.1 V dari masukan 10–14 V untuk beban hingga 50 mA." },
  invalid: { values: { Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" } },
  related: ["voltage-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vmin = num(input, "Vmin", "Tegangan masukan minimum", { positive: true });
  const Vmax = num(input, "Vmax", "Tegangan masukan maksimum", { positive: true });
  const Vz = num(input, "Vz", "Tegangan zener", { positive: true });
  const ILmax = num(input, "ILmax", "Arus beban maksimum", { nonNegative: true });
  const ILmin = num(input, "ILmin", "Arus beban minimum", { nonNegative: true, default: 0 });
  const Izmin = num(input, "Izmin", "Arus zener minimum", { positive: true });
  const Pz = num(input, "Pz", "daya zener", { optional: true, positive: true });
  if (Vmax < Vmin) fail("Tegangan masukan maksimum tidak boleh lebih kecil dari minimum.", "Vmax");
  if (ILmin > ILmax) fail("Arus beban minimum tidak boleh melebihi maksimumnya.", "ILmin");
  if (Vmin <= Vz) fail(`Tegangan masukan minimum harus lebih besar dari tegangan zener (${fmt(Vz)} V) agar tetap dalam regulasi.`, "Vmin");
  const RsMax = (Vmin - Vz) / (ILmax + Izmin);
  const Rs = nearest(RsMax, "E12").below;
  const IzMax = (Vmax - Vz) / Rs - ILmin;
  const PzMax = Vz * IzMax;
  const PRs = Math.pow(Vmax - Vz, 2) / Rs;
  const IzAtMin = (Vmin - Vz) / Rs - ILmax;
  const steps = [
    { text: "Kondisi terburuk untuk regulasi: tegangan masukan minimum dan arus beban maksimum, dan zener harus tetap mendapat paling sedikit Iz,min:", tex: `R_{s,max} = \\frac{${ntex(Vmin)} - ${ntex(Vz)}}{${ntex(ILmax)} + ${ntex(Izmin)}} = ${ntex(RsMax, 5)}\\ \\Omega` },
    `Kita pilih nilai standar E12 yang lebih kecil darinya: $R_s = ${ntex(Rs)}\\ \\Omega$, sehingga pada kondisi terburuk arus zener menjadi ${eng(IzAtMin, "A", 4)}.`,
    { text: "Kondisi terburuk untuk daya: tegangan masukan maksimum dan beban minimum, sehingga arus zener terbesar mengalir:", tex: `I_{Z,max} = \\frac{${ntex(Vmax)} - ${ntex(Vz)}}{${ntex(Rs)}} - ${ntex(ILmin)} = ${ntex(IzMax, 5)}\\ A,\\quad P_Z = ${ntex(PzMax, 5)}\\ W` },
    { text: "Daya pada resistor seri (kondisi terburuk):", tex: `P_{R} = \\frac{(${ntex(Vmax)} - ${ntex(Vz)})^2}{${ntex(Rs)}} = ${ntex(PRs, 5)}\\ W` }
  ];
  const results = [
    { label: "Resistor seri maksimum yang diizinkan", value: eng(RsMax, "Ω", 4), text: `Rs,max = ${eng(RsMax, "Ω", 4)}` },
    { label: "Resistor terpilih (E12)", value: eng(Rs, "Ω"), text: `Rs = ${eng(Rs, "Ω")}` },
    { label: "Arus zener maksimum", value: eng(IzMax, "A", 4) },
    { label: "Daya zener maksimum", value: eng(PzMax, "W", 4) },
    { label: "Daya resistor maksimum", value: eng(PRs, "W", 4) }
  ];
  if (Pz !== null) {
    const ok = PzMax <= Pz;
    results.push({ label: "Kesimpulan", value: ok ? `Sesuai (${fmt((100 * PzMax) / Pz, 3)}% dari daya zener)` : "Zener akan terbakar: pilih zener dengan daya lebih besar atau persempit rentang masukan" });
    steps.push(ok ? `Daya ${fmt(PzMax, 4)} W lebih kecil dari daya nominal ${fmt(Pz)} W.` : `Daya ${fmt(PzMax, 4)} W melebihi daya nominal ${fmt(Pz)} W.`);
  }
  return { results, steps, copy: `Rs,max = ${eng(RsMax, "Ω", 4)}, Rs = ${eng(Rs, "Ω")}, Iz,max = ${eng(IzMax, "A", 4)}, Pz = ${eng(PzMax, "W", 4)}` };
}
