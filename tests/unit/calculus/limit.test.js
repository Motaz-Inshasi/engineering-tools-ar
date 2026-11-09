import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/calculus/limit.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const lim = (f, a, dir = "both") => mod.solve({ f, v: "x", a, dir });
const text = (r) => r.results[0].text ?? r.results[0].value;

test("نهايات معروفة من الكتب", () => {
  assert.equal(text(lim("x^2 + 1", "2")), "= 5");
  assert.equal(text(lim("(x^2-1)/(x-1)", "1")), "= 2");
  assert.equal(text(lim("(1-cos(x))/x^2", "0")), "= 1/2");
  assert.equal(text(lim("(e^x - 1)/x", "0")), "= 1");
  assert.equal(text(lim("(1+1/x)^x", "inf")), "= 2.718281828");
  assert.equal(text(lim("(3x^2+1)/(x^2-5)", "inf")), "= 3");
  assert.equal(text(lim("1/x^2", "0")), "= ∞");
  assert.equal(text(lim("e^(-x)", "inf")), "= 0");
});

test("النهايات من جهة واحدة والنهاية غير الموجودة", () => {
  assert.equal(text(lim("1/x", "0", "right")), "= ∞");
  assert.equal(text(lim("1/x", "0", "left")), "= -∞");
  assert.equal(lim("1/x", "0").results[0].value, "غير موجودة");
  assert.equal(lim("abs(x)/x", "0").results[0].value, "غير موجودة");
  assert.equal(lim("sin(1/x)", "0").results[0].value, "غير موجودة");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => lim("", "0"), "f");
  throwsInput(() => lim("x", "abc"), "a");
  throwsInput(() => mod.solve({ f: "x", v: "x", a: "0", dir: "up" }), "dir");
});
