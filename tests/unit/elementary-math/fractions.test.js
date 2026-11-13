import { test } from "node:test";
import { assert, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/elementary-math/fractions.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (a, op, b = "1") => mod.solve({ a, op, b }).results;

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n, d) => {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  const nn = n / g;
  const dd = d / g;
  return dd === 1 ? String(nn) : `${nn}/${dd}`;
};

test("عمليات معروفة على الكسور", () => {
  assert.equal(run("3/4", "add", "1/6")[0].value, "11/12");
  assert.equal(run("3/4", "sub", "1/6")[0].value, "7/12");
  assert.equal(run("3/4", "mul", "1/6")[0].value, "1/8");
  assert.equal(run("3/4", "div", "1/6")[0].value, "9/2");
  assert.equal(run("3/4", "div", "1/6")[1].value, "4 1/2");
  assert.equal(run("1/3", "add", "1/6")[0].value, "1/2");
  assert.equal(run("1/2", "sub", "1/2")[0].value, "0");
});

test("الكسر العشري الدوري والمنتهي", () => {
  assert.equal(run("1/3", "simplify")[2].value, "0.(3)");
  assert.equal(run("1/6", "simplify")[2].value, "0.1(6)");
  assert.equal(run("1/7", "simplify")[2].value, "0.(142857)");
  assert.equal(run("3/8", "simplify")[2].value, "0.375");
  assert.equal(run("0.75", "simplify")[0].value, "3/4");
  assert.equal(run("0.75", "simplify")[2].value, "0.75");
  assert.equal(run("11/12", "simplify")[2].value, "0.91(6)");
});

test("العدد الكسري والأعداد السالبة", () => {
  const r = run("-2 1/3", "simplify");
  assert.equal(r[0].value, "-7/3");
  assert.equal(r[1].value, "-2 1/3");
  assert.equal(r[2].value, "-2.(3)");
  assert.equal(run("5", "add", "-5")[0].value, "0");
  assert.equal(run("-1/2", "mul", "-2")[0].value, "1");
  assert.equal(run("6/8", "simplify")[0].value, "3/4");
});

test("المقارنة بين الكسور", () => {
  assert.equal(run("3/4", "cmp", "1/6")[0].value, "3/4 > 1/6");
  assert.equal(run("2/4", "cmp", "0.5")[0].value, "1/2 = 1/2");
  assert.equal(run("-1/3", "cmp", "-1/4")[0].value, "-1/3 < -1/4");
});

test("تطابق العمليات مع الحساب التبادلي على أعداد عشوائية", () => {
  const rnd = rng(7);
  const pick = () => [Math.floor(rnd() * 19) - 9, 1 + Math.floor(rnd() * 12)];
  for (let i = 0; i < 200; i++) {
    const [p1, q1] = pick();
    const [p2, q2] = pick();
    const A = `${p1}/${q1}`;
    const B = `${p2}/${q2}`;
    assert.equal(run(A, "add", B)[0].value, frac(p1 * q2 + p2 * q1, q1 * q2), `${A} + ${B}`);
    assert.equal(run(A, "sub", B)[0].value, frac(p1 * q2 - p2 * q1, q1 * q2), `${A} - ${B}`);
    assert.equal(run(A, "mul", B)[0].value, frac(p1 * p2, q1 * q2), `${A} * ${B}`);
    if (p2 !== 0) assert.equal(run(A, "div", B)[0].value, frac(p1 * q2, q1 * p2), `${A} / ${B}`);
  }
});

test("الكسر الدوري الطويل جداً يُعلَّم بأنه لم يتكرر خلال 50 منزلة", () => {
  const res = mod.solve({ a: "1/97", op: "simplify", b: "1" });
  assert.ok(res.results[3].value.includes("50"));
  assert.equal(res.blocks[0].type, "note");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ a: "3/0", op: "add", b: "1/6" }), "a");
  throwsInput(() => mod.solve({ a: "1/2", op: "div", b: "0" }), "b");
  throwsInput(() => mod.solve({ a: "abc", op: "add", b: "1/6" }), "a");
  throwsInput(() => mod.solve({ a: "2 3/2", op: "simplify", b: "" }), "a");
  throwsInput(() => mod.solve({ a: "1/2", op: "add", b: "" }), "b");
  throwsInput(() => mod.solve({ a: "1/2.5", op: "simplify" }), "a");
});
