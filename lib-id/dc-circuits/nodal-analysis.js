import { parseNetlist, solveMNA, kclResiduals } from "../core/circuit.js";
import { matTex } from "../core/matrix.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

export const NETLIST_HELP = "كل سطر عنصر: الاسم العقدة1 العقدة2 القيمة. R مقاومة، V مصدر جهد (العقدة1 هي الطرف الموجب)، I مصدر تيار (يتدفق داخله من العقدة1 إلى العقدة2). العقدة 0 هي الأرضي.";

export const meta = {
  description: "حل أي دائرة تيار مستمر بتحليل العقد المعدّل (MNA) من قائمة عناصر بسيطة: جهود العقد وتيار وجهد وقدرة كل عنصر، مع معادلات KCL والمصفوفة والتحقق بقانوني كيرشوف وتوازن القدرة.",
  keywords: ["تحليل العقد", "nodal analysis", "KCL", "كيرشوف", "جهد العقد", "MNA", "حل الدوائر", "قانون التيار"],
  formulas: [
    { label: "قانون كيرشوف للتيار عند كل عقدة", tex: "\\sum_{k} \\frac{V_n - V_k}{R_{nk}} + \\sum I_{out} = 0" },
    { label: "الصيغة المصفوفية (MNA)", tex: "\\begin{bmatrix} G & B \\\\ B^T & 0 \\end{bmatrix}\\begin{bmatrix} \\mathbf{v} \\\\ \\mathbf{i}_V \\end{bmatrix} = \\begin{bmatrix} \\mathbf{i}_s \\\\ \\mathbf{e} \\end{bmatrix}" }
  ],
  inputs: [
    { id: "net", label: "عناصر الدائرة", type: "textarea", rows: 6, default: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k", help: NETLIST_HELP }
  ],
  example: { values: { net: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k" }, expect: ["V(2) = 7.5 V", "V(3) = 7.125 V"], note: "مثال: مصدر جهد ومصدر تيار وأربع مقاومات." },
  invalid: { values: { net: "V1 1 0 5\nR1 2 3 10" } },
  related: ["mesh-analysis", "thevenin-norton", "linear-system", "voltage-current-divider"]
};

function kclTex(node, els) {
  const terms = [];
  for (const e of els) {
    if (e.a !== node && e.b !== node) continue;
    const other = e.a === node ? e.b : e.a;
    const vo = other === "0" ? "0" : `V_{${other}}`;
    if (e.kind === "R") terms.push(other === "0" ? `\\frac{V_{${node}}}{${ntex(e.value)}}` : `\\frac{V_{${node}} - ${vo}}{${ntex(e.value)}}`);
    else if (e.kind === "I") terms.push(`${e.a === node ? "+" : "-"}${ntex(e.value)}`);
    else terms.push(`${e.a === node ? "+" : "-"}I_{${e.name}}`);
  }
  return terms.join(" + ").replace(/\+ -/g, "- ").replace(/\+ \+/g, "+ ") + " = 0";
}

export function solve(input) {
  const els = parseNetlist(input.net, "net");
  const sol = solveMNA(els, "net");
  const steps = [
    `العقد غير الأرضية: ${sol.nodes.join("، ")}. المجاهيل: جهد كل عقدة${sol.m ? ` وتيار كل مصدر جهد (${sol.m})` : ""}.`,
    "نكتب قانون كيرشوف للتيار عند كل عقدة (مجموع التيارات الخارجة = 0):",
    ...sol.nodes.map((nd) => ({ tex: kclTex(nd, els) })),
    ...els.filter((e) => e.kind === "V").map((e) => ({ text: `ومعادلة مصدر الجهد ${e.name}:`, tex: `${e.a === "0" ? "0" : `V_{${e.a}}`} - ${e.b === "0" ? "0" : `V_{${e.b}}`} = ${ntex(e.value)}` })),
    { text: "بالصيغة المصفوفية:", tex: `${matTex(sol.A)}\\mathbf{x} = ${matTex(sol.z.map((v) => [v]))}` },
    "نحل النظام بحذف غاوس فنحصل على جهود العقد، ومنها تيار كل عنصر: $I = (V_a - V_b)/R$."
  ];
  const resid = Object.values(kclResiduals(sol));
  const pSum = sol.branches.reduce((s, b) => s + b.p, 0);
  steps.push({ text: "التحقق: أكبر خطأ في KCL عند العقد، ومجموع القدرات الممتصة (يجب أن يساوي صفراً لأن القدرة المولدة = المستهلكة):", tex: `\\max|\\textstyle\\sum I| = ${ntex(Math.max(0, ...resid.map(Math.abs)), 2)}\\ A,\\qquad \\textstyle\\sum P = ${ntex(pSum, 2)}\\ W` });
  const rows = sol.branches.map((b) => [b.name, `${b.a} → ${b.b}`, eng(b.v, "V", 5), eng(b.i, "A", 5), eng(b.p, "W", 4), b.p < -1e-15 ? "يولّد" : "يستهلك"]);
  return {
    results: sol.nodes.map((nd) => ({ label: `جهد العقدة ${nd}`, value: eng(sol.V[nd], "V", 6), text: `V(${nd}) = ${eng(sol.V[nd], "V", 6)}` })),
    blocks: [{ type: "table", caption: "العناصر (التيار موجب من العقدة الأولى إلى الثانية داخل العنصر)", head: ["العنصر", "الاتجاه", "الجهد", "التيار", "القدرة الممتصة", "الدور"], rows }],
    steps, copy: sol.nodes.map((nd) => `V(${nd}) = ${eng(sol.V[nd], "V", 6)}`).join("\n")
  };
}
