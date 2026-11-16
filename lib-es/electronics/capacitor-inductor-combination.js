import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calcula la capacitancia equivalente de condensadores o la inductancia equivalente de bobinas en serie o en paralelo, con la distribución de tensión, carga y energía en los condensadores al introducir la tensión.",
  keywords: ["Condensadores en serie", "Condensadores en paralelo", "Capacitancia equivalente", "Bobinas", "Inductancia equivalente", "capacitors", "inductors", "Energía del condensador"],
  formulas: [
    { label: "Condensadores (al revés que las resistencias)", tex: "C_{par} = \\sum C_i,\\qquad \\frac{1}{C_{ser}} = \\sum\\frac{1}{C_i}" },
    { label: "Bobinas sin inductancia mutua (como las resistencias)", tex: "L_{ser} = \\sum L_i,\\qquad \\frac{1}{L_{par}} = \\sum\\frac{1}{L_i}" }
  ],
  inputs: [
    { id: "kind", label: "Tipo", type: "select", default: "C", options: [["C", "Condensadores"], ["L", "Bobinas"]] },
    { id: "mode", label: "Conexión", type: "select", default: "series", options: [["series", "Serie"], ["parallel", "Paralelo"]] },
    { id: "list", label: "Valores (F o H)", type: "text", default: "10u, 22u, 47u", wide: true, help: "Por ejemplo 10u, 22u o 4.7n." },
    { id: "V", label: "Tensión total (opcional, para condensadores)", unit: "V", type: "number", default: "12", when: { kind: ["C"] } }
  ],
  example: { values: { kind: "C", mode: "series", list: "10u, 22u, 47u", V: "12" }, expect: ["Ceq = 5.998 µF"], note: "Ejemplo: tres condensadores en serie con 12 V." },
  invalid: { values: { kind: "C", mode: "series", list: "10u, 0", V: "" } },
  related: ["series-parallel-resistors", "impedance", "resonance", "timer-555"]
};

export function equivalent(kind, mode, list) {
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const inv = (a) => 1 / a.reduce((s, x) => s + 1 / x, 0);
  if (kind === "C") return mode === "parallel" ? sum(list) : inv(list);
  return mode === "series" ? sum(list) : inv(list);
}

export function solve(input) {
  const kind = choice(input, "kind", "Tipo", ["C", "L"], "C");
  const mode = choice(input, "mode", "Conexión", ["series", "parallel"], "series");
  const list = numList(input, "list", "Valores", { positive: true, max: 40 });
  const eq = equivalent(kind, mode, list);
  const unit = kind === "C" ? "F" : "H";
  const sym = kind === "C" ? "C" : "L";
  const reciprocal = (kind === "C" && mode === "series") || (kind === "L" && mode === "parallel");
  const steps = [reciprocal
    ? { text: `${kind === "C" ? "Condensadores en serie" : "Bobinas en paralelo"}: sumamos los inversos.`, tex: `\\frac{1}{${sym}_{eq}} = ${list.map((x) => `\\frac{1}{${ntex(x)}}`).join(" + ")} \\Rightarrow ${sym}_{eq} = ${ntex(eq, 6)}\\ ${unit}` }
    : { text: `${kind === "C" ? "Condensadores en paralelo" : "Bobinas en serie"}: sumamos los valores directamente.`, tex: `${sym}_{eq} = ${list.map((x) => ntex(x)).join(" + ")} = ${ntex(eq, 6)}\\ ${unit}` }];
  const results = [{ label: kind === "C" ? "Capacitancia equivalente" : "Inductancia equivalente", value: eng(eq, unit, 4), text: `${sym}eq = ${eng(eq, unit, 4)}` }];
  const blocks = [];
  if (kind === "C") {
    const V = num(input, "V", "Tensión", { optional: true });
    if (V !== null) {
      if (V === 0) fail("Tensión cero; déjelo vacío si no es necesario.", "V");
      const Q = eq * V;
      results.push({ label: "Carga total", value: eng(Q, "C", 4) }, { label: "Energía almacenada", value: eng(0.5 * eq * V * V, "J", 4) });
      const rows = list.map((c, k) => {
        const vk = mode === "series" ? Q / c : V, qk = c * vk;
        return [`C${k + 1}`, eng(c, "F"), eng(vk, "V", 4), eng(qk, "C", 4), eng(0.5 * c * vk * vk, "J", 4)];
      });
      blocks.push({ type: "table", caption: mode === "series" ? "En serie: la misma carga, y la mayor tensión está en el condensador más pequeño" : "En paralelo: la misma tensión, y la carga es proporcional a la capacitancia", head: ["Condensador", "Capacitancia", "Tensión", "Carga", "Energía"], rows });
      steps.push({ text: "Carga total y energía:", tex: `Q = C_{eq}V = ${ntex(Q, 6)}\\ C,\\quad W = \\tfrac{1}{2}C_{eq}V^2 = ${ntex(0.5 * eq * V * V, 6)}\\ J` });
    }
  } else steps.push("Suponemos que no hay inductancia mutua entre las bobinas (es decir, que están separadas o apantalladas).");
  return { results, blocks, steps, copy: `${sym}eq = ${eng(eq, unit, 4)}` };
}
