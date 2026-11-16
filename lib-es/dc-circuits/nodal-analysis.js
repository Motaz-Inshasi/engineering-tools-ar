import { parseNetlist, solveMNA, kclResiduals } from "../core/circuit.js";
import { matTex } from "../core/matrix.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

export const NETLIST_HELP = "Cada línea es un elemento: nombre nodo1 nodo2 valor. R es resistencia, V fuente de tensión (el nodo1 es el terminal positivo) e I fuente de corriente (la corriente circula dentro de ella del nodo1 al nodo2). El nodo 0 es tierra.";

export const meta = {
  description: "Resuelva cualquier circuito de corriente continua por análisis nodal modificado (MNA) a partir de una lista de elementos sencillos: tensiones de nodo, corriente, tensión y potencia de cada elemento, con ecuaciones LCK, matriz, comprobación con las leyes de Kirchhoff y balance de potencias.",
  keywords: ["Análisis nodal", "nodal analysis", "KCL", "Kirchhoff", "Tensión de nodo", "MNA", "Resolución de circuitos", "Ley de corrientes"],
  formulas: [
    { label: "Ley de corrientes de Kirchhoff en cada nodo", tex: "\\sum_{k} \\frac{V_n - V_k}{R_{nk}} + \\sum I_{out} = 0" },
    { label: "Forma matricial (MNA)", tex: "\\begin{bmatrix} G & B \\\\ B^T & 0 \\end{bmatrix}\\begin{bmatrix} \\mathbf{v} \\\\ \\mathbf{i}_V \\end{bmatrix} = \\begin{bmatrix} \\mathbf{i}_s \\\\ \\mathbf{e} \\end{bmatrix}" }
  ],
  inputs: [
    { id: "net", label: "Elementos del circuito", type: "textarea", rows: 6, default: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k", help: NETLIST_HELP }
  ],
  example: { values: { net: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k" }, expect: ["V(2) = 7.5 V", "V(3) = 7.125 V"], note: "Ejemplo: fuente de tensión, fuente de corriente y cuatro resistencias." },
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
    `Nodos sin conexión a tierra: ${sol.nodes.join("، ")}. Incógnitas: tensión de cada nodo${sol.m ? ` y corriente de cada fuente de tensión (${sol.m})` : ""}.`,
    "Escribimos la ley de corrientes de Kirchhoff en cada nodo (suma de las corrientes salientes = 0):",
    ...sol.nodes.map((nd) => ({ tex: kclTex(nd, els) })),
    ...els.filter((e) => e.kind === "V").map((e) => ({ text: `Y la ecuación de la fuente de tensión ${e.name}:`, tex: `${e.a === "0" ? "0" : `V_{${e.a}}`} - ${e.b === "0" ? "0" : `V_{${e.b}}`} = ${ntex(e.value)}` })),
    { text: "En forma matricial:", tex: `${matTex(sol.A)}\\mathbf{x} = ${matTex(sol.z.map((v) => [v]))}` },
    "Resolvemos el sistema por eliminación de Gauss y obtenemos las tensiones de nodo; de ellas, la corriente de cada elemento: $I = (V_a - V_b)/R$."
  ];
  const resid = Object.values(kclResiduals(sol));
  const pSum = sol.branches.reduce((s, b) => s + b.p, 0);
  steps.push({ text: "Comprobación: mayor error de LCK en los nodos y suma de las potencias absorbidas (debe ser cero, porque la potencia generada es igual a la consumida):", tex: `\\max|\\textstyle\\sum I| = ${ntex(Math.max(0, ...resid.map(Math.abs)), 2)}\\ A,\\qquad \\textstyle\\sum P = ${ntex(pSum, 2)}\\ W` });
  const rows = sol.branches.map((b) => [b.name, `${b.a} → ${b.b}`, eng(b.v, "V", 5), eng(b.i, "A", 5), eng(b.p, "W", 4), b.p < -1e-15 ? "Genera" : "Consume"]);
  return {
    results: sol.nodes.map((nd) => ({ label: `Tensión del nodo ${nd}`, value: eng(sol.V[nd], "V", 6), text: `V(${nd}) = ${eng(sol.V[nd], "V", 6)}` })),
    blocks: [{ type: "table", caption: "Elementos (la corriente es positiva del primer nodo al segundo dentro del elemento)", head: ["Elemento", "Sentido", "Tensión", "Corriente", "Potencia absorbida", "Papel"], rows }],
    steps, copy: sol.nodes.map((nd) => `V(${nd}) = ${eng(sol.V[nd], "V", 6)}`).join("\n")
  };
}
