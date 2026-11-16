import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Yalnızca eğitim ve öğretim amaçlıdır; doktorunuzun, eczacınızın veya kurumunuzda onaylı protokolün yerini tutmaz." };

export const meta = {
  description: "Miligram/kilogram cinsinden bir ilacın tek ve günlük dozunu ile stok konsantrasyonundan çekilmesi gereken ilaç hacmini hesaplayın; isteğe bağlı olarak dozu bir üst sınırla sınırlandırın.",
  keywords: ["İlaç dozu", "mg/kg", "Doz hesabı", "En yüksek doz", "drug dosage", "dose calculation", "Stok konsantrasyonu"],
  formulas: [
    { label: "Tek doz", tex: "D = W \\times d_{kg}" },
    { label: "Günlük doz", tex: "D_{day} = D \\times f" },
    { label: "Doz başına ilaç hacmi", tex: "V = \\frac{D}{C_{mg}} \\times V_{mL}" }
  ],
  inputs: [
    { id: "weight", label: "Hasta kilosu", unit: "kg", type: "number", default: "20" },
    { id: "dosePerKg", label: "Kilogram başına reçete edilen doz", unit: "mg/kg", type: "number", default: "15" },
    { id: "basis", label: "Doz esası", type: "select", default: "dose", options: [["dose", "Doz başına"], ["day", "Gün başına"]] },
    { id: "freq", label: "Günlük doz sayısı", type: "number", default: "4", help: "1 ile 24 arasında tam sayı." },
    { id: "stockMg", label: "Stoktaki ilaç miktarı", unit: "mg", type: "number", default: "250" },
    { id: "stockMl", label: "Stok hacmi", unit: "mL", type: "number", default: "5", help: "Örnek: 5 mL içinde 250 mg." },
    { id: "maxDose", label: "Tek doz için en yüksek doz (isteğe bağlı)", unit: "mg", type: "number", help: "Üst sınır yoksa boş bırakın." }
  ],
  example: { values: { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" }, expect: ["300 mg", "6 mL"], note: "Örnek: kilosu 20 kg olan bir çocuk, doz başına 15 mg/kg ve ilaç 5 mL içinde 250 mg." },
  invalid: { values: { weight: "0", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" } },
  related: ["iv-drip-rate", "bmi-bsa", "creatinine-clearance", "lab-units", "fluid-requirements"]
};

export function solve(input) {
  const w = num(input, "weight", "Kilo", { positive: true, max: 500 });
  const mgkg = num(input, "dosePerKg", "Kilogram başına doz", { positive: true });
  const basis = choice(input, "basis", "Doz esası", ["dose", "day"], "dose");
  const freq = num(input, "freq", "Günlük doz sayısı", { integer: true, min: 1, max: 24 });
  const stockMg = num(input, "stockMg", "Stoktaki ilaç miktarı", { positive: true });
  const stockMl = num(input, "stockMl", "Stok hacmi", { positive: true });
  const maxDose = num(input, "maxDose", "En yüksek doz", { positive: true, optional: true });

  const rawDaily = basis === "dose" ? w * mgkg * freq : w * mgkg;
  const rawSingle = rawDaily / freq;
  const capped = maxDose !== null && rawSingle > maxDose;
  const single = capped ? maxDose : rawSingle;
  const daily = single * freq;
  const vol = (single / stockMg) * stockMl;

  const steps = [];
  if (basis === "dose") {
    steps.push({ text: "Tek doz = kilo × kilogram başına doz:", tex: `D = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawSingle, 6)}\\ mg` });
  } else {
    steps.push({ text: "Günlük doz = kilo × kilogram başına doz:", tex: `D_{day} = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawDaily, 6)}\\ mg` });
    steps.push({ text: "Tek doz = günlük doz ÷ doz sayısı:", tex: `D = \\frac{${ntex(rawDaily, 6)}}{${freq}} = ${ntex(rawSingle, 6)}\\ mg` });
  }
  if (capped) steps.push({ text: "Doz üst sınırı aştı, bu nedenle en yüksek dozu kullanıyoruz:", tex: `D = ${ntex(maxDose)}\\ mg` });
  steps.push({ text: "Günlük doz = tek doz × doz sayısı:", tex: `D_{day} = ${ntex(single, 6)} \\times ${freq} = ${ntex(daily, 6)}\\ mg` });
  steps.push({ text: "Doz başına ilaç hacmi:", tex: `V = \\frac{${ntex(single, 6)}}{${ntex(stockMg)}} \\times ${ntex(stockMl)} = ${ntex(vol, 6)}\\ mL` });

  const blocks = [NOTE];
  if (capped) blocks.unshift({ type: "note", tone: "warn", text: `Doz, hesaplanan değeri aştığı için ${fmt(maxDose)} mg ile sınırlandı; bu nedenle günlük doz da düşürüldü.` });

  return {
    results: [
      { label: "Tek doz", value: `${fmt(single, 6)} mg`, text: `${fmt(single, 6)} mg` },
      { label: "Günlük doz", value: `${fmt(daily, 6)} mg` },
      { label: "Doz başına ilaç hacmi", value: `${fmt(vol, 4)} mL`, text: `${fmt(vol, 4)} mL` }
    ],
    steps,
    blocks,
    copy: `Tek doz ${fmt(single, 6)} mg, yani doz başına ${fmt(vol, 4)} mL; günlük doz ${fmt(daily, 6)} mg`
  };
}
