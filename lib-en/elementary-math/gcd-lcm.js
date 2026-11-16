import { fail, numList } from "../core/validate.js";
import { factorize } from "./prime-factorization.js";

const MAX = 1e15;

export const meta = {
  description: "Calculate the greatest common divisor and the least common multiple of a list of 2 to 10 positive integers, using the Euclidean algorithm and prime factorization, with a table of steps.",
  keywords: ["greatest common divisor", "least common multiple", "GCD", "LCM", "Euclid", "HCF", "gcd lcm"],
  formulas: [
    { label: "Euclidean algorithm", tex: "a = q\\cdot b + r" },
    { label: "Relation between GCD and LCM", tex: "\\operatorname{lcm}(a,b) = \\frac{a\\cdot b}{\\gcd(a,b)}" },
    { label: "By prime factorization", tex: "\\gcd = \\prod p^{\\min e},\\qquad \\operatorname{lcm} = \\prod p^{\\max e}" }
  ],
  inputs: [
    { id: "numList", label: "List of positive integers", type: "text", default: "48, 180", help: "From 2 to 10 numbers separated by a comma or a space, each number up to 10^15." }
  ],
  example: { values: { numList: "48, 180" }, expect: ["GCD = 12", "LCM = 720"], note: "Example: GCD(48, 180) = 12 and LCM(48, 180) = 720." },
  invalid: { values: { numList: "48, 0" } },
  related: ["prime-factorization", "fractions", "number-bases"]
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

function euclid(a, b) {
  let x = a > b ? a : b;
  let y = a > b ? b : a;
  const rows = [];
  while (y !== 0n) {
    const q = x / y;
    const r = x % y;
    rows.push({ x, y, q, r });
    x = y;
    y = r;
  }
  return { g: x, rows };
}

export function solve(input) {
  const list = numList(input, "numList", "List of numbers", { positive: true, min: 2, max: 10 });
  const nums = list.map((v) => {
    if (!Number.isInteger(v) || v > MAX) fail(`The number ${v} must be a positive integer not exceeding 10^15.`, "numList");
    return BigInt(v);
  });

  const steps = [];
  const e = euclid(nums[0], nums[1]);
  steps.push(`First, we apply the Euclidean algorithm to the first two numbers ${nums[0]} and ${nums[1]}, where each line satisfies a = q·b + r:`);
  for (const row of e.rows) {
    steps.push({ text: `We divide ${row.x} by ${row.y}: quotient q = ${row.q} and remainder r = ${row.r}`, tex: `${row.x} = ${row.q}\\cdot ${row.y} + ${row.r}` });
  }
  let g = e.g;
  for (let i = 2; i < nums.length; i++) {
    const ng = gcd(g, nums[i]);
    steps.push({ text: `We take the GCD of the previous result ${g} with the number ${nums[i]}:`, tex: `\\gcd(${g},${nums[i]}) = ${ng}` });
    g = ng;
  }

  steps.push("Second, the LCM using the GCD:");
  let l = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const d = gcd(l, nums[i]);
    const nl = (l / d) * nums[i];
    steps.push({ text: `We compute the LCM of ${l} with ${nums[i]}:`, tex: `\\operatorname{lcm}(${l},${nums[i]}) = \\frac{${l}\\cdot ${nums[i]}}{${d}} = ${nl}` });
    l = nl;
  }

  const facts = nums.map((n) => factorize(Number(n)));
  const primes = [...new Set(facts.flatMap((m) => [...m.keys()]))].sort((x, y) => x - y);
  const rows = primes.map((p) => {
    const ex = facts.map((m) => m.get(p) || 0);
    return { p, ex, mn: Math.min(...ex), mx: Math.max(...ex) };
  });
  const gPart = rows.filter((r) => r.mn > 0).map((r) => `${r.p}^{${r.mn}}`);
  const lPart = rows.filter((r) => r.mx > 0).map((r) => `${r.p}^{${r.mx}}`);
  steps.push("Third, prime factorization: we take the smallest exponent for the GCD and the largest exponent for the LCM:");
  steps.push({ text: "GCD from the smallest exponents:", tex: `\\gcd = ${gPart.length ? gPart.join(" \\times ") : "1"} = ${g}` });
  steps.push({ text: "LCM from the largest exponents:", tex: `\\operatorname{lcm} = ${lPart.length ? lPart.join(" \\times ") : "1"} = ${l}` });

  const head = ["Prime factor", ...list.map((v) => String(v)), "Smallest exponent (GCD)", "Largest exponent (LCM)"];
  return {
    results: [
      { label: "Greatest common divisor (GCD)", value: String(g) },
      { label: "Least common multiple (LCM)", value: String(l) }
    ],
    steps,
    blocks: [
      {
        type: "table",
        caption: "Euclidean algorithm steps for the first two numbers",
        head: ["a", "b", "q", "r", "a = q·b + r"],
        rows: e.rows.map((r) => [String(r.x), String(r.y), String(r.q), String(r.r), `${r.x} = ${r.q}·${r.y} + ${r.r}`]),
        ltr: true
      },
      {
        type: "table",
        caption: "Prime factor exponents for each number",
        head,
        rows: rows.map((r) => [String(r.p), ...r.ex.map(String), String(r.mn), String(r.mx)]),
        ltr: true
      }
    ],
    copy: `GCD = ${g}، LCM = ${l}`
  };
}
