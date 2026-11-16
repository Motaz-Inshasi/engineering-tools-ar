import { choice, str, fail, isBlank } from "../core/validate.js";

const TYPES = [["SR", "SR"], ["D", "D"], ["JK", "JK"], ["T", "T"]];

export const meta = {
  description: "مرجع وحاسبة القلابات (Flip-Flops) من أنواع SR و D و JK و T: المعادلة المميزة وجدول الخصائص وجدول الإثارة، والحالة التالية لأي مدخلات، وجدول توقيت لسلسلة نبضات ساعة.",
  keywords: ["قلاب", "flip flop", "JK", "D flip flop", "SR", "T flip flop", "جدول الإثارة", "المعادلة المميزة", "دوائر تتابعية"],
  formulas: [
    { label: "المعادلات المميزة", tex: "D: Q^+ = D,\\quad T: Q^+ = T \\oplus Q,\\quad JK: Q^+ = J\\overline{Q} + \\overline{K}Q" },
    { label: "SR (مع S·R = 0)", tex: "Q^+ = S + \\overline{R}Q" }
  ],
  inputs: [
    { id: "type", label: "نوع القلاب", type: "select", default: "JK", options: TYPES },
    { id: "q0", label: "الحالة الحالية Q", type: "select", default: "0", options: [["0", "0"], ["1", "1"]] },
    { id: "seq", label: "المدخلات لكل نبضة ساعة", type: "textarea", rows: 4, default: "1 0\n1 1\n0 0\n1 1\n0 1", help: "سطر لكل نبضة. SR: «S R»، JK: «J K»، D: «D»، T: «T»." }
  ],
  example: { values: { type: "JK", q0: "0", seq: "1 0\n1 1\n0 0\n1 1\n0 1" }, expect: ["Q = 1, 0, 0, 1, 0"], note: "مثال: قلاب JK يبدأ من 0 مع خمس نبضات ساعة." },
  invalid: { values: { type: "SR", q0: "0", seq: "1 1" } },
  related: ["logic-gates", "truth-table", "boolean-simplifier"]
};

export function next(type, q, ins) {
  switch (type) {
    case "D": return ins[0];
    case "T": return ins[0] ^ q;
    case "JK": { const [j, k] = ins; return (j & (q ^ 1)) | ((k ^ 1) & q); }
    case "SR": { const [s, r] = ins; if (s && r) return null; return s | ((r ^ 1) & q); }
  }
  return null;
}

const CHAR = {
  SR: [["S", "R", "Q⁺", "العمل"], [["0", "0", "Q", "تثبيت"], ["0", "1", "0", "مسح (Reset)"], ["1", "0", "1", "ضبط (Set)"], ["1", "1", "؟", "ممنوع"]]],
  D: [["D", "Q⁺", "العمل"], [["0", "0", "مسح"], ["1", "1", "ضبط"]]],
  JK: [["J", "K", "Q⁺", "العمل"], [["0", "0", "Q", "تثبيت"], ["0", "1", "0", "مسح"], ["1", "0", "1", "ضبط"], ["1", "1", "Q'", "قلب (Toggle)"]]],
  T: [["T", "Q⁺", "العمل"], [["0", "Q", "تثبيت"], ["1", "Q'", "قلب"]]]
};

const EXC = {
  SR: [["Q", "Q⁺", "S", "R"], [["0", "0", "0", "X"], ["0", "1", "1", "0"], ["1", "0", "0", "1"], ["1", "1", "X", "0"]]],
  D: [["Q", "Q⁺", "D"], [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "0"], ["1", "1", "1"]]],
  JK: [["Q", "Q⁺", "J", "K"], [["0", "0", "0", "X"], ["0", "1", "1", "X"], ["1", "0", "X", "1"], ["1", "1", "X", "0"]]],
  T: [["Q", "Q⁺", "T"], [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "1"], ["1", "1", "0"]]]
};

export function solve(input) {
  const type = choice(input, "type", "النوع", TYPES.map((t) => t[0]), "JK");
  let q = Number(choice(input, "q0", "الحالة الحالية", ["0", "1"], "0"));
  const width = type === "SR" || type === "JK" ? 2 : 1;
  const lines = isBlank(input.seq) ? [] : str(input, "seq", "المدخلات").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) fail("أدخل مدخلات نبضة ساعة واحدة على الأقل.", "seq");
  if (lines.length > 64) fail("أقصى عدد للنبضات 64.", "seq");
  const rows = [], outs = [];
  const q0 = q;
  lines.forEach((l, i) => {
    const ins = l.split(/[\s,،]+/).filter(Boolean);
    if (ins.length !== width || ins.some((b) => b !== "0" && b !== "1")) fail(`السطر ${i + 1}: أدخل ${width === 2 ? "قيمتين" : "قيمة واحدة"} من 0 و 1.`, "seq");
    const v = ins.map(Number);
    const nq = next(type, q, v);
    if (nq === null) fail(`السطر ${i + 1}: S = R = 1 حالة ممنوعة في قلاب SR.`, "seq");
    rows.push([String(i + 1), ...ins, String(q), String(nq)]);
    outs.push(nq);
    q = nq;
  });
  const names = type === "SR" ? ["S", "R"] : type === "JK" ? ["J", "K"] : [type];
  const steps = [
    { text: "المعادلة المميزة للقلاب:", tex: { SR: "Q^+ = S + \\overline{R}Q", D: "Q^+ = D", JK: "Q^+ = J\\overline{Q} + \\overline{K}Q", T: "Q^+ = T \\oplus Q" }[type] },
    `نبدأ من Q = ${q0}، وعند كل حافة ساعة نعوّض المدخلات والحالة الحالية في المعادلة لنحصل على الحالة التالية (انظر جدول التوقيت).`,
    "جدول الإثارة يُستخدم في تصميم العدادات: يعطي المدخلات اللازمة للانتقال من حالة إلى أخرى (X = لا يهم)."
  ];
  const wave = [[0, q0]];
  outs.forEach((v, i) => { wave.push([i + 1, wave[wave.length - 1][1]], [i + 1, v]); });
  wave.push([outs.length + 1, outs[outs.length - 1]]);
  const qs = `Q = ${outs.join(", ")}`;
  return {
    results: [{ label: "تسلسل الحالات بعد كل نبضة", value: qs, text: qs }, { label: "الحالة النهائية", value: q }],
    blocks: [
      { type: "table", ltr: true, caption: "جدول التوقيت", head: ["النبضة", ...names, "Q", "Q⁺"], rows },
      { type: "plot", title: "مخطط Q عبر النبضات", xLabel: "النبضة", yLabel: "Q", yMin: -0.3, yMax: 1.3, series: [{ name: "Q", points: wave }] },
      { type: "table", caption: `جدول الخصائص للقلاب ${type}`, head: CHAR[type][0], rows: CHAR[type][1] },
      { type: "table", caption: `جدول الإثارة للقلاب ${type}`, head: EXC[type][0], rows: EXC[type][1] }
    ],
    steps, copy: qs
  };
}
