import { str, fail } from "../core/validate.js";
import { parse } from "../core/parser.js";
import { toRational, Unsupported, degree, toTex as ptex, toText as ptext, factorTex, trim } from "../core/polynomial.js";
import { decompose, realForm, evalDecomposition } from "../core/partial.js";
import { C, cabs, cdiv, csub, ctex } from "../core/complex.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { readVar } from "../calculus/common.js";

export const meta = {
  description: "فكّك أي دالة كسرية إلى كسور جزئية: جذور بسيطة بطريقة الإخفاء (cover-up)، وجذور مكررة، وعوامل تربيعية للجذور المركبة، مع القسمة المطوّلة إذا كانت الدالة غير فعلية.",
  keywords: ["كسور جزئية", "partial fractions", "تفكيك", "كسر جزئي", "cover-up", "هيفيسايد", "دالة كسرية"],
  formulas: [
    { label: "جذر بسيط (طريقة الإخفاء لهيفيسايد)", tex: "\\frac{N(s)}{D(s)} = \\sum \\frac{A_i}{s - p_i},\\quad A_i = \\left.(s - p_i)\\frac{N(s)}{D(s)}\\right|_{s=p_i}" },
    { label: "جذر مكرر m مرة", tex: "A_{m-k} = \\frac{1}{k!}\\left.\\frac{d^k}{ds^k}\\left[(s-p)^m \\frac{N(s)}{D(s)}\\right]\\right|_{s=p}" }
  ],
  inputs: [
    { id: "num", label: "البسط N", type: "expr", default: "s + 3" },
    { id: "den", label: "المقام D", type: "expr", default: "(s + 1)(s + 2)", help: "يمكن كتابة المقام محللاً أو مفكوكاً، مثل s^3 + 2s^2 + s." },
    { id: "v", label: "المتغير", type: "text", default: "s" }
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
    N = toRational(parse(str(input, numKey, "البسط"), [v]), v);
  } catch (e) {
    if (e instanceof Unsupported) fail("البسط يجب أن يكون كثيرة حدود (بلا دوال مثل sin أو e^s).", numKey);
    fail(`البسط: ${e.message}`, numKey);
  }
  try {
    D = toRational(parse(str(input, denKey, "المقام"), [v]), v);
  } catch (e) {
    if (e instanceof Unsupported) fail("المقام يجب أن يكون كثيرة حدود.", denKey);
    fail(`المقام: ${e.message}`, denKey);
  }
  const num = trim(mulPoly(N.num, D.den));
  const den = trim(mulPoly(D.num, N.den));
  if (den.length === 1 && den[0] === 0) fail("المقام يساوي صفراً.", denKey);
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
  if (degree(den) < 1) fail("المقام يجب أن يحتوي المتغير (درجة 1 أو أكثر).", "den");
  if (degree(den) > 10) fail("أقصى درجة للمقام هي 10.", "den");
  const dec = decompose(num, den);
  const steps = [{ text: "الدالة الكسرية:", tex: `F(${v}) = \\frac{${ptex(num, v)}}{${ptex(den, v)}}` }];
  if (!(dec.poly.length === 1 && dec.poly[0] === 0)) {
    steps.push({ text: "درجة البسط ≥ درجة المقام، فنقسم قسمة مطوّلة أولاً:", tex: `F(${v}) = ${ptex(dec.poly, v)} + \\frac{${ptex(dec.remainder, v)}}{${ptex(dec.den, v)}}` });
  }
  steps.push({ text: "نحلل المقام بإيجاد جذوره:", tex: `D(${v}) = ${factorTex(den, v)}` });
  for (const { root, mult } of dec.roots) {
    if (root.im < 0) continue;
    const terms = dec.terms.filter((t) => t.root === root || (cabs(csub(t.root, root)) < 1e-12));
    if (mult === 1) {
      const A = terms[0].coef;
      steps.push({ text: `الجذر $${v} = ${ctex(root, 8)}$ بسيط، نستخدم الإخفاء: نحذف عامله من المقام ونعوّض.`, tex: `A = \\left.(${v} - (${ctex(root, 6)}))F(${v})\\right|_{${v} = ${ctex(root, 6)}} = ${ctex(A, 8)}` });
    } else {
      steps.push(`الجذر $${v} = ${ctex(root, 8)}$ مكرر ${mult} مرات، فنحتاج ${mult} معاملات بقانون المشتقات: ${terms.map((t) => `$A_{${t.power}} = ${ctex(t.coef, 8)}$`).join("، ")}.`);
    }
  }
  if (dec.roots.some((r) => r.root.im !== 0)) steps.push("نجمع كل كسرين لجذرين مركبين مترافقين في كسر واحد بمقام تربيعي حقيقي.");
  const { tex, text } = termsOf(dec, v);
  if (text.includes("complex term")) fail("الجذور المركبة المكررة غير مدعومة في الصيغة الحقيقية حالياً.", "den");
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
  steps.push(`للتحقق جمعنا الكسور الناتجة وقارناها بالدالة الأصلية عند نقاط عشوائية، فكان أكبر فرق نسبي ${fmt(maxErr, 2)}.`);
  return {
    results: [{ label: "التفكيك إلى كسور جزئية", tex: `F(${v}) = ${resultTex}`, text: resultText }],
    steps, copy: `F(${v}) = ${resultText}`
  };
}
