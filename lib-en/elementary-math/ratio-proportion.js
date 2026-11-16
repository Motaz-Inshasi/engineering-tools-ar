import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["simplify", "solve", "divide", "direct", "inverse"];
const TERMS = ["a", "b", "c", "d"];
const N = (x) => fmt(x, 10);

export const meta = {
  description: "Simplify a ratio to whole numbers in its simplest form, solve the proportion a/b = c/d to find the unknown term, divide an amount in a given ratio, and solve direct and inverse proportion problems with steps.",
  keywords: ["ratio", "proportion", "ratio", "proportion", "dividing in a ratio", "direct proportion", "inverse proportion", "solving a proportion"],
  formulas: [
    { label: "Direct proportion", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_2}{x_1}" },
    { label: "Inverse proportion", tex: "y_1 x_1 = y_2 x_2\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_1}{x_2}" },
    { label: "Proportion a/b = c/d", tex: "a\\cdot d = b\\cdot c" }
  ],
  inputs: [
    { id: "mode", label: "Problem type", type: "select", default: "simplify", options: [["simplify", "Simplify a ratio to whole numbers"], ["solve", "Solve a proportion a/b = c/d (unknown term)"], ["divide", "Divide an amount in a given ratio"], ["direct", "direct proportion"], ["inverse", "inverse proportion"]] },
    { id: "ratio", label: "Ratio a:b(:c)", type: "text", default: "2:3:5", when: { mode: ["simplify", "divide"] }, help: "From 2 to 5 parts separated by colons; a decimal number is allowed." },
    { id: "total", label: "Total amount", type: "number", default: "1200", when: { mode: ["divide"] } },
    { id: "a", label: "Term a", type: "number", default: "2", when: { mode: ["solve"] }, help: "In the proportion to solve, leave only one term empty." },
    { id: "b", label: "Term b", type: "number", default: "3", when: { mode: ["solve"] } },
    { id: "c", label: "Term c", type: "number", default: "4", when: { mode: ["solve"] } },
    { id: "d", label: "Term d", type: "number", default: "", when: { mode: ["solve"] } },
    { id: "x1", label: "First value x₁", type: "number", default: "5", when: { mode: ["direct", "inverse"] }, help: "Example: 5 workers." },
    { id: "y1", label: "Corresponding value y₁", type: "number", default: "12", when: { mode: ["direct", "inverse"] }, help: "Example: 12 days." },
    { id: "x2", label: "Second value x₂", type: "number", default: "6", when: { mode: ["direct", "inverse"] }, help: "Example: 6 workers, and the result y₂ is the unknown." }
  ],
  example: {
    values: { mode: "inverse", ratio: "2:3:5", total: "1200", a: "", b: "", c: "", d: "", x1: "5", y1: "12", x2: "6" },
    expect: ["y₂ = 10"],
    note: "Example: 5 workers finish the job in 12 days; how many days do 6 workers need? (inverse proportion)"
  },
  invalid: { values: { mode: "solve", a: "2", b: "", c: "4", d: "" } },
  related: ["fractions", "percentage", "quadratic"]
};

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function ratioOf(input) {
  const raw = str(input, "ratio", "Ratio");
  const texts = raw.split(":").map((s) => s.trim());
  if (texts.length < 2 || texts.length > 5) fail("Enter a ratio of 2 to 5 parts separated by colons, such as 2:3:5.", "ratio");
  const parts = texts.map((t) => {
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) fail(`The part «${t}» in the ratio is not a positive number.`, "ratio");
    const [ip, fp = ""] = t.split(".");
    const n = BigInt(ip + fp);
    if (n === 0n) fail("The parts of the ratio must be greater than zero.", "ratio");
    return { n, scale: fp.length };
  });
  const K = Math.max(...parts.map((p) => p.scale));
  const scaled = parts.map((p) => p.n * 10n ** BigInt(K - p.scale));
  const g = scaled.reduce((x, y) => gcd(x, y));
  return { K, texts, scaled, g, red: scaled.map((x) => x / g) };
}

function simplifyMode(input) {
  const R = ratioOf(input);
  const steps = [];
  if (R.K > 0) steps.push({ text: `We multiply all the parts by ${10n ** BigInt(R.K)} to make them whole numbers:`, tex: `${R.texts.join(" : ")} = ${R.scaled.join(" : ")}` });
  if (R.g > 1n) {
    steps.push({ text: "Greatest common divisor of all the parts:", tex: `\\gcd(${R.scaled.join(", ")}) = ${R.g}` });
    steps.push({ text: "We divide each part by this divisor:", tex: `${R.scaled.join(" : ")} = ${R.red.join(" : ")}` });
  } else {
    steps.push({ text: "There is no common divisor greater than 1, so the ratio is already simplified:", tex: `\\gcd(${R.scaled.join(", ")}) = 1` });
  }
  const value = R.red.join(" : ");
  return {
    results: [{ label: "Ratio in simplest form", value }],
    steps,
    copy: `${R.texts.join(" : ")} = ${value}`
  };
}

function divideMode(input) {
  const R = ratioOf(input);
  const total = num(input, "total", "Total amount", { positive: true });
  const r = R.red.map((x) => Number(x));
  const S = r.reduce((x, y) => x + y, 0);
  const shares = r.map((x) => (total * x) / S);
  const steps = [
    { text: "We first simplify the ratio, then add its parts:", tex: `${R.texts.join(" : ")} = ${r.join(" : ")},\\quad S = ${r.join(" + ")} = ${S}` }
  ];
  r.forEach((x, i) => steps.push({ text: `Share of part ${i + 1} = amount × its part ÷ total:`, tex: `${ntex(total)} \\times \\frac{${x}}{${S}} = ${N(shares[i])}` }));
  steps.push({ text: "We check that the shares add up to the amount:", tex: `${shares.map((s) => N(s)).join(" + ")} = ${ntex(total)}` });
  return {
    results: r.map((x, i) => ({ label: `Share ${i + 1} (${x})`, value: N(shares[i]) })),
    steps,
    copy: `${N(total)} in the ratio ${R.red.join(":")} = ${shares.map((s) => N(s)).join(" : ")}`
  };
}

function solveMode(input) {
  const v = {};
  const blanks = [];
  for (const k of TERMS) {
    v[k] = num(input, k, `Term ${k}`, { optional: true });
    if (v[k] === null) blanks.push(k);
  }
  if (blanks.length !== 1) {
    fail(`Enter three terms and leave one term empty (you entered ${4 - blanks.length} terms).`, blanks.length > 1 ? blanks[1] : "a");
  }
  const k = blanks[0];
  if (k !== "b" && v.b === 0) fail("The denominator b cannot be zero in the proportion.", "b");
  if (k !== "d" && v.d === 0) fail("The denominator d cannot be zero in the proportion.", "d");
  const divisorKey = { a: "d", b: "c", c: "b", d: "a" }[k];
  if (v[divisorKey] === 0) fail(`Cannot solve because term ${divisorKey} equals zero.`, divisorKey);

  const known = v;
  const x = k === "a" ? (known.b * known.c) / known.d
    : k === "b" ? (known.a * known.d) / known.c
    : k === "c" ? (known.a * known.d) / known.b
    : (known.b * known.c) / known.a;
  if ((k === "b" || k === "d") && x === 0) fail(`The calculated term ${k} equals zero, so a denominator in the proportion becomes zero.`, k);
  v[k] = x;
  const { a, b, c, d } = v;

  const formula = {
    a: `a = \\frac{b\\cdot c}{d} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(d)}}`,
    b: `b = \\frac{a\\cdot d}{c} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(c)}}`,
    c: `c = \\frac{a\\cdot d}{b} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(b)}}`,
    d: `d = \\frac{b\\cdot c}{a} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(a)}}`
  }[k];
  const steps = [
    { text: "In the proportion a/b = c/d, the products of the cross terms are equal:", tex: "a\\cdot d = b\\cdot c" },
    { text: `We solve the equation to find term ${k}:`, tex: `${formula} = ${ntex(x, 8)}` },
    { text: "We check the proportion after solving:", tex: `\\frac{${ntex(a)}}{${ntex(b)}} = ${ntex(a / b, 8)} = ${ntex(c / d, 8)} = \\frac{${ntex(c)}}{${ntex(d)}}` }
  ];
  return {
    results: [
      { label: `Unknown term ${k}`, value: N(x) },
      { label: "The full proportion", value: `${N(a)}/${N(b)} = ${N(c)}/${N(d)}` }
    ],
    steps,
    copy: `${k} = ${N(x)}  (${N(a)}/${N(b)} = ${N(c)}/${N(d)})`
  };
}

function proportionMode(input, inverse) {
  const x1 = num(input, "x1", "First value x₁", { positive: true });
  const y1 = num(input, "y1", "Corresponding value y₁", { nonNegative: true });
  const x2 = num(input, "x2", "Second value x₂", { positive: true });
  const y2 = inverse ? (y1 * x1) / x2 : (y1 * x2) / x1;
  const k = inverse ? y1 * x1 : y1 / x1;
  const name = inverse ? "inverse" : "direct";
  const steps = inverse
    ? [
        { text: "In inverse proportion, the product y·x stays constant:", tex: "y_1\\cdot x_1 = y_2\\cdot x_2" },
        { text: "We solve the equation to find y₂:", tex: `y_2 = \\frac{y_1\\cdot x_1}{x_2} = \\frac{${ntex(y1)}\\cdot ${ntex(x1)}}{${ntex(x2)}} = ${ntex(y2, 8)}` }
      ]
    : [
        { text: "In direct proportion, the ratio y/x stays constant:", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}" },
        { text: "We solve the equation to find y₂:", tex: `y_2 = \\frac{y_1\\cdot x_2}{x_1} = \\frac{${ntex(y1)}\\cdot ${ntex(x2)}}{${ntex(x1)}} = ${ntex(y2, 8)}` }
      ];
  return {
    results: [
      { label: "Unknown value y₂", value: N(y2) },
      { label: inverse ? "Inverse proportionality constant y·x" : "Direct proportionality constant y/x", value: N(k) }
    ],
    steps,
    copy: `y₂ = ${N(y2)} (${name} proportion)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Problem type", MODES, "simplify");
  if (mode === "simplify") return simplifyMode(input);
  if (mode === "solve") return solveMode(input);
  if (mode === "divide") return divideMode(input);
  return proportionMode(input, mode === "inverse");
}
