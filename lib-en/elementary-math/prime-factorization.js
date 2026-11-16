import { numx as num } from "../core/numexpr.js";

const LIMIT = 1e15;
const MAX_LIST = 500;
const SUPS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (e) => String(e).split("").map((c) => SUPS[Number(c)]).join("");

export const meta = {
  description: "Factorize any integer up to 10^15 into its prime factors, determine whether it is prime, its number of divisors and their sum, Euler's totient function and the two nearest primes to it, with the factorization tree step by step.",
  keywords: ["prime factors", "factorization", "prime number", "divisors", "Euler's totient function", "factorization tree", "prime factorization", "divisors", "totient"],
  formulas: [
    { label: "Number of divisors", tex: "d(n) = \\prod_{i}(e_i + 1)" },
    { label: "Sum of divisors", tex: "\\sigma(n) = \\prod_{i}\\frac{p_i^{\\,e_i+1}-1}{p_i-1}" },
    { label: "Euler's totient function", tex: "\\varphi(n) = n\\prod_{i}\\left(1-\\frac{1}{p_i}\\right)" }
  ],
  inputs: [
    { id: "n", label: "Integer n", type: "number", default: "360", help: "Integer from 2 to 10^15." }
  ],
  example: { values: { n: "360" }, expect: ["2³ × 3² × 5", "24"], note: "Example: 360 = 2³ × 3² × 5." },
  invalid: { values: { n: "1" } },
  related: ["gcd-lcm", "fractions", "number-bases"]
};

export function isPrime(n) {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function trace(n) {
  const map = new Map();
  const steps = [];
  let m = n;
  const take = (p) => {
    const next = m / p;
    steps.push({ text: `We divide ${m} by the prime factor ${p}:`, tex: `${m} = ${p} \\times ${next}` });
    map.set(p, (map.get(p) || 0) + 1);
    m = next;
  };
  while (m % 2 === 0) take(2);
  while (m % 3 === 0) take(3);
  for (let i = 5; i * i <= m; i += 6) {
    while (m % i === 0) take(i);
    while (m % (i + 2) === 0) take(i + 2);
  }
  if (m > 1) {
    steps.push({ text: `${m} is a prime number, so the division stops here:`, tex: `${m}` });
    map.set(m, (map.get(m) || 0) + 1);
  }
  return { map, steps };
}

export function factorize(n) {
  return trace(n).map;
}

export function solve(input) {
  const n = num(input, "n", "Number n", { integer: true, min: 2, max: LIMIT });
  const { map, steps: tree } = trace(n);
  const primes = [...map.keys()].sort((x, y) => x - y);
  const exps = primes.map((p) => map.get(p));
  const prime = primes.length === 1 && exps[0] === 1;
  const fact = primes.map((p, i) => (exps[i] > 1 ? `${p}${sup(exps[i])}` : `${p}`)).join(" × ");
  const latex = primes.map((p, i) => (exps[i] > 1 ? `${p}^{${exps[i]}}` : `${p}`)).join(" \\times ");
  const terms = primes.map((p, i) => {
    const P = BigInt(p);
    const E = BigInt(exps[i]);
    return { P, E, div: E + 1n, sig: (P ** (E + 1n) - 1n) / (P - 1n), phi: P ** (E - 1n) * (P - 1n) };
  });
  const d = terms.reduce((acc, t) => acc * t.div, 1n);
  const sigma = terms.reduce((acc, t) => acc * t.sig, 1n);
  const phi = terms.reduce((acc, t) => acc * t.phi, 1n);

  let divs = null;
  if (d <= BigInt(MAX_LIST)) {
    divs = [1n];
    for (const t of terms) {
      const next = [];
      for (const x of divs) {
        let pw = 1n;
        for (let k = 0n; k < t.div; k += 1n) {
          next.push(x * pw);
          pw *= t.P;
        }
      }
      divs = next;
    }
    divs.sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  }

  let below = null;
  for (let k = n - 1; k >= 2; k--) {
    if (isPrime(k)) {
      below = k;
      break;
    }
  }
  let above = n + 1;
  while (!isPrime(above)) above++;

  const steps = [...tree];
  steps.push({ text: "Number of divisors: we add one to each exponent, then multiply the resulting numbers:", tex: `d(n) = ${exps.map((e) => `(${e}+1)`).join(" \\times ")} = ${d}` });
  steps.push({ text: "Sum of divisors: we add the powers of each factor from p⁰ up to p^e, then multiply the two results:", tex: `\\sigma(n) = ${terms.map((t) => t.sig).join(" \\times ")} = ${sigma}` });
  steps.push({ text: "Euler's totient: we multiply n by (1 − 1/p) for each prime factor:", tex: `\\varphi(n) = ${n} \\times ${primes.map((p) => `\\frac{${p - 1}}{${p}}`).join(" \\times ")} = ${phi}` });
  steps.push(below === null ? "There is no prime number smaller than n." : `The nearest prime number smaller than n is ${below}.`);
  steps.push(`The nearest prime number greater than n is ${above}.`);

  const results = [
    { label: "Is the number prime?", value: prime ? "Yes, the number is prime" : "No, the number is composite" },
    { label: "Prime factorization", value: fact },
    { label: "LaTeX formula", value: latex },
    { label: "Number of divisors d(n)", value: String(d) },
    { label: "Sum of divisors σ(n)", value: String(sigma) },
    { label: "Euler's totient φ(n)", value: String(phi) },
    { label: "Nearest prime smaller", value: below === null ? "None" : String(below) },
    { label: "Nearest prime greater", value: String(above) }
  ];
  if (divs) results.push({ label: "All divisors", value: divs.join(", ") });

  const blocks = [
    {
      type: "table",
      caption: "Prime factor exponents",
      head: ["Prime factor", "Exponent e", "Number of exponent choices (e+1)"],
      rows: primes.map((p, i) => [String(p), String(exps[i]), String(exps[i] + 1)]),
      ltr: true
    }
  ];
  if (divs === null) blocks.push({ type: "note", text: `The number of divisors ${d} is greater than ${MAX_LIST}, so the list of divisors is not shown.` });

  return {
    results,
    steps,
    blocks,
    copy: `${n} = ${fact}, number of divisors ${d}`
  };
}
