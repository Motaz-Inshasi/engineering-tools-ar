import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "پاسخ پله سیستم‌های مرتبه اول و دوم: معادله زمانی، زمان صعود، زمان اوج، درصد فراجهش و زمان نشست، برای حالت‌های کم‌میرا و میرایی بحرانی و پرمیرا، همراه با نمودار.",
  keywords: ["پاسخ پله", "step response", "سیستم مرتبه دوم", "سیستم مرتبه اول", "فراجهش", "overshoot", "زمان نشست", "زمان صعود", "ضریب میرایی"],
  formulas: [
    { label: "مرتبه اول", tex: "G(s) = \\frac{K}{\\tau s + 1} \\Rightarrow y(t) = K\\left(1 - e^{-t/\\tau}\\right)" },
    { label: "مرتبه دوم (کم‌میرا)", tex: "G(s) = \\frac{K\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2},\\; \\%OS = 100\\,e^{-\\zeta\\pi/\\sqrt{1-\\zeta^2}},\\; T_p = \\frac{\\pi}{\\omega_d},\\; T_s \\approx \\frac{4}{\\zeta\\omega_n}" }
  ],
  inputs: [
    { id: "order", label: "مرتبه سیستم", type: "select", default: "2", options: [["1", "اول"], ["2", "دوم"]] },
    { id: "K", label: "بهره ایستای K", type: "number", default: "1" },
    { id: "tau", label: "ثابت زمانی τ", unit: "s", type: "number", default: "0.5", when: { order: ["1"] } },
    { id: "wn", label: "فرکانس طبیعی ωn", unit: "rad/s", type: "number", default: "4", when: { order: ["2"] } },
    { id: "zeta", label: "ضریب میرایی ζ", type: "number", default: "0.3", when: { order: ["2"] } }
  ],
  example: { values: { order: "2", K: "1", wn: "4", zeta: "0.3" }, expect: ["OS = 37.2"], note: "مثال: سیستم مرتبه دوم با $\\omega_n = 4$ و $\\zeta = 0.3$ (کم‌میرا)." },
  invalid: { values: { order: "2", K: "1", wn: "4", zeta: "-0.5" } },
  related: ["transfer-function", "bode-plot", "routh-hurwitz", "rc-rl-transient"]
};

export function response(order, p) {
  const { K } = p;
  if (order === 1) return (t) => (t < 0 ? 0 : K * (1 - Math.exp(-t / p.tau)));
  const { wn, zeta } = p;
  if (zeta < 1) {
    const wd = wn * Math.sqrt(1 - zeta * zeta);
    return (t) => (t < 0 ? 0 : K * (1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t))));
  }
  if (zeta === 1) return (t) => (t < 0 ? 0 : K * (1 - Math.exp(-wn * t) * (1 + wn * t)));
  const r = Math.sqrt(zeta * zeta - 1);
  const s1 = -wn * (zeta - r), s2 = -wn * (zeta + r);
  return (t) => (t < 0 ? 0 : K * (1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2)));
}

export function metrics(y, K, tEnd, n = 20000) {
  const dt = tEnd / n;
  let t10 = null, t90 = null, peak = -Infinity, tp = 0, ts = 0;
  const sgn = Math.sign(K) || 1;
  for (let i = 0; i <= n; i++) {
    const t = i * dt, v = y(t) * sgn, k = Math.abs(K);
    if (t10 === null && v >= 0.1 * k) t10 = t;
    if (t90 === null && v >= 0.9 * k) t90 = t;
    if (v > peak) { peak = v; tp = t; }
    if (Math.abs(v - k) > 0.02 * k) ts = t + dt;
  }
  return { tr: t10 !== null && t90 !== null ? t90 - t10 : NaN, peak: peak * sgn, tp, ts: ts >= tEnd ? Infinity : ts, os: Math.max(0, (100 * (peak - Math.abs(K))) / Math.abs(K)) };
}

export function solve(input) {
  const order = Number(choice(input, "order", "مرتبه سیستم", ["1", "2"], "2"));
  const K = num(input, "K", "بهره", { nonZero: true });
  const steps = [];
  let y, tEnd, results, copy;
  if (order === 1) {
    const tau = num(input, "tau", "ثابت زمانی", { positive: true });
    y = response(1, { K, tau });
    tEnd = 6 * tau;
    const m = metrics(y, K, tEnd);
    steps.push({ text: "پاسخ پله مرتبه اول با اعمال وارون تبدیل لاپلاس روی $\\frac{K}{s(\\tau s+1)}$:", tex: `y(t) = ${ntex(K)}\\left(1 - e^{-t/${ntex(tau)}}\\right)` });
    steps.push(`پس از یک ثابت زمانی پاسخ به 63.2% از مقدار نهایی می‌رسد: $y(\\tau) = ${ntex(y(tau), 6)}$.`);
    steps.push({ text: "زمان صعود (10% تا 90%) و زمان نشست (2%):", tex: `T_r = \\tau\\ln 9 = ${ntex(2.1972 * tau, 6)}\\ s,\\qquad T_s = \\tau\\ln 50 \\approx 4\\tau = ${ntex(3.912 * tau, 6)}\\ s` });
    results = [
      { label: "مقدار نهایی", value: K, sig: 8 },
      { label: "زمان صعود 10–90%", value: m.tr, unit: "s", sig: 5 },
      { label: "زمان نشست 2%", value: m.ts, unit: "s", sig: 5 },
      { label: "فراجهش", value: 0, unit: "%" }
    ];
    copy = `Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s, OS = 0%`;
  } else {
    const wn = num(input, "wn", "فرکانس طبیعی", { positive: true });
    const zeta = num(input, "zeta", "ضریب میرایی", { nonNegative: true });
    if (zeta > 100) fail("ضریب میرایی خیلی بزرگ است.", "zeta");
    y = response(2, { K, wn, zeta });
    const kind = zeta === 0 ? "بدون میرایی (نوسان دائم)" : zeta < 1 ? "کم‌میرا (نوسان میراشونده)" : zeta === 1 ? "میرایی بحرانی" : "پرمیرا (بدون نوسان)";
    steps.push({ text: `قطب‌ها ریشه‌های $s^2 + 2\\zeta\\omega_n s + \\omega_n^2$ هستند و سیستم ${kind} است.`, tex: zeta < 1 ? `s = -${ntex(zeta * wn, 6)} \\pm j${ntex(wn * Math.sqrt(1 - zeta * zeta), 6)}` : `s = ${ntex(-wn * (zeta - Math.sqrt(zeta * zeta - 1)), 6)},\\; ${ntex(-wn * (zeta + Math.sqrt(zeta * zeta - 1)), 6)}` });
    if (zeta === 0) {
      tEnd = (6 * 2 * Math.PI) / wn;
      steps.push({ text: "بدون میرایی پاسخ همیشه حول K نوسان می‌کند:", tex: `y(t) = ${ntex(K)}\\left(1 - \\cos ${ntex(wn)}t\\right)` });
      results = [
        { label: "نوع پاسخ", value: kind },
        { label: "فرکانس نوسان", value: wn, unit: "rad/s", sig: 6 },
        { label: "بیشترین مقدار", value: 2 * K, sig: 6 },
        { label: "فراجهش", value: 100, unit: "%" },
        { label: "زمان نشست", value: "نمی‌نشیند" }
      ];
      copy = `undamped, OS = 100%`;
    } else {
      tEnd = Math.max(12 / (zeta * wn), zeta >= 1 ? 12 * zeta / wn : 0);
      const m = metrics(y, K, tEnd);
      if (zeta < 1) {
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        const os = 100 * Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
        steps.push({ text: "پاسخ زمانی (وارون لاپلاس):", tex: `y(t) = ${ntex(K)}\\left[1 - e^{-${ntex(zeta * wn, 6)}t}\\left(\\cos ${ntex(wd, 6)}t + ${ntex(zeta / Math.sqrt(1 - zeta * zeta), 6)}\\sin ${ntex(wd, 6)}t\\right)\\right]` });
        steps.push({ text: "زمان اوج و درصد فراجهش از فرمول‌ها:", tex: `T_p = \\frac{\\pi}{\\omega_d} = ${ntex(Math.PI / wd, 6)}\\ s,\\quad \\%OS = ${ntex(os, 6)}\\%` });
        steps.push({ text: "زمان نشست تقریبی (2%):", tex: `T_s \\approx \\frac{4}{\\zeta\\omega_n} = ${ntex(4 / (zeta * wn), 6)}\\ s` });
        steps.push(`مقادیر دقیق از شبیه‌سازی منحنی: زمان صعود ${fmt(m.tr, 5)} ثانیه و زمان نشست واقعی ${fmt(m.ts, 5)} ثانیه.`);
        results = [
          { label: "نوع پاسخ", value: kind },
          { label: "درصد فراجهش", value: os, unit: "%", sig: 5, text: `OS = ${fmt(os, 5)}%` },
          { label: "زمان اوج Tp", value: Math.PI / wd, unit: "s", sig: 5 },
          { label: "زمان صعود 10–90%", value: m.tr, unit: "s", sig: 5 },
          { label: "زمان نشست 2% (واقعی)", value: m.ts, unit: "s", sig: 5 },
          { label: "زمان نشست تقریبی 4/(ζωn)", value: 4 / (zeta * wn), unit: "s", sig: 5 },
          { label: "فرکانس میراشده ωd", value: wd, unit: "rad/s", sig: 5 }
        ];
        copy = `OS = ${fmt(os, 5)}%, Tp = ${fmt(Math.PI / wd, 5)} s, Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s`;
      } else {
        steps.push(zeta === 1 ? { text: "حالت میرایی بحرانی:", tex: `y(t) = ${ntex(K)}\\left[1 - e^{-${ntex(wn)}t}(1 + ${ntex(wn)}t)\\right]` } : "حالت پرمیرا: دو قطب حقیقی منفی، و پاسخ مجموع دو تابع نمایی است بدون نوسان و بدون فراجهش.");
        steps.push(`مقادیر از شبیه‌سازی منحنی: زمان صعود ${fmt(m.tr, 5)} ثانیه و زمان نشست ${fmt(m.ts, 5)} ثانیه.`);
        results = [
          { label: "نوع پاسخ", value: kind },
          { label: "درصد فراجهش", value: 0, unit: "%", text: "OS = 0%" },
          { label: "زمان صعود 10–90%", value: m.tr, unit: "s", sig: 5 },
          { label: "زمان نشست 2%", value: m.ts, unit: "s", sig: 5 }
        ];
        copy = `OS = 0%, Tr = ${fmt(m.tr, 5)} s, Ts = ${fmt(m.ts, 5)} s`;
      }
    }
  }
  return {
    results, steps, copy,
    blocks: [{ type: "plot", title: "پاسخ پله", xLabel: "t (s)", yLabel: "y(t)", includeZero: true, series: [{ name: "y(t)", points: sampleFunction(y, 0, tEnd, 600) }], hlines: [{ y: K }] }]
  };
}
