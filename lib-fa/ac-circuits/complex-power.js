import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "توان مختلط در مدارهای جریان متناوب: توان اکتیو، راکتیو و ظاهری، ضریب توان و مثلث توان، و محاسبه خازن اصلاح ضریب توان برای هر مقدار هدف.",
  keywords: ["توان مختلط", "ضریب توان", "power factor", "اصلاح ضریب توان", "مثلث توان", "توان اکتیو", "توان راکتیو", "kVAR", "خازن اصلاحی"],
  formulas: [
    { label: "مثلث توان", tex: "S = V I^* = P + jQ,\\quad P = VI\\cos\\theta,\\quad Q = VI\\sin\\theta,\\quad |S|^2 = P^2 + Q^2" },
    { label: "خازن اصلاحی", tex: "Q_C = P(\\tan\\theta_1 - \\tan\\theta_2),\\qquad C = \\frac{Q_C}{\\omega V^2}" }
  ],
  inputs: [
    { id: "mode", label: "داده‌های ورودی", type: "select", default: "ppf", options: [["ppf", "توان اکتیو و ضریب توان"], ["vi", "ولتاژ، جریان و زاویه فاز"]] },
    { id: "V", label: "ولتاژ (مؤثر)", unit: "V", type: "number", default: "400" },
    { id: "P", label: "توان اکتیو P", unit: "W", type: "number", default: "50k", when: { mode: ["ppf"] } },
    { id: "pf", label: "ضریب توان فعلی", type: "number", default: "0.7", when: { mode: ["ppf"] } },
    { id: "I", label: "جریان (مؤثر)", unit: "A", type: "number", default: "10", when: { mode: ["vi"] } },
    { id: "theta", label: "زاویه θ = θv − θi", unit: "°", type: "number", default: "36.87", when: { mode: ["vi"] }, help: "برای بار سلفی مثبت است (جریان پسفاز است)." },
    { id: "nature", label: "نوع بار", type: "select", default: "lag", options: [["lag", "سلفی (پسفاز)"], ["lead", "خازنی (پیشفاز)"]], when: { mode: ["ppf"] } },
    { id: "target", label: "ضریب توان هدف (اختیاری)", type: "number", default: "0.95" },
    { id: "f", label: "فرکانس شبکه", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { mode: "ppf", V: "400", P: "50k", pf: "0.7", nature: "lag", target: "0.95", f: "50" }, expect: ["Qc = 34.58 kVAR"], note: "مثال: باری 50 کیلووات با ضریب توان 0.7 پسفاز که به 0.95 اصلاح می‌شود." },
  invalid: { values: { mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" } },
  related: ["rlc-circuit", "three-phase", "phasor", "transformer"]
};

export function solve(input) {
  const mode = choice(input, "mode", "داده‌های ورودی", ["ppf", "vi"], "ppf");
  const V = num(input, "V", "ولتاژ", { positive: true });
  let P, Q, th;
  const steps = [];
  if (mode === "ppf") {
    P = num(input, "P", "توان اکتیو", { positive: true });
    const pf = num(input, "pf", "ضریب توان", { positive: true, max: 1 });
    const lag = choice(input, "nature", "نوع بار", ["lag", "lead"], "lag") === "lag";
    th = (lag ? 1 : -1) * Math.acos(pf);
    Q = P * Math.tan(th);
    steps.push({ text: "زاویه توان از روی ضریب توان:", tex: `\\theta = ${lag ? "" : "-"}\\cos^{-1}(${ntex(pf)}) = ${ntex((th * 180) / Math.PI, 5)}^\\circ` });
    steps.push({ text: "توان راکتیو و ظاهری:", tex: `Q = P\\tan\\theta = ${ntex(Q, 6)}\\ VAR,\\quad |S| = \\frac{P}{PF} = ${ntex(P / pf, 6)}\\ VA` });
  } else {
    const I = num(input, "I", "جریان", { positive: true });
    const deg = num(input, "theta", "زاویه", { min: -90, max: 90 });
    th = (deg * Math.PI) / 180;
    P = V * I * Math.cos(th);
    Q = V * I * Math.sin(th);
    steps.push({ text: "از روی ولتاژ، جریان و زاویه:", tex: `P = VI\\cos\\theta = ${ntex(P, 6)}\\ W,\\quad Q = VI\\sin\\theta = ${ntex(Q, 6)}\\ VAR` });
  }
  const S = Math.hypot(P, Q), pf = P / S, I = S / V;
  const nature = Math.abs(Q) < 1e-12 * S ? "مقاومتی" : Q > 0 ? "سلفی (پسفاز)" : "خازنی (پیشفاز)";
  const results = [
    { label: "توان اکتیو P", value: eng(P, "W", 5) },
    { label: "توان راکتیو Q", value: eng(Q, "VAR", 5) },
    { label: "توان ظاهری |S|", value: eng(S, "VA", 5) },
    { label: "ضریب توان", value: `${fmt(pf, 5)} ${nature}` },
    { label: "جریان", value: eng(I, "A", 5) }
  ];
  const target = num(input, "target", "ضریب توان هدف", { optional: true, positive: true, max: 1 });
  let copy = `P = ${eng(P, "W", 5)}, Q = ${eng(Q, "VAR", 5)}, S = ${eng(S, "VA", 5)}, PF = ${fmt(pf, 5)}`;
  const tri = [[0, 0], [P, 0], [P, Q], [0, 0]];
  const series = [{ name: "مثلث توان", points: tri }];
  if (target !== null) {
    if (Q <= 0) fail("بار سلفی نیست، بنابراین اصلاح با خازن کاربرد ندارد.", "target");
    if (target <= pf) fail(`ضریب توان هدف باید از ضریب توان فعلی (${fmt(pf, 4)}) بزرگ‌تر باشد.`, "target");
    const f = num(input, "f", "فرکانس", { positive: true });
    const th2 = Math.acos(target);
    const Q2 = P * Math.tan(th2), Qc = Q - Q2;
    const w = 2 * Math.PI * f;
    const Cap = Qc / (w * V * V);
    const I2 = P / target / V;
    steps.push({ text: "توان راکتیو مورد نیاز پس از اصلاح:", tex: `Q_2 = P\\tan(\\cos^{-1}${ntex(target)}) = ${ntex(Q2, 6)}\\ VAR` });
    steps.push({ text: "خازن باید تفاوت را تأمین کند:", tex: `Q_C = Q - Q_2 = ${ntex(Qc, 6)}\\ VAR,\\quad C = \\frac{Q_C}{\\omega V^2} = \\frac{${ntex(Qc, 6)}}{${ntex(w, 6)} \\times ${ntex(V)}^2} = ${ntex(Cap, 6)}\\ F` });
    steps.push(`پس از اصلاح، برای همان توان اکتیو، جریان از ${eng(I, "A", 4)} به ${eng(I2, "A", 4)} کاهش می‌یابد. این مقدار برای یک خازن واحد روی ولتاژ ورودی (تک‌فاز) است.`);
    results.push({ label: "توان خازن مورد نیاز", value: eng(Qc, "VAR", 4), text: `Qc = ${eng(Qc, "VAR", 4)}` }, { label: "ظرفیت خازن", value: eng(Cap, "F", 4) }, { label: "جریان پس از اصلاح", value: eng(I2, "A", 4) });
    copy += `\nQc = ${eng(Qc, "VAR", 4)}, C = ${eng(Cap, "F", 4)}`;
    series.push({ name: "پس از اصلاح", points: [[0, 0], [P, Q2]], dashed: true });
  }
  return { results, steps, copy, blocks: [{ type: "plot", title: "مثلث توان (P افقی، Q عمودی)", xLabel: "P (W)", yLabel: "Q (VAR)", includeZero: true, series }] };
}
