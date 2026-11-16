import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const S = (x) => `(${T(x)})`;
const snap = (x, ref) => (Math.abs(x) < 1e-9 * Math.max(1, Math.abs(ref)) ? 0 : x);
const TYPES = [
  ["elastic", "Tumbukan lenting sempurna (e = 1)"],
  ["inelastic", "Tumbukan tidak lenting sama sekali, kedua benda menempel (e = 0)"],
  ["restitution", "Tumbukan dengan koefisien restitusi e"]
];

export const meta = {
  description: "Selesaikan tumbukan satu dimensi antara dua benda: kecepatan setelah tumbukan untuk jenis lenting, tidak lenting, dan koefisien restitusi, dengan momentum dan energi sebelum dan sesudah, rasio energi yang hilang, dan tabel perbandingan.",
  keywords: ["tumbukan", "momentum", "collision", "momentum", "lenting", "tidak lenting", "koefisien restitusi", "restitution"],
  formulas: [
    { label: "Kedua kecepatan setelah tumbukan", tex: "v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2},\\qquad v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2}" },
    { label: "Momentum dan energi kinetik", tex: "p = m_1v_1 + m_2v_2,\\qquad KE = \\tfrac{1}{2}m_1v_1^2 + \\tfrac{1}{2}m_2v_2^2" }
  ],
  inputs: [
    { id: "m1", label: "Massa m1", unit: "kg", type: "number", default: "2" },
    { id: "v1", label: "Kecepatan v1 (dengan tanda)", unit: "m/s", type: "number", default: "3", help: "Positif ke kanan dan negatif ke kiri." },
    { id: "m2", label: "Massa m2", unit: "kg", type: "number", default: "1" },
    { id: "v2", label: "Kecepatan v2 (dengan tanda)", unit: "m/s", type: "number", default: "-1" },
    { id: "type", label: "Jenis tumbukan", type: "select", default: "elastic", options: TYPES },
    { id: "e", label: "Koefisien restitusi e", type: "number", default: "0.5", when: { type: ["restitution"] }, help: "Nilai antara 0 dan 1." }
  ],
  example: { values: { m1: "2", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" }, expect: ["v1' = 0.3333 m/s", "v2' = 4.333 m/s"], note: "Contoh: tumbukan lenting antara benda 2 kg yang bergerak 3 m/s dan benda 1 kg yang bergerak -1 m/s." },
  invalid: { values: { m1: "0", v1: "3", m2: "1", v2: "-1", type: "elastic", e: "" } },
  related: ["work-energy", "kinematics", "formulas-constants"]
};

export function solve(input) {
  const m1 = num(input, "m1", "Massa m1", { positive: true });
  const v1 = num(input, "v1", "Kecepatan v1");
  const m2 = num(input, "m2", "Massa m2", { positive: true });
  const v2 = num(input, "v2", "Kecepatan v2");
  const type = choice(input, "type", "Jenis tumbukan", TYPES.map((t) => t[0]), "elastic");
  const e = type === "elastic" ? 1 : type === "inelastic" ? 0 : num(input, "e", "Koefisien restitusi e", { min: 0, max: 1 });
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
    { text: "Momentum total sebelum tumbukan (kekal):", tex: `p = m_1v_1 + m_2v_2 = ${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} = ${T(p0)}\\ kg\\cdot m/s` },
    { text: "Koefisien restitusi yang digunakan:", tex: `e = ${T(e)}` },
    { text: "Kecepatan pertama setelah tumbukan:", tex: `v_1' = \\frac{m_1v_1 + m_2v_2 + m_2e(v_2 - v_1)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m2)}${S(e)}(${S(v2)} - ${S(v1)})}{${S(m1)} + ${S(m2)}} = ${T(v1f)}\\ m/s` },
    { text: "Kecepatan kedua setelah tumbukan:", tex: `v_2' = \\frac{m_1v_1 + m_2v_2 + m_1e(v_1 - v_2)}{m_1 + m_2} = \\frac{${S(m1)}${S(v1)} + ${S(m2)}${S(v2)} + ${S(m1)}${S(e)}(${S(v1)} - ${S(v2)})}{${S(m1)} + ${S(m2)}} = ${T(v2f)}\\ m/s` },
    { text: "Energi kinetik sebelum dan sesudah tumbukan:", tex: `KE_{before} = ${T(KE0)}\\ J,\\qquad KE_{after} = ${T(KE1)}\\ J` }
  ];
  const results = [
    { label: "Kecepatan akhir v1'", value: `${fmt(v1f, 6)} m/s` },
    { label: "Kecepatan akhir v2'", value: `${fmt(v2f, 6)} m/s` },
    { label: "Momentum total sebelum", value: `${fmt(p0, 6)} kg·m/s` },
    { label: "Momentum total sesudah", value: `${fmt(p1, 6)} kg·m/s` },
    { label: "Energi kinetik sebelum", value: `${fmt(KE0, 6)} J` },
    { label: "Energi kinetik sesudah", value: `${fmt(KE1, 6)} J` },
    { label: "Energi yang hilang", value: `${fmt(lost, 6)} J` },
    { label: "Persentase energi yang hilang", value: pct === null ? "Tidak berlaku (energi awal nol)" : `${fmt(pct, 4)} %` }
  ];
  const copy = `v1' = ${fmt(v1f, 4)} m/s, v2' = ${fmt(v2f, 4)} m/s, energi yang hilang = ${fmt(lost, 4)} J`;
  const blocks = [
    {
      type: "table",
      caption: "Perbandingan sebelum dan sesudah tumbukan",
      head: ["Besaran", "Sebelum", "Sesudah"],
      rows: [
        ["Kecepatan benda 1 (m/s)", fmt(v1), fmt(v1f)],
        ["Kecepatan benda 2 (m/s)", fmt(v2), fmt(v2f)],
        ["Momentum total (kg·m/s)", fmt(p0), fmt(p1)],
        ["Energi kinetik (J)", fmt(KE0), fmt(KE1)]
      ],
      ltr: true
    }
  ];
  return { results, steps, copy, blocks, values: { v1f, v2f, p0, p1, KE0, KE1, lost, pct } };
}
