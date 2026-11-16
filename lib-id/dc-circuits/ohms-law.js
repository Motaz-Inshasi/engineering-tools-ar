import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "احسب الجهد أو التيار أو المقاومة أو القدرة من أي قيمتين معلومتين بقانون أوم وقانون القدرة، مع الخطوات والوحدات الهندسية.",
  keywords: ["قانون أوم", "ohm", "جهد", "تيار", "مقاومة", "قدرة", "واط", "فولت", "أمبير"],
  formulas: [
    { label: "قانون أوم", tex: "V = I R" },
    { label: "القدرة", tex: "P = V I = I^2 R = \\frac{V^2}{R}" }
  ],
  inputs: [
    { id: "V", label: "الجهد V", unit: "V", type: "number", help: "اترك حقلين فارغين وأدخل اثنين فقط." },
    { id: "I", label: "التيار I", unit: "A", type: "number", default: "20m", help: "يمكن استخدام البادئات: m للملّي، u للمايكرو، k للكيلو." },
    { id: "R", label: "المقاومة R", unit: "Ω", type: "number", default: "470" },
    { id: "P", label: "القدرة P", unit: "W", type: "number" }
  ],
  example: { values: { V: "", I: "20m", R: "470", P: "" }, expect: ["V = 9.4 V", "P = 188 mW"], note: "مثال: تيار 20 mA في مقاومة 470 Ω." },
  invalid: { values: { V: "5", I: "1", R: "5", P: "" } },
  related: ["series-parallel-resistors", "voltage-current-divider", "led-resistor", "shunt-resistor"]
};

export function solve(input) {
  const given = ["V", "I", "R", "P"].filter((k) => !isBlank(input[k]));
  if (given.length !== 2) fail(`أدخل قيمتين فقط من الأربع (أدخلت ${given.length}).`, given.length > 2 ? given[2] : ["V", "I", "R", "P"].find((k) => isBlank(input[k])));
  const v = {};
  for (const k of given) v[k] = num(input, k, { V: "الجهد", I: "التيار", R: "المقاومة", P: "القدرة" }[k], k === "R" ? { positive: true } : k === "P" ? { nonNegative: true } : {});
  const steps = [];
  const key = given.sort().join("");
  const T = (x) => ntex(x, 6);
  switch (key) {
    case "IV":
      if (v.I === 0) fail("التيار صفر، فلا يمكن حساب المقاومة.", "I");
      v.R = v.V / v.I; v.P = v.V * v.I;
      if (!(v.R > 0)) fail("الجهد والتيار يجب أن يكونا بالإشارة نفسها لمقاومة موجبة.", "I");
      steps.push({ text: "من قانون أوم:", tex: `R = \\frac{V}{I} = \\frac{${T(v.V)}}{${T(v.I)}} = ${T(v.R)}\\ \\Omega` });
      steps.push({ text: "القدرة:", tex: `P = VI = ${T(v.V)} \\times ${T(v.I)} = ${T(v.P)}\\ W` });
      break;
    case "RV":
      v.I = v.V / v.R; v.P = (v.V * v.V) / v.R;
      steps.push({ text: "من قانون أوم:", tex: `I = \\frac{V}{R} = \\frac{${T(v.V)}}{${T(v.R)}} = ${T(v.I)}\\ A` });
      steps.push({ text: "القدرة:", tex: `P = \\frac{V^2}{R} = ${T(v.P)}\\ W` });
      break;
    case "IR":
      v.V = v.I * v.R; v.P = v.I * v.I * v.R;
      steps.push({ text: "من قانون أوم:", tex: `V = IR = ${T(v.I)} \\times ${T(v.R)} = ${T(v.V)}\\ V` });
      steps.push({ text: "القدرة:", tex: `P = I^2 R = ${T(v.P)}\\ W` });
      break;
    case "PV":
      if (v.V === 0) fail("الجهد صفر، فلا يمكن حساب التيار من القدرة.", "V");
      v.I = v.P / v.V; v.R = (v.V * v.V) / v.P;
      if (v.P === 0) fail("القدرة صفر مع جهد غير صفري تعني مقاومة لا نهائية.", "P");
      steps.push({ text: "من قانون القدرة:", tex: `I = \\frac{P}{V} = ${T(v.I)}\\ A,\\qquad R = \\frac{V^2}{P} = ${T(v.R)}\\ \\Omega` });
      break;
    case "IP":
      if (v.I === 0) fail("التيار صفر، فلا يمكن حساب الجهد من القدرة.", "I");
      if (v.P === 0) fail("القدرة صفر مع تيار غير صفري تعني مقاومة صفرية.", "P");
      v.V = v.P / v.I; v.R = v.P / (v.I * v.I);
      steps.push({ text: "من قانون القدرة:", tex: `V = \\frac{P}{I} = ${T(v.V)}\\ V,\\qquad R = \\frac{P}{I^2} = ${T(v.R)}\\ \\Omega` });
      break;
    case "PR":
      v.V = Math.sqrt(v.P * v.R); v.I = Math.sqrt(v.P / v.R);
      steps.push({ text: "من قانون القدرة (نأخذ الجذر الموجب):", tex: `V = \\sqrt{PR} = ${T(v.V)}\\ V,\\qquad I = \\sqrt{\\frac{P}{R}} = ${T(v.I)}\\ A` });
      break;
  }
  steps.push({ text: "للتحقق:", tex: `V - IR = ${T(v.V - v.I * v.R)},\\quad P - VI = ${T(v.P - v.V * v.I)}` });
  const out = { V: eng(v.V, "V"), I: eng(v.I, "A"), R: eng(v.R, "Ω"), P: eng(v.P, "W") };
  return {
    results: [
      { label: "الجهد V", value: out.V, text: `V = ${out.V}` },
      { label: "التيار I", value: out.I, text: `I = ${out.I}` },
      { label: "المقاومة R", value: out.R, text: `R = ${out.R}` },
      { label: "القدرة P", value: out.P, text: `P = ${out.P}` }
    ],
    steps, values: v
  };
}
