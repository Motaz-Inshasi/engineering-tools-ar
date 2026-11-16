import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Hanya untuk edukasi dan pelatihan, dan tidak menggantikan dokter, apoteker, atau protokol resmi di institusi Anda." };

export const meta = {
  description: "Hitung dosis tunggal dan harian obat dalam miligram per kilogram berat badan, serta volume obat yang harus ditarik dari konsentrasi stok, dengan kemungkinan membatasi dosis pada batas maksimum.",
  keywords: ["Dosis obat", "mg/kg", "Perhitungan dosis", "Dosis maksimum", "drug dosage", "dose calculation", "Konsentrasi stok"],
  formulas: [
    { label: "Dosis tunggal", tex: "D = W \\times d_{kg}" },
    { label: "Dosis harian", tex: "D_{day} = D \\times f" },
    { label: "Volume obat per dosis", tex: "V = \\frac{D}{C_{mg}} \\times V_{mL}" }
  ],
  inputs: [
    { id: "weight", label: "Berat pasien", unit: "kg", type: "number", default: "20" },
    { id: "dosePerKg", label: "Dosis yang ditentukan per kg", unit: "mg/kg", type: "number", default: "15" },
    { id: "basis", label: "Dasar dosis yang ditentukan", type: "select", default: "dose", options: [["dose", "per dosis"], ["day", "per hari"]] },
    { id: "freq", label: "Jumlah dosis per hari", type: "number", default: "4", help: "Bilangan bulat dari 1 hingga 24." },
    { id: "stockMg", label: "Jumlah obat dalam stok", unit: "mg", type: "number", default: "250" },
    { id: "stockMl", label: "Volume stok", unit: "mL", type: "number", default: "5", help: "Contoh: 250 mg dalam 5 mL." },
    { id: "maxDose", label: "Dosis tunggal maksimum (opsional)", unit: "mg", type: "number", help: "Biarkan kosong jika tidak ada batas maksimum." }
  ],
  example: { values: { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" }, expect: ["300 mg", "6 mL"], note: "Contoh: anak dengan berat 20 kg, dosis 15 mg/kg per dosis, dan obat 250 mg dalam 5 mL." },
  invalid: { values: { weight: "0", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" } },
  related: ["iv-drip-rate", "bmi-bsa", "creatinine-clearance", "lab-units", "fluid-requirements"]
};

export function solve(input) {
  const w = num(input, "weight", "Berat", { positive: true, max: 500 });
  const mgkg = num(input, "dosePerKg", "Dosis per kg", { positive: true });
  const basis = choice(input, "basis", "Dasar dosis", ["dose", "day"], "dose");
  const freq = num(input, "freq", "Jumlah dosis per hari", { integer: true, min: 1, max: 24 });
  const stockMg = num(input, "stockMg", "Jumlah obat dalam stok", { positive: true });
  const stockMl = num(input, "stockMl", "Volume stok", { positive: true });
  const maxDose = num(input, "maxDose", "Dosis maksimum", { positive: true, optional: true });

  const rawDaily = basis === "dose" ? w * mgkg * freq : w * mgkg;
  const rawSingle = rawDaily / freq;
  const capped = maxDose !== null && rawSingle > maxDose;
  const single = capped ? maxDose : rawSingle;
  const daily = single * freq;
  const vol = (single / stockMg) * stockMl;

  const steps = [];
  if (basis === "dose") {
    steps.push({ text: "Dosis tunggal = berat × dosis per kg:", tex: `D = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawSingle, 6)}\\ mg` });
  } else {
    steps.push({ text: "Dosis harian = berat × dosis per kg:", tex: `D_{day} = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawDaily, 6)}\\ mg` });
    steps.push({ text: "Dosis tunggal = dosis harian ÷ jumlah dosis:", tex: `D = \\frac{${ntex(rawDaily, 6)}}{${freq}} = ${ntex(rawSingle, 6)}\\ mg` });
  }
  if (capped) steps.push({ text: "Dosis melebihi batas maksimum, sehingga kita gunakan batas maksimum:", tex: `D = ${ntex(maxDose)}\\ mg` });
  steps.push({ text: "Dosis harian = dosis tunggal × jumlah dosis:", tex: `D_{day} = ${ntex(single, 6)} \\times ${freq} = ${ntex(daily, 6)}\\ mg` });
  steps.push({ text: "Volume obat per dosis:", tex: `V = \\frac{${ntex(single, 6)}}{${ntex(stockMg)}} \\times ${ntex(stockMl)} = ${ntex(vol, 6)}\\ mL` });

  const blocks = [NOTE];
  if (capped) blocks.unshift({ type: "note", tone: "warn", text: `Dosis dibatasi pada batas maksimum ${fmt(maxDose)} mg karena perhitungan melampauinya, sehingga dosis harian juga diturunkan.` });

  return {
    results: [
      { label: "Dosis tunggal", value: `${fmt(single, 6)} mg`, text: `${fmt(single, 6)} mg` },
      { label: "Dosis harian", value: `${fmt(daily, 6)} mg` },
      { label: "Volume obat per dosis", value: `${fmt(vol, 4)} mL`, text: `${fmt(vol, 4)} mL` }
    ],
    steps,
    blocks,
    copy: `Dosis tunggal ${fmt(single, 6)} mg, yaitu ${fmt(vol, 4)} mL per dosis, dan dosis harian ${fmt(daily, 6)} mg`
  };
}
