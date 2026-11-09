import { test } from "node:test";
import { assert, close, rng } from "../helpers.js";
import { parse, evaluate, toText } from "../../../lib/core/parser.js";
import { diff, integrate } from "../../../lib/core/symbolic.js";
import { derivNumeric, integrateNumeric } from "../../../lib/core/numeric.js";
import { forward, inverse } from "../../../lib/signals/laplace.js";
import { inverse as minv, mmul } from "../../../lib/core/matrix.js";
import { parseNetlist, solveMNA, kclResiduals } from "../../../lib/core/circuit.js";
import { meshSolve, parseBranches } from "../../../lib/dc-circuits/mesh-analysis.js";
import { encode, decode } from "../../../lib/electronics/resistor-color-code.js";
import { convert } from "../../../lib/algebra/number-bases.js";
import { SERIES } from "../../../lib/core/eseries.js";

const rand = rng(2026);
const pick = (a) => a[Math.floor(rand() * a.length)];

function randomExpr(depth = 0) {
  const leaves = ["x", "2", "3", "x^2", "x^3", "0.5"];
  if (depth > 2 || rand() < 0.3) return pick(leaves);
  const r = rand();
  if (r < 0.25) return `(${randomExpr(depth + 1)}) + (${randomExpr(depth + 1)})`;
  if (r < 0.5) return `(${randomExpr(depth + 1)}) * (${randomExpr(depth + 1)})`;
  if (r < 0.6) return `(${randomExpr(depth + 1)}) / (x^2 + 1)`;
  return `${pick(["sin", "cos", "exp", "ln", "sqrt", "atan"])}(${pick(["x", "2x", "x^2 + 1", "x/3"])})`;
}

test("1) المشتقة الرمزية = الفرق المحدود العددي (200 دالة عشوائية)", () => {
  let n = 0;
  for (let i = 0; i < 200; i++) {
    const src = randomExpr();
    const f = parse(src);
    const d = diff(f, "x");
    for (const x of [0.4, 1.1, 2.3]) {
      const a = evaluate(d, { x }), b = derivNumeric((t) => evaluate(f, { x: t }), x);
      if (!isFinite(a) || !isFinite(b) || Math.abs(b) > 1e6) continue;
      assert.ok(Math.abs(a - b) <= 1e-5 * (1 + Math.abs(b)), `${src} at ${x}: ${a} vs ${b} (d = ${toText(d)})`);
      n++;
    }
  }
  assert.ok(n > 400);
});

test("2) التكامل الرمزي المحدد = التكامل العددي (كل ما ينجح رمزياً من 200 دالة عشوائية)", () => {
  let n = 0;
  for (let i = 0; i < 200; i++) {
    const src = randomExpr();
    const f = parse(src);
    const r = integrate(f, "x");
    if (!r) continue;
    const F = (x) => evaluate(r.result, { x });
    const a = 0.3, b = 1.7;
    const num = integrateNumeric((x) => evaluate(f, { x }), a, b);
    if (!num.ok || !isFinite(F(a)) || !isFinite(F(b))) continue;
    close(F(b) - F(a), num.value, 1e-7, src);
    n++;
  }
  assert.ok(n >= 40, `only ${n} symbolic integrals checked`);
});

test("3) لابلاس ثم عكسه يعيد الدالة الأصلية (100 دالة عشوائية؛ المقامات فوق الدرجة 12 تُرفض برسالة صريحة)", () => {
  let checked = 0, rejected = 0;
  for (let i = 0; i < 100; i++) {
    const terms = [];
    const k = 1 + Math.floor(rand() * 3);
    for (let j = 0; j < k; j++) {
      const c = (Math.round(rand() * 18) - 9) || 1, n = Math.floor(rand() * 3), a = Math.round(rand() * 8) - 5, b = 1 + Math.floor(rand() * 4);
      const g = pick(["", ` sin(${b}t)`, ` cos(${b}t)`, ` sinh(${b}t)`]);
      terms.push(`${c} t^${n} e^(${a}t)${g}`);
    }
    const src = terms.join(" + ");
    let back;
    try {
      back = inverse(forward(src).combined).ft;
    } catch (e) {
      assert.equal(e.name, "InputError", `${src}: ${e.message}`);
      assert.match(e.message, /أقصى درجة/);
      rejected++;
      continue;
    }
    checked++;
    for (const t of [0.1, 0.6, 1.2]) {
      const want = evaluate(parse(src, ["t"]), { t });
      close(evaluate(back, { t }), want, 1e-6, src);
    }
  }
  assert.ok(checked >= 70, `checked ${checked}, rejected ${rejected}`);
});

test("4) معكوس المصفوفة × المصفوفة = I (100 مصفوفة عشوائية حتى 8×8)", () => {
  let n = 0;
  for (let i = 0; i < 100; i++) {
    const N = 2 + Math.floor(rand() * 7);
    const A = Array.from({ length: N }, () => Array.from({ length: N }, () => (rand() - 0.5) * 20));
    const r = minv(A);
    if (!r) continue;
    const I = mmul(r.inv, A);
    I.forEach((row, a) => row.forEach((x, b) => assert.ok(Math.abs(x - (a === b ? 1 : 0)) < 1e-8, `${N}x${N}`)));
    n++;
  }
  assert.ok(n > 90);
});

test("5) حلول الدوائر تحقق KCL و KVL (عقد وحلقات لدوائر عشوائية)", () => {
  for (let i = 0; i < 60; i++) {
    const N = 3 + Math.floor(rand() * 5);
    const lines = [`V1 1 0 ${(rand() * 30 - 15).toFixed(3)}`];
    for (let k = 1; k <= N; k++) lines.push(`RG${k} ${k} 0 ${(1 + rand() * 1e3).toFixed(2)}`);
    for (let k = 1; k < N; k++) lines.push(`RS${k} ${k} ${k + 1} ${(1 + rand() * 1e3).toFixed(2)}`);
    lines.push(`I1 0 ${N} ${(rand() * 0.05).toFixed(4)}`);
    const s = solveMNA(parseNetlist(lines.join("\n")));
    for (const r of Object.values(kclResiduals(s))) assert.ok(Math.abs(r) < 1e-10, "KCL");
    for (const b of s.branches) close(b.v, s.V[b.a] - s.V[b.b], 1e-12);
    const loopSum = s.branches.filter((b) => b.name.startsWith("RS")).reduce((acc, b) => acc + b.v, 0);
    close(loopSum, s.V["1"] - s.V[String(N)], 1e-9, "KVL along the ladder");
  }
  for (let i = 0; i < 40; i++) {
    const R = Array.from({ length: 5 }, () => 1 + rand() * 100);
    const br = parseBranches(`1 0 ${R[0]} ${rand() * 20}\n1 2 ${R[1]} 0\n2 0 ${R[2]} ${rand() * 10}\n2 3 ${R[3]} 0\n3 0 ${R[4]} ${-rand() * 5}`);
    const { R: M, V, I } = meshSolve(br);
    M.forEach((row, k) => close(row.reduce((s, r, j) => s + r * I[j], 0), V[k], 1e-9, "KVL per mesh"));
  }
});

test("6) ألوان المقاومات: الترميز ثم القراءة يعيد القيمة (كل E12 و E24 و E96 عبر 9 عقود)", () => {
  let n = 0;
  for (const [s, bands, nd] of [["E12", 4, 2], ["E24", 4, 2], ["E96", 5, 3]]) for (const b of SERIES[s]) for (let e = 0; e <= 8; e++) {
    const v = Number((b * 10 ** (e - (nd - 1))).toPrecision(6));
    const enc = encode(v, bands, 1);
    close(decode(bands, enc.keys).value, v, 1e-9, `${s} ${v}`);
    n++;
  }
  assert.ok(n > 1000);
});

test("7) تحويل الأنظمة العددية ذهاباً وإياباً (1000 حالة عشوائية مع كسور منتهية)", () => {
  for (let i = 0; i < 1000; i++) {
    const b1 = 2 + Math.floor(rand() * 35), b2 = 2 + Math.floor(rand() * 35);
    const intPart = BigInt(Math.floor(rand() * 1e12));
    const s = (rand() < 0.3 ? "-" : "") + intPart.toString(b1).toUpperCase();
    const there = convert(s, b1, b2), back = convert(there, b2, b1);
    assert.equal(back, s === "-0" ? "0" : s, `${s} (${b1}) → ${there} (${b2})`);
  }
  assert.equal(convert("0.5", 10, 2), "0.1");
  assert.equal(convert("0.1", 2, 10), "0.5");
  assert.equal(convert("FF.8", 16, 10), "255.5");
});
