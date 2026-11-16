import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { normalizeDigits } from "../core/format.js";

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const meta = {
  description: "2 سے 36 تک کسی بھی دو بیسز کے درمیان اعداد تبدیل کریں (بائنری، آکٹل، ڈیسیمل، ہیکسا ڈیسیمل…)، کسروں سمیت، بار بار تقسیم، بار بار ضرب اور پوزیشنل پھیلاؤ کے مرحلہ وار طریقے کے ساتھ۔",
  keywords: ["عددی نظاموں کی تبدیلی", "بائنری", "ڈیسیمل", "ہیکسا ڈیسیمل", "آکٹل", "binary", "hex", "decimal", "octal", "base conversion", "بیس"],
  formulas: [
    { label: "کسی بھی بیس سے ڈیسیمل (پوزیشنل پھیلاؤ)", tex: "(d_k \\dots d_1 d_0 . d_{-1}\\dots)_b = \\sum_i d_i\\, b^{i}" },
    { label: "ڈیسیمل سے: صحیح حصے کی بار بار تقسیم اور کسر کی بار بار ضرب", tex: "N = q_0 b + r_0,\\; q_0 = q_1 b + r_1,\\dots \\qquad f \\cdot b = d_{-1} + f_1,\\dots" }
  ],
  inputs: [
    { id: "x", label: "عدد", type: "text", default: "1011.101", help: "9 سے اوپر کے ہندسوں کے لیے A–Z حروف استعمال کریں۔ منفی علامت اور اعشاری نقطہ کی اجازت ہے۔" },
    { id: "from", label: "ابتدائی بیس", type: "number", default: "2" },
    { id: "to", label: "منزلِ مقصود بیس", type: "number", default: "10" }
  ],
  example: { values: { x: "2AF", from: "16", to: "2" }, expect: ["1010101111"], note: "مثال: $(2AF)_{16}$ کو بائنری میں تبدیل کریں۔" },
  invalid: { values: { x: "129", from: "2", to: "10" } },
  related: ["binary-twos-complement", "truth-table", "logic-gates"]
};

export function parseInBase(s, base) {
  let t = normalizeDigits(s).toUpperCase().replace(/[\s_]/g, "");
  let neg = false;
  if (t.startsWith("-")) { neg = true; t = t.slice(1); }
  else if (t.startsWith("+")) t = t.slice(1);
  if (!/^[0-9A-Z]*\.?[0-9A-Z]*$/.test(t) || t === "" || t === ".") return null;
  const [ip, fp = ""] = t.split(".");
  let iv = 0n;
  const B = BigInt(base);
  for (const ch of ip) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { bad: ch };
    iv = iv * B + BigInt(d);
  }
  let fv = 0, w = 1 / base;
  for (const ch of fp) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { bad: ch };
    fv += d * w;
    w /= base;
  }
  return { neg, int: iv, frac: fv, ip, fp };
}

export function toBase(intPart, frac, base, maxFrac = 20) {
  const B = BigInt(base);
  let s = intPart === 0n ? "0" : "";
  let q = intPart;
  const divs = [];
  while (q > 0n) {
    const r = q % B;
    divs.push([q, q / B, Number(r)]);
    s = DIGITS[Number(r)] + s;
    q = q / B;
  }
  let fs = "";
  const muls = [];
  let f = frac;
  for (let i = 0; i < maxFrac && f > 0; i++) {
    const p = f * base;
    const d = Math.floor(p + 1e-12);
    muls.push([f, p, d]);
    fs += DIGITS[Math.min(d, base - 1)];
    f = p - d;
    if (f < 1e-12) f = 0;
  }
  return { str: fs ? `${s}.${fs}` : s, divs, muls, exact: f === 0 };
}

export function convert(x, from, to) {
  const p = parseInBase(x, from);
  if (!p || p.bad) return null;
  const r = toBase(p.int, p.frac, to);
  return (p.neg && (p.int !== 0n || p.frac !== 0) ? "-" : "") + r.str;
}

export function solve(input) {
  const s = str(input, "x", "عدد");
  const from = num(input, "from", "ابتدائی بیس", { integer: true, min: 2, max: 36 });
  const to = num(input, "to", "ہدف بیس", { integer: true, min: 2, max: 36 });
  const p = parseInBase(s, from);
  if (!p) fail("عدد کی شکل درست نہیں ہے۔", "x");
  if (p.bad) fail(`ہندسہ “${p.bad}” بیس ${from} میں اجازت یافتہ نہیں ہے (اجازت شدہ حد 0 سے ${DIGITS[from - 1]} تک)۔`, "x");
  const sign = p.neg && (p.int !== 0n || p.frac !== 0) ? "-" : "";
  const steps = [];
  const decStr = p.int.toString() + (p.frac ? (p.frac.toString().slice(1, 22)) : "");
  if (from !== 10) {
    const digits = (p.ip + p.fp).split("");
    const terms = digits.map((ch, i) => {
      const pos = p.ip.length - 1 - i;
      return `${DIGITS.indexOf(ch)} \\times ${from}^{${pos}}`;
    }).slice(0, 24);
    steps.push({ text: `ہم پوزیشنل پھیلاؤ سے ڈیسیمل میں بدلتے ہیں (ہر ہندسہ بیس کو اس کی پوزیشن کی قوت تک ضرب دیا جاتا ہے):`, tex: `${terms.join(" + ")}${digits.length > 24 ? " + \\cdots" : ""} = ${sign}${decStr}` });
  } else steps.push(`عدد پہلے ہی ڈیسیمل میں ہے: ${sign}${decStr}۔`);
  const r = toBase(p.int, p.frac, to);
  const blocks = [];
  if (to !== 10) {
    if (r.divs.length) {
      steps.push(`ہم صحیح حصے کو بیس ${to} میں بدلتے ہیں، ${to} سے بار بار تقسیم کر کے اور باقی نیچے سے اوپر لے کر (جدول دیکھیں)۔`);
      const rows = r.divs.slice(0, 64).map(([q, qq, rem]) => [q.toString(), qq.toString(), `${rem} → ${DIGITS[rem]}`]);
      blocks.push({ type: "table", caption: "صحیح حصے کی بار بار تقسیم", head: ["عدد", `÷ ${to} = خارج قسمت`, "باقی"], rows });
    }
    if (r.muls.length) {
      steps.push(`ہم کسری حصے کو ${to} سے بار بار ضرب دے کر بدلتے ہیں، ہر بار صحیح حصہ اوپر سے نیچے لیتے ہوئے۔`);
      blocks.push({ type: "table", caption: "کسری حصے کی بار بار ضرب", head: ["کسر", `× ${to}`, "ہندسہ"], rows: r.muls.map(([f, pr, d]) => [String(Number(f.toPrecision(12))), String(Number(pr.toPrecision(12))), DIGITS[d]]) });
      if (!r.exact) blocks.push({ type: "note", tone: "warn", text: `کسر بیس ${to} میں ختم نہیں ہوتی، اس لیے ہم اعشاری نقطے کے بعد بیس ہندسوں پر رک گئے۔` });
    }
  }
  const out = sign + r.str;
  steps.push(`نتیجہ: (${s})${from} = (${out})${to}`);
  const all = [2, 8, 10, 16].map((b) => ({ label: `بیس ${b}`, value: sign + toBase(p.int, p.frac, b).str }));
  return {
    results: [{ label: `بیس ${to} میں نتیجہ`, value: out, text: out }, ...all],
    blocks, steps, copy: out
  };
}
