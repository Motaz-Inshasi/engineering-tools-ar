import { fail, numList } from "../core/validate.js";
import { factorize } from "./prime-factorization.js";

const MAX = 1e15;

export const meta = {
  description: "Calculez le plus grand commun diviseur (PGCD) et le plus petit commun multiple (PPCM) d'une liste de 2 à 10 entiers positifs, par l'algorithme d'Euclide et par décomposition en facteurs premiers, avec un tableau des étapes.",
  keywords: ["PGCD", "PPCM", "GCD", "LCM", "Euclide", "HCF", "gcd lcm"],
  formulas: [
    { label: "Algorithme d'Euclide", tex: "a = q\\cdot b + r" },
    { label: "Relation entre PGCD et PPCM", tex: "\\operatorname{lcm}(a,b) = \\frac{a\\cdot b}{\\gcd(a,b)}" },
    { label: "Par décomposition en facteurs premiers", tex: "\\gcd = \\prod p^{\\min e},\\qquad \\operatorname{lcm} = \\prod p^{\\max e}" }
  ],
  inputs: [
    { id: "numList", label: "Liste d'entiers positifs", type: "text", default: "48, 180", help: "De 2 à 10 nombres séparés par une virgule ou un espace, chaque nombre allant jusqu'à 10^15." }
  ],
  example: { values: { numList: "48, 180" }, expect: ["GCD = 12", "LCM = 720"], note: "Exemple : PGCD(48, 180) = 12 et PPCM(48, 180) = 720." },
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
  const list = numList(input, "numList", "Liste des nombres", { positive: true, min: 2, max: 10 });
  const nums = list.map((v) => {
    if (!Number.isInteger(v) || v > MAX) fail(`Le nombre ${v} doit être un entier positif ne dépassant pas 10^15.`, "numList");
    return BigInt(v);
  });

  const steps = [];
  const e = euclid(nums[0], nums[1]);
  steps.push(`D'abord, on applique l'algorithme d'Euclide aux deux premiers nombres ${nums[0]} et ${nums[1]}, chaque ligne vérifiant a = q·b + r :`);
  for (const row of e.rows) {
    steps.push({ text: `On divise ${row.x} par ${row.y} : quotient q = ${row.q} et reste r = ${row.r}`, tex: `${row.x} = ${row.q}\\cdot ${row.y} + ${row.r}` });
  }
  let g = e.g;
  for (let i = 2; i < nums.length; i++) {
    const ng = gcd(g, nums[i]);
    steps.push({ text: `On prend le PGCD du résultat précédent ${g} avec le nombre ${nums[i]} :`, tex: `\\gcd(${g},${nums[i]}) = ${ng}` });
    g = ng;
  }

  steps.push("Ensuite, le PPCM à l'aide du PGCD :");
  let l = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const d = gcd(l, nums[i]);
    const nl = (l / d) * nums[i];
    steps.push({ text: `On calcule le PPCM de ${l} avec ${nums[i]} :`, tex: `\\operatorname{lcm}(${l},${nums[i]}) = \\frac{${l}\\cdot ${nums[i]}}{${d}} = ${nl}` });
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
  steps.push("Enfin, décomposition en facteurs premiers : on prend le plus petit exposant pour le PGCD et le plus grand exposant pour le PPCM :");
  steps.push({ text: "PGCD à partir des plus petits exposants :", tex: `\\gcd = ${gPart.length ? gPart.join(" \\times ") : "1"} = ${g}` });
  steps.push({ text: "PPCM à partir des plus grands exposants :", tex: `\\operatorname{lcm} = ${lPart.length ? lPart.join(" \\times ") : "1"} = ${l}` });

  const head = ["Facteur premier", ...list.map((v) => String(v)), "Plus petit exposant (PGCD)", "Plus grand exposant (PPCM)"];
  return {
    results: [
      { label: "Plus grand commun diviseur (PGCD)", value: String(g) },
      { label: "Plus petit commun multiple (PPCM)", value: String(l) }
    ],
    steps,
    blocks: [
      {
        type: "table",
        caption: "Tableau des étapes d'Euclide pour les deux premiers nombres",
        head: ["a", "b", "q", "r", "a = q·b + r"],
        rows: e.rows.map((r) => [String(r.x), String(r.y), String(r.q), String(r.r), `${r.x} = ${r.q}·${r.y} + ${r.r}`]),
        ltr: true
      },
      {
        type: "table",
        caption: "Exposants des facteurs premiers de chaque nombre",
        head,
        rows: rows.map((r) => [String(r.p), ...r.ex.map(String), String(r.mn), String(r.mx)]),
        ltr: true
      }
    ],
    copy: `GCD = ${g}، LCM = ${l}`
  };
}
