import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, tex as ntex } from "../core/format.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";

export const meta = {
  description: "Resuelva circuitos planos por análisis de mallas (corrientes de malla): construcción de las ecuaciones LVK y de la matriz de resistencias, su resolución, la corriente de cada rama y la comprobación de LVK en cada malla.",
  keywords: ["Análisis de mallas", "mesh analysis", "KVL", "Ley de tensiones de Kirchhoff", "Corrientes de malla", "Matriz de resistencias"],
  formulas: [
    { label: "Ley de tensiones de Kirchhoff para cada malla", tex: "\\sum_{\\text{loop}} R\\,I = \\sum_{\\text{loop}} V_s" },
    { label: "Forma matricial", tex: "R_{ii} = \\sum R_{\\text{loop } i},\\quad R_{ij} = -R_{\\text{shared}},\\quad [R]\\,\\mathbf{I} = \\mathbf{V}" }
  ],
  inputs: [
    { id: "br", label: "Ramas", type: "textarea", rows: 6, default: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5", help: "Cada línea es una rama: malla1 malla2 resistencia tensión. Malla2 = 0 si la rama está en el borde exterior. La tensión es positiva si impulsa la corriente en el sentido de giro de la malla1 (horario)." }
  ],
  example: { values: { br: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5" }, expect: ["I1 = 1.81818 A", "I2 = 227.273 mA"], note: "Ejemplo: dos mallas que comparten una resistencia de 4 Ω, con una fuente de 10 V en la primera y una fuente de 5 V opuesta en la segunda." },
  invalid: { values: { br: "1 0 0 5" } },
  related: ["nodal-analysis", "thevenin-norton", "linear-system"]
};

export function parseBranches(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.replace(/[#;].*$/, "").trim()).filter(Boolean);
  if (!lines.length) fail("Introduzca las ramas del circuito, una por línea.", "br");
  if (lines.length > 50) fail("El número máximo de ramas es 50.", "br");
  return lines.map((line, i) => {
    const p = line.split(/[\s,،]+/);
    const where = `Línea ${i + 1} («${line}»)`;
    if (p.length < 3 || p.length > 4) fail(`${where}: formato: malla1 malla2 resistencia [tensión].`, "br");
    const [a, b] = [Number(p[0]), Number(p[1])];
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(b) || b < 0) fail(`${where}: el número de la primera malla empieza en 1; el de la segunda es 0 o un número de malla.`, "br");
    if (a === b) fail(`${where}: las dos mallas son iguales.`, "br");
    const R = parseNumber(p[2]), V = p.length === 4 ? parseNumber(p[3]) : 0;
    if (!isFinite(R) || R < 0) fail(`${where}: la resistencia debe ser un número no negativo.`, "br");
    if (!isFinite(V)) fail(`${where}: la tensión no es un número válido.`, "br");
    return { a, b, R, V, line };
  });
}

export function meshSolve(branches) {
  const M = Math.max(...branches.flatMap((x) => [x.a, x.b]));
  for (let k = 1; k <= M; k++) if (!branches.some((x) => x.a === k || x.b === k)) fail(`La malla ${k} no contiene ninguna rama. Numere las mallas consecutivamente desde 1.`, "br");
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
  if (res.rankA < M) fail("La matriz de resistencias es singular: compruebe que cada malla contenga una resistencia y que las mallas sean independientes.", "br");
  const I = res.R.slice(0, M).map((r) => r[M]);
  return { M, R, V, I };
}

export function solve(input) {
  const branches = parseBranches(str(input, "br", "Ramas"));
  const { M, R, V, I } = meshSolve(branches);
  const steps = [`Número de mallas ${M}. Suponemos una corriente de malla $I_k$ en sentido horario en cada malla.`];
  for (let k = 0; k < M; k++) {
    const lhs = R[k].map((r, j) => (r === 0 ? null : `${j === k ? "" : ""}${ntex(r)} I_{${j + 1}}`)).filter(Boolean).join(" + ").replace(/\+ -/g, "- ");
    steps.push({ text: `LVK en la malla ${k + 1} (la resistencia propia en la diagonal, y las compartidas con signo negativo):`, tex: `${lhs} = ${ntex(V[k])}` });
  }
  steps.push({ text: "En forma matricial:", tex: `${matTex(R)}\\begin{bmatrix}${I.map((_, k) => `I_{${k + 1}}`).join("\\\\")}\\end{bmatrix} = ${matTex(V.map((v) => [v]))}` });
  const resid = mvec(R, I).map((x, k) => x - V[k]);
  steps.push({ text: "Tras resolver, sustituimos las corrientes en las ecuaciones LVK; la mayor diferencia fue:", tex: `${ntex(Math.max(...resid.map(Math.abs)), 2)}\\ V` });
  const rows = branches.map((x) => {
    const ib = I[x.a - 1] - (x.b > 0 ? I[x.b - 1] : 0);
    return [x.line, x.b > 0 ? `I${x.a} − I${x.b}` : `I${x.a}`, eng(ib, "A", 5), eng(ib * x.R, "V", 5), eng(ib * ib * x.R, "W", 4)];
  });
  steps.push("La corriente de una rama compartida por dos mallas es la diferencia entre las corrientes de ambas mallas.");
  return {
    results: I.map((i, k) => ({ label: `Corriente de la malla ${k + 1}`, value: eng(i, "A", 6), text: `I${k + 1} = ${eng(i, "A", 6)}` })),
    blocks: [{ type: "table", caption: "Corrientes de las ramas (positivas en el sentido de giro de la malla 1)", head: ["Rama", "Corriente", "Valor", "Tensión en la resistencia", "Potencia en la resistencia"], rows }],
    steps, copy: I.map((i, k) => `I${k + 1} = ${eng(i, "A", 6)}`).join("\n")
  };
}
