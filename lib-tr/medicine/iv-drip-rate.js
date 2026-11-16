import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "Yalnızca eğitim ve öğretim amaçlıdır; doktorunuzun, eczacınızın veya kurumunuzda onaylı protokolün yerini tutmaz." };

export const meta = {
  description: "Damar içi infüzyon hızını mL/saat cinsinden ve set faktörüne göre dakikadaki damla sayısını hesaplayın; tam değeri ve en yakın tam damlaya yuvarlanmış değeri gösterin.",
  keywords: ["Damar içi infüzyon", "Damla sayısı", "gtt/min", "İnfüzyon hızı", "IV drip rate", "drop factor", "mL/h"],
  formulas: [
    { label: "Akış hızı", tex: "R = \\frac{V}{T}" },
    { label: "Dakikadaki damla", tex: "N = \\frac{R \\times DF}{60}" }
  ],
  inputs: [
    { id: "volume", label: "Çözelti hacmi", unit: "mL", type: "number", default: "1000" },
    { id: "hours", label: "Süre (saat)", unit: "h", type: "number", default: "8", help: "0 ile 999 arasında tam sayı." },
    { id: "minutes", label: "Süre (dakika)", unit: "min", type: "number", default: "0", help: "0 ile 59 arasında tam sayı." },
    { id: "dropFactor", label: "Set faktörü", unit: "gtt/mL", type: "select", default: "20", options: [["10", "10 damla/mL"], ["15", "15 damla/mL"], ["20", "20 damla/mL"], ["60", "60 damla/mL (mikro)"]] }
  ],
  example: { values: { volume: "1000", hours: "8", minutes: "0", dropFactor: "15" }, expect: ["125 mL/h", "31 gtt/min"], note: "Örnek: 1000 mL, 15 damla/mL setle 8 saatte verilir." },
  invalid: { values: { volume: "1000", hours: "0", minutes: "0", dropFactor: "15" } },
  related: ["drug-dosage", "fluid-requirements", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const V = num(input, "volume", "Çözelti hacmi", { positive: true });
  const hours = num(input, "hours", "Süre (saat)", { integer: true, min: 0, max: 999 });
  const minutes = num(input, "minutes", "Süre (dakika)", { integer: true, min: 0, max: 59 });
  const DF = Number(choice(input, "dropFactor", "Set faktörü", ["10", "15", "20", "60"], "20"));
  const T = hours * 60 + minutes;
  if (T <= 0) fail("Sıfırdan büyük bir süre girin (saat veya dakika).", "hours");
  const rate = V * 60 / T;
  const exactDrops = rate * DF / 60;
  const drops = Math.round(exactDrops);
  const steps = [
    { text: "Toplam süre (dakika):", tex: `T = ${ntex(hours)} \\times 60 + ${ntex(minutes)} = ${ntex(T)}\\ min` },
    { text: "Akış hızı mL/saat cinsinden:", tex: `R = \\frac{${ntex(V)}}{${ntex(T / 60, 6)}} = ${ntex(rate, 6)}\\ mL/h` },
    { text: "Dakikadaki damla sayısı (tam değer):", tex: `N = \\frac{${ntex(rate, 6)} \\times ${DF}}{60} = ${ntex(exactDrops, 6)}\\ gtt/min` },
    { text: "En yakın tam damlaya yuvarlıyoruz:", tex: `N \\approx ${drops}\\ gtt/min` }
  ];
  const blocks = [NOTE];
  if (drops === 0) blocks.unshift({ type: "note", tone: "warn", text: "Yuvarlamadan sonra hız dakikada bir damlanın altında kalıyor; bu nedenle bu set ile ayarlanamaz. Daha yüksek faktörlü bir set veya infüzyon pompası kullanın." });
  return {
    results: [
      { label: "Akış hızı", value: `${fmt(rate, 6)} mL/h`, text: `${fmt(rate, 6)} mL/h` },
      { label: "Dakikadaki damla (dakika)", value: `${fmt(exactDrops, 6)} gtt/min` },
      { label: "Dakikadaki damla (yuvarlanmış)", value: `${drops} gtt/min`, text: `${drops} gtt/min` }
    ],
    steps,
    blocks,
    copy: `Akış hızı ${fmt(rate, 6)} mL/saat, damla sayısı ${fmt(exactDrops, 6)} ise ${drops} gtt/dk'ya yuvarlanır`
  };
}
