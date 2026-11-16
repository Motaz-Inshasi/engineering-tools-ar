import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const WAVE = { v: "Wave speed v", f: "Frequency f", lam: "Wavelength λ" };
const WAVE_UNIT = { v: "m/s", f: "Hz", lam: "m" };

export const meta = {
  description: "Computes the wave speed, frequency and wavelength from any two of them, the sound intensity and decibel level in both directions, and the heard frequency under the Doppler effect with source and observer motion.",
  keywords: ["wave", "wavelength", "frequency", "sound intensity", "decibel", "dB", "Doppler", "speed of sound", "wave", "doppler", "intensity"],
  formulas: [
    { label: "Wave equation", tex: "v = f\\lambda" },
    { label: "Sound intensity level", tex: "\\beta = 10\\log_{10}\\frac{I}{I_0},\\qquad I_0 = 10^{-12}\\ \\frac{W}{m^2}" },
    { label: "Doppler effect", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" }
  ],
  inputs: [
    { id: "mode", label: "Calculation type", type: "select", default: "wave", options: [["wave", "Wave: v = fλ"], ["intensity", "Sound intensity and decibel level"], ["doppler", "Doppler effect"]] },
    { id: "v", label: "Wave speed v", unit: "m/s", type: "number", default: "340", when: { mode: ["wave"] }, help: "Enter only two of v, f and λ." },
    { id: "f", label: "Frequency f", unit: "Hz", type: "number", when: { mode: ["wave"] } },
    { id: "lam", label: "Wavelength λ", unit: "m", type: "number", default: "0.68", when: { mode: ["wave"] } },
    { id: "intDir", label: "Conversion direction", type: "select", default: "I2b", options: [["I2b", "From intensity I to sound level β"], ["b2I", "From sound level β to intensity I"]], when: { mode: ["intensity"] } },
    { id: "I", label: "Sound intensity I", unit: "W/m²", type: "number", default: "1e-6", when: { mode: ["intensity"], intDir: ["I2b"] } },
    { id: "beta", label: "Sound level β", unit: "dB", type: "number", default: "60", when: { mode: ["intensity"], intDir: ["b2I"] } },
    { id: "f0", label: "Source frequency f0", unit: "Hz", type: "number", default: "500", when: { mode: ["doppler"] } },
    { id: "c", label: "Speed of sound v", unit: "m/s", type: "number", default: "343", when: { mode: ["doppler"] }, help: "In air at 20°C, about 343 m/s." },
    { id: "vo", label: "Observer speed vo", unit: "m/s", type: "number", default: "0", when: { mode: ["doppler"] } },
    { id: "vs", label: "Source speed vs", unit: "m/s", type: "number", default: "30", when: { mode: ["doppler"] } },
    { id: "obsDir", label: "Observer direction", type: "select", default: "toward", options: [["toward", "toward the source"], ["away", "away from the source"]], when: { mode: ["doppler"] } },
    { id: "srcDir", label: "Source direction", type: "select", default: "toward", options: [["toward", "toward the observer"], ["away", "away from the observer"]], when: { mode: ["doppler"] } }
  ],
  example: {
    values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "30", obsDir: "toward", srcDir: "toward" },
    expect: ["f' = 547.9 Hz"],
    note: "Example: a source of frequency 500 Hz approaching a stationary observer at 30 m/s."
  },
  invalid: { values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "343", obsDir: "toward", srcDir: "toward" } },
  related: ["harmonic-motion", "optics", "unit-converter", "formulas-constants"]
};

function wave(input) {
  const keys = ["v", "f", "lam"];
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => isBlank(input[k]));
    fail(`Enter exactly two of v, f and λ (you entered ${given.length}).`, field);
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
      { text: "Basic wave relation:", tex: "v = f\\lambda" },
      { text: `We calculate ${WAVE[unknown]}:`, tex }
    ],
    copy: `v = ${fmt(q.v, 4)} m/s, f = ${fmt(q.f, 4)} Hz, λ = ${fmt(q.lam, 4)} m`
  };
}

function intensity(input) {
  const dir = choice(input, "intDir", "Conversion direction", ["I2b", "b2I"], "I2b");
  if (dir === "I2b") {
    const I = num(input, "I", "Sound intensity I", { positive: true });
    const beta = 10 * Math.log10(I / 1e-12);
    return {
      results: [
        { label: "Sound level β", value: `${fmt(beta, 4)} dB` },
        { label: "Sound intensity I", value: `${fmt(I, 4)} W/m²` }
      ],
      steps: [
        { text: "Sound level in decibels:", tex: `\\beta = 10\\log_{10}\\frac{I}{I_0} = 10\\log_{10}\\frac{${ntex(I)}}{10^{-12}} = ${ntex(beta, 6)}\\ dB` }
      ],
      copy: `β = ${fmt(beta, 4)} dB (I = ${fmt(I, 4)} W/m²)`
    };
  }
  const beta = num(input, "beta", "Sound level β");
  const I = 1e-12 * Math.pow(10, beta / 10);
  return {
    results: [
      { label: "Sound intensity I", value: `${fmt(I, 4)} W/m²` },
      { label: "Sound level β", value: `${fmt(beta, 4)} dB` }
    ],
    steps: [
      { text: "Intensity from the sound level:", tex: `I = I_0\\,10^{\\beta/10} = 10^{-12} \\times 10^{${ntex(beta / 10, 6)}} = ${ntex(I, 6)}\\ W/m^2` }
    ],
    copy: `I = ${fmt(I, 4)} W/m² (β = ${fmt(beta, 4)} dB)`
  };
}

function doppler(input) {
  const f0 = num(input, "f0", "Source frequency f0", { positive: true });
  const c = num(input, "c", "Speed of sound v", { positive: true });
  const vo = num(input, "vo", "Observer speed vo", { nonNegative: true });
  const vs = num(input, "vs", "Source speed vs", { nonNegative: true });
  const obsDir = choice(input, "obsDir", "Observer direction", ["toward", "away"], "toward");
  const srcDir = choice(input, "srcDir", "Source direction", ["toward", "away"], "toward");
  if (srcDir === "toward" && vs >= c) fail("When the source approaches, its speed must be less than the speed of sound, otherwise the waves do not reach the observer.", "vs");
  if (obsDir === "away" && vo >= c) fail("When the observer moves away, its speed must be less than the speed of sound.", "vo");
  const numer = obsDir === "toward" ? c + vo : c - vo;
  const denom = srcDir === "toward" ? c - vs : c + vs;
  const f = f0 * numer / denom;
  const os = obsDir === "toward" ? "+" : "-";
  const ss = srcDir === "toward" ? "-" : "+";
  const trend = f > f0 ? "Higher frequency (approaching)" : f < f0 ? "Lower frequency (receding)" : "The frequency does not change";
  return {
    results: [
      { label: "Heard frequency f'", value: `${fmt(f, 4)} Hz` },
      { label: "Change Δf", value: `${fmt(f - f0, 4)} Hz` },
      { label: "Direction", value: trend }
    ],
    steps: [
      { text: "Doppler effect:", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" },
      { text: "Substituting:", tex: `f' = ${ntex(f0)} \\times \\frac{${ntex(c)} ${os} ${ntex(vo)}}{${ntex(c)} ${ss} ${ntex(vs)}} = ${ntex(f, 6)}\\ Hz` }
    ],
    copy: `f' = ${fmt(f, 4)} Hz (${trend})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Calculation type", ["wave", "intensity", "doppler"], "wave");
  if (mode === "intensity") return intensity(input);
  if (mode === "doppler") return doppler(input);
  return wave(input);
}
