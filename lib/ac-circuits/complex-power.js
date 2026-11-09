import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "القدرة المركبة في التيار المتردد: القدرة الفعالة وغير الفعالة والظاهرية ومعامل القدرة ومثلث القدرة، وحساب مكثف تصحيح معامل القدرة إلى أي قيمة مستهدفة.",
  keywords: ["القدرة المركبة", "معامل القدرة", "power factor", "تصحيح معامل القدرة", "مثلث القدرة", "قدرة فعالة", "قدرة غير فعالة", "kVAR", "مكثف تصحيح"],
  formulas: [
    { label: "مثلث القدرة", tex: "S = V I^* = P + jQ,\\quad P = VI\\cos\\theta,\\quad Q = VI\\sin\\theta,\\quad |S|^2 = P^2 + Q^2" },
    { label: "مكثف التصحيح", tex: "Q_C = P(\\tan\\theta_1 - \\tan\\theta_2),\\qquad C = \\frac{Q_C}{\\omega V^2}" }
  ],
  inputs: [
    { id: "mode", label: "المعطيات", type: "select", default: "ppf", options: [["ppf", "القدرة الفعالة ومعامل القدرة"], ["vi", "الجهد والتيار وزاوية الطور"]] },
    { id: "V", label: "الجهد (فعال)", unit: "V", type: "number", default: "400" },
    { id: "P", label: "القدرة الفعالة P", unit: "W", type: "number", default: "50k", when: { mode: ["ppf"] } },
    { id: "pf", label: "معامل القدرة الحالي", type: "number", default: "0.7", when: { mode: ["ppf"] } },
    { id: "I", label: "التيار (فعال)", unit: "A", type: "number", default: "10", when: { mode: ["vi"] } },
    { id: "theta", label: "زاوية θ = θv − θi", unit: "°", type: "number", default: "36.87", when: { mode: ["vi"] }, help: "موجبة للحمل الحثي (التيار متأخر)." },
    { id: "nature", label: "طبيعة الحمل", type: "select", default: "lag", options: [["lag", "حثي (متأخر)"], ["lead", "سعوي (متقدم)"]], when: { mode: ["ppf"] } },
    { id: "target", label: "معامل القدرة المستهدف (اختياري)", type: "number", default: "0.95" },
    { id: "f", label: "تردد الشبكة", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { mode: "ppf", V: "400", P: "50k", pf: "0.7", nature: "lag", target: "0.95", f: "50" }, expect: ["Qc = 34.58 kVAR"], note: "مثال: حمل 50 kW بمعامل قدرة 0.7 متأخر يُصحَّح إلى 0.95." },
  invalid: { values: { mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" } },
  related: ["rlc-circuit", "three-phase", "phasor", "transformer"]
};

export function solve(input) {
  const mode = choice(input, "mode", "المعطيات", ["ppf", "vi"], "ppf");
  const V = num(input, "V", "الجهد", { positive: true });
  let P, Q, th;
  const steps = [];
  if (mode === "ppf") {
    P = num(input, "P", "القدرة الفعالة", { positive: true });
    const pf = num(input, "pf", "معامل القدرة", { positive: true, max: 1 });
    const lag = choice(input, "nature", "طبيعة الحمل", ["lag", "lead"], "lag") === "lag";
    th = (lag ? 1 : -1) * Math.acos(pf);
    Q = P * Math.tan(th);
    steps.push({ text: "زاوية القدرة من معامل القدرة:", tex: `\\theta = ${lag ? "" : "-"}\\cos^{-1}(${ntex(pf)}) = ${ntex((th * 180) / Math.PI, 5)}^\\circ` });
    steps.push({ text: "القدرة غير الفعالة والظاهرية:", tex: `Q = P\\tan\\theta = ${ntex(Q, 6)}\\ VAR,\\quad |S| = \\frac{P}{PF} = ${ntex(P / pf, 6)}\\ VA` });
  } else {
    const I = num(input, "I", "التيار", { positive: true });
    const deg = num(input, "theta", "الزاوية", { min: -90, max: 90 });
    th = (deg * Math.PI) / 180;
    P = V * I * Math.cos(th);
    Q = V * I * Math.sin(th);
    steps.push({ text: "من الجهد والتيار والزاوية:", tex: `P = VI\\cos\\theta = ${ntex(P, 6)}\\ W,\\quad Q = VI\\sin\\theta = ${ntex(Q, 6)}\\ VAR` });
  }
  const S = Math.hypot(P, Q), pf = P / S, I = S / V;
  const nature = Math.abs(Q) < 1e-12 * S ? "مقاومي" : Q > 0 ? "حثي (متأخر)" : "سعوي (متقدم)";
  const results = [
    { label: "القدرة الفعالة P", value: eng(P, "W", 5) },
    { label: "القدرة غير الفعالة Q", value: eng(Q, "VAR", 5) },
    { label: "القدرة الظاهرية |S|", value: eng(S, "VA", 5) },
    { label: "معامل القدرة", value: `${fmt(pf, 5)} ${nature}` },
    { label: "التيار", value: eng(I, "A", 5) }
  ];
  const target = num(input, "target", "معامل القدرة المستهدف", { optional: true, positive: true, max: 1 });
  let copy = `P = ${eng(P, "W", 5)}, Q = ${eng(Q, "VAR", 5)}, S = ${eng(S, "VA", 5)}, PF = ${fmt(pf, 5)}`;
  const tri = [[0, 0], [P, 0], [P, Q], [0, 0]];
  const series = [{ name: "مثلث القدرة", points: tri }];
  if (target !== null) {
    if (Q <= 0) fail("الحمل ليس حثياً، فالتصحيح بالمكثفات لا ينطبق.", "target");
    if (target <= pf) fail(`المعامل المستهدف يجب أن يكون أكبر من الحالي (${fmt(pf, 4)}).`, "target");
    const f = num(input, "f", "التردد", { positive: true });
    const th2 = Math.acos(target);
    const Q2 = P * Math.tan(th2), Qc = Q - Q2;
    const w = 2 * Math.PI * f;
    const Cap = Qc / (w * V * V);
    const I2 = P / target / V;
    steps.push({ text: "القدرة غير الفعالة المطلوبة بعد التصحيح:", tex: `Q_2 = P\\tan(\\cos^{-1}${ntex(target)}) = ${ntex(Q2, 6)}\\ VAR` });
    steps.push({ text: "المكثف يجب أن يولّد الفرق:", tex: `Q_C = Q - Q_2 = ${ntex(Qc, 6)}\\ VAR,\\quad C = \\frac{Q_C}{\\omega V^2} = \\frac{${ntex(Qc, 6)}}{${ntex(w, 6)} \\times ${ntex(V)}^2} = ${ntex(Cap, 6)}\\ F` });
    steps.push(`بعد التصحيح ينخفض التيار من ${eng(I, "A", 4)} إلى ${eng(I2, "A", 4)} للقدرة الفعالة نفسها. القيمة لمكثف واحد على الجهد المدخل (أحادي الطور).`);
    results.push({ label: "قدرة المكثف المطلوبة", value: eng(Qc, "VAR", 4), text: `Qc = ${eng(Qc, "VAR", 4)}` }, { label: "سعة المكثف", value: eng(Cap, "F", 4) }, { label: "التيار بعد التصحيح", value: eng(I2, "A", 4) });
    copy += `\nQc = ${eng(Qc, "VAR", 4)}, C = ${eng(Cap, "F", 4)}`;
    series.push({ name: "بعد التصحيح", points: [[0, 0], [P, Q2]], dashed: true });
  }
  return { results, steps, copy, blocks: [{ type: "plot", title: "مثلث القدرة (P أفقياً، Q رأسياً)", xLabel: "P (W)", yLabel: "Q (VAR)", includeZero: true, series }] };
}
