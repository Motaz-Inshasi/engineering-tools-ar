import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const TYPES = [["half", "Media onda"], ["center", "Onda completa con transformador de toma media"], ["bridge", "Onda completa en puente"]];

export const meta = {
  description: "Rectificador con condensador de filtrado: tensión de pico, tensión continua, rizado, factor de rizado y máxima tensión inversa en el diodo, para rectificador de media onda, de onda completa o en puente.",
  keywords: ["Rectificador", "Rectificación", "rectifier", "Rizado", "ripple", "Puente", "bridge", "Condensador de filtrado", "PIV", "Diodo"],
  formulas: [
    { label: "Rizado de tensión (aproximación de descarga lineal)", tex: "V_{r(pp)} \\approx \\frac{I_{L}}{f_r C},\\quad f_r = f\\ \\text{(half)},\\; 2f\\ \\text{(full)}" },
    { label: "Tensión continua", tex: "V_{DC} \\approx V_p - \\frac{V_{r(pp)}}{2},\\qquad V_p = \\sqrt{2}V_{rms} - n_D V_D" }
  ],
  inputs: [
    { id: "type", label: "Tipo de rectificador", type: "select", default: "bridge", options: TYPES },
    { id: "Vrms", label: "Tensión del secundario (eficaz)", unit: "V", type: "number", default: "12", help: "Para transformador de toma media: tensión de media bobina." },
    { id: "f", label: "Frecuencia de la red", unit: "Hz", type: "number", default: "50" },
    { id: "C", label: "Condensador de filtrado", unit: "F", type: "number", default: "2200u" },
    { id: "RL", label: "Resistencia de carga", unit: "Ω", type: "number", default: "100" },
    { id: "Vd", label: "Caída de tensión en el diodo", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { type: "bridge", Vrms: "12", f: "50", C: "2200u", RL: "100", Vd: "0.7" }, expect: ["Vp = 15.57 V"], note: "Ejemplo: puente desde un transformador de 12 V, condensador de 2200 µF y carga de 100 Ω." },
  invalid: { values: { type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" } },
  related: ["transformer", "zener-regulator", "voltage-regulator", "fourier-series"]
};

export function solve(input) {
  const type = choice(input, "type", "Tipo", TYPES.map((t) => t[0]), "bridge");
  const Vrms = num(input, "Vrms", "Tensión", { positive: true });
  const f = num(input, "f", "Frecuencia", { positive: true });
  const C = num(input, "C", "Condensador", { positive: true });
  const RL = num(input, "RL", "Carga", { positive: true });
  const Vd = num(input, "Vd", "Caída del diodo", { nonNegative: true, max: 5 });
  const nD = type === "bridge" ? 2 : 1;
  const fr = type === "half" ? f : 2 * f;
  const Vm = Math.SQRT2 * Vrms;
  const Vp = Vm - nD * Vd;
  if (Vp <= 0) fail("La tensión de pico es menor que la caída de los diodos, así que no hay salida.", "Vrms");
  let Vr = Vp / (fr * RL * C);
  const clipped = Vr > Vp;
  if (clipped) Vr = Vp;
  const Vdc = Vp - Vr / 2, IL = Vdc / RL;
  const PIV = type === "bridge" ? Vm - Vd : type === "center" ? 2 * Vm - Vd : Vm;
  const rf = Vr / (2 * Math.sqrt(3)) / Vdc;
  const steps = [
    { text: "Tensión de pico del secundario y luego tras la caída de los diodos conductores:", tex: `V_m = \\sqrt{2} \\times ${ntex(Vrms)} = ${ntex(Vm, 5)}\\ V,\\quad V_p = V_m - ${nD} \\times ${ntex(Vd)} = ${ntex(Vp, 5)}\\ V` },
    `La frecuencia de rizado es ${fmt(fr)} Hz porque ${type === "half" ? "el rectificador de media onda carga el condensador una vez por ciclo" : "el rectificador de onda completa carga el condensador dos veces por ciclo"}.`,
    { text: "El condensador se descarga en la carga entre los pulsos de carga, así que el rizado de pico a pico es:", tex: `V_r \\approx \\frac{V_p}{f_r R_L C} = \\frac{${ntex(Vp, 5)}}{${ntex(fr)} \\times ${ntex(RL)} \\times ${ntex(C)}} = ${ntex(Vr, 5)}\\ V` },
    { text: "Tensión continua media y corriente:", tex: `V_{DC} \\approx V_p - \\frac{V_r}{2} = ${ntex(Vdc, 5)}\\ V,\\quad I_L = ${ntex(IL, 5)}\\ A` },
    { text: "Máxima tensión inversa que soporta cada diodo:", tex: `PIV = ${ntex(PIV, 5)}\\ V` }
  ];
  if (clipped) steps.push("Advertencia: el condensador es demasiado pequeño para la carga; el rizado es mayor que la propia tensión y la aproximación no sirve. Aumente la capacitancia.");
  else if (Vr / Vp > 0.2) steps.push("El rizado es grande (más del 20 %) y la aproximación lineal es menos precisa aquí; se recomienda aumentar la capacitancia.");
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
      { label: "Tensión de pico tras los diodos", value: eng(Vp, "V", 4), text: `Vp = ${eng(Vp, "V", 4)}` },
      { label: "Rizado de tensión (pico a pico)", value: eng(Vr, "V", 4) },
      { label: "Tensión continua aproximada", value: eng(Vdc, "V", 4) },
      { label: "Corriente de carga", value: eng(IL, "A", 4) },
      { label: "Factor de rizado", value: `${fmt(100 * rf, 3)}%` },
      { label: "Tensión inversa máxima PIV", value: eng(PIV, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "Tensión rectificada y tensión del condensador (simulación)", xLabel: "t (s)", yLabel: "V", includeZero: true, series: [{ name: "Tras la rectificación", points: pts, dashed: true }, { name: "Tensión de carga", points: out }] }],
    steps, copy: `Vp = ${eng(Vp, "V", 4)}, Vr = ${eng(Vr, "V", 4)}, Vdc = ${eng(Vdc, "V", 4)}, PIV = ${eng(PIV, "V", 4)}`
  };
}
