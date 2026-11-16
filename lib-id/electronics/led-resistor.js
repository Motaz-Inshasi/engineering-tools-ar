import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Hitung resistor LED yang sesuai untuk tegangan catu daya dan jumlah LED yang dirangkai seri, dengan nilai standar terdekat yang aman, arus aktual yang melewatinya, dan daya resistor yang diperlukan.",
  keywords: ["resistor LED", "LED", "LED resistor", "tegangan maju", "arus LED", "resistor pembatas arus"],
  formulas: [{ label: "resistor pembatas arus", tex: "R = \\frac{V_s - n V_F}{I_F},\\qquad P_R = I_F^2 R" }],
  inputs: [
    { id: "Vs", label: "Tegangan catu Vs", unit: "V", type: "number", default: "5" },
    { id: "Vf", label: "Tegangan maju per LED", unit: "V", type: "number", default: "2", help: "Perkiraan: merah 2, hijau/biru/putih 3 V." },
    { id: "If", label: "Arus LED yang diinginkan", unit: "A", type: "number", default: "20m" },
    { id: "n", label: "Jumlah LED yang dirangkai seri", type: "number", default: "1" },
    { id: "series", label: "Deret standar", type: "select", default: "E12", options: [["E12", "E12"], ["E24", "E24"], ["E96", "E96"]] }
  ],
  example: { values: { Vs: "5", Vf: "2", If: "20m", n: "1", series: "E12" }, expect: ["R = 150 Ω", "150 Ω (E12)"], note: "Contoh: LED merah dari 5 V dengan arus 20 mA." },
  invalid: { values: { Vs: "5", Vf: "3", If: "20m", n: "2" } },
  related: ["ohms-law", "resistor-color-code", "standard-resistor-values", "zener-regulator"]
};

export function solve(input) {
  const Vs = num(input, "Vs", "Tegangan catu", { positive: true });
  const Vf = num(input, "Vf", "Tegangan maju", { positive: true });
  const If = num(input, "If", "Arus", { positive: true });
  const n = num(input, "n", "Jumlah LED", { integer: true, min: 1, max: 100 });
  const series = choice(input, "series", "Deret", ["E12", "E24", "E96"], "E12");
  const Vr = Vs - n * Vf;
  if (Vr <= 0) fail(`Tegangan catu (${fmt(Vs)} V) tidak cukup untuk menyalakan ${n} LED yang dirangkai seri (${fmt(n * Vf)} V). Kurangi jumlahnya atau naikkan tegangan.`, "n");
  const R = Vr / If;
  const std = nearest(R, series);
  const Rstd = std.above;
  const Iact = Vr / Rstd, P = Iact * Iact * Rstd;
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10].find((w) => w >= 2 * P) ?? 10;
  const steps = [
    { text: "Tegangan sisa pada resistor:", tex: `V_R = V_s - nV_F = ${ntex(Vs)} - ${n} \\times ${ntex(Vf)} = ${ntex(Vr, 6)}\\ V` },
    { text: "Resistansi dihitung dari hukum Ohm:", tex: `R = \\frac{V_R}{I_F} = \\frac{${ntex(Vr, 6)}}{${ntex(If)}} = ${ntex(R, 6)}\\ \\Omega` },
    `Kita pilih nilai standar terdekat ${series} yang lebih besar darinya agar arus yang diinginkan tidak terlampaui: ${eng(Rstd, "Ω")}.`,
    { text: "Arus aktual dan daya pada resistor:", tex: `I = \\frac{${ntex(Vr, 6)}}{${ntex(Rstd)}} = ${ntex(Iact, 5)}\\ A,\\quad P = I^2R = ${ntex(P, 5)}\\ W` },
    `Kita pilih resistor dengan daya minimal dua kali daya yang dihitung demi keamanan: ${fmt(rating)} W.`
  ];
  return {
    results: [
      { label: "Resistansi hitung", value: eng(R, "Ω", 4), text: `R = ${eng(R, "Ω", 4)}` },
      { label: `Nilai standar terdekat ${series} yang aman`, value: eng(Rstd, "Ω"), text: `${series}: ${eng(Rstd, "Ω")}` },
      { label: "Arus aktual", value: eng(Iact, "A", 4) },
      { label: "Daya resistor", value: eng(P, "W", 4) },
      { label: "Daya resistor yang disarankan", value: `${fmt(rating)} W` },
      { label: "Daya tiap LED", value: eng(Vf * Iact, "W", 4) }
    ],
    steps, copy: `R = ${eng(R, "Ω", 4)} → ${eng(Rstd, "Ω")} (${series}), I = ${eng(Iact, "A", 4)}, P = ${eng(P, "W", 3)}`
  };
}
