import { str, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { normalizeDigits } from "../core/format.js";

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const meta = {
  description: "2 ile 36 arasındaki herhangi iki sayı tabanı arasında (ikili, sekizli, onlu, on altılı…) kesirlerle birlikte sayı dönüşümü; tekrarlı bölme, tekrarlı çarpma ve basamak açılımı adımlarıyla.",
  keywords: ["Sayı tabanı dönüşümü", "ikili", "onlu", "on altılı", "sekizli", "binary", "hex", "decimal", "octal", "base conversion", "taban"],
  formulas: [
    { label: "Herhangi bir tabandan onluğa (basamak açılımı)", tex: "(d_k \\dots d_1 d_0 . d_{-1}\\dots)_b = \\sum_i d_i\\, b^{i}" },
    { label: "Onludan: tam kısım için tekrarlı bölme, kesir kısmı için tekrarlı çarpma", tex: "N = q_0 b + r_0,\\; q_0 = q_1 b + r_1,\\dots \\qquad f \\cdot b = d_{-1} + f_1,\\dots" }
  ],
  inputs: [
    { id: "x", label: "Sayı", type: "text", default: "1011.101", help: "9'un üstündeki rakamlar için A–Z harflerini kullanın. Eksi işareti ve ondalık virgül kabul edilir." },
    { id: "from", label: "Kaynak taban", type: "number", default: "2" },
    { id: "to", label: "Hedef taban", type: "number", default: "10" }
  ],
  example: { values: { x: "2AF", from: "16", to: "2" }, expect: ["1010101111"], note: "Örnek: $(2AF)_{16}$ sayısını ikiliye çevirme." },
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
  const s = str(input, "x", "Sayı");
  const from = num(input, "from", "Kaynak taban", { integer: true, min: 2, max: 36 });
  const to = num(input, "to", "Hedef taban", { integer: true, min: 2, max: 36 });
  const p = parseInBase(s, from);
  if (!p) fail("Sayı biçimi geçersiz.", "x");
  if (p.bad) fail(`«${p.bad}» rakamı ${from} tabanında kullanılamaz (0 ile ${DIGITS[from - 1]} arasına izin verilir).`, "x");
  const sign = p.neg && (p.int !== 0n || p.frac !== 0) ? "-" : "";
  const steps = [];
  const decStr = p.int.toString() + (p.frac ? (p.frac.toString().slice(1, 22)) : "");
  if (from !== 10) {
    const digits = (p.ip + p.fp).split("");
    const terms = digits.map((ch, i) => {
      const pos = p.ip.length - 1 - i;
      return `${DIGITS.indexOf(ch)} \\times ${from}^{${pos}}`;
    }).slice(0, 24);
    steps.push({ text: `Basamak açılımı ile onluğa çeviriyoruz (her rakam, bulunduğu konumun tabanın kuvvetiyle çarpılır):`, tex: `${terms.join(" + ")}${digits.length > 24 ? " + \\cdots" : ""} = ${sign}${decStr}` });
  } else steps.push(`Sayı zaten onludur: ${sign}${decStr}.`);
  const r = toBase(p.int, p.frac, to);
  const blocks = [];
  if (to !== 10) {
    if (r.divs.length) {
      steps.push(`Tam kısmı ${to} ile tekrarlı bölerek ${to} tabanına çeviriyoruz ve kalanları alttan üste okuyoruz (tabloya bakın).`);
      const rows = r.divs.slice(0, 64).map(([q, qq, rem]) => [q.toString(), qq.toString(), `${rem} → ${DIGITS[rem]}`]);
      blocks.push({ type: "table", caption: "Tam kısım için tekrarlı bölme", head: ["Sayı", `÷ ${to} = bölüm`, "Kalan"], rows });
    }
    if (r.muls.length) {
      steps.push(`Kesir kısmını ${to} ile tekrarlı çarparız ve her seferinde tam kısmı yukarıdan aşağıya alırız.`);
      blocks.push({ type: "table", caption: "Kesir kısmı için tekrarlı çarpma", head: ["Kesir", `× ${to}`, "Rakam"], rows: r.muls.map(([f, pr, d]) => [String(Number(f.toPrecision(12))), String(Number(pr.toPrecision(12))), DIGITS[d]]) });
      if (!r.exact) blocks.push({ type: "note", tone: "warn", text: `Kesir ${to} tabanında sonlanmıyor; virgülden sonra yirmi basamakla yetindik.` });
    }
  }
  const out = sign + r.str;
  steps.push(`Sonuç: (${s})${from} = (${out})${to}`);
  const all = [2, 8, 10, 16].map((b) => ({ label: `${b} tabanı`, value: sign + toBase(p.int, p.frac, b).str }));
  return {
    results: [{ label: `${to} tabanında sonuç`, value: out, text: out }, ...all],
    blocks, steps, copy: out
  };
}
