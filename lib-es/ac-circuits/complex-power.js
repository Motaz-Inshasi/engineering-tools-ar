import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "Potencia compleja en corriente alterna: potencias activa, reactiva y aparente, factor de potencia y triángulo de potencias, y cálculo del condensador de corrección del factor de potencia hasta un valor objetivo.",
  keywords: ["Potencia compleja", "Factor de potencia", "power factor", "Corrección del factor de potencia", "Triángulo de potencias", "potencia activa", "potencia reactiva", "kVAR", "condensador de corrección"],
  formulas: [
    { label: "Triángulo de potencias", tex: "S = V I^* = P + jQ,\\quad P = VI\\cos\\theta,\\quad Q = VI\\sin\\theta,\\quad |S|^2 = P^2 + Q^2" },
    { label: "Condensador de corrección", tex: "Q_C = P(\\tan\\theta_1 - \\tan\\theta_2),\\qquad C = \\frac{Q_C}{\\omega V^2}" }
  ],
  inputs: [
    { id: "mode", label: "Datos", type: "select", default: "ppf", options: [["ppf", "Potencia activa y factor de potencia"], ["vi", "Tensión, corriente y ángulo de fase"]] },
    { id: "V", label: "Tensión (eficaz)", unit: "V", type: "number", default: "400" },
    { id: "P", label: "Potencia activa P", unit: "W", type: "number", default: "50k", when: { mode: ["ppf"] } },
    { id: "pf", label: "Factor de potencia actual", type: "number", default: "0.7", when: { mode: ["ppf"] } },
    { id: "I", label: "Corriente (eficaz)", unit: "A", type: "number", default: "10", when: { mode: ["vi"] } },
    { id: "theta", label: "Ángulo θ = θv − θi", unit: "°", type: "number", default: "36.87", when: { mode: ["vi"] }, help: "Positivo para carga inductiva (la corriente va retrasada)." },
    { id: "nature", label: "Naturaleza de la carga", type: "select", default: "lag", options: [["lag", "Inductiva (en retraso)"], ["lead", "Capacitiva (en adelanto)"]], when: { mode: ["ppf"] } },
    { id: "target", label: "Factor de potencia objetivo (opcional)", type: "number", default: "0.95" },
    { id: "f", label: "Frecuencia de la red", unit: "Hz", type: "number", default: "50" }
  ],
  example: { values: { mode: "ppf", V: "400", P: "50k", pf: "0.7", nature: "lag", target: "0.95", f: "50" }, expect: ["Qc = 34.58 kVAR"], note: "Ejemplo: carga de 50 kW con factor de potencia 0.7 en retraso, corregida a 0.95." },
  invalid: { values: { mode: "ppf", V: "400", P: "50k", pf: "1.3", target: "" } },
  related: ["rlc-circuit", "three-phase", "phasor", "transformer"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Datos", ["ppf", "vi"], "ppf");
  const V = num(input, "V", "Tensión", { positive: true });
  let P, Q, th;
  const steps = [];
  if (mode === "ppf") {
    P = num(input, "P", "Potencia activa", { positive: true });
    const pf = num(input, "pf", "Factor de potencia", { positive: true, max: 1 });
    const lag = choice(input, "nature", "Naturaleza de la carga", ["lag", "lead"], "lag") === "lag";
    th = (lag ? 1 : -1) * Math.acos(pf);
    Q = P * Math.tan(th);
    steps.push({ text: "Ángulo de potencia a partir del factor de potencia:", tex: `\\theta = ${lag ? "" : "-"}\\cos^{-1}(${ntex(pf)}) = ${ntex((th * 180) / Math.PI, 5)}^\\circ` });
    steps.push({ text: "Potencia reactiva y aparente:", tex: `Q = P\\tan\\theta = ${ntex(Q, 6)}\\ VAR,\\quad |S| = \\frac{P}{PF} = ${ntex(P / pf, 6)}\\ VA` });
  } else {
    const I = num(input, "I", "Corriente", { positive: true });
    const deg = num(input, "theta", "Ángulo", { min: -90, max: 90 });
    th = (deg * Math.PI) / 180;
    P = V * I * Math.cos(th);
    Q = V * I * Math.sin(th);
    steps.push({ text: "A partir de la tensión, la corriente y el ángulo:", tex: `P = VI\\cos\\theta = ${ntex(P, 6)}\\ W,\\quad Q = VI\\sin\\theta = ${ntex(Q, 6)}\\ VAR` });
  }
  const S = Math.hypot(P, Q), pf = P / S, I = S / V;
  const nature = Math.abs(Q) < 1e-12 * S ? "Resistiva" : Q > 0 ? "Inductiva (en retraso)" : "Capacitiva (en adelanto)";
  const results = [
    { label: "Potencia activa P", value: eng(P, "W", 5) },
    { label: "Potencia reactiva Q", value: eng(Q, "VAR", 5) },
    { label: "Potencia aparente |S|", value: eng(S, "VA", 5) },
    { label: "Factor de potencia", value: `${fmt(pf, 5)} ${nature}` },
    { label: "Corriente", value: eng(I, "A", 5) }
  ];
  const target = num(input, "target", "Factor de potencia objetivo", { optional: true, positive: true, max: 1 });
  let copy = `P = ${eng(P, "W", 5)}, Q = ${eng(Q, "VAR", 5)}, S = ${eng(S, "VA", 5)}, PF = ${fmt(pf, 5)}`;
  const tri = [[0, 0], [P, 0], [P, Q], [0, 0]];
  const series = [{ name: "Triángulo de potencias", points: tri }];
  if (target !== null) {
    if (Q <= 0) fail("La carga no es inductiva, por lo que la corrección con condensadores no aplica.", "target");
    if (target <= pf) fail(`El factor de potencia objetivo debe ser mayor que el actual (${fmt(pf, 4)}).`, "target");
    const f = num(input, "f", "Frecuencia", { positive: true });
    const th2 = Math.acos(target);
    const Q2 = P * Math.tan(th2), Qc = Q - Q2;
    const w = 2 * Math.PI * f;
    const Cap = Qc / (w * V * V);
    const I2 = P / target / V;
    steps.push({ text: "Potencia reactiva requerida tras la corrección:", tex: `Q_2 = P\\tan(\\cos^{-1}${ntex(target)}) = ${ntex(Q2, 6)}\\ VAR` });
    steps.push({ text: "El condensador debe generar la diferencia:", tex: `Q_C = Q - Q_2 = ${ntex(Qc, 6)}\\ VAR,\\quad C = \\frac{Q_C}{\\omega V^2} = \\frac{${ntex(Qc, 6)}}{${ntex(w, 6)} \\times ${ntex(V)}^2} = ${ntex(Cap, 6)}\\ F` });
    steps.push(`Tras la corrección, la corriente baja de ${eng(I, "A", 4)} a ${eng(I2, "A", 4)} para la misma potencia activa. El valor corresponde a un solo condensador a la tensión de entrada (monofásico).`);
    results.push({ label: "Potencia del condensador requerida", value: eng(Qc, "VAR", 4), text: `Qc = ${eng(Qc, "VAR", 4)}` }, { label: "Capacidad del condensador", value: eng(Cap, "F", 4) }, { label: "Corriente tras la corrección", value: eng(I2, "A", 4) });
    copy += `\nQc = ${eng(Qc, "VAR", 4)}, C = ${eng(Cap, "F", 4)}`;
    series.push({ name: "Tras la corrección", points: [[0, 0], [P, Q2]], dashed: true });
  }
  return { results, steps, copy, blocks: [{ type: "plot", title: "Triángulo de potencias (P horizontal, Q vertical)", xLabel: "P (W)", yLabel: "Q (VAR)", includeZero: true, series }] };
}
