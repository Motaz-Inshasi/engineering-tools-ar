import { numx as num } from "../core/numexpr.js";

const LIMIT = 1e15;
const MAX_LIST = 500;
const SUPS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (e) => String(e).split("").map((c) => SUPS[Number(c)]).join("");

export const meta = {
  description: "10^15 تک کے کسی بھی صحیح عدد کو اس کے اولین اجزاء میں تحلیل کریں، معلوم کریں کہ آیا وہ اولین ہے، اس کے مقسوموں کی تعداد اور ان کا مجموعہ، اویلر کا فنکشن، اور اس کے قریب ترین دو اولین اعداد، ساتھ تحلیل کا شجرہ قدم بہ قدم۔",
  keywords: ["اولین اجزاء", "اجزائے ضربی میں تحلیل", "اولین عدد", "مقسومات", "اویلر کا فنکشن", "تحلیل کا شجرہ", "prime factorization", "divisors", "totient"],
  formulas: [
    { label: "مقسومات کی تعداد", tex: "d(n) = \\prod_{i}(e_i + 1)" },
    { label: "مقسومات کا مجموعہ", tex: "\\sigma(n) = \\prod_{i}\\frac{p_i^{\\,e_i+1}-1}{p_i-1}" },
    { label: "اویلر کا فنکشن", tex: "\\varphi(n) = n\\prod_{i}\\left(1-\\frac{1}{p_i}\\right)" }
  ],
  inputs: [
    { id: "n", label: "صحیح عدد n", type: "number", default: "360", help: "2 سے 10^15 تک صحیح عدد۔" }
  ],
  example: { values: { n: "360" }, expect: ["2³ × 3² × 5", "24"], note: "مثال: 360 = 2³ × 3² × 5۔" },
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
    steps.push({ text: `ہم ${m} کو اولین جزو ${p} سے تقسیم کرتے ہیں:`, tex: `${m} = ${p} \\times ${next}` });
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
    steps.push({ text: `${m} ایک اولین عدد ہے، اس لیے تقسیم یہاں رک جاتی ہے:`, tex: `${m}` });
    map.set(m, (map.get(m) || 0) + 1);
  }
  return { map, steps };
}

export function factorize(n) {
  return trace(n).map;
}

export function solve(input) {
  const n = num(input, "n", "عدد n", { integer: true, min: 2, max: LIMIT });
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
  steps.push({ text: "مقسومات کی تعداد: ہر قوت نما میں ایک جمع کرتے ہیں، پھر حاصل اعداد کو ضرب دیتے ہیں:", tex: `d(n) = ${exps.map((e) => `(${e}+1)`).join(" \\times ")} = ${d}` });
  steps.push({ text: "مقسومات کا مجموعہ: ہر جزو کی قوتوں p⁰ سے p^e تک جمع کرتے ہیں، پھر دونوں نتائج کو ضرب دیتے ہیں:", tex: `\\sigma(n) = ${terms.map((t) => t.sig).join(" \\times ")} = ${sigma}` });
  steps.push({ text: "اویلر کا فنکشن: ہر اولین جزو کے لیے n کو (1 − 1/p) سے ضرب دیتے ہیں:", tex: `\\varphi(n) = ${n} \\times ${primes.map((p) => `\\frac{${p - 1}}{${p}}`).join(" \\times ")} = ${phi}` });
  steps.push(below === null ? "n سے چھوٹا کوئی اولین عدد موجود نہیں۔" : `n سے چھوٹا قریب ترین اولین عدد ${below} ہے۔`);
  steps.push(`n سے بڑا قریب ترین اولین عدد ${above} ہے۔`);

  const results = [
    { label: "کیا عدد اولین ہے؟", value: prime ? "ہاں، یہ عدد اولین ہے" : "نہیں، یہ عدد مرکب ہے" },
    { label: "اولین اجزاء میں تحلیل", value: fact },
    { label: "LaTeX فارمولا", value: latex },
    { label: "مقسومات کی تعداد d(n)", value: String(d) },
    { label: "مقسومات کا مجموعہ σ(n)", value: String(sigma) },
    { label: "اویلر کا فنکشن φ(n)", value: String(phi) },
    { label: "قریب ترین چھوٹا اولین", value: below === null ? "کوئی نہیں" : String(below) },
    { label: "قریب ترین بڑا اولین", value: String(above) }
  ];
  if (divs) results.push({ label: "تمام مقسومات", value: divs.join(", ") });

  const blocks = [
    {
      type: "table",
      caption: "اولین اجزاء کے قوت نما",
      head: ["اولین جزو", "قوت نما e", "قوت نما کے انتخاب کی تعداد (e+1)"],
      rows: primes.map((p, i) => [String(p), String(exps[i]), String(exps[i] + 1)]),
      ltr: true
    }
  ];
  if (divs === null) blocks.push({ type: "note", text: `مقسومات کی تعداد ${d} بہت زیادہ ہے (${MAX_LIST} سے زیادہ)، اس لیے مقسومات کی فہرست نہیں دکھائی گئی۔` });

  return {
    results,
    steps,
    blocks,
    copy: `${n} = ${fact}، مقسومات کی تعداد ${d}`
  };
}
