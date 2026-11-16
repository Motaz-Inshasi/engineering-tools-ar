import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["simplify", "solve", "divide", "direct", "inverse"];
const TERMS = ["a", "b", "c", "d"];
const N = (x) => fmt(x, 10);

export const meta = {
  description: "کسی نسبت کو سادہ ترین شکل میں صحیح اعداد تک سادہ کریں، تناسب a/b = c/d حل کر کے نامعلوم رکن معلوم کریں، کسی رقم کو دی گئی نسبت سے تقسیم کریں، اور راست اور معکوس تناسب کے سوالات مراحل کے ساتھ حل کریں۔",
  keywords: ["نسبت", "تناسب", "ratio", "proportion", "نسبت سے تقسیم", "راست تناسب", "معکوس تناسب", "تناسب کو حل کرنا"],
  formulas: [
    { label: "راست تناسب", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_2}{x_1}" },
    { label: "معکوس تناسب", tex: "y_1 x_1 = y_2 x_2\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_1}{x_2}" },
    { label: "تناسب a/b = c/d", tex: "a\\cdot d = b\\cdot c" }
  ],
  inputs: [
    { id: "mode", label: "سوال کی قسم", type: "select", default: "simplify", options: [["simplify", "نسبت کو صحیح اعداد تک سادہ کریں"], ["solve", "تناسب a/b = c/d حل کریں (نامعلوم رکن)"], ["divide", "رقم کو دی گئی نسبت سے تقسیم کریں"], ["direct", "راست تناسب"], ["inverse", "معکوس تناسب"]] },
    { id: "ratio", label: "نسبت a:b(:c)", type: "text", default: "2:3:5", when: { mode: ["simplify", "divide"] }, help: "2 سے 5 حصے دو نقطوں سے الگ کیے ہوئے؛ اعشاری عدد بھی قبول ہے۔" },
    { id: "total", label: "کل رقم", type: "number", default: "1200", when: { mode: ["divide"] } },
    { id: "a", label: "رکن a", type: "number", default: "2", when: { mode: ["solve"] }, help: "حل طلب تناسب میں صرف ایک رکن خالی چھوڑیں۔" },
    { id: "b", label: "رکن b", type: "number", default: "3", when: { mode: ["solve"] } },
    { id: "c", label: "رکن c", type: "number", default: "4", when: { mode: ["solve"] } },
    { id: "d", label: "رکن d", type: "number", default: "", when: { mode: ["solve"] } },
    { id: "x1", label: "پہلی قدر x₁", type: "number", default: "5", when: { mode: ["direct", "inverse"] }, help: "مثال: 5 مزدور۔" },
    { id: "y1", label: "متعلقہ قدر y₁", type: "number", default: "12", when: { mode: ["direct", "inverse"] }, help: "مثال: 12 دن۔" },
    { id: "x2", label: "دوسری قدر x₂", type: "number", default: "6", when: { mode: ["direct", "inverse"] }, help: "مثال: 6 مزدور، اور نتیجہ y₂ نامعلوم ہے۔" }
  ],
  example: {
    values: { mode: "inverse", ratio: "2:3:5", total: "1200", a: "", b: "", c: "", d: "", x1: "5", y1: "12", x2: "6" },
    expect: ["y₂ = 10"],
    note: "مثال: 5 مزدور کام 12 دنوں میں ختم کرتے ہیں، تو 6 مزدوروں کو کتنے دن درکار ہوں گے؟ (معکوس تناسب)"
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
  const raw = str(input, "ratio", "نسبت");
  const texts = raw.split(":").map((s) => s.trim());
  if (texts.length < 2 || texts.length > 5) fail("دو نقطوں سے الگ کیے ہوئے 2 سے 5 حصوں کی نسبت درج کریں، جیسے 2:3:5۔", "ratio");
  const parts = texts.map((t) => {
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) fail(`نسبت میں حصہ «${t}» مثبت عدد نہیں ہے۔`, "ratio");
    const [ip, fp = ""] = t.split(".");
    const n = BigInt(ip + fp);
    if (n === 0n) fail("نسبت کے حصے صفر سے بڑے ہونے چاہئیں۔", "ratio");
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
  if (R.K > 0) steps.push({ text: `ہم تمام حصوں کو ${10n ** BigInt(R.K)} سے ضرب دیتے ہیں تاکہ وہ صحیح اعداد بن جائیں:`, tex: `${R.texts.join(" : ")} = ${R.scaled.join(" : ")}` });
  if (R.g > 1n) {
    steps.push({ text: "تمام حصوں کا بڑا مشترک جزو:", tex: `\\gcd(${R.scaled.join(", ")}) = ${R.g}` });
    steps.push({ text: "ہم ہر حصے کو اس جزو سے تقسیم کرتے ہیں:", tex: `${R.scaled.join(" : ")} = ${R.red.join(" : ")}` });
  } else {
    steps.push({ text: "1 سے بڑا کوئی مشترک جزو نہیں، اس لیے نسبت پہلے ہی سادہ ہے:", tex: `\\gcd(${R.scaled.join(", ")}) = 1` });
  }
  const value = R.red.join(" : ");
  return {
    results: [{ label: "سادہ ترین شکل میں نسبت", value }],
    steps,
    copy: `${R.texts.join(" : ")} = ${value}`
  };
}

function divideMode(input) {
  const R = ratioOf(input);
  const total = num(input, "total", "کل رقم", { positive: true });
  const r = R.red.map((x) => Number(x));
  const S = r.reduce((x, y) => x + y, 0);
  const shares = r.map((x) => (total * x) / S);
  const steps = [
    { text: "ہم پہلے نسبت کو سادہ کرتے ہیں، پھر اس کے حصے جمع کرتے ہیں:", tex: `${R.texts.join(" : ")} = ${r.join(" : ")},\\quad S = ${r.join(" + ")} = ${S}` }
  ];
  r.forEach((x, i) => steps.push({ text: `حصہ ${i + 1} کا حصہ = رقم × اس کا جز ÷ کل:`, tex: `${ntex(total)} \\times \\frac{${x}}{${S}} = ${N(shares[i])}` }));
  steps.push({ text: "ہم تصدیق کرتے ہیں کہ حصوں کا مجموعہ رقم کے برابر ہے:", tex: `${shares.map((s) => N(s)).join(" + ")} = ${ntex(total)}` });
  return {
    results: r.map((x, i) => ({ label: `حصہ ${i + 1} (${x})`, value: N(shares[i]) })),
    steps,
    copy: `${N(total)} کو نسبت ${R.red.join(":")} میں = ${shares.map((s) => N(s)).join(" : ")}`
  };
}

function solveMode(input) {
  const v = {};
  const blanks = [];
  for (const k of TERMS) {
    v[k] = num(input, k, `رکن ${k}`, { optional: true });
    if (v[k] === null) blanks.push(k);
  }
  if (blanks.length !== 1) {
    fail(`تین ارکان درج کریں اور ایک رکن خالی چھوڑیں (آپ نے ${4 - blanks.length} ارکان درج کیے ہیں)۔`, blanks.length > 1 ? blanks[1] : "a");
  }
  const k = blanks[0];
  if (k !== "b" && v.b === 0) fail("تناسب میں مخرج b صفر نہیں ہو سکتا۔", "b");
  if (k !== "d" && v.d === 0) fail("تناسب میں مخرج d صفر نہیں ہو سکتا۔", "d");
  const divisorKey = { a: "d", b: "c", c: "b", d: "a" }[k];
  if (v[divisorKey] === 0) fail(`حل ممکن نہیں کیونکہ رکن ${divisorKey} صفر کے برابر ہے۔`, divisorKey);

  const known = v;
  const x = k === "a" ? (known.b * known.c) / known.d
    : k === "b" ? (known.a * known.d) / known.c
    : k === "c" ? (known.a * known.d) / known.b
    : (known.b * known.c) / known.a;
  if ((k === "b" || k === "d") && x === 0) fail(`حساب شدہ رکن ${k} صفر کے برابر ہے، لہٰذا تناسب میں ایک مخرج صفر ہو جاتا ہے۔`, k);
  v[k] = x;
  const { a, b, c, d } = v;

  const formula = {
    a: `a = \\frac{b\\cdot c}{d} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(d)}}`,
    b: `b = \\frac{a\\cdot d}{c} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(c)}}`,
    c: `c = \\frac{a\\cdot d}{b} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(b)}}`,
    d: `d = \\frac{b\\cdot c}{a} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(a)}}`
  }[k];
  const steps = [
    { text: "تناسب a/b = c/d میں متقاطع ارکان کے حاصل ضرب برابر ہوتے ہیں:", tex: "a\\cdot d = b\\cdot c" },
    { text: `رکن ${k} معلوم کرنے کے لیے ہم مساوات حل کرتے ہیں:`, tex: `${formula} = ${ntex(x, 8)}` },
    { text: "حل کے بعد ہم تناسب کی تصدیق کرتے ہیں:", tex: `\\frac{${ntex(a)}}{${ntex(b)}} = ${ntex(a / b, 8)} = ${ntex(c / d, 8)} = \\frac{${ntex(c)}}{${ntex(d)}}` }
  ];
  return {
    results: [
      { label: `نامعلوم رکن ${k}`, value: N(x) },
      { label: "مکمل تناسب", value: `${N(a)}/${N(b)} = ${N(c)}/${N(d)}` }
    ],
    steps,
    copy: `${k} = ${N(x)}  (${N(a)}/${N(b)} = ${N(c)}/${N(d)})`
  };
}

function proportionMode(input, inverse) {
  const x1 = num(input, "x1", "پہلی قدر x₁", { positive: true });
  const y1 = num(input, "y1", "متعلقہ قدر y₁", { nonNegative: true });
  const x2 = num(input, "x2", "دوسری قدر x₂", { positive: true });
  const y2 = inverse ? (y1 * x1) / x2 : (y1 * x2) / x1;
  const k = inverse ? y1 * x1 : y1 / x1;
  const name = inverse ? "معکوس" : "راست";
  const steps = inverse
    ? [
        { text: "معکوس تناسب میں حاصل ضرب y·x مستقل رہتا ہے:", tex: "y_1\\cdot x_1 = y_2\\cdot x_2" },
        { text: "y₂ معلوم کرنے کے لیے ہم مساوات حل کرتے ہیں:", tex: `y_2 = \\frac{y_1\\cdot x_1}{x_2} = \\frac{${ntex(y1)}\\cdot ${ntex(x1)}}{${ntex(x2)}} = ${ntex(y2, 8)}` }
      ]
    : [
        { text: "راست تناسب میں نسبت y/x مستقل رہتی ہے:", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}" },
        { text: "y₂ معلوم کرنے کے لیے ہم مساوات حل کرتے ہیں:", tex: `y_2 = \\frac{y_1\\cdot x_2}{x_1} = \\frac{${ntex(y1)}\\cdot ${ntex(x2)}}{${ntex(x1)}} = ${ntex(y2, 8)}` }
      ];
  return {
    results: [
      { label: "نامعلوم قدر y₂", value: N(y2) },
      { label: inverse ? "معکوس تناسب کا مستقل y·x" : "راست تناسب کا مستقل y/x", value: N(k) }
    ],
    steps,
    copy: `y₂ = ${N(y2)} (${name} تناسب)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "سوال کی قسم", MODES, "simplify");
  if (mode === "simplify") return simplifyMode(input);
  if (mode === "solve") return solveMode(input);
  if (mode === "divide") return divideMode(input);
  return proportionMode(input, mode === "inverse");
}
