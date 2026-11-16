import { fail, numList } from "../core/validate.js";
import { factorize } from "./prime-factorization.js";

const MAX = 1e15;

export const meta = {
  description: "بزرگ‌ترین مقسوم‌علیه مشترک و کوچک‌ترین مضرب مشترک فهرستی از 2 تا 10 عدد صحیح مثبت را با الگوریتم اقلیدس و تجزیه به عوامل اول محاسبه کنید، همراه با جدول مراحل.",
  keywords: ["بزرگ‌ترین مقسوم‌علیه مشترک", "کوچک‌ترین مضرب مشترک", "GCD", "LCM", "اقلیدس", "HCF", "gcd lcm"],
  formulas: [
    { label: "الگوریتم اقلیدس", tex: "a = q\\cdot b + r" },
    { label: "رابطهٔ GCD و LCM", tex: "\\operatorname{lcm}(a,b) = \\frac{a\\cdot b}{\\gcd(a,b)}" },
    { label: "با تجزیه به عوامل اول", tex: "\\gcd = \\prod p^{\\min e},\\qquad \\operatorname{lcm} = \\prod p^{\\max e}" }
  ],
  inputs: [
    { id: "numList", label: "فهرست اعداد صحیح مثبت", type: "text", default: "48, 180", help: "از 2 تا 10 عدد که با ویرگول یا فاصله جدا شده‌اند، و هر عدد تا 10^15." }
  ],
  example: { values: { numList: "48, 180" }, expect: ["GCD = 12", "LCM = 720"], note: "مثال: GCD(48, 180) = 12 و LCM(48, 180) = 720." },
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
  const list = numList(input, "numList", "فهرست اعداد", { positive: true, min: 2, max: 10 });
  const nums = list.map((v) => {
    if (!Number.isInteger(v) || v > MAX) fail(`عدد ${v} باید عدد صحیح مثبتی باشد که از 10^15 بیشتر نشود.`, "numList");
    return BigInt(v);
  });

  const steps = [];
  const e = euclid(nums[0], nums[1]);
  steps.push(`نخست الگوریتم اقلیدس را روی دو عدد اول ${nums[0]} و ${nums[1]} اعمال می‌کنیم، که در هر سطر a = q·b + r برقرار است:`);
  for (const row of e.rows) {
    steps.push({ text: `${row.x} را بر ${row.y} تقسیم می‌کنیم: خارج‌قسمت q = ${row.q} و باقی‌مانده r = ${row.r}`, tex: `${row.x} = ${row.q}\\cdot ${row.y} + ${row.r}` });
  }
  let g = e.g;
  for (let i = 2; i < nums.length; i++) {
    const ng = gcd(g, nums[i]);
    steps.push({ text: `بزرگ‌ترین مقسوم‌علیه مشترک نتیجهٔ قبلی ${g} را با عدد ${nums[i]} محاسبه می‌کنیم:`, tex: `\\gcd(${g},${nums[i]}) = ${ng}` });
    g = ng;
  }

  steps.push("دوم: کوچک‌ترین مضرب مشترک با استفاده از بزرگ‌ترین مقسوم‌علیه مشترک:");
  let l = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const d = gcd(l, nums[i]);
    const nl = (l / d) * nums[i];
    steps.push({ text: `کوچک‌ترین مضرب مشترک ${l} با ${nums[i]} را محاسبه می‌کنیم:`, tex: `\\operatorname{lcm}(${l},${nums[i]}) = \\frac{${l}\\cdot ${nums[i]}}{${d}} = ${nl}` });
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
  steps.push("سوم: تجزیه به عوامل اول؛ سپس کوچک‌ترین توان را برای بزرگ‌ترین مقسوم‌علیه مشترک و بزرگ‌ترین توان را برای کوچک‌ترین مضرب مشترک برمی‌داریم:");
  steps.push({ text: "بزرگ‌ترین مقسوم‌علیه مشترک از کوچک‌ترین توان‌ها:", tex: `\\gcd = ${gPart.length ? gPart.join(" \\times ") : "1"} = ${g}` });
  steps.push({ text: "کوچک‌ترین مضرب مشترک از بزرگ‌ترین توان‌ها:", tex: `\\operatorname{lcm} = ${lPart.length ? lPart.join(" \\times ") : "1"} = ${l}` });

  const head = ["عامل اول", ...list.map((v) => String(v)), "کوچک‌ترین توان (GCD)", "بزرگ‌ترین توان (LCM)"];
  return {
    results: [
      { label: "بزرگ‌ترین مقسوم‌علیه مشترک (GCD)", value: String(g) },
      { label: "کوچک‌ترین مضرب مشترک (LCM)", value: String(l) }
    ],
    steps,
    blocks: [
      {
        type: "table",
        caption: "جدول مراحل اقلیدس برای دو عدد اول",
        head: ["a", "b", "q", "r", "a = q·b + r"],
        rows: e.rows.map((r) => [String(r.x), String(r.y), String(r.q), String(r.r), `${r.x} = ${r.q}·${r.y} + ${r.r}`]),
        ltr: true
      },
      {
        type: "table",
        caption: "توان‌های عوامل اول برای هر عدد",
        head,
        rows: rows.map((r) => [String(r.p), ...r.ex.map(String), String(r.mn), String(r.mx)]),
        ltr: true
      }
    ],
    copy: `GCD = ${g}، LCM = ${l}`
  };
}
