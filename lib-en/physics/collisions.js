import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;
const snap = (x, ref) => (Math.abs(x) < 1e-9 * Math.max(1, Math.abs(ref)) ? 0 : x);
const TYPES = [
  ["elastic", "Elastic collision (e = 1)"],
  ["inelastic", "Perfectly inelastic collision, the two bodies stick together (e = 0)"],
  ["restitution", "Collision with restitution coefficient e"]
];

export const meta = {
  description: "Solve a one-dimensional collision between two bodies: the velocities after the collision for elastic, perfectly inelastic and restitution-coefficient cases, with momentum and energy before and after, the percentage of energy lost, and a comparison table.",
  keywords: ["Collision", "Momentum", "collision", "momentum", "Elastic", "Inelastic", "Restitution coefficient", "restitution"],
  formulas: [
    { label: "Velocities after the collision", tex: "v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2},\\qquad v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2}" },
    { label: "Momentum and kinetic energy", tex: "p = m_1v_1 + m_2v_2,\\qquad KE = \\tfrac{1}{2}m_1v_1^2 + \\tfrac{1}{2}m_2v_2^2" }
  ],
  inputs: [
    { id: "m1", label: "Mass m1", unit: "kg", type: "number", default: "2" },
    { id: "v1", label: "Velocity v1 (with sign)", unit: "m/s", type: "number", default: "3", help: "Positive to the right and negative to the left." },
    { id: "m2", label: "Mass m2", unit: "kg", type: "number", default: "1" },
    { id: "v2", label: "Velocity v2 (with sign)", unit: "m/s", type: "number", default: "-1" },
    { id: "type", label: "Collision type", type: "select", default: "elastic", options: TYPES },
    { id: "e", label: "Restitution coefficient e", type: "number", default: "0.5", when: { type: ["restitution"] }, help: "A value between 0 and 1." }
  ],
  example: { values: { m1: "2", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" }, expect: ["v1' = 0.3333 m/s", "v2' = 4.333 m/s"], note: "Example: elastic collision between a 2 kg body moving at 3 m/s and a 1 kg body moving at -1 m/s." },
  invalid: { values: { m1: "0", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" } },
  related: ["work-energy", "kinematics", "formulas-constants"]
};

export function solve(input) {
  const m1 = num(input, "m1", "Mass m1", { positive: true });
  const v1 = num(input, "v1", "Velocity v1");
  const m2 = num(input, "m2", "Mass m2", { positive: true });
  const v2 = num(input, "v2", "Velocity v2");
  const type = choice(input, "type", "Collision type", TYPES.map((t) => t[0]), "elastic");
  const e = type === "elastic" ? 1 : type === "inelastic" ? 0 : num(input, "e", "Restitution coefficient e", { min: 0, max: 1 });
  const M = m1 + m2;
  const v1f = (m1 * v1 + m2 * v2 + m2 * e * (v2 - v1)) / M;
  const v2f = (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / M;
  const p0 = m1 * v1 + m2 * v2;
  const p1 = snap(m1 * v1f + m2 * v2f, p0);
  const KE0 = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  const KE1 = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f;
  const lost = snap(KE0 - KE1, KE0);
  const pct = KE0 > 0 ? snap((lost / KE0) * 100, 100) : null;
  const steps = [
    { text: "Total momentum before the collision (conserved):", tex: `p = m_1v_1 + m_2v_2 = ${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} = ${T(p0)}\\ kg\\cdot m/s` },
    { text: "Restitution coefficient used:", tex: `e = ${T(e)}` },
    { text: "First velocity after the collision:", tex: `v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m2)}${S(e)}(${S(v2)} - ${S(v1)})}{${S(m1)} + ${S(m2)}} = ${T(v1f)}\\ m/s` },
    { text: "Second velocity after the collision:", tex: `v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m1)}${S(e)}(${S(v1)} - ${S(v2)})}{${S(m1)} + ${S(m2)}} = ${T(v2f)}\\ m/s` },
    { text: "Kinetic energy before and after the collision:", tex: `KE_{before} = ${T(KE0)}\\ J,\\qquad KE_{after} = ${T(KE1)}\\ J` }
  ];
  const results = [
    { label: "Final velocity v1'", value: `${fmt(v1f, 6)} m/s` },
    { label: "Final velocity v2'", value: `${fmt(v2f, 6)} m/s` },
    { label: "Total momentum before", value: `${fmt(p0, 6)} kg·m/s` },
    { label: "Total momentum after", value: `${fmt(p1, 6)} kg·m/s` },
    { label: "Kinetic energy before", value: `${fmt(KE0, 6)} J` },
    { label: "Kinetic energy after", value: `${fmt(KE1, 6)} J` },
    { label: "Energy lost", value: `${fmt(lost, 6)} J` },
    { label: "Percentage of energy lost", value: pct === null ? "Not applicable (initial energy is zero)" : `${fmt(pct, 4)} %` }
  ];
  const copy = `v1' = ${fmt(v1f, 4)} m/s, v2' = ${fmt(v2f, 4)} m/s, energy lost = ${fmt(lost, 4)} J`;
  const blocks = [
    {
      type: "table",
      caption: "Comparison before and after the collision",
      head: ["Quantity", "Before", "After"],
      rows: [
        ["Body 1 velocity (m/s)", fmt(v1), fmt(v1f)],
        ["Body 2 velocity (m/s)", fmt(v2), fmt(v2f)],
        ["Total momentum (kg·m/s)", fmt(p0), fmt(p1)],
        ["Kinetic energy (J)", fmt(KE0), fmt(KE1)]
      ],
      ltr: true
    }
  ];
  return { results, steps, copy, blocks, values: { v1f, v2f, p0, p1, KE0, KE1, lost, pct } };
}
