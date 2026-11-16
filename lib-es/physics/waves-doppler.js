import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const WAVE = { v: "Velocidad de la onda v", f: "Frecuencia f", lam: "Longitud de onda λ" };
const WAVE_UNIT = { v: "m/s", f: "Hz", lam: "m" };

export const meta = {
  description: "Calcula la velocidad, la frecuencia y la longitud de onda a partir de dos valores, la intensidad del sonido y su nivel en decibelios en ambos sentidos, y la frecuencia percibida por efecto Doppler según el movimiento de fuente y observador.",
  keywords: ["Onda", "Longitud de onda", "Frecuencia", "Intensidad del sonido", "Decibelio", "dB", "Doppler", "Velocidad del sonido", "wave", "doppler", "intensity"],
  formulas: [
    { label: "Ecuación de onda", tex: "v = f\\lambda" },
    { label: "Nivel de intensidad sonora", tex: "\\beta = 10\\log_{10}\\frac{I}{I_0},\\qquad I_0 = 10^{-12}\\ \\frac{W}{m^2}" },
    { label: "Efecto Doppler", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de cálculo", type: "select", default: "wave", options: [["wave", "Onda: v = fλ"], ["intensity", "Intensidad sonora y nivel en decibelios"], ["doppler", "Efecto Doppler"]] },
    { id: "v", label: "Velocidad de la onda v", unit: "m/s", type: "number", default: "340", when: { mode: ["wave"] }, help: "Introduce solo dos valores de v, f y λ." },
    { id: "f", label: "Frecuencia f", unit: "Hz", type: "number", when: { mode: ["wave"] } },
    { id: "lam", label: "Longitud de onda λ", unit: "m", type: "number", default: "0.68", when: { mode: ["wave"] } },
    { id: "intDir", label: "Sentido de la conversión", type: "select", default: "I2b", options: [["I2b", "De la intensidad I al nivel sonoro β"], ["b2I", "Del nivel sonoro β a la intensidad I"]], when: { mode: ["intensity"] } },
    { id: "I", label: "Intensidad sonora I", unit: "W/m²", type: "number", default: "1e-6", when: { mode: ["intensity"], intDir: ["I2b"] } },
    { id: "beta", label: "Nivel sonoro β", unit: "dB", type: "number", default: "60", when: { mode: ["intensity"], intDir: ["b2I"] } },
    { id: "f0", label: "Frecuencia de la fuente f0", unit: "Hz", type: "number", default: "500", when: { mode: ["doppler"] } },
    { id: "c", label: "Velocidad del sonido v", unit: "m/s", type: "number", default: "343", when: { mode: ["doppler"] }, help: "En el aire a 20 °C es de unos 343 m/s." },
    { id: "vo", label: "Velocidad del observador vo", unit: "m/s", type: "number", default: "0", when: { mode: ["doppler"] } },
    { id: "vs", label: "Velocidad de la fuente vs", unit: "m/s", type: "number", default: "30", when: { mode: ["doppler"] } },
    { id: "obsDir", label: "Sentido del observador", type: "select", default: "toward", options: [["toward", "Hacia la fuente"], ["away", "Alejándose de la fuente"]], when: { mode: ["doppler"] } },
    { id: "srcDir", label: "Sentido de la fuente", type: "select", default: "toward", options: [["toward", "Hacia el observador"], ["away", "Alejándose del observador"]], when: { mode: ["doppler"] } }
  ],
  example: {
    values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "30", obsDir: "toward", srcDir: "toward" },
    expect: ["f' = 547.9 Hz"],
    note: "Ejemplo: fuente de 500 Hz que se acerca a un observador fijo a 30 m/s."
  },
  invalid: { values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "343", obsDir: "toward", srcDir: "toward" } },
  related: ["harmonic-motion", "optics", "unit-converter", "formulas-constants"]
};

function wave(input) {
  const keys = ["v", "f", "lam"];
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => isBlank(input[k]));
    fail(`Introduce exactamente dos valores de v, f y λ (introdujiste ${given.length}).`, field);
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
      { text: "Relación fundamental de la onda:", tex: "v = f\\lambda" },
      { text: `Calculamos ${WAVE[unknown]}:`, tex }
    ],
    copy: `v = ${fmt(q.v, 4)} m/s, f = ${fmt(q.f, 4)} Hz, λ = ${fmt(q.lam, 4)} m`
  };
}

function intensity(input) {
  const dir = choice(input, "intDir", "Sentido de la conversión", ["I2b", "b2I"], "I2b");
  if (dir === "I2b") {
    const I = num(input, "I", "Intensidad sonora I", { positive: true });
    const beta = 10 * Math.log10(I / 1e-12);
    return {
      results: [
        { label: "Nivel sonoro β", value: `${fmt(beta, 4)} dB` },
        { label: "Intensidad sonora I", value: `${fmt(I, 4)} W/m²` }
      ],
      steps: [
        { text: "Nivel sonoro en decibelios:", tex: `\\beta = 10\\log_{10}\\frac{I}{I_0} = 10\\log_{10}\\frac{${ntex(I)}}{10^{-12}} = ${ntex(beta, 6)}\\ dB` }
      ],
      copy: `β = ${fmt(beta, 4)} dB (I = ${fmt(I, 4)} W/m²)`
    };
  }
  const beta = num(input, "beta", "Nivel sonoro β");
  const I = 1e-12 * Math.pow(10, beta / 10);
  return {
    results: [
      { label: "Intensidad sonora I", value: `${fmt(I, 4)} W/m²` },
      { label: "Nivel sonoro β", value: `${fmt(beta, 4)} dB` }
    ],
    steps: [
      { text: "Intensidad a partir del nivel sonoro:", tex: `I = I_0\\,10^{\\beta/10} = 10^{-12} \\times 10^{${ntex(beta / 10, 6)}} = ${ntex(I, 6)}\\ W/m^2` }
    ],
    copy: `I = ${fmt(I, 4)} W/m² (β = ${fmt(beta, 4)} dB)`
  };
}

function doppler(input) {
  const f0 = num(input, "f0", "Frecuencia de la fuente f0", { positive: true });
  const c = num(input, "c", "Velocidad del sonido v", { positive: true });
  const vo = num(input, "vo", "Velocidad del observador vo", { nonNegative: true });
  const vs = num(input, "vs", "Velocidad de la fuente vs", { nonNegative: true });
  const obsDir = choice(input, "obsDir", "Sentido del observador", ["toward", "away"], "toward");
  const srcDir = choice(input, "srcDir", "Sentido de la fuente", ["toward", "away"], "toward");
  if (srcDir === "toward" && vs >= c) fail("Al acercarse la fuente, su velocidad debe ser menor que la del sonido; de lo contrario, las ondas no llegan al observador.", "vs");
  if (obsDir === "away" && vo >= c) fail("Al alejarse el observador, su velocidad debe ser menor que la del sonido.", "vo");
  const numer = obsDir === "toward" ? c + vo : c - vo;
  const denom = srcDir === "toward" ? c - vs : c + vs;
  const f = f0 * numer / denom;
  const os = obsDir === "toward" ? "+" : "-";
  const ss = srcDir === "toward" ? "-" : "+";
  const trend = f > f0 ? "Frecuencia mayor (acercamiento)" : f < f0 ? "Frecuencia menor (alejamiento)" : "La frecuencia no cambia";
  return {
    results: [
      { label: "Frecuencia percibida f'", value: `${fmt(f, 4)} Hz` },
      { label: "Variación Δf", value: `${fmt(f - f0, 4)} Hz` },
      { label: "Tendencia", value: trend }
    ],
    steps: [
      { text: "Efecto Doppler:", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" },
      { text: "Sustituyendo:", tex: `f' = ${ntex(f0)} \\times \\frac{${ntex(c)} ${os} ${ntex(vo)}}{${ntex(c)} ${ss} ${ntex(vs)}} = ${ntex(f, 6)}\\ Hz` }
    ],
    copy: `f' = ${fmt(f, 4)} Hz (${trend})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de cálculo", ["wave", "intensity", "doppler"], "wave");
  if (mode === "intensity") return intensity(input);
  if (mode === "doppler") return doppler(input);
  return wave(input);
}
