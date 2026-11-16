import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;
const snap = (x, ref) => (Math.abs(x) < 1e-9 * Math.max(1, Math.abs(ref)) ? 0 : x);
const TYPES = [
  ["elastic", "choc élastique (e = 1)"],
  ["inelastic", "choc inélastique, les deux corps restent collés (e = 0)"],
  ["restitution", "choc avec coefficient de restitution e"]
];

export const meta = {
  description: "Résout un choc unidimensionnel entre deux corps : vitesses après le choc pour les types élastique, inélastique et avec coefficient de restitution, avec la quantité de mouvement et l'énergie avant et après, le pourcentage d'énergie perdue et le tableau de comparaison.",
  keywords: ["choc", "quantité de mouvement", "collision", "momentum", "élastique", "inélastique", "coefficient de restitution", "restitution"],
  formulas: [
    { label: "vitesses après le choc", tex: "v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2},\\qquad v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2}" },
    { label: "Quantité de mouvement et énergie cinétique", tex: "p = m_1v_1 + m_2v_2,\\qquad KE = \\tfrac{1}{2}m_1v_1^2 + \\tfrac{1}{2}m_2v_2^2" }
  ],
  inputs: [
    { id: "m1", label: "Masse m1", unit: "kg", type: "number", default: "2" },
    { id: "v1", label: "Vitesse v1 (avec son signe)", unit: "m/s", type: "number", default: "3", help: "Positif vers la droite et négatif vers la gauche." },
    { id: "m2", label: "Masse m2", unit: "kg", type: "number", default: "1" },
    { id: "v2", label: "Vitesse v2 (avec son signe)", unit: "m/s", type: "number", default: "-1" },
    { id: "type", label: "Type de choc", type: "select", default: "elastic", options: TYPES },
    { id: "e", label: "Coefficient de restitution e", type: "number", default: "0.5", when: { type: ["restitution"] }, help: "Valeur comprise entre 0 et 1." }
  ],
  example: { values: { m1: "2", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" }, expect: ["v1' = 0.3333 m/s", "v2' = 4.333 m/s"], note: "Exemple : choc élastique entre un corps de 2 kg animé de 3 m/s et un corps de 1 kg animé de -1 m/s." },
  invalid: { values: { m1: "0", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" } },
  related: ["work-energy", "kinematics", "formulas-constants"]
};

export function solve(input) {
  const m1 = num(input, "m1", "Masse m1", { positive: true });
  const v1 = num(input, "v1", "Vitesse v1");
  const m2 = num(input, "m2", "Masse m2", { positive: true });
  const v2 = num(input, "v2", "Vitesse v2");
  const type = choice(input, "type", "Type de choc", TYPES.map((t) => t[0]), "elastic");
  const e = type === "elastic" ? 1 : type === "inelastic" ? 0 : num(input, "e", "Coefficient de restitution e", { min: 0, max: 1 });
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
    { text: "Quantité de mouvement totale avant le choc (conservée) :", tex: `p = m_1v_1 + m_2v_2 = ${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} = ${T(p0)}\\ kg\\cdot m/s` },
    { text: "Coefficient de restitution utilisé :", tex: `e = ${T(e)}` },
    { text: "Première vitesse après le choc :", tex: `v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m2)}${S(e)}(${S(v2)} - ${S(v1)})}{${S(m1)} + ${S(m2)}} = ${T(v1f)}\\ m/s` },
    { text: "Seconde vitesse après le choc :", tex: `v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m1)}${S(e)}(${S(v1)} - ${S(v2)})}{${S(m1)} + ${S(m2)}} = ${T(v2f)}\\ m/s` },
    { text: "Énergie cinétique avant et après le choc :", tex: `KE_{before} = ${T(KE0)}\\ J,\\qquad KE_{after} = ${T(KE1)}\\ J` }
  ];
  const results = [
    { label: "Vitesse finale v1'", value: `${fmt(v1f, 6)} m/s` },
    { label: "Vitesse finale v2'", value: `${fmt(v2f, 6)} m/s` },
    { label: "Quantité de mouvement totale avant", value: `${fmt(p0, 6)} kg·m/s` },
    { label: "Quantité de mouvement totale après", value: `${fmt(p1, 6)} kg·m/s` },
    { label: "Énergie cinétique avant", value: `${fmt(KE0, 6)} J` },
    { label: "Énergie cinétique après", value: `${fmt(KE1, 6)} J` },
    { label: "Énergie perdue", value: `${fmt(lost, 6)} J` },
    { label: "Pourcentage d'énergie perdue", value: pct === null ? "Non applicable (énergie initiale nulle)" : `${fmt(pct, 4)} %` }
  ];
  const copy = `v1' = ${fmt(v1f, 4)} m/s, v2' = ${fmt(v2f, 4)} m/s, énergie perdue = ${fmt(lost, 4)} J`;
  const blocks = [
    {
      type: "table",
      caption: "Comparaison avant et après le choc",
      head: ["Grandeur", "Avant", "Après"],
      rows: [
        ["Vitesse du corps 1 (m/s)", fmt(v1), fmt(v1f)],
        ["Vitesse du corps 2 (m/s)", fmt(v2), fmt(v2f)],
        ["Quantité de mouvement totale (kg·m/s)", fmt(p0), fmt(p1)],
        ["Énergie cinétique (J)", fmt(KE0), fmt(KE1)]
      ],
      ltr: true
    }
  ];
  return { results, steps, copy, blocks, values: { v1f, v2f, p0, p1, KE0, KE1, lost, pct } };
}
