import { str, fail } from "../core/validate.js";
import { parseNumber, eng, fmt, tex as ntex } from "../core/format.js";
import { solveLinear, matTex, mvec } from "../core/matrix.js";

export const meta = {
  description: "حل الدوائر المستوية بتحليل الحلقات (التيارات الحلقية): بناء معادلات KVL ومصفوفة المقاومات وحلها، ثم تيار كل فرع، مع التحقق من KVL في كل حلقة.",
  keywords: ["تحليل الحلقات", "mesh analysis", "KVL", "كيرشوف للجهد", "تيارات حلقية", "مصفوفة المقاومات"],
  formulas: [
    { label: "قانون كيرشوف للجهد لكل حلقة", tex: "\\sum_{\\text{loop}} R\\,I = \\sum_{\\text{loop}} V_s" },
    { label: "الصيغة المصفوفية", tex: "R_{ii} = \\sum R_{\\text{loop } i},\\quad R_{ij} = -R_{\\text{shared}},\\quad [R]\\,\\mathbf{I} = \\mathbf{V}" }
  ],
  inputs: [
    { id: "br", label: "الفروع", type: "textarea", rows: 6, default: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5", help: "كل سطر فرع: الحلقة1 الحلقة2 المقاومة الجهد. الحلقة2 = 0 إذا كان الفرع على الحافة الخارجية. الجهد موجب إذا كان يدفع التيار في اتجاه دوران الحلقة1 (مع عقارب الساعة)." }
  ],
  example: { values: { br: "1 0 2 10\n1 2 4 0\n2 0 6 0\n2 0 0 -5" }, expect: ["I1 = 1.81818 A", "I2 = 227.273 mA"], note: "مثال: حلقتان تشتركان في مقاومة 4 Ω، مع مصدر 10 V في الأولى ومصدر 5 V معاكس في الثانية." },
  invalid: { values: { br: "1 0 0 5" } },
  related: ["nodal-analysis", "thevenin-norton", "linear-system"]
};

export function parseBranches(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.replace(/[#;].*$/, "").trim()).filter(Boolean);
  if (!lines.length) fail("أدخل فروع الدائرة، فرع في كل سطر.", "br");
  if (lines.length > 50) fail("أقصى عدد للفروع 50.", "br");
  return lines.map((line, i) => {
    const p = line.split(/[\s,،]+/);
    const where = `السطر ${i + 1} («${line}»)`;
    if (p.length < 3 || p.length > 4) fail(`${where}: الصيغة: الحلقة1 الحلقة2 المقاومة [الجهد].`, "br");
    const [a, b] = [Number(p[0]), Number(p[1])];
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(b) || b < 0) fail(`${where}: رقم الحلقة الأولى يبدأ من 1، والثانية 0 أو رقم حلقة.`, "br");
    if (a === b) fail(`${where}: الحلقتان متطابقتان.`, "br");
    const R = parseNumber(p[2]), V = p.length === 4 ? parseNumber(p[3]) : 0;
    if (!isFinite(R) || R < 0) fail(`${where}: المقاومة يجب أن تكون رقماً غير سالب.`, "br");
    if (!isFinite(V)) fail(`${where}: الجهد ليس رقماً صحيحاً.`, "br");
    return { a, b, R, V, line };
  });
}

export function meshSolve(branches) {
  const M = Math.max(...branches.flatMap((x) => [x.a, x.b]));
  for (let k = 1; k <= M; k++) if (!branches.some((x) => x.a === k || x.b === k)) fail(`الحلقة ${k} لا تحتوي أي فرع. رقّم الحلقات تباعاً من 1.`, "br");
  const R = Array.from({ length: M }, () => new Array(M).fill(0));
  const V = new Array(M).fill(0);
  for (const x of branches) {
    R[x.a - 1][x.a - 1] += x.R;
    V[x.a - 1] += x.V;
    if (x.b > 0) {
      R[x.b - 1][x.b - 1] += x.R;
      R[x.a - 1][x.b - 1] -= x.R;
      R[x.b - 1][x.a - 1] -= x.R;
      V[x.b - 1] -= x.V;
    }
  }
  const res = solveLinear(R, V);
  if (res.rankA < M) fail("مصفوفة المقاومات منفردة: تأكد أن كل حلقة تحتوي مقاومة وأن الحلقات مستقلة.", "br");
  const I = res.R.slice(0, M).map((r) => r[M]);
  return { M, R, V, I };
}

export function solve(input) {
  const branches = parseBranches(str(input, "br", "الفروع"));
  const { M, R, V, I } = meshSolve(branches);
  const steps = [`عدد الحلقات ${M}. نفرض تيار حلقة $I_k$ مع عقارب الساعة في كل حلقة.`];
  for (let k = 0; k < M; k++) {
    const lhs = R[k].map((r, j) => (r === 0 ? null : `${j === k ? "" : ""}${ntex(r)} I_{${j + 1}}`)).filter(Boolean).join(" + ").replace(/\+ -/g, "- ");
    steps.push({ text: `KVL في الحلقة ${k + 1} (المقاومة الذاتية على القطر، والمشتركة بإشارة سالبة):`, tex: `${lhs} = ${ntex(V[k])}` });
  }
  steps.push({ text: "بالصيغة المصفوفية:", tex: `${matTex(R)}\\begin{bmatrix}${I.map((_, k) => `I_{${k + 1}}`).join("\\\\")}\\end{bmatrix} = ${matTex(V.map((v) => [v]))}` });
  const resid = mvec(R, I).map((x, k) => x - V[k]);
  steps.push({ text: "بعد الحل عوّضنا التيارات في معادلات KVL، فكان أكبر فرق:", tex: `${ntex(Math.max(...resid.map(Math.abs)), 2)}\\ V` });
  const rows = branches.map((x) => {
    const ib = I[x.a - 1] - (x.b > 0 ? I[x.b - 1] : 0);
    return [x.line, x.b > 0 ? `I${x.a} − I${x.b}` : `I${x.a}`, eng(ib, "A", 5), eng(ib * x.R, "V", 5), eng(ib * ib * x.R, "W", 4)];
  });
  steps.push("تيار الفرع المشترك بين حلقتين = الفرق بين تياري الحلقتين.");
  return {
    results: I.map((i, k) => ({ label: `تيار الحلقة ${k + 1}`, value: eng(i, "A", 6), text: `I${k + 1} = ${eng(i, "A", 6)}` })),
    blocks: [{ type: "table", caption: "تيارات الفروع (موجبة في اتجاه دوران الحلقة الأولى)", head: ["الفرع", "التيار", "قيمته", "جهد المقاومة", "قدرة المقاومة"], rows }],
    steps, copy: I.map((i, k) => `I${k + 1} = ${eng(i, "A", 6)}`).join("\n")
  };
}
