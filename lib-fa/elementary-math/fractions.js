import { fail, choice, str } from "../core/validate.js";

const MAX_DIGITS = 50;
const SYM = { add: "+", sub: "−", mul: "×", div: "÷" };
const KIND = { terminating: "پایان‌پذیر", repeating: "متناوب", truncated: "در 50 رقم تکرار نمی‌شود" };
const ABS = (x) => (x < 0n ? -x : x);
const wrap = (x) => (x < 0n ? `(${x})` : `${x}`);

export const meta = {
  description: "دو کسر را جمع، تفریق، ضرب یا تقسیم کنید، یا آن‌ها را مقایسه کنید، یا یک کسر را ساده کنید. کسر، عدد کسری، عدد صحیح و عدد اعشاری را می‌پذیرد و نتیجه را به‌صورت کسر ساده، عدد کسری و اعشاری همراه با مراحل حل نشان می‌دهد.",
  keywords: ["کسرها", "fractions", "عدد کسری", "ساده‌سازی کسر", "مخرج مشترک", "کسر اعشاری متناوب", "جمع کسرها", "ضرب کسرها"],
  formulas: [
    { label: "جمع و تفریق کسرها", tex: "\\frac{a}{b} \\pm \\frac{c}{d} = \\frac{ad \\pm bc}{bd}" },
    { label: "ضرب و تقسیم کسرها", tex: "\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{ac}{bd},\\qquad \\frac{a}{b} \\div \\frac{c}{d} = \\frac{ad}{bc}" }
  ],
  inputs: [
    { id: "a", label: "کسر اول a", type: "text", default: "3/4", help: "نمونه‌های پذیرفته‌شده: 3/4، -2 1/3 (عدد کسری)، 5 (عدد صحیح)، 0.75 (اعشاری)." },
    { id: "op", label: "عملیات", type: "select", default: "add", options: [["add", "+ جمع"], ["sub", "− تفریق"], ["mul", "× ضرب"], ["div", "÷ تقسیم"], ["cmp", "مقایسه"], ["simplify", "ساده‌سازی فقط کسر اول"]] },
    { id: "b", label: "کسر دوم b", type: "text", default: "1/6", when: { op: ["add", "sub", "mul", "div", "cmp"] } }
  ],
  example: { values: { a: "3/4", op: "add", b: "1/6" }, expect: ["11/12", "0.91(6)"], note: "مثال: 3/4 + 1/6 = 11/12 = 0.91(6)." },
  invalid: { values: { a: "3/0", op: "add", b: "1/6" } },
  related: ["gcd-lcm", "percentage", "ratio-proportion", "significant-figures"]
};

function gcd(a, b) {
  let x = ABS(a);
  let y = ABS(b);
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}

function reduce(n, d) {
  const s = d < 0n ? -1n : 1n;
  const g = gcd(n, d);
  return { n: (s * n) / g, d: (s * d) / g };
}

function tf(n, d) {
  const sg = n < 0n ? "-" : "";
  const a = ABS(n);
  return d === 1n ? `${sg}${a}` : `${sg}\\frac{${a}}{${d}}`;
}

function fs(f) {
  return f.d === 1n ? `${f.n}` : `${f.n}/${f.d}`;
}

function mixed(f) {
  if (f.d === 1n) return `${f.n}`;
  const sg = f.n < 0n ? "-" : "";
  const a = ABS(f.n);
  const w = a / f.d;
  const r = a % f.d;
  if (w === 0n) return `${sg}${r}/${f.d}`;
  return `${sg}${w} ${r}/${f.d}`;
}

function decimal(n, d) {
  const sg = n < 0n ? "-" : "";
  const a = ABS(n);
  const q = a / d;
  let r = a % d;
  const head = `${sg}${q}`;
  if (r === 0n) return { text: head, tex: head, kind: "terminating" };
  const digits = [];
  const seen = new Map();
  let start = -1;
  while (r !== 0n) {
    if (seen.has(r)) {
      start = seen.get(r);
      break;
    }
    if (digits.length === MAX_DIGITS) break;
    seen.set(r, digits.length);
    r *= 10n;
    digits.push(String(r / d));
    r %= d;
  }
  if (start < 0 && r === 0n) {
    const body = digits.join("");
    return { text: `${head}.${body}`, tex: `${head}.${body}`, kind: "terminating" };
  }
  if (start < 0) {
    const body = digits.join("");
    return { text: `${head}.${body}…`, tex: `${head}.${body}\\ldots`, kind: "truncated" };
  }
  const pre = digits.slice(0, start).join("");
  const rep = digits.slice(start).join("");
  return { text: `${head}.${pre}(${rep})`, tex: `${head}.${pre}\\overline{${rep}}`, kind: "repeating" };
}

function finish(raw, n0, d0, lhs, mid) {
  const f = reduce(n0, d0);
  const parts = [lhs];
  if (mid) parts.push(mid);
  if (f.n !== n0 || f.d !== d0) parts.push(tf(f.n, f.d));
  return { n: f.n, d: f.d, raw, conv: parts.length > 1 ? parts.join(" = ") : null };
}

function parseFrac(input, key, label) {
  const raw = str(input, key, label).replace(/\s+/g, " ");
  let body = raw;
  let sign = 1n;
  if (body.startsWith("-") || body.startsWith("+")) {
    sign = body.startsWith("-") ? -1n : 1n;
    body = body.slice(1).trim();
  }
  const sg = sign < 0n ? "-" : "";
  let m = body.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const w = BigInt(m[1]);
    const p = BigInt(m[2]);
    const q = BigInt(m[3]);
    if (q === 0n) fail(`مخرج ${label} نمی‌تواند صفر باشد.`, key);
    if (p >= q) fail(`در ${label}، صورت عدد کسری باید از مخرج کوچک‌تر باشد.`, key);
    return finish(raw, sign * (w * q + p), q, `${sg}${w}\\frac{${p}}{${q}}`, `${sg}\\frac{${w * q + p}}{${q}}`);
  }
  m = body.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const p = BigInt(m[1]);
    const q = BigInt(m[2]);
    if (q === 0n) fail(`مخرج ${label} نمی‌تواند صفر باشد.`, key);
    return finish(raw, sign * p, q, `${sg}\\frac{${p}}{${q}}`, null);
  }
  m = body.match(/^(\d+)$/);
  if (m) {
    const v = BigInt(m[1]);
    return finish(raw, sign * v, 1n, `${sg}${v}`, null);
  }
  m = body.match(/^(\d*)\.(\d*)$/);
  if (m && m[1] + m[2] !== "") {
    const a = BigInt(m[1] + m[2]);
    const q = 10n ** BigInt(m[2].length);
    return finish(raw, sign * a, q, `${sg}${m[1] || "0"}.${m[2]}`, `${sg}\\frac{${a}}{${q}}`);
  }
  fail(`${label} را متوجه نشدم. از قالبی مانند 3/4 یا -2 1/3 یا 5 یا 0.75 استفاده کنید.`, key);
}

function lcmStep(a, b, L) {
  return {
    text: `کوچک‌ترین مضرب مشترک مخرج‌های ${a} و ${b}:`,
    tex: `\\operatorname{lcm}(${a},${b}) = \\frac{${a}\\cdot ${b}}{\\gcd(${a},${b})} = \\frac{${a * b}}{${gcd(a, b)}} = ${L}`
  };
}

function reduceStep(n, d) {
  const g = gcd(n, d);
  if (g === 1n) return null;
  return {
    text: `صورت و مخرج را بر بزرگ‌ترین مقسوم‌علیه مشترک ${g} تقسیم می‌کنیم:`,
    tex: `\\frac{${n}}{${d}} = \\frac{${n / g}}{${d / g}}`
  };
}

function output(R, steps, prefix) {
  const dec = decimal(R.n, R.d);
  if (R.d !== 1n) steps.push({ text: "کسر حاصل را با تقسیم طولانی به عدد اعشاری تبدیل می‌کنیم:", tex: `${tf(R.n, R.d)} = ${dec.tex}` });
  const out = {
    results: [
      { label: "کسر ساده", value: fs(R) },
      { label: "عدد کسری", value: mixed(R) },
      { label: "عدد اعشاری", value: dec.text },
      { label: "نوع عدد اعشاری", value: KIND[dec.kind] }
    ],
    steps,
    copy: `${prefix} = ${fs(R)}${R.d !== 1n ? ` = ${dec.text}` : ""}`
  };
  if (dec.kind === "truncated") out.blocks = [{ type: "note", text: "این کسر در 50 رقم تکرار نمی‌شود، بنابراین فقط 50 رقم اول نمایش داده شد." }];
  return out;
}

function compareOut(A, B, steps) {
  const L = lcm(A.d, B.d);
  const na = A.n * (L / A.d);
  const nb = B.n * (L / B.d);
  const rel = na > nb ? ">" : na < nb ? "<" : "=";
  steps.push(lcmStep(A.d, B.d, L));
  steps.push({ text: "هر دو کسر را به مخرج مشترک تبدیل می‌کنیم:", tex: `${tf(A.n, A.d)} = \\frac{${na}}{${L}},\\quad ${tf(B.n, B.d)} = \\frac{${nb}}{${L}}` });
  steps.push({ text: "صورت‌ها را مقایسه می‌کنیم:", tex: `${na} ${rel} ${nb}` });
  const da = decimal(A.n, A.d);
  const db = decimal(B.n, B.d);
  return {
    results: [
      { label: "نتیجهٔ مقایسه", value: `${fs(A)} ${rel} ${fs(B)}` },
      { label: "کسر اول به‌صورت اعشاری", value: da.text },
      { label: "کسر دوم به‌صورت اعشاری", value: db.text }
    ],
    steps,
    copy: `${fs(A)} ${rel} ${fs(B)} (${da.text} ${rel} ${db.text})`
  };
}

export function solve(input) {
  const op = choice(input, "op", "عملیات", ["add", "sub", "mul", "div", "cmp", "simplify"], "add");
  const A = parseFrac(input, "a", "کسر اول");
  const steps = [];
  if (A.conv) steps.push({ text: "کسر اول را به کسر تبدیل و ساده می‌کنیم:", tex: A.conv });
  if (op === "simplify") {
    steps.push({ text: "بزرگ‌ترین مقسوم‌علیه مشترک صورت و مخرج:", tex: `\\gcd(${ABS(A.n)},${A.d}) = ${gcd(A.n, A.d)}` });
    return output(A, steps, A.raw);
  }
  const B = parseFrac(input, "b", "کسر دوم");
  if (B.conv) steps.push({ text: "کسر دوم را به کسر تبدیل و ساده می‌کنیم:", tex: B.conv });
  if (op === "cmp") return compareOut(A, B, steps);
  if (op === "div" && B.n === 0n) fail("تقسیم بر صفر ممکن نیست: کسر دوم برابر صفر است.", "b");

  let un;
  let ud;
  if (op === "mul") {
    un = A.n * B.n;
    ud = A.d * B.d;
    steps.push({ text: "صورت‌ها را با هم و مخرج‌ها را با هم ضرب می‌کنیم:", tex: `${tf(A.n, A.d)} \\times ${tf(B.n, B.d)} = \\frac{${un}}{${ud}}` });
  } else if (op === "div") {
    const rn = B.n < 0n ? -B.d : B.d;
    const rd = ABS(B.n);
    un = A.n * rn;
    ud = A.d * rd;
    steps.push({ text: "کسر دوم را وارونه می‌کنیم و سپس ضرب می‌کنیم:", tex: `${tf(A.n, A.d)} \\div ${tf(B.n, B.d)} = ${tf(A.n, A.d)} \\times ${tf(rn, rd)} = \\frac{${un}}{${ud}}` });
  } else {
    const L = lcm(A.d, B.d);
    const na = A.n * (L / A.d);
    const nb = B.n * (L / B.d);
    un = op === "add" ? na + nb : na - nb;
    ud = L;
    steps.push(lcmStep(A.d, B.d, L));
    steps.push({ text: "هر کسر را به مخرج مشترک تبدیل می‌کنیم:", tex: `${tf(A.n, A.d)} = \\frac{${na}}{${L}},\\quad ${tf(B.n, B.d)} = \\frac{${nb}}{${L}}` });
    steps.push({ text: op === "add" ? "صورت‌ها را جمع می‌کنیم و مخرج را همان نگه می‌داریم:" : "صورت‌ها را تفریق می‌کنیم و مخرج را همان نگه می‌داریم:", tex: `\\frac{${na} ${op === "add" ? "+" : "-"} ${wrap(nb)}}{${L}} = \\frac{${un}}{${L}}` });
  }
  const R = reduce(un, ud);
  const rs = reduceStep(un, ud);
  if (rs) steps.push(rs);
  return output(R, steps, `${A.raw} ${SYM[op]} ${B.raw}`);
}
