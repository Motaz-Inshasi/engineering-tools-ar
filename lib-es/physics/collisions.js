import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;
const snap = (x, ref) => (Math.abs(x) < 1e-9 * Math.max(1, Math.abs(ref)) ? 0 : x);
const TYPES = [
  ["elastic", "Choque elástico (e = 1)"],
  ["inelastic", "Choque perfectamente inelástico, los cuerpos quedan unidos (e = 0)"],
  ["restitution", "Choque con coeficiente de restitución e"]
];

export const meta = {
  description: "Resuelve el choque unidimensional entre dos cuerpos: velocidades tras el choque para los tipos elástico, inelástico y con coeficiente de restitución, momento lineal y energía antes y después, porcentaje de energía perdida y tabla comparativa.",
  keywords: ["Choque", "Momento lineal", "collision", "momentum", "Elástico", "Inelástico", "Coeficiente de restitución", "restitution"],
  formulas: [
    { label: "Velocidades después del choque", tex: "v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2},\\qquad v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2}" },
    { label: "Momento lineal y energía cinética", tex: "p = m_1v_1 + m_2v_2,\\qquad KE = \\tfrac{1}{2}m_1v_1^2 + \\tfrac{1}{2}m_2v_2^2" }
  ],
  inputs: [
    { id: "m1", label: "Masa m1", unit: "kg", type: "number", default: "2" },
    { id: "v1", label: "Velocidad v1 (con su signo)", unit: "m/s", type: "number", default: "3", help: "Positivo hacia la derecha y negativo hacia la izquierda." },
    { id: "m2", label: "Masa m2", unit: "kg", type: "number", default: "1" },
    { id: "v2", label: "Velocidad v2 (con su signo)", unit: "m/s", type: "number", default: "-1" },
    { id: "type", label: "Tipo de choque", type: "select", default: "elastic", options: TYPES },
    { id: "e", label: "Coeficiente de restitución e", type: "number", default: "0.5", when: { type: ["restitution"] }, help: "Valor entre 0 y 1." }
  ],
  example: { values: { m1: "2", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" }, expect: ["v1' = 0.3333 m/s", "v2' = 4.333 m/s"], note: "Ejemplo: choque elástico entre un cuerpo de 2 kg que se mueve a 3 m/s y otro de 1 kg que se mueve a -1 m/s." },
  invalid: { values: { m1: "0", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" } },
  related: ["work-energy", "kinematics", "formulas-constants"]
};

export function solve(input) {
  const m1 = num(input, "m1", "Masa m1", { positive: true });
  const v1 = num(input, "v1", "Velocidad v1");
  const m2 = num(input, "m2", "Masa m2", { positive: true });
  const v2 = num(input, "v2", "Velocidad v2");
  const type = choice(input, "type", "Tipo de choque", TYPES.map((t) => t[0]), "elastic");
  const e = type === "elastic" ? 1 : type === "inelastic" ? 0 : num(input, "e", "Coeficiente de restitución e", { min: 0, max: 1 });
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
    { text: "Momento lineal total antes del choque (se conserva):", tex: `p = m_1v_1 + m_2v_2 = ${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} = ${T(p0)}\\ kg\\cdot m/s` },
    { text: "Coeficiente de restitución utilizado:", tex: `e = ${T(e)}` },
    { text: "Primera velocidad después del choque:", tex: `v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m2)}${S(e)}(${S(v2)} - ${S(v1)})}{${S(m1)} + ${S(m2)}} = ${T(v1f)}\\ m/s` },
    { text: "Segunda velocidad después del choque:", tex: `v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m1)}${S(e)}(${S(v1)} - ${S(v2)})}{${S(m1)} + ${S(m2)}} = ${T(v2f)}\\ m/s` },
    { text: "Energía cinética antes y después del choque:", tex: `KE_{before} = ${T(KE0)}\\ J,\\qquad KE_{after} = ${T(KE1)}\\ J` }
  ];
  const results = [
    { label: "Velocidad final v1'", value: `${fmt(v1f, 6)} m/s` },
    { label: "Velocidad final v2'", value: `${fmt(v2f, 6)} m/s` },
    { label: "Momento lineal total antes", value: `${fmt(p0, 6)} kg·m/s` },
    { label: "Momento lineal total después", value: `${fmt(p1, 6)} kg·m/s` },
    { label: "Energía cinética antes", value: `${fmt(KE0, 6)} J` },
    { label: "Energía cinética después", value: `${fmt(KE1, 6)} J` },
    { label: "Energía perdida", value: `${fmt(lost, 6)} J` },
    { label: "Porcentaje de energía perdida", value: pct === null ? "No aplica (la energía inicial es cero)" : `${fmt(pct, 4)} %` }
  ];
  const copy = `v1' = ${fmt(v1f, 4)} m/s, v2' = ${fmt(v2f, 4)} m/s, energía perdida = ${fmt(lost, 4)} J`;
  const blocks = [
    {
      type: "table",
      caption: "Comparación antes y después del choque",
      head: ["Magnitud", "Antes", "Después"],
      rows: [
        ["Velocidad del cuerpo 1 (m/s)", fmt(v1), fmt(v1f)],
        ["Velocidad del cuerpo 2 (m/s)", fmt(v2), fmt(v2f)],
        ["Momento lineal total (kg·m/s)", fmt(p0), fmt(p1)],
        ["Energía cinética (J)", fmt(KE0), fmt(KE1)]
      ],
      ltr: true
    }
  ];
  return { results, steps, copy, blocks, values: { v1f, v2f, p0, p1, KE0, KE1, lost, pct } };
}
