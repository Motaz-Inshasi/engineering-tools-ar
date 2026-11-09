import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseNetlist, solveMNA, nodesOf } from "../core/circuit.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { NETLIST_HELP } from "./nodal-analysis.js";

export const meta = {
  description: "احسب مكافئ ثيفينين ونورتن بين أي نقطتين في دائرة تيار مستمر: جهد الدائرة المفتوحة، والمقاومة المكافئة بإطفاء المصادر، وتيار القصر، مع التحقق بحمل اختياري.",
  keywords: ["ثيفينين", "نورتن", "thevenin", "norton", "مكافئ", "جهد الدائرة المفتوحة", "تيار القصر"],
  formulas: [
    { label: "التعريفات", tex: "V_{th} = V_{oc},\\quad R_{th} = \\left.\\frac{V_{ab}}{I_{test}}\\right|_{\\text{sources off}},\\quad I_N = \\frac{V_{th}}{R_{th}}" },
    { label: "تيار الحمل من المكافئ", tex: "I_L = \\frac{V_{th}}{R_{th} + R_L}" }
  ],
  inputs: [
    { id: "net", label: "عناصر الدائرة", type: "textarea", rows: 5, default: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", help: NETLIST_HELP },
    { id: "a", label: "الطرف a", type: "text", default: "3" },
    { id: "b", label: "الطرف b", type: "text", default: "0" },
    { id: "RL", label: "مقاومة حمل للتحقق (اختياري)", unit: "Ω", type: "number", default: "4" }
  ],
  example: { values: { net: "V1 1 0 24\nR1 1 2 6\nR2 2 0 3\nR3 2 3 2", a: "3", b: "0", RL: "4" }, expect: ["Vth = 8 V", "Rth = 4 Ω"], note: "مثال كتابي: مصدر 24 V مع مقسم 6 Ω و 3 Ω ومقاومة 2 Ω إلى الطرف." },
  invalid: { values: { net: "V1 1 0 24\nR1 1 2 6", a: "5", b: "0" } },
  related: ["max-power-transfer", "nodal-analysis", "mesh-analysis", "wheatstone-bridge"]
};

const norm = (n) => (["0", "gnd", "GND", "g"].includes(n) ? "0" : n);

export function thevenin(els, a, b) {
  const open = solveMNA(els, "net");
  const Voc = open.V[a] - open.V[b];
  const off = els.filter((e) => e.kind !== "I").map((e) => (e.kind === "V" ? { ...e, value: 0 } : e));
  const test = solveMNA([...off, { name: "ITEST", kind: "I", a: b, b: a, value: 1 }], "net");
  const Rth = test.V[a] - test.V[b];
  return { Voc, Rth, open };
}

export function solve(input) {
  const els = parseNetlist(str(input, "net", "عناصر الدائرة"), "net");
  const a = norm(str(input, "a", "الطرف a").trim()), b = norm(str(input, "b", "الطرف b").trim());
  const nodes = ["0", ...nodesOf(els)];
  if (!nodes.includes(a)) fail(`العقدة «${a}» غير موجودة في الدائرة.`, "a");
  if (!nodes.includes(b)) fail(`العقدة «${b}» غير موجودة في الدائرة.`, "b");
  if (a === b) fail("الطرفان يجب أن يكونا عقدتين مختلفتين.", "b");
  const RL = num(input, "RL", "مقاومة الحمل", { optional: true, positive: true });
  let r;
  try { r = thevenin(els, a, b); } catch (e) {
    if (e.name === "InputError") fail(`${e.message} (عند إطفاء المصادر أو حقن تيار الاختبار قد تنفصل الدائرة).`, "net");
    throw e;
  }
  const { Voc, Rth } = r;
  const steps = [
    { text: "الخطوة 1: نحل الدائرة كما هي (الطرفان مفتوحان) بتحليل العقد ونقرأ الجهد بينهما:", tex: `V_{th} = V_{${a}} - V_{${b}} = ${ntex(Voc, 6)}\\ V` },
    { text: "الخطوة 2: نطفئ المصادر المستقلة (مصدر الجهد يصبح قصراً ومصدر التيار يصبح مفتوحاً)، ونحقن تيار اختبار 1 A بين الطرفين ونقيس الجهد:", tex: `R_{th} = \\frac{V_{test}}{1\\,A} = ${ntex(Rth, 6)}\\ \\Omega` }
  ];
  const results = [{ label: "جهد ثيفينين Vth", value: eng(Voc, "V", 5), text: `Vth = ${eng(Voc, "V", 5)}` }, { label: "مقاومة ثيفينين Rth", value: eng(Rth, "Ω", 5), text: `Rth = ${eng(Rth, "Ω", 5)}` }];
  if (Math.abs(Rth) > 1e-12) {
    const In = Voc / Rth;
    results.push({ label: "تيار نورتن IN", value: eng(In, "A", 5) }, { label: "مقاومة نورتن RN", value: eng(Rth, "Ω", 5) });
    steps.push({ text: "الخطوة 3: مكافئ نورتن من التحويل بين المصدرين:", tex: `I_N = \\frac{V_{th}}{R_{th}} = ${ntex(In, 6)}\\ A,\\quad R_N = R_{th}` });
  } else steps.push("مقاومة ثيفينين صفر، فالمكافئ مصدر جهد مثالي ولا يوجد مكافئ نورتن.");
  if (RL !== null) {
    const IL = Voc / (Rth + RL);
    const full = solveMNA([...els, { name: "RLOAD", kind: "R", a, b, value: RL }], "net");
    const ILfull = (full.V[a] - full.V[b]) / RL;
    results.push({ label: `تيار الحمل ${eng(RL, "Ω")}`, value: eng(IL, "A", 5) }, { label: "جهد الحمل", value: eng(IL * RL, "V", 5) });
    steps.push({ text: "التحقق: نصل الحمل بالمكافئ، ثم بالدائرة الأصلية مباشرة:", tex: `I_L = \\frac{${ntex(Voc, 6)}}{${ntex(Rth, 6)} + ${ntex(RL)}} = ${ntex(IL, 6)}\\ A\\quad\\text{vs}\\quad ${ntex(ILfull, 6)}\\ A` });
    steps.push(Math.abs(IL - ILfull) <= 1e-9 * Math.max(1, Math.abs(IL)) ? "النتيجتان متطابقتان، فالمكافئ صحيح." : `فرق غير متوقع ${fmt(IL - ILfull, 3)}.`);
  }
  return { results, steps, copy: `Vth = ${eng(Voc, "V", 5)}, Rth = ${eng(Rth, "Ω", 5)}` };
}
