import { choice, str, fail, isBlank } from "../core/validate.js";

const TYPES = [["SR", "SR"], ["D", "D"], ["JK", "JK"], ["T", "T"]];

export const meta = {
  description: "Reference and calculator for flip-flops of types SR, D, JK, and T: the characteristic equation, the characteristic table, and the excitation table, the next state for any inputs, and a timing diagram for a series of clock pulses.",
  keywords: ["flip-flop", "flip flop", "JK", "D flip flop", "SR", "T flip flop", "excitation table", "characteristic equation", "sequential circuits"],
  formulas: [
    { label: "Characteristic equations", tex: "D: Q^+ = D,\\quad T: Q^+ = T \\oplus Q,\\quad JK: Q^+ = J\\overline{Q} + \\overline{K}Q" },
    { label: "SR (with S·R = 0)", tex: "Q^+ = S + \\overline{R}Q" }
  ],
  inputs: [
    { id: "type", label: "Flip-flop type", type: "select", default: "JK", options: TYPES },
    { id: "q0", label: "Current state Q", type: "select", default: "0", options: [["0", "0"], ["1", "1"]] },
    { id: "seq", label: "Inputs per clock pulse", type: "textarea", rows: 4, default: "1 0\n1 1\n0 0\n1 1\n0 1", help: "One line per pulse. SR: “S R”, JK: “J K”, D: “D”, T: “T”." }
  ],
  example: { values: { type: "JK", q0: "0", seq: "1 0\n1 1\n0 0\n1 1\n0 1" }, expect: ["Q = 1, 0, 0, 1, 0"], note: "Example: a JK flip-flop starting from 0 with five clock pulses." },
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
  SR: [["S", "R", "Q⁺", "Operation"], [["0", "0", "Q", "Hold"], ["0", "1", "0", "Reset"], ["1", "0", "1", "Set"], ["1", "1", "؟", "Forbidden"]]],
  D: [["D", "Q⁺", "Operation"], [["0", "0", "Reset"], ["1", "1", "Set"]]],
  JK: [["J", "K", "Q⁺", "Operation"], [["0", "0", "Q", "Hold"], ["0", "1", "0", "Reset"], ["1", "0", "1", "Set"], ["1", "1", "Q'", "Toggle"]]],
  T: [["T", "Q⁺", "Operation"], [["0", "Q", "Hold"], ["1", "Q'", "Toggle"]]]
};

const EXC = {
  SR: [["Q", "Q⁺", "S", "R"], [["0", "0", "0", "X"], ["0", "1", "1", "0"], ["1", "0", "0", "1"], ["1", "1", "X", "0"]]],
  D: [["Q", "Q⁺", "D"], [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "0"], ["1", "1", "1"]]],
  JK: [["Q", "Q⁺", "J", "K"], [["0", "0", "0", "X"], ["0", "1", "1", "X"], ["1", "0", "X", "1"], ["1", "1", "X", "0"]]],
  T: [["Q", "Q⁺", "T"], [["0", "0", "0"], ["0", "1", "1"], ["1", "0", "1"], ["1", "1", "0"]]]
};

export function solve(input) {
  const type = choice(input, "type", "Type", TYPES.map((t) => t[0]), "JK");
  let q = Number(choice(input, "q0", "Current state", ["0", "1"], "0"));
  const width = type === "SR" || type === "JK" ? 2 : 1;
  const lines = isBlank(input.seq) ? [] : str(input, "seq", "Inputs").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) fail("Enter inputs for at least one clock pulse.", "seq");
  if (lines.length > 64) fail("The maximum number of pulses is 64.", "seq");
  const rows = [], outs = [];
  const q0 = q;
  lines.forEach((l, i) => {
    const ins = l.split(/[\s,،]+/).filter(Boolean);
    if (ins.length !== width || ins.some((b) => b !== "0" && b !== "1")) fail(`Line ${i + 1}: enter ${width === 2 ? "two values" : "one value"} using only 0 and 1.`, "seq");
    const v = ins.map(Number);
    const nq = next(type, q, v);
    if (nq === null) fail(`Line ${i + 1}: S = R = 1 is a forbidden state in an SR flip-flop.`, "seq");
    rows.push([String(i + 1), ...ins, String(q), String(nq)]);
    outs.push(nq);
    q = nq;
  });
  const names = type === "SR" ? ["S", "R"] : type === "JK" ? ["J", "K"] : [type];
  const steps = [
    { text: "Characteristic equation of the flip-flop:", tex: { SR: "Q^+ = S + \\overline{R}Q", D: "Q^+ = D", JK: "Q^+ = J\\overline{Q} + \\overline{K}Q", T: "Q^+ = T \\oplus Q" }[type] },
    `We start from Q = ${q0}, and at each clock edge we substitute the inputs and the current state into the equation to get the next state (see the timing table).`,
    "The excitation table is used in designing counters: it gives the inputs needed to move from one state to another (X = don't care)."
  ];
  const wave = [[0, q0]];
  outs.forEach((v, i) => { wave.push([i + 1, wave[wave.length - 1][1]], [i + 1, v]); });
  wave.push([outs.length + 1, outs[outs.length - 1]]);
  const qs = `Q = ${outs.join(", ")}`;
  return {
    results: [{ label: "State sequence after each pulse", value: qs, text: qs }, { label: "Final state", value: q }],
    blocks: [
      { type: "table", ltr: true, caption: "Timing table", head: ["Pulse", ...names, "Q", "Q⁺"], rows },
      { type: "plot", title: "Q across pulses", xLabel: "Pulse", yLabel: "Q", yMin: -0.3, yMax: 1.3, series: [{ name: "Q", points: wave }] },
      { type: "table", caption: `Characteristic table of the ${type} flip-flop`, head: CHAR[type][0], rows: CHAR[type][1] },
      { type: "table", caption: `Excitation table of the ${type} flip-flop`, head: EXC[type][0], rows: EXC[type][1] }
    ],
    steps, copy: qs
  };
}
