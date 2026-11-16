import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "رگولاتور ولتاژ خطی (مانند 7805 یا LDO) را بررسی کنید: حاشیهٔ ولتاژ افت، توان تلف‌شده، بازده، دمای پیوندگاه و مقاومت حرارتی موردنیاز هیت‌سینک.",
  keywords: ["رگولاتور ولتاژ", "voltage regulator", "LDO", "7805", "ولتاژ افت", "dropout", "هیت‌سینک", "heatsink", "دمای پیوندگاه"],
  formulas: [
    { label: "توان و بازده", tex: "P_D = (V_{in} - V_{out})I_L + V_{in}I_Q,\\qquad \\eta = \\frac{V_{out}I_L}{V_{in}(I_L + I_Q)}" },
    { label: "دما", tex: "T_J = T_A + P_D\\,\\theta_{JA},\\qquad \\theta_{SA,max} = \\frac{T_{J,max} - T_A}{P_D} - \\theta_{JC} - \\theta_{CS}" }
  ],
  inputs: [
    { id: "Vin", label: "ولتاژ ورودی (حداکثر)", unit: "V", type: "number", default: "12" },
    { id: "Vout", label: "ولتاژ خروجی", unit: "V", type: "number", default: "5" },
    { id: "IL", label: "جریان بار", unit: "A", type: "number", default: "500m" },
    { id: "Vdo", label: "ولتاژ افت (Dropout)", unit: "V", type: "number", default: "2" },
    { id: "Iq", label: "جریان سکون Iq", unit: "A", type: "number", default: "5m" },
    { id: "Ta", label: "دمای محیط", unit: "°C", type: "number", default: "40" },
    { id: "Tj", label: "حداکثر دمای پیوندگاه", unit: "°C", type: "number", default: "125" },
    { id: "tja", label: "θJA بدون هیت‌سینک", unit: "°C/W", type: "number", default: "50" },
    { id: "tjc", label: "θJC", unit: "°C/W", type: "number", default: "5" },
    { id: "tcs", label: "θCS (خمیر حرارتی)", unit: "°C/W", type: "number", default: "0.5" }
  ],
  example: { values: { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" }, expect: ["PD = 3.56 W", "θSA ≤ 18.38 °C/W"], note: "مثال: 7805 از 12 V با جریان 500 mA." },
  invalid: { values: { Vin: "6", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" } },
  related: ["zener-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "ولتاژ ورودی", { positive: true });
  const Vout = num(input, "Vout", "ولتاژ خروجی", { positive: true });
  const IL = num(input, "IL", "جریان بار", { nonNegative: true });
  const Vdo = num(input, "Vdo", "ولتاژ افت", { nonNegative: true });
  const Iq = num(input, "Iq", "جریان سکون", { nonNegative: true, default: 0 });
  const Ta = num(input, "Ta", "دمای محیط", { min: -60, max: 150 });
  const Tjmax = num(input, "Tj", "حداکثر دمای پیوندگاه", { min: 50, max: 200 });
  const tja = num(input, "tja", "θJA", { positive: true });
  const tjc = num(input, "tjc", "θJC", { nonNegative: true, default: 0 });
  const tcs = num(input, "tcs", "θCS", { nonNegative: true, default: 0 });
  if (Vin < Vout + Vdo) fail(`ولتاژ ورودی ${fmt(Vin)} V کمتر از حداقل ${fmt(Vout + Vdo)} V (خروجی + ولتاژ افت) است، پس رگولاتور تنظیم نمی‌کند.`, "Vin");
  if (Tjmax <= Ta) fail("حداکثر دمای پیوندگاه باید بالاتر از دمای محیط باشد.", "Tj");
  const PD = (Vin - Vout) * IL + Vin * Iq;
  const eff = IL > 0 ? (Vout * IL) / (Vin * (IL + Iq)) : 0;
  const TjNoHs = Ta + PD * tja;
  const PDmax = (Tjmax - Ta) / tja;
  const steps = [
    `حاشیهٔ ولتاژ ${fmt(Vin - Vout - Vdo, 4)} V بالاتر از ولتاژ افت است، پس رگولاتور کار می‌کند.`,
    { text: "توان تلف‌شده (اختلاف ولتاژ × جریان + مصرف رگولاتور):", tex: `P_D = (${ntex(Vin)} - ${ntex(Vout)}) \\times ${ntex(IL)} + ${ntex(Vin)} \\times ${ntex(Iq)} = ${ntex(PD, 4)}\\ W` },
    { text: "بازده:", tex: `\\eta = \\frac{${ntex(Vout)} \\times ${ntex(IL)}}{${ntex(Vin)} \\times (${ntex(IL)} + ${ntex(Iq)})} = ${ntex(100 * eff, 4)}\\%` },
    { text: "دمای پیوندگاه بدون هیت‌سینک:", tex: `T_J = ${ntex(Ta)} + ${ntex(PD, 4)} \\times ${ntex(tja)} = ${ntex(TjNoHs, 4)}^\\circ C` }
  ];
  const results = [
    { label: "توان تلف‌شده", value: eng(PD, "W", 3), text: `PD = ${eng(PD, "W", 3)}` },
    { label: "بازده", value: `${fmt(100 * eff, 4)}%` },
    { label: "دمای پیوندگاه بدون هیت‌سینک", value: `${fmt(TjNoHs, 4)} °C` },
    { label: "حداکثر توان بدون هیت‌سینک", value: eng(PDmax, "W", 3) }
  ];
  let copy = `PD = ${eng(PD, "W", 3)}, η = ${fmt(100 * eff, 4)}%, Tj = ${fmt(TjNoHs, 4)} °C`;
  if (TjNoHs > Tjmax) {
    const tsa = (Tjmax - Ta) / PD - tjc - tcs;
    if (tsa <= 0) {
      steps.push("حتی با هیت‌سینک ایده‌آل نمی‌توان این توان را با ایمنی تلف کرد؛ از رگولاتور سوئیچینگ (باک) استفاده کنید یا ولتاژ ورودی را کاهش دهید.");
      results.push({ label: "حکم", value: "با رگولاتور خطی ممکن نیست: از رگولاتور سوئیچینگ استفاده کنید" });
    } else {
      steps.push({ text: "دما از حد بیشتر است، پس به هیت‌سینکی نیاز داریم که مقاومت حرارتی آن بیشتر از این مقدار نباشد:", tex: `\\theta_{SA} \\le \\frac{${ntex(Tjmax)} - ${ntex(Ta)}}{${ntex(PD, 4)}} - ${ntex(tjc)} - ${ntex(tcs)} = ${ntex(tsa, 4)}^\\circ C/W` });
      results.push({ label: "حکم", value: "نیاز به هیت‌سینک" }, { label: "حداکثر θSA هیت‌سینک", value: `${fmt(tsa, 4)} °C/W`, text: `θSA ≤ ${fmt(tsa, 4)} °C/W` });
      copy += `\nθSA ≤ ${fmt(tsa, 4)} °C/W`;
    }
  } else {
    steps.push("دما در حد مجاز است، پس هیت‌سینک لازم نیست (حاشیهٔ ایمنی حداقل 20 °C توصیه می‌شود).");
    results.push({ label: "حکم", value: TjNoHs > Tjmax - 20 ? "قابل قبول اما نزدیک به حد" : "نیاز به هیت‌سینک ندارد" });
  }
  return { results, steps, copy };
}
