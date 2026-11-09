import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "احسب السعة المكافئة لمكثفات أو الحث المكافئ لملفات على التوالي أو التوازي، مع توزيع الجهد والشحنة والطاقة على المكثفات عند إدخال الجهد.",
  keywords: ["مكثفات على التوالي", "مكثفات على التوازي", "سعة مكافئة", "ملفات", "حث مكافئ", "capacitors", "inductors", "طاقة المكثف"],
  formulas: [
    { label: "المكثفات (عكس المقاومات)", tex: "C_{par} = \\sum C_i,\\qquad \\frac{1}{C_{ser}} = \\sum\\frac{1}{C_i}" },
    { label: "الملفات بلا حث متبادل (مثل المقاومات)", tex: "L_{ser} = \\sum L_i,\\qquad \\frac{1}{L_{par}} = \\sum\\frac{1}{L_i}" }
  ],
  inputs: [
    { id: "kind", label: "النوع", type: "select", default: "C", options: [["C", "مكثفات"], ["L", "ملفات"]] },
    { id: "mode", label: "التوصيل", type: "select", default: "series", options: [["series", "توالي"], ["parallel", "توازي"]] },
    { id: "list", label: "القيم (F أو H)", type: "text", default: "10u, 22u, 47u", wide: true, help: "مثل 10u, 22u أو 4.7n." },
    { id: "V", label: "الجهد الكلي (اختياري، للمكثفات)", unit: "V", type: "number", default: "12", when: { kind: ["C"] } }
  ],
  example: { values: { kind: "C", mode: "series", list: "10u, 22u, 47u", V: "12" }, expect: ["Ceq = 5.998 µF"], note: "مثال: ثلاثة مكثفات على التوالي على 12 V." },
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
  const kind = choice(input, "kind", "النوع", ["C", "L"], "C");
  const mode = choice(input, "mode", "التوصيل", ["series", "parallel"], "series");
  const list = numList(input, "list", "القيم", { positive: true, max: 40 });
  const eq = equivalent(kind, mode, list);
  const unit = kind === "C" ? "F" : "H";
  const sym = kind === "C" ? "C" : "L";
  const reciprocal = (kind === "C" && mode === "series") || (kind === "L" && mode === "parallel");
  const steps = [reciprocal
    ? { text: `${kind === "C" ? "المكثفات على التوالي" : "الملفات على التوازي"}: نجمع المقلوبات.`, tex: `\\frac{1}{${sym}_{eq}} = ${list.map((x) => `\\frac{1}{${ntex(x)}}`).join(" + ")} \\Rightarrow ${sym}_{eq} = ${ntex(eq, 6)}\\ ${unit}` }
    : { text: `${kind === "C" ? "المكثفات على التوازي" : "الملفات على التوالي"}: نجمع القيم مباشرة.`, tex: `${sym}_{eq} = ${list.map((x) => ntex(x)).join(" + ")} = ${ntex(eq, 6)}\\ ${unit}` }];
  const results = [{ label: kind === "C" ? "السعة المكافئة" : "الحث المكافئ", value: eng(eq, unit, 4), text: `${sym}eq = ${eng(eq, unit, 4)}` }];
  const blocks = [];
  if (kind === "C") {
    const V = num(input, "V", "الجهد", { optional: true });
    if (V !== null) {
      if (V === 0) fail("الجهد صفر؛ اتركه فارغاً إن لم يكن مطلوباً.", "V");
      const Q = eq * V;
      results.push({ label: "الشحنة الكلية", value: eng(Q, "C", 4) }, { label: "الطاقة المخزنة", value: eng(0.5 * eq * V * V, "J", 4) });
      const rows = list.map((c, k) => {
        const vk = mode === "series" ? Q / c : V, qk = c * vk;
        return [`C${k + 1}`, eng(c, "F"), eng(vk, "V", 4), eng(qk, "C", 4), eng(0.5 * c * vk * vk, "J", 4)];
      });
      blocks.push({ type: "table", caption: mode === "series" ? "على التوالي: الشحنة نفسها، والجهد الأكبر على المكثف الأصغر" : "على التوازي: الجهد نفسه، والشحنة تتناسب مع السعة", head: ["المكثف", "السعة", "الجهد", "الشحنة", "الطاقة"], rows });
      steps.push({ text: "الشحنة الكلية والطاقة:", tex: `Q = C_{eq}V = ${ntex(Q, 6)}\\ C,\\quad W = \\tfrac{1}{2}C_{eq}V^2 = ${ntex(0.5 * eq * V * V, 6)}\\ J` });
    }
  } else steps.push("نفترض عدم وجود حث متبادل بين الملفات (أي أنها بعيدة أو مدرعة).");
  return { results, blocks, steps, copy: `${sym}eq = ${eng(eq, unit, 4)}` };
}
