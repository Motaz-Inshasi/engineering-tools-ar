import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const WAVE = { v: "موج کی رفتار v", f: "تعدد f", lam: "طولِ موج λ" };
const WAVE_UNIT = { v: "m/s", f: "Hz", lam: "m" };

export const meta = {
  description: "کوئی بھی دو قدریں دے کر موج کی رفتار، تعدد اور طولِ موج، دونوں سمتوں میں آواز کی شدت اور ڈیسیبل کی سطح، اور ڈاپلر اثر کے تحت سنائی دینے والا تعدد، ماخذ اور مشاہدہ کار کی حرکت کے ساتھ حساب کریں۔",
  keywords: ["موج", "طولِ موج", "تعدد", "آواز کی شدت", "ڈیسیبل", "dB", "ڈاپلر", "آواز کی رفتار", "wave", "doppler", "intensity"],
  formulas: [
    { label: "موج کی مساوات", tex: "v = f\\lambda" },
    { label: "آواز کی شدت کی سطح", tex: "\\beta = 10\\log_{10}\\frac{I}{I_0},\\qquad I_0 = 10^{-12}\\ \\frac{W}{m^2}" },
    { label: "ڈاپلر اثر", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" }
  ],
  inputs: [
    { id: "mode", label: "حساب کی قسم", type: "select", default: "wave", options: [["wave", "موج: v = fλ"], ["intensity", "آواز کی شدت اور ڈیسیبل کی سطح"], ["doppler", "ڈاپلر اثر"]] },
    { id: "v", label: "موج کی رفتار v", unit: "m/s", type: "number", default: "340", when: { mode: ["wave"] }, help: "v، f اور λ میں سے صرف دو قدریں درج کریں۔" },
    { id: "f", label: "تعدد f", unit: "Hz", type: "number", when: { mode: ["wave"] } },
    { id: "lam", label: "طولِ موج λ", unit: "m", type: "number", default: "0.68", when: { mode: ["wave"] } },
    { id: "intDir", label: "تبدیلی کی سمت", type: "select", default: "I2b", options: [["I2b", "شدت I سے آواز کی سطح β تک"], ["b2I", "آواز کی سطح β سے شدت I تک"]], when: { mode: ["intensity"] } },
    { id: "I", label: "آواز کی شدت I", unit: "W/m²", type: "number", default: "1e-6", when: { mode: ["intensity"], intDir: ["I2b"] } },
    { id: "beta", label: "آواز کی سطح β", unit: "dB", type: "number", default: "60", when: { mode: ["intensity"], intDir: ["b2I"] } },
    { id: "f0", label: "ماخذ کا تعدد f0", unit: "Hz", type: "number", default: "500", when: { mode: ["doppler"] } },
    { id: "c", label: "آواز کی رفتار v", unit: "m/s", type: "number", default: "343", when: { mode: ["doppler"] }, help: "20°C پر ہوا میں تقریباً 343 m/s۔" },
    { id: "vo", label: "مشاہدہ کار کی رفتار vo", unit: "m/s", type: "number", default: "0", when: { mode: ["doppler"] } },
    { id: "vs", label: "ماخذ کی رفتار vs", unit: "m/s", type: "number", default: "30", when: { mode: ["doppler"] } },
    { id: "obsDir", label: "مشاہدہ کار کی سمت", type: "select", default: "toward", options: [["toward", "ماخذ کی طرف"], ["away", "ماخذ سے دور"]], when: { mode: ["doppler"] } },
    { id: "srcDir", label: "ماخذ کی سمت", type: "select", default: "toward", options: [["toward", "مشاہدہ کار کی طرف"], ["away", "مشاہدہ کار سے دور"]], when: { mode: ["doppler"] } }
  ],
  example: {
    values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "30", obsDir: "toward", srcDir: "toward" },
    expect: ["f' = 547.9 Hz"],
    note: "مثال: 500 Hz تعدد کا ماخذ 30 m/s کی رفتار سے ساکن مشاہدہ کار کی طرف آ رہا ہے۔"
  },
  invalid: { values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "343", obsDir: "toward", srcDir: "toward" } },
  related: ["harmonic-motion", "optics", "unit-converter", "formulas-constants"]
};

function wave(input) {
  const keys = ["v", "f", "lam"];
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => isBlank(input[k]));
    fail(`v، f اور λ میں سے ٹھیک دو قدریں درج کریں (آپ نے ${given.length} درج کی ہیں)۔`, field);
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
      { text: "موج کا بنیادی تعلق:", tex: "v = f\\lambda" },
      { text: `ہم ${WAVE[unknown]} حساب کرتے ہیں:`, tex }
    ],
    copy: `v = ${fmt(q.v, 4)} m/s, f = ${fmt(q.f, 4)} Hz, λ = ${fmt(q.lam, 4)} m`
  };
}

function intensity(input) {
  const dir = choice(input, "intDir", "تبدیلی کی سمت", ["I2b", "b2I"], "I2b");
  if (dir === "I2b") {
    const I = num(input, "I", "آواز کی شدت I", { positive: true });
    const beta = 10 * Math.log10(I / 1e-12);
    return {
      results: [
        { label: "آواز کی سطح β", value: `${fmt(beta, 4)} dB` },
        { label: "آواز کی شدت I", value: `${fmt(I, 4)} W/m²` }
      ],
      steps: [
        { text: "ڈیسیبل میں آواز کی سطح:", tex: `\\beta = 10\\log_{10}\\frac{I}{I_0} = 10\\log_{10}\\frac{${ntex(I)}}{10^{-12}} = ${ntex(beta, 6)}\\ dB` }
      ],
      copy: `β = ${fmt(beta, 4)} dB (I = ${fmt(I, 4)} W/m²)`
    };
  }
  const beta = num(input, "beta", "آواز کی سطح β");
  const I = 1e-12 * Math.pow(10, beta / 10);
  return {
    results: [
      { label: "آواز کی شدت I", value: `${fmt(I, 4)} W/m²` },
      { label: "آواز کی سطح β", value: `${fmt(beta, 4)} dB` }
    ],
    steps: [
      { text: "آواز کی سطح سے شدت:", tex: `I = I_0\\,10^{\\beta/10} = 10^{-12} \\times 10^{${ntex(beta / 10, 6)}} = ${ntex(I, 6)}\\ W/m^2` }
    ],
    copy: `I = ${fmt(I, 4)} W/m² (β = ${fmt(beta, 4)} dB)`
  };
}

function doppler(input) {
  const f0 = num(input, "f0", "ماخذ کا تعدد f0", { positive: true });
  const c = num(input, "c", "آواز کی رفتار v", { positive: true });
  const vo = num(input, "vo", "مشاہدہ کار کی رفتار vo", { nonNegative: true });
  const vs = num(input, "vs", "ماخذ کی رفتار vs", { nonNegative: true });
  const obsDir = choice(input, "obsDir", "مشاہدہ کار کی سمت", ["toward", "away"], "toward");
  const srcDir = choice(input, "srcDir", "ماخذ کی سمت", ["toward", "away"], "toward");
  if (srcDir === "toward" && vs >= c) fail("ماخذ کے قریب آنے کی صورت میں اس کی رفتار آواز کی رفتار سے کم ہونی چاہیے، ورنہ موجیں مشاہدہ کار تک نہیں پہنچتیں۔", "vs");
  if (obsDir === "away" && vo >= c) fail("مشاہدہ کار کے دور جانے کی صورت میں اس کی رفتار آواز کی رفتار سے کم ہونی چاہیے۔", "vo");
  const numer = obsDir === "toward" ? c + vo : c - vo;
  const denom = srcDir === "toward" ? c - vs : c + vs;
  const f = f0 * numer / denom;
  const os = obsDir === "toward" ? "+" : "-";
  const ss = srcDir === "toward" ? "-" : "+";
  const trend = f > f0 ? "زیادہ تعدد (قریب آنا)" : f < f0 ? "کم تعدد (دور جانا)" : "تعدد تبدیل نہیں ہوتا";
  return {
    results: [
      { label: "سنائی دینے والا تعدد f'", value: `${fmt(f, 4)} Hz` },
      { label: "تبدیلی Δf", value: `${fmt(f - f0, 4)} Hz` },
      { label: "سمت", value: trend }
    ],
    steps: [
      { text: "ڈاپلر اثر:", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" },
      { text: "قیمتیں رکھنے پر:", tex: `f' = ${ntex(f0)} \\times \\frac{${ntex(c)} ${os} ${ntex(vo)}}{${ntex(c)} ${ss} ${ntex(vs)}} = ${ntex(f, 6)}\\ Hz` }
    ],
    copy: `f' = ${fmt(f, 4)} Hz (${trend})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کی قسم", ["wave", "intensity", "doppler"], "wave");
  if (mode === "intensity") return intensity(input);
  if (mode === "doppler") return doppler(input);
  return wave(input);
}
