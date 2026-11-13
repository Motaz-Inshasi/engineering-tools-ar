import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/geometry/pythagoras.js";

const solve = (values) => mod.solve({ ...mod.meta.example.values, ...values });
const check = (a, b, c) => mod.solve({ ...mod.meta.example.values, mode: "check", a, b, c });
const num = (s) => parseFloat(s);

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("الثلاثيات الفيثاغورية المعروفة", () => {
  const t345 = solve({ a: "3", b: "4", c: "" });
  assert.equal(resultValue(t345, "الوتر c"), "5 cm");
  assert.equal(resultValue(t345, "المساحة"), "6 cm²");
  assert.equal(resultValue(t345, "المحيط"), "12 cm");
  assert.equal(resultValue(t345, "الارتفاع على الوتر"), "2.4 cm");
  assert.equal(resultValue(t345, "ثلاثية"), "نعم، ثلاثية أولية (3، 4، 5)");
  assert.equal(resultValue(solve({ a: "5", b: "", c: "13" }), "الساق b"), "12 cm");
  assert.equal(resultValue(solve({ a: "", b: "24", c: "25" }), "الساق a"), "7 cm");
  assert.equal(resultValue(solve({ a: "6", b: "8", c: "" }), "ثلاثية"), "نعم، مضاعف لثلاثية أولية (6، 8، 10)");
});

test("الزاويتان الحادتان للمثلث 3-4-5", () => {
  const t = solve({ a: "3", b: "4", c: "" });
  close(num(resultValue(t, "الزاوية A")), 36.8699, 1e-4);
  close(num(resultValue(t, "الزاوية B")), 53.1301, 1e-4);
});

test("الاتساق: الضلع المحسوب يعيد الوتر الأصلي", () => {
  const t = solve({ a: "7", b: "", c: "25" });
  const b = num(resultValue(t, "الساق b"));
  close(7 * 7 + b * b, 625, 1e-9);
  close(num(resultValue(t, "الوتر c")), 25, 1e-12);
});

test("تصنيف المثلث بأضلاعه الثلاثة", () => {
  assert.equal(resultValue(check("5", "12", "13"), "نوع المثلث"), "قائم الزاوية");
  assert.equal(resultValue(check("4", "5", "6"), "نوع المثلث"), "حاد الزوايا");
  assert.equal(resultValue(check("2", "3", "4"), "نوع المثلث"), "منفرج الزاوية");
  assert.equal(resultValue(check("5", "12", "13"), "ثلاثية"), "نعم، ثلاثية أولية (5، 12، 13)");
  assert.equal(resultValue(check("4", "5", "6"), "ثلاثية"), "لا");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => solve({ a: "5", b: "", c: "3" }), "c");
  throwsInput(() => solve({ a: "3", b: "", c: "" }), "b");
  throwsInput(() => solve({ a: "3", b: "4", c: "5" }), "c");
  throwsInput(() => solve({ a: "-3", b: "4", c: "" }), "a");
  throwsInput(() => check("1", "2", "3"), "c");
});
