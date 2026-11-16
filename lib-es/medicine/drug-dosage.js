import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Solo con fines educativos y de formación. No sustituye al médico, al farmacéutico ni al protocolo aprobado de su institución." };

export const meta = {
  description: "Calcula la dosis única y la diaria de un fármaco en miligramos por kilogramo de peso, y el volumen del fármaco que hay que extraer de la concentración del stock, con la opción de limitar la dosis a un máximo.",
  keywords: ["dosis de fármaco", "mg/kg", "cálculo de dosis", "dosis máxima", "drug dosage", "dose calculation", "concentración del stock"],
  formulas: [
    { label: "Dosis única", tex: "D = W \\times d_{kg}" },
    { label: "Dosis diaria", tex: "D_{day} = D \\times f" },
    { label: "Volumen de fármaco por dosis", tex: "V = \\frac{D}{C_{mg}} \\times V_{mL}" }
  ],
  inputs: [
    { id: "weight", label: "Peso del paciente", unit: "kg", type: "number", default: "20" },
    { id: "dosePerKg", label: "Dosis prescrita por kg", unit: "mg/kg", type: "number", default: "15" },
    { id: "basis", label: "Base de la dosis prescrita", type: "select", default: "dose", options: [["dose", "Por dosis"], ["day", "Por día"]] },
    { id: "freq", label: "Número de dosis al día", type: "number", default: "4", help: "Entero de 1 a 24." },
    { id: "stockMg", label: "Cantidad de fármaco en stock", unit: "mg", type: "number", default: "250" },
    { id: "stockMl", label: "Volumen del stock", unit: "mL", type: "number", default: "5", help: "Ejemplo: 250 mg en 5 mL." },
    { id: "maxDose", label: "Dosis única máxima (opcional)", unit: "mg", type: "number", help: "Déjalo vacío si no hay máximo." }
  ],
  example: { values: { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" }, expect: ["300 mg", "6 mL"], note: "Ejemplo: un niño de 20 kg, con una dosis de 15 mg/kg por dosis y un fármaco de 250 mg en 5 mL." },
  invalid: { values: { weight: "0", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" } },
  related: ["iv-drip-rate", "bmi-bsa", "creatinine-clearance", "lab-units", "fluid-requirements"]
};

export function solve(input) {
  const w = num(input, "weight", "Peso", { positive: true, max: 500 });
  const mgkg = num(input, "dosePerKg", "Dosis por kg", { positive: true });
  const basis = choice(input, "basis", "Base de la dosis", ["dose", "day"], "dose");
  const freq = num(input, "freq", "Número de dosis al día", { integer: true, min: 1, max: 24 });
  const stockMg = num(input, "stockMg", "Cantidad de fármaco en stock", { positive: true });
  const stockMl = num(input, "stockMl", "Volumen del stock", { positive: true });
  const maxDose = num(input, "maxDose", "dosis máxima", { positive: true, optional: true });

  const rawDaily = basis === "dose" ? w * mgkg * freq : w * mgkg;
  const rawSingle = rawDaily / freq;
  const capped = maxDose !== null && rawSingle > maxDose;
  const single = capped ? maxDose : rawSingle;
  const daily = single * freq;
  const vol = (single / stockMg) * stockMl;

  const steps = [];
  if (basis === "dose") {
    steps.push({ text: "Dosis única = peso × dosis por kg:", tex: `D = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawSingle, 6)}\\ mg` });
  } else {
    steps.push({ text: "Dosis diaria = peso × dosis por kg:", tex: `D_{day} = ${ntex(w)} \\times ${ntex(mgkg)} = ${ntex(rawDaily, 6)}\\ mg` });
    steps.push({ text: "Dosis única = dosis diaria ÷ número de dosis:", tex: `D = \\frac{${ntex(rawDaily, 6)}}{${freq}} = ${ntex(rawSingle, 6)}\\ mg` });
  }
  if (capped) steps.push({ text: "La dosis supera el máximo, así que usamos el máximo:", tex: `D = ${ntex(maxDose)}\\ mg` });
  steps.push({ text: "Dosis diaria = dosis única × número de dosis:", tex: `D_{day} = ${ntex(single, 6)} \\times ${freq} = ${ntex(daily, 6)}\\ mg` });
  steps.push({ text: "Volumen de fármaco por dosis:", tex: `V = \\frac{${ntex(single, 6)}}{${ntex(stockMg)}} \\times ${ntex(stockMl)} = ${ntex(vol, 6)}\\ mL` });

  const blocks = [NOTE];
  if (capped) blocks.unshift({ type: "note", tone: "warn", text: `La dosis se limitó al máximo de ${fmt(maxDose)} mg porque el cálculo lo superaba, por lo que también se redujo la dosis diaria.` });

  return {
    results: [
      { label: "Dosis única", value: `${fmt(single, 6)} mg`, text: `${fmt(single, 6)} mg` },
      { label: "Dosis diaria", value: `${fmt(daily, 6)} mg` },
      { label: "Volumen de fármaco por dosis", value: `${fmt(vol, 4)} mL`, text: `${fmt(vol, 4)} mL` }
    ],
    steps,
    blocks,
    copy: `Dosis única ${fmt(single, 6)} mg, es decir, ${fmt(vol, 4)} mL por dosis, y dosis diaria ${fmt(daily, 6)} mg`
  };
}
