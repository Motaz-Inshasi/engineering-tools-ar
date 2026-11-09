import { numList, choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "احسب المقاومة المكافئة لمجموعة مقاومات على التوالي أو التوازي، مع توزيع الجهد أو التيار والقدرة على كل مقاومة عند إدخال جهد المصدر.",
  keywords: ["مقاومات على التوالي", "مقاومات على التوازي", "مقاومة مكافئة", "series", "parallel", "resistors", "توصيل المقاومات"],
  formulas: [
    { label: "التوالي", tex: "R_{eq} = R_1 + R_2 + \\cdots + R_n" },
    { label: "التوازي", tex: "\\frac{1}{R_{eq}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots,\\qquad R_1 \\parallel R_2 = \\frac{R_1 R_2}{R_1 + R_2}" }
  ],
  inputs: [
    { id: "list", label: "قيم المقاومات", unit: "Ω", type: "text", default: "100, 220, 330", wide: true, help: "افصل بفاصلة أو مسافة، ويمكن استخدام k و M مثل 4.7k." },
    { id: "mode", label: "طريقة التوصيل", type: "select", default: "series", options: [["series", "توالي"], ["parallel", "توازي"]] },
    { id: "V", label: "جهد المصدر (اختياري)", unit: "V", type: "number" }
  ],
  example: { values: { list: "100, 220, 330", mode: "parallel", V: "12" }, expect: ["Req = 56.9 Ω"], note: "مثال: ثلاث مقاومات 100 و 220 و 330 Ω على التوازي." },
  invalid: { values: { list: "100, -5", mode: "series" } },
  related: ["voltage-current-divider", "ohms-law", "capacitor-inductor-combination", "standard-resistor-values"]
};

export function equivalent(list, mode) {
  return mode === "series" ? list.reduce((a, b) => a + b, 0) : 1 / list.reduce((a, b) => a + 1 / b, 0);
}

export function solve(input) {
  const list = numList(input, "list", "قيم المقاومات", { positive: true, max: 50 });
  const mode = choice(input, "mode", "طريقة التوصيل", ["series", "parallel"], "series");
  const V = num(input, "V", "جهد المصدر", { optional: true });
  const Req = equivalent(list, mode);
  const steps = [];
  if (mode === "series") {
    steps.push({ text: "على التوالي نجمع المقاومات مباشرة:", tex: `R_{eq} = ${list.map((r) => ntex(r)).join(" + ")} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("المكافئة على التوالي دائماً أكبر من أكبر مقاومة.");
  } else {
    steps.push({ text: "على التوازي نجمع المقلوبات (الموصليات):", tex: `\\frac{1}{R_{eq}} = ${list.map((r) => `\\frac{1}{${ntex(r)}}`).join(" + ")} = ${ntex(1 / Req, 6)}\\ S` });
    steps.push({ tex: `R_{eq} = ${ntex(Req, 6)}\\ \\Omega` });
    if (list.length === 2) steps.push({ text: "ولمقاومتين فقط يصلح قانون «الضرب على الجمع»:", tex: `\\frac{${ntex(list[0])} \\times ${ntex(list[1])}}{${ntex(list[0])} + ${ntex(list[1])}} = ${ntex(Req, 6)}\\ \\Omega` });
    steps.push("المكافئة على التوازي دائماً أصغر من أصغر مقاومة.");
  }
  const results = [{ label: "المقاومة المكافئة", value: eng(Req, "Ω", 4), text: `Req = ${eng(Req, "Ω", 4)}` }, { label: "الموصلية المكافئة", value: eng(1 / Req, "S", 4) }];
  const blocks = [];
  if (V !== null) {
    if (V === 0) fail("جهد المصدر صفر؛ اتركه فارغاً إن لم يكن مطلوباً.", "V");
    const I = V / Req;
    results.push({ label: "التيار الكلي", value: eng(I, "A", 4) }, { label: "القدرة الكلية", value: eng(V * I, "W", 4) });
    const rows = list.map((r, k) => {
      const vr = mode === "series" ? I * r : V, ir = mode === "series" ? I : V / r;
      return [`R${k + 1}`, eng(r, "Ω"), eng(vr, "V"), eng(ir, "A"), eng(vr * ir, "W")];
    });
    blocks.push({ type: "table", caption: mode === "series" ? "التيار نفسه في كل مقاومة والجهد يتوزع" : "الجهد نفسه على كل مقاومة والتيار يتوزع", head: ["المقاومة", "القيمة", "الجهد", "التيار", "القدرة"], rows });
    steps.push({ text: "التيار الكلي من قانون أوم:", tex: `I = \\frac{V}{R_{eq}} = \\frac{${ntex(V)}}{${ntex(Req, 6)}} = ${ntex(I, 6)}\\ A` });
    steps.push(mode === "series" ? "على التوالي: جهد كل مقاومة $V_k = I R_k$، ومجموع الجهود يساوي جهد المصدر (KVL)." : "على التوازي: تيار كل مقاومة $I_k = V / R_k$، ومجموع التيارات يساوي التيار الكلي (KCL).");
  }
  return { results, blocks, steps, copy: `Req = ${eng(Req, "Ω", 4)}` };
}
