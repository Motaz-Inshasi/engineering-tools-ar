import { numx as num } from "../core/numexpr.js";

const LIMIT = 1e15;
const MAX_LIST = 500;
const SUPS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (e) => String(e).split("").map((c) => SUPS[Number(c)]).join("");

export const meta = {
  description: "حلّل أي عدد صحيح حتى 10^15 إلى عوامله الأولية، واعرف هل هو أولي، وعدد قواسمه ومجموعها ودالة أويلر، وأقرب عددين أوليين له، مع شجرة التحليل خطوة بخطوة.",
  keywords: ["عوامل أولية", "تحليل إلى عوامل", "عدد أولي", "القواسم", "دالة أويلر", "شجرة التحليل", "prime factorization", "divisors", "totient"],
  formulas: [
    { label: "عدد القواسم", tex: "d(n) = \\prod_{i}(e_i + 1)" },
    { label: "مجموع القواسم", tex: "\\sigma(n) = \\prod_{i}\\frac{p_i^{\\,e_i+1}-1}{p_i-1}" },
    { label: "دالة أويلر", tex: "\\varphi(n) = n\\prod_{i}\\left(1-\\frac{1}{p_i}\\right)" }
  ],
  inputs: [
    { id: "n", label: "العدد الصحيح n", type: "number", default: "360", help: "عدد صحيح من 2 إلى 10^15." }
  ],
  example: { values: { n: "360" }, expect: ["2³ × 3² × 5", "24"], note: "مثال: 360 = 2³ × 3² × 5." },
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
    steps.push({ text: `نقسم ${m} على العامل الأولي ${p}:`, tex: `${m} = ${p} \\times ${next}` });
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
    steps.push({ text: `${m} عدد أولي، لذلك تتوقف القسمة عنده:`, tex: `${m}` });
    map.set(m, (map.get(m) || 0) + 1);
  }
  return { map, steps };
}

export function factorize(n) {
  return trace(n).map;
}

export function solve(input) {
  const n = num(input, "n", "العدد n", { integer: true, min: 2, max: LIMIT });
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
  steps.push({ text: "عدد القواسم: نزيد كل أس بواحد ثم نضرب الأعداد الناتجة:", tex: `d(n) = ${exps.map((e) => `(${e}+1)`).join(" \\times ")} = ${d}` });
  steps.push({ text: "مجموع القواسم: نجمع قوى كل عامل من p⁰ حتى p^e ثم نضرب الناتجين:", tex: `\\sigma(n) = ${terms.map((t) => t.sig).join(" \\times ")} = ${sigma}` });
  steps.push({ text: "دالة أويلر: نضرب n في (1 − 1/p) لكل عامل أولي:", tex: `\\varphi(n) = ${n} \\times ${primes.map((p) => `\\frac{${p - 1}}{${p}}`).join(" \\times ")} = ${phi}` });
  steps.push(below === null ? "لا يوجد عدد أولي أصغر من n." : `أقرب عدد أولي أصغر من n هو ${below}.`);
  steps.push(`أقرب عدد أولي أكبر من n هو ${above}.`);

  const results = [
    { label: "هل العدد أولي؟", value: prime ? "نعم، العدد أولي" : "لا، العدد مركب" },
    { label: "التحليل إلى العوامل الأولية", value: fact },
    { label: "الصيغة بـ LaTeX", value: latex },
    { label: "عدد القواسم d(n)", value: String(d) },
    { label: "مجموع القواسم σ(n)", value: String(sigma) },
    { label: "دالة أويلر φ(n)", value: String(phi) },
    { label: "أقرب عدد أولي أصغر", value: below === null ? "لا يوجد" : String(below) },
    { label: "أقرب عدد أولي أكبر", value: String(above) }
  ];
  if (divs) results.push({ label: "كل القواسم", value: divs.join(", ") });

  const blocks = [
    {
      type: "table",
      caption: "أسس العوامل الأولية",
      head: ["العامل الأولي", "الأس e", "عدد اختيارات الأس (e+1)"],
      rows: primes.map((p, i) => [String(p), String(exps[i]), String(exps[i] + 1)]),
      ltr: true
    }
  ];
  if (divs === null) blocks.push({ type: "note", text: `عدد القواسم ${d} أكبر من ${MAX_LIST}، لذلك لم تُعرض قائمة القواسم.` });

  return {
    results,
    steps,
    blocks,
    copy: `${n} = ${fact}، عدد القواسم ${d}`
  };
}
