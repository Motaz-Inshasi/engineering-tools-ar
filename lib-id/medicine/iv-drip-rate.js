import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Hanya untuk edukasi dan pelatihan, dan tidak menggantikan dokter, apoteker, atau protokol resmi di institusi Anda." };

export const meta = {
  description: "Hitung laju infus intravena dalam mL per jam, dan jumlah tetes per menit untuk beberapa faktor tetes selang, dengan nilai tepat dan nilai dibulatkan ke tetes penuh terdekat.",
  keywords: ["Tetes intravena", "jumlah tetes", "gtt/min", "laju infus", "IV drip rate", "drop factor", "mL/h"],
  formulas: [
    { label: "Laju aliran", tex: "R = \\frac{V}{T}" },
    { label: "Tetes per menit", tex: "N = \\frac{R \\times DF}{60}" }
  ],
  inputs: [
    { id: "volume", label: "Volume larutan", unit: "mL", type: "number", default: "1000" },
    { id: "hours", label: "Durasi dalam jam", unit: "h", type: "number", default: "8", help: "Bilangan bulat dari 0 hingga 999." },
    { id: "minutes", label: "Durasi dalam menit", unit: "min", type: "number", default: "0", help: "Bilangan bulat dari 0 hingga 59." },
    { id: "dropFactor", label: "Faktor selang", unit: "gtt/mL", type: "select", default: "20", options: [["10", "10 tetes/mL"], ["15", "15 tetes/mL"], ["20", "20 tetes/mL"], ["60", "60 tetes/mL (mikro)"]] }
  ],
  example: { values: { volume: "1000", hours: "8", minutes: "0", dropFactor: "15" }, expect: ["125 mL/h", "31 gtt/min"], note: "Contoh: 1000 mL diberikan dalam 8 jam dengan selang 15 tetes/mL." },
  invalid: { values: { volume: "1000", hours: "0", minutes: "0", dropFactor: "15" } },
  related: ["drug-dosage", "fluid-requirements", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const V = num(input, "volume", "Volume larutan", { positive: true });
  const hours = num(input, "hours", "Durasi dalam jam", { integer: true, min: 0, max: 999 });
  const minutes = num(input, "minutes", "Durasi dalam menit", { integer: true, min: 0, max: 59 });
  const DF = Number(choice(input, "dropFactor", "Faktor selang", ["10", "15", "20", "60"], "20"));
  const T = hours * 60 + minutes;
  if (T <= 0) fail("Masukkan durasi lebih besar dari nol (jam atau menit).", "hours");
  const rate = V * 60 / T;
  const exactDrops = rate * DF / 60;
  const drops = Math.round(exactDrops);
  const steps = [
    { text: "Total durasi dalam menit:", tex: `T = ${ntex(hours)} \\times 60 + ${ntex(minutes)} = ${ntex(T)}\\ min` },
    { text: "Laju aliran dalam mililiter per jam:", tex: `R = \\frac{${ntex(V)}}{${ntex(T / 60, 6)}} = ${ntex(rate, 6)}\\ mL/h` },
    { text: "Tetes per menit (nilai tepat):", tex: `N = \\frac{${ntex(rate, 6)} \\times ${DF}}{60} = ${ntex(exactDrops, 6)}\\ gtt/min` },
    { text: "Kita bulatkan ke tetes penuh terdekat:", tex: `N \\approx ${drops}\\ gtt/min` }
  ];
  const blocks = [NOTE];
  if (drops === 0) blocks.unshift({ type: "note", tone: "warn", text: "Setelah dibulatkan, laju kurang dari satu tetes per menit, sehingga tidak dapat diatur dengan selang ini. Gunakan selang dengan faktor tetes lebih tinggi atau pompa infus." });
  return {
    results: [
      { label: "Laju aliran", value: `${fmt(rate, 6)} mL/h`, text: `${fmt(rate, 6)} mL/h` },
      { label: "Tetes per menit (tepat)", value: `${fmt(exactDrops, 6)} gtt/min` },
      { label: "Tetes per menit (dibulatkan)", value: `${drops} gtt/min`, text: `${drops} gtt/min` }
    ],
    steps,
    blocks,
    copy: `Laju aliran ${fmt(rate, 6)} mL/h, dan tetesan ${fmt(exactDrops, 6)} dibulatkan menjadi ${drops} gtt/min`
  };
}
