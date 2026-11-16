import { parseNetlist, solveMNA, kclResiduals } from "../core/circuit.js";
import { matTex } from "../core/matrix.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

export const NETLIST_HELP = "Chaque ligne est un élément : nom nœud1 nœud2 valeur. R résistance, V source de tension (le nœud1 est la borne positive), I source de courant (le courant circule à l'intérieur de la source, du nœud1 vers le nœud2). Le nœud 0 est la masse.";

export const meta = {
  description: "Résolution de tout circuit en courant continu par l'analyse nodale modifiée (MNA) à partir d'une liste d'éléments simples : tensions de nœuds, courant, tension et puissance de chaque élément, avec équations KCL, matrice, et vérification par les lois de Kirchhoff et le bilan de puissance.",
  keywords: ["Analyse nodale", "nodal analysis", "KCL", "Kirchhoff", "Tension de nœud", "MNA", "Résolution de circuits", "Loi des nœuds"],
  formulas: [
    { label: "Loi des nœuds de Kirchhoff en chaque nœud", tex: "\\sum_{k} \\frac{V_n - V_k}{R_{nk}} + \\sum I_{out} = 0" },
    { label: "Forme matricielle (MNA)", tex: "\\begin{bmatrix} G & B \\\\ B^T & 0 \\end{bmatrix}\\begin{bmatrix} \\mathbf{v} \\\\ \\mathbf{i}_V \\end{bmatrix} = \\begin{bmatrix} \\mathbf{i}_s \\\\ \\mathbf{e} \\end{bmatrix}" }
  ],
  inputs: [
    { id: "net", label: "Éléments du circuit", type: "textarea", rows: 6, default: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k", help: NETLIST_HELP }
  ],
  example: { values: { net: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k" }, expect: ["V(2) = 7.5 V", "V(3) = 7.125 V"], note: "Exemple : une source de tension, une source de courant et quatre résistances." },
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
    `Nœuds non reliés à la masse : ${sol.nodes.join("، ")}. Inconnues : tension de chaque nœud${sol.m ? ` et courant de chaque source de tension (${sol.m})` : ""}.`,
    "On écrit la loi des nœuds de Kirchhoff en chaque nœud (somme des courants sortants = 0) :",
    ...sol.nodes.map((nd) => ({ tex: kclTex(nd, els) })),
    ...els.filter((e) => e.kind === "V").map((e) => ({ text: `Et l'équation de la source de tension ${e.name} :`, tex: `${e.a === "0" ? "0" : `V_{${e.a}}`} - ${e.b === "0" ? "0" : `V_{${e.b}}`} = ${ntex(e.value)}` })),
    { text: "Sous forme matricielle :", tex: `${matTex(sol.A)}\\mathbf{x} = ${matTex(sol.z.map((v) => [v]))}` },
    "On résout le système par élimination de Gauss pour obtenir les tensions de nœuds, puis le courant de chaque élément : $I = (V_a - V_b)/R$."
  ];
  const resid = Object.values(kclResiduals(sol));
  const pSum = sol.branches.reduce((s, b) => s + b.p, 0);
  steps.push({ text: "Vérification : plus grande erreur de KCL aux nœuds, et somme des puissances absorbées (doit être nulle car la puissance fournie = la puissance consommée) :", tex: `\\max|\\textstyle\\sum I| = ${ntex(Math.max(0, ...resid.map(Math.abs)), 2)}\\ A,\\qquad \\textstyle\\sum P = ${ntex(pSum, 2)}\\ W` });
  const rows = sol.branches.map((b) => [b.name, `${b.a} → ${b.b}`, eng(b.v, "V", 5), eng(b.i, "A", 5), eng(b.p, "W", 4), b.p < -1e-15 ? "Fournit" : "Consomme"]);
  return {
    results: sol.nodes.map((nd) => ({ label: `Tension du nœud ${nd}`, value: eng(sol.V[nd], "V", 6), text: `V(${nd}) = ${eng(sol.V[nd], "V", 6)}` })),
    blocks: [{ type: "table", caption: "Éléments (courant positif du premier nœud vers le second à l'intérieur de l'élément)", head: ["Élément", "Sens", "Tension", "Courant", "Puissance absorbée", "Rôle"], rows }],
    steps, copy: sol.nodes.map((nd) => `V(${nd}) = ${eng(sol.V[nd], "V", 6)}`).join("\n")
  };
}
