import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Doğrusal bir gerilim regülatörünü (7805 veya LDO gibi) kontrol edin: düşme payı, harcanan güç, verim, eklem sıcaklığı ve soğutucu için gereken termal direnç.",
  keywords: ["Gerilim regülatörü", "voltage regulator", "LDO", "7805", "Düşme gerilimi", "dropout", "Soğutucu", "heatsink", "Eklem sıcaklığı"],
  formulas: [
    { label: "Güç ve verim", tex: "P_D = (V_{in} - V_{out})I_L + V_{in}I_Q,\\qquad \\eta = \\frac{V_{out}I_L}{V_{in}(I_L + I_Q)}" },
    { label: "Isı", tex: "T_J = T_A + P_D\\,\\theta_{JA},\\qquad \\theta_{SA,max} = \\frac{T_{J,max} - T_A}{P_D} - \\theta_{JC} - \\theta_{CS}" }
  ],
  inputs: [
    { id: "Vin", label: "Giriş gerilimi (en yüksek değer)", unit: "V", type: "number", default: "12" },
    { id: "Vout", label: "Çıkış gerilimi", unit: "V", type: "number", default: "5" },
    { id: "IL", label: "Yük akımı", unit: "A", type: "number", default: "500m" },
    { id: "Vdo", label: "Düşme gerilimi (dropout)", unit: "V", type: "number", default: "2" },
    { id: "Iq", label: "Bekleme akımı Iq", unit: "A", type: "number", default: "5m" },
    { id: "Ta", label: "Ortam sıcaklığı", unit: "°C", type: "number", default: "40" },
    { id: "Tj", label: "En yüksek eklem sıcaklığı", unit: "°C", type: "number", default: "125" },
    { id: "tja", label: "θJA (soğutucusuz)", unit: "°C/W", type: "number", default: "50" },
    { id: "tjc", label: "θJC", unit: "°C/W", type: "number", default: "5" },
    { id: "tcs", label: "θCS (termal macun)", unit: "°C/W", type: "number", default: "0.5" }
  ],
  example: { values: { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" }, expect: ["PD = 3.56 W", "θSA ≤ 18.38 °C/W"], note: "Örnek: 500 mA akımla 12 V'tan 7805." },
  invalid: { values: { Vin: "6", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" } },
  related: ["zener-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vin = num(input, "Vin", "Giriş gerilimi", { positive: true });
  const Vout = num(input, "Vout", "Çıkış gerilimi", { positive: true });
  const IL = num(input, "IL", "Yük akımı", { nonNegative: true });
  const Vdo = num(input, "Vdo", "Düşme gerilimi", { nonNegative: true });
  const Iq = num(input, "Iq", "Bekleme akımı", { nonNegative: true, default: 0 });
  const Ta = num(input, "Ta", "Ortam sıcaklığı", { min: -60, max: 150 });
  const Tjmax = num(input, "Tj", "En yüksek eklem sıcaklığı", { min: 50, max: 200 });
  const tja = num(input, "tja", "θJA", { positive: true });
  const tjc = num(input, "tjc", "θJC", { nonNegative: true, default: 0 });
  const tcs = num(input, "tcs", "θCS", { nonNegative: true, default: 0 });
  if (Vin < Vout + Vdo) fail(`Giriş gerilimi ${fmt(Vin)} V, minimum ${fmt(Vout + Vdo)} V'un (çıkış + düşme gerilimi) altında; regülatör gerilimi düzenleyemez.`, "Vin");
  if (Tjmax <= Ta) fail("En yüksek eklem sıcaklığı ortam sıcaklığından büyük olmalıdır.", "Tj");
  const PD = (Vin - Vout) * IL + Vin * Iq;
  const eff = IL > 0 ? (Vout * IL) / (Vin * (IL + Iq)) : 0;
  const TjNoHs = Ta + PD * tja;
  const PDmax = (Tjmax - Ta) / tja;
  const steps = [
    `Düşme geriliminin üzerinde ${fmt(Vin - Vout - Vdo, 4)} V gerilim payı var; regülatör çalışır.`,
    { text: "Harcanan güç (gerilim farkı × akım + regülatörün tüketimi):", tex: `P_D = (${ntex(Vin)} - ${ntex(Vout)}) \\times ${ntex(IL)} + ${ntex(Vin)} \\times ${ntex(Iq)} = ${ntex(PD, 4)}\\ W` },
    { text: "Verim:", tex: `\\eta = \\frac{${ntex(Vout)} \\times ${ntex(IL)}}{${ntex(Vin)} \\times (${ntex(IL)} + ${ntex(Iq)})} = ${ntex(100 * eff, 4)}\\%` },
    { text: "Soğutucusuz eklem sıcaklığı:", tex: `T_J = ${ntex(Ta)} + ${ntex(PD, 4)} \\times ${ntex(tja)} = ${ntex(TjNoHs, 4)}^\\circ C` }
  ];
  const results = [
    { label: "Harcanan güç", value: eng(PD, "W", 3), text: `PD = ${eng(PD, "W", 3)}` },
    { label: "Verim", value: `${fmt(100 * eff, 4)}%` },
    { label: "Soğutucusuz eklem sıcaklığı", value: `${fmt(TjNoHs, 4)} °C` },
    { label: "Soğutucusuz en yüksek güç", value: eng(PDmax, "W", 3) }
  ];
  let copy = `PD = ${eng(PD, "W", 3)}, η = ${fmt(100 * eff, 4)}%, Tj = ${fmt(TjNoHs, 4)} °C`;
  if (TjNoHs > Tjmax) {
    const tsa = (Tjmax - Ta) / PD - tjc - tcs;
    if (tsa <= 0) {
      steps.push("İdeal bir soğutucu olsa bile bu güç güvenle dağıtılamaz; anahtarlamalı regülatör (Buck) kullanın veya giriş gerilimini düşürün.");
      results.push({ label: "Karar", value: "Lineer regülatörle mümkün değil: anahtarlamalı regülatör kullanın" });
    } else {
      steps.push({ text: "Sıcaklık sınırı aşıyor; termal direnci şu değeri aşmayan bir soğutucuya ihtiyaç var:", tex: `\\theta_{SA} \\le \\frac{${ntex(Tjmax)} - ${ntex(Ta)}}{${ntex(PD, 4)}} - ${ntex(tjc)} - ${ntex(tcs)} = ${ntex(tsa, 4)}^\\circ C/W` });
      results.push({ label: "Karar", value: "Soğutucuya ihtiyaç var" }, { label: "Soğutucunun en büyük θSA değeri", value: `${fmt(tsa, 4)} °C/W`, text: `θSA ≤ ${fmt(tsa, 4)} °C/W` });
      copy += `\nθSA ≤ ${fmt(tsa, 4)} °C/W`;
    }
  } else {
    steps.push("Sıcaklık sınır içinde; soğutucuya gerek yok (en az 20 °C güvenlik payı tercih edilir).");
    results.push({ label: "Karar", value: TjNoHs > Tjmax - 20 ? "Kabul edilebilir, ancak sınıra yakın" : "Soğutucuya gerek yok" });
  }
  return { results, steps, copy };
}
