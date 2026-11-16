import { fail, numList } from "../core/validate.js";
import { factorize } from "./prime-factorization.js";

const MAX = 1e15;

export const meta = {
  description: "Hitung FPB dan KPK untuk daftar 2 sampai 10 bilangan bulat positif, dengan algoritma Euclid dan faktorisasi prima, beserta tabel langkah.",
  keywords: ["FPB (faktor persekutuan terbesar)", "KPK (kelipatan persekutuan terkecil)", "GCD", "LCM", "Euclid", "HCF", "gcd lcm"],
  formulas: [
    { label: "algoritma Euclid", tex: "a = q\\cdot b + r" },
    { label: "Hubungan antara FPB dan KPK", tex: "\\operatorname{lcm}(a,b) = \\frac{a\\cdot b}{\\gcd(a,b)}" },
    { label: "dengan faktorisasi prima", tex: "\\gcd = \\prod p^{\\min e},\\qquad \\operatorname{lcm} = \\prod p^{\\max e}" }
  ],
  inputs: [
    { id: "numList", label: "Daftar bilangan bulat positif", type: "text", default: "48, 180", help: "2 sampai 10 bilangan dipisahkan koma atau spasi, dan setiap bilangan hingga 10^15." }
  ],
  example: { values: { numList: "48, 180" }, expect: ["GCD = 12", "LCM = 720"], note: "Contoh: FPB(48, 180) = 12 dan KPK(48, 180) = 720." },
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
  const list = numList(input, "numList", "Daftar bilangan", { positive: true, min: 2, max: 10 });
  const nums = list.map((v) => {
    if (!Number.isInteger(v) || v > MAX) fail(`Bilangan ${v} harus berupa bilangan bulat positif yang tidak melebihi 10^15.`, "numList");
    return BigInt(v);
  });

  const steps = [];
  const e = euclid(nums[0], nums[1]);
  steps.push(`Pertama: kita terapkan algoritma Euclid pada dua bilangan pertama ${nums[0]} dan ${nums[1]}, dengan setiap baris memenuhi a = q·b + r:`);
  for (const row of e.rows) {
    steps.push({ text: `Kita bagi ${row.x} dengan ${row.y}: hasil bagi q = ${row.q} dan sisa r = ${row.r}`, tex: `${row.x} = ${row.q}\\cdot ${row.y} + ${row.r}` });
  }
  let g = e.g;
  for (let i = 2; i < nums.length; i++) {
    const ng = gcd(g, nums[i]);
    steps.push({ text: `Kita ambil FPB dari hasil sebelumnya ${g} dengan bilangan ${nums[i]}:`, tex: `\\gcd(${g},${nums[i]}) = ${ng}` });
    g = ng;
  }

  steps.push("Kedua: KPK menggunakan FPB:");
  let l = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const d = gcd(l, nums[i]);
    const nl = (l / d) * nums[i];
    steps.push({ text: `Kita hitung KPK dari ${l} dan ${nums[i]}:`, tex: `\\operatorname{lcm}(${l},${nums[i]}) = \\frac{${l}\\cdot ${nums[i]}}{${d}} = ${nl}` });
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
  steps.push("Ketiga: faktorisasi prima, lalu kita ambil pangkat terkecil untuk FPB dan pangkat terbesar untuk KPK:");
  steps.push({ text: "FPB dari pangkat terkecil:", tex: `\\gcd = ${gPart.length ? gPart.join(" \\times ") : "1"} = ${g}` });
  steps.push({ text: "KPK dari pangkat terbesar:", tex: `\\operatorname{lcm} = ${lPart.length ? lPart.join(" \\times ") : "1"} = ${l}` });

  const head = ["Faktor prima", ...list.map((v) => String(v)), "Pangkat terkecil (FPB)", "Pangkat terbesar (KPK)"];
  return {
    results: [
      { label: "Faktor persekutuan terbesar (FPB)", value: String(g) },
      { label: "Kelipatan persekutuan terkecil (KPK)", value: String(l) }
    ],
    steps,
    blocks: [
      {
        type: "table",
        caption: "Tabel langkah Euclid untuk dua bilangan pertama",
        head: ["a", "b", "q", "r", "a = q·b + r"],
        rows: e.rows.map((r) => [String(r.x), String(r.y), String(r.q), String(r.r), `${r.x} = ${r.q}·${r.y} + ${r.r}`]),
        ltr: true
      },
      {
        type: "table",
        caption: "Pangkat faktor prima setiap bilangan",
        head,
        rows: rows.map((r) => [String(r.p), ...r.ex.map(String), String(r.mn), String(r.mx)]),
        ltr: true
      }
    ],
    copy: `GCD = ${g}، LCM = ${l}`
  };
}
