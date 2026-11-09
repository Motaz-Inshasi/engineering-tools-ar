import { numList, fail } from "../core/validate.js";
import { C, cabs, ctex, cfmt } from "../core/complex.js";
import { roots, cleanRoot, fromDescending, pevalC, pdivmod, trim, toTex, factorTex, peval, groupRoots } from "../core/polynomial.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "أوجد كل جذور كثيرة الحدود الحقيقية والمركبة حتى الدرجة 10: اختبار الجذور النسبية مع القسمة التركيبية، ثم القانون العام أو طريقة عددية دقيقة، مع التحقق والتحليل إلى عوامل.",
  keywords: ["جذور كثيرة الحدود", "كثيرة حدود", "polynomial roots", "معادلة تكعيبية", "قسمة تركيبية", "تحليل إلى عوامل", "جذور نسبية"],
  formulas: [
    { label: "اختبار الجذور النسبية", tex: "a_n x^n + \\cdots + a_0 = 0,\\quad x = \\frac{p}{q},\\; p \\mid a_0,\\; q \\mid a_n" },
    { label: "طريقة أبيرث العددية لجميع الجذور معاً", tex: "z_k \\leftarrow z_k - \\frac{p/p'}{1 - \\frac{p}{p'}\\sum_{j\\ne k}\\frac{1}{z_k - z_j}}" }
  ],
  inputs: [
    { id: "c", label: "المعاملات من الأس الأعلى إلى الثابت", type: "text", default: "1 -6 11 -6", help: "مثال: x³ − 6x² + 11x − 6 تُكتب 1 -6 11 -6. اكتب 0 للحدود الناقصة.", wide: true }
  ],
  example: { values: { c: "1 -6 11 -6" }, expect: ["x = 1", "x = 2", "x = 3"], note: "مثال: $x^3 - 6x^2 + 11x - 6 = 0$." },
  invalid: { values: { c: "0 0 5" } },
  related: ["quadratic", "partial-fractions", "transfer-function", "root-finding"]
};

function divisors(n) {
  n = Math.abs(n);
  const out = [];
  for (let i = 1; i * i <= n; i++) if (n % i === 0) { out.push(i); if (i * i !== n) out.push(n / i); }
  return out.sort((a, b) => a - b);
}

export function rationalRoots(desc) {
  if (!desc.every((c) => Number.isInteger(c)) || desc.some((c) => Math.abs(c) > 1e6)) return null;
  let p = fromDescending(desc);
  const found = [];
  while (p.length > 1 && p[0] === 0) { found.push(0); p = p.slice(1); }
  if (p.length <= 1) return { found, rest: p };
  const a0 = p[0], an = p[p.length - 1];
  const cands = [];
  for (const q of divisors(an)) for (const pp of divisors(a0)) for (const s of [1, -1]) {
    const v = (s * pp) / q;
    if (!cands.some((c) => Math.abs(c - v) < 1e-12)) cands.push(v);
  }
  cands.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
  let changed = true;
  while (changed && p.length > 1) {
    changed = false;
    for (const r of cands) {
      const val = peval(p, r);
      if (Math.abs(val) < 1e-9 * Math.max(1, ...p.map(Math.abs))) {
        found.push(r);
        p = pdivmod(p, [-r, 1]).q;
        changed = true;
        break;
      }
    }
  }
  return { found, rest: p, candidates: cands.length };
}

export function solve(input) {
  let desc = numList(input, "c", "المعاملات", { min: 2, max: 11 });
  while (desc.length && desc[0] === 0) desc = desc.slice(1);
  if (desc.length < 2) fail("كثيرة الحدود يجب أن تكون من الدرجة الأولى على الأقل (المعامل الأعلى غير صفري).", "c");
  const p = fromDescending(desc);
  const n = desc.length - 1;
  const steps = [{ text: `كثيرة الحدود من الدرجة ${n}:`, tex: `p(x) = ${toTex(p)}` }];
  let all = [];
  let rest = p;
  const rr = rationalRoots(desc);
  if (rr && n > 2 && rr.found.length) {
    steps.push(`المعاملات أعداد صحيحة، فنجرّب الجذور النسبية الممكنة $\\pm p/q$ (${rr.candidates ?? 0} احتمالاً).`);
    for (const r of rr.found) steps.push(`الجذر $x = ${niceTex(r)}$ يحقق $p(${niceTex(r)}) = 0$، فنقسم على $(x ${r < 0 ? "+" : "-"} ${niceTex(Math.abs(r))})$ بالقسمة التركيبية.`);
    all = rr.found.map((r) => C(r));
    rest = rr.rest;
    if (rest.length > 1) steps.push({ text: "كثيرة الحدود المتبقية:", tex: toTex(rest) });
  }
  const dr = trim(rest).length - 1;
  if (dr === 1) {
    all.push(C(-rest[0] / rest[1]));
    steps.push(`المتبقي خطي: $x = ${niceTex(-rest[0] / rest[1])}$.`);
  } else if (dr === 2) {
    const [c, b, a] = rest;
    const D = b * b - 4 * a * c;
    steps.push({ text: "المتبقي تربيعي، نستخدم القانون العام:", tex: `\\Delta = b^2 - 4ac = ${niceTex(D, 8)},\\quad x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}` });
    all.push(...roots(rest));
  } else if (dr > 2) {
    steps.push(`نحسب الجذور المتبقية (${dr}) معاً بطريقة أبيرث التكرارية ثم نحسّن كلاً منها بطريقة نيوتن.`);
    all.push(...roots(rest));
  }
  all = all.map(cleanRoot).sort((a, b) => a.re - b.re || a.im - b.im);
  const groups = groupRoots(all, 1e-6);
  const maxRes = Math.max(...all.map((r) => cabs(pevalC(p, r))));
  steps.push(`للتحقق عوّضنا كل جذر في $p(x)$، فكان أكبر باقٍ ${fmt(maxRes, 2)}.`);
  const fact = factorTex(p, "x");
  steps.push({ text: "التحليل إلى عوامل (العوامل التربيعية تقابل الجذور المركبة المترافقة):", tex: `p(x) = ${fact}` });
  const rows = groups.map((g) => [{ tex: `x = ${ctex(g.root, 10)}` }, String(g.mult), g.root.im === 0 ? "حقيقي" : "مركب"]);
  const text = groups.map((g) => `x = ${cfmt(g.root, 10)}${g.mult > 1 ? ` (مكرر ${g.mult})` : ""}`).join("، ");
  const real = groups.filter((g) => g.root.im === 0).map((g) => g.root.re);
  const lo = Math.min(-2, ...real) - 1, hi = Math.max(2, ...real) + 1;
  return {
    results: [{ label: "الجذور", value: text }, { label: "عدد الجذور الحقيقية المختلفة", value: real.length }],
    blocks: [
      { type: "table", head: ["الجذر", "التكرار", "النوع"], rows },
      { type: "plot", title: "منحنى كثيرة الحدود", xLabel: "x", yLabel: "p(x)", series: [{ name: "p(x)", points: sampleFunction((x) => peval(p, x), lo, hi, 400) }, { name: "الجذور الحقيقية", points: real.map((r) => [r, 0]), marker: "o" }] }
    ],
    steps, copy: groups.map((g) => `x = ${cfmt(g.root, 10)}`).join("\n")
  };
}
