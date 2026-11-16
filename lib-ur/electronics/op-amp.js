import { choice, numList, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["inv", "ان انورٹنگ"], ["noninv", "نان انورٹنگ"], ["sum", "سمنگ ایمپلیفائر"], ["diff", "ڈفرنس ایمپلیفائر (سبٹریکٹر)"], ["integ", "انٹیگریٹر"], ["deriv", "ڈیفرنشی ایٹر"]];

export const meta = {
  description: "عام سرکٹس میں مثالی آپریشنل ایمپلیفائر کی گین کا حساب لگائیں: ان انورٹنگ، نان انورٹنگ، سمنگ، ڈفرنس، انٹیگریٹر اور ڈیفرنشی ایٹر، ساتھ آؤٹ پٹ وولٹیج اور سپلائی وولٹیج سے تجاوز ہونے پر سیچوریشن کی وارننگ۔",
  keywords: ["آپریشنل ایمپلیفائر", "op-amp", "Op-amp", "ان انورٹنگ ایمپلیفائر", "نان انورٹنگ ایمپلیفائر", "سمر", "انٹیگریٹر", "ڈیفرنشی ایٹر", "گین"],
  formulas: [
    { label: "ان انورٹنگ اور نان انورٹنگ", tex: "A_{inv} = -\\frac{R_f}{R_{in}},\\qquad A_{non} = 1 + \\frac{R_f}{R_{in}}" },
    { label: "سمر، انٹیگریٹر اور ڈیفرنشی ایٹر (سائن نما سگنل کے لیے)", tex: "V_o = -R_f\\sum\\frac{V_i}{R_i},\\qquad |A_{int}| = \\frac{1}{\\omega RC},\\qquad |A_{diff}| = \\omega RC" }
  ],
  inputs: [
    { id: "cfg", label: "سرکٹ", type: "select", default: "inv", options: CFG },
    { id: "Rf", label: "فیڈ بیک ریزسٹر Rf", unit: "Ω", type: "number", default: "100k", when: { cfg: ["inv", "noninv", "sum", "diff"] } },
    { id: "Rin", label: "ان پٹ ریزسٹر Rin", unit: "Ω", type: "number", default: "10k", when: { cfg: ["inv", "noninv", "diff"] } },
    { id: "Vin", label: "ان پٹ وولٹیج Vin", unit: "V", type: "number", default: "0.5", when: { cfg: ["inv", "noninv", "integ", "deriv"] }, help: "انٹیگریٹر اور ڈیفرنشی ایٹر کے لیے: سائن نما سگنل کا طول۔" },
    { id: "V2", label: "دوسرا ان پٹ وولٹیج V2 (اس میں سے V1 = Vin منفی کیا جاتا ہے)", unit: "V", type: "number", default: "1", when: { cfg: ["diff"] } },
    { id: "V1d", label: "ان پٹ وولٹیج V1", unit: "V", type: "number", default: "0.5", when: { cfg: ["diff"] } },
    { id: "Rs", label: "سمر کے ان پٹ ریزسٹرز", unit: "Ω", type: "text", default: "10k, 20k, 50k", when: { cfg: ["sum"] } },
    { id: "Vs", label: "سمر کے ان پٹ وولٹیجز", unit: "V", type: "text", default: "1, 0.5, -2", when: { cfg: ["sum"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k", when: { cfg: ["integ", "deriv"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "10n", when: { cfg: ["integ", "deriv"] } },
    { id: "f", label: "سگنل کی فریکوئنسی", unit: "Hz", type: "number", default: "1k", when: { cfg: ["integ", "deriv"] } },
    { id: "Vsat", label: "سپلائی وولٹیج ±Vcc", unit: "V", type: "number", default: "15" }
  ],
  example: { values: { cfg: "inv", Rf: "100k", Rin: "10k", Vin: "0.5", Vsat: "15" }, expect: ["A = -10", "Vout = -5 V"], note: "مثال: گین −10 اور ان پٹ 0.5 V والا ان انورٹنگ ایمپلیفائر۔" },
  invalid: { values: { cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" } },
  related: ["bjt-bias", "passive-filter", "adc", "sensor-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "سرکٹ", CFG.map((c) => c[0]), "inv");
  const Vsat = num(input, "Vsat", "سپلائی وولٹیج", { positive: true });
  const steps = ["ہم ایک مثالی آپریشنل ایمپلیفائر فرض کرتے ہیں: لامحدود گین، اس کے ان پٹ ٹرمینلز میں کوئی کرنٹ داخل نہیں ہوتا، اور ان کے وولٹیج برابر ہوتے ہیں (ورچوئل شارٹ)۔"];
  let A = null, Vout, gainText;
  if (cfg === "inv" || cfg === "noninv") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true }), Vin = num(input, "Vin", "Vin");
    A = cfg === "inv" ? -Rf / Rin : 1 + Rf / Rin;
    Vout = A * Vin;
    steps.push({ text: cfg === "inv" ? "ان انورٹنگ ٹرمینل ورچوئل گراؤنڈ پر ہے، اس لیے پورا ان پٹ کرنٹ Rf سے گزرتا ہے:" : "ان انورٹنگ ٹرمینل کا وولٹیج Vin کے برابر ہے، اور Rf اور Rin آؤٹ پٹ پر ایک ڈیوائیڈر بناتے ہیں:", tex: cfg === "inv" ? `A = -\\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` : `A = 1 + \\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` });
    steps.push({ tex: `V_{out} = A V_{in} = ${ntex(A, 6)} \\times ${ntex(Vin)} = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else if (cfg === "sum") {
    const Rf = num(input, "Rf", "Rf", { positive: true });
    const Rs = numList(input, "Rs", "ان پٹ ریزسٹرز", { positive: true, max: 10 });
    const Vs = numList(input, "Vs", "ان پٹ وولٹیجز", { max: 10 });
    if (Rs.length !== Vs.length) fail(`ریزسٹرز کی تعداد (${Rs.length}) وولٹیجز کی تعداد (${Vs.length}) کے برابر ہونی چاہیے۔`, "Vs");
    Vout = -Rf * Rs.reduce((s, r, i) => s + Vs[i] / r, 0);
    steps.push({ text: "ان پٹ کرنٹس ورچوئل گراؤنڈ پر جمع ہوتے ہیں اور Rf سے گزرتے ہیں:", tex: `V_{out} = -${ntex(Rf)}\\left(${Rs.map((r, i) => `\\frac{${ntex(Vs[i])}}{${ntex(r)}}`).join(" + ")}\\right) = ${ntex(Vout, 6)}\\ V` });
    gainText = Rs.map((r, i) => `A${i + 1} = ${fmt(-Rf / r, 5)}`).join(", ");
  } else if (cfg === "diff") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true });
    const V1 = num(input, "V1d", "V1"), V2 = num(input, "V2", "V2");
    A = Rf / Rin;
    Vout = A * (V2 - V1);
    steps.push({ text: "ملتے جلتے ریزسٹرز (دونوں طرف Rf/Rin) کے ساتھ صرف فرق کو بڑھایا جاتا ہے:", tex: `V_{out} = \\frac{R_f}{R_{in}}(V_2 - V_1) = ${ntex(A, 6)}(${ntex(V2)} - ${ntex(V1)}) = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else {
    const R = num(input, "R", "R", { positive: true }), C = num(input, "C", "C", { positive: true }), f = num(input, "f", "فریکوئنسی", { positive: true }), Vin = num(input, "Vin", "Vin");
    const w = 2 * Math.PI * f, wc = 1 / (R * C);
    A = cfg === "integ" ? 1 / (w * R * C) : w * R * C;
    Vout = A * Vin;
    steps.push(cfg === "integ"
      ? { text: "انٹیگریٹر: $v_o = -\\frac{1}{RC}\\int v_i\\,dt$، اور سائن نما سگنل کے لیے گین یہ ہو جاتی ہے:", tex: `|A| = \\frac{1}{\\omega RC} = \\frac{1}{${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)}} = ${ntex(A, 5)},\\ \\text{phase } +90^\\circ` }
      : { text: "ڈیفرنشی ایٹر: $v_o = -RC\\frac{dv_i}{dt}$، اور سائن نما سگنل کے لیے گین یہ ہو جاتی ہے:", tex: `|A| = \\omega RC = ${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)} = ${ntex(A, 5)},\\ \\text{phase } -90^\\circ` });
    steps.push(`فریکوئنسی ${eng(wc / (2 * Math.PI), "Hz", 4)} پر گین 1 ہو جاتی ہے۔ ${cfg === "integ" ? "عملی طور پر، DC وولٹیج سے سیچوریشن روکنے کے لیے کپیسیٹر کے متوازی ایک ریزسٹر شامل کیا جاتا ہے۔" : "عملی طور پر، ہائی فریکوئنسی شور کم کرنے کے لیے کپیسیٹر کے ساتھ سیریز میں ایک ریزسٹر شامل کیا جاتا ہے۔"}`);
    gainText = `|A| = ${fmt(A, 5)}`;
  }
  const sat = Math.abs(Vout) > Vsat;
  if (sat) steps.push(`وارننگ: حساب شدہ آؤٹ پٹ ${fmt(Vout, 4)} V سپلائی وولٹیج ±${fmt(Vsat)} V سے زیادہ ہے، اس لیے اصل آؤٹ پٹ تقریباً ${fmt(Math.sign(Vout) * Vsat, 3)} V پر سیچوریٹ ہو جائے گا۔`);
  const results = [];
  if (A !== null) results.push({ label: "گین", value: A, sig: 6, text: gainText }, { label: "ڈیسی بل میں گین", value: `${fmt(20 * Math.log10(Math.abs(A)), 4)} dB` });
  else results.push({ label: "ہر ان پٹ کے لیے گین", value: gainText });
  results.push({ label: cfg === "integ" || cfg === "deriv" ? "آؤٹ پٹ کا طول" : "آؤٹ پٹ وولٹیج", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "حالت", value: sat ? "سیچوریٹ (آؤٹ پٹ کٹ گیا)" : "لکیری حد کے اندر" });
  return { results, steps, copy: `${gainText}, Vout = ${eng(Vout, "V", 4)}${sat ? " (saturated)" : ""}` };
}
