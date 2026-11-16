import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "رگولاتور زنر با مقاومت سری طراحی کنید: بازهٔ مجاز مقاومت، مقدار استاندارد انتخاب‌شده، و جریان و توان زنر در بدترین حالت با تغییر ولتاژ ورودی و بار.",
  keywords: ["زنر", "zener", "رگولاتور زنر", "مقاومت سری", "تنظیم ولتاژ", "توان زنر"],
  formulas: [
    { label: "حداکثر مقاومت سری (بدترین حالت: کمترین ورودی و بیشترین بار)", tex: "R_{s,max} = \\frac{V_{in,min} - V_Z}{I_{L,max} + I_{Z,min}}" },
    { label: "حداکثر جریان و توان زنر (بیشترین ورودی و کمترین بار)", tex: "I_{Z,max} = \\frac{V_{in,max} - V_Z}{R_s} - I_{L,min},\\quad P_Z = V_Z I_{Z,max}" }
  ],
  inputs: [
    { id: "Vmin", label: "کمترین ولتاژ ورودی", unit: "V", type: "number", default: "10" },
    { id: "Vmax", label: "بیشترین ولتاژ ورودی", unit: "V", type: "number", default: "14" },
    { id: "Vz", label: "ولتاژ زنر Vz", unit: "V", type: "number", default: "5.1" },
    { id: "ILmax", label: "بیشترین جریان بار", unit: "A", type: "number", default: "50m" },
    { id: "ILmin", label: "کمترین جریان بار", unit: "A", type: "number", default: "0" },
    { id: "Izmin", label: "کمترین جریان زنر برای تنظیم", unit: "A", type: "number", default: "5m" },
    { id: "Pz", label: "توان نامی زنر (اختیاری)", unit: "W", type: "number", default: "1" }
  ],
  example: { values: { Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", Pz: "1" }, expect: ["Rs,max = 89.09 Ω", "Rs = 82 Ω"], note: "مثال: تنظیم 5.1 V از ورودی 10 تا 14 V برای بار تا 50 mA." },
  invalid: { values: { Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" } },
  related: ["voltage-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vmin = num(input, "Vmin", "کمترین ولتاژ ورودی", { positive: true });
  const Vmax = num(input, "Vmax", "بیشترین ولتاژ ورودی", { positive: true });
  const Vz = num(input, "Vz", "ولتاژ زنر", { positive: true });
  const ILmax = num(input, "ILmax", "بیشترین جریان بار", { nonNegative: true });
  const ILmin = num(input, "ILmin", "کمترین جریان بار", { nonNegative: true, default: 0 });
  const Izmin = num(input, "Izmin", "کمترین جریان زنر", { positive: true });
  const Pz = num(input, "Pz", "توان زنر", { optional: true, positive: true });
  if (Vmax < Vmin) fail("بیشترین ولتاژ ورودی نباید از کمترین ولتاژ ورودی کمتر باشد.", "Vmax");
  if (ILmin > ILmax) fail("کمترین جریان بار نباید از بیشترین جریان بار بیشتر باشد.", "ILmin");
  if (Vmin <= Vz) fail(`کمترین ولتاژ ورودی باید بزرگ‌تر از ولتاژ زنر (${fmt(Vz)} V) باشد تا در حالت تنظیم بماند.`, "Vmin");
  const RsMax = (Vmin - Vz) / (ILmax + Izmin);
  const Rs = nearest(RsMax, "E12").below;
  const IzMax = (Vmax - Vz) / Rs - ILmin;
  const PzMax = Vz * IzMax;
  const PRs = Math.pow(Vmax - Vz, 2) / Rs;
  const IzAtMin = (Vmin - Vz) / Rs - ILmax;
  const steps = [
    { text: "بدترین حالت تنظیم: کمترین ولتاژ ورودی و بیشترین جریان بار، و زنر باید دست‌کم جریان Iz,min را داشته باشد:", tex: `R_{s,max} = \\frac{${ntex(Vmin)} - ${ntex(Vz)}}{${ntex(ILmax)} + ${ntex(Izmin)}} = ${ntex(RsMax, 5)}\\ \\Omega` },
    `نزدیک‌ترین مقدار استاندارد E12 کوچک‌تر از آن را انتخاب می‌کنیم: $R_s = ${ntex(Rs)}\\ \\Omega$، تا در بدترین حالت جریان زنر ${eng(IzAtMin, "A", 4)} باشد.`,
    { text: "بدترین حالت توان: بیشترین ولتاژ ورودی و کمترین بار، پس بیشترین جریان از زنر می‌گذرد:", tex: `I_{Z,max} = \\frac{${ntex(Vmax)} - ${ntex(Vz)}}{${ntex(Rs)}} - ${ntex(ILmin)} = ${ntex(IzMax, 5)}\\ A,\\quad P_Z = ${ntex(PzMax, 5)}\\ W` },
    { text: "توان در مقاومت سری (بدترین حالت):", tex: `P_{R} = \\frac{(${ntex(Vmax)} - ${ntex(Vz)})^2}{${ntex(Rs)}} = ${ntex(PRs, 5)}\\ W` }
  ];
  const results = [
    { label: "حداکثر مقاومت سری مجاز", value: eng(RsMax, "Ω", 4), text: `Rs,max = ${eng(RsMax, "Ω", 4)}` },
    { label: "مقاومت انتخاب‌شده (E12)", value: eng(Rs, "Ω"), text: `Rs = ${eng(Rs, "Ω")}` },
    { label: "بیشترین جریان زنر", value: eng(IzMax, "A", 4) },
    { label: "بیشترین توان زنر", value: eng(PzMax, "W", 4) },
    { label: "بیشترین توان مقاومت", value: eng(PRs, "W", 4) }
  ];
  if (Pz !== null) {
    const ok = PzMax <= Pz;
    results.push({ label: "حکم", value: ok ? `مناسب (${fmt((100 * PzMax) / Pz, 3)}% از توان نامی زنر)` : "زنر می‌سوزد: زنری با توان بیشتر انتخاب کنید یا بازهٔ ورودی را کم کنید" });
    steps.push(ok ? `توان ${fmt(PzMax, 4)} W کمتر از توان نامی ${fmt(Pz)} W است.` : `توان ${fmt(PzMax, 4)} W از توان نامی ${fmt(Pz)} W بیشتر است.`);
  }
  return { results, steps, copy: `Rs,max = ${eng(RsMax, "Ω", 4)}, Rs = ${eng(Rs, "Ω")}, Iz,max = ${eng(IzMax, "A", 4)}, Pz = ${eng(PzMax, "W", 4)}` };
}
