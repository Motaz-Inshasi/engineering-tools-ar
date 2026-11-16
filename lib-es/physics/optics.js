import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const DEG = Math.PI / 180;

export const meta = {
  description: "Calcula la posición y el aumento de la imagen, su tipo, orientación y la potencia de la lente con la ecuación de lentes y espejos, o el ángulo de refracción de la luz con la ley de Snell, el ángulo crítico y la reflexión interna total.",
  keywords: ["Lente", "Espejo", "Distancia focal", "Ecuación de lentes", "Aumento", "Potencia de la lente", "Dioptría", "Ley de Snell", "Refracción", "Reflexión total", "lens", "mirror", "snell"],
  formulas: [
    { label: "Ecuación de lentes y espejos", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i},\\qquad m = -\\frac{d_i}{d_o},\\qquad P = \\frac{1}{f}" },
    { label: "Ley de Snell", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2,\\qquad \\theta_c = \\sin^{-1}\\frac{n_2}{n_1}" }
  ],
  inputs: [
    { id: "mode", label: "Tipo de problema", type: "select", default: "lens", options: [["lens", "Lentes y espejos"], ["snell", "Refracción de la luz (Snell)"]] },
    { id: "ot", label: "Tipo de elemento", type: "select", default: "lens", options: [["lens", "Lente"], ["mirror", "Espejo"]], when: { mode: ["lens"] }, help: "f positiva: lente convergente o espejo cóncavo. f negativa: lente divergente o espejo convexo." },
    { id: "f", label: "Distancia focal f", unit: "m", type: "number", default: "0.1", when: { mode: ["lens"] }, help: "Introduce f negativa para la lente divergente o el espejo convexo." },
    { id: "do", label: "Distancia del objeto do", unit: "m", type: "number", default: "0.3", when: { mode: ["lens"] } },
    { id: "n1", label: "Índice de refracción n1", type: "number", default: "1", when: { mode: ["snell"] }, help: "Aire ≈ 1, agua ≈ 1.33, vidrio ≈ 1.5." },
    { id: "th1", label: "Ángulo de incidencia θ1", unit: "°", type: "number", default: "30", when: { mode: ["snell"] }, help: "Se mide desde la normal a la superficie." },
    { id: "n2", label: "Índice de refracción n2", type: "number", default: "1.5", when: { mode: ["snell"] } }
  ],
  example: {
    values: { mode: "snell", ot: "lens", f: "0.1", do: "0.3", n1: "1", th1: "30", n2: "1.5" },
    expect: ["θ2 = 19.47°"],
    note: "Ejemplo: luz que pasa del aire al vidrio con un ángulo de incidencia de 30°."
  },
  invalid: { values: { mode: "lens", ot: "lens", f: "0", do: "0.3", n1: "1", th1: "30", n2: "1.5" } },
  related: ["waves-doppler", "harmonic-motion", "unit-converter", "formulas-constants"]
};

function lens(input) {
  const ot = choice(input, "ot", "Tipo de elemento", ["lens", "mirror"], "lens");
  const f = num(input, "f", "Distancia focal f", { nonZero: true });
  const d = num(input, "do", "Distancia del objeto do", { positive: true });
  const el = ot === "lens" ? "la lente" : "el espejo";
  const power = 1 / f;
  const steps = [{ text: "Ecuación de lentes y espejos:", tex: "\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}" }];
  const results = [];
  const blocks = [];
  let copy;
  if (Math.abs(d - f) <= 1e-12 * Math.abs(f)) {
    steps.push({ text: "Cuando el objeto está a la distancia focal, la imagen queda en el infinito:", tex: "\\frac{1}{d_i} = \\frac{1}{f} - \\frac{1}{d_o} = 0" });
    results.push({ label: `Distancia de la imagen desde ${el} di`, value: "En el infinito" });
    blocks.push({ type: "note", tone: "warn", text: "El objeto está exactamente en el foco, por lo que los rayos salen paralelos y no se cruzan, así que no hay una imagen de posición finita." });
    copy = `Imagen en el infinito (objeto en el foco)`;
  } else {
    const di = f * d / (d - f);
    const m = -di / d;
    const type = di > 0 ? "Real" : "Virtual";
    const dir = m > 0 ? "Derecha" : "Invertida";
    const size = Math.abs(m) > 1 ? "Ampliada" : Math.abs(m) < 1 ? "Reducida" : "Del mismo tamaño";
    steps.push(
      { text: "Distancia de la imagen:", tex: `d_i = \\frac{f\\,d_o}{d_o - f} = \\frac{${ntex(f)} \\times ${ntex(d)}}{${ntex(d)} - ${ntex(f)}} = ${ntex(di, 6)}\\ m` },
      { text: "Aumento:", tex: `m = -\\frac{d_i}{d_o} = ${ntex(m, 6)}` }
    );
    results.push(
      { label: `Distancia de la imagen desde ${el} di`, value: `${fmt(di, 4)} m` },
      { label: "Tipo de imagen", value: type },
      { label: "Orientación de la imagen", value: dir },
      { label: "Tamaño de la imagen", value: size },
      { label: "Aumento m", value: fmt(m, 4) }
    );
    copy = `di = ${fmt(di, 4)} m, m = ${fmt(m, 4)} (${type}، ${dir}، ${size})`;
  }
  steps.push({ text: "Potencia de la lente en dioptrías:", tex: `P = \\frac{1}{f} = ${ntex(power, 6)}\\ D` });
  results.push({ label: "Potencia P = 1/f", value: `${fmt(power, 4)} D` });
  return { results, steps, blocks, copy: `${copy}, P = ${fmt(power, 4)} D` };
}

function snell(input) {
  const n1 = num(input, "n1", "Índice de refracción n1", { positive: true });
  const th1 = num(input, "th1", "Ángulo de incidencia θ1", { nonNegative: true, below: 90 });
  const n2 = num(input, "n2", "Índice de refracción n2", { positive: true });
  const s = n1 * Math.sin(th1 * DEG) / n2;
  const steps = [{ text: "Ley de Snell:", tex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2" }];
  const results = [];
  const blocks = [];
  const crit = n1 > n2 ? Math.asin(n2 / n1) / DEG : null;
  results.push({ label: "Ángulo crítico θc", value: crit === null ? "No existe (n1 ≤ n2)" : `${fmt(crit, 4)}°` });
  let copy;
  if (s > 1) {
    steps.push({ text: "sen θ2 es mayor que 1, es decir, no existe ángulo de refracción:", tex: `\\sin\\theta_2 = \\frac{${ntex(n1)}\\sin ${ntex(th1)}^\\circ}{${ntex(n2)}} = ${ntex(s, 6)} > 1` });
    results.push({ label: "Ángulo de refracción θ2", value: "No existe (reflexión interna total)" });
    blocks.push({ type: "note", tone: "warn", text: "Reflexión interna total: la luz no sale al segundo medio, sino que se refleja por completo dentro del medio más denso." });
    copy = `Reflexión interna total con θ1 = ${fmt(th1, 4)}°`;
  } else {
    const th2 = Math.asin(s) / DEG;
    steps.push({ text: "Ángulo de refracción:", tex: `\\sin\\theta_2 = ${ntex(s, 6)},\\quad \\theta_2 = ${ntex(th2, 6)}^\\circ` });
    results.push({ label: "Ángulo de refracción θ2", value: `${fmt(th2, 4)}°` });
    copy = `θ2 = ${fmt(th2, 4)}°`;
  }
  if (crit !== null) {
    steps.push({ text: "Ángulo crítico (porque n1 > n2):", tex: `\\theta_c = \\sin^{-1}\\frac{${ntex(n2)}}{${ntex(n1)}} = ${ntex(crit, 6)}^\\circ` });
    copy += `, θc = ${fmt(crit, 4)}°`;
  }
  return { results, steps, blocks, copy };
}

export function solve(input) {
  const mode = choice(input, "mode", "Tipo de problema", ["lens", "snell"], "lens");
  return mode === "snell" ? snell(input) : lens(input);
}
