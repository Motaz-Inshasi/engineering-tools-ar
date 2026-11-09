import { choice, numList, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["inv", "عاكس"], ["noninv", "غير عاكس"], ["sum", "جامع عاكس"], ["diff", "تفاضلي (طرح)"], ["integ", "مكامل"], ["deriv", "مفاضل"]];

export const meta = {
  description: "احسب كسب مكبر العمليات المثالي في الدوائر الشائعة: العاكس وغير العاكس والجامع والطارح والمكامل والمفاضل، مع جهد الخرج وتحذير التشبع عند تجاوز جهد التغذية.",
  keywords: ["مكبر العمليات", "op-amp", "أوب أمب", "مكبر عاكس", "مكبر غير عاكس", "جامع", "مكامل", "مفاضل", "كسب"],
  formulas: [
    { label: "العاكس وغير العاكس", tex: "A_{inv} = -\\frac{R_f}{R_{in}},\\qquad A_{non} = 1 + \\frac{R_f}{R_{in}}" },
    { label: "الجامع والمكامل والمفاضل (لإشارة جيبية)", tex: "V_o = -R_f\\sum\\frac{V_i}{R_i},\\qquad |A_{int}| = \\frac{1}{\\omega RC},\\qquad |A_{diff}| = \\omega RC" }
  ],
  inputs: [
    { id: "cfg", label: "الدائرة", type: "select", default: "inv", options: CFG },
    { id: "Rf", label: "مقاومة التغذية الراجعة Rf", unit: "Ω", type: "number", default: "100k", when: { cfg: ["inv", "noninv", "sum", "diff"] } },
    { id: "Rin", label: "مقاومة الدخل Rin", unit: "Ω", type: "number", default: "10k", when: { cfg: ["inv", "noninv", "diff"] } },
    { id: "Vin", label: "جهد الدخل Vin", unit: "V", type: "number", default: "0.5", when: { cfg: ["inv", "noninv", "integ", "deriv"] }, help: "للمكامل والمفاضل: سعة الإشارة الجيبية." },
    { id: "V2", label: "جهد الدخل الثاني V2 (يطرح منه V1 = Vin)", unit: "V", type: "number", default: "1", when: { cfg: ["diff"] } },
    { id: "V1d", label: "جهد الدخل V1", unit: "V", type: "number", default: "0.5", when: { cfg: ["diff"] } },
    { id: "Rs", label: "مقاومات الدخل للجامع", unit: "Ω", type: "text", default: "10k, 20k, 50k", when: { cfg: ["sum"] } },
    { id: "Vs", label: "جهود الدخل للجامع", unit: "V", type: "text", default: "1, 0.5, -2", when: { cfg: ["sum"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k", when: { cfg: ["integ", "deriv"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "10n", when: { cfg: ["integ", "deriv"] } },
    { id: "f", label: "تردد الإشارة", unit: "Hz", type: "number", default: "1k", when: { cfg: ["integ", "deriv"] } },
    { id: "Vsat", label: "جهد التغذية ±Vcc", unit: "V", type: "number", default: "15" }
  ],
  example: { values: { cfg: "inv", Rf: "100k", Rin: "10k", Vin: "0.5", Vsat: "15" }, expect: ["A = -10", "Vout = -5 V"], note: "مثال: مكبر عاكس بكسب −10 ودخل 0.5 V." },
  invalid: { values: { cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" } },
  related: ["bjt-bias", "passive-filter", "adc", "sensor-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "الدائرة", CFG.map((c) => c[0]), "inv");
  const Vsat = num(input, "Vsat", "جهد التغذية", { positive: true });
  const steps = ["نفترض مكبراً مثالياً: كسب لا نهائي، فلا يمر تيار في طرفي الدخل وجهداهما متساويان (القصر الافتراضي)."];
  let A = null, Vout, gainText;
  if (cfg === "inv" || cfg === "noninv") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true }), Vin = num(input, "Vin", "Vin");
    A = cfg === "inv" ? -Rf / Rin : 1 + Rf / Rin;
    Vout = A * Vin;
    steps.push({ text: cfg === "inv" ? "الطرف العاكس عند أرضي افتراضي، فتيار الدخل يمر كله في Rf:" : "جهد الطرف العاكس يساوي Vin، و Rf و Rin يكوّنان مقسماً على الخرج:", tex: cfg === "inv" ? `A = -\\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` : `A = 1 + \\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` });
    steps.push({ tex: `V_{out} = A V_{in} = ${ntex(A, 6)} \\times ${ntex(Vin)} = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else if (cfg === "sum") {
    const Rf = num(input, "Rf", "Rf", { positive: true });
    const Rs = numList(input, "Rs", "مقاومات الدخل", { positive: true, max: 10 });
    const Vs = numList(input, "Vs", "جهود الدخل", { max: 10 });
    if (Rs.length !== Vs.length) fail(`عدد المقاومات (${Rs.length}) يجب أن يساوي عدد الجهود (${Vs.length}).`, "Vs");
    Vout = -Rf * Rs.reduce((s, r, i) => s + Vs[i] / r, 0);
    steps.push({ text: "تيارات الدخل تُجمع عند الأرضي الافتراضي وتمر في Rf:", tex: `V_{out} = -${ntex(Rf)}\\left(${Rs.map((r, i) => `\\frac{${ntex(Vs[i])}}{${ntex(r)}}`).join(" + ")}\\right) = ${ntex(Vout, 6)}\\ V` });
    gainText = Rs.map((r, i) => `A${i + 1} = ${fmt(-Rf / r, 5)}`).join(", ");
  } else if (cfg === "diff") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true });
    const V1 = num(input, "V1d", "V1"), V2 = num(input, "V2", "V2");
    A = Rf / Rin;
    Vout = A * (V2 - V1);
    steps.push({ text: "بمقاومات متطابقة (Rf/Rin على الطرفين) يضخم الفرق فقط:", tex: `V_{out} = \\frac{R_f}{R_{in}}(V_2 - V_1) = ${ntex(A, 6)}(${ntex(V2)} - ${ntex(V1)}) = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else {
    const R = num(input, "R", "R", { positive: true }), C = num(input, "C", "C", { positive: true }), f = num(input, "f", "التردد", { positive: true }), Vin = num(input, "Vin", "Vin");
    const w = 2 * Math.PI * f, wc = 1 / (R * C);
    A = cfg === "integ" ? 1 / (w * R * C) : w * R * C;
    Vout = A * Vin;
    steps.push(cfg === "integ"
      ? { text: "المكامل: $v_o = -\\frac{1}{RC}\\int v_i\\,dt$، ولإشارة جيبية يصبح الكسب:", tex: `|A| = \\frac{1}{\\omega RC} = \\frac{1}{${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)}} = ${ntex(A, 5)},\\ \\text{phase } +90^\\circ` }
      : { text: "المفاضل: $v_o = -RC\\frac{dv_i}{dt}$، ولإشارة جيبية يصبح الكسب:", tex: `|A| = \\omega RC = ${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)} = ${ntex(A, 5)},\\ \\text{phase } -90^\\circ` });
    steps.push(`عند التردد ${eng(wc / (2 * Math.PI), "Hz", 4)} يصبح الكسب 1. ${cfg === "integ" ? "عملياً تُضاف مقاومة موازية للمكثف لمنع التشبع بالجهد المستمر." : "عملياً تُضاف مقاومة توالي مع المكثف لتقليل الضجيج عالي التردد."}`);
    gainText = `|A| = ${fmt(A, 5)}`;
  }
  const sat = Math.abs(Vout) > Vsat;
  if (sat) steps.push(`تحذير: الخرج المحسوب ${fmt(Vout, 4)} V يتجاوز جهد التغذية ±${fmt(Vsat)} V، فالخرج الفعلي سيتشبع عند حوالي ${fmt(Math.sign(Vout) * Vsat, 3)} V.`);
  const results = [];
  if (A !== null) results.push({ label: "الكسب", value: A, sig: 6, text: gainText }, { label: "الكسب بالديسيبل", value: `${fmt(20 * Math.log10(Math.abs(A)), 4)} dB` });
  else results.push({ label: "الكسب لكل دخل", value: gainText });
  results.push({ label: cfg === "integ" || cfg === "deriv" ? "سعة الخرج" : "جهد الخرج", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "الحالة", value: sat ? "تشبع (الخرج مقصوص)" : "ضمن المدى الخطي" });
  return { results, steps, copy: `${gainText}, Vout = ${eng(Vout, "V", 4)}${sat ? " (saturated)" : ""}` };
}
