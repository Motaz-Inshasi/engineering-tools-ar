import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;
const snap = (x, ref) => (Math.abs(x) < 1e-9 * Math.max(1, Math.abs(ref)) ? 0 : x);
const TYPES = [
  ["elastic", "لچکدار تصادم (e = 1)"],
  ["inelastic", "غیر لچکدار تصادم، دونوں اجسام آپس میں چپک جاتے ہیں (e = 0)"],
  ["restitution", "بحالی کے عامل e کے ساتھ تصادم"]
];

export const meta = {
  description: "دو اجسام کے درمیان ایک جہتی تصادم حل کریں: لچکدار، غیر لچکدار اور بحالی کے عامل کی صورتوں میں تصادم کے بعد کی رفتاریں، تصادم سے پہلے اور بعد کا معیارِ حرکت اور توانائی، ضائع ہونے والی توانائی کا فیصد، اور موازنے کا جدول۔",
  keywords: ["تصادم", "معیارِ حرکت", "collision", "momentum", "لچکدار", "غیر لچکدار", "بحالی کا عامل", "restitution"],
  formulas: [
    { label: "تصادم کے بعد رفتاریں", tex: "v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2},\\qquad v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2}" },
    { label: "معیارِ حرکت اور حرکی توانائی", tex: "p = m_1v_1 + m_2v_2,\\qquad KE = \\tfrac{1}{2}m_1v_1^2 + \\tfrac{1}{2}m_2v_2^2" }
  ],
  inputs: [
    { id: "m1", label: "کمیت m1", unit: "kg", type: "number", default: "2" },
    { id: "v1", label: "رفتار v1 (علامت کے ساتھ)", unit: "m/s", type: "number", default: "3", help: "دائیں طرف مثبت اور بائیں طرف منفی۔" },
    { id: "m2", label: "کمیت m2", unit: "kg", type: "number", default: "1" },
    { id: "v2", label: "رفتار v2 (علامت کے ساتھ)", unit: "m/s", type: "number", default: "-1" },
    { id: "type", label: "تصادم کی قسم", type: "select", default: "elastic", options: TYPES },
    { id: "e", label: "بحالی کا عامل e", type: "number", default: "0.5", when: { type: ["restitution"] }, help: "صفر اور 1 کے درمیان قدر۔" }
  ],
  example: { values: { m1: "2", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" }, expect: ["v1' = 0.3333 m/s", "v2' = 4.333 m/s"], note: "مثال: 3 m/s سے حرکت کرتے 2 kg جسم اور -1 m/s سے حرکت کرتے 1 kg جسم کے درمیان لچکدار تصادم۔" },
  invalid: { values: { m1: "0", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" } },
  related: ["work-energy", "kinematics", "formulas-constants"]
};

export function solve(input) {
  const m1 = num(input, "m1", "کمیت m1", { positive: true });
  const v1 = num(input, "v1", "رفتار v1");
  const m2 = num(input, "m2", "کمیت m2", { positive: true });
  const v2 = num(input, "v2", "رفتار v2");
  const type = choice(input, "type", "تصادم کی قسم", TYPES.map((t) => t[0]), "elastic");
  const e = type === "elastic" ? 1 : type === "inelastic" ? 0 : num(input, "e", "بحالی کا عامل e", { min: 0, max: 1 });
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
    { text: "تصادم سے پہلے کل معیارِ حرکت (محفوظ رہتا ہے):", tex: `p = m_1v_1 + m_2v_2 = ${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} = ${T(p0)}\\ kg\\cdot m/s` },
    { text: "استعمال شدہ بحالی کا عامل:", tex: `e = ${T(e)}` },
    { text: "تصادم کے بعد پہلی رفتار:", tex: `v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m2)}${S(e)}(${S(v2)} - ${S(v1)})}{${S(m1)} + ${S(m2)}} = ${T(v1f)}\\ m/s` },
    { text: "تصادم کے بعد دوسری رفتار:", tex: `v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m1)}${S(e)}(${S(v1)} - ${S(v2)})}{${S(m1)} + ${S(m2)}} = ${T(v2f)}\\ m/s` },
    { text: "تصادم سے پہلے اور بعد کی حرکی توانائی:", tex: `KE_{before} = ${T(KE0)}\\ J,\\qquad KE_{after} = ${T(KE1)}\\ J` }
  ];
  const results = [
    { label: "حتمی رفتار v1'", value: `${fmt(v1f, 6)} m/s` },
    { label: "حتمی رفتار v2'", value: `${fmt(v2f, 6)} m/s` },
    { label: "تصادم سے پہلے کل معیارِ حرکت", value: `${fmt(p0, 6)} kg·m/s` },
    { label: "تصادم کے بعد کل معیارِ حرکت", value: `${fmt(p1, 6)} kg·m/s` },
    { label: "تصادم سے پہلے حرکی توانائی", value: `${fmt(KE0, 6)} J` },
    { label: "تصادم کے بعد حرکی توانائی", value: `${fmt(KE1, 6)} J` },
    { label: "ضائع ہونے والی توانائی", value: `${fmt(lost, 6)} J` },
    { label: "ضائع ہونے والی توانائی کا فیصد", value: pct === null ? "لاگو نہیں (ابتدائی توانائی صفر ہے)" : `${fmt(pct, 4)} %` }
  ];
  const copy = `v1' = ${fmt(v1f, 4)} m/s، v2' = ${fmt(v2f, 4)} m/s، ضائع ہونے والی توانائی = ${fmt(lost, 4)} J`;
  const blocks = [
    {
      type: "table",
      caption: "تصادم سے پہلے اور بعد کا موازنہ",
      head: ["مقدار", "پہلے", "بعد میں"],
      rows: [
        ["جسم 1 کی رفتار (m/s)", fmt(v1), fmt(v1f)],
        ["جسم 2 کی رفتار (m/s)", fmt(v2), fmt(v2f)],
        ["کل معیارِ حرکت (kg·m/s)", fmt(p0), fmt(p1)],
        ["حرکی توانائی (J)", fmt(KE0), fmt(KE1)]
      ],
      ltr: true
    }
  ];
  return { results, steps, copy, blocks, values: { v1f, v2f, p0, p1, KE0, KE1, lost, pct } };
}
