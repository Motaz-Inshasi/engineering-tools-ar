import { parseNetlist, solveMNA, kclResiduals } from "../core/circuit.js";
import { matTex } from "../core/matrix.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

export const NETLIST_HELP = "Each element line: name node1 node2 value. R is a resistor, V is a voltage source (node1 is the positive terminal), I is a current source (current flows through it from node1 to node2). Node 0 is ground.";

export const meta = {
  description: "Solve any DC circuit by modified nodal analysis (MNA) from a list of simple elements: node voltages, and the current, voltage and power of each element, with KCL equations, the matrix form, and a check using Kirchhoff's laws and power balance.",
  keywords: ["Nodal analysis", "nodal analysis", "KCL", "Kirchhoff", "Node voltage", "MNA", "Circuit solving", "Current law"],
  formulas: [
    { label: "Kirchhoff's current law at each node", tex: "\\sum_{k} \\frac{V_n - V_k}{R_{nk}} + \\sum I_{out} = 0" },
    { label: "Matrix form (MNA)", tex: "\\begin{bmatrix} G & B \\\\ B^T & 0 \\end{bmatrix}\\begin{bmatrix} \\mathbf{v} \\\\ \\mathbf{i}_V \\end{bmatrix} = \\begin{bmatrix} \\mathbf{i}_s \\\\ \\mathbf{e} \\end{bmatrix}" }
  ],
  inputs: [
    { id: "net", label: "Circuit elements", type: "textarea", rows: 6, default: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k", help: NETLIST_HELP }
  ],
  example: { values: { net: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k" }, expect: ["V(2) = 7.5 V", "V(3) = 7.125 V"], note: "Example: a voltage source, a current source and four resistors." },
  invalid: { values: { net: "V1 1 0 5\nR1 2 3 10" } },
  related: ["mesh-analysis", "thevenin-norton", "linear-system", "voltage-current-divider"]
};

function kclTex(node, els) {
  const terms = [];
  for (const e of els) {
    if (e.a !== node && e.b !== node) continue;
    const other = e.a === node ? e.b : e.a;
    const vo = other === "0" ? "0" : `V_{${other}}`;
    if (e.kind === "R") terms.push(other === "0" ? `\\frac{V_{${node}}}{${ntex(e.value)}}` : `\\frac{V_{${node}} - ${vo}}{${ntex(e.value)}}`);
    else if (e.kind === "I") terms.push(`${e.a === node ? "+" : "-"}${ntex(e.value)}`);
    else terms.push(`${e.a === node ? "+" : "-"}I_{${e.name}}`);
  }
  return terms.join(" + ").replace(/\+ -/g, "- ").replace(/\+ \+/g, "+ ") + " = 0";
}

export function solve(input) {
  const els = parseNetlist(input.net, "net");
  const sol = solveMNA(els, "net");
  const steps = [
    `Non-ground nodes: ${sol.nodes.join("، ")}. Unknowns: the voltage of each node${sol.m ? ` and the current of each voltage source (${sol.m})` : ""}.`,
    "We write Kirchhoff's current law at each node (sum of outgoing currents = 0):",
    ...sol.nodes.map((nd) => ({ tex: kclTex(nd, els) })),
    ...els.filter((e) => e.kind === "V").map((e) => ({ text: `and the equation of the voltage source ${e.name}:`, tex: `${e.a === "0" ? "0" : `V_{${e.a}}`} - ${e.b === "0" ? "0" : `V_{${e.b}}`} = ${ntex(e.value)}` })),
    { text: "In matrix form:", tex: `${matTex(sol.A)}\\mathbf{x} = ${matTex(sol.z.map((v) => [v]))}` },
    "We solve the system by Gaussian elimination to get the node voltages, and from them the current of each element: $I = (V_a - V_b)/R$."
  ];
  const resid = Object.values(kclResiduals(sol));
  const pSum = sol.branches.reduce((s, b) => s + b.p, 0);
  steps.push({ text: "Check: the largest KCL error at the nodes, and the sum of the absorbed powers (must equal zero, because generated power = consumed power):", tex: `\\max|\\textstyle\\sum I| = ${ntex(Math.max(0, ...resid.map(Math.abs)), 2)}\\ A,\\qquad \\textstyle\\sum P = ${ntex(pSum, 2)}\\ W` });
  const rows = sol.branches.map((b) => [b.name, `${b.a} → ${b.b}`, eng(b.v, "V", 5), eng(b.i, "A", 5), eng(b.p, "W", 4), b.p < -1e-15 ? "generates" : "consumes"]);
  return {
    results: sol.nodes.map((nd) => ({ label: `Node ${nd} voltage`, value: eng(sol.V[nd], "V", 6), text: `V(${nd}) = ${eng(sol.V[nd], "V", 6)}` })),
    blocks: [{ type: "table", caption: "Elements (current is positive from the first node to the second inside the element)", head: ["Element", "Direction", "Voltage", "Current", "Absorbed power", "Role"], rows }],
    steps, copy: sol.nodes.map((nd) => `V(${nd}) = ${eng(sol.V[nd], "V", 6)}`).join("\n")
  };
}
