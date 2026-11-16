import { fail, numList } from "../core/validate.js";
import { factorize } from "./prime-factorization.js";

const MAX = 1e15;

export const meta = {
  description: "2 ile 10 arasındaki pozitif tam sayılar listesi için en büyük ortak böleni ve en küçük ortak katı Öklid algoritmasıyla ve asal çarpanlara ayırarak hesaplayın; adım tablosuyla birlikte.",
  keywords: ["En büyük ortak bölen", "En küçük ortak kat", "GCD", "LCM", "Öklid", "HCF", "gcd lcm"],
  formulas: [
    { label: "Öklid algoritması", tex: "a = q\\cdot b + r" },
    { label: "GCD ile LCM arasındaki ilişki", tex: "\\operatorname{lcm}(a,b) = \\frac{a\\cdot b}{\\gcd(a,b)}" },
    { label: "Asal çarpanlara ayırma", tex: "\\gcd = \\prod p^{\\min e},\\qquad \\operatorname{lcm} = \\prod p^{\\max e}" }
  ],
  inputs: [
    { id: "numList", label: "Pozitif tam sayılar listesi", type: "text", default: "48, 180", help: "Virgül veya boşlukla ayrılmış 2 ile 10 arasında sayı; her sayı en fazla 10^15." }
  ],
  example: { values: { numList: "48, 180" }, expect: ["GCD = 12", "LCM = 720"], note: "Örnek: GCD(48, 180) = 12 ve LCM(48, 180) = 720." },
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
  const list = numList(input, "numList", "Sayılar listesi", { positive: true, min: 2, max: 10 });
  const nums = list.map((v) => {
    if (!Number.isInteger(v) || v > MAX) fail(`${v} sayısı, en fazla 10^15 olan pozitif bir tam sayı olmalıdır.`, "numList");
    return BigInt(v);
  });

  const steps = [];
  const e = euclid(nums[0], nums[1]);
  steps.push(`Önce ilk iki sayı ${nums[0]} ve ${nums[1]} için Öklid algoritmasını uyguluyoruz; her satır a = q·b + r sağlar:`);
  for (const row of e.rows) {
    steps.push({ text: `${row.x} sayısını ${row.y} sayısına bölüyoruz: bölüm q = ${row.q}, kalan r = ${row.r}`, tex: `${row.x} = ${row.q}\\cdot ${row.y} + ${row.r}` });
  }
  let g = e.g;
  for (let i = 2; i < nums.length; i++) {
    const ng = gcd(g, nums[i]);
    steps.push({ text: `Önceki sonucun ${g} ile ${nums[i]} sayısının ortak bölenini alıyoruz:`, tex: `\\gcd(${g},${nums[i]}) = ${ng}` });
    g = ng;
  }

  steps.push("İkinci olarak en küçük ortak katı en büyük ortak bölen yardımıyla hesaplıyoruz:");
  let l = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const d = gcd(l, nums[i]);
    const nl = (l / d) * nums[i];
    steps.push({ text: `${l} ile ${nums[i]} sayısının ortak katını hesaplıyoruz:`, tex: `\\operatorname{lcm}(${l},${nums[i]}) = \\frac{${l}\\cdot ${nums[i]}}{${d}} = ${nl}` });
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
  steps.push("Üçüncü olarak asal çarpanlara ayırıyor; en büyük ortak bölen için en küçük üsleri, en küçük ortak kat için en büyük üsleri alıyoruz:");
  steps.push({ text: "En büyük ortak bölen, en küçük üslerden:", tex: `\\gcd = ${gPart.length ? gPart.join(" \\times ") : "1"} = ${g}` });
  steps.push({ text: "En küçük ortak kat, en büyük üslerden:", tex: `\\operatorname{lcm} = ${lPart.length ? lPart.join(" \\times ") : "1"} = ${l}` });

  const head = ["Asal çarpan", ...list.map((v) => String(v)), "En küçük üs (GCD)", "En büyük üs (LCM)"];
  return {
    results: [
      { label: "En büyük ortak bölen (GCD)", value: String(g) },
      { label: "En küçük ortak kat (LCM)", value: String(l) }
    ],
    steps,
    blocks: [
      {
        type: "table",
        caption: "İlk iki sayı için Öklid adım tablosu",
        head: ["a", "b", "q", "r", "a = q·b + r"],
        rows: e.rows.map((r) => [String(r.x), String(r.y), String(r.q), String(r.r), `${r.x} = ${r.q}·${r.y} + ${r.r}`]),
        ltr: true
      },
      {
        type: "table",
        caption: "Her sayının asal çarpan üsleri",
        head,
        rows: rows.map((r) => [String(r.p), ...r.ex.map(String), String(r.mn), String(r.mx)]),
        ltr: true
      }
    ],
    copy: `GCD = ${g}، LCM = ${l}`
  };
}
