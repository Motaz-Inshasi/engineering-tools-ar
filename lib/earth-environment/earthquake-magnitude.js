import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, fmt, tex as ntex } from "../core/format.js";

const CLASSES = [
  ["أقل من 3", "غير محسوس عادةً، ويُسجَّل بأجهزة القياس فقط"],
  ["3 – 3.9", "يُحس قرب المركز، وقد يهتز الأثاث الخفيف"],
  ["4 – 4.9", "يُحس على نطاق واسع داخل المباني، وتهتز الأشياء المعلقة"],
  ["5 – 5.9", "يُحس من الجميع، وقد تتضرر المباني ضعيفة التصميم"],
  ["6 – 6.9", "أضرار في المناطق المأهولة وتشققات في المباني"],
  ["7 – 7.9", "أضرار جسيمة على مساحات واسعة"],
  ["8+", "دمار شامل قرب المركز ويمتد أثره لمسافات كبيرة"]
];

const LIMITS = [3, 4, 5, 6, 7, 8];

function classOf(M) {
  let i = 0;
  while (i < LIMITS.length && M >= LIMITS[i]) i++;
  return CLASSES[i][0];
}

const CLASS_TABLE = { type: "table", caption: "فئات المقدار وآثارها المعتادة", head: ["فئة المقدار", "الأثر المعتاد"], rows: CLASSES };

export const meta = {
  description: "حوّل مقدار الزلزال إلى طاقة بالجول ومكافئ TNT، أو قارن زلزالين بنسبة السعة والطاقة، أو احسب مقدار ريختر ML من أقصى سعة وفاصل S−P، مع فئات المقدار وآثارها.",
  keywords: ["قوة الزلزال", "مقياس ريختر", "طاقة الزلزال", "magnitude", "richter", "TNT", "زلزال"],
  formulas: [
    { label: "الطاقة من المقدار", tex: "\\log_{10} E = 1.5M + 4.8 \\quad (E\\ \\text{بالجول})" },
    { label: "نسبة السعة والطاقة", tex: "\\frac{A_2}{A_1} = 10^{\\Delta M},\\qquad \\frac{E_2}{E_1} = 10^{1.5\\Delta M}" },
    { label: "مقدار ريختر المحلي", tex: "M_L = \\log_{10} A + 3\\log_{10}(8\\,\\Delta t) - 2.92" }
  ],
  inputs: [
    { id: "mode", label: "الحساب المطلوب", type: "select", default: "energy", options: [["energy", "من المقدار إلى الطاقة"], ["compare", "مقارنة زلزالين"], ["richter", "حساب مقدار ريختر من السعة"]] },
    { id: "M", label: "المقدار M", type: "number", default: "5", when: { mode: ["energy"] } },
    { id: "M1", label: "المقدار الأول M1", type: "number", default: "5", when: { mode: ["compare"] } },
    { id: "M2", label: "المقدار الثاني M2", type: "number", default: "7", when: { mode: ["compare"] } },
    { id: "A", label: "أقصى سعة للموجة A", unit: "mm", type: "number", default: "10", when: { mode: ["richter"] } },
    { id: "dt", label: "الفاصل الزمني S−P", unit: "s", type: "number", default: "5", when: { mode: ["richter"] }, help: "الفرق بين وصول موجة P وموجة S إلى محطة الرصد." }
  ],
  example: { values: { mode: "energy", M: "5", M1: "", M2: "", A: "", dt: "" }, expect: ["E ≈ 1.995 TJ", "476.9 طن"], note: "مثال: زلزال بمقدار 5 على مقياس ريختر." },
  invalid: { values: { mode: "energy", M: "11", M1: "", M2: "", A: "", dt: "" } },
  related: ["radiometric-dating", "air-quality-index"]
};

export function solve(input) {
  const mode = choice(input, "mode", "الحساب المطلوب", ["energy", "compare", "richter"], "energy");
  if (mode === "compare") {
    const M1 = num(input, "M1", "المقدار الأول", { min: 0, max: 10 });
    const M2 = num(input, "M2", "المقدار الثاني", { min: 0, max: 10 });
    const d = Math.abs(M2 - M1);
    const amp = Math.pow(10, d);
    const en = Math.pow(10, 1.5 * d);
    const steps = [
      { text: "فرق المقدار:", tex: `\\Delta M = |M_2 - M_1| = |${ntex(M2)} - ${ntex(M1)}| = ${fmt(d, 6)}` },
      { text: "نسبة السعة (الاهتزاز الأقصى):", tex: `\\frac{A_2}{A_1} = 10^{\\Delta M} = ${fmt(amp, 6)}` },
      { text: "نسبة الطاقة المنبعثة:", tex: `\\frac{E_2}{E_1} = 10^{1.5\\Delta M} = ${fmt(en, 6)}` }
    ];
    return {
      results: [
        { label: "فرق المقدار ΔM", value: fmt(d, 4) },
        { label: "نسبة السعة (الاهتزاز الأقصى)", value: `${fmt(amp, 4)}×` },
        { label: "نسبة الطاقة المنبعثة", value: `${fmt(en, 4)}×` }
      ],
      steps,
      copy: `ΔM = ${fmt(d, 4)}: نسبة السعة ${fmt(amp, 4)}× ونسبة الطاقة ${fmt(en, 4)}×`,
      blocks: [CLASS_TABLE],
      values: { d, amp, en }
    };
  }
  if (mode === "richter") {
    const A = num(input, "A", "أقصى سعة للموجة", { positive: true });
    const dt = num(input, "dt", "الفاصل الزمني S−P", { positive: true });
    const ML = Math.log10(A) + 3 * Math.log10(8 * dt) - 2.92;
    const cls = classOf(ML);
    const steps = [
      { text: "معادلة ريختر المحلية:", tex: "M_L = \\log_{10} A + 3\\log_{10}(8\\,\\Delta t) - 2.92" },
      { text: "بالتعويض:", tex: `M_L = \\log_{10} ${ntex(A)} + 3\\log_{10}(8 \\times ${ntex(dt)}) - 2.92 = ${ntex(ML, 6)}` }
    ];
    return {
      results: [
        { label: "مقدار ريختر ML", value: fmt(ML, 4), text: `ML = ${fmt(ML, 4)}` },
        { label: "فئة الزلزال", value: cls }
      ],
      steps,
      copy: `ML ≈ ${fmt(ML, 4)} (${cls})`,
      blocks: [CLASS_TABLE],
      values: { ML }
    };
  }
  const M = num(input, "M", "المقدار", { min: 0, max: 10 });
  const logE = 1.5 * M + 4.8;
  const E = Math.pow(10, logE);
  const tons = E / 4.184e9;
  const cls = classOf(M);
  const steps = [
    { text: "علاقة المقدار بالطاقة:", tex: "\\log_{10} E = 1.5M + 4.8" },
    { text: "بالتعويض:", tex: `\\log_{10} E = 1.5 \\times ${ntex(M)} + 4.8 = ${ntex(logE, 6)}` },
    { text: "الطاقة بالجول:", tex: `E = 10^{${ntex(logE, 6)}} = ${ntex(E, 4)}\\ J` },
    { text: "المكافئ بالـ TNT (1 طن = 4.184 × 10^9 J):", tex: `\\frac{E}{4.184 \\times 10^{9}} = ${ntex(tons, 4)}\\ \\text{t}` }
  ];
  return {
    results: [
      { label: "الطاقة المنبعثة", value: eng(E, "J", 4), text: `E = ${eng(E, "J", 4)}` },
      { label: "المكافئ بالـ TNT", value: `${fmt(tons, 4)} طن` },
      { label: "log10 E", value: fmt(logE, 5) },
      { label: "فئة الزلزال", value: cls }
    ],
    steps,
    copy: `M = ${fmt(M)}: E ≈ ${eng(E, "J", 4)} ≈ ${fmt(tons, 4)} طن TNT`,
    blocks: [CLASS_TABLE],
    values: { M, logE, E, tons }
  };
}
