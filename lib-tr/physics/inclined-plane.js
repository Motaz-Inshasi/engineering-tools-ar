import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "تحليل جسم على مستوى مائل مع الاحتكاك: الوزن ومركباته والقوة العمودية وأقصى احتكاك ساكن وهل ينزلق من السكون، وتسارع الانزلاق وزاوية الحرج، مع منحنى قوة الاحتكاك.",
  keywords: ["مستوى مائل", "احتكاك", "inclined plane", "friction", "زاوية الحرج", "معامل الاحتكاك", "انزلاق"],
  formulas: [
    { label: "مركبتا الوزن", tex: "W = mg,\\qquad F_\\parallel = mg\\sin\\theta,\\qquad N = mg\\cos\\theta" },
    { label: "شرط الانزلاق من السكون", tex: "\\tan\\theta > \\mu_s \\quad\\Leftrightarrow\\quad mg\\sin\\theta > \\mu_s N" },
    { label: "تسارع الانزلاق", tex: "a = g(\\sin\\theta - \\mu_k\\cos\\theta)" }
  ],
  inputs: [
    { id: "m", label: "الكتلة m", unit: "kg", type: "number", default: "10" },
    { id: "theta", label: "زاوية الميل θ", unit: "°", type: "number", default: "30", help: "من 0 إلى 89.9 درجة." },
    { id: "mu_s", label: "معامل الاحتكاك الساكن μs", type: "number", default: "0.5" },
    { id: "mu_k", label: "معامل الاحتكاك الحركي μk", type: "number", default: "0.3", help: "يجب أن يكون μk أقل من أو يساوي μs." },
    { id: "g", label: "تسارع الجاذبية g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { m: "10", theta: "30", mu_s: "0.5", mu_k: "0.3", g: "9.81" }, expect: ["ينزلق: نعم", "a = 2.356 m/s²"], note: "مثال: صندوق 10 kg على مستوى مائل 30 درجة." },
  invalid: { values: { m: "10", theta: "30", mu_s: "0.3", mu_k: "0.5", g: "9.81" } },
  related: ["kinematics", "work-energy", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const m = num(input, "m", "الكتلة", { positive: true });
  const theta = num(input, "theta", "زاوية الميل", { min: 0, max: 89.9 });
  const mus = num(input, "mu_s", "معامل الاحتكاك الساكن", { nonNegative: true });
  const muk = num(input, "mu_k", "معامل الاحتكاك الحركي", { nonNegative: true });
  if (muk > mus) fail("معامل الاحتكاك الحركي μk لا يمكن أن يتجاوز الساكن μs.", "mu_k");
  const g = num(input, "g", "تسارع الجاذبية", { positive: true });
  const rad = (theta * Math.PI) / 180;
  const s = snap(Math.sin(rad));
  const c = snap(Math.cos(rad));
  const W = m * g;
  const Fp = W * s;
  const N = W * c;
  const fsMax = mus * N;
  const tanT = Math.tan(rad);
  const slides = tanT > mus;
  const a = slides ? g * (s - muk * c) : 0;
  const fk = muk * N;
  const critical = (Math.atan(mus) * 180) / Math.PI;
  const friction = slides ? fk : Fp;
  const steps = [
    { text: "الوزن:", tex: `W = mg = ${T(m)} \\times ${T(g)} = ${T(W)}\\ N` },
    { text: "المركبة الموازية للمستوى والقوة العمودية:", tex: `F_\\parallel = W\\sin\\theta = ${T(Fp)}\\ N,\\qquad N = W\\cos\\theta = ${T(N)}\\ N` },
    { text: "أقصى احتكاك ساكن:", tex: `f_{s,max} = \\mu_s N = ${T(mus)} \\times ${T(N)} = ${T(fsMax)}\\ N` },
    { text: "شرط الانزلاق من السكون:", tex: `\\tan\\theta = ${T(tanT)}\\ ${slides ? ">" : "\\le"}\\ \\mu_s = ${T(mus)}` }
  ];
  if (slides) {
    steps.push({ text: "الجسم ينزلق، فتكون قوة الاحتكاك حركية والتسارع:", tex: `a = g(\\sin\\theta - \\mu_k\\cos\\theta) = ${T(a)}\\ m/s^2` });
  } else {
    steps.push({ text: "الجسم يبقى ساكناً، والاحتكاك الساكن المطلوب يساوي المركبة الموازية:", tex: `f = F_\\parallel = ${T(Fp)}\\ N \\le f_{s,max} = ${T(fsMax)}\\ N` });
  }
  const results = [
    { label: "الوزن W", value: `${fmt(W, 4)} N` },
    { label: "المركبة الموازية للمستوى", value: `${fmt(Fp, 4)} N` },
    { label: "القوة العمودية N", value: `${fmt(N, 4)} N` },
    { label: "أقصى احتكاك ساكن μs·N", value: `${fmt(fsMax, 4)} N` },
    { label: "هل ينزلق الجسم من السكون؟", value: slides ? "نعم" : "لا" },
    { label: "التسارع على المستوى", value: `${fmt(a, 4)} m/s²` },
    { label: "قوة الاحتكاك الحركي μk·N", value: `${fmt(fk, 4)} N` },
    { label: slides ? "قوة الاحتكاك المؤثرة (حركي)" : "قوة الاحتكاك الساكن المطلوبة", value: `${fmt(friction, 4)} N` },
    { label: "زاوية الحرج atan(μs)", value: `${fmt(critical, 4)}°` }
  ];
  const copy = `ينزلق: ${slides ? "نعم" : "لا"}، a = ${fmt(a, 4)} m/s²، زاوية الحرج = ${fmt(critical, 4)}°`;
  const angles = Array.from({ length: 180 }, (_, i) => (i * 89.9) / 179);
  const pts = angles.map((d) => {
    const r = (d * Math.PI) / 180;
    return [d, Math.tan(r) > mus ? muk * m * g * Math.cos(r) : m * g * Math.sin(r)];
  });
  const blocks = [
    { type: "plot", title: "قوة الاحتكاك مقابل زاوية الميل", xLabel: "θ (°)", yLabel: "f (N)", includeZero: true, series: [{ name: "f(θ)", points: pts }], vlines: [{ x: critical }] }
  ];
  return {
    results, steps, copy, blocks,
    values: { W, Fp, N, fsMax, slides, a, fk, critical, friction }
  };
}
