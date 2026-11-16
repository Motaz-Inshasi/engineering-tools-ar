import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Calculate the equivalent capacitance of capacitors, or the equivalent inductance of inductors, in series or in parallel, with the voltage, charge and energy distribution across the capacitors when a voltage is applied.",
  keywords: ["Capacitors in series", "Capacitors in parallel", "Equivalent capacitance", "Inductors", "Equivalent inductance", "capacitors", "inductors", "Capacitor energy"],
  formulas: [
    { label: "Capacitors (inverse of resistors)", tex: "C_{par} = \\sum C_i,\\qquad \\frac{1}{C_{ser}} = \\sum\\frac{1}{C_i}" },
    { label: "Inductors without mutual inductance (like resistors)", tex: "L_{ser} = \\sum L_i,\\qquad \\frac{1}{L_{par}} = \\sum\\frac{1}{L_i}" }
  ],
  inputs: [
    { id: "kind", label: "Type", type: "select", default: "C", options: [["C", "Capacitors"], ["L", "Inductors"]] },
    { id: "mode", label: "Connection", type: "select", default: "series", options: [["series", "Series"], ["parallel", "Parallel"]] },
    { id: "list", label: "Values (F or H)", type: "text", default: "10u, 22u, 47u", wide: true, help: "e.g. 10u, 22u or 4.7n." },
    { id: "V", label: "Total voltage (optional, for capacitors)", unit: "V", type: "number", default: "12", when: { kind: ["C"] } }
  ],
  example: { values: { kind: "C", mode: "series", list: "10u, 22u, 47u", V: "12" }, expect: ["Ceq = 5.998 µF"], note: "Example: three capacitors in series across 12 V." },
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
  const kind = choice(input, "kind", "Type", ["C", "L"], "C");
  const mode = choice(input, "mode", "Connection", ["series", "parallel"], "series");
  const list = numList(input, "list", "Values", { positive: true, max: 40 });
  const eq = equivalent(kind, mode, list);
  const unit = kind === "C" ? "F" : "H";
  const sym = kind === "C" ? "C" : "L";
  const reciprocal = (kind === "C" && mode === "series") || (kind === "L" && mode === "parallel");
  const steps = [reciprocal
    ? { text: `${kind === "C" ? "Capacitors in series" : "Inductors in parallel"}: we add the reciprocals.`, tex: `\\frac{1}{${sym}_{eq}} = ${list.map((x) => `\\frac{1}{${ntex(x)}}`).join(" + ")} \\Rightarrow ${sym}_{eq} = ${ntex(eq, 6)}\\ ${unit}` }
    : { text: `${kind === "C" ? "Capacitors in parallel" : "Inductors in series"}: we add the values directly.`, tex: `${sym}_{eq} = ${list.map((x) => ntex(x)).join(" + ")} = ${ntex(eq, 6)}\\ ${unit}` }];
  const results = [{ label: kind === "C" ? "Equivalent capacitance" : "Equivalent inductance", value: eng(eq, unit, 4), text: `${sym}eq = ${eng(eq, unit, 4)}` }];
  const blocks = [];
  if (kind === "C") {
    const V = num(input, "V", "Voltage", { optional: true });
    if (V !== null) {
      if (V === 0) fail("Voltage is zero; leave it empty if not needed.", "V");
      const Q = eq * V;
      results.push({ label: "Total charge", value: eng(Q, "C", 4) }, { label: "Stored energy", value: eng(0.5 * eq * V * V, "J", 4) });
      const rows = list.map((c, k) => {
        const vk = mode === "series" ? Q / c : V, qk = c * vk;
        return [`C${k + 1}`, eng(c, "F"), eng(vk, "V", 4), eng(qk, "C", 4), eng(0.5 * c * vk * vk, "J", 4)];
      });
      blocks.push({ type: "table", caption: mode === "series" ? "In series: the same charge flows through each capacitor, and the larger voltage appears across the smaller capacitor." : "In parallel: the same voltage is across each capacitor, and the charge is proportional to the capacitance.", head: ["Capacitor", "Capacitance", "Voltage", "Charge", "Energy"], rows });
      steps.push({ text: "Total charge and energy:", tex: `Q = C_{eq}V = ${ntex(Q, 6)}\\ C,\\quad W = \\tfrac{1}{2}C_{eq}V^2 = ${ntex(0.5 * eq * V * V, 6)}\\ J` });
    }
  } else steps.push("We assume there is no mutual inductance between the inductors (i.e., they are far apart or shielded).");
  return { results, blocks, steps, copy: `${sym}eq = ${eng(eq, unit, 4)}` };
}
