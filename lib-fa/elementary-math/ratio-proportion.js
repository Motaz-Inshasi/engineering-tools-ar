import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["simplify", "solve", "divide", "direct", "inverse"];
const TERMS = ["a", "b", "c", "d"];
const N = (x) => fmt(x, 10);

export const meta = {
  description: "نسبت را به ساده‌ترین صورت با اعداد صحیح بنویسید، تناسب a/b = c/d را برای یافتن جملهٔ مجهول حل کنید، مبلغی را با نسبت داده‌شده تقسیم کنید، و مسائل تناسب مستقیم و معکوس را همراه با مراحل حل کنید.",
  keywords: ["نسبت", "تناسب", "ratio", "proportion", "تقسیم به نسبت", "تناسب مستقیم", "تناسب معکوس", "حل تناسب"],
  formulas: [
    { label: "تناسب مستقیم", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_2}{x_1}" },
    { label: "تناسب معکوس", tex: "y_1 x_1 = y_2 x_2\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_1}{x_2}" },
    { label: "تناسب a/b = c/d", tex: "a\\cdot d = b\\cdot c" }
  ],
  inputs: [
    { id: "mode", label: "نوع مسئله", type: "select", default: "simplify", options: [["simplify", "ساده‌سازی نسبت به اعداد صحیح"], ["solve", "حل تناسب a/b = c/d (جملهٔ مجهول)"], ["divide", "تقسیم مبلغ به نسبت داده‌شده"], ["direct", "تناسب مستقیم"], ["inverse", "تناسب معکوس"]] },
    { id: "ratio", label: "نسبت a:b(:c)", type: "text", default: "2:3:5", when: { mode: ["simplify", "divide"] }, help: "از 2 تا 5 بخش که با دو نقطه جدا شده‌اند؛ عدد اعشاری مجاز است." },
    { id: "total", label: "مبلغ کل", type: "number", default: "1200", when: { mode: ["divide"] } },
    { id: "a", label: "جملهٔ a", type: "number", default: "2", when: { mode: ["solve"] }, help: "در تناسبی که باید حل شود، فقط یک جمله را خالی بگذارید." },
    { id: "b", label: "جملهٔ b", type: "number", default: "3", when: { mode: ["solve"] } },
    { id: "c", label: "جملهٔ c", type: "number", default: "4", when: { mode: ["solve"] } },
    { id: "d", label: "جملهٔ d", type: "number", default: "", when: { mode: ["solve"] } },
    { id: "x1", label: "مقدار اول x₁", type: "number", default: "5", when: { mode: ["direct", "inverse"] }, help: "مثال: 5 کارگر." },
    { id: "y1", label: "مقدار متناظر y₁", type: "number", default: "12", when: { mode: ["direct", "inverse"] }, help: "مثال: 12 روز." },
    { id: "x2", label: "مقدار دوم x₂", type: "number", default: "6", when: { mode: ["direct", "inverse"] }, help: "مثال: 6 کارگر، و نتیجهٔ y₂ مجهول است." }
  ],
  example: {
    values: { mode: "inverse", ratio: "2:3:5", total: "1200", a: "", b: "", c: "", d: "", x1: "5", y1: "12", x2: "6" },
    expect: ["y₂ = 10"],
    note: "مثال: 5 کارگر کار را در 12 روز تمام می‌کنند؛ 6 کارگر چند روز نیاز دارند؟ (تناسب معکوس)"
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
  if (texts.length < 2 || texts.length > 5) fail("نسبتی از 2 تا 5 بخش را که با دو نقطه جدا شده‌اند وارد کنید، مانند 2:3:5.", "ratio");
  const parts = texts.map((t) => {
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) fail(`بخش «${t}» در نسبت عدد مثبتی نیست.`, "ratio");
    const [ip, fp = ""] = t.split(".");
    const n = BigInt(ip + fp);
    if (n === 0n) fail("بخش‌های نسبت باید بزرگ‌تر از صفر باشند.", "ratio");
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
  if (R.K > 0) steps.push({ text: `همهٔ بخش‌ها را در ${10n ** BigInt(R.K)} ضرب می‌کنیم تا عدد صحیح شوند:`, tex: `${R.texts.join(" : ")} = ${R.scaled.join(" : ")}` });
  if (R.g > 1n) {
    steps.push({ text: "بزرگ‌ترین مقسوم‌علیه مشترک همهٔ بخش‌ها:", tex: `\\gcd(${R.scaled.join(", ")}) = ${R.g}` });
    steps.push({ text: "هر بخش را بر این مقسوم‌علیه تقسیم می‌کنیم:", tex: `${R.scaled.join(" : ")} = ${R.red.join(" : ")}` });
  } else {
    steps.push({ text: "مقسوم‌علیه مشترک بزرگ‌تر از 1 وجود ندارد، پس نسبت از قبل ساده است:", tex: `\\gcd(${R.scaled.join(", ")}) = 1` });
  }
  const value = R.red.join(" : ");
  return {
    results: [{ label: "نسبت به ساده‌ترین صورت", value }],
    steps,
    copy: `${R.texts.join(" : ")} = ${value}`
  };
}

function divideMode(input) {
  const R = ratioOf(input);
  const total = num(input, "total", "مبلغ کل", { positive: true });
  const r = R.red.map((x) => Number(x));
  const S = r.reduce((x, y) => x + y, 0);
  const shares = r.map((x) => (total * x) / S);
  const steps = [
    { text: "نخست نسبت را ساده می‌کنیم و سپس بخش‌هایش را جمع می‌زنیم:", tex: `${R.texts.join(" : ")} = ${r.join(" : ")},\\quad S = ${r.join(" + ")} = ${S}` }
  ];
  r.forEach((x, i) => steps.push({ text: `سهم بخش ${i + 1} = مبلغ × آن بخش ÷ مجموع:`, tex: `${ntex(total)} \\times \\frac{${x}}{${S}} = ${N(shares[i])}` }));
  steps.push({ text: "بررسی می‌کنیم که مجموع سهم‌ها برابر مبلغ باشد:", tex: `${shares.map((s) => N(s)).join(" + ")} = ${ntex(total)}` });
  return {
    results: r.map((x, i) => ({ label: `سهم ${i + 1} (${x})`, value: N(shares[i]) })),
    steps,
    copy: `${N(total)} به نسبت ${R.red.join(":")} = ${shares.map((s) => N(s)).join(" : ")}`
  };
}

function solveMode(input) {
  const v = {};
  const blanks = [];
  for (const k of TERMS) {
    v[k] = num(input, k, `جملهٔ ${k}`, { optional: true });
    if (v[k] === null) blanks.push(k);
  }
  if (blanks.length !== 1) {
    fail(`سه جمله وارد کنید و یک جمله را خالی بگذارید (شما ${4 - blanks.length} جمله وارد کرده‌اید).`, blanks.length > 1 ? blanks[1] : "a");
  }
  const k = blanks[0];
  if (k !== "b" && v.b === 0) fail("مخرج b در تناسب نمی‌تواند صفر باشد.", "b");
  if (k !== "d" && v.d === 0) fail("مخرج d در تناسب نمی‌تواند صفر باشد.", "d");
  const divisorKey = { a: "d", b: "c", c: "b", d: "a" }[k];
  if (v[divisorKey] === 0) fail(`حل ممکن نیست، زیرا جملهٔ ${divisorKey} برابر صفر است.`, divisorKey);

  const known = v;
  const x = k === "a" ? (known.b * known.c) / known.d
    : k === "b" ? (known.a * known.d) / known.c
    : k === "c" ? (known.a * known.d) / known.b
    : (known.b * known.c) / known.a;
  if ((k === "b" || k === "d") && x === 0) fail(`جملهٔ محاسبه‌شدهٔ ${k} برابر صفر است، پس یک مخرج در تناسب صفر می‌شود.`, k);
  v[k] = x;
  const { a, b, c, d } = v;

  const formula = {
    a: `a = \\frac{b\\cdot c}{d} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(d)}}`,
    b: `b = \\frac{a\\cdot d}{c} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(c)}}`,
    c: `c = \\frac{a\\cdot d}{b} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(b)}}`,
    d: `d = \\frac{b\\cdot c}{a} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(a)}}`
  }[k];
  const steps = [
    { text: "در تناسب a/b = c/d، حاصل ضرب جملات متقاطع برابر است:", tex: "a\\cdot d = b\\cdot c" },
    { text: `معادله را حل می‌کنیم تا جملهٔ ${k} به دست آید:`, tex: `${formula} = ${ntex(x, 8)}` },
    { text: "پس از حل، تناسب را بررسی می‌کنیم:", tex: `\\frac{${ntex(a)}}{${ntex(b)}} = ${ntex(a / b, 8)} = ${ntex(c / d, 8)} = \\frac{${ntex(c)}}{${ntex(d)}}` }
  ];
  return {
    results: [
      { label: `جملهٔ مجهول ${k}`, value: N(x) },
      { label: "کل تناسب", value: `${N(a)}/${N(b)} = ${N(c)}/${N(d)}` }
    ],
    steps,
    copy: `${k} = ${N(x)}  (${N(a)}/${N(b)} = ${N(c)}/${N(d)})`
  };
}

function proportionMode(input, inverse) {
  const x1 = num(input, "x1", "مقدار اول x₁", { positive: true });
  const y1 = num(input, "y1", "مقدار متناظر y₁", { nonNegative: true });
  const x2 = num(input, "x2", "مقدار دوم x₂", { positive: true });
  const y2 = inverse ? (y1 * x1) / x2 : (y1 * x2) / x1;
  const k = inverse ? y1 * x1 : y1 / x1;
  const name = inverse ? "معکوس" : "مستقیم";
  const steps = inverse
    ? [
        { text: "در تناسب معکوس، حاصل ضرب y·x ثابت می‌ماند:", tex: "y_1\\cdot x_1 = y_2\\cdot x_2" },
        { text: "معادله را حل می‌کنیم تا y₂ به دست آید:", tex: `y_2 = \\frac{y_1\\cdot x_1}{x_2} = \\frac{${ntex(y1)}\\cdot ${ntex(x1)}}{${ntex(x2)}} = ${ntex(y2, 8)}` }
      ]
    : [
        { text: "در تناسب مستقیم، نسبت y/x ثابت می‌ماند:", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}" },
        { text: "معادله را حل می‌کنیم تا y₂ به دست آید:", tex: `y_2 = \\frac{y_1\\cdot x_2}{x_1} = \\frac{${ntex(y1)}\\cdot ${ntex(x2)}}{${ntex(x1)}} = ${ntex(y2, 8)}` }
      ];
  return {
    results: [
      { label: "مقدار مجهول y₂", value: N(y2) },
      { label: inverse ? "ثابت تناسب معکوس y·x" : "ثابت تناسب مستقیم y/x", value: N(k) }
    ],
    steps,
    copy: `y₂ = ${N(y2)} (تناسب ${name})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "نوع مسئله", MODES, "simplify");
  if (mode === "simplify") return simplifyMode(input);
  if (mode === "solve") return solveMode(input);
  if (mode === "divide") return divideMode(input);
  return proportionMode(input, mode === "inverse");
}
