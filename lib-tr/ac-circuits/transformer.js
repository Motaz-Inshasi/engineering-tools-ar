import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "İdeal transformatör: dönüş oranı, primer ve sekonder gerilim ve akımı, yansıyan empedans; isteğe bağlı verim ile giriş gücü ve kayıplar.",
  keywords: ["transformatör", "transformer", "dönüş oranı", "sarım sayısı", "primer", "sekonder", "yansıyan empedans", "yükseltici", "düşürücü"],
  formulas: [
    { label: "İdeal transformatör", tex: "a = \\frac{N_1}{N_2} = \\frac{V_1}{V_2} = \\frac{I_2}{I_1}" },
    { label: "Yansıyan empedans", tex: "Z_1' = a^2 Z_L" }
  ],
  inputs: [
    { id: "N1", label: "Primer sarım sayısı N1", type: "number", default: "1000" },
    { id: "N2", label: "Sekonder sarım sayısı N2", type: "number", default: "50" },
    { id: "V1", label: "Primer gerilimi V1", unit: "V", type: "number", default: "230" },
    { id: "RL", label: "Sekonderdeki yük direnci", unit: "Ω", type: "number", default: "5" },
    { id: "eff", label: "Verim (isteğe bağlı)", unit: "%", type: "number" }
  ],
  example: { values: { N1: "1000", N2: "50", V1: "230", RL: "5", eff: "" }, expect: ["V2 = 11.5 V", "I1 = 115 mA"], note: "Örnek: 230 V'tan 5 Ω yüke 20:1 düşürücü transformatör." },
  invalid: { values: { N1: "1000", N2: "0", V1: "230", RL: "5" } },
  related: ["three-phase", "complex-power", "max-power-transfer", "rectifier-ripple"]
};

export function solve(input) {
  const N1 = num(input, "N1", "Primer sarım sayısı", { positive: true });
  const N2 = num(input, "N2", "Sekonder sarım sayısı", { positive: true });
  const V1 = num(input, "V1", "Primer gerilimi", { positive: true });
  const RL = num(input, "RL", "Yük direnci", { positive: true });
  const eff = num(input, "eff", "Verim", { optional: true, positive: true, max: 100 });
  const a = N1 / N2;
  const V2 = V1 / a, I2 = V2 / RL, I1 = I2 / a, Zin = a * a * RL, P = V2 * I2;
  const kind = a > 1 ? "gerilim düşürücü" : a < 1 ? "gerilim yükseltici" : "izolasyon (1:1)";
  const steps = [
    { text: `Dönüş oranı (transformatör ${kind}):`, tex: `a = \\frac{N_1}{N_2} = \\frac{${ntex(N1)}}{${ntex(N2)}} = ${ntex(a, 6)}` },
    { text: "Sekonder gerilimi:", tex: `V_2 = \\frac{V_1}{a} = \\frac{${ntex(V1)}}{${ntex(a, 6)}} = ${ntex(V2, 6)}\\ V` },
    { text: "Önce yük akımı, ardından primer akımı (akım gerilimle ters orantılıdır):", tex: `I_2 = \\frac{V_2}{R_L} = ${ntex(I2, 6)}\\ A,\\quad I_1 = \\frac{I_2}{a} = ${ntex(I1, 6)}\\ A` },
    { text: "Kaynağın gördüğü empedans:", tex: `Z_{in} = a^2 R_L = ${ntex(a, 6)}^2 \\times ${ntex(RL)} = ${ntex(Zin, 6)}\\ \\Omega` },
    `İdeal transformatörde güç korunur: $V_1 I_1 = ${fmt(V1 * I1, 6)}$ W = $V_2 I_2 = ${fmt(P, 6)}$ W.`
  ];
  const results = [
    { label: "Dönüş oranı a", value: a, sig: 6 },
    { label: "Tür", value: kind },
    { label: "Sekonder gerilimi V2", value: eng(V2, "V", 4), text: `V2 = ${eng(V2, "V", 4)}` },
    { label: "Sekonder akımı I2", value: eng(I2, "A", 4) },
    { label: "Primer akımı I1", value: eng(I1, "A", 4), text: `I1 = ${eng(I1, "A", 4)}` },
    { label: "Yansıyan empedans", value: eng(Zin, "Ω", 4) },
    { label: "Yük gücü", value: eng(P, "W", 4) }
  ];
  if (eff !== null) {
    const Pin = P / (eff / 100);
    results.push({ label: "Giriş gücü", value: eng(Pin, "W", 4) }, { label: "Kayıplar", value: eng(Pin - P, "W", 4) }, { label: "Gerçek primer akımı", value: eng(Pin / V1, "A", 4) });
    steps.push({ text: `Verim ${fmt(eff)}%:`, tex: `P_{in} = \\frac{P_{out}}{\\eta} = ${ntex(Pin, 6)}\\ W,\\quad P_{loss} = ${ntex(Pin - P, 6)}\\ W` });
  }
  if (!isFinite(V2)) fail("Geçersiz değerler.", "N2");
  return { results, steps, copy: `V2 = ${eng(V2, "V", 4)}, I2 = ${eng(I2, "A", 4)}, I1 = ${eng(I1, "A", 4)}` };
}
