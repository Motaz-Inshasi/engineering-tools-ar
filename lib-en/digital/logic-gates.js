import { choice, str, fail } from "../core/validate.js";

const GATES = [["AND", "AND"], ["OR", "OR"], ["NOT", "NOT"], ["NAND", "NAND"], ["NOR", "NOR"], ["XOR", "XOR"], ["XNOR", "XNOR"], ["BUF", "BUFFER"]];

export const meta = {
  description: "Calculate the output of any logic gate (AND, OR, NOT, NAND, NOR, XOR, XNOR) for up to 8 inputs, with the gate's complete truth table and its algebraic symbol.",
  keywords: ["logic gates", "logic gates", "AND", "OR", "NAND", "NOR", "XOR", "XNOR", "NOT", "gate"],
  formulas: [
    { label: "Basic gates", tex: "\\text{AND}: A\\cdot B,\\quad \\text{OR}: A + B,\\quad \\text{NOT}: \\overline{A}" },
    { label: "Derived from them", tex: "\\text{NAND}: \\overline{A\\cdot B},\\quad \\text{NOR}: \\overline{A + B},\\quad \\text{XOR}: A \\oplus B,\\quad \\text{XNOR}: \\overline{A \\oplus B}" }
  ],
  inputs: [
    { id: "gate", label: "Gate", type: "select", default: "XOR", options: GATES },
    { id: "bits", label: "Input values", type: "text", default: "1 0 1", help: "0 or 1 values separated by spaces. NOT and BUFFER take a single input." }
  ],
  example: { values: { gate: "XOR", bits: "1 0 1" }, expect: ["Y = 0"], note: "Example: a three-input XOR gives 1 only when the number of ones is odd." },
  invalid: { values: { gate: "AND", bits: "1 2" } },
  related: ["truth-table", "boolean-simplifier", "flip-flops"]
};

export function gate(name, ins) {
  const and = ins.every(Boolean), or = ins.some(Boolean), xor = ins.filter(Boolean).length % 2 === 1;
  const v = { AND: and, OR: or, NAND: !and, NOR: !or, XOR: xor, XNOR: !xor, NOT: !ins[0], BUF: !!ins[0] }[name];
  return v ? 1 : 0;
}

const DESC = {
  AND: "The output is 1 only if all inputs are 1.",
  OR: "The output is 1 if any input is 1.",
  NAND: "NAND: the output is 0 only if all inputs are 1. A universal gate from which any circuit can be built.",
  NOR: "NOR: the output is 1 only if all inputs are 0. Also a universal gate.",
  XOR: "The output is 1 if the number of ones is odd (for two inputs: if they differ).",
  XNOR: "The output is 1 if the number of ones is even (for two inputs: if they are equal).",
  NOT: "Inverts the input.",
  BUF: "Passes the input unchanged (used to strengthen the signal)."
};

const TEX = { AND: (v) => v.join(" \\cdot "), OR: (v) => v.join(" + "), NAND: (v) => `\\overline{${v.join(" \\cdot ")}}`, NOR: (v) => `\\overline{${v.join(" + ")}}`, XOR: (v) => v.join(" \\oplus "), XNOR: (v) => `\\overline{${v.join(" \\oplus ")}}`, NOT: (v) => `\\overline{${v[0]}}`, BUF: (v) => v[0] };

export function solve(input) {
  const g = choice(input, "gate", "Gate", GATES.map((x) => x[0]), "AND");
  const raw = str(input, "bits", "Input values").split(/[\s,،]+/).filter(Boolean);
  if (raw.some((b) => b !== "0" && b !== "1")) fail("Each input value must be 0 or 1.", "bits");
  const ins = raw.map(Number);
  const single = g === "NOT" || g === "BUF";
  if (single && ins.length !== 1) fail(`Gate ${g} takes only one input.`, "bits");
  if (!single && (ins.length < 2 || ins.length > 8)) fail("The number of inputs must be from 2 to 8.", "bits");
  const names = ins.map((_, i) => String.fromCharCode(65 + i));
  const y = gate(g, ins);
  const steps = [
    DESC[g],
    { text: "Algebraic expression:", tex: `Y = ${TEX[g](names)}` },
    { text: "By substitution:", tex: `Y = ${TEX[g](ins.map(String))} = ${y}` }
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
    results: [{ label: "Output Y", value: y, text: `Y = ${y}` }, { label: "Gate", value: `${g} with ${n} ${n === 1 ? "input" : "inputs"}` }],
    blocks: rows.length ? [{ type: "table", ltr: true, caption: "Gate truth table (the highlighted row is the current inputs)", head: [...names, "Y"], rows }] : [],
    steps, copy: `${g}(${ins.join(", ")}) → Y = ${y}`
  };
}
