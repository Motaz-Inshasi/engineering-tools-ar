import { fail, numList } from "../core/validate.js";
import { factorize } from "./prime-factorization.js";

const MAX = 1e15;

export const meta = {
  description: "احسب القاسم المشترك الأكبر والمضاعف المشترك الأصغر لقائمة من 2 إلى 10 أعداد صحيحة موجبة، بخوارزمية إقليدس وبالتحليل إلى العوامل الأولية، مع جدول الخطوات.",
  keywords: ["القاسم المشترك الأكبر", "المضاعف المشترك الأصغر", "GCD", "LCM", "إقليدس", "HCF", "gcd lcm"],
  formulas: [
    { label: "خوارزمية إقليدس", tex: "a = q\\cdot b + r" },
    { label: "العلاقة بين GCD و LCM", tex: "\\operatorname{lcm}(a,b) = \\frac{a\\cdot b}{\\gcd(a,b)}" },
    { label: "بالتحليل إلى عوامل", tex: "\\gcd = \\prod p^{\\min e},\\qquad \\operatorname{lcm} = \\prod p^{\\max e}" }
  ],
  inputs: [
    { id: "numList", label: "قائمة الأعداد الصحيحة الموجبة", type: "text", default: "48, 180", help: "من 2 إلى 10 أعداد مفصولة بفاصلة أو مسافة، وكل عدد حتى 10^15." }
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
  const list = numList(input, "numList", "قائمة الأعداد", { positive: true, min: 2, max: 10 });
  const nums = list.map((v) => {
    if (!Number.isInteger(v) || v > MAX) fail(`العدد ${v} يجب أن يكون عدداً صحيحاً موجباً لا يتجاوز 10^15.`, "numList");
    return BigInt(v);
  });

  const steps = [];
  const e = euclid(nums[0], nums[1]);
  steps.push(`أولاً: نطبّق خوارزمية إقليدس على أول عددين ${nums[0]} و${nums[1]}، وكل سطر يحقق a = q·b + r:`);
  for (const row of e.rows) {
    steps.push({ text: `نقسم ${row.x} على ${row.y}: الخارج q = ${row.q} والباقي r = ${row.r}`, tex: `${row.x} = ${row.q}\\cdot ${row.y} + ${row.r}` });
  }
  let g = e.g;
  for (let i = 2; i < nums.length; i++) {
    const ng = gcd(g, nums[i]);
    steps.push({ text: `نأخذ القاسم المشترك للنتيجة السابقة ${g} مع العدد ${nums[i]}:`, tex: `\\gcd(${g},${nums[i]}) = ${ng}` });
    g = ng;
  }

  steps.push("ثانياً: المضاعف المشترك الأصغر باستخدام القاسم المشترك الأكبر:");
  let l = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const d = gcd(l, nums[i]);
    const nl = (l / d) * nums[i];
    steps.push({ text: `نحسب المضاعف المشترك لـ ${l} مع ${nums[i]}:`, tex: `\\operatorname{lcm}(${l},${nums[i]}) = \\frac{${l}\\cdot ${nums[i]}}{${d}} = ${nl}` });
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
  steps.push("ثالثاً: التحليل إلى العوامل الأولية، ثم نأخذ أصغر أس للقاسم المشترك الأكبر وأكبر أس للمضاعف المشترك الأصغر:");
  steps.push({ text: "القاسم المشترك الأكبر من أصغر الأسس:", tex: `\\gcd = ${gPart.length ? gPart.join(" \\times ") : "1"} = ${g}` });
  steps.push({ text: "المضاعف المشترك الأصغر من أكبر الأسس:", tex: `\\operatorname{lcm} = ${lPart.length ? lPart.join(" \\times ") : "1"} = ${l}` });

  const head = ["العامل الأولي", ...list.map((v) => String(v)), "أصغر أس (GCD)", "أكبر أس (LCM)"];
  return {
    results: [
      { label: "القاسم المشترك الأكبر (GCD)", value: String(g) },
      { label: "المضاعف المشترك الأصغر (LCM)", value: String(l) }
    ],
    steps,
    blocks: [
      {
        type: "table",
        caption: "جدول خطوات إقليدس للعددين الأولين",
        head: ["a", "b", "q", "r", "a = q·b + r"],
        rows: e.rows.map((r) => [String(r.x), String(r.y), String(r.q), String(r.r), `${r.x} = ${r.q}·${r.y} + ${r.r}`]),
        ltr: true
      },
      {
        type: "table",
        caption: "أسس العوامل الأولية لكل عدد",
        head,
        rows: rows.map((r) => [String(r.p), ...r.ex.map(String), String(r.mn), String(r.mx)]),
        ltr: true
      }
    ],
    copy: `GCD = ${g}، LCM = ${l}`
  };
}
