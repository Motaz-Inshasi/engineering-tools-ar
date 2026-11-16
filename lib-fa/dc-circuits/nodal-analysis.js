import { parseNetlist, solveMNA, kclResiduals } from "../core/circuit.js";
import { matTex } from "../core/matrix.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

export const NETLIST_HELP = "هر سطر یک عنصر: نام گره1 گره2 مقدار. R مقاومت، V منبع ولتاژ (گره1 پایانه مثبت است)، I منبع جریان (جریان از گره1 به گره2 از درون آن عبور می‌کند). گره 0 زمین است.";

export const meta = {
  description: "حل هر مدار جریان مستقیم با تحلیل گره اصلاح‌شده (MNA) از فهرستی از عناصر ساده: ولتاژ گره‌ها، و جریان و ولتاژ و توان هر عنصر، همراه با معادلات KCL و صورت ماتریسی و بررسی با قوانین کیرشهف و توازن توان.",
  keywords: ["تحلیل گره", "nodal analysis", "KCL", "کیرشهف", "ولتاژ گره", "MNA", "حل مدارها", "قانون جریان"],
  formulas: [
    { label: "قانون جریان کیرشهف در هر گره", tex: "\\sum_{k} \\frac{V_n - V_k}{R_{nk}} + \\sum I_{out} = 0" },
    { label: "صورت ماتریسی (MNA)", tex: "\\begin{bmatrix} G & B \\\\ B^T & 0 \\end{bmatrix}\\begin{bmatrix} \\mathbf{v} \\\\ \\mathbf{i}_V \\end{bmatrix} = \\begin{bmatrix} \\mathbf{i}_s \\\\ \\mathbf{e} \\end{bmatrix}" }
  ],
  inputs: [
    { id: "net", label: "عناصر مدار", type: "textarea", rows: 6, default: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k", help: NETLIST_HELP }
  ],
  example: { values: { net: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k" }, expect: ["V(2) = 7.5 V", "V(3) = 7.125 V"], note: "مثال: یک منبع ولتاژ، یک منبع جریان و چهار مقاومت." },
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
    `گره‌های غیرزمینی: ${sol.nodes.join("، ")}. مجهول‌ها: ولتاژ هر گره${sol.m ? ` و جریان هر منبع ولتاژ (${sol.m})` : ""}.`,
    "قانون جریان کیرشهف را در هر گره می‌نویسیم (مجموع جریان‌های خروجی = 0):",
    ...sol.nodes.map((nd) => ({ tex: kclTex(nd, els) })),
    ...els.filter((e) => e.kind === "V").map((e) => ({ text: `و معادله منبع ولتاژ ${e.name}:`, tex: `${e.a === "0" ? "0" : `V_{${e.a}}`} - ${e.b === "0" ? "0" : `V_{${e.b}}`} = ${ntex(e.value)}` })),
    { text: "به صورت ماتریسی:", tex: `${matTex(sol.A)}\\mathbf{x} = ${matTex(sol.z.map((v) => [v]))}` },
    "دستگاه را با حذف گاوس حل می‌کنیم تا ولتاژ گره‌ها به دست آید، و از آن‌ها جریان هر عنصر: $I = (V_a - V_b)/R$."
  ];
  const resid = Object.values(kclResiduals(sol));
  const pSum = sol.branches.reduce((s, b) => s + b.p, 0);
  steps.push({ text: "بررسی: بزرگ‌ترین خطای KCL در گره‌ها، و مجموع توان‌های جذب‌شده (باید صفر باشد، زیرا توان تولیدشده = توان مصرف‌شده):", tex: `\\max|\\textstyle\\sum I| = ${ntex(Math.max(0, ...resid.map(Math.abs)), 2)}\\ A,\\qquad \\textstyle\\sum P = ${ntex(pSum, 2)}\\ W` });
  const rows = sol.branches.map((b) => [b.name, `${b.a} → ${b.b}`, eng(b.v, "V", 5), eng(b.i, "A", 5), eng(b.p, "W", 4), b.p < -1e-15 ? "تولید می‌کند" : "مصرف می‌کند"]);
  return {
    results: sol.nodes.map((nd) => ({ label: `ولتاژ گره ${nd}`, value: eng(sol.V[nd], "V", 6), text: `V(${nd}) = ${eng(sol.V[nd], "V", 6)}` })),
    blocks: [{ type: "table", caption: "عناصر (جریان داخل عنصر از گره اول به گره دوم مثبت است)", head: ["عنصر", "جهت", "ولتاژ", "جریان", "توان جذب‌شده", "نقش"], rows }],
    steps, copy: sol.nodes.map((nd) => `V(${nd}) = ${eng(sol.V[nd], "V", 6)}`).join("\n")
  };
}
