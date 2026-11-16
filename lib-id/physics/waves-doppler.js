import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const WAVE = { v: "سرعة الموجة v", f: "التردد f", lam: "الطول الموجي λ" };
const WAVE_UNIT = { v: "m/s", f: "Hz", lam: "m" };

export const meta = {
  description: "احسب سرعة الموجة وترددها وطولها الموجي من أي قيمتين، وشدة الصوت ومستوى الديسيبل في الاتجاهين، وتردد الصوت المسموع عند تأثير دوبلر مع حركة المصدر والراصد.",
  keywords: ["موجة", "طول موجي", "تردد", "شدة الصوت", "ديسيبل", "dB", "دوبلر", "سرعة الصوت", "wave", "doppler", "intensity"],
  formulas: [
    { label: "معادلة الموجة", tex: "v = f\\lambda" },
    { label: "مستوى شدة الصوت", tex: "\\beta = 10\\log_{10}\\frac{I}{I_0},\\qquad I_0 = 10^{-12}\\ \\frac{W}{m^2}" },
    { label: "تأثير دوبلر", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" }
  ],
  inputs: [
    { id: "mode", label: "نوع الحساب", type: "select", default: "wave", options: [["wave", "الموجة: v = fλ"], ["intensity", "شدة الصوت ومستوى الديسيبل"], ["doppler", "تأثير دوبلر"]] },
    { id: "v", label: "سرعة الموجة v", unit: "m/s", type: "number", default: "340", when: { mode: ["wave"] }, help: "أدخل قيمتين فقط من v وf وλ." },
    { id: "f", label: "التردد f", unit: "Hz", type: "number", when: { mode: ["wave"] } },
    { id: "lam", label: "الطول الموجي λ", unit: "m", type: "number", default: "0.68", when: { mode: ["wave"] } },
    { id: "intDir", label: "اتجاه التحويل", type: "select", default: "I2b", options: [["I2b", "من الشدة I إلى مستوى الصوت β"], ["b2I", "من مستوى الصوت β إلى الشدة I"]], when: { mode: ["intensity"] } },
    { id: "I", label: "شدة الصوت I", unit: "W/m²", type: "number", default: "1e-6", when: { mode: ["intensity"], intDir: ["I2b"] } },
    { id: "beta", label: "مستوى الصوت β", unit: "dB", type: "number", default: "60", when: { mode: ["intensity"], intDir: ["b2I"] } },
    { id: "f0", label: "تردد المصدر f0", unit: "Hz", type: "number", default: "500", when: { mode: ["doppler"] } },
    { id: "c", label: "سرعة الصوت v", unit: "m/s", type: "number", default: "343", when: { mode: ["doppler"] }, help: "في الهواء عند 20°C حوالي 343 m/s." },
    { id: "vo", label: "سرعة الراصد vo", unit: "m/s", type: "number", default: "0", when: { mode: ["doppler"] } },
    { id: "vs", label: "سرعة المصدر vs", unit: "m/s", type: "number", default: "30", when: { mode: ["doppler"] } },
    { id: "obsDir", label: "اتجاه الراصد", type: "select", default: "toward", options: [["toward", "نحو المصدر"], ["away", "بعيداً عن المصدر"]], when: { mode: ["doppler"] } },
    { id: "srcDir", label: "اتجاه المصدر", type: "select", default: "toward", options: [["toward", "نحو الراصد"], ["away", "بعيداً عن الراصد"]], when: { mode: ["doppler"] } }
  ],
  example: {
    values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "30", obsDir: "toward", srcDir: "toward" },
    expect: ["f' = 547.9 Hz"],
    note: "مثال: مصدر تردده 500 Hz يقترب من راصد ثابت بسرعة 30 m/s."
  },
  invalid: { values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "343", obsDir: "toward", srcDir: "toward" } },
  related: ["harmonic-motion", "optics", "unit-converter", "formulas-constants"]
};

function wave(input) {
  const keys = ["v", "f", "lam"];
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => isBlank(input[k]));
    fail(`أدخل قيمتين بالضبط من v وf وλ (أدخلت ${given.length}).`, field);
  }
  const unknown = keys.find((k) => !given.includes(k));
  const x = {};
  for (const k of given) x[k] = num(input, k, WAVE[k], { positive: true });
  const q = { ...x };
  q[unknown] = unknown === "v" ? q.f * q.lam : unknown === "f" ? q.v / q.lam : q.v / q.f;
  const tex = {
    v: `v = f\\lambda = ${ntex(q.f)} \\times ${ntex(q.lam)} = ${ntex(q.v, 6)}\\ m/s`,
    f: `f = \\frac{v}{\\lambda} = \\frac{${ntex(q.v)}}{${ntex(q.lam)}} = ${ntex(q.f, 6)}\\ Hz`,
    lam: `\\lambda = \\frac{v}{f} = \\frac{${ntex(q.v)}}{${ntex(q.f)}} = ${ntex(q.lam, 6)}\\ m`
  }[unknown];
  return {
    results: ["v", "f", "lam"].map((k) => ({ label: WAVE[k], value: `${fmt(q[k], 4)} ${WAVE_UNIT[k]}` })),
    steps: [
      { text: "العلاقة الأساسية للموجة:", tex: "v = f\\lambda" },
      { text: `نحسب ${WAVE[unknown]}:`, tex }
    ],
    copy: `v = ${fmt(q.v, 4)} m/s, f = ${fmt(q.f, 4)} Hz, λ = ${fmt(q.lam, 4)} m`
  };
}

function intensity(input) {
  const dir = choice(input, "intDir", "اتجاه التحويل", ["I2b", "b2I"], "I2b");
  if (dir === "I2b") {
    const I = num(input, "I", "شدة الصوت I", { positive: true });
    const beta = 10 * Math.log10(I / 1e-12);
    return {
      results: [
        { label: "مستوى الصوت β", value: `${fmt(beta, 4)} dB` },
        { label: "شدة الصوت I", value: `${fmt(I, 4)} W/m²` }
      ],
      steps: [
        { text: "مستوى الصوت بالديسيبل:", tex: `\\beta = 10\\log_{10}\\frac{I}{I_0} = 10\\log_{10}\\frac{${ntex(I)}}{10^{-12}} = ${ntex(beta, 6)}\\ dB` }
      ],
      copy: `β = ${fmt(beta, 4)} dB (I = ${fmt(I, 4)} W/m²)`
    };
  }
  const beta = num(input, "beta", "مستوى الصوت β");
  const I = 1e-12 * Math.pow(10, beta / 10);
  return {
    results: [
      { label: "شدة الصوت I", value: `${fmt(I, 4)} W/m²` },
      { label: "مستوى الصوت β", value: `${fmt(beta, 4)} dB` }
    ],
    steps: [
      { text: "الشدة من مستوى الصوت:", tex: `I = I_0\\,10^{\\beta/10} = 10^{-12} \\times 10^{${ntex(beta / 10, 6)}} = ${ntex(I, 6)}\\ W/m^2` }
    ],
    copy: `I = ${fmt(I, 4)} W/m² (β = ${fmt(beta, 4)} dB)`
  };
}

function doppler(input) {
  const f0 = num(input, "f0", "تردد المصدر f0", { positive: true });
  const c = num(input, "c", "سرعة الصوت v", { positive: true });
  const vo = num(input, "vo", "سرعة الراصد vo", { nonNegative: true });
  const vs = num(input, "vs", "سرعة المصدر vs", { nonNegative: true });
  const obsDir = choice(input, "obsDir", "اتجاه الراصد", ["toward", "away"], "toward");
  const srcDir = choice(input, "srcDir", "اتجاه المصدر", ["toward", "away"], "toward");
  if (srcDir === "toward" && vs >= c) fail("عند اقتراب المصدر يجب أن تكون سرعته أقل من سرعة الصوت، وإلا لا تصل الموجات إلى الراصد.", "vs");
  if (obsDir === "away" && vo >= c) fail("عند ابتعاد الراصد يجب أن تكون سرعته أقل من سرعة الصوت.", "vo");
  const numer = obsDir === "toward" ? c + vo : c - vo;
  const denom = srcDir === "toward" ? c - vs : c + vs;
  const f = f0 * numer / denom;
  const os = obsDir === "toward" ? "+" : "-";
  const ss = srcDir === "toward" ? "-" : "+";
  const trend = f > f0 ? "تردد أعلى (اقتراب)" : f < f0 ? "تردد أقل (ابتعاد)" : "لا يتغير التردد";
  return {
    results: [
      { label: "التردد المسموع f'", value: `${fmt(f, 4)} Hz` },
      { label: "التغير Δf", value: `${fmt(f - f0, 4)} Hz` },
      { label: "الاتجاه", value: trend }
    ],
    steps: [
      { text: "تأثير دوبلر:", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" },
      { text: "بالتعويض:", tex: `f' = ${ntex(f0)} \\times \\frac{${ntex(c)} ${os} ${ntex(vo)}}{${ntex(c)} ${ss} ${ntex(vs)}} = ${ntex(f, 6)}\\ Hz` }
    ],
    copy: `f' = ${fmt(f, 4)} Hz (${trend})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع الحساب", ["wave", "intensity", "doppler"], "wave");
  if (mode === "intensity") return intensity(input);
  if (mode === "doppler") return doppler(input);
  return wave(input);
}
