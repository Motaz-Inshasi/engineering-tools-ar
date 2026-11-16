import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseNetlist, solveMNA, nodesOf } from "../core/circuit.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { NETLIST_HELP } from "./nodal-analysis.js";

export const meta = {
  description: "Calcule el equivalente de Thévenin y de Norton entre dos puntos de un circuito de corriente continua: tensión de circuito abierto, resistencia equivalente con las fuentes anuladas y corriente de cortocircuito, con comprobación mediante una carga opcional.",
  keywords: ["Thévenin", "Norton", "thevenin", "norton", "equivalente", "Tensión de circuito abierto", "Corriente de cortocircuito"],
  formulas: [
    { label: "Definiciones", tex: "V_{th} = V_{oc},\\quad R_{th} = \\left.\\frac{V_{ab}}{I_{test}}\\right|_{\\text{sources off}},\\quad I_N = \\frac{V_{th}}{R_{th}}" },
    { label: "Corriente de carga a partir del equivalente", tex: "I_L = \\frac{V_{th}}{R_{th} + R_L}" }
  ],
  inputs: [
    { id: "net", label: "Elementos del circuito", type: "textarea", rows: 5, default: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", help: NETLIST_HELP },
    { id: "a", label: "Terminal a", type: "text", default: "3" },
    { id: "b", label: "Terminal b", type: "text", default: "0" },
    { id: "RL", label: "Resistencia de carga para comprobar (opcional)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { net: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", a: "3", b: "0", RL: "4" }, expect: ["Vth = 8 V", "Rth = 4 Ω"], note: "Ejemplo escrito: fuente de 24 V con un divisor de 6 Ω y 3 Ω y una resistencia de 2 Ω hacia el terminal." },
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
  const els = parseNetlist(str(input, "net", "Elementos del circuito"), "net");
  const a = norm(str(input, "a", "Terminal a").trim()), b = norm(str(input, "b", "Terminal b").trim());
  const nodes = ["0", ...nodesOf(els)];
  if (!nodes.includes(a)) fail(`El nodo «${a}» no existe en el circuito.`, "a");
  if (!nodes.includes(b)) fail(`El nodo «${b}» no existe en el circuito.`, "b");
  if (a === b) fail("Los dos terminales deben ser nodos distintos.", "b");
  const RL = num(input, "RL", "Resistencia de carga", { optional: true, positive: true });
  let r;
  try { r = thevenin(els, a, b); } catch (e) {
    if (e.name === "InputError") fail(`${e.message} (al anular las fuentes o inyectar la corriente de prueba, el circuito puede quedar separado).`, "net");
    throw e;
  }
  const { Voc, Rth } = r;
  const steps = [
    { text: "Paso 1: resolvemos el circuito tal cual está (terminales abiertos) por análisis nodal y leemos la tensión entre ellos:", tex: `V_{th} = V_{${a}} - V_{${b}} = ${ntex(Voc, 6)}\\ V` },
    { text: "Paso 2: anulamos las fuentes independientes (la de tensión pasa a cortocircuito y la de corriente a circuito abierto), inyectamos una corriente de prueba de 1 A entre los terminales y medimos la tensión:", tex: `R_{th} = \\frac{V_{test}}{1\\,A} = ${ntex(Rth, 6)}\\ \\Omega` }
  ];
  const results = [{ label: "Tensión de Thévenin Vth", value: eng(Voc, "V", 5), text: `Vth = ${eng(Voc, "V", 5)}` }, { label: "Resistencia de Thévenin Rth", value: eng(Rth, "Ω", 5), text: `Rth = ${eng(Rth, "Ω", 5)}` }];
  if (Math.abs(Rth) > 1e-12) {
    const In = Voc / Rth;
    results.push({ label: "Corriente de Norton IN", value: eng(In, "A", 5) }, { label: "Resistencia de Norton RN", value: eng(Rth, "Ω", 5) });
    steps.push({ text: "Paso 3: equivalente de Norton mediante la transformación entre fuentes:", tex: `I_N = \\frac{V_{th}}{R_{th}} = ${ntex(In, 6)}\\ A,\\quad R_N = R_{th}` });
  } else steps.push("La resistencia de Thévenin es cero, por lo que el equivalente es una fuente de tensión ideal y no existe equivalente de Norton.");
  if (RL !== null) {
    const IL = Voc / (Rth + RL);
    const full = solveMNA([...els, { name: "RLOAD", kind: "R", a, b, value: RL }], "net");
    const ILfull = (full.V[a] - full.V[b]) / RL;
    results.push({ label: `Corriente de carga ${eng(RL, "Ω")}`, value: eng(IL, "A", 5) }, { label: "Tensión de carga", value: eng(IL * RL, "V", 5) });
    steps.push({ text: "Comprobación: conectamos la carga al equivalente y luego al circuito original directamente:", tex: `I_L = \\frac{${ntex(Voc, 6)}}{${ntex(Rth, 6)} + ${ntex(RL)}} = ${ntex(IL, 6)}\\ A\\quad\\text{vs}\\quad ${ntex(ILfull, 6)}\\ A` });
    steps.push(Math.abs(IL - ILfull) <= 1e-9 * Math.max(1, Math.abs(IL)) ? "Los dos resultados coinciden, por lo que el equivalente es correcto." : `Diferencia inesperada ${fmt(IL - ILfull, 3)}.`);
  }
  return { results, steps, copy: `Vth = ${eng(Voc, "V", 5)}, Rth = ${eng(Rth, "Ω", 5)}` };
}
