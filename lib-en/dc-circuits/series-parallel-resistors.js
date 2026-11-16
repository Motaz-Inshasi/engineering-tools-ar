import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculate the equivalent resistance of a group of resistors in series or parallel, with the voltage or current and the power on each resistor when the source voltage is entered.",
  keywords: ["Resistors in series", "Resistors in parallel", "Equivalent resistance", "series", "parallel", "resistors", "Resistor connection"],
  formulas: [
    { label: "Series", tex: "R_{eq} = R_1 + R_2 + \\cdots + R_n" },
    { label: "Parallel", tex: "\\frac{1}{R_{eq}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots,\\qquad R_1 \\parallel R_2 = \\frac{R_1 R_2}{R_1 + R_2}" }
  ],
  inputs: [
    { id: "list", label: "Resistor values", unit: "Ω", type: "text", default: "100, 220, 330", wide: true, help: "Separate with a comma or a space; you can use k and M, for example 4.7k." },
    { id: "mode", label: "Connection method", type: "select", default: "series", options: [["series", "Series"], ["parallel", "Parallel"]] },
    { id: "V", label: "Source voltage (optional)", unit: "V", type: "number" }
  ],
  example: { values: { list: "100, 220, 330", mode: "parallel", V: "12" }, expect: ["Req = 56.9 Ω"], note: "Example: three resistors of 100, 220 and 330 Ω in parallel." },
  invalid: { values: { list: "100, -5", mode: "series" } },
  related: ["voltage-current-divider", "ohms-law", "capacitor-inductor-combination", "standard-resistor-values"]
};

export function equivalent(list, mode) {
  return mode === "series" ? list.reduce((a, b) => a + b, 0) : 1 / list.reduce((a, b) => a + 1 / b, 0);
}

export function solve(input) {
  const list = numList(input, "list", "Resistor values", { positive: true, max: 50 });
  const mode = choice(input, "mode", "Connection method", ["series", "parallel"], "series");
  const V = num(input, "V", "Source voltage", { optional: true });
  const Req = equivalent(list, mode);
  const steps = [];
  if (mode === "series") {
    steps.push({ text: "In series we add the resistances directly:", tex: `R_{eq} = ${list.map((r) => ntex(r)).join(" + ")} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("The series equivalent is always larger than the largest resistor.");
  } else {
    steps.push({ text: "In parallel we add the reciprocals (conductances):", tex: `\\frac{1}{R_{eq}} = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(1 / Req, 6)}\\ S` });
    steps.push({ tex: `R_{eq} = ${ntex(Req, 6)}\\ \\Omega` });
    if (list.length === 2) steps.push({ text: "For only two resistors the product-over-sum formula can be used:", tex: `\\frac{${ntex(list[0])} \\times ${ntex(list[1])}}{${ntex(list[0])} + ${ntex(list[1])}} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("The parallel equivalent is always smaller than the smallest resistor.");
  }
  const results = [{ label: "Equivalent resistance", value: eng(Req, "Ω", 4), text: `Req = ${eng(Req, "Ω", 4)}` }, { label: "Equivalent conductance", value: eng(1 / Req, "S", 4) }];
  const blocks = [];
  if (V !== null) {
    if (V === 0) fail("Source voltage is zero; leave it empty if not required.", "V");
    const I = V / Req;
    results.push({ label: "Total current", value: eng(I, "A", 4) }, { label: "Total power", value: eng(V * I, "W", 4) });
    const rows = list.map((r, k) => {
      const vr = mode === "series" ? I * r : V, ir = mode === "series" ? I : V / r;
      return [`R${k + 1}`, eng(r, "Ω"), eng(vr, "V"), eng(ir, "A"), eng(vr * ir, "W")];
    });
    blocks.push({ type: "table", caption: mode === "series" ? "Same current through each resistor, voltage divides" : "Same voltage across each resistor, current divides", head: ["Resistance", "Value", "Voltage", "Current", "Power"], rows });
    steps.push({ text: "Total current from Ohm's law:", tex: `I = \\frac{V}{R_{eq}} = \\frac{${ntex(V)}}{${ntex(Req, 6)}} = ${ntex(I, 6)}\\ A` });
    steps.push(mode === "series" ? "In series: the voltage of each resistor $V_k = I R_k$, and the sum of the voltages equals the source voltage (KVL)." : "In parallel: the current of each resistor $I_k = V / R_k$, and the sum of the currents equals the total current (KCL).");
  }
  return { results, blocks, steps, copy: `Req = ${eng(Req, "Ω", 4)}` };
}
