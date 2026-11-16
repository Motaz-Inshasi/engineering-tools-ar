import { matrixInput, fail } from "../core/validate.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";
import { niceTex, nice, fmt } from "../core/format.js";

export const meta = {
  description: "Résolution d'un système d'équations linéaires à un nombre quelconque d'inconnues par la méthode d'élimination de Gauss-Jordan, avec affichage de chaque opération sur les lignes et classification du système (solution unique, aucune solution, infinité de solutions).",
  keywords: ["équations linéaires", "système d'équations", "Gauss", "Gauss", "gauss", "élimination", "matrice augmentée", "linear system"],
  formulas: [
    { label: "Forme matricielle et matrice augmentée", tex: "A\\mathbf{x} = \\mathbf{b} \\;\\Rightarrow\\; [A\\,|\\,\\mathbf{b}] \\xrightarrow{\\text{row ops}} [I\\,|\\,\\mathbf{x}]" },
    { label: "Condition de solution (Rouché-Capelli)", tex: "\\operatorname{rank}(A) = \\operatorname{rank}([A|\\mathbf{b}]) = n \\Rightarrow \\text{unique solution}" }
  ],
  inputs: [
    { id: "aug", label: "Matrice augmentée [A | b]", type: "textarea", rows: 4, placeholder: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3", help: "Chaque ligne correspond à une équation : les coefficients des inconnues, puis le terme constant en fin de ligne. Séparez les valeurs par un espace ou une virgule." }
  ],
  example: { values: { aug: "2 1 -1 8\n-3 -1 2 -11\n-2 1 2 -3" }, expect: ["x1 = 2", "x2 = 3", "x3 = -1"], note: "Exemple : $2x_1 + x_2 - x_3 = 8$, $-3x_1 - x_2 + 2x_3 = -11$, $-2x_1 + x_2 + 2x_3 = -3$." },
  invalid: { values: { aug: "1 2\n3" } },
  related: ["matrix", "nodal-analysis", "mesh-analysis"]
};

export function solve(input) {
  const M = matrixInput(input, "aug", "Matrice augmentée", { maxSize: 10 });
  if (M[0].length < 2) fail("Chaque ligne doit contenir au moins un coefficient, suivi du terme constant.", "aug");
  const A = M.map((r) => r.slice(0, -1)), b = M.map((r) => r[r.length - 1]);
  const m = A[0].length;
  const res = solveLinear(A, b);
  const steps = [{ text: "On écrit la matrice augmentée :", tex: matTex(res.aug, m) }];
  const shown = res.steps.length > 40 ? [...res.steps.slice(0, 20), null, ...res.steps.slice(-15)] : res.steps;
  for (const s of shown) {
    if (!s) { steps.push("…(opérations sur lignes supplémentaires)…"); continue; }
    steps.push({ text: `Opération $${s.op}$ :`, tex: matTex(s.M, m) });
  }
  steps.push(`Rang de A = ${res.rankA}, rang de la matrice augmentée = ${res.rankAug}, nombre d'inconnues = ${m}.`);
  const names = Array.from({ length: m }, (_, i) => `x${i + 1}`);
  if (res.rankA < res.rankAug) {
    steps.push("Une ligne de la forme $[0 \\; 0 \\; \\cdots \\; 0 \\,|\\, c]$ avec $c \\ne 0$ apparaît : c'est une équation impossible.");
    return { results: [{ label: "Type du système", value: "Aucune solution (système incompatible)" }], steps, copy: "Aucune solution" };
  }
  if (res.rankA < m) {
    const free = names.filter((_, j) => !res.pivots.includes(j));
    const lines = res.pivots.map((pc, i) => {
      const row = res.R[i];
      let t = nice(row[m], 8);
      for (let j = 0; j < m; j++) {
        if (j === pc || res.pivots.includes(j) || Math.abs(row[j]) < 1e-12) continue;
        t += ` ${row[j] > 0 ? "-" : "+"} ${Math.abs(row[j]) === 1 ? "" : nice(Math.abs(row[j]), 8) + "·"}${names[j]}`;
      }
      return `${names[pc]} = ${t}`;
    });
    steps.push(`Le nombre d'inconnues dépasse le rang : les variables libres sont ${free.join("، ")}, et le reste s'exprime en fonction d'elles.`);
    return {
      results: [{ label: "Type du système", value: "Infinité de solutions" }, { label: "Solution générale", value: [...lines, ...free.map((f) => `${f} libre`)].join("؛ ") }],
      steps, copy: `Infinité de solutions : ${lines.join("; ")}`
    };
  }
  const x = res.R.slice(0, m).map((r) => r[m]);
  const resid = mvec(A, x).map((v, i) => v - b[i]);
  const maxRes = Math.max(...resid.map(Math.abs));
  steps.push({ text: "La solution se lit sur la dernière colonne :", tex: x.map((v, i) => `x_{${i + 1}} = ${niceTex(v, 10)}`).join(",\\quad ") });
  steps.push(`Pour vérifier, on a substitué la solution dans les équations d'origine : l'écart maximal est ${fmt(maxRes, 2)}.`);
  return {
    results: [{ label: "Type du système", value: "Solution unique" }, ...x.map((v, i) => ({ label: `$x_{${i + 1}}$`, value: v, display: nice(v, 10), text: `x${i + 1} = ${nice(v, 10)}` }))],
    steps,
    copy: x.map((v, i) => `x${i + 1} = ${nice(v, 10)}`).join("\n")
  };
}
