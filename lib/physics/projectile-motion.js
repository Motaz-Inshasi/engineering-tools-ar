import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "حل حركة المقذوف في الهواء بدون مقاومة: المركبتان الابتدائيتان وزمن أقصى ارتفاع وأقصى ارتفاع وزمن الطيران والمدى وسرعة الاصطدام وزاويته، مع مسار الحركة.",
  keywords: ["مقذوف", "حركة المقذوفات", "projectile", "مدى", "range", "أقصى ارتفاع", "زاوية الإطلاق", "زمن الطيران"],
  formulas: [
    { label: "مركبتا السرعة الابتدائية", tex: "v_x = v_0\\cos\\theta,\\qquad v_{y0} = v_0\\sin\\theta" },
    { label: "أقصى ارتفاع وزمن الطيران", tex: "H = h_0 + \\frac{v_{y0}^2}{2g},\\qquad h_0 + v_{y0}t - \\tfrac{1}{2}gt^2 = 0" },
    { label: "المدى", tex: "R = v_x\\,T" }
  ],
  inputs: [
    { id: "v0", label: "السرعة الابتدائية v0", unit: "m/s", type: "number", default: "20" },
    { id: "theta", label: "زاوية الإطلاق θ", unit: "°", type: "number", default: "45", help: "من 0 إلى 90 درجة، قياساً من الأفق." },
    { id: "h0", label: "الارتفاع الابتدائي h0", unit: "m", type: "number", default: "0" },
    { id: "g", label: "تسارع الجاذبية g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { v0: "20", theta: "45", h0: "0", g: "9.81" }, expect: ["R = 40.77 m", "Hmax = 10.19 m", "T = 2.883 s"], note: "مثال: قذيفة بسرعة 20 m/s بزاوية 45° من سطح الأرض." },
  invalid: { values: { v0: "20", theta: "120", h0: "0", g: "9.81" } },
  related: ["kinematics", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const v0 = num(input, "v0", "السرعة الابتدائية", { positive: true });
  const theta = num(input, "theta", "زاوية الإطلاق", { min: 0, max: 90 });
  const h0 = num(input, "h0", "الارتفاع الابتدائي", { nonNegative: true });
  const g = num(input, "g", "تسارع الجاذبية", { positive: true });
  const rad = (theta * Math.PI) / 180;
  const vx = snap(v0 * Math.cos(rad));
  const vy0 = snap(v0 * Math.sin(rad));
  const tPeak = vy0 / g;
  const H = h0 + (vy0 * vy0) / (2 * g);
  const tof = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  if (!(tof > 0)) fail("الجسم لا يتحرك في الهواء: ارفع الزاوية أو الارتفاع الابتدائي.", "theta");
  const R = vx * tof;
  const vyImp = vy0 - g * tof;
  const speed = Math.hypot(vx, vyImp);
  const angle = (Math.atan2(-vyImp, vx) * 180) / Math.PI;
  const steps = [
    { text: "مركبتا السرعة الابتدائية:", tex: `v_x = v_0\\cos\\theta = ${T(v0)}\\cos(${T(theta)}^\\circ) = ${T(vx)}\\ m/s,\\qquad v_{y0} = v_0\\sin\\theta = ${T(vy0)}\\ m/s` },
    { text: "زمن الوصول لأعلى نقطة (تنعدم السرعة الرأسية):", tex: `t_{peak} = \\frac{v_{y0}}{g} = ${T(tPeak)}\\ s` },
    { text: "أقصى ارتفاع:", tex: `H = h_0 + \\frac{v_{y0}^2}{2g} = ${T(h0)} + \\frac{(${T(vy0)})^2}{2 \\times ${T(g)}} = ${T(H)}\\ m` },
    { text: "زمن الطيران (الجذر الموجب للمعادلة h = 0):", tex: `t = \\frac{v_{y0} + \\sqrt{v_{y0}^2 + 2gh_0}}{g} = ${T(tof)}\\ s` },
    { text: "المدى الأفقي:", tex: `R = v_x t = ${T(R)}\\ m` },
    { text: "سرعة الاصطدام:", tex: `v_y = v_{y0} - gt = ${T(vyImp)}\\ m/s,\\qquad v = \\sqrt{v_x^2 + v_y^2} = ${T(speed)}\\ m/s` },
    { text: "زاوية الاصطدام تحت الأفق:", tex: `\\alpha = \\arctan\\frac{|v_y|}{v_x} = ${T(angle)}^\\circ` }
  ];
  const results = [
    { label: "المركبة الأفقية vx", value: `${fmt(vx, 4)} m/s` },
    { label: "المركبة الرأسية الابتدائية vy0", value: `${fmt(vy0, 4)} m/s` },
    { label: "زمن الوصول لأعلى نقطة", value: `${fmt(tPeak, 4)} s` },
    { label: "أقصى ارتفاع Hmax", value: `${fmt(H, 4)} m` },
    { label: "زمن الطيران T", value: `${fmt(tof, 4)} s` },
    { label: "المدى R", value: `${fmt(R, 4)} m` },
    { label: "سرعة الاصطدام", value: `${fmt(speed, 4)} m/s` },
    { label: "زاوية الاصطدام تحت الأفق", value: `${fmt(angle, 4)}°` }
  ];
  const copy = `R = ${fmt(R, 4)} m، Hmax = ${fmt(H, 4)} m، T = ${fmt(tof, 4)} s`;
  const N = 120;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const s = (tof * i) / N;
    return [vx * s, h0 + vy0 * s - 0.5 * g * s * s];
  });
  const blocks = [
    { type: "plot", title: "مسار المقذوف y مقابل x", xLabel: "x (m)", yLabel: "y (m)", includeZero: true, series: [{ name: "المسار", points: pts }], hlines: [{ y: H }], vlines: [{ x: R }] }
  ];
  return { results, steps, copy, blocks, values: { vx, vy0, tPeak, H, tof, R, speed, angle } };
}
