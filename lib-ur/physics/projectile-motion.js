import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

export const meta = {
  description: "ہوا میں بغیر مزاحمت پرتابی جسم کی حرکت حل کریں: ابتدائی اجزائے رفتار، زیادہ سے زیادہ بلندی تک کا وقت، زیادہ سے زیادہ بلندی، پرواز کا وقت، افقی فاصلہ، ٹکراؤ کی رفتار اور زاویہ، ساتھ حرکت کا راستہ۔",
  keywords: ["پرتابہ", "پرتابی حرکت", "projectile", "افقی فاصلہ", "range", "زیادہ سے زیادہ بلندی", "پھینکنے کا زاویہ", "پرواز کا وقت"],
  formulas: [
    { label: "ابتدائی رفتار کے اجزاء", tex: "v_x = v_0\\cos\\theta,\\qquad v_{y0} = v_0\\sin\\theta" },
    { label: "زیادہ سے زیادہ بلندی اور پرواز کا وقت", tex: "H = h_0 + \\frac{v_{y0}^2}{2g},\\qquad h_0 + v_{y0}t - \\tfrac{1}{2}gt^2 = 0" },
    { label: "افقی فاصلہ", tex: "R = v_x\\,T" }
  ],
  inputs: [
    { id: "v0", label: "ابتدائی رفتار v0", unit: "m/s", type: "number", default: "20" },
    { id: "theta", label: "پھینکنے کا زاویہ θ", unit: "°", type: "number", default: "45", help: "افق سے ناپتے ہوئے 0 سے 90 ڈگری تک۔" },
    { id: "h0", label: "ابتدائی بلندی h0", unit: "m", type: "number", default: "0" },
    { id: "g", label: "ثقلی اسراع g", unit: "m/s²", type: "number", default: "9.81" }
  ],
  example: { values: { v0: "20", theta: "45", h0: "0", g: "9.81" }, expect: ["R = 40.77 m", "Hmax = 10.19 m", "T = 2.883 s"], note: "مثال: زمین کی سطح سے 45° زاویے پر 20 m/s سے پھینکا گیا پرتابہ۔" },
  invalid: { values: { v0: "20", theta: "120", h0: "0", g: "9.81" } },
  related: ["kinematics", "inclined-plane", "work-energy", "formulas-constants"]
};

export function solve(input) {
  const v0 = num(input, "v0", "ابتدائی رفتار", { positive: true });
  const theta = num(input, "theta", "پھینکنے کا زاویہ", { min: 0, max: 90 });
  const h0 = num(input, "h0", "ابتدائی بلندی", { nonNegative: true });
  const g = num(input, "g", "ثقلی اسراع", { positive: true });
  const rad = (theta * Math.PI) / 180;
  const vx = snap(v0 * Math.cos(rad));
  const vy0 = snap(v0 * Math.sin(rad));
  const tPeak = vy0 / g;
  const H = h0 + (vy0 * vy0) / (2 * g);
  const tof = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  if (!(tof > 0)) fail("جسم ہوا میں حرکت نہیں کرتا: پھینکنے کا زاویہ یا ابتدائی بلندی بڑھائیں۔", "theta");
  const R = vx * tof;
  const vyImp = vy0 - g * tof;
  const speed = Math.hypot(vx, vyImp);
  const angle = (Math.atan2(-vyImp, vx) * 180) / Math.PI;
  const steps = [
    { text: "ابتدائی رفتار کے اجزاء:", tex: `v_x = v_0\\cos\\theta = ${T(v0)}\\cos(${T(theta)}^\\circ) = ${T(vx)}\\ m/s,\\qquad v_{y0} = v_0\\sin\\theta = ${T(vy0)}\\ m/s` },
    { text: "سب سے بلند نقطے تک پہنچنے کا وقت (عمودی رفتار صفر ہوتی ہے):", tex: `t_{peak} = \\frac{v_{y0}}{g} = ${T(tPeak)}\\ s` },
    { text: "زیادہ سے زیادہ بلندی:", tex: `H = h_0 + \\frac{v_{y0}^2}{2g} = ${T(h0)} + \\frac{(${T(vy0)})^2}{2 \\times ${T(g)}} = ${T(H)}\\ m` },
    { text: "پرواز کا وقت (h = 0 کی مثبت جڑ):", tex: `t = \\frac{v_{y0} + \\sqrt{v_{y0}^2 + 2gh_0}}{g} = ${T(tof)}\\ s` },
    { text: "افقی فاصلہ:", tex: `R = v_x t = ${T(R)}\\ m` },
    { text: "ٹکراؤ کی رفتار:", tex: `v_y = v_{y0} - gt = ${T(vyImp)}\\ m/s,\\qquad v = \\sqrt{v_x^2 + v_y^2} = ${T(speed)}\\ m/s` },
    { text: "افق سے نیچے ٹکراؤ کا زاویہ:", tex: `\\alpha = \\arctan\\frac{|v_y|}{v_x} = ${T(angle)}^\\circ` }
  ];
  const results = [
    { label: "افقی جزو vx", value: `${fmt(vx, 4)} m/s` },
    { label: "ابتدائی عمودی جزو vy0", value: `${fmt(vy0, 4)} m/s` },
    { label: "سب سے بلند نقطے تک پہنچنے کا وقت", value: `${fmt(tPeak, 4)} s` },
    { label: "زیادہ سے زیادہ بلندی Hmax", value: `${fmt(H, 4)} m` },
    { label: "پرواز کا وقت T", value: `${fmt(tof, 4)} s` },
    { label: "افقی فاصلہ R", value: `${fmt(R, 4)} m` },
    { label: "ٹکراؤ کی رفتار", value: `${fmt(speed, 4)} m/s` },
    { label: "افق سے نیچے ٹکراؤ کا زاویہ", value: `${fmt(angle, 4)}°` }
  ];
  const copy = `R = ${fmt(R, 4)} m، Hmax = ${fmt(H, 4)} m، T = ${fmt(tof, 4)} s`;
  const N = 120;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const s = (tof * i) / N;
    return [vx * s, h0 + vy0 * s - 0.5 * g * s * s];
  });
  const blocks = [
    { type: "plot", title: "پرتابے کا راستہ y بمقابلہ x", xLabel: "x (m)", yLabel: "y (m)", includeZero: true, series: [{ name: "راستہ", points: pts }], hlines: [{ y: H }], vlines: [{ x: R }] }
  ];
  return { results, steps, copy, blocks, values: { vx, vy0, tPeak, H, tof, R, speed, angle } };
}
