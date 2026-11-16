import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Herhangi bir besleme gerilimi ve seri LED sayısı için uygun LED direncini hesaplayın; güvenli en yakın standart değeri, bu değerdeki gerçek akımı ve gerekli direnç gücünü gösterin.",
  keywords: ["LED direnci", "LED", "LED resistor", "İleri gerilim", "LED akımı", "Akım sınırlama direnci"],
  formulas: [{ label: "Akım sınırlama direnci", tex: "R = \\frac{V_s - n V_F}{I_F},\\qquad P_R = I_F^2 R" }],
  inputs: [
    { id: "Vs", label: "Besleme gerilimi Vs", unit: "V", type: "number", default: "5" },
    { id: "Vf", label: "LED başına ileri gerilim", unit: "V", type: "number", default: "2", help: "Yaklaşık değerler: kırmızı 2 V, yeşil/mavi/beyaz 3 V." },
    { id: "If", label: "Gerekli LED akımı", unit: "A", type: "number", default: "20m" },
    { id: "n", label: "Seri LED sayısı", type: "number", default: "1" },
    { id: "series", label: "Standart seri", type: "select", default: "E12", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] }
  ],
  example: { values: { Vs: "5", Vf: "2", If: "20m", n: "1", series: "E12" }, expect: ["R = 150 Ω", "150 Ω (E12)"], note: "Örnek: 5 V'tan 20 mA akımlı kırmızı LED." },
  invalid: { values: { Vs: "5", Vf: "3", If: "20m", n: "2" } },
  related: ["ohms-law", "resistor-color-code", "standard-resistor-values", "zener-regulator"]
};

export function solve(input) {
  const Vs = num(input, "Vs", "Besleme gerilimi", { positive: true });
  const Vf = num(input, "Vf", "İleri gerilim", { positive: true });
  const If = num(input, "If", "Akım", { positive: true });
  const n = num(input, "n", "LED sayısı", { integer: true, min: 1, max: 100 });
  const series = choice(input, "series", "Seri", ["E12", "E24", "E96"], "E12");
  const Vr = Vs - n * Vf;
  if (Vr <= 0) fail(`Besleme gerilimi (${fmt(Vs)} V), ${n} seri LED'i (${fmt(n * Vf)} V) çalıştırmaya yetmiyor. Sayısını azaltın veya gerilimi yükseltin.`, "n");
  const R = Vr / If;
  const std = nearest(R, series);
  const Rstd = std.above;
  const Iact = Vr / Rstd, P = Iact * Iact * Rstd;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10].find((w) => w >= 2 * P) ?? 10;
  const steps = [
    { text: "Direnç üzerindeki kalan gerilim:", tex: `V_R = V_s - nV_F = ${ntex(Vs)} - ${n} \\times ${ntex(Vf)} = ${ntex(Vr, 6)}\\ V` },
    { text: "Ohm yasasından hesaplanan direnç:", tex: `R = \\frac{V_R}{I_F} = \\frac{${ntex(Vr, 6)}}{${ntex(If)}} = ${ntex(R, 6)}\\ \\Omega` },
    `İstenen akımı aşmamak için ${series} değerinden büyük en yakın standart değeri seçiyoruz: ${eng(Rstd, "Ω")}.`,
    { text: "Gerçek akım ve direncin gücü:", tex: `I = \\frac{${ntex(Vr, 6)}}{${ntex(Rstd)}} = ${ntex(Iact, 5)}\\ A,\\quad P = I^2R = ${ntex(P, 5)}\\ W` },
    `Güvenlik için en az hesaplanan gücün iki katı güce sahip bir direnç seçiyoruz: ${fmt(rating)} W.`
  ];
  return {
    results: [
      { label: "Hesaplanan direnç", value: eng(R, "Ω", 4), text: `R = ${eng(R, "Ω", 4)}` },
      { label: `Güvenli en yakın değer ${series}`, value: eng(Rstd, "Ω"), text: `${series}: ${eng(Rstd, "Ω")}` },
      { label: "Gerçek akım", value: eng(Iact, "A", 4) },
      { label: "Direnç gücü", value: eng(P, "W", 4) },
      { label: "Önerilen direnç gücü", value: `${fmt(rating)} W` },
      { label: "LED başına güç", value: eng(Vf * Iact, "W", 4) }
    ],
    steps, copy: `R = ${eng(R, "Ω", 4)} → ${eng(Rstd, "Ω")} (${series}), I = ${eng(Iact, "A", 4)}, P = ${eng(P, "W", 3)}`
  };
}
