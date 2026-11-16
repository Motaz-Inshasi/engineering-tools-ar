import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Design the stair between two floors: calculate the number of steps, riser height and tread depth using Blondel's rule, then check the criteria and the available horizontal length.",
  keywords: ["stair", "Blondel's rule", "riser height", "tread depth", "stair", "blondel", "stair angle"],
  formulas: [
    { label: "Number of steps", tex: "n = \\operatorname{round}\\left(\\frac{H}{R_p}\\right)" },
    { label: "Riser height and tread depth", tex: "R = \\frac{H}{n},\\qquad G = (2R+G) - 2R" },
    { label: "Horizontal run and stair angle", tex: "L_h = (n-1)\\,G,\\qquad \\theta = \\arctan\\frac{R}{G}" }
  ],
  inputs: [
    { id: "H", label: "Height between floors H", unit: "cm", type: "number", default: "300" },
    { id: "riser", label: "Preferred riser height R", unit: "cm", type: "number", default: "17", help: "Approximate; the riser is adjusted to divide the height exactly." },
    { id: "blondel", label: "Blondel target 2R + G", unit: "cm", type: "number", default: "63", help: "The ideal value is between 60 and 64 cm." },
    { id: "avail", label: "Available horizontal length", unit: "cm", type: "number", help: "Optional: to check that the stair fits in the space." }
  ],
  example: { values: { H: "300", riser: "17", blondel: "63", avail: "" }, expect: ["504.3 cm", "18"], note: "Example: a height of 300 cm between two floors." },
  invalid: { values: { H: "300", riser: "17", blondel: "20", avail: "" } },
  related: ["polygon-area", "far-coverage"]
};

export function solve(input) {
  const H = num(input, "H", "Height between floors", { positive: true });
  const Rp = num(input, "riser", "Preferred riser height", { positive: true, max: 30 });
  const B = num(input, "blondel", "Blondel target", { positive: true, max: 100 });
  const avail = num(input, "avail", "Available horizontal length", { positive: true, optional: true });
  const n = Math.round(H / Rp);
  if (n < 2) fail("The height is too small for the preferred riser; the stair needs at least two steps.", "H");
  const R = H / n;
  const G = B - 2 * R;
  if (!(G > 0)) fail("The Blondel target is too small for this height; increase it or reduce the number of steps.", "blondel");
  const treads = n - 1;
  const run = treads * G;
  const angle = (Math.atan(R / G) * 180) / Math.PI;
  const stringer = Math.hypot(H, run);
  const twoRG = 2 * R + G;
  const checks = [
    { name: "Riser height R", value: `${fmt(R, 4)} cm`, rule: "15 – 18 cm", ok: R >= 15 && R <= 18 },
    { name: "Tread depth G", value: `${fmt(G, 4)} cm`, rule: "≥ 27 cm", ok: G >= 27 },
    { name: "Blondel rule 2R + G", value: `${fmt(twoRG, 4)} cm`, rule: "60 – 64 cm", ok: twoRG >= 60 && twoRG <= 64 },
    { name: "stair angle", value: `${fmt(angle, 3)}°`, rule: "25° – 42°", ok: angle >= 25 && angle <= 42 }
  ];
  if (avail !== null) checks.push({ name: "Horizontal run vs. available length", value: `${fmt(run, 4)} cm`, rule: `≤ ${fmt(avail)} cm`, ok: run <= avail });
  const allOk = checks.every((c) => c.ok);
  const verdict = allOk ? "Suitable and meets the criteria" : "Needs adjustment";
  const steps = [
    { text: "Number of steps, rounded from the preferred height:", tex: `n = \\operatorname{round}\\left(\\frac{${ntex(H, 6)}}{${ntex(Rp, 6)}}\\right) = ${n}` },
    { text: "Actual riser height:", tex: `R = \\frac{H}{n} = \\frac{${ntex(H, 6)}}{${n}} = ${ntex(R, 4)}\\ cm` },
    { text: "Tread depth from Blondel's rule:", tex: `G = ${ntex(B, 6)} - 2(${ntex(R, 4)}) = ${ntex(G, 4)}\\ cm` },
    { text: "Horizontal run of the stair:", tex: `L_h = (n-1)G = ${treads} \\times ${ntex(G, 4)} = ${ntex(run, 4)}\\ cm` },
    { text: "Stair angle:", tex: `\\theta = \\arctan\\frac{R}{G} = ${ntex(angle, 4)}^\\circ` },
    { text: "Length of the inclined stringer:", tex: `L = \\sqrt{H^2 + L_h^2} = ${ntex(stringer, 4)}\\ cm` }
  ];
  const blocks = [
    { type: "table", caption: "Criteria check", head: ["Check", "Value", "Criterion", "Verdict"], rows: checks.map((c) => [c.name, c.value, c.rule, c.ok ? "Pass" : "Fail"]) }
  ];
  if (!allOk) blocks.push({ type: "note", tone: "warn", text: "Some criteria are not met; adjust the preferred riser height, the Blondel target or the available length." });
  return {
    results: [
      { label: "Number of risers (step heights) n", value: `${n}` },
      { label: "Number of treads (step surfaces)", value: `${treads}` },
      { label: "Riser height R", value: `${fmt(R, 4)} cm` },
      { label: "Tread depth G", value: `${fmt(G, 4)} cm` },
      { label: "Total horizontal run", value: `${fmt(run, 4)} cm` },
      { label: "stair angle", value: `${fmt(angle, 3)}°` },
      { label: "Length of the inclined stringer", value: `${fmt(stringer, 4)} cm` },
      { label: "Verdict", value: verdict }
    ],
    steps,
    blocks,
    copy: `Steps: ${n}, R = ${fmt(R, 4)} cm, G = ${fmt(G, 4)} cm, horizontal run = ${fmt(run, 4)} cm, angle = ${fmt(angle, 3)}°, verdict: ${verdict}`,
    values: { n, treads, R, G, run, angle, stringer, twoRG, allOk }
  };
}
