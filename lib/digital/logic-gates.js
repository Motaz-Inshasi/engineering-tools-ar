import { choice, str, fail } from "../core/validate.js";

const GATES = [["AND", "AND"], ["OR", "OR"], ["NOT", "NOT"], ["NAND", "NAND"], ["NOR", "NOR"], ["XOR", "XOR"], ["XNOR", "XNOR"], ["BUF", "BUFFER"]];

export const meta = {
  description: "احسب خرج أي بوابة منطقية (AND و OR و NOT و NAND و NOR و XOR و XNOR) لعدد من المداخل حتى 8، مع جدول الحقيقة الكامل للبوابة ورمزها الجبري.",
  keywords: ["بوابات منطقية", "logic gates", "AND", "OR", "NAND", "NOR", "XOR", "XNOR", "NOT", "بوابة"],
  formulas: [
    { label: "البوابات الأساسية", tex: "\\text{AND}: A\\cdot B,\\quad \\text{OR}: A + B,\\quad \\text{NOT}: \\overline{A}" },
    { label: "المشتقة منها", tex: "\\text{NAND}: \\overline{A\\cdot B},\\quad \\text{NOR}: \\overline{A + B},\\quad \\text{XOR}: A \\oplus B,\\quad \\text{XNOR}: \\overline{A \\oplus B}" }
  ],
  inputs: [
    { id: "gate", label: "البوابة", type: "select", default: "XOR", options: GATES },
    { id: "bits", label: "قيم المداخل", type: "text", default: "1 0 1", help: "قيم 0 أو 1 مفصولة بمسافات. NOT و BUFFER تأخذان مدخلاً واحداً." }
  ],
  example: { values: { gate: "XOR", bits: "1 0 1" }, expect: ["Y = 0"], note: "مثال: XOR بثلاثة مداخل يعطي 1 فقط عندما يكون عدد الآحاد فردياً." },
  invalid: { values: { gate: "AND", bits: "1 2" } },
  related: ["truth-table", "boolean-simplifier", "flip-flops"]
};

export function gate(name, ins) {
  const and = ins.every(Boolean), or = ins.some(Boolean), xor = ins.filter(Boolean).length % 2 === 1;
  const v = { AND: and, OR: or, NAND: !and, NOR: !or, XOR: xor, XNOR: !xor, NOT: !ins[0], BUF: !!ins[0] }[name];
  return v ? 1 : 0;
}

const DESC = {
  AND: "الخرج 1 فقط إذا كانت كل المداخل 1.",
  OR: "الخرج 1 إذا كان أي مدخل 1.",
  NAND: "عكس AND: الخرج 0 فقط إذا كانت كل المداخل 1. بوابة شاملة يمكن بناء أي دائرة منها.",
  NOR: "عكس OR: الخرج 1 فقط إذا كانت كل المداخل 0. بوابة شاملة أيضاً.",
  XOR: "الخرج 1 إذا كان عدد الآحاد فردياً (لمدخلين: إذا اختلفا).",
  XNOR: "الخرج 1 إذا كان عدد الآحاد زوجياً (لمدخلين: إذا تساويا).",
  NOT: "يعكس المدخل.",
  BUF: "ينقل المدخل كما هو (يُستخدم لتقوية الإشارة)."
};

const TEX = { AND: (v) => v.join(" \\cdot "), OR: (v) => v.join(" + "), NAND: (v) => `\\overline{${v.join(" \\cdot ")}}`, NOR: (v) => `\\overline{${v.join(" + ")}}`, XOR: (v) => v.join(" \\oplus "), XNOR: (v) => `\\overline{${v.join(" \\oplus ")}}`, NOT: (v) => `\\overline{${v[0]}}`, BUF: (v) => v[0] };

export function solve(input) {
  const g = choice(input, "gate", "البوابة", GATES.map((x) => x[0]), "AND");
  const raw = str(input, "bits", "قيم المداخل").split(/[\s,،]+/).filter(Boolean);
  if (raw.some((b) => b !== "0" && b !== "1")) fail("كل قيمة مدخل يجب أن تكون 0 أو 1.", "bits");
  const ins = raw.map(Number);
  const single = g === "NOT" || g === "BUF";
  if (single && ins.length !== 1) fail(`البوابة ${g} تأخذ مدخلاً واحداً فقط.`, "bits");
  if (!single && (ins.length < 2 || ins.length > 8)) fail("عدد المداخل يجب أن يكون من 2 إلى 8.", "bits");
  const names = ins.map((_, i) => String.fromCharCode(65 + i));
  const y = gate(g, ins);
  const steps = [
    DESC[g],
    { text: "التعبير الجبري:", tex: `Y = ${TEX[g](names)}` },
    { text: "بالتعويض:", tex: `Y = ${TEX[g](ins.map(String))} = ${y}` }
  ];
  const n = ins.length;
  const rows = [];
  if (n <= 5) for (let m = 0; m < 1 << n; m++) {
    const b = [...m.toString(2).padStart(n, "0")].map(Number);
    const out = gate(g, b);
    const cur = b.every((x, i) => x === ins[i]);
    rows.push([...b.map((x) => (cur ? { text: String(x), color: "var(--accent-soft)", fg: "var(--text)" } : String(x))), cur ? { text: String(out), color: "var(--accent-soft)", fg: "var(--text)" } : String(out)]);
  }
  return {
    results: [{ label: "الخرج Y", value: y, text: `Y = ${y}` }, { label: "البوابة", value: `${g} بـ ${n} ${n === 1 ? "مدخل" : "مداخل"}` }],
    blocks: rows.length ? [{ type: "table", ltr: true, caption: "جدول حقيقة البوابة (الصف المظلل هو المداخل الحالية)", head: [...names, "Y"], rows }] : [],
    steps, copy: `${g}(${ins.join(", ")}) → Y = ${y}`
  };
}
