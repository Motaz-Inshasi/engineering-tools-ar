import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;
const snap = (x, ref) => (Math.abs(x) < 1e-9 * Math.max(1, Math.abs(ref)) ? 0 : x);
const TYPES = [
  ["elastic", "تصادم مرن (e = 1)"],
  ["inelastic", "تصادم عديم المرونة، يلتصق الجسمان (e = 0)"],
  ["restitution", "تصادم بمعامل ارتداد e"]
];

export const meta = {
  description: "حل التصادم في بُعد واحد بين جسمين: السرعتان بعد التصادم لأنواع مرن وعديم المرونة ومعامل الارتداد، مع الزخم والطاقة قبل وبعد ونسبة الطاقة المفقودة وجدول المقارنة.",
  keywords: ["تصادم", "زخم", "collision", "momentum", "مرن", "عديم المرونة", "معامل الارتداد", "restitution"],
  formulas: [
    { label: "السرعتان بعد التصادم", tex: "v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2},\\qquad v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2}" },
    { label: "الزخم والطاقة الحركية", tex: "p = m_1v_1 + m_2v_2,\\qquad KE = \\tfrac{1}{2}m_1v_1^2 + \\tfrac{1}{2}m_2v_2^2" }
  ],
  inputs: [
    { id: "m1", label: "الكتلة m1", unit: "kg", type: "number", default: "2" },
    { id: "v1", label: "السرعة v1 (بإشارتها)", unit: "m/s", type: "number", default: "3", help: "الموجب إلى اليمين والسالب إلى اليسار." },
    { id: "m2", label: "الكتلة m2", unit: "kg", type: "number", default: "1" },
    { id: "v2", label: "السرعة v2 (بإشارتها)", unit: "m/s", type: "number", default: "-1" },
    { id: "type", label: "نوع التصادم", type: "select", default: "elastic", options: TYPES },
    { id: "e", label: "معامل الارتداد e", type: "number", default: "0.5", when: { type: ["restitution"] }, help: "قيمة بين 0 و1." }
  ],
  example: { values: { m1: "2", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" }, expect: ["v1' = 0.3333 m/s", "v2' = 4.333 m/s"], note: "مثال: تصادم مرن بين جسم 2 kg يتحرك 3 m/s وجسم 1 kg يتحرك -1 m/s." },
  invalid: { values: { m1: "0", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" } },
  related: ["work-energy", "kinematics", "formulas-constants"]
};

export function solve(input) {
  const m1 = num(input, "m1", "الكتلة m1", { positive: true });
  const v1 = num(input, "v1", "السرعة v1");
  const m2 = num(input, "m2", "الكتلة m2", { positive: true });
  const v2 = num(input, "v2", "السرعة v2");
  const type = choice(input, "type", "نوع التصادم", TYPES.map((t) => t[0]), "elastic");
  const e = type === "elastic" ? 1 : type === "inelastic" ? 0 : num(input, "e", "معامل الارتداد e", { min: 0, max: 1 });
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
    { text: "الزخم الكلي قبل التصادم (يُحفظ):", tex: `p = m_1v_1 + m_2v_2 = ${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} = ${T(p0)}\\ kg\\cdot m/s` },
    { text: "معامل الارتداد المستخدم:", tex: `e = ${T(e)}` },
    { text: "السرعة الأولى بعد التصادم:", tex: `v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m2)}${S(e)}(${S(v2)} - ${S(v1)})}{${S(m1)} + ${S(m2)}} = ${T(v1f)}\\ m/s` },
    { text: "السرعة الثانية بعد التصادم:", tex: `v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m1)}${S(e)}(${S(v1)} - ${S(v2)})}{${S(m1)} + ${S(m2)}} = ${T(v2f)}\\ m/s` },
    { text: "الطاقة الحركية قبل وبعد التصادم:", tex: `KE_{before} = ${T(KE0)}\\ J,\\qquad KE_{after} = ${T(KE1)}\\ J` }
  ];
  const results = [
    { label: "السرعة النهائية v1'", value: `${fmt(v1f, 6)} m/s` },
    { label: "السرعة النهائية v2'", value: `${fmt(v2f, 6)} m/s` },
    { label: "الزخم الكلي قبل", value: `${fmt(p0, 6)} kg·m/s` },
    { label: "الزخم الكلي بعد", value: `${fmt(p1, 6)} kg·m/s` },
    { label: "الطاقة الحركية قبل", value: `${fmt(KE0, 6)} J` },
    { label: "الطاقة الحركية بعد", value: `${fmt(KE1, 6)} J` },
    { label: "الطاقة المفقودة", value: `${fmt(lost, 6)} J` },
    { label: "نسبة الطاقة المفقودة", value: pct === null ? "لا تنطبق (الطاقة الابتدائية صفر)" : `${fmt(pct, 4)} %` }
  ];
  const copy = `v1' = ${fmt(v1f, 4)} m/s، v2' = ${fmt(v2f, 4)} m/s، الطاقة المفقودة = ${fmt(lost, 4)} J`;
  const blocks = [
    {
      type: "table",
      caption: "مقارنة قبل التصادم وبعده",
      head: ["الكمية", "قبل", "بعد"],
      rows: [
        ["سرعة الجسم 1 (m/s)", fmt(v1), fmt(v1f)],
        ["سرعة الجسم 2 (m/s)", fmt(v2), fmt(v2f)],
        ["الزخم الكلي (kg·m/s)", fmt(p0), fmt(p1)],
        ["الطاقة الحركية (J)", fmt(KE0), fmt(KE1)]
      ],
      ltr: true
    }
  ];
  return { results, steps, copy, blocks, values: { v1f, v2f, p0, p1, KE0, KE1, lost, pct } };
}
