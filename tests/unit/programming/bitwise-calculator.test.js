import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/programming/bitwise-calculator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const v = (values, part) => resultValue(mod.solve(values), part);
const bin = (a, op, b = "0", width = "8", shift = "0") => ({ a, op, b, shift, width });

test("AND وOR وXOR على قيم معروفة", () => {
  assert.equal(v(bin("12", "and", "10"), "بدون إشارة"), "8");
  assert.equal(v(bin("12", "or", "10"), "بدون إشارة"), "14");
  assert.equal(v(bin("12", "xor", "10"), "بدون إشارة"), "6");
  assert.equal(v(bin("12", "and", "10"), "ثنائياً"), "0000 1000");
  assert.equal(v(bin("0xF0", "xor", "0x0F"), "سداسياً"), "0xFF");
});

test("NOT في 8 و32 بت", () => {
  assert.equal(v(bin("0", "not", "0", "8"), "بدون إشارة"), "255");
  assert.equal(v(bin("0", "not", "0", "8"), "متمم 2"), "-1");
  assert.equal(v(bin("0", "not", "0", "32"), "بدون إشارة"), "4294967295");
});

test("الإزاحات اليسرى واليمنى والحسابية", () => {
  assert.equal(v(bin("1", "shl", "0", "8", "3"), "بدون إشارة"), "8");
  assert.equal(v(bin("0x80", "sar", "0", "8", "1"), "سداسياً"), "0xC0");
  assert.equal(v(bin("0x80", "shr", "0", "8", "1"), "سداسياً"), "0x40");
  assert.equal(v(bin("-128", "sar", "0", "8", "1"), "سداسياً"), "0xC0");
  assert.equal(v(bin("0x80", "sar", "0", "8", "1"), "متمم 2"), "-64");
});

test("تمثيل القيم السالبة ومتمم 2", () => {
  assert.equal(v(bin("-1", "and", "15", "8"), "بدون إشارة"), "15");
  assert.equal(v(bin("-1", "and", "15", "8"), "ثنائياً"), "0000 1111");
  assert.equal(v(bin("0b1010", "and", "0b1100", "16"), "بدون إشارة"), "8");
});

test("هوية (A AND B) + (A OR B) = A + B على عينة من الأعداد", () => {
  for (let a = 0; a < 256; a += 37) for (let b = 0; b < 256; b += 53) {
    const and = Number(v(bin(String(a), "and", String(b)), "بدون إشارة"));
    const or = Number(v(bin(String(a), "or", String(b)), "بدون إشارة"));
    assert.equal(and + or, a + b);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve(bin("300", "and", "1")), "a");
  throwsInput(() => mod.solve(bin("-129", "not", "0")), "a");
  throwsInput(() => mod.solve(bin("0xZZ", "not", "0")), "a");
  throwsInput(() => mod.solve(bin("12", "and", "")), "b");
  throwsInput(() => mod.solve(bin("12", "shl", "0", "8", "8")), "shift");
  throwsInput(() => mod.solve(bin("12", "shr", "0", "8", "-1")), "shift");
});
