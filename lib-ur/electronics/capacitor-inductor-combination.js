import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "سیریز یا پیرالل میں جڑے کپیسیٹرز کی مساوی کپیسیٹنس، یا انڈکٹرز کی مساوی انڈکٹنس کا حساب لگائیں، اور وولٹیج لگانے پر کپیسیٹرز میں وولٹیج، چارج اور توانائی کی تقسیم دکھائیں۔",
  keywords: ["سیریز میں کپیسیٹرز", "پیرالل میں کپیسیٹرز", "مساوی کپیسیٹنس", "انڈکٹرز", "مساوی انڈکٹنس", "capacitors", "inductors", "کپیسیٹر کی توانائی"],
  formulas: [
    { label: "کپیسیٹرز (مزاحموں کا الٹ)", tex: "C_{par} = \\sum C_i,\\qquad \\frac{1}{C_{ser}} = \\sum\\frac{1}{C_i}" },
    { label: "باہمی انڈکشن کے بغیر انڈکٹرز (مزاحموں کی طرح)", tex: "L_{ser} = \\sum L_i,\\qquad \\frac{1}{L_{par}} = \\sum\\frac{1}{L_i}" }
  ],
  inputs: [
    { id: "kind", label: "قسم", type: "select", default: "C", options: [["C", "کپیسیٹرز"], ["L", "انڈکٹرز"]] },
    { id: "mode", label: "کنکشن", type: "select", default: "series", options: [["series", "سیریز"], ["parallel", "پیرالل"]] },
    { id: "list", label: "قدریں (F یا H)", type: "text", default: "10u, 22u, 47u", wide: true, help: "مثلاً 10u، 22u یا 4.7n۔" },
    { id: "V", label: "کل وولٹیج (اختیاری، کپیسیٹرز کے لیے)", unit: "V", type: "number", default: "12", when: { kind: ["C"] } }
  ],
  example: { values: { kind: "C", mode: "series", list: "10u, 22u, 47u", V: "12" }, expect: ["Ceq = 5.998 µF"], note: "مثال: 12 V پر تین کپیسیٹرز سیریز میں۔" },
  invalid: { values: { kind: "C", mode: "series", list: "10u, 0", V: "" } },
  related: ["series-parallel-resistors", "impedance", "resonance", "timer-555"]
};

export function equivalent(kind, mode, list) {
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const inv = (a) => 1 / a.reduce((s, x) => s + 1 / x, 0);
  if (kind === "C") return mode === "parallel" ? sum(list) : inv(list);
  return mode === "series" ? sum(list) : inv(list);
}

export function solve(input) {
  const kind = choice(input, "kind", "قسم", ["C", "L"], "C");
  const mode = choice(input, "mode", "کنکشن", ["series", "parallel"], "series");
  const list = numList(input, "list", "قدریں", { positive: true, max: 40 });
  const eq = equivalent(kind, mode, list);
  const unit = kind === "C" ? "F" : "H";
  const sym = kind === "C" ? "C" : "L";
  const reciprocal = (kind === "C" && mode === "series") || (kind === "L" && mode === "parallel");
  const steps = [reciprocal
    ? { text: `${kind === "C" ? "سیریز میں کپیسیٹرز" : "پیرالل میں انڈکٹرز"}: ہم معکوس قدروں کو جمع کرتے ہیں۔`, tex: `\\frac{1}{${sym}_{eq}} = ${list.map((x) => `\\frac{1}{${ntex(x)}}`).join(" + ")} \\Rightarrow ${sym}_{eq} = ${ntex(eq, 6)}\\ ${unit}` }
    : { text: `${kind === "C" ? "پیرالل میں کپیسیٹرز" : "سیریز میں انڈکٹرز"}: ہم قدروں کو براہِ راست جمع کرتے ہیں۔`, tex: `${sym}_{eq} = ${list.map((x) => ntex(x)).join(" + ")} = ${ntex(eq, 6)}\\ ${unit}` }];
  const results = [{ label: kind === "C" ? "مساوی کپیسیٹنس" : "مساوی انڈکٹنس", value: eng(eq, unit, 4), text: `${sym}eq = ${eng(eq, unit, 4)}` }];
  const blocks = [];
  if (kind === "C") {
    const V = num(input, "V", "وولٹیج", { optional: true });
    if (V !== null) {
      if (V === 0) fail("وولٹیج صفر ہے؛ اگر ضرورت نہ ہو تو اسے خالی چھوڑ دیں۔", "V");
      const Q = eq * V;
      results.push({ label: "کل چارج", value: eng(Q, "C", 4) }, { label: "ذخیرہ شدہ توانائی", value: eng(0.5 * eq * V * V, "J", 4) });
      const rows = list.map((c, k) => {
        const vk = mode === "series" ? Q / c : V, qk = c * vk;
        return [`C${k + 1}`, eng(c, "F"), eng(vk, "V", 4), eng(qk, "C", 4), eng(0.5 * c * vk * vk, "J", 4)];
      });
      blocks.push({ type: "table", caption: mode === "series" ? "سیریز میں: ہر کپیسیٹر سے وہی چارج گزرتا ہے، اور بڑا وولٹیج چھوٹے کپیسیٹر پر ہوتا ہے۔" : "پیرالل میں: ہر کپیسیٹر پر وہی وولٹیج ہوتا ہے، اور چارج کپیسیٹنس کے متناسب ہوتا ہے۔", head: ["کپیسیٹر", "کپیسیٹنس", "وولٹیج", "چارج", "توانائی"], rows });
      steps.push({ text: "کل چارج اور توانائی:", tex: `Q = C_{eq}V = ${ntex(Q, 6)}\\ C,\\quad W = \\tfrac{1}{2}C_{eq}V^2 = ${ntex(0.5 * eq * V * V, 6)}\\ J` });
    }
  } else steps.push("ہم فرض کرتے ہیں کہ انڈکٹرز کے درمیان کوئی باہمی انڈکشن نہیں ہے (یعنی وہ دور رکھے گئے ہیں یا حفاظتی غلاف میں ہیں)۔");
  return { results, blocks, steps, copy: `${sym}eq = ${eng(eq, unit, 4)}` };
}
