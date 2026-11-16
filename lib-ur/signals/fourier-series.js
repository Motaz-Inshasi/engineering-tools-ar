import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, eng, tex as ntex } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

const WAVES = [["square", "موجة مربعة"], ["triangle", "موجة مثلثية"], ["sawtooth", "موجة سن المنشار"], ["halfwave", "جيب مقوّم نصف موجة"], ["fullwave", "جيب مقوّم موجة كاملة"], ["pulse", "قطار نبضات مستطيلة"]];

export const meta = {
  description: "متسلسلة فورييه للموجات الأساسية: المربعة والمثلثية وسن المنشار والمقومة والنبضات، مع جدول المعاملات وطيف التوافقيات والقيمة الفعالة (بارسيفال) ورسم يقارن الموجة بالمجموع الجزئي.",
  keywords: ["فورييه", "متسلسلة فورييه", "fourier series", "توافقيات", "harmonics", "موجة مربعة", "طيف", "بارسيفال"],
  formulas: [
    { label: "الصيغة المثلثية لمتسلسلة فورييه", tex: "x(t) = a_0 + \\sum_{n=1}^{\\infty}\\left[a_n\\cos(n\\omega_0 t) + b_n\\sin(n\\omega_0 t)\\right],\\quad \\omega_0 = \\frac{2\\pi}{T}" },
    { label: "المعاملات ونظرية بارسيفال", tex: "a_n = \\frac{2}{T}\\int_T x\\cos(n\\omega_0 t)dt,\\; b_n = \\frac{2}{T}\\int_T x\\sin(n\\omega_0 t)dt,\\; X_{rms}^2 = a_0^2 + \\sum\\frac{a_n^2+b_n^2}{2}" }
  ],
  inputs: [
    { id: "wave", label: "شكل الموجة", type: "select", default: "square", options: WAVES },
    { id: "A", label: "السعة A", type: "number", default: "1" },
    { id: "f", label: "التردد الأساسي f", unit: "Hz", type: "number", default: "50" },
    { id: "d", label: "دورة العمل d", type: "number", default: "0.25", when: { wave: ["pulse"] }, help: "نسبة زمن النبضة إلى الدور، بين 0 و 1." },
    { id: "N", label: "عدد التوافقيات N", type: "number", default: "9", help: "من 1 إلى 50" }
  ],
  example: { values: { wave: "square", A: "1", f: "50", N: "7" }, expect: ["b1 = 1.27324", "b3 = 0.424413"], note: "مثال: موجة مربعة سعتها 1: $b_n = \\frac{4A}{n\\pi}$ للتوافقيات الفردية فقط." },
  invalid: { values: { wave: "pulse", A: "1", f: "50", d: "1.5", N: "5" } },
  related: ["sampling-nyquist", "laplace", "passive-filter", "rectifier-ripple"]
};

const RMS = { square: (A) => A, triangle: (A) => A / Math.sqrt(3), sawtooth: (A) => A / Math.sqrt(3), halfwave: (A) => A / 2, fullwave: (A) => A / Math.SQRT2, pulse: (A, d) => A * Math.sqrt(d) };

export function waveform(w, A, T, d = 0.5) {
  return (t) => {
    let u = ((t / T) % 1 + 1) % 1;
    if (u >= 0.5) u -= 1;
    switch (w) {
      case "square": return u === 0 || u === -0.5 ? 0 : u > 0 ? A : -A;
      case "triangle": return A * (1 - 4 * Math.abs(u));
      case "sawtooth": return u === -0.5 ? 0 : 2 * A * u;
      case "halfwave": return u >= 0 ? A * Math.sin(2 * Math.PI * u) : 0;
      case "fullwave": return A * Math.abs(Math.sin(Math.PI * u));
      case "pulse": return Math.abs(u) < d / 2 ? A : Math.abs(u) === d / 2 ? A / 2 : 0;
    }
    return NaN;
  };
}

export function coefficients(w, A, n, d = 0.5) {
  const pi = Math.PI;
  if (n === 0) {
    return { a: { square: 0, triangle: 0, sawtooth: 0, halfwave: A / pi, fullwave: (2 * A) / pi, pulse: A * d }[w], b: 0 };
  }
  switch (w) {
    case "square": return { a: 0, b: n % 2 ? (4 * A) / (n * pi) : 0 };
    case "triangle": return { a: n % 2 ? (8 * A) / (pi * pi * n * n) : 0, b: 0 };
    case "sawtooth": return { a: 0, b: (2 * A * (n % 2 ? 1 : -1)) / (n * pi) };
    case "halfwave":
      if (n === 1) return { a: 0, b: A / 2 };
      return { a: n % 2 ? 0 : (-2 * A) / (pi * (n * n - 1)), b: 0 };
    case "fullwave": return { a: (-4 * A) / (pi * (4 * n * n - 1)), b: 0 };
    case "pulse": return { a: (2 * A * Math.sin(n * pi * d)) / (n * pi), b: 0 };
  }
  return { a: NaN, b: NaN };
}

const FORM = {
  square: "a_n = 0,\\quad b_n = \\frac{4A}{n\\pi}\\;(n\\text{ odd}),\\quad b_n = 0\\;(n\\text{ even})",
  triangle: "b_n = 0,\\quad a_n = \\frac{8A}{\\pi^2 n^2}\\;(n\\text{ odd})",
  sawtooth: "a_n = 0,\\quad b_n = \\frac{2A(-1)^{n+1}}{n\\pi}",
  halfwave: "a_0 = \\frac{A}{\\pi},\\; b_1 = \\frac{A}{2},\\; a_n = \\frac{-2A}{\\pi(n^2-1)}\\;(n\\text{ even})",
  fullwave: "a_0 = \\frac{2A}{\\pi},\\quad a_n = \\frac{-4A}{\\pi(4n^2-1)}",
  pulse: "a_0 = Ad,\\quad a_n = \\frac{2A\\sin(n\\pi d)}{n\\pi}"
};

const SYM = {
  square: "الموجة فردية (x(−t) = −x(t))، فكل معاملات الجيب تمام صفر، والتوافقيات الزوجية تختفي بسبب تناظر نصف الموجة.",
  triangle: "الموجة زوجية، فكل معاملات الجيب صفر، وتناظر نصف الموجة يلغي التوافقيات الزوجية.",
  sawtooth: "الموجة فردية، فكل معاملات الجيب تمام صفر، وتظهر كل التوافقيات.",
  halfwave: "الموجة ليست زوجية ولا فردية، لذلك يظهر حد ثابت وحد جيب أساسي وتوافقيات جيب تمام زوجية.",
  fullwave: "الموجة زوجية ودورها T، فلا توجد إلا معاملات جيب التمام مع حد ثابت كبير.",
  pulse: "النبضة متمركزة حول الصفر فهي زوجية، والمعاملات تتبع دالة sinc."
};

const LABEL = Object.fromEntries(WAVES);

export function solve(input) {
  const w = choice(input, "wave", "شكل الموجة", WAVES.map((x) => x[0]), "square");
  const A = num(input, "A", "السعة", { positive: true });
  const f = num(input, "f", "التردد", { positive: true });
  const N = num(input, "N", "عدد التوافقيات", { integer: true, min: 1, max: 50 });
  const d = w === "pulse" ? num(input, "d", "دورة العمل", { positive: true, below: 1 }) : 0.5;
  const T = 1 / f, w0 = 2 * Math.PI * f;
  const c0 = coefficients(w, A, 0, d).a;
  const rows = [], text = [];
  let power = c0 * c0;
  const cs = [];
  for (let n = 1; n <= N; n++) {
    const { a, b } = coefficients(w, A, n, d);
    const an = Math.abs(a) < 1e-15 ? 0 : a, bn = Math.abs(b) < 1e-15 ? 0 : b;
    cs.push({ n, a: an, b: bn });
    const mag = Math.hypot(an, bn);
    power += (an * an + bn * bn) / 2;
    rows.push([String(n), eng(n * f, "Hz"), fmt(an, 6), fmt(bn, 6), fmt(mag, 6)]);
    if (an) text.push(`a${n} = ${fmt(an, 6)}`);
    if (bn) text.push(`b${n} = ${fmt(bn, 6)}`);
  }
  const rmsExact = RMS[w](A, d);
  const partial = (t) => c0 + cs.reduce((s, { n, a, b }) => s + a * Math.cos(n * w0 * t) + b * Math.sin(n * w0 * t), 0);
  const x = waveform(w, A, T, d);
  const spectrum = cs.filter((c) => Math.hypot(c.a, c.b) > 0).map((c) => [c.n, Math.hypot(c.a, c.b)]);
  const steps = [
    `الدور $T = 1/f = ${ntex(T, 6)}$ ث والتردد الزاوي $\\omega_0 = 2\\pi f = ${ntex(w0, 6)}$ rad/s.`,
    SYM[w],
    { text: `بإجراء تكاملات المعاملات على دور واحد نحصل على (ثم نعوّض $A = ${ntex(A)}$${w === "pulse" ? ` و $d = ${ntex(d)}$` : ""}، والقيم في الجدول):`, tex: FORM[w] },
    { text: "الحد الثابت (القيمة المتوسطة):", tex: `a_0 = ${ntex(c0, 8)}` },
    `القيمة الفعالة الدقيقة للموجة ${fmt(rmsExact, 8)}، ومن بارسيفال بأول ${N} توافقية ${fmt(Math.sqrt(power), 8)}، أي أن المجموع الجزئي يحمل ${fmt((100 * power) / (rmsExact * rmsExact), 5)}% من القدرة.`
  ];
  return {
    results: [
      { label: "الموجة", value: LABEL[w] },
      { label: "الحد الثابت $a_0$", value: c0, sig: 8 },
      { label: "المعاملات غير الصفرية", value: text.slice(0, 8).join("، ") + (text.length > 8 ? "، …" : "") },
      { label: "القيمة الفعالة الدقيقة", value: rmsExact, sig: 8 },
      { label: `نسبة القدرة في أول ${N} توافقية`, value: (100 * power) / (rmsExact * rmsExact), unit: "%", sig: 5 }
    ],
    blocks: [
      { type: "table", caption: "معاملات فورييه", head: ["n", "التردد", "aₙ", "bₙ", "السعة √(aₙ²+bₙ²)"], rows },
      { type: "plot", title: `الموجة الأصلية والمجموع الجزئي لأول ${N} توافقية`, xLabel: "t (s)", yLabel: "x(t)", series: [{ name: "الموجة", points: sampleFunction(x, -T, T, 801) }, { name: `مجموع ${N} توافقية`, points: sampleFunction(partial, -T, T, 801), dashed: true }] },
      { type: "plot", title: "طيف السعات", xLabel: "n", yLabel: "|cₙ|", includeZero: true, series: [{ name: "السعة", points: spectrum, marker: "o" }] }
    ],
    steps,
    copy: [`a0 = ${fmt(c0, 6)}`, ...text].join("\n")
  };
}
