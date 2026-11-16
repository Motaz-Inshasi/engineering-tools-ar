import { numx as num } from "../core/numexpr.js";

const LIMIT = 1e15;
const MAX_LIST = 500;
const SUPS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (e) => String(e).split("").map((c) => SUPS[Number(c)]).join("");

export const meta = {
  description: "Faktorkan bilangan bulat hingga 10^15 menjadi faktor primanya, tentukan apakah bilangan itu prima, jumlah dan total pembagi, fungsi Euler, serta dua bilangan prima terdekat, dengan pohon faktorisasi langkah demi langkah.",
  keywords: ["faktor prima", "faktorisasi", "bilangan prima", "pembagi", "fungsi Euler", "pohon faktorisasi", "prime factorization", "divisors", "totient"],
  formulas: [
    { label: "Banyak pembagi", tex: "d(n) = \\prod_{i}(e_i + 1)" },
    { label: "Jumlah pembagi", tex: "\\sigma(n) = \\prod_{i}\\frac{p_i^{\\,e_i+1}-1}{p_i-1}" },
    { label: "fungsi Euler", tex: "\\varphi(n) = n\\prod_{i}\\left(1-\\frac{1}{p_i}\\right)" }
  ],
  inputs: [
    { id: "n", label: "Bilangan bulat n", type: "number", default: "360", help: "Bilangan bulat dari 2 sampai 10^15." }
  ],
  example: { values: { n: "360" }, expect: ["2³ × 3² × 5", "24"], note: "Contoh: 360 = 2³ × 3² × 5." },
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
    steps.push({ text: `Kita bagi ${m} dengan faktor prima ${p}:`, tex: `${m} = ${p} \\times ${next}` });
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
    steps.push({ text: `${m} adalah bilangan prima, sehingga pembagian berhenti di sini:`, tex: `${m}` });
    map.set(m, (map.get(m) || 0) + 1);
  }
  return { map, steps };
}

export function factorize(n) {
  return trace(n).map;
}

export function solve(input) {
  const n = num(input, "n", "Bilangan n", { integer: true, min: 2, max: LIMIT });
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
  steps.push({ text: "Banyak pembagi: kita tambahkan satu pada setiap pangkat lalu kalikan hasilnya:", tex: `d(n) = ${exps.map((e) => `(${e}+1)`).join(" \\times ")} = ${d}` });
  steps.push({ text: "Jumlah pembagi: kita jumlahkan pangkat setiap faktor dari p⁰ sampai p^e lalu kalikan kedua hasilnya:", tex: `\\sigma(n) = ${terms.map((t) => t.sig).join(" \\times ")} = ${sigma}` });
  steps.push({ text: "Fungsi Euler: kita kalikan n dengan (1 − 1/p) untuk setiap faktor prima:", tex: `\\varphi(n) = ${n} \\times ${primes.map((p) => `\\frac{${p - 1}}{${p}}`).join(" \\times ")} = ${phi}` });
  steps.push(below === null ? "Tidak ada bilangan prima yang lebih kecil dari n." : `Bilangan prima terdekat yang lebih kecil dari n adalah ${below}.`);
  steps.push(`Bilangan prima terdekat yang lebih besar dari n adalah ${above}.`);

  const results = [
    { label: "Apakah bilangan ini prima?", value: prime ? "Ya, bilangan ini prima" : "Tidak, bilangan ini komposit" },
    { label: "Faktorisasi prima", value: fact },
    { label: "Rumus dalam LaTeX", value: latex },
    { label: "Banyak pembagi d(n)", value: String(d) },
    { label: "Jumlah pembagi σ(n)", value: String(sigma) },
    { label: "Fungsi Euler φ(n)", value: String(phi) },
    { label: "Bilangan prima terdekat yang lebih kecil", value: below === null ? "Tidak ada" : String(below) },
    { label: "Bilangan prima terdekat yang lebih besar", value: String(above) }
  ];
  if (divs) results.push({ label: "Semua pembagi", value: divs.join(", ") });

  const blocks = [
    {
      type: "table",
      caption: "Pangkat faktor prima",
      head: ["Faktor prima", "Pangkat e", "Jumlah pilihan pangkat (e+1)"],
      rows: primes.map((p, i) => [String(p), String(exps[i]), String(exps[i] + 1)]),
      ltr: true
    }
  ];
  if (divs === null) blocks.push({ type: "note", text: `Banyak pembagi ${d} lebih besar dari ${MAX_LIST}, sehingga daftar pembagi tidak ditampilkan.` });

  return {
    results,
    steps,
    blocks,
    copy: `${n} = ${fact}, banyak pembagi ${d}`
  };
}
