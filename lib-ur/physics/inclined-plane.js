import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "رگڑ کے ساتھ مائل سطح پر جسم کا تجزیہ: وزن اور اس کے اجزاء، عمودی قوت، زیادہ سے زیادہ ساکن رگڑ اور آیا وہ ساکن حالت سے پھسلتا ہے یا نہیں، پھسلنے کا اسراع اور حدی زاویہ، ساتھ رگڑ کی قوت کا منحنی۔",
  keywords: ["مائل سطح", "رگڑ", "inclined plane", "friction", "حدی زاویہ", "رگڑ کا عامل", "پھسلنا"],
  formulas: [
    { label: "وزن کے اجزاء", tex: "W = mg,\\qquad F_\\parallel = mg\\sin\\theta,\\qquad N = mg\\cos\\theta" },
    { label: "ساکن حالت سے پھسلنے کی شرط", tex: "\\tan\\theta > \\mu_s \\quad\\Leftrightarrow\\quad mg\\sin\\theta > \\mu_s N" },
    { label: "پھسلنے کا اسراع", tex: "a = g(\\sin\\theta - \\mu_k\\cos\\theta)" }
  ],
  inputs: [
    { id: "m", label: "کمیت m", unit: "kg", type: "number", default: "10" },
    { id: "theta", label: "جھکاؤ کا زاویہ θ", unit: "°", type: "number", default: "30", help: "0 سے 89.9 ڈگری تک۔" },
    { id: "mu_s", label: "ساکن رگڑ کا عامل μs", type: "number", default: "0.5" },
    { id: "mu_k", label: "متحرک رگڑ کا عامل μk", type: "number", default: "0.3", help: "μk، μs کے برابر یا اس سے کم ہونا چاہیے۔" },
    { id: "g", label: "ثقلی اسراع g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { m: "10", theta: "30", mu_s: "0.5", mu_k: "0.3", g: "9.81" }, expect: ["پھسلتا ہے: ہاں", "a = 2.356 m/s²"], note: "مثال: 30° کی مائل سطح پر 10 kg کا ڈبہ۔" },
  invalid: { values: { m: "10", theta: "30", mu_s: "0.3", mu_k: "0.5", g: "9.81" } },
  related: ["kinematics", "work-energy", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const m = num(input, "m", "کمیت", { positive: true });
  const theta = num(input, "theta", "جھکاؤ کا زاویہ", { min: 0, max: 89.9 });
  const mus = num(input, "mu_s", "ساکن رگڑ کا عامل", { nonNegative: true });
  const muk = num(input, "mu_k", "متحرک رگڑ کا عامل", { nonNegative: true });
  if (muk > mus) fail("متحرک رگڑ کا عامل μk ساکن عامل μs سے زیادہ نہیں ہو سکتا۔", "mu_k");
  const g = num(input, "g", "ثقلی اسراع", { positive: true });
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
    { text: "وزن:", tex: `W = mg = ${T(m)} \\times ${T(g)} = ${T(W)}\\ N` },
    { text: "سطح کے متوازی جزو اور عمودی قوت:", tex: `F_\\parallel = W\\sin\\theta = ${T(Fp)}\\ N,\\qquad N = W\\cos\\theta = ${T(N)}\\ N` },
    { text: "زیادہ سے زیادہ ساکن رگڑ:", tex: `f_{s,max} = \\mu_s N = ${T(mus)} \\times ${T(N)} = ${T(fsMax)}\\ N` },
    { text: "ساکن حالت سے پھسلنے کی شرط:", tex: `\\tan\\theta = ${T(tanT)}\\ ${slides ? ">" : "\\le"}\\ \\mu_s = ${T(mus)}` }
  ];
  if (slides) {
    steps.push({ text: "جسم پھسلتا ہے، اس لیے رگڑ متحرک ہے اور اسراع یہ ہے:", tex: `a = g(\\sin\\theta - \\mu_k\\cos\\theta) = ${T(a)}\\ m/s^2` });
  } else {
    steps.push({ text: "جسم ساکن رہتا ہے، اور درکار ساکن رگڑ متوازی جزو کے برابر ہے:", tex: `f = F_\\parallel = ${T(Fp)}\\ N \\le f_{s,max} = ${T(fsMax)}\\ N` });
  }
  const results = [
    { label: "وزن W", value: `${fmt(W, 4)} N` },
    { label: "سطح کے متوازی جزو", value: `${fmt(Fp, 4)} N` },
    { label: "عمودی قوت N", value: `${fmt(N, 4)} N` },
    { label: "زیادہ سے زیادہ ساکن رگڑ μs·N", value: `${fmt(fsMax, 4)} N` },
    { label: "کیا جسم ساکن حالت سے پھسلتا ہے؟", value: slides ? "ہاں" : "نہیں" },
    { label: "سطح پر اسراع", value: `${fmt(a, 4)} m/s²` },
    { label: "متحرک رگڑ کی قوت μk·N", value: `${fmt(fk, 4)} N` },
    { label: slides ? "عمل کرنے والی رگڑ کی قوت (متحرک)" : "درکار ساکن رگڑ کی قوت", value: `${fmt(friction, 4)} N` },
    { label: "حدی زاویہ atan(μs)", value: `${fmt(critical, 4)}°` }
  ];
  const copy = `پھسلتا ہے: ${slides ? "ہاں" : "نہیں"}، a = ${fmt(a, 4)} m/s²، حدی زاویہ = ${fmt(critical, 4)}°`;
  const angles = Array.from({ length: 180 }, (_, i) => (i * 89.9) / 179);
  const pts = angles.map((d) => {
    const r = (d * Math.PI) / 180;
    return [d, Math.tan(r) > mus ? muk * m * g * Math.cos(r) : m * g * Math.sin(r)];
  });
  const blocks = [
    { type: "plot", title: "جھکاؤ کے زاویے کے مقابلے میں رگڑ کی قوت", xLabel: "θ (°)", yLabel: "f (N)", includeZero: true, series: [{ name: "f(θ)", points: pts }], vlines: [{ x: critical }] }
  ];
  return {
    results, steps, copy, blocks,
    values: { W, Fp, N, fsMax, slides, a, fk, critical, friction }
  };
}
