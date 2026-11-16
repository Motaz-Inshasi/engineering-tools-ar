import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, tex as ntex } from "../core/format.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";

export const meta = {
  description: "Solving planar circuits by mesh analysis (loop currents): building the KVL equations and the resistance matrix and solving them, then finding the current of each branch, with a KVL check in every loop.",
  keywords: ["Mesh analysis", "mesh analysis", "KVL", "Kirchhoff's voltage law", "Loop currents", "Resistance matrix"],
  formulas: [
    { label: "Kirchhoff's voltage law for each loop", tex: "\\sum_{\\text{loop}} R\\,I = \\sum_{\\text{loop}} V_s" },
    { label: "Matrix form", tex: "R_{ii} = \\sum R_{\\text{loop } i},\\quad R_{ij} = -R_{\\text{shared}},\\quad [R]\\,\\mathbf{I} = \\mathbf{V}" }
  ],
  inputs: [
    { id: "br", label: "Branches", type: "textarea", rows: 6, default: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5", help: "Each branch line: loop1 loop2 resistance voltage. Loop2 = 0 if the branch is on the outer edge. The voltage is positive if it drives current in the direction of loop 1's rotation (clockwise)." }
  ],
  example: { values: { br: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5" }, expect: ["I1 = 1.81818 A", "I2 = 227.273 mA"], note: "Example: two loops sharing a 4 Ω resistor, with a 10 V source in the first loop and an opposing 5 V source in the second." },
  invalid: { values: { br: "1 0 0 5" } },
  related: ["nodal-analysis", "thevenin-norton", "linear-system"]
};

export function parseBranches(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.replace(/[#;].*$/, "").trim()).filter(Boolean);
  if (!lines.length) fail("Enter the circuit branches, one branch per line.", "br");
  if (lines.length > 50) fail("The maximum number of branches is 50.", "br");
  return lines.map((line, i) => {
    const p = line.split(/[\s,،]+/);
    const where = `Line ${i + 1} («${line}»)`;
    if (p.length < 3 || p.length > 4) fail(`${where}: format: loop1 loop2 resistance [voltage].`, "br");
    const [a, b] = [Number(p[0]), Number(p[1])];
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(b) || b < 0) fail(`${where}: the first loop number starts from 1, and the second is 0 or a loop number.`, "br");
    if (a === b) fail(`${where}: the two loops are identical.`, "br");
    const R = parseNumber(p[2]), V = p.length === 4 ? parseNumber(p[3]) : 0;
    if (!isFinite(R) || R < 0) fail(`${where}: the resistance must be a non-negative number.`, "br");
    if (!isFinite(V)) fail(`${where}: the voltage is not a valid number.`, "br");
    return { a, b, R, V, line };
  });
}

export function meshSolve(branches) {
  const M = Math.max(...branches.flatMap((x) => [x.a, x.b]));
  for (let k = 1; k <= M; k++) if (!branches.some((x) => x.a === k || x.b === k)) fail(`Loop ${k} contains no branch. Number the loops consecutively from 1.`, "br");
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
  if (res.rankA < M) fail("The resistance matrix is singular: make sure every loop contains a resistance and that the loops are independent.", "br");
  const I = res.R.slice(0, M).map((r) => r[M]);
  return { M, R, V, I };
}

export function solve(input) {
  const branches = parseBranches(str(input, "br", "Branches"));
  const { M, R, V, I } = meshSolve(branches);
  const steps = [`Number of loops ${M}. We assume a loop current $I_k$ clockwise in each loop.`];
  for (let k = 0; k < M; k++) {
    const lhs = R[k].map((r, j) => (r === 0 ? null : `${j === k ? "" : ""}${ntex(r)} I_{${j + 1}}`)).filter(Boolean).join(" + ").replace(/\+ -/g, "- ");
    steps.push({ text: `KVL in loop ${k + 1} (self-resistance on the diagonal, shared resistances with a negative sign):`, tex: `${lhs} = ${ntex(V[k])}` });
  }
  steps.push({ text: "In matrix form:", tex: `${matTex(R)}\\begin{bmatrix}${I.map((_, k) => `I_{${k + 1}}`).join("\\\\")}\\end{bmatrix} = ${matTex(V.map((v) => [v]))}` });
  const resid = mvec(R, I).map((x, k) => x - V[k]);
  steps.push({ text: "After solving, we substituted the currents into the KVL equations; the largest difference was:", tex: `${ntex(Math.max(...resid.map(Math.abs)), 2)}\\ V` });
  const rows = branches.map((x) => {
    const ib = I[x.a - 1] - (x.b > 0 ? I[x.b - 1] : 0);
    return [x.line, x.b > 0 ? `I${x.a} − I${x.b}` : `I${x.a}`, eng(ib, "A", 5), eng(ib * x.R, "V", 5), eng(ib * ib * x.R, "W", 4)];
  });
  steps.push("The current of a branch shared by two loops equals the difference between the two loop currents.");
  return {
    results: I.map((i, k) => ({ label: `Loop ${k + 1} current`, value: eng(i, "A", 6), text: `I${k + 1} = ${eng(i, "A", 6)}` })),
    blocks: [{ type: "table", caption: "Branch currents (positive in the direction of loop 1's rotation)", head: ["Branch", "Current", "Value", "Resistor voltage", "Resistor power"], rows }],
    steps, copy: I.map((i, k) => `I${k + 1} = ${eng(i, "A", 6)}`).join("\n")
  };
}
