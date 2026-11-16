import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHI_CRIT = 3.841;

export const meta = {
  description: "قانون تعادل هاردی-واینبرگ را برای محاسبه فراوانی آلل‌ها و ژنوتیپ‌ها از فراوانی صفت مغلوب به کار ببرید، یا با آزمون خی‌دو بررسی کنید که تعداد مشاهده‌شده افراد با تعادل سازگار است یا نه.",
  keywords: ["هاردی-واینبرگ", "Hardy-Weinberg", "فراوانی آلل", "حامل‌ها", "وراثت", "خی‌دو", "chi-square", "ژنتیک جمعیت"],
  formulas: [
    { label: "معادله تعادل", tex: "p^2 + 2pq + q^2 = 1,\\qquad p + q = 1" },
    { label: "آزمون خی‌دو (df = 1)", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "mode", label: "روش محاسبه", type: "select", default: "recessive", options: [["recessive", "از فراوانی صفت مغلوب"], ["counts", "از تعداد افراد مشاهده‌شده"]] },
    { id: "pheno", label: "فراوانی صفت مغلوب (aa)", type: "number", default: "0.04", when: { mode: ["recessive"] }, help: "افراد دارای صفت مغلوب فقط ژنوتیپ aa دارند." },
    { id: "phenoUnit", label: "واحد فراوانی", type: "select", default: "fraction", options: [["fraction", "کسر (از 0 تا 1)"], ["percent", "درصد (%)"]], when: { mode: ["recessive"] } },
    { id: "nAA", label: "تعداد افراد AA", type: "number", default: "36", when: { mode: ["counts"] } },
    { id: "nAa", label: "تعداد افراد Aa", type: "number", default: "48", when: { mode: ["counts"] } },
    { id: "naa", label: "تعداد افراد aa", type: "number", default: "16", when: { mode: ["counts"] } }
  ],
  example: { values: { mode: "counts", pheno: "0.04", phenoUnit: "fraction", nAA: "36", nAa: "48", naa: "16" }, expect: ["p = 0.6", "χ² = 0"], note: "مثال: 36 فرد AA و 48 فرد Aa و 16 فرد aa دقیقاً با تعادل مطابقت دارند." },
  invalid: { values: { mode: "recessive", pheno: "1.5", phenoUnit: "fraction", nAA: "0", nAa: "0", naa: "0" } },
  related: ["punnett-square", "dna-tools"]
};

function fromPheno(input) {
  const unit = choice(input, "phenoUnit", "واحد فراوانی", ["fraction", "percent"], "fraction");
  const raw = num(input, "pheno", "فراوانی صفت مغلوب", { nonNegative: true });
  const max = unit === "percent" ? 100 : 1;
  if (raw > max) fail(`فراوانی صفت مغلوب نباید از ${max}${unit === "percent" ? "٪" : ""} بیشتر باشد.`, "pheno");
  const qq = unit === "percent" ? raw / 100 : raw;
  const q = Math.sqrt(qq);
  const p = 1 - q;
  const pp = p * p;
  const twopq = 2 * p * q;
  const carriers = twopq * 1000;
  return {
    results: [
      { label: "فراوانی آلل مغلوب q", value: fmt(q, 4) },
      { label: "فراوانی آلل غالب p", value: fmt(p, 4) },
      { label: "ژنوتیپ AA (p²)", value: `${fmt(pp, 4)} ≈ ${fmt(pp * 1000, 4)} از 1000` },
      { label: "ژنوتیپ Aa (2pq)", value: `${fmt(twopq, 4)} ≈ ${fmt(carriers, 4)} از 1000` },
      { label: "ژنوتیپ aa (q²)", value: `${fmt(qq, 4)} ≈ ${fmt(qq * 1000, 4)} از 1000` },
      { label: "تعداد حامل‌ها در هر 1000 فرد", value: fmt(carriers, 4) }
    ],
    steps: [
      { text: "فراوانی ژنوتیپ مغلوب aa برابر q² است:", tex: `q^2 = ${ntex(qq)}` },
      { text: "جذر می‌گیریم تا q به دست آید:", tex: `q = \\sqrt{${ntex(qq)}} = ${ntex(q, 6)}` },
      { text: "از رابطه p + q = 1:", tex: `p = 1 - q = ${ntex(p, 6)}` },
      { text: "فراوانی حامل‌های Aa:", tex: `2pq = 2 \\times ${ntex(p, 6)} \\times ${ntex(q, 6)} = ${ntex(twopq, 6)}` }
    ],
    copy: `q = ${fmt(q, 4)}، p = ${fmt(p, 4)}، حامل‌ها در هر 1000 = ${fmt(carriers, 4)}`,
    blocks: [
      { type: "table", caption: "ژنوتیپ‌های مورد انتظار", head: ["ژنوتیپ", "فراوانی مورد انتظار", "در هر 1000 فرد"], rows: [["AA (غالب)", fmt(pp, 4), fmt(pp * 1000, 4)], ["Aa (حامل)", fmt(twopq, 4), fmt(carriers, 4)], ["aa (مغلوب)", fmt(qq, 4), fmt(qq * 1000, 4)]], ltr: true },
      { type: "note", text: "تعادل فرض می‌کند: جمعیت بزرگ، جفت‌گیری تصادفی، و نبود جهش، مهاجرت و انتخاب طبیعی." }
    ]
  };
}

function fromCounts(input) {
  const AA = num(input, "nAA", "تعداد افراد AA", { integer: true, nonNegative: true });
  const Aa = num(input, "nAa", "تعداد افراد Aa", { integer: true, nonNegative: true });
  const aa = num(input, "naa", "تعداد افراد aa", { integer: true, nonNegative: true });
  const N = AA + Aa + aa;
  if (N === 0) fail("مجموع افراد باید بزرگ‌تر از صفر باشد.", "nAA");
  const p = (2 * AA + Aa) / (2 * N);
  const q = 1 - p;
  const O = [AA, Aa, aa];
  const E = [p * p * N, 2 * p * q * N, q * q * N];
  let chi = 0;
  for (let i = 0; i < 3; i++) if (E[i] > 0) chi += ((O[i] - E[i]) ** 2) / E[i];
  if (chi < 1e-12) chi = 0;
  const significant = chi >= CHI_CRIT;
  const verdict = significant
    ? "در سطح 0.05 انحراف معنادار از تعادل هاردی-واینبرگ وجود دارد."
    : "در سطح 0.05 انحراف معناداری از تعادل هاردی-واینبرگ وجود ندارد.";
  const blocks = [{
    type: "table",
    caption: "مشاهده‌شده در برابر مورد انتظار",
    head: ["ژنوتیپ", "مشاهده‌شده O", "مورد انتظار E", "(O − E)² / E"],
    rows: [
      ["AA", String(AA), fmt(E[0], 4), fmt(E[0] > 0 ? ((AA - E[0]) ** 2) / E[0] : 0, 4)],
      ["Aa", String(Aa), fmt(E[1], 4), fmt(E[1] > 0 ? ((Aa - E[1]) ** 2) / E[1] : 0, 4)],
      ["aa", String(aa), fmt(E[2], 4), fmt(E[2] > 0 ? ((aa - E[2]) ** 2) / E[2] : 0, 4)]
    ],
    ltr: true
  }];
  if (E.some((e) => e < 5)) blocks.push({ type: "note", tone: "warn", text: "برخی تعداد‌های مورد انتظار کمتر از 5 است، پس آزمون χ² ممکن است دقیق نباشد." });
  return {
    results: [
      { label: "تعداد افراد N", value: String(N) },
      { label: "فراوانی آلل A (p)", value: fmt(p, 4) },
      { label: "فراوانی آلل a (q)", value: fmt(q, 4) },
      { label: "تعداد مورد انتظار AA / Aa / aa", value: `${fmt(E[0], 4)} / ${fmt(E[1], 4)} / ${fmt(E[2], 4)}` },
      { label: "مقدار χ²", value: fmt(chi, 4) },
      { label: "نتیجه آماری", value: significant ? "انحراف معنادار" : "انحراف معناداری وجود ندارد" , text: verdict }
    ],
    steps: [
      { text: "فراوانی آلل A از میان آلل‌های مشاهده‌شده:", tex: `p = \\frac{2 \\times ${AA} + ${Aa}}{2 \\times ${N}} = ${ntex(p, 6)}` },
      { text: "فراوانی آلل a:", tex: `q = 1 - p = ${ntex(q, 6)}` },
      { text: "تعداد مورد انتظار در تعادل:", tex: `E_{AA} = p^2 N,\\; E_{Aa} = 2pqN,\\; E_{aa} = q^2 N = ${fmt(E[0], 4)},\\ ${fmt(E[1], 4)},\\ ${fmt(E[2], 4)}` },
      { text: "مقدار خی‌دو (df = 1):", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(chi, 6)}` },
      `نتیجه‌گیری: اگر χ² بزرگ‌تر یا مساوی ${CHI_CRIT} باشد (مقدار بحرانی در سطح 0.05 با یک درجه آزادی)، تعادل رد می‌شود.`
    ],
    copy: `p = ${fmt(p, 4)}، q = ${fmt(q, 4)}، χ² = ${fmt(chi, 4)} (df = 1) — ${significant ? "انحراف معنادار" : "سازگار با تعادل"}`,
    blocks
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "روش محاسبه", ["recessive", "counts"], "recessive");
  return mode === "counts" ? fromCounts(input) : fromPheno(input);
}
