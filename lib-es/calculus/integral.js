import { integrate, simplify } from "../core/symbolic.js";
import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex, niceTex, nice } from "../core/format.js";
import { integrateNumeric, sampleFunction } from "../core/numeric.js";
import { readVar, readExpr, f1, toTex, toText } from "./common.js";

export const meta = {
  description: "Calcula la integral indefinida y definida de cualquier función: solución simbólica con los pasos cuando es confiable, y un valor numérico preciso y claramente identificado cuando no hay solución simbólica.",
  intro: "La integración simbólica admite potencias, funciones trigonométricas, exponenciales y logarítmicas, sustitución, integración por partes y fracciones parciales. Cada resultado simbólico se verifica numéricamente antes de mostrarse.",
  keywords: ["integral", "integral", "integral definida", "integral indefinida", "área bajo la curva", "integración por partes", "sustitución"],
  formulas: [
    { label: "Integral indefinida y definida", tex: "\\int f(x)\\,dx = F(x) + C, \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)" },
    { label: "Regla de la potencia y por partes", tex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C,\\qquad \\int u\\,dv = uv - \\int v\\,du" }
  ],
  inputs: [
    { id: "f", label: "Función a integrar", type: "expr", placeholder: "x e^x", help: "p. ej.: x^2 sin(x), 1/(x^2+1), e^(2x), ln(x)" },
    { id: "v", label: "Variable", type: "text", default: "x" },
    { id: "mode", label: "Tipo de integral", type: "select", default: "indefinite", options: [["indefinite", "Indefinida"], ["definite", "Definida"]] },
    { id: "a", label: "Límite inferior a", type: "number", when: { mode: ["definite"] }, help: "Se puede escribir inf o -inf" },
    { id: "b", label: "Límite superior b", type: "number", when: { mode: ["definite"] } }
  ],
  example: { values: { f: "x e^x", v: "x", mode: "definite", a: "0", b: "1" }, expect: ["= 1"], note: "Ejemplo: $\\int_0^1 x e^x\\,dx$ por partes, con resultado 1." },
  invalid: { values: { f: "sin(x", mode: "indefinite" } },
  related: ["derivative", "function-plotter", "laplace", "partial-fractions"]
};

export function solve(input) {
  const v = readVar(input);
  const f = simplify(readExpr(input, "f", v));
  const mode = choice(input, "mode", "Tipo de integral", ["indefinite", "definite"], "indefinite");
  const steps = [{ text: "Función tras simplificar:", tex: `f(${v}) = ${toTex(f)}` }];
  const blocks = [];
  const sym = integrate(f, v);
  if (sym) {
    for (const s of sym.steps) steps.push({ text: s.rule, tex: s.tex });
    steps.push(`Comprobamos el resultado derivándolo numéricamente y comparándolo con la función original en varios puntos.`);
  }
  if (mode === "indefinite") {
    if (!sym) {
      blocks.push({ type: "note", tone: "warn", text: "No encontramos una integral simbólica confiable para esta función con las reglas admitidas. Puede que no tenga integral en funciones elementales (como $e^{x^2}$). Prueba con la integral definida para obtener un valor numérico." });
      return { results: [{ label: "Integral indefinida", value: "No disponible simbólicamente" }], steps, blocks, copy: "La integral indefinida no está disponible simbólicamente" };
    }
    return {
      results: [{ label: "Integral indefinida", tex: `\\int ${toTex(f)}\\,d${v} = ${toTex(sym.result)} + C`, text: `${toText(sym.result)} + C` }],
      steps, blocks, copy: `∫ ${toText(f)} d${v} = ${toText(sym.result)} + C`
    };
  }
  const a = num(input, "a", "Límite inferior", { allowInfinity: true });
  const b = num(input, "b", "Límite superior", { allowInfinity: true });
  if (a === b) fail("Los dos límites son iguales, así que la integral vale cero. Introduce dos límites distintos.", "b");
  const F = f1(f, v);
  const numeric = integrateNumeric(F, a, b, { tol: 1e-11 });
  let exact = null;
  if (sym && isFinite(a) && isFinite(b)) {
    const G = f1(sym.result, v);
    const Fa = G(a), Fb = G(b);
    const pts = sampleFunction(F, Math.min(a, b), Math.max(a, b), 401);
    const continuous = pts.every(([, y]) => y !== null);
    const val = Fb - Fa;
    if (continuous && isFinite(val) && numeric.ok && Math.abs(val - numeric.value) <= 1e-6 * Math.max(1, Math.abs(val))) {
      exact = val;
      steps.push({ text: `Aplicamos el teorema fundamental del cálculo: $F(b) - F(a)$`, tex: `F(${ntex(b)}) - F(${ntex(a)}) = ${ntex(Fb, 10)} - (${ntex(Fa, 10)}) = ${ntex(val, 10)}` });
    } else if (!continuous) {
      blocks.push({ type: "note", tone: "warn", text: "La función no está definida en un punto dentro del intervalo de integración, por lo que no se puede aplicar $F(b)-F(a)$ directamente." });
    }
  }
  const results = [];
  if (exact !== null) {
    const shown = Math.abs(exact - Math.round(exact)) < 1e-10 ? Math.round(exact) : exact;
    results.push({ label: "Valor de la integral definida", tex: `\\int_{${ntex(a)}}^{${ntex(b)}} ${toTex(f)}\\,d${v} = ${niceTex(shown, 10)}`, text: `= ${nice(shown, 10)}` });
    results.push({ label: "Valor decimal", value: exact, sig: 12 });
  } else {
    if (!numeric.ok || !isFinite(numeric.value)) {
      blocks.push({ type: "note", tone: "warn", text: "La integral no converge o la función no está acotada en el intervalo, así que no se puede dar un valor confiable." });
      return { results: [{ label: "Valor de la integral definida", value: "No convergente o no definida" }], steps, blocks, copy: "La integral no converge" };
    }
    results.push({ label: "Valor de la integral definida (aproximación numérica)", value: numeric.value, sig: 10, text: `≈ ${fmt(numeric.value, 10)}` });
    results.push({ label: "Estimación del error numérico", value: numeric.error, sig: 2 });
    steps.push(`Calculamos el valor numéricamente con la cuadratura adaptativa de Gauss-Kronrod (15 puntos), dividiendo el intervalo en ${numeric.intervals} partes.`);
    if (!isFinite(a) || !isFinite(b)) steps.push("Para los límites infinitos usamos un cambio de variable que vuelve acotado el intervalo antes de integrar numéricamente.");
    blocks.push({ type: "note", text: "Este es un valor numérico aproximado y no un resultado simbólico." });
  }
  if (isFinite(a) && isFinite(b)) {
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    blocks.push({ type: "plot", title: `Gráfica de la función con los límites de integración`, xLabel: v, yLabel: `f(${v})`, series: [{ name: `f(${v})`, points: sampleFunction(F, lo - pad, hi + pad, 400) }], vlines: [{ x: lo }, { x: hi }] });
  }
  const copyVal = exact !== null ? nice(exact, 10) : `≈ ${fmt(numeric.value, 10)}`;
  return { results, steps, blocks, copy: `∫ desde ${fmt(a)} hasta ${fmt(b)} de ${toText(f)} d${v} = ${copyVal}` };
}
