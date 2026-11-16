import { choice, numList, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["inv", "Inversor"], ["noninv", "No inversor"], ["sum", "Sumador inversor"], ["diff", "Diferencial (restador)"], ["integ", "Integrador"], ["deriv", "Derivador"]];

export const meta = {
  description: "Calcula la ganancia de un amplificador operacional ideal en los circuitos habituales: inversor, no inversor, sumador, restador, integrador y derivador, con la tensión de salida y una advertencia de saturación al superar la tensión de alimentación.",
  keywords: ["Amplificador operacional", "op-amp", "Op-amp", "Amplificador inversor", "Amplificador no inversor", "Sumador", "Integrador", "Derivador", "Ganancia"],
  formulas: [
    { label: "Inversor y no inversor", tex: "A_{inv} = -\\frac{R_f}{R_{in}},\\qquad A_{non} = 1 + \\frac{R_f}{R_{in}}" },
    { label: "Sumador, integrador y derivador (para señal senoidal)", tex: "V_o = -R_f\\sum\\frac{V_i}{R_i},\\qquad |A_{int}| = \\frac{1}{\\omega RC},\\qquad |A_{diff}| = \\omega RC" }
  ],
  inputs: [
    { id: "cfg", label: "Circuito", type: "select", default: "inv", options: CFG },
    { id: "Rf", label: "Resistencia de realimentación Rf", unit: "Ω", type: "number", default: "100k", when: { cfg: ["inv", "noninv", "sum", "diff"] } },
    { id: "Rin", label: "Resistencia de entrada Rin", unit: "Ω", type: "number", default: "10k", when: { cfg: ["inv", "noninv", "diff"] } },
    { id: "Vin", label: "Tensión de entrada Vin", unit: "V", type: "number", default: "0.5", when: { cfg: ["inv", "noninv", "integ", "deriv"] }, help: "Para integrador y derivador: amplitud de la señal senoidal." },
    { id: "V2", label: "Tensión de entrada 2, V2 (se le resta V1 = Vin)", unit: "V", type: "number", default: "1", when: { cfg: ["diff"] } },
    { id: "V1d", label: "Tensión de entrada V1", unit: "V", type: "number", default: "0.5", when: { cfg: ["diff"] } },
    { id: "Rs", label: "Resistencias de entrada del sumador", unit: "Ω", type: "text", default: "10k, 20k, 50k", when: { cfg: ["sum"] } },
    { id: "Vs", label: "Tensiones de entrada del sumador", unit: "V", type: "text", default: "1, 0.5, -2", when: { cfg: ["sum"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k", when: { cfg: ["integ", "deriv"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "10n", when: { cfg: ["integ", "deriv"] } },
    { id: "f", label: "Frecuencia de la señal", unit: "Hz", type: "number", default: "1k", when: { cfg: ["integ", "deriv"] } },
    { id: "Vsat", label: "Tensión de alimentación ±Vcc", unit: "V", type: "number", default: "15" }
  ],
  example: { values: { cfg: "inv", Rf: "100k", Rin: "10k", Vin: "0.5", Vsat: "15" }, expect: ["A = -10", "Vout = -5 V"], note: "Ejemplo: amplificador inversor con ganancia −10 y entrada de 0.5 V." },
  invalid: { values: { cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" } },
  related: ["bjt-bias", "passive-filter", "adc", "sensor-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "Circuito", CFG.map((c) => c[0]), "inv");
  const Vsat = num(input, "Vsat", "Tensión de alimentación", { positive: true });
  const steps = ["Suponemos un amplificador ideal: ganancia infinita, no circula corriente por las entradas y sus tensiones son iguales (cortocircuito virtual)."];
  let A = null, Vout, gainText;
  if (cfg === "inv" || cfg === "noninv") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true }), Vin = num(input, "Vin", "Vin");
    A = cfg === "inv" ? -Rf / Rin : 1 + Rf / Rin;
    Vout = A * Vin;
    steps.push({ text: cfg === "inv" ? "La entrada inversora está a tierra virtual, así que toda la corriente de entrada pasa por Rf:" : "La tensión de la entrada inversora es igual a Vin, y Rf y Rin forman un divisor con la salida:", tex: cfg === "inv" ? `A = -\\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` : `A = 1 + \\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` });
    steps.push({ tex: `V_{out} = A V_{in} = ${ntex(A, 6)} \\times ${ntex(Vin)} = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else if (cfg === "sum") {
    const Rf = num(input, "Rf", "Rf", { positive: true });
    const Rs = numList(input, "Rs", "Resistencias de entrada", { positive: true, max: 10 });
    const Vs = numList(input, "Vs", "Tensiones de entrada", { max: 10 });
    if (Rs.length !== Vs.length) fail(`El número de resistencias (${Rs.length}) debe ser igual al número de tensiones (${Vs.length}).`, "Vs");
    Vout = -Rf * Rs.reduce((s, r, i) => s + Vs[i] / r, 0);
    steps.push({ text: "Las corrientes de entrada se suman en la tierra virtual y pasan por Rf:", tex: `V_{out} = -${ntex(Rf)}\\left(${Rs.map((r, i) => `\\frac{${ntex(Vs[i])}}{${ntex(r)}}`).join(" + ")}\\right) = ${ntex(Vout, 6)}\\ V` });
    gainText = Rs.map((r, i) => `A${i + 1} = ${fmt(-Rf / r, 5)}`).join(", ");
  } else if (cfg === "diff") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true });
    const V1 = num(input, "V1d", "V1"), V2 = num(input, "V2", "V2");
    A = Rf / Rin;
    Vout = A * (V2 - V1);
    steps.push({ text: "Con resistencias idénticas (Rf/Rin en ambos lados) solo amplifica la diferencia:", tex: `V_{out} = \\frac{R_f}{R_{in}}(V_2 - V_1) = ${ntex(A, 6)}(${ntex(V2)} - ${ntex(V1)}) = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else {
    const R = num(input, "R", "R", { positive: true }), C = num(input, "C", "C", { positive: true }), f = num(input, "f", "Frecuencia", { positive: true }), Vin = num(input, "Vin", "Vin");
    const w = 2 * Math.PI * f, wc = 1 / (R * C);
    A = cfg === "integ" ? 1 / (w * R * C) : w * R * C;
    Vout = A * Vin;
    steps.push(cfg === "integ"
      ? { text: "Integrador: $v_o = -\\frac{1}{RC}\\int v_i\\,dt$; para una señal senoidal, la ganancia es:", tex: `|A| = \\frac{1}{\\omega RC} = \\frac{1}{${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)}} = ${ntex(A, 5)},\\ \\text{phase } +90^\\circ` }
      : { text: "Derivador: $v_o = -RC\\frac{dv_i}{dt}$; para una señal senoidal, la ganancia es:", tex: `|A| = \\omega RC = ${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)} = ${ntex(A, 5)},\\ \\text{phase } -90^\\circ` });
    steps.push(`A la frecuencia ${eng(wc / (2 * Math.PI), "Hz", 4)} la ganancia vale 1. ${cfg === "integ" ? "En la práctica se añade una resistencia en paralelo con el condensador para evitar la saturación por tensión continua." : "En la práctica se añade una resistencia en serie con el condensador para reducir el ruido de alta frecuencia."}`);
    gainText = `|A| = ${fmt(A, 5)}`;
  }
  const sat = Math.abs(Vout) > Vsat;
  if (sat) steps.push(`Advertencia: la salida calculada ${fmt(Vout, 4)} V supera la tensión de alimentación ±${fmt(Vsat)} V, así que la salida real se saturará en torno a ${fmt(Math.sign(Vout) * Vsat, 3)} V.`);
  const results = [];
  if (A !== null) results.push({ label: "Ganancia", value: A, sig: 6, text: gainText }, { label: "Ganancia en decibelios", value: `${fmt(20 * Math.log10(Math.abs(A)), 4)} dB` });
  else results.push({ label: "Ganancia por entrada", value: gainText });
  results.push({ label: cfg === "integ" || cfg === "deriv" ? "Amplitud de salida" : "Tensión de salida", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Estado", value: sat ? "Saturación (salida recortada)" : "Dentro del rango lineal" });
  return { results, steps, copy: `${gainText}, Vout = ${eng(Vout, "V", 4)}${sat ? " (saturated)" : ""}` };
}
