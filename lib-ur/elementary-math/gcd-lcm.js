import { fail, numList } from "../core/validate.js";
import { factorize } from "./prime-factorization.js";

const MAX = 1e15;

export const meta = {
  description: "اقلیدس کے الگورتھم اور اولین جزو میں تحلیل کے ذریعے 2 سے 10 مثبت صحیح اعداد کی فہرست کا بڑا مشترک جزو اور کم سے کم مشترک مضاعف حساب کریں، ساتھ مراحل کا جدول۔",
  keywords: ["بڑا مشترک جزو", "کم سے کم مشترک مضاعف", "GCD", "LCM", "اقلیدس", "HCF", "gcd lcm"],
  formulas: [
    { label: "اقلیدس کا الگورتھم", tex: "a = q\\cdot b + r" },
    { label: "GCD اور LCM کا تعلق", tex: "\\operatorname{lcm}(a,b) = \\frac{a\\cdot b}{\\gcd(a,b)}" },
    { label: "اولین جزو میں تحلیل سے", tex: "\\gcd = \\prod p^{\\min e},\\qquad \\operatorname{lcm} = \\prod p^{\\max e}" }
  ],
  inputs: [
    { id: "numList", label: "مثبت صحیح اعداد کی فہرست", type: "text", default: "48, 180", help: "کاما یا خالی جگہ سے الگ کیے گئے 2 سے 10 اعداد، ہر عدد 10^15 تک۔" }
  ],
  example: { values: { numList: "48, 180" }, expect: ["GCD = 12", "LCM = 720"], note: "مثال: GCD(48, 180) = 12 اور LCM(48, 180) = 720۔" },
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
  const list = numList(input, "numList", "اعداد کی فہرست", { positive: true, min: 2, max: 10 });
  const nums = list.map((v) => {
    if (!Number.isInteger(v) || v > MAX) fail(`عدد ${v} ایک مثبت صحیح عدد ہونا چاہیے جو 10^15 سے زیادہ نہ ہو۔`, "numList");
    return BigInt(v);
  });

  const steps = [];
  const e = euclid(nums[0], nums[1]);
  steps.push(`پہلے ہم اقلیدس الگورتھم کو پہلے دو اعداد ${nums[0]} اور ${nums[1]} پر لاگو کرتے ہیں، جہاں ہر سطر a = q·b + r کو پورا کرتی ہے:`);
  for (const row of e.rows) {
    steps.push({ text: `ہم ${row.x} کو ${row.y} سے تقسیم کرتے ہیں: خارج قسمت q = ${row.q} اور باقی r = ${row.r}`, tex: `${row.x} = ${row.q}\\cdot ${row.y} + ${row.r}` });
  }
  let g = e.g;
  for (let i = 2; i < nums.length; i++) {
    const ng = gcd(g, nums[i]);
    steps.push({ text: `ہم پچھلے نتیجے ${g} اور عدد ${nums[i]} کا GCD لیتے ہیں:`, tex: `\\gcd(${g},${nums[i]}) = ${ng}` });
    g = ng;
  }

  steps.push("دوسرا، GCD کی مدد سے LCM:");
  let l = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const d = gcd(l, nums[i]);
    const nl = (l / d) * nums[i];
    steps.push({ text: `ہم ${l} اور ${nums[i]} کا LCM حساب کرتے ہیں:`, tex: `\\operatorname{lcm}(${l},${nums[i]}) = \\frac{${l}\\cdot ${nums[i]}}{${d}} = ${nl}` });
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
  steps.push("تیسرا، اولین جزو میں تحلیل: GCD کے لیے سب سے چھوٹا اور LCM کے لیے سب سے بڑا قوت نما لیتے ہیں:");
  steps.push({ text: "چھوٹے قوت نماؤں سے GCD:", tex: `\\gcd = ${gPart.length ? gPart.join(" \\times ") : "1"} = ${g}` });
  steps.push({ text: "بڑے قوت نماؤں سے LCM:", tex: `\\operatorname{lcm} = ${lPart.length ? lPart.join(" \\times ") : "1"} = ${l}` });

  const head = ["اولین جزو", ...list.map((v) => String(v)), "سب سے چھوٹا قوت نما (GCD)", "سب سے بڑا قوت نما (LCM)"];
  return {
    results: [
      { label: "بڑا مشترک جزو (GCD)", value: String(g) },
      { label: "کم سے کم مشترک مضاعف (LCM)", value: String(l) }
    ],
    steps,
    blocks: [
      {
        type: "table",
        caption: "پہلے دو اعداد کے لیے اقلیدس الگورتھم کے مراحل",
        head: ["a", "b", "q", "r", "a = q·b + r"],
        rows: e.rows.map((r) => [String(r.x), String(r.y), String(r.q), String(r.r), `${r.x} = ${r.q}·${r.y} + ${r.r}`]),
        ltr: true
      },
      {
        type: "table",
        caption: "ہر عدد کے اولین اجزاء کے قوت نما",
        head,
        rows: rows.map((r) => [String(r.p), ...r.ex.map(String), String(r.mn), String(r.mx)]),
        ltr: true
      }
    ],
    copy: `GCD = ${g}، LCM = ${l}`
  };
}
