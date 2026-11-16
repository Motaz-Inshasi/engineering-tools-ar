import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const CVD = { A: 3.9083e-3, B: -5.775e-7, C: -4.183e-12 };

export const meta = {
  description: "Platinum RTD temperature sensor (such as PT100 and PT1000) using the Callendar–Van Dusen equation per the IEC 60751 standard: resistance from temperature and temperature from resistance, from −200 to 850 °C.",
  keywords: ["RTD", "PT100", "PT1000", "Platinum temperature sensor", "Callendar Van Dusen", "IEC 60751", "Resistance thermometer"],
  formulas: [
    { label: "Above zero (0 to 850 °C)", tex: "R(T) = R_0\\left(1 + AT + BT^2\\right)" },
    { label: "Below zero (−200 to 0 °C)", tex: "R(T) = R_0\\left[1 + AT + BT^2 + C(T - 100)T^3\\right]" }
  ],
  inputs: [
    { id: "type", label: "Type", type: "select", default: "100", options: [["100", "PT100"], ["500", "PT500"], ["1000", "PT1000"]] },
    { id: "dir", label: "Calculate", type: "select", default: "r2t", options: [["r2t", "Temperature from resistance"], ["t2r", "Resistance from temperature"]] },
    { id: "R", label: "Measured resistance", unit: "Ω", type: "number", default: "138.5055", when: { dir: ["r2t"] } },
    { id: "T", label: "Temperature", unit: "°C", type: "number", default: "100", when: { dir: ["t2r"] } }
  ],
  example: { values: { type: "100", dir: "r2t", R: "138.5055" }, expect: ["T = 100 °C"], note: "Example: PT100 with a resistance of 138.5055 Ω (standard table value at 100 °C)." },
  invalid: { values: { type: "100", dir: "t2r", T: "1000" } },
  related: ["thermistor", "wheatstone-bridge", "adc", "sensor-divider"]
};

export function rOfT(R0, T) {
  const { A, B, C } = CVD;
  return T >= 0 ? R0 * (1 + A * T + B * T * T) : R0 * (1 + A * T + B * T * T + C * (T - 100) * T * T * T);
}

export function tOfR(R0, R) {
  const { A, B } = CVD;
  if (R >= R0) return (-A + Math.sqrt(A * A - 4 * B * (1 - R / R0))) / (2 * B);
  let T = (R / R0 - 1) / A;
  for (let i = 0; i < 50; i++) {
    const f = rOfT(R0, T) - R;
    const h = 1e-6;
    const d = (rOfT(R0, T + h) - rOfT(R0, T - h)) / (2 * h);
    const dT = f / d;
    T -= dT;
    if (Math.abs(dT) < 1e-12) break;
  }
  return T;
}

export function solve(input) {
  const R0 = Number(choice(input, "type", "Type", ["100", "500", "1000"], "100"));
  const dir = choice(input, "dir", "Calculate", ["r2t", "t2r"], "r2t");
  const { A, B, C } = CVD;
  const steps = [`IEC 60751 coefficients: $A = ${ntex(A)}$, $B = ${ntex(B)}$, $C = ${ntex(C)}$ (C is used below zero only), and $R_0 = ${R0}\\ \\Omega$.`];
  if (dir === "t2r") {
    const T = num(input, "T", "Temperature", { min: -200, max: 850 });
    const R = rOfT(R0, T);
    steps.push({ text: T >= 0 ? "Above zero we use the quadratic formula:" : "Below zero we add the fourth term:", tex: `R = ${R0}\\left[1 + ${ntex(A)}(${ntex(T)}) + (${ntex(B)})(${ntex(T)})^2${T < 0 ? ` + (${ntex(C)})(${ntex(T)} - 100)(${ntex(T)})^3` : ""}\\right] = ${ntex(R, 7)}\\ \\Omega` });
    steps.push(`The sensitivity at this temperature is approximately ${fmt((rOfT(R0, T + 0.5) - rOfT(R0, T - 0.5)), 4)} Ω per degree.`);
    return { results: [{ label: "Resistance", value: `${fmt(R, 7)} Ω`, text: `R = ${fmt(R, 7)} Ω` }, { label: "Ratio R/R0", value: R / R0, sig: 7 }], steps, copy: `R(${fmt(T)} °C) = ${fmt(R, 7)} Ω` };
  }
  const R = num(input, "R", "Resistance", { positive: true });
  const Rlo = rOfT(R0, -200), Rhi = rOfT(R0, 850);
  if (R < Rlo || R > Rhi) fail(`The resistance is outside the standard range (${fmt(Rlo, 5)} to ${fmt(Rhi, 5)} Ω for PT${R0}).`, "R");
  const T = tOfR(R0, R);
  if (R >= R0) steps.push({ text: "Resistance ≥ R0, so the temperature is ≥ 0; we solve the quadratic equation:", tex: `T = \\frac{-A + \\sqrt{A^2 - 4B(1 - R/R_0)}}{2B} = ${ntex(T, 7)}^\\circ C` });
  else steps.push({ text: "Resistance < R0, so the temperature is below zero; the equation is of the fourth degree, so we solve it by Newton's method:", tex: `T = ${ntex(T, 7)}^\\circ C` });
  steps.push({ text: "To check, we substitute the resulting temperature:", tex: `R(${ntex(T, 6)}) = ${ntex(rOfT(R0, T), 8)}\\ \\Omega` });
  const Tr = Math.abs(T) < 5e-4 ? 0 : T;
  return { results: [{ label: "Temperature", value: `${fmt(Tr, 5)} °C`, text: `T = ${fmt(Tr, 4)} °C` }, { label: "Kelvin", value: `${fmt(Tr + 273.15, 6)} K` }], steps, copy: `T = ${fmt(Tr, 5)} °C` };
}
