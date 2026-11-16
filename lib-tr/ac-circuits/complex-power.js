import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Alternatif akımda bileşik güç: aktif güç, reaktif güç, görünür güç, güç faktörü ve güç üçgeni; güç faktörünü istenen bir değere yükseltmek için gereken düzeltme kondansatörünün hesabı.",
  keywords: ["Bileşik güç", "Güç faktörü", "power factor", "Güç faktörü düzeltmesi", "Güç üçgeni", "Aktif güç", "Reaktif güç", "kVAR", "Düzeltme kondansatörü"],
  formulas: [
    { label: "Güç üçgeni", tex: "S = V I^* = P + jQ,\\quad P = VI\\cos\\theta,\\quad Q = VI\\sin\\theta,\\quad |S|^2 = P^2 + Q^2" },
    { label: "Düzeltme kondansatörü", tex: "Q_C = P(\\tan\\theta_1 - \\tan\\theta_2),\\qquad C = \\frac{Q_C}{\\omega V^2}" }
  ],
  inputs: [
    { id: "mode", label: "Veriler", type: "select", default: "ppf", options: [["ppf", "Aktif güç ve güç faktörü"], ["vi", "Gerilim, akım ve faz açısı"]] },
    { id: "V", label: "Gerilim (etkin)", unit: "V", type: "number", default: "400" },
    { id: "P", label: "Aktif güç P", unit: "W", type: "number", default: "50k", when: { mode: ["ppf"] } },
    { id: "pf", label: "Mevcut güç faktörü", type: "number", default: "0.7", when: { mode: ["ppf"] } },
    { id: "I", label: "Akım (etkin)", unit: "A", type: "number", default: "10", when: { mode: ["vi"] } },
    { id: "theta", label: "Açı θ = θv − θi", unit: "°", type: "number", default: "36.87", when: { mode: ["vi"] }, help: "Endüktif yük için pozitif (akım geride)." },
    { id: "nature", label: "Yük türü", type: "select", default: "lag", options: [["lag", "Endüktif (geride)"], ["lead", "Kapasitif (önde)"]], when: { mode: ["ppf"] } },
    { id: "target", label: "Hedef güç faktörü (isteğe bağlı)", type: "number", default: "0.95" },
    { id: "f", label: "Şebeke frekansı", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { mode: "ppf", V: "400", P: "50k", pf: "0.7", nature: "lag", target: "0.95", f: "50" }, expect: ["Qc = 34.58 kVAR"], note: "Örnek: 0.7 geride güç faktörlü 50 kW yük, 0.95 değerine düzeltilir." },
  invalid: { values: { mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" } },
  related: ["rlc-circuit", "three-phase", "phasor", "transformer"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Veriler", ["ppf", "vi"], "ppf");
  const V = num(input, "V", "Gerilim", { positive: true });
  let P, Q, th;
  const steps = [];
  if (mode === "ppf") {
    P = num(input, "P", "Aktif güç", { positive: true });
    const pf = num(input, "pf", "Güç faktörü", { positive: true, max: 1 });
    const lag = choice(input, "nature", "Yük türü", ["lag", "lead"], "lag") === "lag";
    th = (lag ? 1 : -1) * Math.acos(pf);
    Q = P * Math.tan(th);
    steps.push({ text: "Güç faktöründen güç açısı:", tex: `\\theta = ${lag ? "" : "-"}\\cos^{-1}(${ntex(pf)}) = ${ntex((th * 180) / Math.PI, 5)}^\\circ` });
    steps.push({ text: "Reaktif ve görünür güç:", tex: `Q = P\\tan\\theta = ${ntex(Q, 6)}\\ VAR,\\quad |S| = \\frac{P}{PF} = ${ntex(P / pf, 6)}\\ VA` });
  } else {
    const I = num(input, "I", "Akım", { positive: true });
    const deg = num(input, "theta", "Açı", { min: -90, max: 90 });
    th = (deg * Math.PI) / 180;
    P = V * I * Math.cos(th);
    Q = V * I * Math.sin(th);
    steps.push({ text: "Gerilim, akım ve açıdan:", tex: `P = VI\\cos\\theta = ${ntex(P, 6)}\\ W,\\quad Q = VI\\sin\\theta = ${ntex(Q, 6)}\\ VAR` });
  }
  const S = Math.hypot(P, Q), pf = P / S, I = S / V;
  const nature = Math.abs(Q) < 1e-12 * S ? "Dirençli" : Q > 0 ? "Endüktif (geride)" : "Kapasitif (önde)";
  const results = [
    { label: "Aktif güç P", value: eng(P, "W", 5) },
    { label: "Reaktif güç Q", value: eng(Q, "VAR", 5) },
    { label: "Görünür güç |S|", value: eng(S, "VA", 5) },
    { label: "Güç faktörü", value: `${fmt(pf, 5)} ${nature}` },
    { label: "Akım", value: eng(I, "A", 5) }
  ];
  const target = num(input, "target", "Hedef güç faktörü", { optional: true, positive: true, max: 1 });
  let copy = `P = ${eng(P, "W", 5)}, Q = ${eng(Q, "VAR", 5)}, S = ${eng(S, "VA", 5)}, PF = ${fmt(pf, 5)}`;
  const tri = [[0, 0], [P, 0], [P, Q], [0, 0]];
  const series = [{ name: "Güç üçgeni", points: tri }];
  if (target !== null) {
    if (Q <= 0) fail("Yük endüktif değil, bu nedenle kondansatörle düzeltme uygulanamaz.", "target");
    if (target <= pf) fail(`Hedef katsayı mevcut değerden büyük olmalıdır (${fmt(pf, 4)}).`, "target");
    const f = num(input, "f", "Frekans", { positive: true });
    const th2 = Math.acos(target);
    const Q2 = P * Math.tan(th2), Qc = Q - Q2;
    const w = 2 * Math.PI * f;
    const Cap = Qc / (w * V * V);
    const I2 = P / target / V;
    steps.push({ text: "Düzeltmeden sonra gereken reaktif güç:", tex: `Q_2 = P\\tan(\\cos^{-1}${ntex(target)}) = ${ntex(Q2, 6)}\\ VAR` });
    steps.push({ text: "Kondansatörün üretmesi gereken fark:", tex: `Q_C = Q - Q_2 = ${ntex(Qc, 6)}\\ VAR,\\quad C = \\frac{Q_C}{\\omega V^2} = \\frac{${ntex(Qc, 6)}}{${ntex(w, 6)} \\times ${ntex(V)}^2} = ${ntex(Cap, 6)}\\ F` });
    steps.push(`Düzeltmeden sonra, aynı aktif güç için akım ${eng(I, "A", 4)} değerinden ${eng(I2, "A", 4)} değerine düşer. Değer, girilen gerilimde tek fazlı tek bir kondansatör içindir.`);
    results.push({ label: "Gerekli kondansatör gücü", value: eng(Qc, "VAR", 4), text: `Qc = ${eng(Qc, "VAR", 4)}` }, { label: "Kondansatör kapasitesi", value: eng(Cap, "F", 4) }, { label: "Düzeltmeden sonra akım", value: eng(I2, "A", 4) });
    copy += `\nQc = ${eng(Qc, "VAR", 4)}, C = ${eng(Cap, "F", 4)}`;
    series.push({ name: "Düzeltmeden sonra", points: [[0, 0], [P, Q2]], dashed: true });
  }
  return { results, steps, copy, blocks: [{ type: "plot", title: "Güç üçgeni (P yatay, Q dikey)", xLabel: "P (W)", yLabel: "Q (VAR)", includeZero: true, series }] };
}
