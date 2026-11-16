import { str, fail } from "../core/validate.js";
import { parse } from "../core/parser.js";
import { toRational, Unsupported, degree, toTex as ptex, toText as ptext, factorTex, trim } from "../core/polynomial.js";
import { decompose, realForm, evalDecomposition } from "../core/partial.js";
import { C, cabs, cdiv, csub, ctex } from "../core/complex.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { readVar } from "../calculus/common.js";

export const meta = {
  description: "تفکیک هر تابع کسری به کسرهای جزئی: ریشه‌های ساده با روش پوشش (cover-up)، ریشه‌های تکراری، عامل‌های درجه دوم برای ریشه‌های مختلط، و تقسیم بلند چندجمله‌ای در صورتی که تابع نامناسب باشد.",
  keywords: ["کسرهای جزئی", "partial fractions", "تفکیک", "کسر جزئی", "cover-up", "هوی‌ساید", "تابع کسری"],
  formulas: [
    { label: "ریشه ساده (روش پوشش هوی‌ساید)", tex: "\\frac{N(s)}{D(s)} = \\sum \\frac{A_i}{s - p_i},\\quad A_i = \\left.(s - p_i)\\frac{N(s)}{D(s)}\\right|_{s=p_i}" },
    { label: "ریشه تکرارشونده m بار", tex: "A_{m-k} = \\frac{1}{k!}\\left.\\frac{d^k}{ds^k}\\left[(s-p)^m \\frac{N(s)}{D(s)}\\right]\\right|_{s=p}" }
  ],
  inputs: [
    { id: "num", label: "صورت N", type: "expr", default: "s + 3" },
    { id: "den", label: "مخرج D", type: "expr", default: "(s + 1)(s + 2)", help: "مخرج را می‌توان به صورت تجزیه‌شده یا بسط‌یافته نوشت، مانند s^3 + 2s^2 + s." },
    { id: "v", label: "متغیر", type: "text", default: "s" }
  ],
  example: { values: { num: "s + 3", den: "(s + 1)(s + 2)", v: "s" }, expect: ["2/(s + 1)", "- 1/(s + 2)"], note: "مثال: $\\frac{s+3}{(s+1)(s+2)} = \\frac{2}{s+1} - \\frac{1}{s+2}$." },
  invalid: { values: { num: "1", den: "5", v: "s" } },
  related: ["laplace", "integral", "polynomial-roots", "transfer-function"]
};

function linText(v, r) {
  return r === 0 ? v : `${v} ${r < 0 ? "+" : "-"} ${nice(Math.abs(r), 8)}`;
}

function linTex(v, r) {
  return r === 0 ? v : `${v} ${r < 0 ? "+" : "-"} ${niceTex(Math.abs(r), 8)}`;
}

export function termsOf(dec, v) {
  const tex = [], text = [];
  if (!(dec.poly.length === 1 && dec.poly[0] === 0)) {
    tex.push(ptex(dec.poly, v));
    text.push(ptext(dec.poly, v));
  }
  for (const t of realForm(dec)) {
    if (t.kind === "real") {
      if (Math.abs(t.A) < 1e-12) continue;
      const den = t.power === 1 ? `${linTex(v, t.r)}` : `\\left(${linTex(v, t.r)}\\right)^{${t.power}}`;
      tex.push(`\\frac{${niceTex(t.A, 8)}}{${den}}`);
      text.push(`${nice(t.A, 8)}/${t.r === 0 ? v : `(${linText(v, t.r)})`}${t.power > 1 ? `^${t.power}` : ""}`);
    } else if (t.kind === "quad") {
      const numT = ptex([t.Cc, t.B], v);
      const denT = ptex([t.q, t.p, 1], v);
      tex.push(`\\frac{${numT}}{${denT}}`);
      text.push(`(${ptext([t.Cc, t.B], v)})/(${ptext([t.q, t.p, 1], v)})`);
    } else {
      tex.push(`\\frac{${ctex(t.K, 6)}}{(${v} - (${ctex(t.root, 6)}))^{${t.power}}} + \\text{c.c.}`);
      text.push(`complex term`);
    }
  }
  return { tex, text };
}

function joinTex(parts) {
  return parts.map((p, i) => (i === 0 ? p : p.startsWith("\\frac{-") ? ` - \\frac{${p.slice(7)}` : ` + ${p}`)).join("");
}

function joinText(parts) {
  return parts.map((p, i) => (i === 0 ? p : p.startsWith("-") ? ` - ${p.slice(1)}` : ` + ${p}`)).join("");
}

export function readRational(input, v, numKey = "num", denKey = "den") {
  let N, D;
  try {
    N = toRational(parse(str(input, numKey, "صورت"), [v]), v);
  } catch (e) {
    if (e instanceof Unsupported) fail("صورت باید چندجمله‌ای باشد (بدون توابعی مانند sin یا e^s).", numKey);
    fail(`صورت: ${e.message}`, numKey);
  }
  try {
    D = toRational(parse(str(input, denKey, "مخرج"), [v]), v);
  } catch (e) {
    if (e instanceof Unsupported) fail("مخرج باید چندجمله‌ای باشد.", denKey);
    fail(`مخرج: ${e.message}`, denKey);
  }
  const num = trim(mulPoly(N.num, D.den));
  const den = trim(mulPoly(D.num, N.den));
  if (den.length === 1 && den[0] === 0) fail("مخرج برابر صفر است.", denKey);
  return { num, den };
}

function mulPoly(a, b) {
  const r = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
  return r;
}

export function solve(input) {
  const v = readVar(input);
  const { num, den } = readRational(input, v);
  if (degree(den) < 1) fail("مخرج باید شامل متغیر باشد (درجه 1 یا بیشتر).", "den");
  if (degree(den) > 10) fail("بیشترین درجه مخرج 10 است.", "den");
  const dec = decompose(num, den);
  const steps = [{ text: "تابع کسری:", tex: `F(${v}) = \\frac{${ptex(num, v)}}{${ptex(den, v)}}` }];
  if (!(dec.poly.length === 1 && dec.poly[0] === 0)) {
    steps.push({ text: "درجه صورت بزرگ‌تر یا مساوی درجه مخرج است، پس ابتدا تقسیم بلند چندجمله‌ای انجام می‌دهیم:", tex: `F(${v}) = ${ptex(dec.poly, v)} + \\frac{${ptex(dec.remainder, v)}}{${ptex(dec.den, v)}}` });
  }
  steps.push({ text: "مخرج را با یافتن ریشه‌هایش تجزیه می‌کنیم:", tex: `D(${v}) = ${factorTex(den, v)}` });
  for (const { root, mult } of dec.roots) {
    if (root.im < 0) continue;
    const terms = dec.terms.filter((t) => t.root === root || (cabs(csub(t.root, root)) < 1e-12));
    if (mult === 1) {
      const A = terms[0].coef;
      steps.push({ text: `ریشه $${v} = ${ctex(root, 8)}$ ساده است؛ با روش پوشش عامل آن را از مخرج حذف کرده و جایگذاری می‌کنیم.`, tex: `A = \\left.(${v} - (${ctex(root, 6)}))F(${v})\\right|_{${v} = ${ctex(root, 6)}} = ${ctex(A, 8)}` });
    } else {
      steps.push(`ریشه $${v} = ${ctex(root, 8)}$ به تعداد ${mult} بار تکرار شده، پس به ${mult} ضریب با فرمول مشتق‌ها نیاز داریم: ${terms.map((t) => `$A_{${t.power}} = ${ctex(t.coef, 8)}$`).join("، ")}.`);
    }
  }
  if (dec.roots.some((r) => r.root.im !== 0)) steps.push("هر دو ریشه مختلط مزدوج را در یک کسر با مخرج درجه دوم حقیقی ترکیب می‌کنیم.");
  const { tex, text } = termsOf(dec, v);
  if (text.includes("complex term")) fail("ریشه‌های مختلط تکراری در صورت حقیقی فعلاً پشتیبانی نمی‌شوند.", "den");
  const resultTex = joinTex(tex);
  const resultText = joinText(text);
  let maxErr = 0;
  for (const z of [C(0.371, 0.2), C(-1.7, 0.9), C(2.3, -0.4)]) {
    const a = evalDecomposition(dec, z);
    let n0 = C(0), d0 = C(0);
    for (let i = num.length - 1; i >= 0; i--) n0 = { re: n0.re * z.re - n0.im * z.im + num[i], im: n0.re * z.im + n0.im * z.re };
    for (let i = den.length - 1; i >= 0; i--) d0 = { re: d0.re * z.re - d0.im * z.im + den[i], im: d0.re * z.im + d0.im * z.re };
    const q = cdiv(n0, d0);
    maxErr = Math.max(maxErr, cabs(csub(a, q)) / Math.max(1, cabs(q)));
  }
  steps.push(`برای بررسی، کسرهای حاصل را جمع کرده و با تابع اصلی در نقاط تصادفی مقایسه کردیم؛ بیشترین اختلاف نسبی ${fmt(maxErr, 2)} بود.`);
  return {
    results: [{ label: "تفکیک به کسرهای جزئی", tex: `F(${v}) = ${resultTex}`, text: resultText }],
    steps, copy: `F(${v}) = ${resultText}`
  };
}
