import { numx as num } from "../core/numexpr.js";

const LIMIT = 1e15;
const MAX_LIST = 500;
const SUPS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (e) => String(e).split("").map((c) => SUPS[Number(c)]).join("");

export const meta = {
  description: "Factoriza cualquier entero de hasta 10^15 en sus factores primos, indica si es primo, su número de divisores y la suma de estos, la función φ de Euler y los dos primos más cercanos, con el árbol de factorización paso a paso.",
  keywords: ["factores primos", "factorización", "número primo", "divisores", "función φ de Euler", "árbol de factorización", "prime factorization", "divisors", "totient"],
  formulas: [
    { label: "Número de divisores", tex: "d(n) = \\prod_{i}(e_i + 1)" },
    { label: "Suma de divisores", tex: "\\sigma(n) = \\prod_{i}\\frac{p_i^{\\,e_i+1}-1}{p_i-1}" },
    { label: "función φ de Euler", tex: "\\varphi(n) = n\\prod_{i}\\left(1-\\frac{1}{p_i}\\right)" }
  ],
  inputs: [
    { id: "n", label: "Entero n", type: "number", default: "360", help: "Entero de 2 a 10^15." }
  ],
  example: { values: { n: "360" }, expect: ["2³ × 3² × 5", "24"], note: "Ejemplo: 360 = 2³ × 3² × 5." },
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
    steps.push({ text: `Dividimos ${m} entre el factor primo ${p}:`, tex: `${m} = ${p} \\times ${next}` });
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
    steps.push({ text: `${m} es un número primo, así que la división termina aquí:`, tex: `${m}` });
    map.set(m, (map.get(m) || 0) + 1);
  }
  return { map, steps };
}

export function factorize(n) {
  return trace(n).map;
}

export function solve(input) {
  const n = num(input, "n", "Número n", { integer: true, min: 2, max: LIMIT });
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
  steps.push({ text: "Número de divisores: sumamos uno a cada exponente y luego multiplicamos los números resultantes:", tex: `d(n) = ${exps.map((e) => `(${e}+1)`).join(" \\times ")} = ${d}` });
  steps.push({ text: "Suma de divisores: sumamos las potencias de cada factor desde p⁰ hasta p^e y luego multiplicamos los dos resultados:", tex: `\\sigma(n) = ${terms.map((t) => t.sig).join(" \\times ")} = ${sigma}` });
  steps.push({ text: "Función φ de Euler: multiplicamos n por (1 − 1/p) para cada factor primo:", tex: `\\varphi(n) = ${n} \\times ${primes.map((p) => `\\frac{${p - 1}}{${p}}`).join(" \\times ")} = ${phi}` });
  steps.push(below === null ? "No existe ningún número primo menor que n." : `El primo más cercano menor que n es ${below}.`);
  steps.push(`El primo más cercano mayor que n es ${above}.`);

  const results = [
    { label: "¿Es el número primo?", value: prime ? "Sí, el número es primo" : "No, el número es compuesto" },
    { label: "Factorización en primos", value: fact },
    { label: "Fórmula en LaTeX", value: latex },
    { label: "Número de divisores d(n)", value: String(d) },
    { label: "Suma de divisores σ(n)", value: String(sigma) },
    { label: "Función φ de Euler φ(n)", value: String(phi) },
    { label: "Primo más cercano menor", value: below === null ? "Ninguno" : String(below) },
    { label: "Primo más cercano mayor", value: String(above) }
  ];
  if (divs) results.push({ label: "Todos los divisores", value: divs.join(", ") });

  const blocks = [
    {
      type: "table",
      caption: "Exponentes de los factores primos",
      head: ["Factor primo", "Exponente e", "Número de opciones del exponente (e+1)"],
      rows: primes.map((p, i) => [String(p), String(exps[i]), String(exps[i] + 1)]),
      ltr: true
    }
  ];
  if (divs === null) blocks.push({ type: "note", text: `El número de divisores ${d} es mayor que ${MAX_LIST}, por lo que no se muestra la lista de divisores.` });

  return {
    results,
    steps,
    blocks,
    copy: `${n} = ${fact}, número de divisores ${d}`
  };
}
