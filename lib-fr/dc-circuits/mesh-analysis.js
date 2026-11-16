import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, tex as ntex } from "../core/format.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";

export const meta = {
  description: "Résolution des circuits plans par analyse en mailles (courants de maille) : construction des équations KVL et de la matrice des résistances, résolution, puis courant de chaque branche, avec vérification de KVL dans chaque maille.",
  keywords: ["Analyse en mailles", "mesh analysis", "KVL", "Kirchhoff des tensions", "Courants de maille", "Matrice des résistances"],
  formulas: [
    { label: "Loi des mailles de Kirchhoff pour chaque maille", tex: "\\sum_{\\text{loop}} R\\,I = \\sum_{\\text{loop}} V_s" },
    { label: "Forme matricielle", tex: "R_{ii} = \\sum R_{\\text{loop } i},\\quad R_{ij} = -R_{\\text{shared}},\\quad [R]\\,\\mathbf{I} = \\mathbf{V}" }
  ],
  inputs: [
    { id: "br", label: "Branches", type: "textarea", rows: 6, default: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5", help: "Chaque ligne est une branche : maille1 maille2 résistance tension. Maille2 = 0 si la branche est sur le contour extérieur. La tension est positive si elle pousse le courant dans le sens de rotation de la maille1 (sens horaire)." }
  ],
  example: { values: { br: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5" }, expect: ["I1 = 1.81818 A", "I2 = 227.273 mA"], note: "Exemple : deux mailles partageant une résistance de 4 Ω, avec une source de 10 V dans la première et une source de 5 V opposée dans la seconde." },
  invalid: { values: { br: "1 0 0 5" } },
  related: ["nodal-analysis", "thevenin-norton", "linear-system"]
};

export function parseBranches(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.replace(/[#;].*$/, "").trim()).filter(Boolean);
  if (!lines.length) fail("Saisissez les branches du circuit, une branche par ligne.", "br");
  if (lines.length > 50) fail("Nombre maximal de branches : 50.", "br");
  return lines.map((line, i) => {
    const p = line.split(/[\s,،]+/);
    const where = `Ligne ${i + 1} («${line}»)`;
    if (p.length < 3 || p.length > 4) fail(`${where} : format : maille1 maille2 résistance [tension].`, "br");
    const [a, b] = [Number(p[0]), Number(p[1])];
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(b) || b < 0) fail(`${where} : le numéro de la première maille commence à 1, la seconde est 0 ou un numéro de maille.`, "br");
    if (a === b) fail(`${where} : les deux mailles sont identiques.`, "br");
    const R = parseNumber(p[2]), V = p.length === 4 ? parseNumber(p[3]) : 0;
    if (!isFinite(R) || R < 0) fail(`${where} : la résistance doit être un nombre non négatif.`, "br");
    if (!isFinite(V)) fail(`${where} : la tension n'est pas un nombre valide.`, "br");
    return { a, b, R, V, line };
  });
}

export function meshSolve(branches) {
  const M = Math.max(...branches.flatMap((x) => [x.a, x.b]));
  for (let k = 1; k <= M; k++) if (!branches.some((x) => x.a === k || x.b === k)) fail(`La maille ${k} ne contient aucune branche. Numérotez les mailles successivement à partir de 1.`, "br");
  const R = Array.from({ length: M }, () => new Array(M).fill(0));
  const V = new Array(M).fill(0);
  for (const x of branches) {
    R[x.a - 1][x.a - 1] += x.R;
    V[x.a - 1] += x.V;
    if (x.b > 0) {
      R[x.b - 1][x.b - 1] += x.R;
      R[x.a - 1][x.b - 1] -= x.R;
      R[x.b - 1][x.a - 1] -= x.R;
      V[x.b - 1] -= x.V;
    }
  }
  const res = solveLinear(R, V);
  if (res.rankA < M) fail("Matrice des résistances singulière : vérifiez que chaque maille contient une résistance et que les mailles sont indépendantes.", "br");
  const I = res.R.slice(0, M).map((r) => r[M]);
  return { M, R, V, I };
}

export function solve(input) {
  const branches = parseBranches(str(input, "br", "Branches"));
  const { M, R, V, I } = meshSolve(branches);
  const steps = [`Nombre de mailles ${M}. On suppose un courant de maille $I_k$ dans le sens horaire pour chaque maille.`];
  for (let k = 0; k < M; k++) {
    const lhs = R[k].map((r, j) => (r === 0 ? null : `${j === k ? "" : ""}${ntex(r)} I_{${j + 1}}`)).filter(Boolean).join(" + ").replace(/\+ -/g, "- ");
    steps.push({ text: `KVL dans la maille ${k + 1} (résistance propre sur la diagonale, et résistances communes avec un signe négatif) :`, tex: `${lhs} = ${ntex(V[k])}` });
  }
  steps.push({ text: "Sous forme matricielle :", tex: `${matTex(R)}\\begin{bmatrix}${I.map((_, k) => `I_{${k + 1}}`).join("\\\\")}\\end{bmatrix} = ${matTex(V.map((v) => [v]))}` });
  const resid = mvec(R, I).map((x, k) => x - V[k]);
  steps.push({ text: "Après résolution, on a substitué les courants dans les équations KVL : l'écart maximal est :", tex: `${ntex(Math.max(...resid.map(Math.abs)), 2)}\\ V` });
  const rows = branches.map((x) => {
    const ib = I[x.a - 1] - (x.b > 0 ? I[x.b - 1] : 0);
    return [x.line, x.b > 0 ? `I${x.a} − I${x.b}` : `I${x.a}`, eng(ib, "A", 5), eng(ib * x.R, "V", 5), eng(ib * ib * x.R, "W", 4)];
  });
  steps.push("Courant d'une branche commune à deux mailles = différence des deux courants de maille.");
  return {
    results: I.map((i, k) => ({ label: `Courant de la maille ${k + 1}`, value: eng(i, "A", 6), text: `I${k + 1} = ${eng(i, "A", 6)}` })),
    blocks: [{ type: "table", caption: "Courants des branches (positifs dans le sens de rotation de la première maille)", head: ["Branche", "Courant", "Valeur", "Tension aux bornes de la résistance", "Puissance de la résistance"], rows }],
    steps, copy: I.map((i, k) => `I${k + 1} = ${eng(i, "A", 6)}`).join("\n")
  };
}
