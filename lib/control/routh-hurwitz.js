import { readTF } from "../signals/common.js";
import { roots, toTex as ptex, toDescending } from "../core/polynomial.js";
import { fmt, niceTex } from "../core/format.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "اختبر استقرار نظام بمعيار روث-هورفيتز: جدول روث كامل مع الحالتين الخاصتين (صفر في العمود الأول، وصف كامل من الأصفار)، وعدد الجذور في نصف المستوى الأيمن، مع تحقق بحساب الجذور مباشرة.",
  keywords: ["روث", "هورفيتز", "routh", "hurwitz", "جدول روث", "استقرار", "stability", "المعادلة المميزة"],
  formulas: [
    { label: "كل صف يُبنى بالضرب التقاطعي للصفين فوقه", tex: "b_i = \\frac{a_{1}\\,a_{2i} - a_{0}\\,a_{2i+1}}{a_{1}}" },
    { label: "عدد الجذور في نصف المستوى الأيمن = عدد تغيرات الإشارة في العمود الأول", tex: "N_{RHP} = N_{\\text{sign}}" }
  ],
  inputs: [
    { id: "p", label: "كثيرة الحدود المميزة في s", type: "expr", default: "s^4 + 2s^3 + 3s^2 + 4s + 5", help: "مثل $s^3 + 6s^2 + 11s + 6$ (اكتب الطرف الأيسر من المعادلة فقط)." }
  ],
  example: { values: { p: "s^4 + 2s^3 + 3s^2 + 4s + 5" }, expect: ["RHP = 2"], note: "مثال كتابي شهير: $s^4 + 2s^3 + 3s^2 + 4s + 5$ له تغيّرا إشارة، أي جذران غير مستقرين." },
  invalid: { values: { p: "5" } },
  related: ["transfer-function", "step-response", "bode-plot", "steady-state-error"]
};

export function routhTable(desc) {
  const n = desc.length - 1;
  const width = Math.ceil((n + 1) / 2);
  const scale = Math.max(...desc.map(Math.abs));
  const eps = 1e-9 * scale;
  const rows = [desc.filter((_, i) => i % 2 === 0), desc.filter((_, i) => i % 2 === 1)].map((r) => [...r, ...Array(width - r.length + 1).fill(0)]);
  const notes = [];
  let usedEps = false, auxRow = null;
  const isZero = (x) => Math.abs(x) <= 1e-10 * scale;
  for (let i = 2; i <= n; i++) {
    const prev = rows[i - 1], prev2 = rows[i - 2];
    if (prev.every(isZero)) {
      const order = n - (i - 2);
      const aux = prev2.map((c, k) => c * (order - 2 * k));
      rows[i - 1] = aux.map((c, k) => (order - 2 * k > 0 ? c : 0));
      notes.push({ row: i - 1, kind: "zeroRow", aux: prev2.slice(0, Math.floor(order / 2) + 1), order });
      auxRow = { order, coeffs: prev2.slice(0, Math.floor(order / 2) + 1) };
    } else if (isZero(prev[0])) {
      prev[0] = eps;
      usedEps = true;
      notes.push({ row: i - 1, kind: "eps" });
    }
    const a = rows[i - 1], b = rows[i - 2];
    const row = [];
    for (let k = 0; k < width; k++) row.push((a[0] * (b[k + 1] || 0) - b[0] * (a[k + 1] || 0)) / a[0]);
    row.push(0);
    rows.push(row.map((x) => (isZero(x) ? 0 : x)));
  }
  if (rows.length > n + 1) rows.length = n + 1;
  const first = rows.map((r) => r[0]);
  let changes = 0;
  for (let i = 1; i < first.length; i++) if (Math.sign(first[i]) !== Math.sign(first[i - 1]) && first[i] !== 0 && first[i - 1] !== 0) changes++;
  return { rows: rows.map((r) => r.slice(0, width)), first, changes, notes, usedEps, auxRow, n };
}

export function solve(input) {
  const tf = readTF(input, "p", "كثيرة الحدود", { polynomial: true });
  const asc = tf.num.map((c) => c / tf.den[0]);
  let desc = toDescending(asc);
  const n = desc.length - 1;
  if (n < 1) fail("كثيرة الحدود يجب أن تكون من الدرجة الأولى على الأقل.", "p");
  if (desc[0] < 0) desc = desc.map((c) => -c);
  const steps = [{ text: "المعادلة المميزة:", tex: `${ptex(asc, "s")} = 0` }];
  const missing = desc.some((c) => c === 0), negative = desc.some((c) => c < 0);
  if (missing || negative) steps.push(`الشرط الضروري غير محقق: ${negative ? "يوجد معامل سالب" : "يوجد معامل صفري"}، فالنظام ليس مستقراً استقراراً تاماً. نكمل الجدول لمعرفة عدد الجذور غير المستقرة.`);
  else steps.push("الشرط الضروري محقق: كل المعاملات موجودة وموجبة. نبني الجدول للتأكد.");
  const T = routhTable(desc);
  steps.push("الصفان الأولان من معاملات كثيرة الحدود بالتناوب، وكل صف بعدهما يُحسب بالضرب التقاطعي للصفين فوقه مقسوماً على العنصر الأول من الصف السابق.");
  for (const note of T.notes) {
    if (note.kind === "eps") steps.push(`في الصف $s^{${n - note.row}}$ ظهر صفر في العمود الأول، فاستبدلناه بعدد موجب صغير جداً $\\varepsilon$ وأكملنا.`);
    else steps.push({ text: `الصف $s^{${n - note.row}}$ كله أصفار، فنكوّن كثيرة الحدود المساعدة من الصف السابق ونستبدل الصف الصفري بمعاملات مشتقتها. هذا يعني وجود جذور متناظرة حول الأصل (قد تكون على المحور التخيلي):`, tex: `A(s) = ${note.aux.map((c, k) => `${niceTex(c, 6)}s^{${note.order - 2 * k}}`).join(" + ")}` });
  }
  const rs = roots(asc);
  const rhp = rs.filter((r) => r.re > 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  const jw = rs.filter((r) => Math.abs(r.re) <= 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  steps.push(`عدد تغيرات الإشارة في العمود الأول = ${T.changes}، وهو عدد الجذور في نصف المستوى الأيمن.`);
  steps.push(`للتحقق حسبنا الجذور عددياً: ${rhp} في النصف الأيمن و ${jw} على المحور التخيلي.`);
  const verdict = rhp > 0 ? "غير مستقر" : jw > 0 ? "مستقر حدياً (جذور على المحور التخيلي)" : "مستقر";
  const rows = T.rows.map((r, i) => [{ tex: `s^{${n - i}}`, th: true }, ...r.map((x, k) => (k === 0 && T.notes.some((q) => q.kind === "eps" && q.row === i) ? { tex: "\\varepsilon" } : fmt(x, 6)))]);
  return {
    results: [
      { label: "الحكم", value: verdict },
      { label: "تغيرات الإشارة في العمود الأول", value: T.changes },
      { label: "جذور في نصف المستوى الأيمن (RHP)", value: rhp, text: `RHP = ${rhp}` },
      { label: "جذور على المحور التخيلي", value: jw }
    ],
    blocks: [{ type: "table", caption: "جدول روث", head: ["", ...Array.from({ length: T.rows[0].length }, (_, k) => `العمود ${k + 1}`)], rows }],
    steps, copy: `${verdict}, RHP = ${rhp}, sign changes = ${T.changes}`
  };
}
