import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["quarter", "ربع قنطرة (مقياس واحد)"], ["half", "نصف قنطرة (مقياسان: شد وضغط)"], ["full", "قنطرة كاملة (أربعة مقاييس)"]];

export const meta = {
  description: "مقياس الانفعال في قنطرة ويتستون: جهد الخرج لربع ونصف وقنطرة كاملة من الانفعال ومعامل المقياس، أو الانفعال من جهد الخرج، مع تغير المقاومة والكسب اللازم للمكبر.",
  keywords: ["مقياس الانفعال", "strain gauge", "انفعال", "قنطرة", "gauge factor", "معامل المقياس", "ميكروسترين", "خلية حمل"],
  formulas: [
    { label: "تغير المقاومة", tex: "\\frac{\\Delta R}{R} = GF \\cdot \\varepsilon" },
    { label: "الخرج", tex: "\\text{quarter: } V_o = V_{ex}\\frac{GF\\varepsilon}{4}\\cdot\\frac{1}{1 + GF\\varepsilon/2},\\quad \\text{half: } \\frac{V_{ex}GF\\varepsilon}{2},\\quad \\text{full: } V_{ex}GF\\varepsilon" }
  ],
  inputs: [
    { id: "cfg", label: "التوصيل", type: "select", default: "quarter", options: CFG },
    { id: "dir", label: "المطلوب", type: "select", default: "e2v", options: [["e2v", "جهد الخرج من الانفعال"], ["v2e", "الانفعال من جهد الخرج"]] },
    { id: "strain", label: "الانفعال", unit: "µε", type: "number", default: "1000", when: { dir: ["e2v"] } },
    { id: "Vo", label: "جهد الخرج", unit: "V", type: "number", default: "5m", when: { dir: ["v2e"] } },
    { id: "GF", label: "معامل المقياس GF", type: "number", default: "2" },
    { id: "Vex", label: "جهد التغذية Vex", unit: "V", type: "number", default: "10" },
    { id: "R", label: "مقاومة المقياس", unit: "Ω", type: "number", default: "350" },
    { id: "Vadc", label: "مدى ADC المطلوب للخرج الكامل (اختياري)", unit: "V", type: "number", default: "3.3" }
  ],
  example: { values: { cfg: "quarter", dir: "e2v", strain: "1000", GF: "2", Vex: "10", R: "350", Vadc: "3.3" }, expect: ["Vo = 4.995 mV"], note: "مثال: انفعال 1000 µε بمقياس واحد GF = 2 وتغذية 10 V." },
  invalid: { values: { cfg: "quarter", dir: "e2v", strain: "1000", GF: "0", Vex: "10", R: "350" } },
  related: ["wheatstone-bridge", "op-amp", "adc", "rtd"]
};

export function output(cfg, Vex, GF, e) {
  const x = GF * e;
  if (cfg === "quarter") return (Vex * x) / 4 / (1 + x / 2);
  if (cfg === "half") return (Vex * x) / 2;
  return Vex * x;
}

export function strainFrom(cfg, Vex, GF, Vo) {
  const r = Vo / Vex;
  if (cfg === "quarter") return (4 * r) / (GF * (1 - 2 * r));
  if (cfg === "half") return (2 * r) / GF;
  return r / GF;
}

export function solve(input) {
  const cfg = choice(input, "cfg", "التوصيل", CFG.map((c) => c[0]), "quarter");
  const dir = choice(input, "dir", "المطلوب", ["e2v", "v2e"], "e2v");
  const GF = num(input, "GF", "معامل المقياس", { positive: true });
  const Vex = num(input, "Vex", "جهد التغذية", { positive: true });
  const R = num(input, "R", "مقاومة المقياس", { positive: true });
  const Vadc = num(input, "Vadc", "مدى ADC", { optional: true, positive: true });
  let e, Vo;
  const steps = [];
  if (dir === "e2v") {
    e = num(input, "strain", "الانفعال", { min: -1e5, max: 1e5 }) * 1e-6;
    Vo = output(cfg, Vex, GF, e);
  } else {
    Vo = num(input, "Vo", "جهد الخرج");
    e = strainFrom(cfg, Vex, GF, Vo);
  }
  const dR = R * GF * e;
  steps.push({ text: "تغير مقاومة المقياس:", tex: `\\Delta R = R \\cdot GF \\cdot \\varepsilon = ${ntex(R)} \\times ${ntex(GF)} \\times ${ntex(e, 5)} = ${ntex(dR, 5)}\\ \\Omega` });
  if (cfg === "quarter") steps.push({ text: "في ربع القنطرة ذراع واحد فعّال، والعلاقة غير خطية قليلاً:", tex: `V_o = ${ntex(Vex)}\\frac{GF\\varepsilon/4}{1 + GF\\varepsilon/2} = ${ntex(Vo, 5)}\\ V` });
  else if (cfg === "half") steps.push({ text: "في نصف القنطرة مقياس للشد وآخر للضغط في ذراعين متجاورين، فتتضاعف الحساسية وتختفي اللاخطية:", tex: `V_o = \\frac{V_{ex} GF \\varepsilon}{2} = ${ntex(Vo, 5)}\\ V` });
  else steps.push({ text: "في القنطرة الكاملة أربعة مقاييس فعّالة، فالحساسية أربعة أضعاف ربع القنطرة:", tex: `V_o = V_{ex} GF \\varepsilon = ${ntex(Vo, 5)}\\ V` });
  if (dir === "v2e") steps.push({ text: "عكسنا العلاقة لإيجاد الانفعال:", tex: `\\varepsilon = ${ntex(e * 1e6, 5)}\\ \\mu\\varepsilon` });
  steps.push("القنطرة الكاملة ونصف القنطرة تعوّضان أيضاً عن تغير الحرارة تلقائياً، وهذا سبب انتشارهما في خلايا الحمل.");
  const results = [
    { label: "جهد الخرج", value: eng(Vo, "V", 4), text: `Vo = ${eng(Vo, "V", 4)}` },
    { label: "الانفعال", value: `${fmt(e * 1e6, 5)} µε` },
    { label: "تغير المقاومة", value: eng(dR, "Ω", 4) },
    { label: "الحساسية", value: `${fmt((Vo / Vex) * 1000, 4)} mV/V` }
  ];
  if (Vadc !== null && Vo !== 0) {
    const G = Vadc / Math.abs(Vo);
    results.push({ label: "كسب المكبر لملء مدى ADC", value: fmt(G, 4) });
    steps.push(`لتكبير هذا الخرج إلى ${fmt(Vadc)} V نحتاج مكبراً (عادة مكبر أجهزة instrumentation) بكسب ${fmt(G, 4)}.`);
  }
  return { results, steps, copy: `Vo = ${eng(Vo, "V", 4)}, ε = ${fmt(e * 1e6, 5)} µε, ΔR = ${eng(dR, "Ω", 4)}` };
}
