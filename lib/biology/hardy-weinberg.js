import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHI_CRIT = 3.841;

export const meta = {
  description: "طبّق اتزان هاردي-واينبرغ لحساب تكرارات الأليلات والطرز الجينية من تكرار الصفة المتنحية، أو اختبر مطابقة أعداد الأفراد المشاهدة للاتزان بمربع كاي.",
  keywords: ["هاردي واينبرغ", "Hardy-Weinberg", "تكرار الأليل", "الحاملون", "وراثة", "مربع كاي", "chi-square", "علم الوراثة الفعلي"],
  formulas: [
    { label: "معادلة الاتزان", tex: "p^2 + 2pq + q^2 = 1,\\qquad p + q = 1" },
    { label: "اختبار مربع كاي (df = 1)", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "mode", label: "طريقة الحساب", type: "select", default: "recessive", options: [["recessive", "من تكرار الصفة المتنحية"], ["counts", "من أعداد الأفراد المشاهدة"]] },
    { id: "pheno", label: "تكرار الصفة المتنحية (aa)", type: "number", default: "0.04", when: { mode: ["recessive"] }, help: "الأفراد المصابون بالصفة المتنحية هم الطراز aa فقط." },
    { id: "phenoUnit", label: "وحدة التكرار", type: "select", default: "fraction", options: [["fraction", "كسر (من 0 إلى 1)"], ["percent", "نسبة مئوية (٪)"]], when: { mode: ["recessive"] } },
    { id: "nAA", label: "عدد الأفراد AA", type: "number", default: "36", when: { mode: ["counts"] } },
    { id: "nAa", label: "عدد الأفراد Aa", type: "number", default: "48", when: { mode: ["counts"] } },
    { id: "naa", label: "عدد الأفراد aa", type: "number", default: "16", when: { mode: ["counts"] } }
  ],
  example: { values: { mode: "counts", pheno: "0.04", phenoUnit: "fraction", nAA: "36", nAa: "48", naa: "16" }, expect: ["p = 0.6", "χ² = 0"], note: "مثال: 36 أ AA و48 أ Aa و16 أ aa تطابق الاتزان تماماً." },
  invalid: { values: { mode: "recessive", pheno: "1.5", phenoUnit: "fraction", nAA: "0", nAa: "0", naa: "0" } },
  related: ["punnett-square", "dna-tools"]
};

function fromPheno(input) {
  const unit = choice(input, "phenoUnit", "وحدة التكرار", ["fraction", "percent"], "fraction");
  const raw = num(input, "pheno", "تكرار الصفة المتنحية", { nonNegative: true });
  const max = unit === "percent" ? 100 : 1;
  if (raw > max) fail(`تكرار الصفة المتنحية يجب ألا يتجاوز ${max}${unit === "percent" ? "٪" : ""}.`, "pheno");
  const qq = unit === "percent" ? raw / 100 : raw;
  const q = Math.sqrt(qq);
  const p = 1 - q;
  const pp = p * p;
  const twopq = 2 * p * q;
  const carriers = twopq * 1000;
  return {
    results: [
      { label: "تكرار الأليل المتنحي q", value: fmt(q, 4) },
      { label: "تكرار الأليل السائد p", value: fmt(p, 4) },
      { label: "الطراز AA (p²)", value: `${fmt(pp, 4)} ≈ ${fmt(pp * 1000, 4)} من 1000` },
      { label: "الطراز Aa (2pq)", value: `${fmt(twopq, 4)} ≈ ${fmt(carriers, 4)} من 1000` },
      { label: "الطراز aa (q²)", value: `${fmt(qq, 4)} ≈ ${fmt(qq * 1000, 4)} من 1000` },
      { label: "عدد الحاملين لكل 1000 فرد", value: fmt(carriers, 4) }
    ],
    steps: [
      { text: "تكرار الطراز المتنحي aa هو q²:", tex: `q^2 = ${ntex(qq)}` },
      { text: "نأخذ الجذر التربيعي لإيجاد q:", tex: `q = \\sqrt{${ntex(qq)}} = ${ntex(q, 6)}` },
      { text: "من العلاقة p + q = 1:", tex: `p = 1 - q = ${ntex(p, 6)}` },
      { text: "تكرار الحاملين Aa:", tex: `2pq = 2 \\times ${ntex(p, 6)} \\times ${ntex(q, 6)} = ${ntex(twopq, 6)}` }
    ],
    copy: `q = ${fmt(q, 4)}، p = ${fmt(p, 4)}، الحاملون لكل 1000 = ${fmt(carriers, 4)}`,
    blocks: [
      { type: "table", caption: "الطرز الجينية المتوقعة", head: ["الطراز الجيني", "التكرار المتوقع", "لكل 1000 فرد"], rows: [["AA (سائد)", fmt(pp, 4), fmt(pp * 1000, 4)], ["Aa (حامل)", fmt(twopq, 4), fmt(carriers, 4)], ["aa (متنحٍ)", fmt(qq, 4), fmt(qq * 1000, 4)]], ltr: true },
      { type: "note", text: "يفترض الاتزان: عشيرة كبيرة، تزاوجاً عشوائياً، وغياب الطفرة والهجرة والانتقاء الطبيعي." }
    ]
  };
}

function fromCounts(input) {
  const AA = num(input, "nAA", "عدد الأفراد AA", { integer: true, nonNegative: true });
  const Aa = num(input, "nAa", "عدد الأفراد Aa", { integer: true, nonNegative: true });
  const aa = num(input, "naa", "عدد الأفراد aa", { integer: true, nonNegative: true });
  const N = AA + Aa + aa;
  if (N === 0) fail("يجب أن يكون مجموع الأفراد أكبر من صفر.", "nAA");
  const p = (2 * AA + Aa) / (2 * N);
  const q = 1 - p;
  const O = [AA, Aa, aa];
  const E = [p * p * N, 2 * p * q * N, q * q * N];
  let chi = 0;
  for (let i = 0; i < 3; i++) if (E[i] > 0) chi += ((O[i] - E[i]) ** 2) / E[i];
  if (chi < 1e-12) chi = 0;
  const significant = chi >= CHI_CRIT;
  const verdict = significant
    ? "يوجد انحراف معنوي عن اتزان هاردي-واينبرغ عند مستوى 0.05."
    : "لا يوجد انحراف معنوي عن اتزان هاردي-واينبرغ عند مستوى 0.05.";
  const blocks = [{
    type: "table",
    caption: "المشاهد مقابل المتوقع",
    head: ["الطراز", "مشاهد O", "متوقع E", "(O − E)² / E"],
    rows: [
      ["AA", String(AA), fmt(E[0], 4), fmt(E[0] > 0 ? ((AA - E[0]) ** 2) / E[0] : 0, 4)],
      ["Aa", String(Aa), fmt(E[1], 4), fmt(E[1] > 0 ? ((Aa - E[1]) ** 2) / E[1] : 0, 4)],
      ["aa", String(aa), fmt(E[2], 4), fmt(E[2] > 0 ? ((aa - E[2]) ** 2) / E[2] : 0, 4)]
    ],
    ltr: true
  }];
  if (E.some((e) => e < 5)) blocks.push({ type: "note", tone: "warn", text: "بعض التكرارات المتوقعة أقل من 5، لذا قد يكون اختبار χ² غير دقيق." });
  return {
    results: [
      { label: "عدد الأفراد N", value: String(N) },
      { label: "تكرار الأليل A (p)", value: fmt(p, 4) },
      { label: "تكرار الأليل a (q)", value: fmt(q, 4) },
      { label: "التكرارات المتوقعة AA / Aa / aa", value: `${fmt(E[0], 4)} / ${fmt(E[1], 4)} / ${fmt(E[2], 4)}` },
      { label: "قيمة χ²", value: fmt(chi, 4) },
      { label: "الحكم الإحصائي", value: significant ? "انحراف معنوي" : "لا يوجد انحراف معنوي" , text: verdict }
    ],
    steps: [
      { text: "تكرار الأليل A من الأليلات المشاهدة:", tex: `p = \\frac{2 \\times ${AA} + ${Aa}}{2 \\times ${N}} = ${ntex(p, 6)}` },
      { text: "تكرار الأليل a:", tex: `q = 1 - p = ${ntex(q, 6)}` },
      { text: "التكرارات المتوقعة للاتزان:", tex: `E_{AA} = p^2 N,\\; E_{Aa} = 2pqN,\\; E_{aa} = q^2 N = ${fmt(E[0], 4)},\\ ${fmt(E[1], 4)},\\ ${fmt(E[2], 4)}` },
      { text: "قيمة مربع كاي (df = 1):", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(chi, 6)}` },
      `الحكم: إذا كانت χ² أكبر من أو تساوي ${CHI_CRIT} (القيمة الحرجة عند 0.05 ودرجة حرية 1) يُرفض الاتزان.`
    ],
    copy: `p = ${fmt(p, 4)}، q = ${fmt(q, 4)}، χ² = ${fmt(chi, 4)} (df = 1) — ${significant ? "انحراف معنوي" : "متوافق مع الاتزان"}`,
    blocks
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "طريقة الحساب", ["recessive", "counts"], "recessive");
  return mode === "counts" ? fromCounts(input) : fromPheno(input);
}
