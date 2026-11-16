import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const CHI_CRIT = 3.841;

export const meta = {
  description: "ہارڈی-وائن برگ توازن لاگو کر کے مغلوب صفت کی فریکوئنسی سے ایلیل اور جینوٹائپ کی فریکوئنسیاں نکالیں، یا کائی اسکوائر ٹیسٹ سے مشاہدہ شدہ افراد کی تعداد کو توازن کے مطابق جانچیں۔",
  keywords: ["ہارڈی وائن برگ", "Hardy-Weinberg", "ایلیل فریکوئنسی", "کیریئرز", "وراثت", "کائی اسکوائر", "chi-square", "پاپولیشن جینیٹکس"],
  formulas: [
    { label: "توازن کی مساوات", tex: "p^2 + 2pq + q^2 = 1,\\qquad p + q = 1" },
    { label: "کائی اسکوائر ٹیسٹ (df = 1)", tex: "\\chi^2 = \\sum \\frac{(O - E)^2}{E}" }
  ],
  inputs: [
    { id: "mode", label: "حساب کا طریقہ", type: "select", default: "recessive", options: [["recessive", "مغلوب صفت کی فریکوئنسی سے"], ["counts", "مشاہدہ شدہ افراد کی تعداد سے"]] },
    { id: "pheno", label: "مغلوب صفت کی فریکوئنسی (aa)", type: "number", default: "0.04", when: { mode: ["recessive"] }, help: "مغلوب صفت کے حامل افراد صرف aa جینوٹائپ رکھتے ہیں۔" },
    { id: "phenoUnit", label: "فریکوئنسی کی اکائی", type: "select", default: "fraction", options: [["fraction", "کسر (0 سے 1 تک)"], ["percent", "فیصد (%)"]], when: { mode: ["recessive"] } },
    { id: "nAA", label: "AA افراد کی تعداد", type: "number", default: "36", when: { mode: ["counts"] } },
    { id: "nAa", label: "Aa افراد کی تعداد", type: "number", default: "48", when: { mode: ["counts"] } },
    { id: "naa", label: "aa افراد کی تعداد", type: "number", default: "16", when: { mode: ["counts"] } }
  ],
  example: { values: { mode: "counts", pheno: "0.04", phenoUnit: "fraction", nAA: "36", nAa: "48", naa: "16" }, expect: ["p = 0.6", "χ² = 0"], note: "مثال: 36 AA، 48 Aa اور 16 aa افراد توازن سے بالکل مطابقت رکھتے ہیں۔" },
  invalid: { values: { mode: "recessive", pheno: "1.5", phenoUnit: "fraction", nAA: "0", nAa: "0", naa: "0" } },
  related: ["punnett-square", "dna-tools"]
};

function fromPheno(input) {
  const unit = choice(input, "phenoUnit", "فریکوئنسی کی اکائی", ["fraction", "percent"], "fraction");
  const raw = num(input, "pheno", "مغلوب صفت کی فریکوئنسی", { nonNegative: true });
  const max = unit === "percent" ? 100 : 1;
  if (raw > max) fail(`مغلوب صفت کی فریکوئنسی ${max}${unit === "percent" ? "٪" : ""} سے زیادہ نہیں ہونی چاہیے۔`, "pheno");
  const qq = unit === "percent" ? raw / 100 : raw;
  const q = Math.sqrt(qq);
  const p = 1 - q;
  const pp = p * p;
  const twopq = 2 * p * q;
  const carriers = twopq * 1000;
  return {
    results: [
      { label: "مغلوب ایلیل کی فریکوئنسی q", value: fmt(q, 4) },
      { label: "غالب ایلیل کی فریکوئنسی p", value: fmt(p, 4) },
      { label: "جینوٹائپ AA (p²)", value: `${fmt(pp, 4)} ≈ ${fmt(pp * 1000, 4)} فی 1000` },
      { label: "جینوٹائپ Aa (2pq)", value: `${fmt(twopq, 4)} ≈ ${fmt(carriers, 4)} فی 1000` },
      { label: "جینوٹائپ aa (q²)", value: `${fmt(qq, 4)} ≈ ${fmt(qq * 1000, 4)} فی 1000` },
      { label: "فی 1000 افراد کیریئرز کی تعداد", value: fmt(carriers, 4) }
    ],
    steps: [
      { text: "مغلوب جینوٹائپ aa کی فریکوئنسی q² ہے:", tex: `q^2 = ${ntex(qq)}` },
      { text: "q معلوم کرنے کے لیے جذر لیں:", tex: `q = \\sqrt{${ntex(qq)}} = ${ntex(q, 6)}` },
      { text: "تعلق p + q = 1 سے:", tex: `p = 1 - q = ${ntex(p, 6)}` },
      { text: "Aa کیریئرز کی فریکوئنسی:", tex: `2pq = 2 \\times ${ntex(p, 6)} \\times ${ntex(q, 6)} = ${ntex(twopq, 6)}` }
    ],
    copy: `q = ${fmt(q, 4)}، p = ${fmt(p, 4)}، کیریئرز فی 1000 = ${fmt(carriers, 4)}`,
    blocks: [
      { type: "table", caption: "متوقع جینوٹائپس", head: ["جینوٹائپ", "متوقع فریکوئنسی", "فی 1000 افراد"], rows: [["AA (غالب)", fmt(pp, 4), fmt(pp * 1000, 4)], ["Aa (کیریئر)", fmt(twopq, 4), fmt(carriers, 4)], ["aa (مغلوب)", fmt(qq, 4), fmt(qq * 1000, 4)]], ltr: true },
      { type: "note", text: "توازن یہ فرض کرتا ہے: بڑی آبادی، تصادفی ملاپ، اور میوٹیشن، ہجرت یا قدرتی انتخاب کی عدم موجودگی۔" }
    ]
  };
}

function fromCounts(input) {
  const AA = num(input, "nAA", "AA افراد کی تعداد", { integer: true, nonNegative: true });
  const Aa = num(input, "nAa", "Aa افراد کی تعداد", { integer: true, nonNegative: true });
  const aa = num(input, "naa", "aa افراد کی تعداد", { integer: true, nonNegative: true });
  const N = AA + Aa + aa;
  if (N === 0) fail("افراد کا کل مجموعہ صفر سے زیادہ ہونا چاہیے۔", "nAA");
  const p = (2 * AA + Aa) / (2 * N);
  const q = 1 - p;
  const O = [AA, Aa, aa];
  const E = [p * p * N, 2 * p * q * N, q * q * N];
  let chi = 0;
  for (let i = 0; i < 3; i++) if (E[i] > 0) chi += ((O[i] - E[i]) ** 2) / E[i];
  if (chi < 1e-12) chi = 0;
  const significant = chi >= CHI_CRIT;
  const verdict = significant
    ? "0.05 کی سطح پر ہارڈی-وائن برگ توازن سے واضح انحراف موجود ہے۔"
    : "0.05 کی سطح پر ہارڈی-وائن برگ توازن سے کوئی واضح انحراف نہیں ہے۔";
  const blocks = [{
    type: "table",
    caption: "مشاہدہ بمقابلہ متوقع",
    head: ["جینوٹائپ", "مشاہدہ O", "متوقع E", "(O − E)² / E"],
    rows: [
      ["AA", String(AA), fmt(E[0], 4), fmt(E[0] > 0 ? ((AA - E[0]) ** 2) / E[0] : 0, 4)],
      ["Aa", String(Aa), fmt(E[1], 4), fmt(E[1] > 0 ? ((Aa - E[1]) ** 2) / E[1] : 0, 4)],
      ["aa", String(aa), fmt(E[2], 4), fmt(E[2] > 0 ? ((aa - E[2]) ** 2) / E[2] : 0, 4)]
    ],
    ltr: true
  }];
  if (E.some((e) => e < 5)) blocks.push({ type: "note", tone: "warn", text: "کچھ متوقع تعدادیں 5 سے کم ہیں، اس لیے χ² ٹیسٹ درست نہ ہو سکے۔" });
  return {
    results: [
      { label: "افراد کی تعداد N", value: String(N) },
      { label: "ایلیل A کی فریکوئنسی (p)", value: fmt(p, 4) },
      { label: "ایلیل a کی فریکوئنسی (q)", value: fmt(q, 4) },
      { label: "متوقع تعدادیں AA / Aa / aa", value: `${fmt(E[0], 4)} / ${fmt(E[1], 4)} / ${fmt(E[2], 4)}` },
      { label: "χ² قدر", value: fmt(chi, 4) },
      { label: "شماریاتی نتیجہ", value: significant ? "واضح انحراف" : "کوئی واضح انحراف نہیں" , text: verdict }
    ],
    steps: [
      { text: "مشاہدہ شدہ ایلیلز میں سے ایلیل A کی فریکوئنسی:", tex: `p = \\frac{2 \\times ${AA} + ${Aa}}{2 \\times ${N}} = ${ntex(p, 6)}` },
      { text: "ایلیل a کی فریکوئنسی:", tex: `q = 1 - p = ${ntex(q, 6)}` },
      { text: "توازن پر متوقع تعدادیں:", tex: `E_{AA} = p^2 N,\\; E_{Aa} = 2pqN,\\; E_{aa} = q^2 N = ${fmt(E[0], 4)},\\ ${fmt(E[1], 4)},\\ ${fmt(E[2], 4)}` },
      { text: "χ² قدر (df = 1):", tex: `\\chi^2 = \\sum \\frac{(O-E)^2}{E} = ${ntex(chi, 6)}` },
      `نتیجہ: اگر χ² بڑا یا برابر ہو ${CHI_CRIT} کے (0.05 پر اور 1 درجۂ آزادی کی تنقیدی قدر) تو توازن مسترد کیا جاتا ہے۔`
    ],
    copy: `p = ${fmt(p, 4)}، q = ${fmt(q, 4)}، χ² = ${fmt(chi, 4)} (df = 1) — ${significant ? "واضح انحراف" : "توازن کے مطابق"}`,
    blocks
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "حساب کا طریقہ", ["recessive", "counts"], "recessive");
  return mode === "counts" ? fromCounts(input) : fromPheno(input);
}
