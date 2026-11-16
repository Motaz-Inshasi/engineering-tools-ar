import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calcule la resistencia equivalente de un grupo de resistencias en serie o en paralelo, con el reparto de la tensión o de la corriente y la potencia en cada resistencia al introducir la tensión de la fuente.",
  keywords: ["Resistencias en serie", "Resistencias en paralelo", "Resistencia equivalente", "series", "parallel", "resistors", "Conexión de resistencias"],
  formulas: [
    { label: "Serie", tex: "R_{eq} = R_1 + R_2 + \\cdots + R_n" },
    { label: "Paralelo", tex: "\\frac{1}{R_{eq}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots,\\qquad R_1 \\parallel R_2 = \\frac{R_1 R_2}{R_1 + R_2}" }
  ],
  inputs: [
    { id: "list", label: "Valores de las resistencias", unit: "Ω", type: "text", default: "100, 220, 330", wide: true, help: "Separe con coma o espacio; puede usar k y M, por ejemplo 4.7k." },
    { id: "mode", label: "Forma de conexión", type: "select", default: "series", options: [["series", "Serie"], ["parallel", "Paralelo"]] },
    { id: "V", label: "Tensión de la fuente (opcional)", unit: "V", type: "number" }
  ],
  example: { values: { list: "100, 220, 330", mode: "parallel", V: "12" }, expect: ["Req = 56.9 Ω"], note: "Ejemplo: tres resistencias de 100, 220 y 330 Ω en paralelo." },
  invalid: { values: { list: "100, -5", mode: "series" } },
  related: ["voltage-current-divider", "ohms-law", "capacitor-inductor-combination", "standard-resistor-values"]
};

export function equivalent(list, mode) {
  return mode === "series" ? list.reduce((a, b) => a + b, 0) : 1 / list.reduce((a, b) => a + 1 / b, 0);
}

export function solve(input) {
  const list = numList(input, "list", "Valores de las resistencias", { positive: true, max: 50 });
  const mode = choice(input, "mode", "Forma de conexión", ["series", "parallel"], "series");
  const V = num(input, "V", "Tensión de la fuente", { optional: true });
  const Req = equivalent(list, mode);
  const steps = [];
  if (mode === "series") {
    steps.push({ text: "En serie sumamos directamente las resistencias:", tex: `R_{eq} = ${list.map((r) => ntex(r)).join(" + ")} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("La equivalente en serie siempre es mayor que la mayor de las resistencias.");
  } else {
    steps.push({ text: "En paralelo sumamos los inversos (conductancias):", tex: `\\frac{1}{R_{eq}} = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(1 / Req, 6)}\\ S` });
    steps.push({ tex: `R_{eq} = ${ntex(Req, 6)}\\ \\Omega` });
    if (list.length === 2) steps.push({ text: "Para solo dos resistencias sirve la fórmula «producto entre suma»:", tex: `\\frac{${ntex(list[0])} \\times ${ntex(list[1])}}{${ntex(list[0])} + ${ntex(list[1])}} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("La equivalente en paralelo siempre es menor que la menor de las resistencias.");
  }
  const results = [{ label: "Resistencia equivalente", value: eng(Req, "Ω", 4), text: `Req = ${eng(Req, "Ω", 4)}` }, { label: "Conductancia equivalente", value: eng(1 / Req, "S", 4) }];
  const blocks = [];
  if (V !== null) {
    if (V === 0) fail("Tensión de la fuente nula; déjelo en blanco si no es necesario.", "V");
    const I = V / Req;
    results.push({ label: "Corriente total", value: eng(I, "A", 4) }, { label: "Potencia total", value: eng(V * I, "W", 4) });
    const rows = list.map((r, k) => {
      const vr = mode === "series" ? I * r : V, ir = mode === "series" ? I : V / r;
      return [`R${k + 1}`, eng(r, "Ω"), eng(vr, "V"), eng(ir, "A"), eng(vr * ir, "W")];
    });
    blocks.push({ type: "table", caption: mode === "series" ? "La misma corriente en cada resistencia y la tensión se reparte" : "La misma tensión en cada resistencia y la corriente se reparte", head: ["Resistencia", "Valor", "Tensión", "Corriente", "Potencia"], rows });
    steps.push({ text: "Corriente total por la ley de Ohm:", tex: `I = \\frac{V}{R_{eq}} = \\frac{${ntex(V)}}{${ntex(Req, 6)}} = ${ntex(I, 6)}\\ A` });
    steps.push(mode === "series" ? "En serie: tensión de cada resistencia $V_k = I R_k$, y la suma de las tensiones es igual a la de la fuente (LVK)." : "En paralelo: corriente de cada resistencia $I_k = V / R_k$, y la suma de las corrientes es igual a la corriente total (LCK).");
  }
  return { results, blocks, steps, copy: `Req = ${eng(Req, "Ω", 4)}` };
}
