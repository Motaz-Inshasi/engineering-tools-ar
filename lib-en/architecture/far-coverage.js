import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const EPS = 1e-9;

export const meta = {
  description: "Calculate the coverage ratio, floor area ratio (FAR) and open area of a plot of land, check the building regulations, and compute the maximum footprint, maximum total area and maximum number of floors allowed.",
  keywords: ["coverage ratio", "floor area ratio", "FAR", "coverage", "building regulations", "open area", "floors"],
  formulas: [
    { label: "coverage ratio", tex: "C = \\frac{A_{f}}{A_{p}} \\times 100" },
    { label: "floor area ratio", tex: "FAR = \\frac{A_{total}}{A_{p}}" },
    { label: "Total building area", tex: "A_{total} = A_{f} \\times N" }
  ],
  inputs: [
    { id: "plot", label: "Plot area", unit: "m²", type: "number", default: "500" },
    { id: "footprint", label: "Ground floor area (footprint)", unit: "m²", type: "number", default: "300" },
    { id: "mode", label: "Method for calculating total area", type: "select", default: "floors", options: [["floors", "Number of floors"], ["area", "Total area"]] },
    { id: "floors", label: "Number of floors", type: "number", default: "4", when: { mode: ["floors"] }, help: "It is assumed that all floors have the same area as the footprint." },
    { id: "totalArea", label: "Total building area", unit: "m²", type: "number", when: { mode: ["area"] } },
    { id: "maxCov", label: "Maximum allowed coverage ratio", unit: "%", type: "number", help: "Optional." },
    { id: "maxFar", label: "Maximum allowed FAR", type: "number", help: "Optional." }
  ],
  example: { values: { plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "60", maxFar: "2.5" }, expect: ["60%", "2.4"], note: "Example: a 500 m² plot, a 300 m² footprint and 4 floors." },
  invalid: { values: { plot: "500", footprint: "600", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "" } },
  related: ["polygon-area", "stair-design"]
};

export function solve(input) {
  const P = num(input, "plot", "Plot area", { positive: true });
  const F = num(input, "footprint", "Ground floor area", { positive: true });
  if (F > P) fail("The footprint area cannot exceed the plot area.", "footprint");
  const mode = choice(input, "mode", "Calculation method", ["floors", "area"], "floors");
  let total, floors = null;
  if (mode === "floors") {
    floors = num(input, "floors", "Number of floors", { integer: true, min: 1, max: 200 });
    total = F * floors;
  } else {
    total = num(input, "totalArea", "Total building area", { positive: true });
  }
  const maxCov = num(input, "maxCov", "Maximum allowed coverage ratio", { positive: true, max: 100, optional: true });
  const maxFar = num(input, "maxFar", "Maximum allowed FAR", { positive: true, optional: true });
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
  if (!covOk) issues.push(`Coverage exceeds the limit by ${fmt(cov - maxCov, 4)}%`);
  if (!farOk) issues.push(`FAR exceeds the limit by ${fmt(far - maxFar, 4)}`);
  const verdict = issues.length === 0 ? "Compliant with the regulations" : `Non-compliant: ${issues.join("، ")}`;
  const judge = (ok, limit) => (limit === null ? "No limit" : ok ? "Compliant" : "Non-compliant");
  const steps = [
    { text: "Coverage ratio:", tex: `C = \\frac{${ntex(F, 6)}}{${ntex(P, 6)}} \\times 100 = ${ntex(cov, 6)}\\ \\%` },
    { text: "Total building area:", tex: mode === "floors" ? `A_{total} = ${ntex(F, 6)} \\times ${ntex(floors, 6)} = ${ntex(total, 6)}\\ m^2` : `A_{total} = ${ntex(total, 6)}\\ m^2` },
    { text: "Floor area ratio:", tex: `FAR = \\frac{${ntex(total, 6)}}{${ntex(P, 6)}} = ${ntex(far, 6)}` },
    { text: "Open area:", tex: `A_{open} = ${ntex(P, 6)} - ${ntex(F, 6)} = ${ntex(open, 6)}\\ m^2` }
  ];
  const rows = [
    ["coverage ratio", `${fmt(cov, 4)}%`, maxCov === null ? "No limit" : `≤ ${fmt(maxCov)}%`, judge(covOk, maxCov)],
    ["Floor area ratio (FAR)", fmt(far, 4), maxFar === null ? "No limit" : `≤ ${fmt(maxFar)}`, judge(farOk, maxFar)]
  ];
  const results = [
    { label: "coverage ratio", value: `${fmt(cov, 4)}%`, text: `Coverage ${fmt(cov, 4)}%` },
    { label: "Total building area", value: `${fmt(total, 6)} m²` },
    { label: "Floor area ratio (FAR)", value: fmt(far, 4), text: `FAR = ${fmt(far, 4)}` },
    { label: "Open area", value: `${fmt(open, 4)} m² (${fmt(openPct, 4)}%)` }
  ];
  if (maxFootprint !== null) results.push({ label: "Maximum allowed footprint", value: `${fmt(maxFootprint, 6)} m²` });
  if (maxTotal !== null) {
    results.push({ label: "Maximum allowed total area", value: `${fmt(maxTotal, 6)} m²` });
    results.push({ label: "Maximum number of floors per FAR", value: `${fmt(maxFloors)}` });
  }
  results.push({ label: "Verdict", value: verdict });
  return {
    results,
    steps,
    blocks: [{ type: "table", caption: "Comparison with regulations", head: ["Indicator", "Value", "Allowed limit", "Verdict"], rows }],
    copy: `Coverage ${fmt(cov, 4)}%, FAR = ${fmt(far, 4)}, open area ${fmt(open, 4)} m², verdict: ${verdict}`,
    values: { cov, far, open, total, covOk, farOk, maxFootprint, maxTotal, maxFloors }
  };
}
