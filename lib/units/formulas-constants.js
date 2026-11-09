import { choice, fail } from "../core/validate.js";
import { normalizeArabic, matches } from "../core/text.js";

export const CONSTANTS = [
  { name: "سرعة الضوء في الفراغ", sym: "c", value: "299792458", unit: "m/s", exact: true },
  { name: "ثابت بلانك", sym: "h", value: "6.62607015e-34", unit: "J·s", exact: true },
  { name: "الشحنة الأولية (شحنة الإلكترون)", sym: "e", value: "1.602176634e-19", unit: "C", exact: true },
  { name: "ثابت بولتزمان", sym: "k_B", value: "1.380649e-23", unit: "J/K", exact: true },
  { name: "عدد أفوجادرو", sym: "N_A", value: "6.02214076e23", unit: "1/mol", exact: true },
  { name: "ثابت الغاز العام", sym: "R", value: "8.314462618", unit: "J/(mol·K)", exact: true },
  { name: "سماحية الفراغ", sym: "\\varepsilon_0", value: "8.8541878128e-12", unit: "F/m", exact: false },
  { name: "نفاذية الفراغ", sym: "\\mu_0", value: "1.25663706212e-6", unit: "H/m", exact: false },
  { name: "كتلة الإلكترون", sym: "m_e", value: "9.1093837015e-31", unit: "kg", exact: false },
  { name: "ثابت الجاذبية العام", sym: "G", value: "6.67430e-11", unit: "N·m²/kg²", exact: false },
  { name: "تسارع الجاذبية المعياري", sym: "g_n", value: "9.80665", unit: "m/s²", exact: true },
  { name: "ثابت ستيفان-بولتزمان", sym: "\\sigma", value: "5.670374419e-8", unit: "W/(m²·K⁴)", exact: true },
  { name: "ممانعة الفراغ", sym: "Z_0", value: "376.730313668", unit: "Ω", exact: false },
  { name: "الجهد الحراري عند 25 °C", sym: "V_T = kT/q", value: "0.025693", unit: "V", exact: false },
  { name: "مقاومية النحاس عند 20 °C", sym: "\\rho_{Cu}", value: "1.68e-8", unit: "Ω·m", exact: false }
];

export const FORMULAS = [
  { cat: "dc", name: "قانون أوم والقدرة", tex: "V = IR,\\quad P = VI = I^2R = V^2/R", tool: "ohms-law" },
  { cat: "dc", name: "المقاومات على التوالي والتوازي", tex: "R_s = \\sum R_i,\\quad 1/R_p = \\sum 1/R_i", tool: "series-parallel-resistors" },
  { cat: "dc", name: "مقسم الجهد", tex: "V_{out} = V_{in}\\,R_2/(R_1 + R_2)", tool: "voltage-current-divider" },
  { cat: "dc", name: "مقاومة السلك", tex: "R = \\rho\\,L/A", tool: "ohms-law" },
  { cat: "ac", name: "المفاعلة", tex: "X_L = 2\\pi f L,\\quad X_C = 1/(2\\pi f C)", tool: "impedance" },
  { cat: "ac", name: "تردد الرنين", tex: "f_0 = 1/(2\\pi\\sqrt{LC})", tool: "resonance" },
  { cat: "ac", name: "القيمة الفعالة للجيبية", tex: "V_{rms} = V_p/\\sqrt{2}", tool: "phasor" },
  { cat: "ac", name: "القدرة المركبة", tex: "S = VI^*,\\ P = VI\\cos\\theta,\\ Q = VI\\sin\\theta", tool: "complex-power" },
  { cat: "ac", name: "ثلاثي الطور", tex: "P = \\sqrt{3}V_L I_L\\cos\\theta", tool: "three-phase" },
  { cat: "ac", name: "الثابت الزمني", tex: "\\tau = RC,\\quad \\tau = L/R", tool: "rc-rl-transient" },
  { cat: "electronics", name: "طاقة المكثف والملف", tex: "W_C = \\tfrac12 CV^2,\\quad W_L = \\tfrac12 LI^2", tool: "capacitor-inductor-combination" },
  { cat: "electronics", name: "سعة المكثف المستوي", tex: "C = \\varepsilon_0\\varepsilon_r A/d", tool: "capacitor-inductor-combination" },
  { cat: "electronics", name: "مكبر العمليات العاكس", tex: "A = -R_f/R_{in}", tool: "op-amp" },
  { cat: "electronics", name: "المؤقت 555", tex: "f = 1.44/((R_1 + 2R_2)C)", tool: "timer-555" },
  { cat: "electronics", name: "معادلة الدايود (شوكلي)", tex: "I = I_S\\left(e^{V/(nV_T)} - 1\\right)", tool: "rectifier-ripple" },
  { cat: "signals", name: "الديسيبل", tex: "dB = 20\\log_{10}(V_2/V_1) = 10\\log_{10}(P_2/P_1)", tool: "bode-plot" },
  { cat: "signals", name: "شرط نايكويست", tex: "f_s > 2 f_{max}", tool: "sampling-nyquist" },
  { cat: "signals", name: "SNR للمحول ADC", tex: "SNR = 6.02N + 1.76\\ dB", tool: "adc" },
  { cat: "math", name: "القانون العام للتربيعية", tex: "x = (-b \\pm \\sqrt{b^2 - 4ac})/(2a)", tool: "quadratic" },
  { cat: "math", name: "صيغة أويلر", tex: "e^{j\\theta} = \\cos\\theta + j\\sin\\theta", tool: "complex-numbers" },
  { cat: "math", name: "متطابقة فيثاغورس المثلثية", tex: "\\sin^2\\theta + \\cos^2\\theta = 1", tool: "trigonometry" }
];

const CATS = [["all", "الكل"], ["constants", "الثوابت الفيزيائية"], ["dc", "التيار المستمر"], ["ac", "التيار المتردد"], ["electronics", "الإلكترونيات"], ["signals", "الإشارات"], ["math", "الرياضيات"]];

export const meta = {
  description: "مرجع سريع قابل للبحث للثوابت الفيزيائية (بقيم CODATA 2018 الدقيقة) وأهم قوانين الكهرباء والإلكترونيات والإشارات والرياضيات، مع رابط للأداة المناسبة لكل قانون.",
  keywords: ["قوانين", "ثوابت", "ثوابت فيزيائية", "مرجع", "constants", "formulas", "سرعة الضوء", "بولتزمان", "cheat sheet"],
  formulas: [{ label: "مثال: الجهد الحراري للدايود", tex: "V_T = \\frac{k_B T}{e} \\approx 25.7\\ mV\\ (25^\\circ C)" }],
  inputs: [
    { id: "cat", label: "التصنيف", type: "select", default: "all", options: CATS },
    { id: "find", label: "بحث (اختياري)", type: "text", placeholder: "مثل: رنين، بولتزمان، مكثف" }
  ],
  example: { values: { cat: "all", find: "بولتزمان" }, expect: ["1.380649e-23"], note: "مثال: ابحث عن ثابت بولتزمان." },
  invalid: { values: { cat: "all", find: "zzzzqqq" } },
  related: ["unit-converter", "engineering-notation", "ohms-law"]
};

export function solve(input) {
  const cat = choice(input, "cat", "التصنيف", CATS.map((c) => c[0]), "all");
  const q = normalizeArabic(input.find ?? "");
  const consts = cat === "all" || cat === "constants" ? CONSTANTS.filter((c) => !q || matches(`${c.name} ${c.sym} ${c.unit}`, q)) : [];
  const forms = cat === "constants" ? [] : FORMULAS.filter((f) => (cat === "all" || f.cat === cat) && (!q || matches(`${f.name} ${f.tex} ${f.tool}`, q)));
  if (!consts.length && !forms.length) {
    fail("لا توجد نتائج مطابقة. جرّب كلمة أخرى أو اختر «الكل».", "find");
  }
  const blocks = [];
  if (consts.length) blocks.push({ type: "table", caption: "الثوابت الفيزيائية (CODATA 2018)", head: ["الثابت", "الرمز", "القيمة", "الوحدة", "دقيق؟"], rows: consts.map((c) => [c.name, { tex: c.sym }, { tex: c.value.replace(/e(-?\d+)$/, " \\times 10^{$1}") }, c.unit, c.exact ? "نعم (تعريفي)" : "مقيس"]) });
  if (forms.length) blocks.push({ type: "table", caption: "القوانين", head: ["القانون", "الصيغة", "الأداة"], rows: forms.map((f) => [f.name, { tex: f.tex }, { text: f.tool }]) });
  const steps = [
    "الثوابت المعلّمة «تعريفي» قيمها دقيقة تماماً منذ إعادة تعريف وحدات SI عام 2019، والباقي قيم مقيسة بآخر توصيات CODATA.",
    "اسم الأداة بجانب كل قانون هو الأداة في هذا الموقع التي تحسبه بالتفصيل."
  ];
  return {
    results: [{ label: "عدد الثوابت المطابقة", value: consts.length }, { label: "عدد القوانين المطابقة", value: forms.length }],
    blocks, steps,
    copy: [...consts.map((c) => `${c.name}: ${c.value} ${c.unit}`), ...forms.map((f) => `${f.name}: ${f.tex}`)].join("\n")
  };
}
