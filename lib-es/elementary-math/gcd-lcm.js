import { fail, numList } from "../core/validate.js";
import { factorize } from "./prime-factorization.js";

const MAX = 1e15;

export const meta = {
  description: "Calcula el máximo común divisor y el mínimo común múltiplo de una lista de 2 a 10 enteros positivos, mediante el algoritmo de Euclides y la factorización en primos, con una tabla de pasos.",
  keywords: ["máximo común divisor", "mínimo común múltiplo", "GCD", "LCM", "Euclides", "HCF", "gcd lcm"],
  formulas: [
    { label: "algoritmo de Euclides", tex: "a = q\\cdot b + r" },
    { label: "Relación entre MCD y MCM", tex: "\\operatorname{lcm}(a,b) = \\frac{a\\cdot b}{\\gcd(a,b)}" },
    { label: "Mediante factorización en primos", tex: "\\gcd = \\prod p^{\\min e},\\qquad \\operatorname{lcm} = \\prod p^{\\max e}" }
  ],
  inputs: [
    { id: "numList", label: "Lista de enteros positivos", type: "text", default: "48, 180", help: "De 2 a 10 números separados por coma o espacio, cada número hasta 10^15." }
  ],
  example: { values: { numList: "48, 180" }, expect: ["GCD = 12", "LCM = 720"], note: "Ejemplo: MCD(48, 180) = 12 y MCM(48, 180) = 720." },
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
  const list = numList(input, "numList", "Lista de números", { positive: true, min: 2, max: 10 });
  const nums = list.map((v) => {
    if (!Number.isInteger(v) || v > MAX) fail(`El número ${v} debe ser un entero positivo que no supere 10^15.`, "numList");
    return BigInt(v);
  });

  const steps = [];
  const e = euclid(nums[0], nums[1]);
  steps.push(`Primero, aplicamos el algoritmo de Euclides a los dos primeros números ${nums[0]} y ${nums[1]}, donde cada línea cumple a = q·b + r:`);
  for (const row of e.rows) {
    steps.push({ text: `Dividimos ${row.x} entre ${row.y}: cociente q = ${row.q} y resto r = ${row.r}`, tex: `${row.x} = ${row.q}\\cdot ${row.y} + ${row.r}` });
  }
  let g = e.g;
  for (let i = 2; i < nums.length; i++) {
    const ng = gcd(g, nums[i]);
    steps.push({ text: `Calculamos el MCD del resultado anterior ${g} con el número ${nums[i]}:`, tex: `\\gcd(${g},${nums[i]}) = ${ng}` });
    g = ng;
  }

  steps.push("Segundo, el MCM usando el MCD:");
  let l = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const d = gcd(l, nums[i]);
    const nl = (l / d) * nums[i];
    steps.push({ text: `Calculamos el MCM de ${l} con ${nums[i]}:`, tex: `\\operatorname{lcm}(${l},${nums[i]}) = \\frac{${l}\\cdot ${nums[i]}}{${d}} = ${nl}` });
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
  steps.push("Tercero, factorización en primos: tomamos el menor exponente para el MCD y el mayor exponente para el MCM:");
  steps.push({ text: "MCD a partir de los menores exponentes:", tex: `\\gcd = ${gPart.length ? gPart.join(" \\times ") : "1"} = ${g}` });
  steps.push({ text: "MCM a partir de los mayores exponentes:", tex: `\\operatorname{lcm} = ${lPart.length ? lPart.join(" \\times ") : "1"} = ${l}` });

  const head = ["Factor primo", ...list.map((v) => String(v)), "Menor exponente (MCD)", "Mayor exponente (MCM)"];
  return {
    results: [
      { label: "Máximo común divisor (MCD)", value: String(g) },
      { label: "Mínimo común múltiplo (MCM)", value: String(l) }
    ],
    steps,
    blocks: [
      {
        type: "table",
        caption: "Tabla de pasos del algoritmo de Euclides para los dos primeros números",
        head: ["a", "b", "q", "r", "a = q·b + r"],
        rows: e.rows.map((r) => [String(r.x), String(r.y), String(r.q), String(r.r), `${r.x} = ${r.q}·${r.y} + ${r.r}`]),
        ltr: true
      },
      {
        type: "table",
        caption: "Exponentes de los factores primos de cada número",
        head,
        rows: rows.map((r) => [String(r.p), ...r.ex.map(String), String(r.mn), String(r.mx)]),
        ltr: true
      }
    ],
    copy: `GCD = ${g}، LCM = ${l}`
  };
}
