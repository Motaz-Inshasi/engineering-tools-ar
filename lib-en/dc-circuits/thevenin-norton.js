import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseNetlist, solveMNA, nodesOf } from "../core/circuit.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { NETLIST_HELP } from "./nodal-analysis.js";

export const meta = {
  description: "Calculate the Thevenin and Norton equivalents between any two points in a DC circuit: the open-circuit voltage, the equivalent resistance with the sources turned off, and the short-circuit current, with a check using an optional load.",
  keywords: ["Thevenin", "Norton", "thevenin", "norton", "Equivalent", "Open-circuit voltage", "Short-circuit current"],
  formulas: [
    { label: "Definitions", tex: "V_{th} = V_{oc},\\quad R_{th} = \\left.\\frac{V_{ab}}{I_{test}}\\right|_{\\text{sources off}},\\quad I_N = \\frac{V_{th}}{R_{th}}" },
    { label: "Load current from the equivalent", tex: "I_L = \\frac{V_{th}}{R_{th} + R_L}" }
  ],
  inputs: [
    { id: "net", label: "Circuit elements", type: "textarea", rows: 5, default: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", help: NETLIST_HELP },
    { id: "a", label: "Terminal a", type: "text", default: "3" },
    { id: "b", label: "Terminal b", type: "text", default: "0" },
    { id: "RL", label: "Load resistance for check (optional)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { net: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", a: "3", b: "0", RL: "4" }, expect: ["Vth = 8 V", "Rth = 4 Ω"], note: "Written example: a 24 V source with a 6 Ω and 3 Ω divider, and a 2 Ω resistor to the terminal." },
  invalid: { values: { net: "V1 1 0 24\nR1 1 2 6", a: "5", b: "0" } },
  related: ["max-power-transfer", "nodal-analysis", "mesh-analysis", "wheatstone-bridge"]
};

const norm = (n) => (["0", "gnd", "GND", "g"].includes(n) ? "0" : n);

export function thevenin(els, a, b) {
  const open = solveMNA(els, "net");
  const Voc = open.V[a] - open.V[b];
  const off = els.filter((e) => e.kind !== "I").map((e) => (e.kind === "V" ? { ...e, value: 0 } : e));
  const test = solveMNA([...off, { name: "ITEST", kind: "I", a: b, b: a, value: 1 }], "net");
  const Rth = test.V[a] - test.V[b];
  return { Voc, Rth, open };
}

export function solve(input) {
  const els = parseNetlist(str(input, "net", "Circuit elements"), "net");
  const a = norm(str(input, "a", "Terminal a").trim()), b = norm(str(input, "b", "Terminal b").trim());
  const nodes = ["0", ...nodesOf(els)];
  if (!nodes.includes(a)) fail(`Node «${a}» does not exist in the circuit.`, "a");
  if (!nodes.includes(b)) fail(`Node «${b}» does not exist in the circuit.`, "b");
  if (a === b) fail("The two terminals must be two different nodes.", "b");
  const RL = num(input, "RL", "Load resistance", { optional: true, positive: true });
  let r;
  try { r = thevenin(els, a, b); } catch (e) {
    if (e.name === "InputError") fail(`${e.message} (when the sources are turned off or the test current is injected, the circuit may become disconnected).`, "net");
    throw e;
  }
  const { Voc, Rth } = r;
  const steps = [
    { text: "Step 1: we solve the circuit as it is (terminals open) by nodal analysis and read the voltage between them:", tex: `V_{th} = V_{${a}} - V_{${b}} = ${ntex(Voc, 6)}\\ V` },
    { text: "Step 2: we turn off the independent sources (the voltage source becomes a short circuit and the current source becomes an open circuit), inject a 1 A test current between the terminals and measure the voltage:", tex: `R_{th} = \\frac{V_{test}}{1\\,A} = ${ntex(Rth, 6)}\\ \\Omega` }
  ];
  const results = [{ label: "Thevenin voltage Vth", value: eng(Voc, "V", 5), text: `Vth = ${eng(Voc, "V", 5)}` }, { label: "Thevenin resistance Rth", value: eng(Rth, "Ω", 5), text: `Rth = ${eng(Rth, "Ω", 5)}` }];
  if (Math.abs(Rth) > 1e-12) {
    const In = Voc / Rth;
    results.push({ label: "Norton current IN", value: eng(In, "A", 5) }, { label: "Norton resistance RN", value: eng(Rth, "Ω", 5) });
    steps.push({ text: "Step 3: the Norton equivalent from the source transformation:", tex: `I_N = \\frac{V_{th}}{R_{th}} = ${ntex(In, 6)}\\ A,\\quad R_N = R_{th}` });
  } else steps.push("The Thevenin resistance is zero, so the equivalent is an ideal voltage source and there is no Norton equivalent.");
  if (RL !== null) {
    const IL = Voc / (Rth + RL);
    const full = solveMNA([...els, { name: "RLOAD", kind: "R", a, b, value: RL }], "net");
    const ILfull = (full.V[a] - full.V[b]) / RL;
    results.push({ label: `Load current ${eng(RL, "Ω")}`, value: eng(IL, "A", 5) }, { label: "Load voltage", value: eng(IL * RL, "V", 5) });
    steps.push({ text: "Check: we connect the load to the equivalent, then directly to the original circuit:", tex: `I_L = \\frac{${ntex(Voc, 6)}}{${ntex(Rth, 6)} + ${ntex(RL)}} = ${ntex(IL, 6)}\\ A\\quad\\text{vs}\\quad ${ntex(ILfull, 6)}\\ A` });
    steps.push(Math.abs(IL - ILfull) <= 1e-9 * Math.max(1, Math.abs(IL)) ? "The two results are identical, so the equivalent is correct." : `Unexpected difference ${fmt(IL - ILfull, 3)}.`);
  }
  return { results, steps, copy: `Vth = ${eng(Voc, "V", 5)}, Rth = ${eng(Rth, "Ω", 5)}` };
}
