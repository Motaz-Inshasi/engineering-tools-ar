import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["simplify", "solve", "divide", "direct", "inverse"];
const TERMS = ["a", "b", "c", "d"];
const N = (x) => fmt(x, 10);

export const meta = {
  description: "بسّط النسبة إلى أعداد صحيحة في أبسط صورة، وحل التناسب a/b = c/d لإيجاد الحد المجهول، وقسّم مبلغاً بنسبة معطاة، وحل مسائل التناسب الطردي والعكسي مع الخطوات.",
  keywords: ["نسبة", "تناسب", "ratio", "proportion", "تقسيم بنسبة", "تناسب طردي", "تناسب عكسي", "حل التناسب"],
  formulas: [
    { label: "التناسب الطردي", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_2}{x_1}" },
    { label: "التناسب العكسي", tex: "y_1 x_1 = y_2 x_2\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_1}{x_2}" },
    { label: "تناسب a/b = c/d", tex: "a\\cdot d = b\\cdot c" }
  ],
  inputs: [
    { id: "mode", label: "نوع المسألة", type: "select", default: "simplify", options: [["simplify", "تبسيط نسبة إلى أعداد صحيحة"], ["solve", "حل تناسب a/b = c/d (حد مجهول)"], ["divide", "تقسيم مبلغ بنسبة معطاة"], ["direct", "تناسب طردي"], ["inverse", "تناسب عكسي"]] },
    { id: "ratio", label: "النسبة a:b(:c)", type: "text", default: "2:3:5", when: { mode: ["simplify", "divide"] }, help: "من 2 إلى 5 أجزاء مفصولة بنقطتين، ويجوز الكسر العشري." },
    { id: "total", label: "المبلغ الكلي", type: "number", default: "1200", when: { mode: ["divide"] } },
    { id: "a", label: "الحد a", type: "number", default: "2", when: { mode: ["solve"] }, help: "في تناسب الحل اترك حداً واحداً فقط فارغاً." },
    { id: "b", label: "الحد b", type: "number", default: "3", when: { mode: ["solve"] } },
    { id: "c", label: "الحد c", type: "number", default: "4", when: { mode: ["solve"] } },
    { id: "d", label: "الحد d", type: "number", default: "", when: { mode: ["solve"] } },
    { id: "x1", label: "القيمة الأولى x₁", type: "number", default: "5", when: { mode: ["direct", "inverse"] }, help: "مثال: 5 عمال." },
    { id: "y1", label: "القيمة المقابلة y₁", type: "number", default: "12", when: { mode: ["direct", "inverse"] }, help: "مثال: 12 يوماً." },
    { id: "x2", label: "القيمة الثانية x₂", type: "number", default: "6", when: { mode: ["direct", "inverse"] }, help: "مثال: 6 عمال، والناتج y₂ هو المجهول." }
  ],
  example: {
    values: { mode: "inverse", ratio: "2:3:5", total: "1200", a: "", b: "", c: "", d: "", x1: "5", y1: "12", x2: "6" },
    expect: ["y₂ = 10"],
    note: "مثال: 5 عمال ينهون العمل في 12 يوماً، فكم يوماً يحتاج 6 عمال؟ (تناسب عكسي)"
  },
  invalid: { values: { mode: "solve", a: "2", b: "", c: "4", d: "" } },
  related: ["fractions", "percentage", "quadratic"]
};

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function ratioOf(input) {
  const raw = str(input, "ratio", "النسبة");
  const texts = raw.split(":").map((s) => s.trim());
  if (texts.length < 2 || texts.length > 5) fail("أدخل نسبة من 2 إلى 5 أجزاء مفصولة بنقطتين، مثل 2:3:5.", "ratio");
  const parts = texts.map((t) => {
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) fail(`الجزء «${t}» في النسبة ليس عدداً موجباً.`, "ratio");
    const [ip, fp = ""] = t.split(".");
    const n = BigInt(ip + fp);
    if (n === 0n) fail("أجزاء النسبة يجب أن تكون أكبر من صفر.", "ratio");
    return { n, scale: fp.length };
  });
  const K = Math.max(...parts.map((p) => p.scale));
  const scaled = parts.map((p) => p.n * 10n ** BigInt(K - p.scale));
  const g = scaled.reduce((x, y) => gcd(x, y));
  return { K, texts, scaled, g, red: scaled.map((x) => x / g) };
}

function simplifyMode(input) {
  const R = ratioOf(input);
  const steps = [];
  if (R.K > 0) steps.push({ text: `نضرب كل الأجزاء في ${10n ** BigInt(R.K)} لتصبح أعداداً صحيحة:`, tex: `${R.texts.join(" : ")} = ${R.scaled.join(" : ")}` });
  if (R.g > 1n) {
    steps.push({ text: "القاسم المشترك الأكبر لكل الأجزاء:", tex: `\\gcd(${R.scaled.join(", ")}) = ${R.g}` });
    steps.push({ text: "نقسم كل جزء على هذا القاسم:", tex: `${R.scaled.join(" : ")} = ${R.red.join(" : ")}` });
  } else {
    steps.push({ text: "لا يوجد قاسم مشترك أكبر من 1، فالنسبة مبسطة:", tex: `\\gcd(${R.scaled.join(", ")}) = 1` });
  }
  const value = R.red.join(" : ");
  return {
    results: [{ label: "النسبة في أبسط صورة", value }],
    steps,
    copy: `${R.texts.join(" : ")} = ${value}`
  };
}

function divideMode(input) {
  const R = ratioOf(input);
  const total = num(input, "total", "المبلغ الكلي", { positive: true });
  const r = R.red.map((x) => Number(x));
  const S = r.reduce((x, y) => x + y, 0);
  const shares = r.map((x) => (total * x) / S);
  const steps = [
    { text: "نبسط النسبة أولاً ثم نجمع أجزاءها:", tex: `${R.texts.join(" : ")} = ${r.join(" : ")},\\quad S = ${r.join(" + ")} = ${S}` }
  ];
  r.forEach((x, i) => steps.push({ text: `حصة الجزء ${i + 1} = المبلغ × جزؤه ÷ المجموع:`, tex: `${ntex(total)} \\times \\frac{${x}}{${S}} = ${N(shares[i])}` }));
  steps.push({ text: "نتحقق أن مجموع الحصص يساوي المبلغ:", tex: `${shares.map((s) => N(s)).join(" + ")} = ${ntex(total)}` });
  return {
    results: r.map((x, i) => ({ label: `الحصة ${i + 1} (${x})`, value: N(shares[i]) })),
    steps,
    copy: `${N(total)} بنسبة ${R.red.join(":")} = ${shares.map((s) => N(s)).join(" : ")}`
  };
}

function solveMode(input) {
  const v = {};
  const blanks = [];
  for (const k of TERMS) {
    v[k] = num(input, k, `الحد ${k}`, { optional: true });
    if (v[k] === null) blanks.push(k);
  }
  if (blanks.length !== 1) {
    fail(`أدخل ثلاثة حدود واترك حداً واحداً فارغاً (أدخلت ${4 - blanks.length} حدوداً).`, blanks.length > 1 ? blanks[1] : "a");
  }
  const k = blanks[0];
  if (k !== "b" && v.b === 0) fail("المقام b لا يمكن أن يساوي صفراً في التناسب.", "b");
  if (k !== "d" && v.d === 0) fail("المقام d لا يمكن أن يساوي صفراً في التناسب.", "d");
  const divisorKey = { a: "d", b: "c", c: "b", d: "a" }[k];
  if (v[divisorKey] === 0) fail(`لا يمكن الحل لأن الحد ${divisorKey} يساوي صفراً.`, divisorKey);

  const known = v;
  const x = k === "a" ? (known.b * known.c) / known.d
    : k === "b" ? (known.a * known.d) / known.c
    : k === "c" ? (known.a * known.d) / known.b
    : (known.b * known.c) / known.a;
  if ((k === "b" || k === "d") && x === 0) fail(`الحد ${k} المحسوب يساوي صفراً، فيصبح مقاماً في التناسب مساوياً للصفر.`, k);
  v[k] = x;
  const { a, b, c, d } = v;

  const formula = {
    a: `a = \\frac{b\\cdot c}{d} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(d)}}`,
    b: `b = \\frac{a\\cdot d}{c} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(c)}}`,
    c: `c = \\frac{a\\cdot d}{b} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(b)}}`,
    d: `d = \\frac{b\\cdot c}{a} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(a)}}`
  }[k];
  const steps = [
    { text: "في التناسب a/b = c/d يتساوى حاصل ضرب الطرفين المتقاطعين:", tex: "a\\cdot d = b\\cdot c" },
    { text: `نحل المعادلة لإيجاد الحد ${k}:`, tex: `${formula} = ${ntex(x, 8)}` },
    { text: "نتحقق من التناسب بعد الحل:", tex: `\\frac{${ntex(a)}}{${ntex(b)}} = ${ntex(a / b, 8)} = ${ntex(c / d, 8)} = \\frac{${ntex(c)}}{${ntex(d)}}` }
  ];
  return {
    results: [
      { label: `الحد المجهول ${k}`, value: N(x) },
      { label: "التناسب كاملاً", value: `${N(a)}/${N(b)} = ${N(c)}/${N(d)}` }
    ],
    steps,
    copy: `${k} = ${N(x)}  (${N(a)}/${N(b)} = ${N(c)}/${N(d)})`
  };
}

function proportionMode(input, inverse) {
  const x1 = num(input, "x1", "القيمة الأولى x₁", { positive: true });
  const y1 = num(input, "y1", "القيمة المقابلة y₁", { nonNegative: true });
  const x2 = num(input, "x2", "القيمة الثانية x₂", { positive: true });
  const y2 = inverse ? (y1 * x1) / x2 : (y1 * x2) / x1;
  const k = inverse ? y1 * x1 : y1 / x1;
  const name = inverse ? "عكسي" : "طردي";
  const steps = inverse
    ? [
        { text: "في التناسب العكسي يبقى حاصل الضرب y·x ثابتاً:", tex: "y_1\\cdot x_1 = y_2\\cdot x_2" },
        { text: "نحل المعادلة لإيجاد y₂:", tex: `y_2 = \\frac{y_1\\cdot x_1}{x_2} = \\frac{${ntex(y1)}\\cdot ${ntex(x1)}}{${ntex(x2)}} = ${ntex(y2, 8)}` }
      ]
    : [
        { text: "في التناسب الطردي تبقى النسبة y/x ثابتة:", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}" },
        { text: "نحل المعادلة لإيجاد y₂:", tex: `y_2 = \\frac{y_1\\cdot x_2}{x_1} = \\frac{${ntex(y1)}\\cdot ${ntex(x2)}}{${ntex(x1)}} = ${ntex(y2, 8)}` }
      ];
  return {
    results: [
      { label: "القيمة المجهولة y₂", value: N(y2) },
      { label: inverse ? "ثابت التناسب العكسي y·x" : "ثابت التناسب الطردي y/x", value: N(k) }
    ],
    steps,
    copy: `y₂ = ${N(y2)} (تناسب ${name})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع المسألة", MODES, "simplify");
  if (mode === "simplify") return simplifyMode(input);
  if (mode === "solve") return solveMode(input);
  if (mode === "divide") return divideMode(input);
  return proportionMode(input, mode === "inverse");
}
