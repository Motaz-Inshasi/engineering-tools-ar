import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const EPS = 1e-9;

export const meta = {
  description: "Calculez le taux d'emprise au sol, le coefficient d'occupation du sol (FAR) et la surface libre d'une parcelle, vérifiez les prescriptions de construction, puis calculez l'emprise maximale, la surface totale maximale et le nombre maximal d'étages autorisés.",
  keywords: ["taux d'emprise au sol", "coefficient d'occupation du sol", "FAR", "coverage", "prescriptions de construction", "surface libre", "étages"],
  formulas: [
    { label: "taux d'emprise au sol", tex: "C = \\frac{A_{f}}{A_{p}} \\times 100" },
    { label: "coefficient d'occupation du sol", tex: "FAR = \\frac{A_{total}}{A_{p}}" },
    { label: "Surface totale bâtie", tex: "A_{total} = A_{f} \\times N" }
  ],
  inputs: [
    { id: "plot", label: "Surface de la parcelle", unit: "m²", type: "number", default: "500" },
    { id: "footprint", label: "Surface du rez-de-chaussée (emprise)", unit: "m²", type: "number", default: "300" },
    { id: "mode", label: "Mode de calcul de la surface totale", type: "select", default: "floors", options: [["floors", "Nombre d'étages"], ["area", "Surface totale"]] },
    { id: "floors", label: "Nombre d'étages", type: "number", default: "4", when: { mode: ["floors"] }, help: "On suppose que tous les étages ont la même surface que l'emprise." },
    { id: "totalArea", label: "Surface totale bâtie", unit: "m²", type: "number", when: { mode: ["area"] } },
    { id: "maxCov", label: "Taux d'emprise maximal autorisé", unit: "%", type: "number", help: "Facultatif." },
    { id: "maxFar", label: "FAR maximal autorisé", type: "number", help: "Facultatif." }
  ],
  example: { values: { plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "60", maxFar: "2.5" }, expect: ["60%", "2.4"], note: "Exemple : parcelle de 500 m², emprise de 300 m² et 4 étages." },
  invalid: { values: { plot: "500", footprint: "600", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "" } },
  related: ["polygon-area", "stair-design"]
};

export function solve(input) {
  const P = num(input, "plot", "Surface de la parcelle", { positive: true });
  const F = num(input, "footprint", "Surface du rez-de-chaussée", { positive: true });
  if (F > P) fail("La surface de l'emprise ne peut pas dépasser la surface de la parcelle.", "footprint");
  const mode = choice(input, "mode", "Méthode de calcul", ["floors", "area"], "floors");
  let total, floors = null;
  if (mode === "floors") {
    floors = num(input, "floors", "Nombre d'étages", { integer: true, min: 1, max: 200 });
    total = F * floors;
  } else {
    total = num(input, "totalArea", "Surface totale bâtie", { positive: true });
  }
  const maxCov = num(input, "maxCov", "Taux d'emprise maximal autorisé", { positive: true, max: 100, optional: true });
  const maxFar = num(input, "maxFar", "FAR maximal autorisé", { positive: true, optional: true });
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
  if (!covOk) issues.push(`L'emprise dépasse la limite de ${fmt(cov - maxCov, 4)}%`);
  if (!farOk) issues.push(`Le FAR dépasse la limite de ${fmt(far - maxFar, 4)}`);
  const verdict = issues.length === 0 ? "Conforme aux prescriptions" : `Non conforme : ${issues.join("، ")}`;
  const judge = (ok, limit) => (limit === null ? "Sans limite" : ok ? "Conforme" : "Non conforme");
  const steps = [
    { text: "Taux d'emprise :", tex: `C = \\frac{${ntex(F, 6)}}{${ntex(P, 6)}} \\times 100 = ${ntex(cov, 6)}\\ \\%` },
    { text: "Surface totale bâtie :", tex: mode === "floors" ? `A_{total} = ${ntex(F, 6)} \\times ${ntex(floors, 6)} = ${ntex(total, 6)}\\ m^2` : `A_{total} = ${ntex(total, 6)}\\ m^2` },
    { text: "Coefficient d'occupation du sol :", tex: `FAR = \\frac{${ntex(total, 6)}}{${ntex(P, 6)}} = ${ntex(far, 6)}` },
    { text: "Surface libre :", tex: `A_{open} = ${ntex(P, 6)} - ${ntex(F, 6)} = ${ntex(open, 6)}\\ m^2` }
  ];
  const rows = [
    ["taux d'emprise au sol", `${fmt(cov, 4)}%`, maxCov === null ? "Sans limite" : `≤ ${fmt(maxCov)}%`, judge(covOk, maxCov)],
    ["Coefficient d'occupation du sol (FAR)", fmt(far, 4), maxFar === null ? "Sans limite" : `≤ ${fmt(maxFar)}`, judge(farOk, maxFar)]
  ];
  const results = [
    { label: "taux d'emprise au sol", value: `${fmt(cov, 4)}%`, text: `Emprise ${fmt(cov, 4)}%` },
    { label: "Surface totale bâtie", value: `${fmt(total, 6)} m²` },
    { label: "Coefficient d'occupation du sol (FAR)", value: fmt(far, 4), text: `FAR = ${fmt(far, 4)}` },
    { label: "Surface libre", value: `${fmt(open, 4)} m² (${fmt(openPct, 4)}%)` }
  ];
  if (maxFootprint !== null) results.push({ label: "Emprise maximale autorisée", value: `${fmt(maxFootprint, 6)} m²` });
  if (maxTotal !== null) {
    results.push({ label: "Surface totale maximale autorisée", value: `${fmt(maxTotal, 6)} m²` });
    results.push({ label: "Nombre maximal d'étages selon le FAR", value: `${fmt(maxFloors)}` });
  }
  results.push({ label: "Verdict", value: verdict });
  return {
    results,
    steps,
    blocks: [{ type: "table", caption: "Comparaison avec les prescriptions", head: ["Indicateur", "Valeur", "Limite autorisée", "Verdict"], rows }],
    copy: `Emprise ${fmt(cov, 4)}%, FAR = ${fmt(far, 4)}, surface libre ${fmt(open, 4)} m², verdict : ${verdict}`,
    values: { cov, far, open, total, covOk, farOk, maxFootprint, maxTotal, maxFloors }
  };
}
