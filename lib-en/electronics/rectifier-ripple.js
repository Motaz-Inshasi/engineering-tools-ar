import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const TYPES = [["half", "Half-wave"], ["center", "Full-wave with center-tapped transformer"], ["bridge", "Full-wave bridge"]];

export const meta = {
  description: "Rectifier with smoothing capacitor: peak voltage, DC voltage, ripple voltage, ripple factor and maximum reverse voltage across the diode, for a half-wave, full-wave or bridge rectifier.",
  keywords: ["Rectifier", "Rectification", "rectifier", "Ripple", "ripple", "Bridge", "bridge", "Smoothing capacitor", "PIV", "Diode"],
  formulas: [
    { label: "Ripple voltage (linear discharge approximation)", tex: "V_{r(pp)} \\approx \\frac{I_{L}}{f_r C},\\quad f_r = f\\ \\text{(half)},\\; 2f\\ \\text{(full)}" },
    { label: "DC voltage", tex: "V_{DC} \\approx V_p - \\frac{V_{r(pp)}}{2},\\qquad V_p = \\sqrt{2}V_{rms} - n_D V_D" }
  ],
  inputs: [
    { id: "type", label: "Rectifier type", type: "select", default: "bridge", options: TYPES },
    { id: "Vrms", label: "Secondary voltage (RMS)", unit: "V", type: "number", default: "12", help: "For a center-tapped transformer: the voltage across half the winding." },
    { id: "f", label: "Mains frequency", unit: "Hz", type: "number", default: "50" },
    { id: "C", label: "Smoothing capacitor", unit: "F", type: "number", default: "2200u" },
    { id: "RL", label: "Load resistance", unit: "Ω", type: "number", default: "100" },
    { id: "Vd", label: "Diode voltage drop", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { type: "bridge", Vrms: "12", f: "50", C: "2200u", RL: "100", Vd: "0.7" }, expect: ["Vp = 15.57 V"], note: "Example: bridge rectifier from a 12 V transformer with a 2200 µF capacitor and a 100 Ω load." },
  invalid: { values: { type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" } },
  related: ["transformer", "zener-regulator", "voltage-regulator", "fourier-series"]
};

export function solve(input) {
  const type = choice(input, "type", "Type", TYPES.map((t) => t[0]), "bridge");
  const Vrms = num(input, "Vrms", "Voltage", { positive: true });
  const f = num(input, "f", "Frequency", { positive: true });
  const C = num(input, "C", "Capacitor", { positive: true });
  const RL = num(input, "RL", "Load", { positive: true });
  const Vd = num(input, "Vd", "Diode drop", { nonNegative: true, max: 5 });
  const nD = type === "bridge" ? 2 : 1;
  const fr = type === "half" ? f : 2 * f;
  const Vm = Math.SQRT2 * Vrms;
  const Vp = Vm - nD * Vd;
  if (Vp <= 0) fail("The peak voltage is lower than the diode drops, so there is no output.", "Vrms");
  let Vr = Vp / (fr * RL * C);
  const clipped = Vr > Vp;
  if (clipped) Vr = Vp;
  const Vdc = Vp - Vr / 2, IL = Vdc / RL;
  const PIV = type === "bridge" ? Vm - Vd : type === "center" ? 2 * Vm - Vd : Vm;
  const rf = Vr / (2 * Math.sqrt(3)) / Vdc;
  const steps = [
    { text: "Secondary peak voltage, then after subtracting the drops of the conducting diodes:", tex: `V_m = \\sqrt{2} \\times ${ntex(Vrms)} = ${ntex(Vm, 5)}\\ V,\\quad V_p = V_m - ${nD} \\times ${ntex(Vd)} = ${ntex(Vp, 5)}\\ V` },
    `Ripple frequency ${fmt(fr)} Hz because ${type === "half" ? "the half-wave rectifier charges the capacitor once per cycle" : "the full-wave rectifier charges the capacitor twice per cycle"}.`,
    { text: "The capacitor discharges into the load between charging pulses, so the peak-to-peak ripple voltage is:", tex: `V_r \\approx \\frac{V_p}{f_r R_L C} = \\frac{${ntex(Vp, 5)}}{${ntex(fr)} \\times ${ntex(RL)} \\times ${ntex(C)}} = ${ntex(Vr, 5)}\\ V` },
    { text: "Average DC voltage and current:", tex: `V_{DC} \\approx V_p - \\frac{V_r}{2} = ${ntex(Vdc, 5)}\\ V,\\quad I_L = ${ntex(IL, 5)}\\ A` },
    { text: "Maximum reverse voltage across each diode:", tex: `PIV = ${ntex(PIV, 5)}\\ V` }
  ];
  if (clipped) steps.push("Warning: the capacitor is too small for the load, so the ripple is larger than the voltage itself and the approximation is not valid. Increase the capacitance.");
  else if (Vr / Vp > 0.2) steps.push("The ripple is large (more than 20%), so the linear approximation is less accurate here; increasing the capacitance is recommended.");
  const T = 1 / f, pts = [];
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600;
    const s = Math.sin(2 * Math.PI * f * t);
    const rect = Math.max(0, (type === "half" ? s : Math.abs(s)) * Vm - nD * Vd);
    pts.push([t, rect]);
  }
  const out = [];
  let v = Vp;
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600, dt = (3 * T) / 600;
    v = v * Math.exp(-dt / (RL * C));
    v = Math.max(v, pts[i][1]);
    out.push([t, v]);
  }
  return {
    results: [
      { label: "Peak voltage after the diodes", value: eng(Vp, "V", 4), text: `Vp = ${eng(Vp, "V", 4)}` },
      { label: "Ripple voltage (peak-to-peak)", value: eng(Vr, "V", 4) },
      { label: "Approximate DC voltage", value: eng(Vdc, "V", 4) },
      { label: "Load current", value: eng(IL, "A", 4) },
      { label: "Ripple factor", value: `${fmt(100 * rf, 3)}%` },
      { label: "Peak inverse voltage PIV", value: eng(PIV, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "Rectified voltage and capacitor voltage (simulation)", xLabel: "t (s)", yLabel: "V", includeZero: true, series: [{ name: "After rectification", points: pts, dashed: true }, { name: "Load voltage", points: out }] }],
    steps, copy: `Vp = ${eng(Vp, "V", 4)}, Vr = ${eng(Vr, "V", 4)}, Vdc = ${eng(Vdc, "V", 4)}, PIV = ${eng(PIV, "V", 4)}`
  };
}
