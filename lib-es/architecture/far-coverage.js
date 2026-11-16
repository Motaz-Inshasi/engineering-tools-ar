import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const EPS = 1e-9;

export const meta = {
  description: "Calcule el coeficiente de ocupación, el índice de edificabilidad (FAR) y el área libre de un terreno, compruebe las condiciones de construcción y calcule la huella máxima, el área total máxima y el número máximo de plantas permitidas.",
  keywords: ["coeficiente de ocupación", "índice de edificabilidad", "FAR", "coverage", "condiciones de construcción", "área libre", "plantas"],
  formulas: [
    { label: "coeficiente de ocupación", tex: "C = \\frac{A_{f}}{A_{p}} \\times 100" },
    { label: "índice de edificabilidad", tex: "FAR = \\frac{A_{total}}{A_{p}}" },
    { label: "Área total construida", tex: "A_{total} = A_{f} \\times N" }
  ],
  inputs: [
    { id: "plot", label: "Área del terreno", unit: "m²", type: "number", default: "500" },
    { id: "footprint", label: "Área de la planta baja (huella)", unit: "m²", type: "number", default: "300" },
    { id: "mode", label: "Método para calcular el área total", type: "select", default: "floors", options: [["floors", "Número de plantas"], ["area", "Área total"]] },
    { id: "floors", label: "Número de plantas", type: "number", default: "4", when: { mode: ["floors"] }, help: "Se supone que todas las plantas tienen la misma superficie que la huella." },
    { id: "totalArea", label: "Área total construida", unit: "m²", type: "number", when: { mode: ["area"] } },
    { id: "maxCov", label: "Coeficiente de ocupación máximo permitido", unit: "%", type: "number", help: "Opcional." },
    { id: "maxFar", label: "Índice de edificabilidad máximo permitido", type: "number", help: "Opcional." }
  ],
  example: { values: { plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "60", maxFar: "2.5" }, expect: ["60%", "2.4"], note: "Ejemplo: terreno de 500 m², huella de 300 m² y 4 plantas." },
  invalid: { values: { plot: "500", footprint: "600", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "" } },
  related: ["polygon-area", "stair-design"]
};

export function solve(input) {
  const P = num(input, "plot", "Área del terreno", { positive: true });
  const F = num(input, "footprint", "Área de la planta baja", { positive: true });
  if (F > P) fail("La huella no puede superar el área del terreno.", "footprint");
  const mode = choice(input, "mode", "Método de cálculo", ["floors", "area"], "floors");
  let total, floors = null;
  if (mode === "floors") {
    floors = num(input, "floors", "Número de plantas", { integer: true, min: 1, max: 200 });
    total = F * floors;
  } else {
    total = num(input, "totalArea", "Área total construida", { positive: true });
  }
  const maxCov = num(input, "maxCov", "Coeficiente de ocupación máximo permitido", { positive: true, max: 100, optional: true });
  const maxFar = num(input, "maxFar", "Índice de edificabilidad máximo permitido", { positive: true, optional: true });
  const cov = (F * 100) / P;
  const far = total / P;
  const open = P - F;
  const openPct = (open * 100) / P;
  const covOk = maxCov === null || cov <= maxCov + EPS;
  const farOk = maxFar === null || far <= maxFar + EPS;
  const maxFootprint = maxCov === null ? null : (maxCov / 100) * P;
  const maxTotal = maxFar === null ? null : maxFar * P;
  const maxFloors = maxTotal === null ? null : Math.floor(maxTotal / F + EPS);
  const issues = [];
  if (!covOk) issues.push(`La ocupación supera el límite en ${fmt(cov - maxCov, 4)}%`);
  if (!farOk) issues.push(`El índice de edificabilidad supera el límite en ${fmt(far - maxFar, 4)}`);
  const verdict = issues.length === 0 ? "Cumple las condiciones" : `No cumple: ${issues.join("، ")}`;
  const judge = (ok, limit) => (limit === null ? "Sin límite" : ok ? "Cumple" : "No cumple");
  const steps = [
    { text: "Coeficiente de ocupación:", tex: `C = \\frac{${ntex(F, 6)}}{${ntex(P, 6)}} \\times 100 = ${ntex(cov, 6)}\\ \\%` },
    { text: "Área total construida:", tex: mode === "floors" ? `A_{total} = ${ntex(F, 6)} \\times ${ntex(floors, 6)} = ${ntex(total, 6)}\\ m^2` : `A_{total} = ${ntex(total, 6)}\\ m^2` },
    { text: "Índice de edificabilidad:", tex: `FAR = \\frac{${ntex(total, 6)}}{${ntex(P, 6)}} = ${ntex(far, 6)}` },
    { text: "Área libre:", tex: `A_{open} = ${ntex(P, 6)} - ${ntex(F, 6)} = ${ntex(open, 6)}\\ m^2` }
  ];
  const rows = [
    ["coeficiente de ocupación", `${fmt(cov, 4)}%`, maxCov === null ? "Sin límite" : `≤ ${fmt(maxCov)}%`, judge(covOk, maxCov)],
    ["Índice de edificabilidad (FAR)", fmt(far, 4), maxFar === null ? "Sin límite" : `≤ ${fmt(maxFar)}`, judge(farOk, maxFar)]
  ];
  const results = [
    { label: "coeficiente de ocupación", value: `${fmt(cov, 4)}%`, text: `Ocupación ${fmt(cov, 4)}%` },
    { label: "Área total construida", value: `${fmt(total, 6)} m²` },
    { label: "Índice de edificabilidad (FAR)", value: fmt(far, 4), text: `FAR = ${fmt(far, 4)}` },
    { label: "Área libre", value: `${fmt(open, 4)} m² (${fmt(openPct, 4)}%)` }
  ];
  if (maxFootprint !== null) results.push({ label: "Huella máxima permitida", value: `${fmt(maxFootprint, 6)} m²` });
  if (maxTotal !== null) {
    results.push({ label: "Área total máxima permitida", value: `${fmt(maxTotal, 6)} m²` });
    results.push({ label: "Número máximo de plantas según el FAR", value: `${fmt(maxFloors)}` });
  }
  results.push({ label: "Veredicto", value: verdict });
  return {
    results,
    steps,
    blocks: [{ type: "table", caption: "Comparación con las condiciones", head: ["Indicador", "Valor", "Límite permitido", "Veredicto"], rows }],
    copy: `Ocupación ${fmt(cov, 4)}%, FAR = ${fmt(far, 4)}, área libre ${fmt(open, 4)} m², veredicto: ${verdict}`,
    values: { cov, far, open, total, covOk, farOk, maxFootprint, maxTotal, maxFloors }
  };
}
