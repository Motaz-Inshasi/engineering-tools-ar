import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { logspaceSafe } from "./common.js";

export const meta = {
  description: "قضیه انتقال حداکثر توان: بار بهینه، حداکثر توان و بازده در آن نقطه، و توان و بازده برای هر باری که انتخاب می‌کنید، همراه با نمودار توان بر حسب مقاومت بار.",
  keywords: ["انتقال حداکثر توان", "maximum power transfer", "مقاومت بار", "تونن", "بازده", "تطبیق امپدانس"],
  formulas: [
    { label: "توان در بار", tex: "P_L = \\frac{V_{th}^2 R_L}{(R_{th} + R_L)^2}" },
    { label: "شرط و مقدار بیشینه", tex: "R_L = R_{th} \\Rightarrow P_{max} = \\frac{V_{th}^2}{4R_{th}},\\quad \\eta = 50\\%" }
  ],
  inputs: [
    { id: "Vth", label: "ولتاژ تونن Vth", unit: "V", type: "number", default: "12" },
    { id: "Rth", label: "مقاومت تونن Rth", unit: "Ω", type: "number", default: "8" },
    { id: "RL", label: "مقاومت بار برای مقایسه (اختیاری)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { Vth: "12", Rth: "8", RL: "4" }, expect: ["Pmax = 4.5 W"], note: "مثال: منبع 12 V با مقاومت داخلی 8 Ω." },
  invalid: { values: { Vth: "12", Rth: "0" } },
  related: ["thevenin-norton", "ohms-law", "transformer"]
};

export function power(Vth, Rth, RL) {
  return (Vth * Vth * RL) / Math.pow(Rth + RL, 2);
}

export function solve(input) {
  const Vth = num(input, "Vth", "ولتاژ تونن", { nonZero: true });
  const Rth = num(input, "Rth", "مقاومت تونن", { positive: true });
  const RL = num(input, "RL", "مقاومت بار", { optional: true, nonNegative: true });
  const Pmax = (Vth * Vth) / (4 * Rth);
  const steps = [
    "$P_L$ را نسبت به $R_L$ مشتق می‌گیریم و برابر صفر قرار می‌دهیم؛ توان زمانی بیشینه است که مقاومت بار برابر مقاومت تونن باشد.",
    { tex: `R_L = R_{th} = ${ntex(Rth)}\\ \\Omega,\\qquad P_{max} = \\frac{${ntex(Vth)}^2}{4 \\times ${ntex(Rth)}} = ${ntex(Pmax, 6)}\\ W` },
    "در این نقطه توانی برابر درون منبع مصرف می‌شود، پس بازده تنها 50% است. سیستم‌های توان بالا با باری بزرگ‌تر از Rth با بازده بالاتر کار می‌کنند."
  ];
  const results = [{ label: "مقاومت بار بهینه", value: eng(Rth, "Ω", 4) }, { label: "حداکثر توان", value: eng(Pmax, "W", 4), text: `Pmax = ${eng(Pmax, "W", 4)}` }, { label: "بازده در آن نقطه", value: "50%" }];
  if (RL !== null) {
    const P = power(Vth, Rth, RL), eff = RL / (Rth + RL);
    results.push({ label: `توان در بار ${eng(RL, "Ω")}`, value: eng(P, "W", 4) }, { label: "بازده برای این بار", value: `${fmt(100 * eff, 4)}%` }, { label: "درصدی از حداکثر توان", value: `${fmt((100 * P) / Pmax, 4)}%` });
    steps.push({ text: `برای بار ${eng(RL, "Ω")}:`, tex: `P_L = \\frac{${ntex(Vth)}^2 \\times ${ntex(RL)}}{(${ntex(Rth)} + ${ntex(RL)})^2} = ${ntex(P, 6)}\\ W,\\quad \\eta = \\frac{R_L}{R_{th} + R_L} = ${ntex(100 * eff, 4)}\\%` });
  }
  const xs = logspaceSafe(Rth / 100, Rth * 100, 300);
  return {
    results, steps, copy: `RL = ${eng(Rth, "Ω")}, Pmax = ${eng(Pmax, "W", 4)}`,
    blocks: [{ type: "plot", title: "توان در بار بر حسب مقاومت آن", logX: true, xLabel: "RL (Ω)", yLabel: "P (W)", series: [{ name: "P(RL)", points: xs.map((x) => [x, power(Vth, Rth, x)]) }], vlines: [{ x: Rth }] }]
  };
}
