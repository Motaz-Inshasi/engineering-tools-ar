import { str, fail } from "../core/validate.js";
import { parse, sub, variables } from "../core/parser.js";
import { toRational, toDescending, Unsupported, degree as pdeg } from "../core/polynomial.js";
import { parseNumber, normalizeDigits } from "../core/format.js";
import { C, cabs, ctex, cfmt } from "../core/complex.js";
import { roots, cleanRoot, fromDescending, pevalC, pdivmod, trim, toTex, factorTex, peval, groupRoots } from "../core/polynomial.js";
import { niceTex, nice, fmt } from "../core/format.js";
import { sampleFunction } from "../core/numeric.js";

export const meta = {
  description: "ڈگری 20 تک کسی بھی حقیقی اور کمپلیکس پولی نومیل کے تمام جذر تلاش کریں: جیسے x^7 − x^5 لکھیں، یا فیکٹرڈ شکل، یا مساوات کی صورت میں، ساتھ ناطق جذر کی جانچ، سنتھیٹک ڈویژن، تصدیق اور فیکٹرائزیشن۔",
  keywords: ["پولی نومیل کے جذر", "پولی نومیل", "polynomial roots", "مکعبی مساوات", "سنتھیٹک ڈویژن", "فیکٹرائزیشن", "ناطق جذر"],
  formulas: [
    { label: "ناطق جذر کی جانچ", tex: "a_n x^n + \\cdots + a_0 = 0,\\quad x = \\frac{p}{q},\\; p \\mid a_0,\\; q \\mid a_n" },
    { label: "تمام جذروں کے لیے Aberth عددی طریقہ", tex: "z_k \\leftarrow z_k - \\frac{p/p'}{1 - \\frac{p}{p'}\\sum_{j\\ne k}\\frac{1}{z_k - z_j}}" }
  ],
  inputs: [
    { id: "c", label: "پولی نومیل یا مساوات", type: "expr", default: "x^3 - 6x^2 + 11x - 6", help: "کسی بھی ترتیب میں لکھیں: x^7 - x^5، یا (x-1)(x+2)^3، یا مساوات جیسے 2x^3 = 8x۔ آپ صرف سب سے بڑی قوت سے شروع ہونے والے کوئفیشنٹس بھی لکھ سکتے ہیں، جیسے 1 -6 11 -6۔", wide: true }
  ],
  example: { values: { c: "x^3 - 6x^2 + 11x - 6" }, expect: ["x = 1", "x = 2", "x = 3"], note: "مثال: $x^3 - 6x^2 + 11x - 6 = 0$۔" },
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

const MAX_DEG = 20;

export function readPolynomial(input) {
  const raw = normalizeDigits(str(input, "c", "پولی نومیل")).trim();
  const tokens = raw.split(/[\s,،;؛]+/).filter(Boolean);
  if (tokens.length && tokens.every((t) => isFinite(parseNumber(t)))) {
    if (tokens.length < 2) fail("کم از کم درجہ 1 کا پولی نومیل درج کریں، جیسے x - 3 یا کوئفیشنٹس 1 -3۔", "c");
    return { desc: tokens.map(parseNumber), v: "x", mode: "coeffs" };
  }
  const sides = raw.split("=");
  if (sides.length > 2) fail("مساوات میں ایک سے زیادہ = کی علامت ہے۔", "c");
  let left, right;
  try {
    left = parse(sides[0]);
    right = sides.length === 2 ? parse(sides[1]) : null;
  } catch (e) {
    if (e.name === "InputError") fail(e.message, "c");
    throw e;
  }
  const vars = new Set([...variables(left), ...(right ? variables(right) : [])]);
  if (vars.size > 1) fail(`پولی نومیل میں صرف ایک متغیر ہونا چاہیے، جبکہ ملا: ${[...vars].join("، ")}۔`, "c");
  if (vars.size === 0) fail("اظہار میں کوئی متغیر نہیں ہے۔ x^2 - 4 جیسا پولی نومیل لکھیں۔", "c");
  const v = [...vars][0];
  let r;
  try {
    r = toRational(right ? sub(left, right) : left, v);
  } catch (e) {
    if (e instanceof Unsupported) fail("یہ پولی نومیل نہیں ہے: صرف جمع، تفریق، ضرب اور مثبت صحیح قوتیں اجازت یافتہ ہیں (sin جیسے فنکشن یا کسری قوتیں نہیں)۔", "c");
    if (e.name === "InputError") fail(e.message, "c");
    throw e;
  }
  if (pdeg(r.den) > 0) fail(`یہ پولی نومیل نہیں ہے کیونکہ ${v} مخرج میں ظاہر ہوتا ہے۔ پہلے دونوں اطراف کو مخرج سے ضرب دیں۔`, "c");
  const scale = Math.max(...r.num.map(Math.abs));
  const asc = r.num.map((c) => (Math.abs(c) < 1e-14 * scale ? 0 : c / r.den[0]));
  return { desc: toDescending(asc), v, mode: "expr" };
}

export function solve(input) {
  const read = readPolynomial(input);
  let desc = read.desc;
  const v = read.v;
  while (desc.length && desc[0] === 0) desc = desc.slice(1);
  if (desc.length < 2) fail("پولی نومیل کا درجہ کم از کم 1 ہونا چاہیے (سب سے بڑا کوئفیشنٹ صفر نہ ہو)۔", "c");
  if (desc.length - 1 > MAX_DEG) fail(`زیادہ سے زیادہ درجہ ${MAX_DEG} ہے۔`, "c");
  const p = fromDescending(desc);
  const n = desc.length - 1;
  const steps = [{ text: `درجہ ${n} کا پولی نومیل:`, tex: `p(${v}) = ${toTex(p, v)}` }];
  let all = [];
  let rest = p;
  const rr = rationalRoots(desc);
  if (rr && n > 2 && rr.found.length) {
    steps.push(`کوئفیشنٹس صحیح اعداد ہیں، اس لیے ہم ممکنہ ناطق جذر $\\pm p/q$ آزماتے ہیں (${rr.candidates ?? 0} امیدوار)۔`);
    for (const r of rr.found) steps.push(`جذر $${v} = ${niceTex(r)}$ مطمئن کرتا ہے $p(${niceTex(r)}) = 0$، اس لیے ہم سنتھیٹک ڈویژن سے $(${v} ${r < 0 ? "+" : "-"} ${niceTex(Math.abs(r))})$ پر تقسیم کرتے ہیں۔`);
    all = rr.found.map((r) => C(r));
    rest = rr.rest;
    if (rest.length > 1) steps.push({ text: "باقی پولی نومیل:", tex: toTex(rest, v) });
  }
  const dr = trim(rest).length - 1;
  if (dr === 1) {
    all.push(C(-rest[0] / rest[1]));
    steps.push(`باقی خطی ہے: $${v} = ${niceTex(-rest[0] / rest[1])}$۔`);
  } else if (dr === 2) {
    const [c, b, a] = rest;
    const D = b * b - 4 * a * c;
    steps.push({ text: "باقی تربیعی ہے، ہم قانونِ عام استعمال کرتے ہیں:", tex: `\\Delta = b^2 - 4ac = ${niceTex(D, 8)},\\quad ${v} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}` });
    all.push(...roots(rest));
  } else if (dr > 2) {
    steps.push(`باقی جذر (${dr}) ہم Aberth تکراری طریقے سے اکٹھے نکالتے ہیں، پھر ہر ایک کو نیوٹن کے طریقے سے بہتر کرتے ہیں۔`);
    all.push(...roots(rest));
  }
  all = all.map(cleanRoot).sort((a, b) => a.re - b.re || a.im - b.im);
  const groups = groupRoots(all, 1e-6);
  const maxRes = Math.max(...all.map((r) => cabs(pevalC(p, r))));
  steps.push(`تصدیق کے لیے ہم نے ہر جذر کو $p(${v})$ میں رکھا، سب سے بڑی باقی ${fmt(maxRes, 2)} تھی۔`);
  const fact = factorTex(p, v);
  steps.push({ text: "فیکٹرائزیشن (تربیعی عوامل کمپلیکس کنجوگیٹ جذروں سے مطابقت رکھتے ہیں):", tex: `p(${v}) = ${fact}` });
  const rows = groups.map((g) => [{ tex: `${v} = ${ctex(g.root, 10)}` }, String(g.mult), g.root.im === 0 ? "حقیقی" : "کمپلیکس"]);
  const text = groups.map((g) => `${v} = ${cfmt(g.root, 10)}${g.mult > 1 ? ` (مکرر ${g.mult})` : ""}`).join("، ");
  const real = groups.filter((g) => g.root.im === 0).map((g) => g.root.re);
  const lo = Math.min(-2, ...real) - 1, hi = Math.max(2, ...real) + 1;
  return {
    results: [{ label: "جذور", value: text }, { label: "مختلف حقیقی جذروں کی تعداد", value: real.length }],
    blocks: [
      { type: "table", head: ["جذر", "تکرار", "قسم"], rows },
      { type: "plot", title: "پولی نومیل کا گراف", xLabel: v, yLabel: `p(${v})`, series: [{ name: `p(${v})`, points: sampleFunction((x) => peval(p, x), lo, hi, 400) }, { name: "حقیقی جذر", points: real.map((r) => [r, 0]), marker: "o" }] }
    ],
    steps, copy: groups.map((g) => `${v} = ${cfmt(g.root, 10)}`).join("\n")
  };
}
