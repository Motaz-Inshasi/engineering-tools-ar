import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "احسب الحركة التوافقية البسيطة لنابض (التردد والزمن الدوري والسرعة والتسارع القصوى والطاقة) وللبندول البسيط (الزمن الدوري والتردد مع الزمن الدقيق للزوايا الكبيرة) مع رسم الإزاحة أو الزاوية لدورتين.",
  keywords: ["حركة توافقية", "نابض", "بندول", "ثابت النابض", "سعة الاهتزاز", "زمن دوري", "تردد", "simple harmonic motion", "spring", "pendulum"],
  formulas: [
    { label: "النابض", tex: "\\omega = \\sqrt{\\frac{k}{m}},\\quad T = \\frac{2\\pi}{\\omega},\\quad v_{max} = A\\omega,\\quad a_{max} = A\\omega^2,\\quad E = \\frac{1}{2}kA^2" },
    { label: "البندول البسيط", tex: "T = 2\\pi\\sqrt{\\frac{L}{g}}\\quad (\\theta_0 \\text{ صغيرة}),\\qquad T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "نوع النظام", type: "select", default: "spring", options: [["spring", "نابض وكتلة"], ["pendulum", "البندول البسيط"]] },
    { id: "k", label: "ثابت النابض k", unit: "N/m", type: "number", default: "200", when: { mode: ["spring"] } },
    { id: "ms", label: "الكتلة m", unit: "kg", type: "number", default: "0.5", when: { mode: ["spring"] } },
    { id: "A", label: "السعة A", unit: "m", type: "number", default: "0.1", when: { mode: ["spring"] }, help: "أقصى إزاحة عن وضع التوازن." },
    { id: "L", label: "طول الخيط L", unit: "m", type: "number", default: "1", when: { mode: ["pendulum"] } },
    { id: "g", label: "تسارع الجاذبية g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pendulum"] } },
    { id: "th", label: "زاوية السعة θ0", unit: "°", type: "number", default: "5", when: { mode: ["pendulum"] }, help: "يُفضّل أن تكون أقل من 15° لدقة التقريب الصغير." }
  ],
  example: {
    values: { mode: "spring", k: "200", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" },
    expect: ["ω = 20 rad/s", "vmax = 2 m/s"],
    note: "مثال: نابض ثابته 200 N/m يحمل كتلة 0.5 kg وسعته 0.1 m."
  },
  invalid: { values: { mode: "spring", k: "0", ms: "0.5", A: "0.1", L: "1", g: "9.81", th: "5" } },
  related: ["waves-doppler", "work-energy", "kinematics", "formulas-constants"]
};

function agm(a, b) {
  let x = a, y = b;
  for (let i = 0; i < 100 && Math.abs(x - y) > 1e-15 * x; i++) {
    const nx = (x + y) / 2;
    y = Math.sqrt(x * y);
    x = nx;
  }
  return x;
}

function samples(span, fn) {
  const N = 240;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = span * i / N;
    pts.push([t, fn(t)]);
  }
  return pts;
}

function spring(input) {
  const k = num(input, "k", "ثابت النابض k", { positive: true });
  const m = num(input, "ms", "الكتلة m", { positive: true });
  const A = num(input, "A", "السعة A", { nonNegative: true });
  const w = Math.sqrt(k / m);
  const f = w / (2 * Math.PI);
  const T = 1 / f;
  const vmax = A * w;
  const amax = A * w * w;
  const E = 0.5 * k * A * A;
  return {
    results: [
      { label: "التردد الزاوي ω", value: `${fmt(w, 4)} rad/s` },
      { label: "التردد f", value: `${fmt(f, 4)} Hz` },
      { label: "الزمن الدوري T", value: `${fmt(T, 4)} s` },
      { label: "السرعة القصوى vmax", value: `${fmt(vmax, 4)} m/s` },
      { label: "التسارع الأقصى amax", value: `${fmt(amax, 4)} m/s²` },
      { label: "الطاقة الكلية E", value: `${fmt(E, 4)} J` }
    ],
    steps: [
      { text: "التردد الزاوي للنابض:", tex: `\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{${ntex(k)}}{${ntex(m)}}} = ${ntex(w, 6)}\\ rad/s` },
      { text: "التردد والزمن الدوري:", tex: `f = \\frac{\\omega}{2\\pi} = ${ntex(f, 6)}\\ Hz,\\qquad T = \\frac{1}{f} = ${ntex(T, 6)}\\ s` },
      { text: "السرعة القصوى:", tex: `v_{max} = A\\omega = ${ntex(A)} \\times ${ntex(w, 6)} = ${ntex(vmax, 6)}\\ m/s` },
      { text: "التسارع الأقصى:", tex: `a_{max} = A\\omega^2 = ${ntex(amax, 6)}\\ m/s^2` },
      { text: "الطاقة الكلية:", tex: `E = \\frac{1}{2}kA^2 = ${ntex(E, 6)}\\ J` }
    ],
    blocks: [
      { type: "plot", title: "الإزاحة x(t) لمدة دورتين", xLabel: "t (s)", yLabel: "x (m)", includeZero: true, series: [{ name: "x(t)", points: samples(2 * T, (t) => A * Math.cos(w * t)), line: true }] }
    ],
    copy: `ω = ${fmt(w, 4)} rad/s, f = ${fmt(f, 4)} Hz, T = ${fmt(T, 4)} s, vmax = ${fmt(vmax, 4)} m/s, amax = ${fmt(amax, 4)} m/s², E = ${fmt(E, 4)} J`
  };
}

function pendulum(input) {
  const L = num(input, "L", "طول الخيط L", { positive: true });
  const g = num(input, "g", "تسارع الجاذبية g", { positive: true });
  const th = num(input, "th", "زاوية السعة θ0", { positive: true, below: 180 });
  const T = 2 * Math.PI * Math.sqrt(L / g);
  const f = 1 / T;
  const w = 2 * Math.PI / T;
  const Tex = T / agm(1, Math.cos(th * DEG / 2));
  const blocks = [];
  if (th > 15) blocks.push({ type: "note", tone: "warn", text: "زاوية السعة أكبر من 15°، فالتقريب الصغير الزوايا يقلل الزمن الدوري الحقيقي؛ انظر الزمن الدوري الدقيق في النتائج." });
  blocks.push({ type: "plot", title: "الزاوية θ(t) لمدة دورتين (التقريب الصغير)", xLabel: "t (s)", yLabel: "θ (°)", includeZero: true, series: [{ name: "θ(t)", points: samples(2 * T, (t) => th * Math.cos(w * t)), line: true }] });
  return {
    results: [
      { label: "الزمن الدوري بتقريب الزاوية الصغيرة T", value: `${fmt(T, 4)} s` },
      { label: "الزمن الدوري الدقيق", value: `${fmt(Tex, 4)} s` },
      { label: "التردد f", value: `${fmt(f, 4)} Hz` },
      { label: "التردد الزاوي ω", value: `${fmt(w, 4)} rad/s` }
    ],
    steps: [
      { text: "الزمن الدوري بتقريب الزاوية الصغيرة:", tex: `T = 2\\pi\\sqrt{\\frac{L}{g}} = 2\\pi\\sqrt{\\frac{${ntex(L)}}{${ntex(g)}}} = ${ntex(T, 6)}\\ s` },
      { text: "التردد والتردد الزاوي:", tex: `f = \\frac{1}{T} = ${ntex(f, 6)}\\ Hz,\\qquad \\omega = \\frac{2\\pi}{T} = ${ntex(w, 6)}\\ rad/s` },
      { text: "الزمن الدوري الدقيق لزاوية السعة:", tex: `T_{exact} = \\frac{T}{\\mathrm{AGM}\\left(1,\\cos\\frac{\\theta_0}{2}\\right)} = ${ntex(Tex, 6)}\\ s` }
    ],
    blocks,
    copy: `T = ${fmt(T, 4)} s, T_exact = ${fmt(Tex, 4)} s, f = ${fmt(f, 4)} Hz, ω = ${fmt(w, 4)} rad/s`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع النظام", ["spring", "pendulum"], "spring");
  return mode === "pendulum" ? pendulum(input) : spring(input);
}
