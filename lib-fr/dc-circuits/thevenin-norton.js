import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseNetlist, solveMNA, nodesOf } from "../core/circuit.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { NETLIST_HELP } from "./nodal-analysis.js";

export const meta = {
  description: "Calculez les équivalents de Thévenin et de Norton entre deux points quelconques d'un circuit en courant continu : tension en circuit ouvert, résistance équivalente après extinction des sources, et courant de court-circuit, avec vérification par une charge facultative.",
  keywords: ["Thévenin", "Norton", "thevenin", "norton", "Équivalent", "Tension en circuit ouvert", "Courant de court-circuit"],
  formulas: [
    { label: "Définitions", tex: "V_{th} = V_{oc},\\quad R_{th} = \\left.\\frac{V_{ab}}{I_{test}}\\right|_{\\text{sources off}},\\quad I_N = \\frac{V_{th}}{R_{th}}" },
    { label: "Courant de charge à partir de l'équivalent", tex: "I_L = \\frac{V_{th}}{R_{th} + R_L}" }
  ],
  inputs: [
    { id: "net", label: "Éléments du circuit", type: "textarea", rows: 5, default: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", help: NETLIST_HELP },
    { id: "a", label: "Borne a", type: "text", default: "3" },
    { id: "b", label: "Borne b", type: "text", default: "0" },
    { id: "RL", label: "Résistance de charge pour vérification (facultatif)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { net: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", a: "3", b: "0", RL: "4" }, expect: ["Vth = 8 V", "Rth = 4 Ω"], note: "Exemple écrit : source de 24 V avec un diviseur de 6 Ω et 3 Ω et une résistance de 2 Ω vers la borne." },
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
  const els = parseNetlist(str(input, "net", "Éléments du circuit"), "net");
  const a = norm(str(input, "a", "Borne a").trim()), b = norm(str(input, "b", "Borne b").trim());
  const nodes = ["0", ...nodesOf(els)];
  if (!nodes.includes(a)) fail(`Le nœud «${a}» n'existe pas dans le circuit.`, "a");
  if (!nodes.includes(b)) fail(`Le nœud «${b}» n'existe pas dans le circuit.`, "b");
  if (a === b) fail("Les deux bornes doivent être deux nœuds différents.", "b");
  const RL = num(input, "RL", "Résistance de charge", { optional: true, positive: true });
  let r;
  try { r = thevenin(els, a, b); } catch (e) {
    if (e.name === "InputError") fail(`${e.message} (lors de l'extinction des sources ou de l'injection du courant d'essai, le circuit peut être séparé).`, "net");
    throw e;
  }
  const { Voc, Rth } = r;
  const steps = [
    { text: "Étape 1 : on résout le circuit tel quel (bornes ouvertes) par analyse nodale et on lit la tension entre elles :", tex: `V_{th} = V_{${a}} - V_{${b}} = ${ntex(Voc, 6)}\\ V` },
    { text: "Étape 2 : on éteint les sources indépendantes (la source de tension devient un court-circuit et la source de courant devient un circuit ouvert), on injecte un courant d'essai de 1 A entre les bornes et on mesure la tension :", tex: `R_{th} = \\frac{V_{test}}{1\\,A} = ${ntex(Rth, 6)}\\ \\Omega` }
  ];
  const results = [{ label: "Tension de Thévenin Vth", value: eng(Voc, "V", 5), text: `Vth = ${eng(Voc, "V", 5)}` }, { label: "Résistance de Thévenin Rth", value: eng(Rth, "Ω", 5), text: `Rth = ${eng(Rth, "Ω", 5)}` }];
  if (Math.abs(Rth) > 1e-12) {
    const In = Voc / Rth;
    results.push({ label: "Courant de Norton IN", value: eng(In, "A", 5) }, { label: "Résistance de Norton RN", value: eng(Rth, "Ω", 5) });
    steps.push({ text: "Étape 3 : équivalent de Norton par la transformation entre les deux sources :", tex: `I_N = \\frac{V_{th}}{R_{th}} = ${ntex(In, 6)}\\ A,\\quad R_N = R_{th}` });
  } else steps.push("Résistance de Thévenin nulle : l'équivalent est une source de tension idéale et il n'existe pas d'équivalent de Norton.");
  if (RL !== null) {
    const IL = Voc / (Rth + RL);
    const full = solveMNA([...els, { name: "RLOAD", kind: "R", a, b, value: RL }], "net");
    const ILfull = (full.V[a] - full.V[b]) / RL;
    results.push({ label: `Courant de charge ${eng(RL, "Ω")}`, value: eng(IL, "A", 5) }, { label: "Tension de charge", value: eng(IL * RL, "V", 5) });
    steps.push({ text: "Vérification : on branche la charge sur l'équivalent, puis directement sur le circuit d'origine :", tex: `I_L = \\frac{${ntex(Voc, 6)}}{${ntex(Rth, 6)} + ${ntex(RL)}} = ${ntex(IL, 6)}\\ A\\quad\\text{vs}\\quad ${ntex(ILfull, 6)}\\ A` });
    steps.push(Math.abs(IL - ILfull) <= 1e-9 * Math.max(1, Math.abs(IL)) ? "Les deux résultats sont identiques, donc l'équivalent est correct." : `Écart inattendu ${fmt(IL - ILfull, 3)}.`);
  }
  return { results, steps, copy: `Vth = ${eng(Voc, "V", 5)}, Rth = ${eng(Rth, "Ω", 5)}` };
}
