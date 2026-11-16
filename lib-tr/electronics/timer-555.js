import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "555 zamanlayıcıyı kararsız (astable) salınıcı ve tek kararlı (monostable) modlarında analiz edin: frekans, görev döngüsü, yükselme ve düşme süreleri ile darbe genişliği ve çıkış dalga biçimi.",
  keywords: ["555", "555 zamanlayıcı", "timer", "astable", "monostable", "Salınıcı", "Darbe", "Görev döngüsü", "duty cycle"],
  formulas: [
    { label: "Kararsız salınıcı", tex: "t_H = \\ln 2\\,(R_1 + R_2)C,\\quad t_L = \\ln 2\\,R_2 C,\\quad f = \\frac{1}{t_H + t_L} \\approx \\frac{1.44}{(R_1 + 2R_2)C}" },
    { label: "Tek kararlı", tex: "t = \\ln 3\\,RC \\approx 1.1\\,RC" }
  ],
  inputs: [
    { id: "mode", label: "Mod", type: "select", default: "astable", options: [["astable", "Kararsız (salınıcı)"], ["mono", "Tek kararlı (tek darbe)"]] },
    { id: "R1", label: "R1", unit: "Ω", type: "number", default: "1k", when: { mode: ["astable"] } },
    { id: "R2", label: "R2", unit: "Ω", type: "number", default: "10k", when: { mode: ["astable"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "100k", when: { mode: ["mono"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "100n" }
  ],
  example: { values: { mode: "astable", R1: "1k", R2: "10k", C: "100n" }, expect: ["f = 687 Hz", "52.38%"], note: "Örnek: R1 = 1 kΩ, R2 = 10 kΩ ve C = 100 nF." },
  invalid: { values: { mode: "astable", R1: "1k", R2: "0", C: "100n" } },
  related: ["rc-rl-transient", "pwm-servo", "capacitor-inductor-combination"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Mod", ["astable", "mono"], "astable");
  const C = num(input, "C", "C", { positive: true });
  const L2 = Math.LN2, L3 = Math.log(3);
  if (mode === "mono") {
    const R = num(input, "R", "R", { positive: true });
    const t = L3 * R * C;
    return {
      results: [{ label: "Darbe genişliği", value: eng(t, "s", 4), text: `t = ${eng(t, "s", 4)}` }],
      steps: [
        "Tetikleme darbesinde çıkış yükselir ve kondansatör R üzerinden Vcc'nin 2/3'üne ulaşana kadar dolar; ardından çıkış düşer.",
        { text: "0'dan ⅔Vcc'ye şarj süresi:", tex: `t = RC\\ln 3 = ${ntex(R)} \\times ${ntex(C)} \\times 1.0986 = ${ntex(t, 5)}\\ s` },
        "Sonuç besleme gerilimine bağlı değildir, çünkü karşılaştırıcı eşikleri onun oranıdır."
      ],
      copy: `t = ${eng(t, "s", 4)}`
    };
  }
  const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
  if (R1 < 1) fail("R1 çok küçükse boşaltma pinine zarar verebilir (en az 1 kΩ tercih edilir).", "R1");
  const tH = L2 * (R1 + R2) * C, tL = L2 * R2 * C, T = tH + tL, f = 1 / T, D = tH / T;
  const steps = [
    "Kondansatör gerilimi ⅓Vcc ile ⅔Vcc arasında salınır: çıkış yüksekken R1 + R2 üzerinden şarj olur, çıkış düşükken yalnızca R2 üzerinden boşalır.",
    { text: "Yükselme ve düşme süreleri:", tex: `t_H = \\ln 2 (${ntex(R1)} + ${ntex(R2)})(${ntex(C)}) = ${ntex(tH, 5)}\\ s,\\quad t_L = \\ln 2 \\cdot ${ntex(R2)} \\cdot ${ntex(C)} = ${ntex(tL, 5)}\\ s` },
    { text: "Frekans ve görev döngüsü:", tex: `f = \\frac{1}{t_H + t_L} = ${ntex(f, 5)}\\ Hz,\\quad D = \\frac{t_H}{t_H + t_L} = ${ntex(100 * D, 4)}\\%` },
    "Bu devrede görev döngüsü her zaman %50'den büyüktür; bundan küçük değer elde etmek için R2'ye paralel bir diyot eklenir."
  ];
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    pts.push([t0, 0], [t0, 1], [t0 + tH, 1], [t0 + tH, 0], [t0 + T, 0]);
  }
  return {
    results: [
      { label: "Frekans", value: eng(f, "Hz", 4), text: `f = ${eng(f, "Hz", 4)}` },
      { label: "Görev döngüsü", value: `${fmt(100 * D, 4)}%`, text: `D = ${fmt(100 * D, 4)}%` },
      { label: "Yükselme süresi tH", value: eng(tH, "s", 4) },
      { label: "Düşme süresi tL", value: eng(tL, "s", 4) },
      { label: "Periyot T", value: eng(T, "s", 4) }
    ],
    blocks: [{ type: "plot", title: "Çıkış dalga biçimi (üç periyot)", xLabel: "t (s)", yLabel: "Çıkış", yMin: -0.2, yMax: 1.3, series: [{ name: "Çıkış", points: pts }] }],
    steps, copy: `f = ${eng(f, "Hz", 4)}, D = ${fmt(100 * D, 4)}%, tH = ${eng(tH, "s", 4)}, tL = ${eng(tL, "s", 4)}`
  };
}
