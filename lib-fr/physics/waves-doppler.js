import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const WAVE = { v: "Vitesse de l'onde v", f: "Fréquence f", lam: "Longueur d'onde λ" };
const WAVE_UNIT = { v: "m/s", f: "Hz", lam: "m" };

export const meta = {
  description: "Calcule la vitesse, la fréquence et la longueur d'onde de l'onde à partir de deux valeurs quelconques, l'intensité sonore et le niveau en décibels dans les deux sens, ainsi que la fréquence perçue du son par effet Doppler avec le mouvement de la source et de l'observateur.",
  keywords: ["onde", "longueur d'onde", "fréquence", "intensité sonore", "décibel", "dB", "Doppler", "vitesse du son", "wave", "doppler", "intensity"],
  formulas: [
    { label: "Équation de l'onde", tex: "v = f\\lambda" },
    { label: "Niveau d'intensité sonore", tex: "\\beta = 10\\log_{10}\\frac{I}{I_0},\\qquad I_0 = 10^{-12}\\ \\frac{W}{m^2}" },
    { label: "Effet Doppler", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" }
  ],
  inputs: [
    { id: "mode", label: "Type de calcul", type: "select", default: "wave", options: [["wave", "Onde : v = fλ"], ["intensity", "Intensité sonore et niveau en décibels"], ["doppler", "Effet Doppler"]] },
    { id: "v", label: "Vitesse de l'onde v", unit: "m/s", type: "number", default: "340", when: { mode: ["wave"] }, help: "Saisissez uniquement deux valeurs parmi v, f et λ." },
    { id: "f", label: "Fréquence f", unit: "Hz", type: "number", when: { mode: ["wave"] } },
    { id: "lam", label: "Longueur d'onde λ", unit: "m", type: "number", default: "0.68", when: { mode: ["wave"] } },
    { id: "intDir", label: "Sens de la conversion", type: "select", default: "I2b", options: [["I2b", "De l'intensité I au niveau sonore β"], ["b2I", "Du niveau sonore β à l'intensité I"]], when: { mode: ["intensity"] } },
    { id: "I", label: "Intensité sonore I", unit: "W/m²", type: "number", default: "1e-6", when: { mode: ["intensity"], intDir: ["I2b"] } },
    { id: "beta", label: "Niveau sonore β", unit: "dB", type: "number", default: "60", when: { mode: ["intensity"], intDir: ["b2I"] } },
    { id: "f0", label: "Fréquence de la source f0", unit: "Hz", type: "number", default: "500", when: { mode: ["doppler"] } },
    { id: "c", label: "Vitesse du son v", unit: "m/s", type: "number", default: "343", when: { mode: ["doppler"] }, help: "Dans l'air à 20°C, environ 343 m/s." },
    { id: "vo", label: "Vitesse de l'observateur vo", unit: "m/s", type: "number", default: "0", when: { mode: ["doppler"] } },
    { id: "vs", label: "Vitesse de la source vs", unit: "m/s", type: "number", default: "30", when: { mode: ["doppler"] } },
    { id: "obsDir", label: "Sens de l'observateur", type: "select", default: "toward", options: [["toward", "vers la source"], ["away", "en s'éloignant de la source"]], when: { mode: ["doppler"] } },
    { id: "srcDir", label: "Sens de la source", type: "select", default: "toward", options: [["toward", "vers l'observateur"], ["away", "en s'éloignant de l'observateur"]], when: { mode: ["doppler"] } }
  ],
  example: {
    values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "30", obsDir: "toward", srcDir: "toward" },
    expect: ["f' = 547.9 Hz"],
    note: "Exemple : source de fréquence 500 Hz qui s'approche d'un observateur immobile à 30 m/s."
  },
  invalid: { values: { mode: "doppler", v: "340", f: "", lam: "0.68", intDir: "I2b", I: "1e-6", beta: "60", f0: "500", c: "343", vo: "0", vs: "343", obsDir: "toward", srcDir: "toward" } },
  related: ["harmonic-motion", "optics", "unit-converter", "formulas-constants"]
};

function wave(input) {
  const keys = ["v", "f", "lam"];
  const given = keys.filter((k) => !isBlank(input[k]));
  if (given.length !== 2) {
    const field = given.length > 2 ? given[2] : keys.find((k) => isBlank(input[k]));
    fail(`Saisissez exactement deux valeurs parmi v, f et λ (vous en avez saisi ${given.length}).`, field);
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
      { text: "Relation fondamentale de l'onde :", tex: "v = f\\lambda" },
      { text: `Calcul de ${WAVE[unknown]} :`, tex }
    ],
    copy: `v = ${fmt(q.v, 4)} m/s, f = ${fmt(q.f, 4)} Hz, λ = ${fmt(q.lam, 4)} m`
  };
}

function intensity(input) {
  const dir = choice(input, "intDir", "Sens de la conversion", ["I2b", "b2I"], "I2b");
  if (dir === "I2b") {
    const I = num(input, "I", "Intensité sonore I", { positive: true });
    const beta = 10 * Math.log10(I / 1e-12);
    return {
      results: [
        { label: "Niveau sonore β", value: `${fmt(beta, 4)} dB` },
        { label: "Intensité sonore I", value: `${fmt(I, 4)} W/m²` }
      ],
      steps: [
        { text: "Niveau sonore en décibels :", tex: `\\beta = 10\\log_{10}\\frac{I}{I_0} = 10\\log_{10}\\frac{${ntex(I)}}{10^{-12}} = ${ntex(beta, 6)}\\ dB` }
      ],
      copy: `β = ${fmt(beta, 4)} dB (I = ${fmt(I, 4)} W/m²)`
    };
  }
  const beta = num(input, "beta", "Niveau sonore β");
  const I = 1e-12 * Math.pow(10, beta / 10);
  return {
    results: [
      { label: "Intensité sonore I", value: `${fmt(I, 4)} W/m²` },
      { label: "Niveau sonore β", value: `${fmt(beta, 4)} dB` }
    ],
    steps: [
      { text: "Intensité à partir du niveau sonore :", tex: `I = I_0\\,10^{\\beta/10} = 10^{-12} \\times 10^{${ntex(beta / 10, 6)}} = ${ntex(I, 6)}\\ W/m^2` }
    ],
    copy: `I = ${fmt(I, 4)} W/m² (β = ${fmt(beta, 4)} dB)`
  };
}

function doppler(input) {
  const f0 = num(input, "f0", "Fréquence de la source f0", { positive: true });
  const c = num(input, "c", "Vitesse du son v", { positive: true });
  const vo = num(input, "vo", "Vitesse de l'observateur vo", { nonNegative: true });
  const vs = num(input, "vs", "Vitesse de la source vs", { nonNegative: true });
  const obsDir = choice(input, "obsDir", "Sens de l'observateur", ["toward", "away"], "toward");
  const srcDir = choice(input, "srcDir", "Sens de la source", ["toward", "away"], "toward");
  if (srcDir === "toward" && vs >= c) fail("Lorsque la source s'approche, sa vitesse doit être inférieure à la vitesse du son, sinon les ondes n'atteignent pas l'observateur.", "vs");
  if (obsDir === "away" && vo >= c) fail("Lorsque l'observateur s'éloigne, sa vitesse doit être inférieure à la vitesse du son.", "vo");
  const numer = obsDir === "toward" ? c + vo : c - vo;
  const denom = srcDir === "toward" ? c - vs : c + vs;
  const f = f0 * numer / denom;
  const os = obsDir === "toward" ? "+" : "-";
  const ss = srcDir === "toward" ? "-" : "+";
  const trend = f > f0 ? "Fréquence plus élevée (rapprochement)" : f < f0 ? "Fréquence plus basse (éloignement)" : "La fréquence ne change pas";
  return {
    results: [
      { label: "Fréquence perçue f'", value: `${fmt(f, 4)} Hz` },
      { label: "Variation Δf", value: `${fmt(f - f0, 4)} Hz` },
      { label: "Sens", value: trend }
    ],
    steps: [
      { text: "Effet Doppler :", tex: "f' = f_0\\,\\frac{v \\pm v_o}{v \\mp v_s}" },
      { text: "En remplaçant :", tex: `f' = ${ntex(f0)} \\times \\frac{${ntex(c)} ${os} ${ntex(vo)}}{${ntex(c)} ${ss} ${ntex(vs)}} = ${ntex(f, 6)}\\ Hz` }
    ],
    copy: `f' = ${fmt(f, 4)} Hz (${trend})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Type de calcul", ["wave", "intensity", "doppler"], "wave");
  if (mode === "intensity") return intensity(input);
  if (mode === "doppler") return doppler(input);
  return wave(input);
}
