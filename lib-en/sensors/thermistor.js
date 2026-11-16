import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { solveLinear } from "../core/matrix.js";

const K = 273.15;

export const meta = {
  description: "Convert between NTC thermistor resistance and temperature using the Beta model or the Steinhart–Hart equation, and calculate the Steinhart–Hart coefficients from three calibration points.",
  keywords: ["Thermistor", "thermistor", "NTC", "Steinhart-Hart", "Steinhart", "beta", "Beta", "Temperature sensor"],
  formulas: [
    { label: "Beta model", tex: "\\frac{1}{T} = \\frac{1}{T_0} + \\frac{1}{\\beta}\\ln\\frac{R}{R_0}" },
    { label: "Steinhart–Hart equation (T in kelvin)", tex: "\\frac{1}{T} = A + B\\ln R + C(\\ln R)^3" }
  ],
  inputs: [
    { id: "model", label: "Model", type: "select", default: "beta", options: [["beta", "Beta"], ["sh", "Steinhart–Hart with known coefficients"], ["sh3", "Steinhart–Hart from 3 points"]] },
    { id: "dir", label: "Calculate", type: "select", default: "r2t", options: [["r2t", "Temperature from resistance"], ["t2r", "Resistance from temperature"]] },
    { id: "R", label: "Resistance", unit: "Ω", type: "number", default: "5k", when: { dir: ["r2t"] } },
    { id: "T", label: "Temperature", unit: "°C", type: "number", default: "50", when: { dir: ["t2r"] } },
    { id: "R0", label: "R0 (at T0)", unit: "Ω", type: "number", default: "10k", when: { model: ["beta"] } },
    { id: "T0", label: "T0", unit: "°C", type: "number", default: "25", when: { model: ["beta"] } },
    { id: "beta", label: "β", unit: "K", type: "number", default: "3950", when: { model: ["beta"] } },
    { id: "A", label: "A", type: "number", default: "1.129148e-3", when: { model: ["sh"] } },
    { id: "B", label: "B", type: "number", default: "2.34125e-4", when: { model: ["sh"] } },
    { id: "C", label: "C", type: "number", default: "8.76741e-8", when: { model: ["sh"] } },
    { id: "pts", label: "Three calibration points: temperature (°C) and resistance (Ω)", type: "textarea", rows: 3, default: "0 32.65k\n25 10k\n50 3.6k", when: { model: ["sh3"] } }
  ],
  example: { values: { model: "beta", dir: "r2t", R: "5k", R0: "10k", T0: "25", beta: "3950" }, expect: ["T = 41.46 °C"], note: "Example: a 10k thermistor (β = 3950) whose measured resistance is 5 kΩ." },
  invalid: { values: { model: "beta", dir: "r2t", R: "-5", R0: "10k", T0: "25", beta: "3950" } },
  related: ["rtd", "sensor-divider", "adc"]
};

export function shCoeffs(pts) {
  const A = pts.map(([, R]) => [1, Math.log(R), Math.pow(Math.log(R), 3)]);
  const b = pts.map(([T]) => 1 / (T + K));
  const res = solveLinear(A, b);
  if (res.rankA < 3) return null;
  return res.R.slice(0, 3).map((r) => r[3]);
}

export function shT(A, B, C, R) {
  const L = Math.log(R);
  return 1 / (A + B * L + C * L * L * L) - K;
}

export function shR(A, B, C, Tc) {
  const y = 1 / (Tc + K);
  if (C === 0) return Math.exp((y - A) / B);
  const x = (A - y) / C;
  const yy = Math.sqrt(Math.pow(B / (3 * C), 3) + (x * x) / 4);
  return Math.exp(Math.cbrt(yy - x / 2) - Math.cbrt(yy + x / 2));
}

function parsePts(input) {
  const lines = String(input.pts ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length !== 3) fail("Enter exactly three points, one per line: temperature, then resistance.", "pts");
  return lines.map((l, i) => {
    const [t, r] = l.split(/[\s,،]+/);
    const T = num({ t }, "t", `Point ${i + 1} temperature`), R = num({ r }, "r", `Point ${i + 1} resistance`, { positive: true });
    return [T, R];
  });
}

export function solve(input) {
  const model = choice(input, "model", "Model", ["beta", "sh", "sh3"], "beta");
  const dir = choice(input, "dir", "Calculate", ["r2t", "t2r"], "r2t");
  const R = dir === "r2t" ? num(input, "R", "Resistance", { positive: true }) : null;
  const T = dir === "t2r" ? num(input, "T", "Temperature", { min: -K + 1e-6 }) : null;
  const steps = [];
  let outT, outR;
  if (model === "beta") {
    const R0 = num(input, "R0", "R0", { positive: true }), T0 = num(input, "T0", "T0", { min: -K + 1e-6 }), beta = num(input, "beta", "β", { positive: true });
    const T0K = T0 + K;
    steps.push(`Converting T0 to kelvin: ${fmt(T0K, 6)} K.`);
    if (dir === "r2t") {
      const invT = 1 / T0K + Math.log(R / R0) / beta;
      outT = 1 / invT - K;
      steps.push({ text: "Substitute into the Beta model:", tex: `\\frac{1}{T} = \\frac{1}{${ntex(T0K, 6)}} + \\frac{1}{${ntex(beta)}}\\ln\\frac{${ntex(R)}}{${ntex(R0)}} = ${ntex(invT, 6)}\\ K^{-1}` });
      steps.push({ tex: `T = ${ntex(outT + K, 6)}\\ K = ${ntex(outT, 5)}^\\circ C` });
    } else {
      outR = R0 * Math.exp(beta * (1 / (T + K) - 1 / T0K));
      steps.push({ text: "Solve the Beta model for resistance:", tex: `R = R_0\\, e^{\\beta\\left(\\frac{1}{T} - \\frac{1}{T_0}\\right)} = ${ntex(R0)}\\, e^{${ntex(beta)}\\left(\\frac{1}{${ntex(T + K, 6)}} - \\frac{1}{${ntex(T0K, 6)}}\\right)} = ${ntex(outR, 5)}\\ \\Omega` });
    }
  } else {
    let A, B, C;
    if (model === "sh") {
      A = num(input, "A", "A"); B = num(input, "B", "B"); C = num(input, "C", "C");
    } else {
      const pts = parsePts(input);
      const c = shCoeffs(pts);
      if (!c) fail("The three points do not determine unique coefficients (perhaps two resistances are equal).", "pts");
      [A, B, C] = c;
      steps.push({ text: "We form three linear equations in A, B and C from the calibration points and solve them:", tex: `A = ${ntex(A, 6)},\\quad B = ${ntex(B, 6)},\\quad C = ${ntex(C, 6)}` });
    }
    if (dir === "r2t") {
      const L = Math.log(R);
      outT = shT(A, B, C, R);
      if (!isFinite(outT) || outT < -K) fail("The coefficients gave an unreasonable temperature for this resistance.", "R");
      steps.push({ text: "We substitute the natural logarithm of the resistance:", tex: `\\ln R = ${ntex(L, 6)},\\quad \\frac{1}{T} = ${ntex(A, 5)} + ${ntex(B, 5)}(${ntex(L, 5)}) + ${ntex(C, 5)}(${ntex(L, 5)})^3 \\Rightarrow T = ${ntex(outT, 5)}^\\circ C` });
    } else {
      outR = shR(A, B, C, T);
      if (!isFinite(outR) || outR <= 0) fail("The coefficients do not give a valid resistance for this temperature.", "T");
      steps.push({ text: "We solve the cubic equation in ln R in closed form:", tex: `R = ${ntex(outR, 5)}\\ \\Omega` });
    }
  }
  const results = dir === "r2t"
    ? [{ label: "Temperature", value: `${fmt(outT, 4)} °C`, text: `T = ${fmt(outT, 4)} °C` }, { label: "Kelvin", value: `${fmt(outT + K, 6)} K` }, { label: "Fahrenheit", value: `${fmt(outT * 1.8 + 32, 5)} °F` }]
    : [{ label: "Resistance", value: eng(outR, "Ω", 5), text: `R = ${eng(outR, "Ω", 5)}` }];
  return { results, steps, copy: results[0].text };
}
